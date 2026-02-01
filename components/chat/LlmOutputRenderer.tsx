/**
 * LLM output rendering SDK layer.
 * Uses react-native-markdown-display for CommonMark rendering with shared
 * styles, optional preprocessing (tool calls, template tokens), and link handling.
 */

import { Colors } from "@/constants/theme";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { prepareLlmContentForDisplay } from "@/utils/llmOutput";
import React, { useMemo } from "react";
import { Linking, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";

export type LlmOutputVariant = "default" | "user";

export interface LlmOutputRendererProps {
  /** Raw or preprocessed LLM message content (markdown). */
  content: string;
  /** Style variant: default (assistant) or user bubble. */
  variant?: LlmOutputVariant;
  /** If true (default), normalizes tool calls and template tokens before render. */
  prepareContent?: boolean;
  /** Override link press; return false to handle yourself, true to open with Linking. */
  onLinkPress?: (url: string) => boolean;
}

/** Assistant (default) variant: theme-aware so text is white in dark mode. */
function getDefaultMarkdownStyles(theme: "light" | "dark") {
  const c = Colors[theme];
  return StyleSheet.create({
    body: { color: c.text },
    text: { color: c.text },
    paragraph: { color: c.text },
    strong: { color: c.text },
    em: { color: c.text },
    link: { color: c.tint },
    blockquote: { color: c.secondaryText },
    code_inline: {
      backgroundColor: c.inputBg,
      color: c.text,
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
      fontFamily: "Courier",
    },
    code_block: {
      backgroundColor: c.inputBg,
      color: c.text,
      borderRadius: 8,
      padding: 8,
      fontFamily: "Courier",
    },
    fence: {
      backgroundColor: c.inputBg,
      color: c.text,
      borderRadius: 8,
      padding: 8,
      fontFamily: "Courier",
    },
    h1: { color: c.text },
    h2: { color: c.text },
    h3: { color: c.text },
    h4: { color: c.text },
    h5: { color: c.text },
    h6: { color: c.text },
    list_item: { color: c.text },
  });
}

const userMarkdownStyles = StyleSheet.create({
  body: { color: "#fff" },
  code_inline: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontFamily: "Courier",
  },
  code_block: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 8,
    padding: 8,
    fontFamily: "Courier",
  },
  fence: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 8,
    padding: 8,
    fontFamily: "Courier",
  },
});

export function LlmOutputRenderer({
  content,
  variant = "default",
  prepareContent = true,
  onLinkPress,
}: LlmOutputRendererProps) {
  const theme = useResolvedTheme();
  const defaultStyles = useMemo(
    () => getDefaultMarkdownStyles(theme),
    [theme],
  );

  const text = prepareContent ? prepareLlmContentForDisplay(content) : content;
  if (!text) return null;

  const styles = variant === "user" ? userMarkdownStyles : defaultStyles;
  const handleLinkPress = (url: string) => {
    if (onLinkPress) return onLinkPress(url);
    if (url) Linking.openURL(url);
    return false;
  };

  return (
    <Markdown style={styles} onLinkPress={handleLinkPress}>
      {text}
    </Markdown>
  );
}
