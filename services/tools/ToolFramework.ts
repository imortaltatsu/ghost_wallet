/**
 * Generic MCP-style tool framework.
 * - Definitions (name, description, inputSchema) come from mcp/tools/*.json (MCP spec).
 * - Handlers (execute + display metadata) are registered by name.
 * Only tools with a registered handler are exposed to the LLM and executable.
 */

import { loadMCPToolDefinitions } from "@/services/mcp/loadMCP";
import type { MCPToolDef } from "@/services/mcp/loadMCP";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

/** ChatML shape for system prompt (definition + callFormat + outputDescription). */
export interface ToolForChatML {
  definition: ToolDefinition;
  callFormat: string;
  outputDescription: string;
}

/** Handler registered for a tool: execute fn + optional display/prompt metadata. */
export interface ToolHandler {
  execute: (args: Record<string, unknown>) => Promise<ToolExecutionResult>;
  /** Example call, e.g. [get_balance()] or [private_send(amount=0.1, recipient=addr)]. */
  callFormat?: string;
  /** What the tool returns and how the assistant should respond. */
  outputDescription?: string;
  /** Instructions for the follow-up response after this tool runs. */
  responseInstructions?: string;
}

function mcpToToolDefinition(mcp: MCPToolDef): ToolDefinition {
  return {
    name: mcp.name,
    description: mcp.description,
    parameters: {
      type: mcp.inputSchema?.type ?? "object",
      properties: mcp.inputSchema?.properties ?? {},
      required: mcp.inputSchema?.required,
    },
  };
}

let instance: ToolFramework | null = null;

export class ToolFramework {
  private handlers = new Map<string, ToolHandler>();

  static getInstance(): ToolFramework {
    if (!instance) instance = new ToolFramework();
    return instance;
  }

  /** Register a handler for a tool. Definition is loaded from MCP by name. */
  registerHandler(name: string, handler: ToolHandler): void {
    this.handlers.set(name, handler);
    console.log(`[ToolFramework] Registered handler: ${name}`);
  }

  /** Get MCP definition by name (if present). */
  getDefinition(name: string): ToolDefinition | null {
    const mcp = loadMCPToolDefinitions().get(name);
    return mcp ? mcpToToolDefinition(mcp) : null;
  }

  /** All tool names that have both an MCP definition and a registered handler. */
  getAvailableToolNames(): string[] {
    const mcp = loadMCPToolDefinitions();
    return Array.from(this.handlers.keys()).filter((name) => mcp.has(name));
  }

  /** Tools in ChatML-ready shape (MCP definition + handler metadata). Only available tools. */
  getToolsForChatML(): ToolForChatML[] {
    const mcp = loadMCPToolDefinitions();
    const out: ToolForChatML[] = [];
    for (const [name, handler] of this.handlers) {
      const def = mcp.get(name);
      if (!def) continue;
      out.push({
        definition: mcpToToolDefinition(def),
        callFormat: handler.callFormat ?? `[${name}()]`,
        outputDescription:
          handler.outputDescription ??
          handler.responseInstructions ??
          "Summarize the result briefly.",
      });
    }
    return out;
  }

  /** Execute a tool by name. Returns error if no handler or execution throws. */
  async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const handler = this.handlers.get(name);
    if (!handler) {
      return { success: false, error: `Tool ${name} not found (no handler registered)` };
    }
    try {
      console.log(`[ToolFramework] Executing: ${name}`, args);
      return await handler.execute(args ?? {});
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Tool execution failed",
      };
    }
  }

  getResponseInstructions(name: string): string {
    const handler = this.handlers.get(name);
    return handler?.responseInstructions ?? "Summarize the result briefly.";
  }

  getHandler(name: string): ToolHandler | undefined {
    return this.handlers.get(name);
  }
}
