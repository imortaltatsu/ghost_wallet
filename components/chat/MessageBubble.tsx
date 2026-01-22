import { Message } from '@/types/chat';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface MessageBubbleProps {
    message: Message;
    onLongPress?: () => void;
}

export function MessageBubble({ message, onLongPress }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    return (
        <Pressable
            onLongPress={onLongPress}
            style={[
                styles.container,
                isUser && styles.userContainer,
                isSystem && styles.systemContainer,
            ]}
        >
            <View
                style={[
                    styles.bubble,
                    isUser && styles.userBubble,
                    isSystem && styles.systemBubble,
                ]}
            >
                {isSystem && (
                    <Text style={styles.systemLabel}>System</Text>
                )}

                <Markdown style={markdownStyles}>
                    {message.content}
                </Markdown>

                {message.isStreaming && (
                    <View style={styles.cursor} />
                )}

                <Text style={styles.timestamp}>
                    {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 4,
        maxWidth: '85%',
    },
    userContainer: {
        alignSelf: 'flex-end',
    },
    systemContainer: {
        alignSelf: 'center',
        maxWidth: '95%',
    },
    bubble: {
        borderRadius: 16,
        padding: 12,
        backgroundColor: '#f0f0f0',
    },
    userBubble: {
        backgroundColor: '#007AFF',
    },
    systemBubble: {
        backgroundColor: '#FFE5B4',
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    systemLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    timestamp: {
        fontSize: 10,
        color: '#999',
        marginTop: 4,
        textAlign: 'right',
    },
    cursor: {
        width: 2,
        height: 16,
        backgroundColor: '#007AFF',
        marginLeft: 2,
        opacity: 0.8,
    },
});

const markdownStyles = StyleSheet.create({
    body: {
        color: '#000',
    },
    code_inline: {
        backgroundColor: '#f5f5f5',
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 2,
        fontFamily: 'Courier',
    },
    code_block: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 8,
        fontFamily: 'Courier',
    },
    fence: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 8,
        fontFamily: 'Courier',
    },
});
