import { Colors } from "@/constants/theme";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ChatInput({ onSend, disabled, isLoading }: ChatInputProps) {
  const [text, setText] = useState("");
  const theme = useResolvedTheme();
  const c = Colors[theme];

  const themedStyles = useMemo(
    () => ({
      container: {
        backgroundColor: c.background,
        borderTopColor: c.border,
      },
      input: {
        backgroundColor: c.inputBg,
        color: c.text,
      },
      sendButton: { backgroundColor: c.tint },
      sendButtonDisabled: { backgroundColor: c.border },
    }),
    [theme, c],
  );

  const handleSend = () => {
    if (text.trim() && !disabled && !isLoading) {
      onSend(text.trim());
      setText("");
    }
  };

  return (
    <View style={[styles.container, themedStyles.container]}>
      <TextInput
        style={[styles.input, themedStyles.input]}
        value={text}
        onChangeText={setText}
        placeholder="Type a message..."
        placeholderTextColor={c.placeholder}
        multiline
        maxLength={2000}
        editable={!disabled && !isLoading}
        returnKeyType="send"
        blurOnSubmit={false}
        autoCorrect={true}
        autoCapitalize="sentences"
      />
      <Pressable
        onPress={handleSend}
        disabled={!text.trim() || disabled || isLoading}
        style={[
          styles.sendButton,
          themedStyles.sendButton,
          (!text.trim() || disabled || isLoading) && themedStyles.sendButtonDisabled,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={c.primaryButtonText} />
        ) : (
          <Ionicons
            name="send"
            size={20}
            color={!text.trim() || disabled ? c.placeholder : c.primaryButtonText}
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
