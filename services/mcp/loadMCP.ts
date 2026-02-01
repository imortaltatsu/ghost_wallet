/**
 * Load MCP tool definitions from mcp/tools/*.json.
 * Uses require() so definitions are bundled (no fs in React Native).
 */

export interface MCPToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, { type: string; description?: string }>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

// Metro bundles JSON; paths relative to this file
const MCP_TOOL_MODULES: Record<string, MCPToolDef> = {
  get_balance: require("../../mcp/tools/get_balance.json"),
  get_contacts: require("../../mcp/tools/get_contacts.json"),
  get_private_balance: require("../../mcp/tools/get_private_balance.json"),
  private_send: require("../../mcp/tools/private_send.json"),
  send_sol: require("../../mcp/tools/send_sol.json"),
  shield_funds: require("../../mcp/tools/shield_funds.json"),
};

let cache: Map<string, MCPToolDef> | null = null;

/** Load all MCP tool definitions (cached). */
export function loadMCPToolDefinitions(): Map<string, MCPToolDef> {
  if (cache) return cache;
  cache = new Map();
  for (const [name, def] of Object.entries(MCP_TOOL_MODULES)) {
    if (def?.name) cache.set(def.name, def);
  }
  return cache;
}

/** Convert MCP inputSchema to a flat parameters object for prompts. */
export function mcpInputSchemaToParameters(
  inputSchema: MCPToolDef["inputSchema"],
): Record<string, { type: string; description?: string }> {
  return inputSchema?.properties ?? {};
}
