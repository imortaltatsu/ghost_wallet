import { STOP_WORDS } from '@/constants/Models';
import { Message, ModelConfig } from '@/types/chat';
import { initLlama, LlamaContext } from 'llama.rn';

export class LlamaService {
    private static instance: LlamaService;
    private context: LlamaContext | null = null;
    private isInitialized = false;
    private currentModelPath: string | null = null;

    private constructor() { }

    static getInstance(): LlamaService {
        if (!LlamaService.instance) {
            LlamaService.instance = new LlamaService();
        }
        return LlamaService.instance;
    }

    async initialize(config: ModelConfig): Promise<void> {
        if (this.isInitialized && this.currentModelPath === config.modelPath) {
            console.log('Model already initialized');
            return;
        }

        // Release previous context if exists
        if (this.context) {
            await this.release();
        }

        try {
            console.log('Initializing LLM with config:', config);

            this.context = await initLlama({
                model: config.modelPath,
                use_mlock: true,
                n_ctx: config.contextSize,
                n_gpu_layers: config.nGpuLayers,
                n_batch: 512,
            });

            this.isInitialized = true;
            this.currentModelPath = config.modelPath;
            console.log('LLM initialized successfully');
        } catch (error) {
            console.error('Failed to initialize LLM:', error);
            this.isInitialized = false;
            this.currentModelPath = null;
            throw error;
        }
    }

    async completion(
        messages: Message[],
        config: ModelConfig,
        onToken?: (token: string) => void
    ): Promise<string> {
        if (!this.context || !this.isInitialized) {
            throw new Error('LLM not initialized. Call initialize() first.');
        }

        try {
            // Apply chat template to get raw prompt
            const { ChatTemplate } = require('../../utils/chatTemplate');
            const prompt = ChatTemplate.applyTemplate(messages);

            let accumulatedText = '';

            const result = await this.context.completion(
                {
                    prompt,
                    n_predict: config.nPredict,
                    temperature: config.temperature,
                    top_p: config.topP,
                    top_k: config.topK,
                    repeat_penalty: config.repeatPenalty,
                    stop: STOP_WORDS,
                },
                (data) => {
                    // Token streaming callback
                    const { token } = data;
                    if (token && onToken) {
                        accumulatedText += token;
                        onToken(token);
                    }
                }
            );

            return result.text || accumulatedText;
        } catch (error) {
            console.error('Completion error:', error);
            throw error;
        }
    }

    async stopCompletion(): Promise<void> {
        // Note: llama.rn doesn't have a direct stop method in the current API
        // We would need to release and reinitialize to stop generation
        console.log('Stop completion requested');
    }

    async release(): Promise<void> {
        if (this.context) {
            try {
                await this.context.release();
                console.log('LLM context released');
            } catch (error) {
                console.error('Error releasing context:', error);
            }
            this.context = null;
            this.isInitialized = false;
            this.currentModelPath = null;
        }
    }

    isReady(): boolean {
        return this.isInitialized && this.context !== null;
    }

    getCurrentModelPath(): string | null {
        return this.currentModelPath;
    }

    // Adapter for LlamaLoader API compatibility
    async getSession(modelId: string, quantization?: string): Promise<{
        generateChat: (messages: any[], options?: any) => Promise<string>;
    }> {
        // Reuse existing context if it matches expectations or ensure initialized
        // Note: Real implementation would check if loaded model matches request
        // For now we assume the Service is managing the active model state

        return {
            generateChat: async (messages: any[], options?: any) => {
                // Map session API to completion API
                // Convert ChatMessage[] to internal format
                const formattedMessages = messages.map(m => ({
                    role: m.role,
                    content: m.content
                }));

                const result = await this.completion(
                    formattedMessages,
                    {
                        // Default config items
                        nPredict: options?.maxTokens,
                        temperature: options?.temperature,
                        topP: options?.topP,
                        topK: options?.topK,
                        stopWords: options?.onToken ? undefined : undefined, // Handled inside completion
                        // Add other required ModelConfig properties with defaults
                        systemPrompt: '',
                        contextSize: 2048,
                        nGpuLayers: 0,
                        repeatPenalty: 1.1,
                        modelPath: this.currentModelPath || '',
                        modelName: modelId
                    },
                    options?.onToken
                );

                return result;
            }
        };
    }
}

// Export singleton as llamaLoader for compatibility
export const llamaLoader = LlamaService.getInstance();
