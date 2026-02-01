import { DownloadProgress, ModelInfo } from '@/types/chat';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

export class ModelDownloader {
    private static downloadCallbacks: Map<string, (progress: DownloadProgress) => void> = new Map();
    /** Content-Length from begin callback (iOS often doesn't report it in progress). */
    private static contentLengthByModel: Map<string, number> = new Map();

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
        this.contentLengthByModel.delete(model.id);

        const isIOS = Platform.OS === 'ios';
        try {
            // Start download
            // iOS: progress callback only fires when `begin` is also provided (react-native-fs#760).
            // iOS: background download can throttle/omit progress; use foreground on iOS for reliable feedback.
            const downloadResult = RNFS.downloadFile({
                fromUrl: model.url,
                toFile: modelPath,
                background: !isIOS,
                discretionary: !isIOS,
                progressInterval: isIOS ? 250 : 500,
                begin: (res) => {
                    if (res.contentLength > 0) {
                        this.contentLengthByModel.set(model.id, res.contentLength);
                    }
                    // Emit initial progress so UI shows "Downloading..." immediately
                    const total = res.contentLength > 0 ? res.contentLength : model.sizeBytes;
                    const progressPayload: DownloadProgress = {
                        modelId: model.id,
                        bytesDownloaded: 0,
                        totalBytes: total,
                        percentage: 0,
                        status: 'downloading',
                    };
                    const cb = this.downloadCallbacks.get(model.id);
                    if (cb) cb(progressPayload);
                },
                progress: (res) => {
                    const total =
                        res.contentLength > 0
                            ? res.contentLength
                            : this.contentLengthByModel.get(model.id) ?? model.sizeBytes;
                    const percentage =
                        total > 0 ? Math.min(100, (res.bytesWritten / total) * 100) : 0;
                    const progressPayload: DownloadProgress = {
                        modelId: model.id,
                        bytesDownloaded: res.bytesWritten,
                        totalBytes: total,
                        percentage,
                        status: 'downloading',
                    };
                    const callback = this.downloadCallbacks.get(model.id);
                    if (callback) {
                        callback(progressPayload);
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
                this.contentLengthByModel.delete(model.id);
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
            this.contentLengthByModel.delete(model.id);
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
