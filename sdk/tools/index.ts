/**
 * Tools SDK – MCP-style framework.
 * Definitions from mcp/tools/*.json; handlers registered by name.
 * Single entry: ToolFramework (getToolsForChatML, executeTool, etc.).
 */

import { ToolFramework } from "@/services/tools/ToolFramework";
import type { ToolForChatML } from "@/services/tools/ToolFramework";
import { WALLET_TOOL_HANDLERS } from "@/services/tools/walletTools";

const WALLET_KEYWORDS = [
  "balance",
  "send",
  "transfer",
  "shield",
  "unshield",
  "address",
  "airdrop",
  "contact",
  "sol",
  "wallet",
];

let appToolsRegistered = false;

/** Register all app tool handlers with the MCP framework. Call from chat root (e.g. ChatContainer mount). */
export function registerAppTools(): void {
  if (appToolsRegistered) return;
  const framework = ToolFramework.getInstance();
  for (const [name, handler] of Object.entries(WALLET_TOOL_HANDLERS)) {
    framework.registerHandler(name, handler);
  }
  appToolsRegistered = true;
}

/** Get tools in ChatML shape for the system prompt (MCP definitions + handler metadata). */
export function getToolsForChatML(): ToolForChatML[] {
  return ToolFramework.getInstance().getToolsForChatML();
}

/** Whether the user message likely needs wallet tools. */
export function shouldUseTools(userMessage: string): boolean {
  const lower = (userMessage || "").toLowerCase();
  return WALLET_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Execute a tool by name with args (via ToolFramework). */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  return ToolFramework.getInstance().executeTool(toolName, args);
}

/** Get response instructions for after a tool run (for follow-up prompt). */
export function getResponseInstructions(toolName: string): string {
  return ToolFramework.getInstance().getResponseInstructions(toolName);
}

export type { ToolForChatML } from "@/services/tools/ToolFramework";
