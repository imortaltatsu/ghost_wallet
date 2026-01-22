import { LlamaService } from '@/services/llm/LlamaService';
import { useChatStore } from '@/store/chatStore';
import { useLLMStore } from '@/store/llmStore';
import { useTTSStore } from '@/store/ttsStore';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';

export function ChatContainer() {
    const flatListRef = useRef<FlatList>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const {
        messages,
        addMessage,
        updateStreamingMessage,
        startStreaming,
        stopStreaming,
        loadHistory,
    } = useChatStore();

    const {
        currentModel,
        modelConfig,
        isModelLoaded,
        setModelLoaded,
        setError,
    } = useLLMStore();

    const llamaService = LlamaService.getInstance();

    useEffect(() => {
        loadHistory();
    }, []);

    useEffect(() => {
        // Auto-scroll to bottom when new messages arrive
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    const { isEnabled: isTTSEnabled, speak, stop: stopTTS } = useTTSStore();

    useEffect(() => {
        // Stop speech when leaving chat
        return () => {
            stopTTS();
        };
    }, []);

    const handleSendMessage = async (text: string) => {
        if (!currentModel || !isModelLoaded) {
            setError('Please select and load a model first');
            return;
        }

        // Add user message
        addMessage({
            role: 'user',
            content: text,
        });

        // Create assistant message placeholder
        const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        addMessage({
            id: assistantMessageId,
            role: 'assistant',
            content: '',
        });

        setIsGenerating(true);
        startStreaming(assistantMessageId);

        try {
            // Get conversation history
            const conversationMessages = [
                ...messages,
                { id: 'temp', role: 'user' as const, content: text, timestamp: Date.now() },
            ];

            // Generate response with streaming
            let fullResponse = '';
            await llamaService.completion(
                conversationMessages,
                modelConfig,
                (token) => {
                    fullResponse += token;
                    updateStreamingMessage(token);
                }
            );

            stopStreaming();

            // Speak the response if TTS is enabled
            if (isTTSEnabled && fullResponse) {
                speak(fullResponse);
            }
        } catch (error) {
            console.error('Error generating response:', error);
            setError(error instanceof Error ? error.message : 'Generation failed');
            stopStreaming();
        } finally {
            setIsGenerating(false);
        }
    };

    const renderMessage = ({ item }: { item: typeof messages[0] }) => (
        <MessageBubble message={item} />
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
                {!currentModel
                    ? 'Select a model to start chatting'
                    : !isModelLoaded
                        ? 'Loading model...'
                        : 'Start a conversation'}
            </Text>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messageList}
                ListEmptyComponent={renderEmpty}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <ChatInput
                onSend={handleSendMessage}
                disabled={!isModelLoaded || isGenerating}
                isLoading={isGenerating}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    messageList: {
        paddingVertical: 16,
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    },
});
