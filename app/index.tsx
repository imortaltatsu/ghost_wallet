import { ChatContainer } from '@/components/chat/ChatContainer';
import { LlamaService } from '@/services/llm/LlamaService';
import { useChatStore } from '@/store/chatStore';
import { useLLMStore } from '@/store/llmStore';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function AIChatScreen() {
    const [isInitializing, setIsInitializing] = useState(false);

    const {
        currentModel,
        modelConfig,
        isModelLoaded,
        setModelLoaded,
        setError,
        loadAvailableModels,
        availableModels,
        setCurrentModel
    } = useLLMStore();

    const { clearHistory } = useChatStore();
    const llamaService = LlamaService.getInstance();

    // Auto-initialize weights effect
    useEffect(() => {
        const init = async () => {
            // 1. Load available models list
            await loadAvailableModels();

            // 2. Auto-select recommended model if none selected
            if (!currentModel) {
                // Use getState() logic equivalent - accessing from hook due to closure
                const recommended = availableModels.find(m => m.recommended) || availableModels[0];
                if (recommended) {
                    setCurrentModel(recommended);
                }
            }
        };

        init();
    }, []); // Run once on mount

    // Auto-load weights if downloaded and ready
    useEffect(() => {
        const autoLoad = async () => {
            if (currentModel?.downloaded && !isModelLoaded && !isInitializing && !llamaService.isReady()) {
                console.log('Auto-initializing weights for:', currentModel.name);
                await initializeModel();
            }
        };

        if (currentModel?.downloaded) {
            // Small delay to ensure UI renders first
            const timer = setTimeout(autoLoad, 500);
            return () => clearTimeout(timer);
        }
    }, [currentModel, isModelLoaded]);

    const initializeModel = async () => {
        if (!currentModel?.localPath) {
            if (!currentModel?.downloaded) {
                // If meant to auto-init but not downloaded, we can't do much automatically
                // expecting user to trigger download
                return;
            }
            // If downloaded but no localPath (shouldn't happen with correct store logic), try to refresh
            await loadAvailableModels();
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
            'Clear Conversation',
            'This will remove all messages from this chat.',
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

    // Glassmorphism Header Component
    const Header = () => (
        <BlurView intensity={Platform.OS === 'ios' ? 80 : 0} tint="light" style={styles.headerGlass}>
            <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
                <View style={styles.headerContent}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.headerTitle}>Ghost AI</Text>
                        {isModelLoaded && (
                            <View style={styles.activeBadge}>
                                <View style={[styles.activeDot, { backgroundColor: '#34C759' }]} />
                            </View>
                        )}
                    </View>

                    <View style={styles.headerActions}>
                        <Pressable
                            onPress={handleClearHistory}
                            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
                        >
                            <Ionicons name="trash-outline" size={22} color="#1A1A1A" />
                        </Pressable>
                        <Pressable
                            onPress={handleSettings}
                            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
                        >
                            <Ionicons name="options-outline" size={22} color="#1A1A1A" />
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
            {Platform.OS === 'android' && <View style={styles.androidHeaderBorder} />}
        </BlurView>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <Stack.Screen options={{ headerShown: false }} />

            <Header />

            <View style={styles.contentContainer}>
                {!currentModel ? (
                    <View style={styles.stateContainer}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="cube-outline" size={48} color="#007AFF" />
                        </View>
                        <Text style={styles.stateTitle}>Select a Model</Text>
                        <Text style={styles.stateDescription}>
                            Choose a secure, on-device AI model to start chatting.
                        </Text>
                        <Pressable style={styles.primaryButton} onPress={handleSettings}>
                            <Text style={styles.primaryButtonText}>Select Model</Text>
                            <Ionicons name="chevron-forward" size={16} color="#FFF" />
                        </Pressable>
                    </View>
                ) : !currentModel.downloaded ? (
                    <View style={styles.stateContainer}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="cloud-download-outline" size={48} color="#007AFF" />
                        </View>
                        <Text style={styles.stateTitle}>Download Required</Text>
                        <Text style={styles.stateDescription}>
                            Download {currentModel.name} ({currentModel.size}) to enable offline AI.
                        </Text>
                        <Pressable style={styles.primaryButton} onPress={handleSettings}>
                            <Text style={styles.primaryButtonText}>Download Now</Text>
                        </Pressable>
                    </View>
                ) : isInitializing ? (
                    <View style={styles.stateContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loadingText}>Loading Neural Engine...</Text>
                        <Text style={styles.loadingSubtext}>{currentModel.name}</Text>
                    </View>
                ) : (
                    <ChatContainer />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA', // Premium off-white
    },
    contentContainer: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 0 : 60, // Android header offset handled by View structure usually, but manual spacing here
    },
    headerGlass: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.8)' : '#FFF', // Android doesn't support BlurView well
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    androidHeaderBorder: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)'
    },
    headerSafeArea: {
        backgroundColor: 'transparent',
    },
    headerContent: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: -0.5,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    activeBadge: {
        padding: 3,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.04)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButtonPressed: {
        backgroundColor: 'rgba(0,0,0,0.08)',
    },
    stateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        marginTop: 60, // Offset for header
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 122, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    stateTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    stateDescription: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
        maxWidth: 280,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 100, // Pill shape
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingText: {
        marginTop: 24,
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    loadingSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
    },
});
