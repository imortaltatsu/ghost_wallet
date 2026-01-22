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
                    // Use correct defaults: temperature=1.0, top_k=64, top_p=0.95, min_p=0.0
                    temperature: 0.7, // Lower temp for consistency in this app
                    topK: 40,
                    topP: 0.9,
                    onToken,
                });

                return {
                    text: fullText || String(output || ''),
                    raw: output,
                    modelId,
                };
            } catch (llamaError: any) {
                // Fall through to standard model loading if llama.cpp fails
                // Only log if it's not a "module not found" error (expected during development)
                const errorMsg = llamaError?.message || String(llamaError);
                if (
                    !errorMsg.includes('module not found') &&
                    !errorMsg.includes('Cannot find module') &&
                    !errorMsg.includes('previously failed to load')
                ) {
                    // Only log once per error type to avoid spam
                    console.warn('llama.cpp inference failed, trying standard API:', errorMsg);
                }
                // Don't retry - fall through to react-native-ai if we had it integrated
                // For now, in this app we primarily rely on llama.rn
                throw llamaError;
            }
        }
    }

    return {
        text: 'Model weights not found or inference failed.',
        raw: null,
        modelId
    };
}
