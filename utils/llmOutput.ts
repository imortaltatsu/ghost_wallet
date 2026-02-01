/**
 * LLM output display preprocessing.
 * Normalizes raw model output for safe, consistent rendering (markdown + tool calls).
 */

/** Matches tool call syntax: [tool_name(...)] or <|tool_call_start|>... */
const TOOL_CALL_PATTERN = /\[[a-zA-Z_]+\([^)]*\)\]|<\|tool_call_start\|>/;

/** True if message content contains a tool call. */
export function messageContainsToolCall(content: string): boolean {
  return Boolean(content?.trim() && TOOL_CALL_PATTERN.test(content));
}

/** Lines that look like prompt/instruction leakage (strip from display). */
const PROMPT_LEAKAGE_LINES = [
  /^Use\s*\(\)\s*for\s*no\s*arguments/i,
  /^Examples?\s*:/i,
  /^Tell\s+the\s+user\s*:/i,
  /^Returns?\s*:\s*(public|private)/i,
  /^-\s*Returns?\s*:/i,
  /^\[[a-zA-Z_]+\([^)]*\)\]\s*$/,
];

function isPromptLeakageLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  return PROMPT_LEAKAGE_LINES.some((re) => re.test(t));
}

/**
 * Content to display for a message that contains a tool call: only the part
 * after the last tool call, with tool calls and prompt leakage stripped.
 * Use this to show only the assistant's response after the tool has run.
 */
export function getContentAfterToolCall(content: string): string {
  if (!content?.trim()) return "";
  if (!TOOL_CALL_PATTERN.test(content)) {
    return content.replace(/<\|[^|]+\|>/g, "").trim();
  }
  const bracketRe = /\[[a-zA-Z_]+\([^)]*\)\]/g;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = bracketRe.exec(content)) !== null) {
    lastEnd = m.index + m[0].length;
  }
  const toolCallStart = "<|tool_call_start|>";
  const idx = content.indexOf(toolCallStart);
  if (idx !== -1 && idx + toolCallStart.length > lastEnd) {
    lastEnd = idx + toolCallStart.length;
  }
  const afterLast = content.slice(lastEnd);
  let out = afterLast
    .replace(/<\|[^|]+\|>/g, "")
    .replace(bracketRe, "")
    .trim();
  out = out
    .split("\n")
    .filter((line) => !isPromptLeakageLine(line))
    .join("\n")
    .trim();
  return out;
}

/** Replace tool call syntax with display text and strip template tokens. */
export function prepareLlmContentForDisplay(content: string): string {
  if (!content?.trim()) return "";
  return content
    .replace(/<\|[^|]+\|>/g, "") // Strip <|...|> template tokens
    .replace(/\[[a-zA-Z_]+\([^)]*\)\]/g, " Tool called ") // [func()] → " Tool called "
    .trim();
}
