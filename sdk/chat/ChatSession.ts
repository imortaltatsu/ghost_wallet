/**
 * Chat SDK – manages one round of chat: send message, optional tool call, follow-up.
 * Uses ChatML template, ToolFramework (MCP-style tools via SDK), and chat store.
 */

import {
  getResponseInstructions,
  getToolsForChatML,
  executeTool as sdkExecuteTool,
  shouldUseTools,
} from "@/sdk/tools";
import { generateText } from "@/services/llm/textGenerator";
import type { ToolForChatML } from "@/services/tools/ToolFramework";
import { useChatStore } from "@/store/chatStore";
import { ChatTemplate } from "@/utils/chatTemplate";

/**
 * Build a static user-facing response for tool results. Used for all tools so we
 * hide the raw tool-call message and show only this response.
 */
function formatToolResponse(
  toolName: string,
  args: Record<string, unknown>,
  result: unknown,
): string | null {
  const data = result && typeof result === "object" ? (result as Record<string, unknown>) : null;
  if (!data) return null;

  if (toolName === "get_balance") {
    const publicSol = data.publicSol != null ? Number(data.publicSol) : null;
    const privateSol = data.privateSol != null ? Number(data.privateSol) : 0;
    const privateError = data.privateError != null ? String(data.privateError) : null;
    if (publicSol == null) return null;
    const fmt = (n: number) => n.toFixed(4);
    // Always derive total from public + shielded (compressed) so we never show public as total.
    const total = publicSol + privateSol;
    if (privateError && privateError !== "No wallet loaded") {
      return `Total (public + shielded): ${fmt(total)} SOL. Public: ${fmt(publicSol)} SOL. Shielded could not be loaded: ${privateError}. Set EXPO_PUBLIC_COMPRESSION_API_URL in .env to a ZK Compression API URL to see shielded balance.`;
    }
    return `Total (public + shielded): ${fmt(total)} SOL. Public: ${fmt(publicSol)} SOL. Shielded: ${fmt(privateSol)} SOL.`;
  }

  if (toolName === "get_private_balance") {
    const privateSol = data.privateSol != null ? Number(data.privateSol) : 0;
    const privateError = data.privateError != null ? String(data.privateError) : null;
    const fmt = (n: number) => n.toFixed(4);
    if (privateError) {
      return `Your shielded balance could not be loaded: ${privateError}. Set EXPO_PUBLIC_COMPRESSION_API_URL in .env to a ZK Compression API URL to see shielded balance.`;
    }
    return `Your shielded balance is ${fmt(privateSol)} SOL.`;
  }

  if (toolName === "get_contacts") {
    const items = Array.isArray(result)
      ? (result as Array<{ name?: string; address?: string }>)
      : (data?.result != null && Array.isArray(data.result)
          ? (data.result as Array<{ name?: string; address?: string }>)
          : []);
    if (items.length === 0) return "No contacts saved.";
    const names = items.map((c) => c.name || c.address || "—").join(", ");
    return `Contacts: ${names}`;
  }

  const txHash = data.txHash != null ? String(data.txHash) : null;
  if (!txHash) return null;

  const amount = args?.amount != null ? Number(args.amount) : data?.amount != null ? Number(data.amount) : null;
  const amountStr = amount != null && !Number.isNaN(amount) ? `${amount} SOL` : "SOL";

  if (toolName === "private_send") {
    const recipient = args?.recipient != null ? String(args.recipient) : (data?.recipient != null ? String(data.recipient).slice(0, 8) + "…" : "recipient");
    return `Successfully transferred ${amountStr} to ${recipient}. Here is the tx hash: ${txHash}`;
  }
  if (toolName === "shield_funds") {
    return `Successfully converted ${amountStr} to private SOL. Here is the tx hash: ${txHash}`;
  }
  return `Done. Tx hash: ${txHash}`;
}

export interface SendMessageOptions {
  userText: string;
  modelId: string;
  systemPrompt: string;
  /** Called with each streamed token (after cleaning tool syntax). */
  onToken?: (token: string) => void;
  /** Called with final cleaned text when no tool was used (e.g. for TTS). */
  onComplete?: (cleanedText: string) => void;
  /** Called when a tool is invoked (name, args). */
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
}

function cleanToken(token: string): string {
  return token
    .replace(/<\|tool.*?\|>/gi, "")
    .replace(/\[[a-zA-Z_]+\([^\)]*\)\]/g, " Tool called ");
}

/**
 * Send a user message, run the model (with tools if needed), handle tool calls and follow-up.
 */
export async function sendMessage(options: SendMessageOptions): Promise<void> {
  const { userText, modelId, systemPrompt, onToken, onComplete, onToolCall } =
    options;

  const store = useChatStore.getState();
  const { addMessage, updateStreamingMessage, startStreaming, stopStreaming, setMessageContent } =
    store;
  const messages = useChatStore.getState().messages;

  const newUserMsg = {
    id: `msg_${Date.now()}_u`,
    timestamp: Date.now(),
    role: "user" as const,
    content: userText,
  };
  addMessage(newUserMsg);

  const history = [...messages, newUserMsg].map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const assistantMessageId = `msg_${Date.now()}_a`;
  addMessage({
    id: assistantMessageId,
    timestamp: Date.now(),
    role: "assistant",
    content: "",
  });
  startStreaming(assistantMessageId);

  let fullResponse = "";

  try {
    const tools: ToolForChatML[] = shouldUseTools(userText)
      ? getToolsForChatML()
      : [];

    await generateText({
      messages: history,
      prompt: "",
      systemPrompt,
      modelId,
      tools,
      onToken: (token: string) => {
        fullResponse += token;
        const cleaned = cleanToken(token);
        if (cleaned) {
          updateStreamingMessage(cleaned);
        }
      },
    });

    const toolCall = ChatTemplate.parseNativeToolCall(fullResponse);

    if (toolCall) {
      onToolCall?.(toolCall.tool, toolCall.args);
      stopStreaming();

      let resultString: string;
      try {
        const result = await sdkExecuteTool(toolCall.tool, toolCall.args);
        if (!result.success) {
          addMessage({
            id: `msg_${Date.now()}_err`,
            timestamp: Date.now(),
            role: "system",
            content: `Error: ${result.error ?? "Tool failed"}`,
          });
          return;
        }
        const resultData = result?.result ?? result;
        resultString =
          typeof resultData === "string"
            ? resultData
            : JSON.stringify(resultData);

        const staticResponse = formatToolResponse(
          toolCall.tool,
          toolCall.args,
          resultData,
        );
        if (staticResponse) {
          setMessageContent(assistantMessageId, staticResponse);
          onComplete?.(staticResponse);
          return;
        }
      } catch (toolErr: unknown) {
        addMessage({
          id: `msg_${Date.now()}_err`,
          timestamp: Date.now(),
          role: "system",
          content: `Error: ${toolErr instanceof Error ? toolErr.message : "Tool failed"}`,
        });
        return;
      }

      const toolResultMsg = {
        role: "user" as const,
        content: `SOLANA_WALLET_DATA: ${resultString}`,
      };
      const newHistory = [...history, toolResultMsg];
      const responseInstructions = getResponseInstructions(toolCall.tool);
      const followUpSystemPrompt = `You are GhostWallet AI. ${responseInstructions}. NEVER mention seconds or minutes. ONLY mention SOL.`;

      const newAssistantId = `msg_${Date.now()}_a2`;
      addMessage({
        id: newAssistantId,
        timestamp: Date.now(),
        role: "assistant",
        content: "",
      });
      startStreaming(newAssistantId);

      let followUpText = "";
      await generateText({
        messages: newHistory,
        prompt: "",
        systemPrompt: followUpSystemPrompt,
        modelId,
        tools: [],
        onToken: (token: string) => {
          followUpText += token;
          const cleaned = cleanToken(token);
          if (cleaned) updateStreamingMessage(cleaned);
        },
      });
      stopStreaming();
      const cleanedFollowUp = ChatTemplate.cleanToolCall(followUpText);
      onComplete?.(cleanedFollowUp);
      return;
    }

    stopStreaming();
    const cleanedResponse = ChatTemplate.cleanToolCall(fullResponse);
    onComplete?.(cleanedResponse);
  } catch (error) {
    stopStreaming();
    throw error;
  }
}
