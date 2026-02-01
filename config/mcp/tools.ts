/**
 * MCP-style tool management for GhostWallet.
 * Tool definitions are maintained in standard MCP format under mcp/tools/*.json
 * (name, description, inputSchema per MCP spec). Execution via ToolFramework handlers.
 */

import type { MCPToolDef } from "@/services/mcp/loadMCP";
import {
    loadMCPToolDefinitions
} from "@/services/mcp/loadMCP";

/** MCP tool schema for discovery (name, description, arguments from inputSchema). */
export interface MCPToolSchema {
  name: string;
  description: string;
  arguments: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/** Get all tools in MCP schema format (from mcp/tools/*.json). */
export function getToolsForMCP(): MCPToolSchema[] {
  const defs = loadMCPToolDefinitions();
  return Array.from(defs.values()).map((d) => ({
    name: d.name,
    description: d.description,
    arguments: {
      type: d.inputSchema.type || "object",
      properties: d.inputSchema.properties || {},
      required: d.inputSchema.required,
      additionalProperties: d.inputSchema.additionalProperties ?? false,
    },
  }));
}

/** Get MCP tool definition by name (for merging with registry). */
export function getMCPToolDef(name: string): MCPToolDef | undefined {
  return loadMCPToolDefinitions().get(name);
}

export { mcpInputSchemaToParameters } from "@/services/mcp/loadMCP";
export type { MCPToolDef } from "@/services/mcp/loadMCP";

