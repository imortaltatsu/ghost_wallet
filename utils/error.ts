/**
 * Normalize any thrown value to a user-facing error string.
 * Handles Error, { message }, string, and objects so we never show "[object Object]" or bare "O".
 */
export function getErrorMessage(e: unknown): string {
  if (e == null) return "Unknown error";
  if (typeof e === "string") return e || "Unknown error";
  if (e instanceof Error) {
    const msg = e.message?.trim() || "Unknown error";
    // If message is a single char or very short, add context so "O" isn't shown alone
    if (msg.length <= 2) {
      const extra = e.cause != null ? String(e.cause) : e.stack?.split("\n")[1]?.trim();
      return extra ? `${msg} (${extra})` : `Unexpected error: ${msg}`;
    }
    return msg;
  }
  if (typeof e === "object" && e !== null && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return ((e as { message: string }).message).trim() || "Unknown error";
  }
  try {
    const s = JSON.stringify(e);
    if (s !== "{}" && s.length < 200) return s;
  } catch (_) {}
  return String(e) || "Unknown error";
}
