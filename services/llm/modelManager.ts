import { useLLMStore } from '@/store/llmStore';
import { ModelInfo } from '@/types/chat';

/**
 * Model Manager
 * Facade for accessing model state outside of React components
 */
export const modelManager = {
    getCurrentModel: async (): Promise<string | null> => {
        const state = useLLMStore.getState();
        return state.currentModel?.id || null;
    },

    isInstalled: async (modelId: string): Promise<boolean> => {
        const state = useLLMStore.getState();
        // Check if model is in available models list and marked as downloaded
        const model = state.availableModels.find(m => m.id === modelId);
        return !!model?.downloaded;
    },

    getInstalledModels: async (): Promise<Record<string, ModelInfo>> => {
        const state = useLLMStore.getState();
        const installed: Record<string, ModelInfo> = {};

        state.availableModels.forEach(model => {
            if (model.downloaded) {
                installed[model.id] = model;
            }
        });

        return installed;
    }
};
