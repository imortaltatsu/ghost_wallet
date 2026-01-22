export interface AiGenerateRequest {
    prompt: string;
    modelId?: string;
    onToken?: (token: string) => void;
    systemPrompt?: string;
}

export interface AiGenerateResult {
    text: string;
    raw: any;
    modelId?: string;
}
