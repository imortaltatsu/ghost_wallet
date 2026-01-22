import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    isLoading?: boolean;
}

export function ChatInput({ onSend, disabled, isLoading }: ChatInputProps) {
    const [text, setText] = useState('');

    const handleSend = () => {
        if (text.trim() && !disabled && !isLoading) {
            onSend(text.trim());
            setText('');
        }
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                multiline
                maxLength={2000}
                editable={!disabled && !isLoading}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
            />

            <Pressable
                onPress={handleSend}
                disabled={!text.trim() || disabled || isLoading}
                style={[
                    styles.sendButton,
                    (!text.trim() || disabled || isLoading) && styles.sendButtonDisabled,
                ]}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Ionicons
                        name="send"
                        size={20}
                        color={!text.trim() || disabled ? '#ccc' : '#fff'}
                    />
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 8,
        fontSize: 16,
        color: '#000',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#e0e0e0',
    },
});
