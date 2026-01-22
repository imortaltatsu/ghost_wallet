/**
 * Chat Template Handler
 * Handles ChatML-style chat templates for LiquidAI LFM2 models
 * Format: <|startoftext|><|im_start|>system\n{content}<|im_end|>\n<|im_start|>user\n{content}<|im_end|>\n...
 */

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatTemplateOptions {
    addGenerationPrompt?: boolean;
    tools?: any[]; // Tool definitions for function calling
}

export class ChatTemplate {
    /**
     * Apply LFM2 ChatML template to messages
     */
    static applyTemplate(
        messages: ChatMessage[],
        options: ChatTemplateOptions = {}
    ): string {
        const { addGenerationPrompt = true } = options;

        // LFM2 starts with startoftext
        let result = '<|startoftext|>';

        // Helper to formatting a message
        const formatMessage = (role: string, content: string) => {
            return `<|im_start|>${role}\n${content}<|im_end|>\n`;
        }

        // Add system message if present
        const systemMessage = messages.find((m) => m.role === 'system');
        if (systemMessage) {
            result += formatMessage('system', systemMessage.content);
        } else {
            // Default system prompt
            result += formatMessage('system', 'You are a helpful assistant trained by Liquid AI.');
        }

        // Add user and assistant messages
        for (const message of messages) {
            if (message.role === 'system') {
                continue; // Already handled above
            }
            result += formatMessage(message.role, message.content);
        }

        // Add generation prompt if needed
        if (addGenerationPrompt && messages[messages.length - 1]?.role === 'user') {
            result += `<|im_start|>assistant\n`;
        }

        return result; // No trim() to preserve trailing newline logic if needed
    }

    /**
     * Parse response from model (remove template tokens)
     */
    static parseResponse(response: string): string {
        // Remove template tokens
        let cleaned = response
            .replace(/<\|startoftext\|>/g, '')
            .replace(/<\|im_start\|>/g, '')
            .replace(/<\|im_end\|>/g, '');

        // Extract assistant content if wrapped
        const assistantMatch = cleaned.match(/assistant\n(.+)/s);
        if (assistantMatch) {
            cleaned = assistantMatch[1].trim();
        }

        // Remove role tags cleanup just in case
        cleaned = cleaned.replace(/^(system|user|assistant)\n/gm, '');

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
