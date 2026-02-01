export interface AiGenerateRequest {
    prompt: string;
    messages?: any[]; // Full conversation history
    tools?: any[];    // List of available tools
    modelId?: string;
    onToken?: (token: string) => void;
    systemPrompt?: string;
}

export interface AiGenerateResult {
    text: string;
    raw: any;
    modelId?: string;
}
