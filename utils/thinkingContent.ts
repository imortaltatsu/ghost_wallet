/**
 * Parse assistant content that may contain thinking tags (LFM2.5 Thinking / chain-of-thought).
 * Supports <think >...</think>, <thinking>...</thinking>, and <think>...</think>.
 */
export interface ParsedContent {
  thinkingBlocks: string[];
  mainContent: string;
}

// <think >...</think> (angle brackets, optional space - primary format)
const THINK_ANGLE_REGEX = /<\s*think\s*>([\s\S]*?)<\s*\/\s*think\s*>/gi;
// <thinking>...</thinking>
const THINKING_REGEX = /<\s*thinking\s*>([\s\S]*?)<\s*\/\s*thinking\s*>/gi;
// <think>...</think> (backticks)
const THINK_BACKTICK_REGEX =
  /[\u0060`]\s*think\s*[\u0060`]([\s\S]*?)[\u0060`]\s*\/\s*think\s*[\u0060`]/gi;

export function parseThinkingContent(content: string): ParsedContent {
  if (!content?.trim()) {
    return { thinkingBlocks: [], mainContent: content || "" };
  }

  const thinkingBlocks: string[] = [];
  let mainContent = content;

  const collect = (_: string, block: string) => {
    const trimmed = block.trim();
    if (trimmed) thinkingBlocks.push(trimmed);
    return "";
  };

  mainContent = mainContent
    .replace(THINK_ANGLE_REGEX, collect)
    .replace(THINKING_REGEX, collect)
    .replace(THINK_BACKTICK_REGEX, collect);

  mainContent = mainContent.replace(/\n{3,}/g, "\n\n").trim();

  return { thinkingBlocks, mainContent };
}

/** Content to show while streaming: only the part after the last </think> (so thinking is hidden until complete). */
export function getContentAfterThink(content: string): string {
  if (!content?.trim()) return "";
  // Last </think> (angle) or `</think>` (backtick) - both are 8 chars
  const angleClose = content.lastIndexOf("</think>");
  const backtickClose = content.lastIndexOf("`/think`");
  const idx = Math.max(angleClose, backtickClose);
  if (idx === -1) return ""; // no closing tag yet
  return content.slice(idx + 8).trim();
}

/** Start index of content after an opening think tag (tag length). */
const OPEN_THINKING_LEN = "<thinking>".length;
const OPEN_THINK_TAG = /<\s*think\s*>/i;
const OPEN_THINK_BACKTICK = "`think`";

/**
 * Get the currently streamed thinking content (text inside an unclosed think tag).
 * Use while streaming to show thinking as it arrives.
 */
export function getStreamingThinkingContent(content: string): string {
  if (!content?.trim()) return "";
  const lastClose = Math.max(
    content.lastIndexOf("</think>"),
    content.lastIndexOf("`/think`"),
  );
  let lastContentStart = -1;
  const a = content.lastIndexOf("<thinking>");
  if (a !== -1)
    lastContentStart = Math.max(lastContentStart, a + OPEN_THINKING_LEN);
  const bt = content.lastIndexOf(OPEN_THINK_BACKTICK);
  if (bt !== -1)
    lastContentStart = Math.max(
      lastContentStart,
      bt + OPEN_THINK_BACKTICK.length,
    );
  let match: RegExpExecArray | null;
  const re = new RegExp(OPEN_THINK_TAG.source, "gi");
  while ((match = re.exec(content)) !== null) {
    lastContentStart = Math.max(
      lastContentStart,
      match.index + match[0].length,
    );
  }
  if (lastContentStart === -1) return "";
  if (lastClose !== -1 && lastClose >= lastContentStart) return "";
  return content.slice(lastContentStart).trim();
}
