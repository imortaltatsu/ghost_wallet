export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatTemplateOptions {
    addGenerationPrompt?: boolean;
    tools?: any[]; // Tool definitions for function calling
}

/**
 * Chat Template Handler
 * Handles standard chat templates for models (Llama 3 / Granite / etc)
 */
export class ChatTemplate {
    /**
     * Apply chat template to messages
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
            result += `<|start_header_id|>system<|end_header_id|>\n\n${systemMessage.content}<|eot_id|>\n`;
        } else if (tools && tools.length > 0) {
            // Default system prompt for tool calling
            result += `<|start_header_id|>system<|end_header_id|>\nYou are a helpful assistant with access to tools.<|eot_id|>\n`;
        }

        // Add user and assistant messages
        for (const message of messages) {
            if (message.role === 'system') {
                continue; // Already handled above
            }

            if (message.role === 'user') {
                result += `<|start_header_id|>user<|end_header_id|>\n\n${message.content}<|eot_id|>\n`;
            } else if (message.role === 'assistant') {
                result += `<|start_header_id|>assistant<|end_header_id|>\n\n${message.content}<|eot_id|>\n`;
            }
        }

        // Add generation prompt if needed
        if (addGenerationPrompt) {
            result += `<|start_header_id|>assistant<|end_header_id|>\n\n`;
        }

        return result;
    }

    /**
     * Parse response from model (remove template tokens)
     */
    static parseResponse(response: string): string {
        // Remove template tokens
        let cleaned = response
            .replace(/<\|start_header_id\|>/g, '')
            .replace(/<\|end_header_id\|>/g, '')
            .replace(/<\|eot_id\|>/g, '')
            .replace(/<\|end_of_text\|>/g, '');

        // Extract assistant content if wrapped
        const assistantMatch = cleaned.match(/assistant\n\n(.+)/s);
        if (assistantMatch) {
            cleaned = assistantMatch[1].trim();
        }

        // Remove role tags cleanup
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
