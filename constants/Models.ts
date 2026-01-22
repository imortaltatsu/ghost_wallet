/**
 * Model definitions and metadata
 * LFM2-350M GGUF from LiquidAI (optimized for mobile)
 */

import { ModelInfo } from '@/types/chat';

export const AVAILABLE_MODELS: ModelInfo[] = [
    {
        id: 'lfm2-350m',
        name: 'Ghost AI', // Generic name as requested
        size: '~230 MB',
        description: 'On-device secure AI assistant.',
        hfModelId: 'LiquidAI/LFM2-350M',
        ggufModelId: 'LiquidAI/LFM2-350M-GGUF',
        defaultQuantization: 'Q4_K_M',
        availableQuantizations: ['Q4_K_M'],
        recommended: true,
        capabilities: ['fast-inference', 'mobile-optimized'],
        url: 'https://huggingface.co/LiquidAI/LFM2-350M-GGUF/resolve/main/LFM2-350M-Q4_K_M.gguf',
        sizeBytes: 240 * 1024 * 1024,
    },
];

export const RECOMMENDED_MODELS = AVAILABLE_MODELS;

export const DEFAULT_MODEL_CONFIG = {
    contextSize: 2048,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    nGpuLayers: 99,
    nPredict: 512,
};

export const STOP_WORDS = [
    '</s>',
    '<|end|>',
    '<|eot_id|>',
    '<|end_of_text|>',
    '<|im_end|>',
    '<|EOT|>',
    '<|END_OF_TURN_TOKEN|>',
];

export function getModelInfo(id: string): ModelInfo | undefined {
    return AVAILABLE_MODELS[0]; // Always return the single model
}