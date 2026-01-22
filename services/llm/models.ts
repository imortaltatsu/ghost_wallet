import { RECOMMENDED_MODELS } from '@/constants/Models';
import { ModelInfo } from '@/types/chat';

export type ModelId = string;
export type QuantizationLevel = string;

export function getModelInfo(modelId: string): ModelInfo | undefined {
    return RECOMMENDED_MODELS.find(m => m.id === modelId);
}
