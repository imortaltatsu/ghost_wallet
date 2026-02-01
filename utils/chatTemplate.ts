/**
 * Chat Template Handler
 * Uses ChatML format for LiquidAI LFM2 and compatible models.
 * ChatML: <|im_start|>role\ncontent<|im_end|>\n
 * Tools are maintained via ToolFramework (MCP definitions + handlers).
 */

import type { ToolForChatML } from "@/services/tools/ToolFramework";
import { ChatML, formatMessage as chatmlFormatMessage } from "@/utils/chatml";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatTemplateOptions {
  addGenerationPrompt?: boolean;
  /** Tool definitions (from registry.getTools()) or ChatML shape (from registry.getToolsForChatML()). */
  tools?: Array<
    ToolForChatML | { name: string; description: string; parameters: object }
  >;
}

function isToolForChatML(
  t: ToolForChatML | { name: string; description: string; parameters: object },
): t is ToolForChatML {
  return "callFormat" in t && "outputDescription" in t && "definition" in t;
}

function buildToolBlock(
  tools: NonNullable<ChatTemplateOptions["tools"]>,
): string {
  const defs = tools.map((t) => (isToolForChatML(t) ? t.definition : t));
  const toolsJson = JSON.stringify(defs, null, 2);

  const formatAndUsage = tools
    .map((t) => {
      const def = isToolForChatML(t) ? t.definition : t;
      const callFormat = isToolForChatML(t) ? t.callFormat : `[${def.name}()]`;
      const outputDesc = isToolForChatML(t)
        ? t.outputDescription
        : "Summarize the result briefly.";
      return `## ${def.name}\n- Use when: ${def.description}\n- Call format: ${callFormat}\n- Output: ${outputDesc}`;
    })
    .join("\n\n");

  return `\n\n# Tools\nYou have access to:\n${toolsJson}\n\n# Tool formats and usage (ChatML)\nOutput a tool call at the end of your response using this exact format:\n${ChatML.TOOL_CALL_START}[tool_name(arg1=val1, arg2=val2)]${ChatML.TOOL_CALL_END}\nUse empty () for no arguments. Examples: [get_balance()], [shield_funds(amount=0.5)], [private_send(amount=0.1, recipient=shielded_address)].\n\n${formatAndUsage}\n\n# Rules\nUse a tool only when the user clearly needs it. One short thought, then the tool call. Do not repeat yourself.`;
}

export class ChatTemplate {
  /**
   * Apply ChatML template to messages (LFM2-compatible).
   */
  static applyTemplate(
    messages: ChatMessage[],
    options: ChatTemplateOptions = {},
  ): string {
    const { addGenerationPrompt = true } = options;

    let result = ChatML.START_OF_TEXT;

    let systemContent = messages.find((m) => m.role === "system")?.content;

    if (!systemContent) {
      systemContent = "You are a helpful assistant trained by Liquid AI.";
    }

    if (options.tools && options.tools.length > 0) {
      systemContent += buildToolBlock(options.tools);
    }

    result += chatmlFormatMessage("system", systemContent);

    for (const message of messages) {
      if (message.role === "system") continue;
      result += chatmlFormatMessage(
        message.role as "user" | "assistant",
        message.content,
      );
    }

    if (addGenerationPrompt && messages[messages.length - 1]?.role === "user") {
      result += ChatML.IM_START + "assistant\n";
    }

    return result;
  }

  /**
   * Parse response from model (remove template tokens)
   */
  static parseResponse(response: string): string {
    // Remove template tokens
    let cleaned = response
      .replace(/<\|startoftext\|>/g, "")
      .replace(/<\|im_start\|>/g, "")
      .replace(/<\|im_end\|>/g, "");

    // Extract assistant content if wrapped
    const assistantMatch = cleaned.match(/assistant\n(.+)/s);
    if (assistantMatch) {
      cleaned = assistantMatch[1].trim();
    }

    // Remove role tags cleanup just in case
    cleaned = cleaned.replace(/^(system|user|assistant)\n/gm, "");

    return cleaned.trim();
  }

  /**
   * Remove tool call JSON from text for display
   */
  static cleanToolCall(text: string): string {
    const start = ChatML.TOOL_CALL_START.replace(/[|]/g, "\\|");
    const end = ChatML.TOOL_CALL_END.replace(/[|]/g, "\\|");
    return text
      .replace(/<\|tool.*?\|>/gi, "")
      .replace(new RegExp(`${start}[\\s\\S]*?${end}`, "gi"), "")
      .replace(/\[[a-zA-Z_]+\([^\)]*\)\]/g, " Tool called ")
      .replace(/(\{[\s\S]*\})$/, "")
      .trim();
  }

  /**
   * Parse ChatML native tool call: <|tool_call_start|>[func_name(arg=val)]<|tool_call_end|>
   */
  static parseNativeToolCall(
    text: string,
  ): { tool: string; args: Record<string, any> } | null {
    const start = ChatML.TOOL_CALL_START.replace(/[|]/g, "\\|");
    const end = ChatML.TOOL_CALL_END.replace(/[|]/g, "\\|");
    const match = text.match(
      new RegExp(`${start}\\[([a-zA-Z_]+)\\(([^)]*)\\)\\]${end}`),
    );
    if (!match) return null;

    const toolName = match[1];
    const argsStr = match[2];

    // Parse args like amount=0.1, recipient=landlord or recipient="landlord"
    const args: Record<string, any> = {};
    if (argsStr) {
      const pairs = argsStr.split(",").map((s) => s.trim());
      for (const pair of pairs) {
        const eq = pair.indexOf("=");
        if (eq <= 0) continue;
        const key = pair.slice(0, eq).trim();
        let val = pair.slice(eq + 1).trim();
        // Strip surrounding quotes so "landlord" -> landlord
        if (
          typeof val === "string" &&
          val.length >= 2 &&
          ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'")))
        ) {
          val = val.slice(1, -1);
        }
        const numVal = parseFloat(val);
        args[key] = isNaN(numVal) ? val : numVal;
      }
    }

    return { tool: toolName, args };
  }

  /**
   * Create a simple user message
   */
  static createUserMessage(content: string): ChatMessage {
    return { role: "user", content };
  }

  /**
   * Create a system message
   */
  static createSystemMessage(content: string): ChatMessage {
    return { role: "system", content };
  }

  /**
   * Create an assistant message
   */
  static createAssistantMessage(content: string): ChatMessage {
    return { role: "assistant", content };
  }

  /**
   * Build conversation from prompt (single user message)
   */
  static fromPrompt(prompt: string, systemPrompt?: string): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push(this.createSystemMessage(systemPrompt));
    }

    messages.push(this.createUserMessage(prompt));

    return messages;
  }
}
