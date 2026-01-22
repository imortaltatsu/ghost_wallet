import { ModelInfo } from '@/types/chat';

export const RECOMMENDED_MODELS: ModelInfo[] = [
    {
        id: 'lfm2-350m-q4',
        name: 'LiquidAI LFM2 350M',
        url: 'https://huggingface.co/LiquidAI/LFM2-350M-GGUF/resolve/main/lfm2-350m-q4_k_m.gguf',
        size: '220 MB',
        sizeBytes: 220 * 1024 * 1024,
        quantization: 'Q4_K_M',
        description: 'Ultra-fast, lightweight model optimized for edge AI and mobile devices. Excellent for real-time conversations.',
        recommended: true,
    },
    {
        id: 'llama-3.2-1b-q4',
        name: 'Llama 3.2 1B Instruct (Q4_K_M)',
        url: 'https://huggingface.co/lmstudio-community/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
        size: '750 MB',
        sizeBytes: 750 * 1024 * 1024,
        quantization: 'Q4_K_M',
        description: 'Balanced performance and quality. Great for general conversations and tasks.',
    },
    {
        id: 'llama-3.2-3b-q4',
        name: 'Llama 3.2 3B Instruct (Q4_K_M)',
        url: 'https://huggingface.co/lmstudio-community/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
        size: '2.0 GB',
        sizeBytes: 2 * 1024 * 1024 * 1024,
        quantization: 'Q4_K_M',
        description: 'Higher quality responses with more reasoning capability. Requires more memory.',
    },
    {
        id: 'phi-3.5-mini-q4',
        name: 'Phi 3.5 Mini Instruct (Q4_K_M)',
        url: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf',
        size: '2.2 GB',
        sizeBytes: 2.2 * 1024 * 1024 * 1024,
        quantization: 'Q4_K_M',
        description: 'Microsoft Phi model with strong reasoning and coding capabilities.',
    },
];

export const DEFAULT_MODEL_CONFIG = {
    contextSize: 2048,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    nGpuLayers: 99, // Use GPU acceleration when available
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
    '
