import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { create } from 'zustand';

interface TTSStore {
    isEnabled: boolean;
    isSpeaking: boolean;
    volume: number;

    // Actions
    setEnabled: (enabled: boolean) => void;
    setSpeaking: (speaking: boolean) => void;
    speak: (text: string) => void;
    stop: () => void;
    loadSettings: () => Promise<void>;
}

const STORAGE_KEY = '@ghostwallet:tts_settings';

export const useTTSStore = create<TTSStore>((set, get) => ({
    isEnabled: false, // Default off
    isSpeaking: false,
    volume: 1.0,

    setEnabled: (enabled) => {
        set({ isEnabled: enabled });
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ isEnabled: enabled }));
        if (!enabled) {
            get().stop();
        }
    },

    setSpeaking: (speaking) => set({ isSpeaking: speaking }),

    speak: (text) => {
        const { isEnabled } = get();
        if (!isEnabled || !text) return;

        // Stop current speech before starting new
        Speech.stop();
        set({ isSpeaking: true });

        Speech.speak(text, {
            onDone: () => set({ isSpeaking: false }),
            onStopped: () => set({ isSpeaking: false }),
            onError: (error) => {
                console.error('TTS Error:', error);
                set({ isSpeaking: false });
            },
            // Android/iOS specific options for better quality
            pitch: 1.0,
            rate: 0.9,
        });
    },

    stop: () => {
        Speech.stop();
        set({ isSpeaking: false });
    },

    loadSettings: async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const { isEnabled } = JSON.parse(stored);
                set({ isEnabled });
            }
        } catch (error) {
            console.error('Failed to load TTS settings:', error);
        }
    },
}));
