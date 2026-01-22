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
    StyleSheet,
    Text,
    View
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
        loadAvailableModels();
        initializeModel();
    }, []);

    const initializeModel = async () => {
        if (!currentModel?.localPath) {
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
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'AI Chat',
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
                    <Text style={styles.setupTitle}>No Model Selected</Text>
                    <Text style={styles.setupText}>
                        Please select and download a model to start chatting
                    </Text>
                    <Pressable style={styles.setupButton} onPress={handleSettings}>
                        <Text style={styles.setupButtonText}>Select Model</Text>
                    </Pressable>
                </View>
            ) : isInitializing ? (
                <View style={styles.setupContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.setupTitle}>Loading Model...</Text>
                    <Text style={styles.setupText}>{currentModel.name}</Text>
                </View>
            ) : (
                <>
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
    );
}

const styles = StyleSheet.create({
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
});
