import { DEFAULT_MODEL_CONFIG, RECOMMENDED_MODELS } from '@/constants/Models';
import { DownloadProgress, ModelConfig, ModelInfo } from '@/types/chat';
import { ModelDownloader } from '@/utils/modelDownloader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface LLMStore {
    currentModel: ModelInfo | null;
    modelConfig: ModelConfig;
    isModelLoaded: boolean;
    isLoading: boolean;
    error: string | null;
    downloadProgress: DownloadProgress | null;
    availableModels: ModelInfo[];

    // Actions
    setCurrentModel: (model: ModelInfo) => void;
    updateModelConfig: (config: Partial<ModelConfig>) => void;
    setModelLoaded: (loaded: boolean) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setDownloadProgress: (progress: DownloadProgress | null) => void;
    downloadModel: (model: ModelInfo) => Promise<string>;
    loadAvailableModels: () => Promise<void>;
    deleteModel: (modelId: string) => Promise<void>;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}

const STORAGE_KEY = '@ghostwallet:llm_settings';

export const useLLMStore = create<LLMStore>((set, get) => ({
    currentModel: null,
    modelConfig: {
        ...DEFAULT_MODEL_CONFIG,
        modelPath: '',
        modelName: '',
    },
    isModelLoaded: false,
    isLoading: false,
    error: null,
    downloadProgress: null,
    availableModels: RECOMMENDED_MODELS,

    setCurrentModel: (model) => {
        set({ currentModel: model });
        get().saveSettings();
    },

    updateModelConfig: (config) => {
        set((state) => ({
            modelConfig: { ...state.modelConfig, ...config },
        }));
        get().saveSettings();
    },

    setModelLoaded: (loaded) => {
        set({ isModelLoaded: loaded, error: loaded ? null : get().error });
    },

    setLoading: (loading) => {
        set({ isLoading: loading });
    },

    setError: (error) => {
        set({ error, isLoading: false });
    },

    setDownloadProgress: (progress) => {
        set({ downloadProgress: progress });
    },

    downloadModel: async (model) => {
        try {
            set({ isLoading: true, error: null });

            const modelPath = await ModelDownloader.downloadModel(
                model,
                (progress) => {
                    set({ downloadProgress: progress });
                }
            );

            set({
                isLoading: false,
                downloadProgress: null,
            });

            return modelPath;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Download failed';
            set({
                error: errorMessage,
                isLoading: false,
                downloadProgress: null,
            });
            throw error;
        }
    },

    loadAvailableModels: async () => {
        try {
            const downloadedModelIds = await ModelDownloader.getDownloadedModels();

            const updatedModels = RECOMMENDED_MODELS.map((model) => ({
                ...model,
                downloaded: downloadedModelIds.includes(model.id),
                localPath: downloadedModelIds.includes(model.id)
                    ? `${require('react-native-fs').DocumentDirectoryPath}/models/${model.id}.gguf`
                    : undefined,
            }));

            set({ availableModels: updatedModels });
        } catch (error) {
            console.error('Failed to load available models:', error);
        }
    },

    deleteModel: async (modelId) => {
        try {
            await ModelDownloader.deleteModel(modelId);
            await get().loadAvailableModels();

            // If deleted model was current, clear it
            if (get().currentModel?.id === modelId) {
                set({ currentModel: null, isModelLoaded: false });
            }
        } catch (error) {
            console.error('Failed to delete model:', error);
            throw error;
        }
    },

    loadSettings: async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const { currentModel, modelConfig } = JSON.parse(stored);
                set({ currentModel, modelConfig });
            }
        } catch (error) {
            console.error('Failed to load LLM settings:', error);
        }
    },

    saveSettings: async () => {
        try {
            const { currentModel, modelConfig } = get();
            await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ currentModel, modelConfig })
            );
        } catch (error) {
            console.error('Failed to save LLM settings:', error);
        }
    },
}));
