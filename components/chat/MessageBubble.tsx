import { Colors } from "@/constants/theme";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Message } from "@/types/chat";
import {
  getContentAfterToolCall,
  messageContainsToolCall,
} from "@/utils/llmOutput";
import {
  getContentAfterThink,
  getStreamingThinkingContent,
  parseThinkingContent,
} from "@/utils/thinkingContent";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LlmOutputRenderer } from "./LlmOutputRenderer";

interface MessageBubbleProps {
  message: Message;
  onLongPress?: () => void;
}

export function MessageBubble({ message, onLongPress }: MessageBubbleProps) {
  const theme = useResolvedTheme();
  const c = Colors[theme];
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAssistant = message.role === "assistant";

  const themed = useMemo(
    () => ({
      bubble: { backgroundColor: c.card },
      userBubble: { backgroundColor: c.tint },
      systemBubble: { backgroundColor: c.warningSurface, borderColor: c.warningBorder },
      systemLabel: { color: c.secondaryText },
      timestamp: { color: c.placeholder },
      cursor: { backgroundColor: c.tint },
      thinkingLoader: { backgroundColor: c.accentSurface, borderLeftColor: c.accentBorder },
      thinkingLoaderText: { color: c.accent },
      thinkingSection: { backgroundColor: c.accentSurface, borderLeftColor: c.accentBorder },
      thinkingLabel: { color: c.accent },
      thinkingCount: { color: c.secondaryText },
      thinkingTitle: { color: c.accent },
      thinkingText: { color: c.secondaryText },
      thinkingCursor: { color: c.accent },
    }),
    [theme, c],
  );

  const effectiveContent =
    isAssistant && messageContainsToolCall(message.content)
      ? getContentAfterToolCall(message.content)
      : message.content;

  const { thinkingBlocks, mainContent } = isAssistant
    ? parseThinkingContent(effectiveContent)
    : { thinkingBlocks: [] as string[], mainContent: effectiveContent };

  // While streaming: hide thinking, only show content after last </think>
  const displayContent =
    isAssistant && message.isStreaming
      ? getContentAfterThink(
          messageContainsToolCall(message.content)
            ? getContentAfterToolCall(message.content)
            : message.content,
        )
      : mainContent;

  // While streaming: show in-progress thinking (text inside unclosed think tag)
  const streamingThinking =
    isAssistant && message.isStreaming
      ? getStreamingThinkingContent(message.content)
      : "";

  const hasThinking =
    thinkingBlocks.length > 0 ||
    (message.isStreaming && streamingThinking.length > 0);

  // Hide thinking by default; tap header to expand
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

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
          themed.bubble,
          isUser && styles.userBubble,
          isUser && themed.userBubble,
          isSystem && styles.systemBubble,
          isSystem && themed.systemBubble,
        ]}
      >
        {isSystem && <Text style={[styles.systemLabel, themed.systemLabel]}>System</Text>}

        {isAssistant &&
          message.isStreaming &&
          !displayContent &&
          !streamingThinking && (
            <View style={[styles.thinkingLoader, themed.thinkingLoader]}>
              <ActivityIndicator size="small" color={c.accent} />
              <Text style={[styles.thinkingLoaderText, themed.thinkingLoaderText]}>Thinking...</Text>
            </View>
          )}

        {isAssistant && hasThinking && (
          <View style={[styles.thinkingSection, themed.thinkingSection]}>
            <Pressable
              style={styles.thinkingHeader}
              onPress={() => setThinkingExpanded((v) => !v)}
            >
              <Ionicons
                name={
                  thinkingExpanded || message.isStreaming
                    ? "chevron-down"
                    : "chevron-forward"
                }
                size={16}
                color={c.accent}
              />
              <Text style={[styles.thinkingLabel, themed.thinkingLabel]}>Thinking</Text>
              {(thinkingBlocks.length > 1 || streamingThinking) && (
                <Text style={[styles.thinkingCount, themed.thinkingCount]}>
                  {" "}
                  ({thinkingBlocks.length + (streamingThinking ? 1 : 0)} block
                  {thinkingBlocks.length + (streamingThinking ? 1 : 0) !== 1
                    ? "s"
                    : ""}
                  )
                </Text>
              )}
            </Pressable>
            {(thinkingExpanded || message.isStreaming) && (
              <View style={styles.thinkingContent}>
                {thinkingBlocks.map((block, i) => (
                  <View key={i} style={styles.thinkingBlock}>
                    <Text style={[styles.thinkingTitle, themed.thinkingTitle]}>Thinking</Text>
                    {block.split(/\n\n+/).map((para, j) => (
                      <Text key={j} style={[styles.thinkingText, themed.thinkingText]} selectable>
                        {para.trim()}
                      </Text>
                    ))}
                  </View>
                ))}
                {streamingThinking ? (
                  <View style={styles.thinkingBlock}>
                    <Text style={[styles.thinkingTitle, themed.thinkingTitle]}>Thinking</Text>
                    <Text style={[styles.thinkingText, themed.thinkingText]} selectable>
                      {streamingThinking}
                      {message.isStreaming && (
                        <Text style={[styles.thinkingCursor, themed.thinkingCursor]}>▌</Text>
                      )}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        )}

        {displayContent ? (
          <LlmOutputRenderer
            content={displayContent}
            variant={isUser ? "user" : "default"}
            prepareContent={true}
          />
        ) : isAssistant && message.isStreaming ? null : thinkingBlocks.length >
            0 && !mainContent ? null : (
          <LlmOutputRenderer
            content={message.content}
            variant={isUser ? "user" : "default"}
            prepareContent={true}
          />
        )}

        {message.isStreaming && <View style={[styles.cursor, themed.cursor]} />}

        <Text style={[styles.timestamp, themed.timestamp, isUser && styles.timestampUser]}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
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
    maxWidth: "85%",
  },
  userContainer: {
    alignSelf: "flex-end",
  },
  systemContainer: {
    alignSelf: "center",
    maxWidth: "95%",
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#f0f0f0",
  },
  userBubble: {
    backgroundColor: "#007AFF",
  },
  systemBubble: {
    backgroundColor: "#FFE5B4",
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  systemLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  timestamp: {
    fontSize: 10,
    color: "#999",
    marginTop: 4,
    textAlign: "right",
  },
  cursor: {
    width: 2,
    height: 16,
    backgroundColor: "#007AFF",
    marginLeft: 2,
    opacity: 0.8,
  },
  thinkingLoader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 2,
    backgroundColor: "#F5F3FF",
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#A78BFA",
  },
  thinkingLoaderText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5B21B6",
  },
  thinkingSection: {
    marginBottom: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#A78BFA",
    backgroundColor: "#F5F3FF",
    borderRadius: 6,
    overflow: "hidden",
  },
  thinkingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  thinkingLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5B21B6",
  },
  thinkingCount: {
    fontSize: 10,
    fontWeight: "500",
    color: "#6B7280",
  },
  thinkingTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#5B21B6",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  thinkingContent: {
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  thinkingBlock: {
    marginBottom: 4,
  },
  thinkingText: {
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 16,
    marginBottom: 2,
  },
  thinkingCursor: {
    color: "#5B21B6",
  },
  timestampUser: {
    color: "rgba(255,255,255,0.8)",
  },
});
