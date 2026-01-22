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
            const formattedMessages = messages.map(msg => ({
                role: msg.role,
                content: msg.content,
            }));

            let accumulatedText = '';

            const result = await this.context.completion(
                {
                    messages: formattedMessages,
                    n_predict: config.nPredict,
                    temperature: config.temperature,
                    top_p: config.topP,
                    top_k: config.topK,
                    repeat_penalty: config.repeatPenalty,
                    stop: STOP_WORDS,
                },
                (data) => {
                    // Token streaming callback
                    const { token } = datra;
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
}
