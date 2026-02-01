/**
 * Model definitions and metadata
 * - LFM2-700M GGUF from LiquidAI (base Ghost AI, optimized for mobile)
 * - LiquidAI/LFM2.5-1.2B-Instruct-GGUF — 1.2B instruct (non-thinking), Ghost AI Pro
 * - LiquidAI/LFM2.5-1.2B-Thinking-GGUF — 1.2B reasoning (experimental), Ghost AI Ultra
 *
 * Optional CLI download (e.g. for dev/preload):
 *   huggingface-cli download LiquidAI/LFM2-700M-GGUF LFM2-700M-Q4_K_M.gguf --local-dir .
 *   huggingface-cli download LiquidAI/LFM2.5-1.2B-Instruct-GGUF LFM2.5-1.2B-Instruct-Q4_0.gguf --local-dir .
 *   huggingface-cli download LiquidAI/LFM2.5-1.2B-Thinking-GGUF LFM2.5-1.2B-Thinking-Q4_0.gguf --local-dir .
 */

import { ModelInfo } from "@/types/chat";

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: "lfm2-700m",
    name: "Ghost AI",
    aliases: ["Ghost AI", "ghost ai"],
    size: "~514 MB",
    description: "Fast responses. Base model (700M params), quick replies.",
    hfModelId: "LiquidAI/LFM2-700M",
    ggufModelId: "LiquidAI/LFM2-700M-GGUF",
    defaultQuantization: "Q4_K_M",
    availableQuantizations: ["Q4_K_M"],
    recommended: true,
    capabilities: ["fast-inference", "mobile-optimized"],
    url: "https://huggingface.co/LiquidAI/LFM2-700M-GGUF/resolve/main/LFM2-700M-Q4_K_M.gguf",
    sizeBytes: 514 * 1024 * 1024,
  },
  {
    id: "lfm2.5-1.2b-thinking-q4_0",
    name: "Ghost AI Ultra (Experimental)",
    aliases: ["Ghost AI Ultra", "ghost ai ultra", "Ghost AI Ultra (Experimental)"],
    size: "~696 MB",
    description: "Experimental reasoning model. Thinking / chain-of-thought, Q4_0.",
    hfModelId: "LiquidAI/LFM2.5-1.2B-Thinking-GGUF",
    ggufModelId: "LiquidAI/LFM2.5-1.2B-Thinking-GGUF",
    defaultQuantization: "Q4_0",
    availableQuantizations: ["Q4_0"],
    recommended: false,
    capabilities: ["thinking", "mobile-optimized"],
    url: "https://huggingface.co/LiquidAI/LFM2.5-1.2B-Thinking-GGUF/resolve/main/LFM2.5-1.2B-Thinking-Q4_0.gguf",
    sizeBytes: 696 * 1024 * 1024,
  },
  {
    id: "lfm2.5-1.2b-instruct-pro",
    name: "Ghost AI Pro",
    aliases: ["Ghost AI Pro", "ghost ai pro"],
    size: "~696 MB",
    description: "Instruct model, no reasoning. Smarter responses, Q4_0.",
    hfModelId: "LiquidAI/LFM2.5-1.2B-Instruct-GGUF",
    ggufModelId: "LiquidAI/LFM2.5-1.2B-Instruct-GGUF",
    defaultQuantization: "Q4_0",
    availableQuantizations: ["Q4_0"],
    recommended: false,
    capabilities: ["instruct", "mobile-optimized"],
    url: "https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF/resolve/main/LFM2.5-1.2B-Instruct-Q4_0.gguf",
    sizeBytes: 696 * 1024 * 1024,
  },
];

export const RECOMMENDED_MODELS = AVAILABLE_MODELS;

export const DEFAULT_MODEL_CONFIG = {
  contextSize: 4096,
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
  nGpuLayers: 99,
  nPredict: 512,
  /** KV cache compression: q4_0 reduces memory for large context */
  cacheTypeK: "q4_0" as const,
  cacheTypeV: "q4_0" as const,
};

export const STOP_WORDS = [
  "</s>",
  "<|end|>",
  "<|eot_id|>",
  "<|end_of_text|>",
  "<|im_end|>",
  "<|EOT|>",
  "<|END_OF_TURN_TOKEN|>",
  "<|user|>",
  "<|assistant|>",
  "<|system|>",
  "### User:",
  "### Assistant:",
  "User:",
  "Assistant:",
];

export function getModelInfo(id: string): ModelInfo | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id);
}
