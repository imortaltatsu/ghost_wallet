import { ModelInfo } from '@/types/chat';

export const RECOMMENDED_MODELS: ModelInfo[] = [
    {
        id: 'lfm2-350m-q4',
        name: 'LiquidAI LFM2 350M (Q4_K_M)',
        url: 'https://huggingface.co/LiquidAI/LFM2-350M-GGUF/resolve/main/lfm2-350m-q4_k_m.gguf',
        size: '220 MB',
        sizeBytes: 220 * 1024 * 1024,
        quantization: 'Q4_K_M',
        description: 'Ultra-fast, lightweight model optimized for edge AI and mobile devices. Excellent for real-time conversations.',
        recommended: true,
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
]