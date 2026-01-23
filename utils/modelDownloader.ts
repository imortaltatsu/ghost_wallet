import { DownloadProgress, ModelInfo } from '@/types/chat';
import RNFS from 'react-native-fs';

export class ModelDownloader {
    private static downloadCallbacks: Map<string, (progress: DownloadProgress) => void> = new Map();

    static async downloadModel(
        model: ModelInfo,
        onProgress?: (progress: DownloadProgress) => void
    ): Promise<string> {
        const modelDir = `${RNFS.DocumentDirectoryPath}/models`;
        const modelPath = `${modelDir}/${model.id}.gguf`;

        // Create models directory if it doesn't exist
        const dirExists = await RNFS.exists(modelDir);
        if (!dirExists) {
            await RNFS.mkdir(modelDir);
        }

        // Check if model already exists
        const fileExists = await RNFS.exists(modelPath);
        if (fileExists) {
            console.log('Model already downloaded:', modelPath);
            return modelPath;
        }

        // Register progress callback
        if (onProgress) {
            this.downloadCallbacks.set(model.id, onProgress);
        }

        try {
            // Start download
            const downloadResult = RNFS.downloadFile({
                fromUrl: model.url,
                toFile: modelPath,
                background: true, // Enable background downloading for iOS
                discretionary: true, // Allow OS to optimize scheduling
                progressInterval: 500,
                progress: (res) => {
                    const progress: DownloadProgress = {
                        modelId: model.id,
                        bytesDownloaded: res.bytesWritten,
                        totalBytes: res.contentLength,
                        percentage: (res.bytesWritten / res.contentLength) * 100,
                        status: 'downloading',
                    };

                    const callback = this.downloadCallbacks.get(model.id);
                    if (callback) {
                        callback(progress);
                    }
                },
            });

            const result = await downloadResult.promise;

            if (result.statusCode === 200) {
                console.log('Model downloaded successfully:', modelPath);

                // Final progress update
                if (onProgress) {
                    onProgress({
                        modelId: model.id,
                        bytesDownloaded: model.sizeBytes,
                        totalBytes: model.sizeBytes,
                        percentage: 100,
                        status: 'completed',
                    });
                }

                this.downloadCallbacks.delete(model.id);
                return modelPath;
            } else {
                throw new Error(`Download failed with status code: ${result.statusCode}`);
            }
        } catch (error) {
            console.error('Error downloading model:', error);

            // Cleanup partial download
            const exists = await RNFS.exists(modelPath);
            if (exists) {
                await RNFS.unlink(modelPath);
            }

            if (onProgress) {
                onProgress({
                    modelId: model.id,
                    bytesDownloaded: 0,
                    totalBytes: model.sizeBytes,
                    percentage: 0,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }

            this.downloadCallbacks.delete(model.id);
            throw error;
        }
    }

    static async deleteModel(modelId: string): Promise<void> {
        const modelPath = `${RNFS.DocumentDirectoryPath}/models/${modelId}.gguf`;
        const exists = await RNFS.exists(modelPath);

        if (exists) {
            await RNFS.unlink(modelPath);
            console.log('Model deleted:', modelPath);
        }
    }

    static async getModelPath(modelId: string): Promise<string | null> {
        const modelPath = `${RNFS.DocumentDirectoryPath}/models/${modelId}.gguf`;
        const exists = await RNFS.exists(modelPath);

        return exists ? modelPath : null;
    }

    // Checking if weights exist for a specific model config
    static async weightsExist(modelId: string, quantization?: string): Promise<boolean> {
        // We currently ignore quantization in filename for simplicity but preserving API signature
        const path = await this.getModelPath(modelId);
        return !!path;
    }

    static async getWeightsPath(modelId: string, quantization?: string): Promise<string> {
        const path = await this.getModelPath(modelId);
        if (!path) throw new Error(`Weights not found for model ${modelId}`);
        return path;
    }

    static async getDownloadedModels(): Promise<string[]> {
        const modelDir = `${RNFS.DocumentDirectoryPath}/models`;
        const dirExists = await RNFS.exists(modelDir);

        if (!dirExists) {
            return [];
        }

        const files = await RNFS.readDir(modelDir);
        return files
            .filter(file => file.name.endsWith('.gguf'))
            .map(file => file.name.replace('.gguf', ''));
    }

    static async getAvailableSpace(): Promise<number> {
        const freeSpace = await RNFS.getFSInfo();
        return freeSpace.freeSpace;
    }
}
