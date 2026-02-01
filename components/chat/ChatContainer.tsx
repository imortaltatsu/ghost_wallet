import { Colors } from "@/constants/theme";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { sendMessage } from "@/sdk/chat";
import { registerAppTools } from "@/sdk/tools";
import { useChatStore } from "@/store/chatStore";
import { useLLMStore } from "@/store/llmStore";
import { useTTSStore } from "@/store/ttsStore";
import { getContentAfterToolCall, messageContainsToolCall } from "@/utils/llmOutput";
import React, { useMemo, useEffect, useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";

const SYSTEM_PROMPT =
  "You are GhostWallet AI, a friendly crypto wallet assistant. Respond naturally to greetings and conversation. Only use tools when the user explicitly asks about wallet operations (balance, send, address, etc.).\n\nThinking rules: Inside <think> write exactly ONE short sentence, then close with </think> immediately. Never repeat the same words or ideas. Do not list options or debate—pick one action and do it. For balance/send/address requests: one thought (e.g. 'Calling get_balance') then the tool call. No hallucination: only state the single next step.";

export function ChatContainer() {
  const flatListRef = useRef<FlatList>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const theme = useResolvedTheme();
  const c = Colors[theme];

  const {
    messages,
    updateStreamingMessage,
    startStreaming,
    stopStreaming,
    loadHistory,
  } = useChatStore();

  const { currentModel, isModelLoaded, setError } = useLLMStore();
  const { isEnabled: isTTSEnabled, speak, stop: stopTTS } = useTTSStore();

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    registerAppTools();
  }, []);

  const visibleMessages = useMemo(
    () =>
      messages.filter((m) => {
        if (!messageContainsToolCall(m.content)) return true;
        const after = getContentAfterToolCall(m.content);
        return after.trim().length > 0;
      }),
    [messages],
  );

  useEffect(() => {
    if (visibleMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visibleMessages.length]);

  useEffect(() => {
    return () => {
      stopTTS();
    };
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!currentModel || !isModelLoaded) {
      setError("Please select and load a model first");
      return;
    }

    setIsGenerating(true);
    try {
      await sendMessage({
        userText: text,
        modelId: currentModel.id,
        systemPrompt: SYSTEM_PROMPT,
        onToken: (token) => updateStreamingMessage(token),
        onComplete: (cleanedText) => {
          if (isTTSEnabled && cleanedText) speak(cleanedText);
        },
      });
    } catch (error) {
      console.error("Error generating response:", error);
      setError(error instanceof Error ? error.message : "Generation failed");
      stopStreaming();
    } finally {
      stopStreaming();
      setIsGenerating(false);
    }
  };

  const renderMessage = ({ item }: { item: (typeof visibleMessages)[0] }) => (
    <MessageBubble message={item} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: c.placeholder }]}>
        {!currentModel
          ? "Select a model to start chatting"
          : !isModelLoaded
            ? "Loading model..."
            : "Start a conversation"}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={visibleMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={renderEmpty}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
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
  container: { flex: 1 },
  messageList: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});
