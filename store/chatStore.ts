import { Message, StreamingState } from '@/types/chat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface ChatStore {
    messages: Message[];
    streamingState: StreamingState;
    conversationId: string;

    // Actions
    addMessage: (message: Partial<Message> & { role: 'user' | 'assistant' | 'system'; content: string }) => Message;
    updateStreamingMessage: (token: string) => void;
    startStreaming: (messageId: string) => void;
    stopStreaming: () => void;
    setMessageContent: (messageId: string, content: string) => void;
    clearHistory: () => void;
    loadHistory: () => Promise<void>;
    saveHistory: () => Promise<void>;
    deleteMessage: (messageId: string) => void;
}

const STORAGE_KEY = '@ghostwallet:chat_history';

export const useChatStore = create<ChatStore>((set, get) => ({
    messages: [],
    streamingState: {
        isStreaming: false,
        currentMessageId: null,
        accumulatedText: '',
    },
    conversationId: Date.now().toString(),

    addMessage: (message) => {
        const newMessage: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Default if not provided
            timestamp: Date.now(),
            ...message,
        };

        set((state) => ({
            messages: [...state.messages, newMessage],
        }));

        // Auto-save after adding message
        get().saveHistory();

        return newMessage;
    },

    updateStreamingMessage: (token) => {
        set((state) => {
            const { currentMessageId, accumulatedText } = state.streamingState;

            if (!currentMessageId) return state;

            const newAccumulatedText = accumulatedText + token;

            // Update the message content
            const updatedMessages = state.messages.map((msg) =>
                msg.id === currentMessageId
                    ? { ...msg, content: newAccumulatedText, isStreaming: true }
                    : msg
            );

            return {
                messages: updatedMessages,
                streamingState: {
                    ...state.streamingState,
                    accumulatedText: newAccumulatedText,
                },
            };
        });
    },

    startStreaming: (messageId) => {
        set({
            streamingState: {
                isStreaming: true,
                currentMessageId: messageId,
                accumulatedText: '',
            },
        });
    },

    stopStreaming: () => {
        set((state) => {
            // Mark the streaming message as complete
            const updatedMessages = state.messages.map((msg) =>
                msg.id === state.streamingState.currentMessageId
                    ? { ...msg, isStreaming: false }
                    : msg
            );

            return {
                messages: updatedMessages,
                streamingState: {
                    isStreaming: false,
                    currentMessageId: null,
                    accumulatedText: '',
                },
            };
        });

        // Save after streaming completes
        get().saveHistory();
    },

    setMessageContent: (messageId, content) => {
        set((state) => ({
            messages: state.messages.map((msg) =>
                msg.id === messageId ? { ...msg, content } : msg
            ),
        }));
        get().saveHistory();
    },

    clearHistory: async () => {
        set({
            messages: [],
            streamingState: {
                isStreaming: false,
                currentMessageId: null,
                accumulatedText: '',
            },
            conversationId: Date.now().toString(),
        });

        await AsyncStorage.removeItem(STORAGE_KEY);
    },

    loadHistory: async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const { messages, conversationId } = JSON.parse(stored);
                set({ messages, conversationId });
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    },

    saveHistory: async () => {
        try {
            const { messages, conversationId } = get();
            await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ messages, conversationId })
            );
        } catch (error) {
            console.error('Failed to save chat history:', error);
        }
    },

    deleteMessage: (messageId) => {
        set((state) => ({
            messages: state.messages.filter((msg) => msg.id !== messageId),
        }));
        get().saveHistory();
    },
}));
