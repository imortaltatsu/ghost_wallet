/**
 * GhostWallet SDK – chat and tools management.
 *
 * Chat: sendMessage(options) – one round with optional tool call and follow-up.
 * Tools: registerAppTools(), getToolsForChatML(), shouldUseTools(), executeTool().
 */

export { sendMessage } from "./chat";
export type { SendMessageOptions } from "./chat";

export {
  executeTool,
  getResponseInstructions, getToolsForChatML, registerAppTools, shouldUseTools
} from "./tools";

