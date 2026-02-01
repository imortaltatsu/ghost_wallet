export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
}

/** ChatML-compatible tool shape for system prompt (call format + output description). */
export interface ToolForChatML {
  definition: ToolDefinition;
  /** Example call string, e.g. [get_balance()] or [private_send(amount=0.1, recipient=addr)]. */
  callFormat: string;
  /** What the tool returns and how the assistant should respond to the user. */
  outputDescription: string;
}

export interface Tool {
  definition: ToolDefinition;
  responseInstructions?: string; // How the LLM should respond after this tool
  /** For ChatML: example call string. */
  callFormat?: string;
  /** For ChatML: what the tool returns and how to respond. */
  outputDescription?: string;
  execute: (args: any) => Promise<ToolExecutionResult>;
}

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool> = new Map();

  private constructor() {}

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  registerTool(tool: Tool) {
    this.tools.set(tool.definition.name, tool);
    console.log(`Tool registered: ${tool.definition.name}`);
  }

  getTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  /** Tools in ChatML-ready shape (definition + callFormat + outputDescription). */
  getToolsForChatML(): ToolForChatML[] {
    return Array.from(this.tools.values()).map((t) => ({
      definition: t.definition,
      callFormat: t.callFormat ?? `[${t.definition.name}()]`,
      outputDescription:
        t.outputDescription ??
        t.responseInstructions ??
        "Summarize the result briefly.",
    }));
  }

  async executeTool(name: string, args: any): Promise<ToolExecutionResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool ${name} not found` };
    }
    try {
      console.log(`Executing tool ${name} with args:`, args);
      return await tool.execute(args);
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getResponseInstructions(name: string): string {
    const tool = this.tools.get(name);
    return tool?.responseInstructions || "Summarize the result briefly.";
  }
}
