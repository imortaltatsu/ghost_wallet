import { useLLMStore } from '@/store/llmStore';
import { ModelInfo } from '@/types/chat';
import { ModelDownloader } from '@/utils/modelDownloader';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function AISettingsScreen() {
    const {
        currentModel,
        availableModels,
        downloadProgress,
        isLoading,
        error,
        setCurrentModel,
        downloadModel,
        loadAvailableModels,
        deleteModel,
        updateModelConfig,
        modelConfig,
    } = useLLMStore();

    const [expandedModel, setExpandedModel] = useState<string | null>(null);

    useEffect(() => {
        loadAvailableModels();
    }, []);

    const handleDownloadModel = async (model: ModelInfo) => {
        try {
            // Check available space
            const freeSpace = await ModelDownloader.getAvailableSpace();
            const requiredSpace = model.sizeBytes * 1.1; // 10% buffer

            if (freeSpace < requiredSpace) {
                Alert.alert(
                    'Insufficient Storage',
                    `This model requires ${model.size} but you only have ${Math.floor(freeSpace / (1024 * 1024 * 1024))}GB available.`
                );
                return;
            }

            const localPath = await downloadModel(model);

            // Update model with local path
            const updatedModel = { ...model, downloaded: true, localPath };
            setCurrentModel(updatedModel);

            Alert.alert('Success', 'Model downloaded successfully!');
            await loadAvailableModels();
        } catch (error) {
            Alert.alert('Download Failed', error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const handleSelectModel = async (model: ModelInfo) => {
        if (!model.downloaded) {
            Alert.alert(
                'Download Required',
                'This model needs to be downloaded first. Download now?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Download', onPress: () => handleDownloadModel(model) },
                ]
            );
            return;
        }

        setCurrentModel(model);
        Alert.alert('Model Selected', `${model.name} is now active`);
    };

    const handleDeleteModel = (model: ModelInfo) => {
        Alert.alert(
            'Delete Model',
            `Are you sure you want to delete ${model.name}? This will free up ${model.size}.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteModel(model.id);
                            Alert.alert('Success', 'Model deleted');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete model');
                        }
                    },
                },
            ]
        );
    };

    const renderModelCard = (model: ModelInfo) => {
        const isExpanded = expandedModel === model.id;
        const isDownloading = downloadProgress?.modelId === model.id;
        const isCurrentModel = currentModel?.id === model.id;

        return (
            <View key={model.id} style={styles.modelCard}>
                <Pressable
                    onPress={() => setExpandedModel(isExpanded ? null : model.id)}
                    style={styles.modelHeader}
                >
                    <View style={styles.modelInfo}>
                        <View style={styles.modelTitleRow}>
                            <Text style={styles.modelName}>{model.name}</Text>
                            {model.recommended && (
                                <View style={styles.recommendedBadge}>
                                    <Text style={styles.recommendedText}>Recommended</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.modelSize}>{model.size} • {model.quantization}</Text>
                        <Text style={styles.modelDescription}>{model.description}</Text>
                    </View>

                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={24}
                        color="#666"
                    />
                </Pressable>

                {isExpanded && (
                    <View style={styles.modelActions}>
                        {isDownloading ? (
                            <View style={styles.downloadProgress}>
                                <ActivityIndicator size="small" color="#007AFF" />
                                <Text style={styles.downloadText}>
                                    {downloadProgress.percentage.toFixed(0)}% ({(downloadProgress.bytesDownloaded / (1024 * 1024)).toFixed(1)}MB / {(downloadProgress.totalBytes / (1024 * 1024)).toFixed(1)}MB)
                                </Text>
                            </View>
                        ) : model.downloaded ? (
                            <View style={styles.actionButtons}>
                                <Pressable
                                    style={[styles.actionButton, isCurrentModel && styles.selectedButton]}
                                    onPress={() => handleSelectModel(model)}
                                >
                                    <Ionicons
                                        name={isCurrentModel ? 'checkmark-circle' : 'radio-button-off'}
                                        size={20}
                                        color={isCurrentModel ? '#fff' : '#007AFF'}
                                    />
                                    <Text style={[styles.actionButtonText, isCurrentModel && styles.selectedButtonText]}>
                                        {isCurrentModel ? 'Selected' : 'Select'}
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={() => handleDeleteModel(model)}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                    <Text style={styles.deleteButtonText}>Delete</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <Pressable
                                style={styles.downloadButton}
                                onPress={() => handleDownloadModel(model)}
                                disabled={isLoading}
                            >
                                <Ionicons name="download-outline" size={20} color="#fff" />
                                <Text style={styles.downloadButtonText}>Download</Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'AI Settings',
                }}
            />

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available Models</Text>
                <Text style={styles.sectionDescription}>
                    All models run 100% on-device. No internet required after download.
                </Text>

                {availableModels.map(renderModelCard)}
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Model Configuration</Text>

                <View style={styles.configItem}>
                    <Text style={styles.configLabel}>Temperature: {modelConfig.temperature}</Text>
                    <Text style={styles.configDescription}>
                        Controls randomness (0.0 = deterministic, 1.0 = creative)
                    </Text>
                </View>

                <View style={styles.configItem}>
                    <Text style={styles.configLabel}>Context Size: {modelConfig.contextSize}</Text>
                    <Text style={styles.configDescription}>
                        Maximum conversation history length
                    </Text>
                </View>

                <View style={styles.configItem}>
                    <Text style={styles.configLabel}>GPU Layers: {modelConfig.nGpuLayers}</Text>
                    <Text style={styles.configDescription}>
                        Number of layers offloaded to GPU (99 = all)
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
        color: '#000',
    },
    sectionDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    modelCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
    },
    modelHeader: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    modelInfo: {
        flex: 1,
    },
    modelTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    modelName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    recommendedBadge: {
        backgroundColor: '#34C759',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    recommendedText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '600',
    },
    modelSize: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    modelDescription: {
        fontSize: 13,
        color: '#999',
    },
    modelActions: {
        padding: 16,
        paddingTop: 0,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    selectedButton: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
    },
    selectedButtonText: {
        color: '#fff',
    },
    deleteButton: {
        borderColor: '#FF3B30',
    },
    deleteButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF3B30',
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#007AFF',
    },
    downloadButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    downloadProgress: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
    },
    downloadText: {
        fontSize: 14,
        color: '#666',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        margin: 16,
        padding: 12,
        backgroundColor: '#FFF0F0',
        borderRadius: 8,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        color: '#FF3B30',
    },
    configItem: {
        marginBottom: 16,
    },
    configLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
        color: '#000',
    },
    configDescription: {
        fontSize: 13,
        color: '#666',
    },
});
