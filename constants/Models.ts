/**
 * Model definitions and metadata
 * LFM2-350M GGUF from LiquidAI (optimized for mobile)
 * https://huggingface.co/LiquidAI/LFM2-350M-GGUF
 * 
 * GGUF format is optimized for on-device inference with llama.cpp and similar engines.
 * Multiple quantization levels available for different quality/size tradeoffs.
 */

export type ModelId = 'lfm2-350m';

export type QuantizationLevel =
    | 'UD-IQ1_S'  // ~882 MB - Ultra-compressed 1-bit quantization
    | 'IQ2_XXS'   // ~270 MB - Ultra-small 2-bit quantization (fastest)
    | 'Q4_K_S'    // ~2.0 GB - Recommended: Good balance
    | 'Q4_K_M'    // ~2.1 GB - Recommended: Better quality
    | 'Q5_K_M'    // ~2.44 GB - Higher quality
    | 'Q8_0'      // ~3.62 GB - Highest quality
    | 'Q4_0'      // ~1.99 GB - Smaller size
    | 'Q2_K'      // ~1.37 GB - Smallest size, lower quality
    | 'BF16';     // ~6.81 GB - Full precision (not recommended for mobile)

export interface ModelInfo {
    id: ModelId;
    name: string;
    size: string; // e.g., "2.1 GB"
    description: string;
    hfModelId?: string; // Hugging Face model identifier (base model)
    ggufModelId?: string; // GGUF model identifier for on-device inference
    defaultQuantization?: QuantizationLevel; // Recommended quantization level
    availableQuantizations?: QuantizationLevel[]; // Available quantization options
    url?: string; // Download URL if needed
    recommended?: boolean;
    capabilities?: string[]; // e.g., ['tool-calling', 'code', 'multilingual']
    // Added properties to match existing usage in app
    downloaded?: boolean;
    localPath?: string;
    sizeBytes?: number; // Optional for backward compatibility
}

export const RECOMMENDED_MODELS: ModelInfo[] = [
    {
        id: 'lfm2-350m',
        name: 'LiquidAI LFM2 350M (GGUF)',
        size: '~229 MB', // Correction based on earlier file size check
        description: 'LiquidAI LFM2 350M parameter model with Q4_K_M quantization, optimized for mobile devices.',
        hfModelId: 'LiquidAI/LFM2-350M',
        ggufModelId: 'LiquidAI/LFM2-350M-GGUF',
        defaultQuantization: 'Q4_K_M',
        availableQuantizations: [
            'Q4_K_M',    // ~229 MB - Recommended: Good balance
            'Q2_K',      // ~150 MB - Smaller size
            'Q4_0',      // ~220 MB - Balanced
            'Q4_K_S',    // ~225 MB - Good balance
            'Q5_K_M',    // ~260 MB - Higher quality
        ],
        recommended: true,
        capabilities: ['fast-inference', 'multilingual', 'gguf-optimized', 'mobile-optimized'],
        // URL for direct download compatibility
        url: 'https://huggingface.co/LiquidAI/LFM2-350M-GGUF/resolve/main/LFM2-350M-Q4_K_M.gguf',
        sizeBytes: 229 * 1024 * 1024,
    },
];

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
    return RECOMMENDED_MODELS.find((m) => m.id === id);
}