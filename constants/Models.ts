/**
 * Model definitions and metadata
 * LFM2-350M GGUF from LiquidAI (optimized for mobile)
 * https://huggingface.co/LiquidAI/LFM2-350M-GGUF
 * 
 * GGUF format is optimized for on-device inference with llama.cpp and similar engines.
 * Multiple quantization levels available for different quality/size tradeoffs.
 */

import { ModelInfo } from '@/types/chat';

export const AVAILABLE_MODELS: ModelInfo[] = [
    {
        id: 'lfm2-350m',
        name: 'LiquidAI LFM2 350M (GGUF)',
        size: '~550 MB',
        description: 'LiquidAI LFM2 350M parameter model with Q4_K_M quantization, optimized for mobile devices.',
        hfModelId: 'LiquidAI/LFM2-350M',
        ggufModelId: 'LiquidAI/LFM2-350M-GGUF',
        defaultQuantization: 'Q4_K_M', // ~550 MB - Good balance
        availableQuantizations: [
            'Q4_K_M',    // ~550 MB - Recommended: Good balance
            'Q2_K',      // ~350 MB - Smaller size
            'Q4_0',      // ~500 MB - Balanced
            'Q4_K_S',    // ~520 MB - Good balance
            'Q5_K_M',    // ~650 MB - Higher quality
        ],
        recommended: true,
        capabilities: ['fast-inference', 'multilingual', 'gguf-optimized', 'mobile-optimized'],
        // URL for direct download compatibility with existing logic
        url: 'https://huggingface.co/LiquidAI/LFM2-350M-GGUF/resolve/main/LFM2-350M-Q4_K_M.gguf',
        sizeBytes: 240 * 1024 * 1024, // Approx 240MB for Q4_K_M
    },
];

// Alias for compatibility with existing code
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
    return AVAILABLE_MODELS.find((m) => m.id === id);
}