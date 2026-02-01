import { Colors } from '@/constants/theme';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Contact, useAddressBookStore } from '@/store/addressBookStore';
import { Ionicons } from '@expo/vector-icons';
import { PublicKey } from '@solana/web3.js';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AddressBookScreen() {
    const theme = useResolvedTheme();
    const c = Colors[theme];
    const { contacts, loadContacts, addContact, updateContact, removeContact, isLoading } = useAddressBookStore();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);

    const [name, setName] = useState('');
    const [address, setAddress] = useState('');

    useEffect(() => {
        loadContacts();
    }, []);

    const openAddModal = () => {
        setEditingContact(null);
        setName('');
        setAddress('');
        setModalVisible(true);
    };

    const openEditModal = (contact: Contact) => {
        setEditingContact(contact);
        setName(contact.name);
        setAddress(contact.address);
        setModalVisible(true);
    };

    const validateAddress = (addr: string) => {
        try {
            new PublicKey(addr);
            return true;
        } catch {
            return false;
        }
    };

    const handleSave = async () => {
        if (!name.trim() || !address.trim()) {
            Alert.alert('Error', 'Name and address are required');
            return;
        }

        if (!validateAddress(address)) {
            Alert.alert('Error', 'Invalid Solana address');
            return;
        }

        if (editingContact) {
            await updateContact(editingContact.id, name, address);
        } else {
            await addContact(name, address);
        }
        setModalVisible(false);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Contact', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => removeContact(id) }
        ]);
    };

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <Stack.Screen
                options={{
                    title: 'Address Book',
                    headerRight: () => (
                        <Pressable onPress={openAddModal}>
                            <Ionicons name="add" size={24} color={c.tint} />
                        </Pressable>
                    )
                }}
            />

            <ScrollView contentContainerStyle={styles.list}>
                {contacts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: c.secondaryText }]}>No contacts yet</Text>
                    </View>
                ) : (
                    contacts.map(contact => (
                        <Pressable
                            key={contact.id}
                            style={[styles.contactItem, { backgroundColor: c.card }]}
                            onPress={() => openEditModal(contact)}
                        >
                            <View style={[styles.avatar, { backgroundColor: c.border }]}>
                                <Text style={[styles.avatarText, { color: c.secondaryText }]}>{contact.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={styles.info}>
                                <Text style={[styles.name, { color: c.text }]}>{contact.name}</Text>
                                <Text style={[styles.address, { color: c.secondaryText }]} numberOfLines={1} ellipsizeMode="middle">
                                    {contact.address}
                                </Text>
                            </View>
                            <Pressable onPress={() => handleDelete(contact.id)} style={styles.deleteAction}>
                                <Ionicons name="trash-outline" size={20} color={c.warningBorder} />
                            </Pressable>
                        </Pressable>
                    ))
                )}
            </ScrollView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <View style={[styles.modalContent, { backgroundColor: c.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: c.text }]}>
                                {editingContact ? 'Edit Contact' : 'New Contact'}
                            </Text>
                            <Pressable onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={c.secondaryText} />
                            </Pressable>
                        </View>

                        <TextInput
                            style={[styles.input, { backgroundColor: c.inputBg, color: c.text }]}
                            placeholder="Name"
                            placeholderTextColor={c.placeholder}
                            value={name}
                            onChangeText={setName}
                            autoFocus
                        />

                        <TextInput
                            style={[styles.input, { backgroundColor: c.inputBg, color: c.text }]}
                            placeholder="Solana Address"
                            placeholderTextColor={c.placeholder}
                            value={address}
                            onChangeText={setAddress}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <Pressable style={[styles.saveButton, { backgroundColor: c.tint }]} onPress={handleSave}>
                            <Text style={[styles.saveButtonText, { color: c.primaryButtonText }]}>Save</Text>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    list: {
        padding: 16,
    },
    emptyState: {
        marginTop: 60,
        alignItems: 'center',
    },
    emptyText: {
        color: '#8E8E93',
        fontSize: 16,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E5E5EA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8E8E93',
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    address: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 2,
    },
    deleteAction: {
        padding: 8,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        minHeight: 300,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: '#F2F2F7',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
