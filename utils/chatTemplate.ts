/**
 * Chat Template Handler
 * Handles Jinja2-style chat templates for Granite 4.0 models
 * Based on IBM Granite chat format
 */

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatTemplateOptions {
    addGenerationPrompt?: boolean;
    tools?: any[]; // Tool definitions for function calling
}

/**
 * Granite 4.0 Chat Template
 * Format: <|start_of_role|>{role}<|end_of_role|>{content}<|end_of_text|>
 */
export class ChatTemplate {
    /**
     * Apply Granite chat template to messages
     */
    static applyTemplate(
        messages: ChatMessage[],
        options: ChatTemplateOptions = {}
    ): string {
        const { addGenerationPrompt = true, tools } = options;

        let result = '';

        // Add system message if present
        const systemMessage = messages.find((m) => m.role === 'system');
        if (systemMessage) {
            result += `<|start_of_role|>system<|end_of_role|>${systemMessage.content}<|end_of_text|>\n`;
        } else if (tools && tools.length > 0) {
            // Default system prompt for tool calling
            result += `<|start_of_role|>system<|end_of_role|>You are a helpful assistant with access to the following tools. You may call one or more tools to assist with the user query.\n\nYou are provided with function signatures within <tools></tools> XML tags:\n<tools>\n${JSON.stringify(tools, null, 2)}\n</tools>\n\nFor each tool call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:\n<tool_call>\n{"name": <function-name>, "arguments": <args-json-object>}\n</tool_call>. If a tool does not exist in the provided list of tools, notify the user that you do not have the ability to fulfill the request.<|end_of_text|>\n`;
        } else {
            // Default system prompt
            result += `<|start_of_role|>system<|end_of_role|>You are a helpful assistant. Please ensure responses are professional, accurate, and safe.<|end_of_text|>\n`;
        }

        // Add user and assistant messages
        for (const message of messages) {
            if (message.role === 'system') {
                continue; // Already handled above
            }

            const roleTag = message.role === 'user' ? 'user' : 'assistant';
            result += `<|start_of_role|>${roleTag}<|end_of_role|>${message.content}<|end_of_text|>\n`;
        }

        // Add generation prompt if needed
        if (addGenerationPrompt && messages[messages.length - 1]?.role === 'user') {
            result += `<|start_of_role|>assistant<|end_of_role|>`;
        }

        return result.trim();
    }

    /**
     * Parse response from model (remove template tokens)
     */
    static parseResponse(response: string): string {
        // Remove template tokens
        let cleaned = response
            .replace(/<\|start_of_role\|>/g, '')
            .replace(/<\|end_of_role\|>/g, '')
            .replace(/<\|end_of_text\|>/g, '')
            .replace(/<\|start_of_text\|>/g, '');

        // Extract assistant content if wrapped
        const assistantMatch = cleaned.match(/assistant(.+)/s);
        if (assistantMatch) {
            cleaned = assistantMatch[1].trim();
        }

        // Remove role tags
        cleaned = cleaned.replace(/^(system|user|assistant):\s*/gm, '');

        return cleaned.trim();
    }

    /**
     * Create a simple user message
     */
    static createUserMessage(content: string): ChatMessage {
        return { role: 'user', content };
    }

    /**
     * Create a system message
     */
    static createSystemMessage(content: string): ChatMessage {
        return { role: 'system', content };
    }

    /**
     * Create an assistant message
     */
    static createAssistantMessage(content: string): ChatMessage {
        return { role: 'assistant', content };
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
