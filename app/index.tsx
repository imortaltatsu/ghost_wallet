import { ChatContainer } from '@/components/chat/ChatContainer';
import { LlamaService } from '@/services/llm/LlamaService';
import { useChatStore } from '@/store/chatStore';
import { useLLMStore } from '@/store/llmStore';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function AIChatScreen() {
    const [isInitializing, setIsInitializing] = useState(false);

    const {
        currentModel,
        modelConfig,
        isModelLoaded,
        setModelLoaded,
        setError,
        loadAvailableModels,
    } = useLLMStore();

    const { clearHistory } = useChatStore();
    const llamaService = LlamaService.getInstance();

    useEffect(() => {
        // Load models list in background without blocking UI
        setTimeout(() => {
            loadAvailableModels();
        }, 100);
    }, []);

    const initializeModel = async () => {
        if (!currentModel?.localPath) {
            Alert.alert('No Model', 'Please download a model first');
            return;
        }

        if (llamaService.isReady()) {
            setModelLoaded(true);
            return;
        }

        setIsInitializing(true);
        try {
            await llamaService.initialize({
                ...modelConfig,
                modelPath: currentModel.localPath,
                modelName: currentModel.name,
            });
            setModelLoaded(true);
        } catch (error) {
            console.error('Failed to initialize model:', error);
            setError(error instanceof Error ? error.message : 'Failed to load model');
            Alert.alert('Error', 'Failed to load model. Please try again.');
        } finally {
            setIsInitializing(false);
        }
    };

    const handleClearHistory = () => {
        Alert.alert(
            'Clear Chat History',
            'Are you sure you want to clear all messages?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => clearHistory(),
                },
            ]
        );
    };

    const handleSettings = () => {
        router.push('/settings/ai-settings');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'Ghost Wallet AI',
                        headerRight: () => (
                            <View style={styles.headerButtons}>
                                <Pressable onPress={handleClearHistory} style={styles.headerButton}>
                                    <Ionicons name="trash-outline" size={22} color="#007AFF" />
                                </Pressable>
                                <Pressable onPress={handleSettings} style={styles.headerButton}>
                                    <Ionicons name="settings-outline" size={22} color="#007AFF" />
                                </Pressable>
                            </View>
                        ),
                    }}
                />

                {!currentModel ? (
                    <View style={styles.setupContainer}>
                        <Ionicons name="cube-outline" size={64} color="#ccc" />
                        <Text style={styles.setupTitle}>No Model Downloaded</Text>
                        <Text style={styles.setupText}>
                            Download an AI model to start chatting
                        </Text>
                        <Pressable style={styles.setupButton} onPress={handleSettings}>
                            <Text style={styles.setupButtonText}>Download Model</Text>
                        </Pressable>
                    </View>
                ) : isInitializing ? (
                    <View style={styles.setupContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.setupTitle}>Initializing Model...</Text>
                        <Text style={styles.setupText}>{currentModel.name}</Text>
                        <Text style={styles.setupHint}>This may take a moment</Text>
                    </View>
                ) : (
                    <>
                        {currentModel.downloaded && !isModelLoaded && (
                            <View style={styles.initBanner}>
                                <View style={styles.initBannerContent}>
                                    <Ionicons name="information-circle" size={20} color="#856404" />
                                    <Text style={styles.initBannerText}>Model ready to load</Text>
                                </View>
                                <Pressable style={styles.initButton} onPress={initializeModel}>
                                    <Text style={styles.initButtonText}>Load Model</Text>
                                </Pressable>
                            </View>
                        )}
                        {isModelLoaded && (
                            <View style={styles.modelBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                                <Text style={styles.modelBadgeText}>{currentModel.name}</Text>
                            </View>
                        )}
                        <ChatContainer />
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    headerButton: {
        padding: 4,
    },
    setupContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    setupTitle: {
        fontSize: 24,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
        color: '#000',
    },
    setupText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    setupHint: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
    setupButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    setupButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#f0f9ff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modelBadgeText: {
        fontSize: 12,
        color: '#34C759',
        fontWeight: '500',
    },
    initBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF9E6',
        borderBottomWidth: 1,
        borderBottomColor: '#FFD700',
    },
    initBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    initBannerText: {
        fontSize: 14,
        color: '#856404',
        fontWeight: '500',
    },
    initButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    initButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
