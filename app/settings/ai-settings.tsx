import { useChatStore } from '@/store/chatStore';
import { useLLMStore } from '@/store/llmStore';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';

export default function AISettingsScreen() {
    const {
        currentModel,
        availableModels,
        isLoading,
        downloadProgress,
        downloadModel,
        deleteModel,
        setCurrentModel,
        modelConfig,
        updateModelConfig,
        loadAvailableModels,
    } = useLLMStore();

    const { clearHistory, messages } = useChatStore();

    useEffect(() => {
        loadAvailableModels();
    }, []);

    const handleDownload = async (model: any) => {
        try {
            await downloadModel(model);
        } catch (error) {
            Alert.alert('Download Failed', error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const handleDelete = async (modelId: string) => {
        Alert.alert(
            'Delete Model',
            'Are you sure you want to delete this model? You will need to re-download it to use it again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteModel(modelId);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete model');
                        }
                    },
                },
            ]
        );
    };

    const handleClearHistory = () => {
        Alert.alert(
            'Clear History',
            'This will remove all messages from your chat history.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => {
                        clearHistory();
                        Alert.alert('Success', 'Chat history cleared');
                    },
                },
            ]
        );
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'AI Settings',
                    headerLargeTitle: false,
                    presentation: 'modal',
                    headerStyle: { backgroundColor: '#fff' },
                    headerShadowVisible: false,
                }}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Model Selection Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>AI Models</Text>
                    <Text style={styles.sectionSubtitle}>
                        manage your on-device AI models. Larger models are smarter but slower.
                    </Text>

                    <View style={styles.card}>
                        {availableModels.map((model) => {
                            const isActive = currentModel?.id === model.id;
                            const isDownloading = downloadProgress?.modelId === model.id && downloadProgress?.status === 'downloading';

                            return (
                                <View key={model.id} style={[styles.modelItem, isActive && styles.activeModelItem]}>
                                    <View style={styles.modelHeader}>
                                        <View style={styles.modelInfo}>
                                            <Text style={styles.modelName}>{model.name}</Text>
                                            <Text style={styles.modelMeta}>
                                                {model.size} • {model.defaultQuantization || 'Q4_K_M'}
                                            </Text>
                                            {isActive && (
                                                <View style={styles.activeBadge}>
                                                    <Text style={styles.activeBadgeText}>Active</Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.modelActions}>
                                            {isDownloading ? (
                                                <View style={styles.progressContainer}>
                                                    <ActivityIndicator size="small" color="#007AFF" />
                                                    <Text style={styles.progressText}>
                                                        {Math.round(downloadProgress?.percentage || 0)}%
                                                    </Text>
                                                </View>
                                            ) : model.downloaded ? (
                                                <View style={styles.downloadedActions}>
                                                    {!isActive && (
                                                        <Pressable
                                                            style={styles.selectButton}
                                                            onPress={() => setCurrentModel(model)}
                                                        >
                                                            <Text style={styles.selectButtonText}>Select</Text>
                                                        </Pressable>
                                                    )}
                                                    <Pressable
                                                        style={styles.deleteButton}
                                                        onPress={() => handleDelete(model.id)}
                                                    >
                                                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                                    </Pressable>
                                                </View>
                                            ) : (
                                                <Pressable
                                                    style={styles.downloadButton}
                                                    onPress={() => handleDownload(model)}
                                                >
                                                    <Ionicons name="cloud-download-outline" size={20} color="#007AFF" />
                                                    <Text style={styles.downloadButtonText}>Download</Text>
                                                </Pressable>
                                            )}
                                        </View>
                                    </View>

                                    <Text style={styles.modelDesc}>{model.description}</Text>

                                    {isDownloading && (
                                        <View style={styles.progressBarBg}>
                                            <View
                                                style={[
                                                    styles.progressBarFill,
                                                    { width: `${downloadProgress?.percentage || 0}%` }
                                                ]}
                                            />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Configuration Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Parameters</Text>
                    <View style={styles.card}>
                        <View style={styles.settingRow}>
                            <View>
                                <Text style={styles.settingLabel}>Use GPU Acceleration</Text>
                                <Text style={styles.settingDesc}>Use Metal (iOS) or Vulkan (Android)</Text>
                            </View>
                            <Switch
                                value={modelConfig.nGpuLayers > 0}
                                onValueChange={(val) => updateModelConfig({ nGpuLayers: val ? 99 : 0 })}
                                trackColor={{ false: '#767577', true: '#34C759' }}
                            />
                        </View>

                        <View style={[styles.settingRow, styles.lastRow]}>
                            <View>
                                <Text style={styles.settingLabel}>Context Size</Text>
                                <Text style={styles.settingDesc}>
                                    {modelConfig.contextSize} tokens (higher uses more RAM)
                                </Text>
                            </View>
                            <View style={styles.readOnlyValue}>
                                <Text style={styles.valueText}>{modelConfig.contextSize}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Data Management Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data & Storage</Text>
                    <View style={styles.card}>
                        <Pressable
                            style={[styles.settingRow, styles.lastRow]}
                            onPress={handleClearHistory}
                        >
                            <View>
                                <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>Clear Chat History</Text>
                                <Text style={styles.settingDesc}>
                                    Delete all {messages.length} messages permanently
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                        </Pressable>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Ghost Wallet AI v1.0.0</Text>
                    <Text style={styles.footerText}>Powered by llama.rn & LiquidAI</Text>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6e6e73',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 12,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#8e8e93',
        marginBottom: 12,
        marginLeft: 12,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    modelItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    activeModelItem: {
        backgroundColor: '#F7F7FA',
    },
    modelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    modelInfo: {
        flex: 1,
        marginRight: 12,
    },
    modelName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    modelMeta: {
        fontSize: 13,
        color: '#8E8E93',
        marginBottom: 6,
    },
    activeBadge: {
        backgroundColor: '#34C759',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    activeBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    modelDesc: {
        fontSize: 14,
        color: '#3C3C43',
        lineHeight: 20,
    },
    modelActions: {
        alignItems: 'flex-end',
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 4,
    },
    downloadButtonText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
    },
    downloadedActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selectButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },
    selectButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButton: {
        padding: 6,
    },
    progressContainer: {
        alignItems: 'center',
    },
    progressText: {
        fontSize: 10,
        color: '#007AFF',
        marginTop: 2,
        fontWeight: '600',
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#E5E5EA',
        borderRadius: 2,
        marginTop: 12,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#007AFF',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
        backgroundColor: '#fff',
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    settingLabel: {
        fontSize: 17,
        color: '#000',
        marginBottom: 4,
    },
    settingDesc: {
        fontSize: 13,
        color: '#8E8E93',
        maxWidth: 240,
    },
    readOnlyValue: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    valueText: {
        fontSize: 17,
        color: '#8E8E93',
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
    },
    footerText: {
        fontSize: 13,
        color: '#C7C7CC',
        marginBottom: 4,
    },
});
