/**
 * ChatML (Chat Markup Language) format utilities.
 * Compatible with OpenAI-style ChatML and LFM2 (LiquidAI) templates.
 * Spec: <|im_start|>role\ncontent<|im_end|>\n
 */

export const ChatML = {
  /** Start of a message (role block) */
  IM_START: "<|im_start|>",
  /** End of a message */
  IM_END: "<|im_end|>",
  /** LFM2 / some models: start of full prompt */
  START_OF_TEXT: "<|startoftext|>",
  /** Tool call wrapper (LFM/native) */
  TOOL_CALL_START: "<|tool_call_start|>",
  TOOL_CALL_END: "<|tool_call_end|>",
} as const;

export type ChatMLRole = "system" | "user" | "assistant";

/**
 * Format a single ChatML message: <|im_start|>role\ncontent<|im_end|>\n
 */
export function formatMessage(role: ChatMLRole, content: string): string {
  return `${ChatML.IM_START}${role}\n${content}${ChatML.IM_END}\n`;
}

/**
 * Build full ChatML prompt with optional LFM start token.
 */
export function buildPrompt(
  messages: Array<{ role: ChatMLRole; content: string }>,
  options: { addLfmStart?: boolean } = {},
): string {
  const { addLfmStart = true } = options;
  let out = addLfmStart ? ChatML.START_OF_TEXT : "";
  for (const m of messages) {
    out += formatMessage(m.role as ChatMLRole, m.content);
  }
  return out;
}

/**
 * Add assistant generation prompt (no content yet).
 */
export function assistantPrompt(): string {
  return `${ChatML.IM_START}assistant\n`;
}
