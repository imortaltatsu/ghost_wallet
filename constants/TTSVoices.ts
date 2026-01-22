import { TTSVoice } from '@/types/chat';

export const TTS_VOICES: TTSVoice[] = [
    {
        id: 'af',
        name: 'American Female',
        language: 'en-US',
        gender: 'female',
    },
    {
        id: 'am',
        name: 'American Male',
        language: 'en-US',
        gender: 'male',
    },
    {
        id: 'bf',
        name: 'British Female',
        language: 'en-GB',
        gender: 'female',
    },
    {
        id: 'bm',
        name: 'British Male',
        language: 'en-GB',
        gender: 'male',
    },
];

export const DEFAULT_VOICE = 'af';
