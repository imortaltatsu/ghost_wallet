import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export interface Contact {
    id: string;
    name: string;
    address: string;
}

interface AddressBookState {
    contacts: Contact[];
    isLoading: boolean;

    // Actions
    addContact: (name: string, address: string) => Promise<void>;
    updateContact: (id: string, name: string, address: string) => Promise<void>;
    removeContact: (id: string) => Promise<void>;
    loadContacts: () => Promise<void>;
}

const STORAGE_KEY = '@ghostwallet:address_book';

export const useAddressBookStore = create<AddressBookState>((set, get) => ({
    contacts: [],
    isLoading: false,

    loadContacts: async () => {
        try {
            set({ isLoading: true });
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                set({ contacts: JSON.parse(stored) });
            }
            set({ isLoading: false });
        } catch (e) {
            console.error('Failed to load contacts:', e);
            set({ isLoading: false });
        }
    },

    addContact: async (name, address) => {
        try {
            const newContact: Contact = {
                id: Date.now().toString(),
                name,
                address,
            };

            const newContacts = [...get().contacts, newContact];
            set({ contacts: newContacts });
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newContacts));
        } catch (e) {
            console.error('Failed to add contact:', e);
        }
    },

    updateContact: async (id, name, address) => {
        try {
            const newContacts = get().contacts.map(c =>
                c.id === id ? { ...c, name, address } : c
            );
            set({ contacts: newContacts });
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newContacts));
        } catch (e) {
            console.error('Failed to update contact:', e);
        }
    },

    removeContact: async (id) => {
        try {
            const newContacts = get().contacts.filter(c => c.id !== id);
            set({ contacts: newContacts });
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newContacts));
        } catch (e) {
            console.error('Failed to remove contact:', e);
        }
    },
}));
