import { ChatTemplate } from '@/utils/chatTemplate';
import { ModelDownloader as weightsDownloader } from '@/utils/modelDownloader';
import { llamaLoader } from './LlamaService';
import { modelManager } from './modelManager';
import { getModelInfo } from './models';
import type { AiGenerateRequest, AiGenerateResult } from './types';

/**
 * Thin wrapper around on-device LLM inference.
 *
 * We keep this isolated so we can swap providers (react-native-ai / MLC / etc.)
 * without touching UI code.
 */
export async function generateText(req: AiGenerateRequest): Promise<AiGenerateResult> {
    // Check if a model is installed first
    const modelId = req.modelId || (await modelManager.getCurrentModel());

    if (!modelId) {
        return {
            text: 'No model installed. Please install a model first from the Models screen.',
            raw: null,
        };
    }

    const isInstalled = await modelManager.isInstalled(modelId);
    if (!isInstalled) {
        return {
            text: `Model "${modelId}" is not installed. Please install it first from the Models screen.`,
            raw: null,
            modelId,
        };
    }

    // Get model info to check for GGUF file
    const modelInfo = getModelInfo(modelId);

    // Get the actual quantization used when model was installed
    const installedModels = await modelManager.getInstalledModels();
    const installedModelInfo = installedModels[modelId];
    const quantization = (installedModelInfo as any)?.quantization || modelInfo?.quantization || 'Q4_K_M';

    // Try to use llama.cpp loader with GGUF weights if available
    // In our app, all models in RECOMMENDED_MODELS are GGUF models
    if (modelInfo) {
        const weightsExist = await weightsDownloader.weightsExist(modelId, quantization);

        if (weightsExist) {
            try {
                // Use llama.cpp loader for inference with chat template
                const session = await llamaLoader.getSession(modelId, quantization);

                // Use chat template for proper formatting
                const messages = ChatTemplate.fromPrompt(req.prompt, req.systemPrompt);

                // Collect streaming tokens if callback provided
                let fullText = '';
                const onToken = req.onToken
                    ? (token: string) => {
                        fullText += token;
                        req.onToken?.(token);
                    }
                    : undefined;

                const output = await session.generateChat(messages, {
                    maxTokens: 512,
                    // LFM2 Recommended parameters
                    temperature: 0.3,
                    minP: 0.15,
                    repeatPenalty: 1.05,
                    topP: 1.0, // Default to 1.0 when using minP
                    onToken,
                });

                return {
                    text: fullText || String(output || ''),
                    raw: output,
                    modelId,
                };
            } catch (llamaError: any) {
                console.error('Llama inference failed:', llamaError);
                throw llamaError;
            }
        } else {
            return {
                text: 'Model weights found but verification failed.',
                raw: null,
                modelId
            };
        }
    }

    return {
        text: 'Model configuration not found.',
        raw: null,
        modelId
    };
}
