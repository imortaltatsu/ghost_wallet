import { DEFAULT_VOICE } from '@/constants/TTSVoices';
import { ChatSettings } from '@/types/chat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface TTSStore extends ChatSettings {
    isSpeaking: boolean;

    // Actions
    setTTSEnabled: (enabled: boolean) => void;
    setSelectedVoice: (voiceId: string) => void;
    setAutoPlayTTS: (autoPlay: boolean) => void;
    setStreamingEnabled: (enabled: boolean) => void;
    setIsSpeaking: (speaking: boolean) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}

const STORAGE_KEY = '@ghostwallet:tts_settings';

export const useTTSStore = create<TTSStore>((set, get) => ({
    ttsEnabled: false,
    selectedVoice: DEFAULT_VOICE,
    autoPlayTTS: true,
    streamingEnabled: true,
    isSpeaking: false,

    setTTSEnabled: (enabled) => {
        set({ ttsEnabled: enabled });
        get().saveSettings();
    },

    setSelectedVoice: (voiceId) => {
        set({ selectedVoice: voiceId });
        get().saveSettings();
    },

    setAutoPlayTTS: (autoPlay) => {
        set({ autoPlayTTS: autoPlay });
        get().saveSettings();
    },

    setStreamingEnabled: (enabled) => {
        set({ streamingEnabled: enabled });
        get().saveSettings();
    },

    setIsSpeaking: (speaking) => {
        set({ isSpeaking: speaking });
    },

    loadSettings: async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const settings = JSON.parse(stored);
                set(settings);
            }
        } catch (error) {
            console.error('Failed to load TTS settings:', error);
        }
    },

    saveSettings: async () => {
        try {
            const { ttsEnabled, selectedVoice, autoPlayTTS, streamingEnabled } = get();
            await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ ttsEnabled, selectedVoice, autoPlayTTS, streamingEnabled })
            );
        } catch (error) {
            console.error('Failed to save TTS settings:', error);
        }
    },
}));
