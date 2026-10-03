const CONTROL = /[\u0000-\u001F\u007F]/g;
const TAG = /<[^>]*>/g;
const BLOCKED_SCHEME = /^(javascript|data|vbscript|file):/i;

/** Plain text only. Tags are removed, so the result is never HTML. */
export function plainText(raw: string, max = 80) {
  const cap = Math.max(0, max);
  let text = String(raw ?? "").replace(CONTROL, " ");
  for (let i = 0; i < 6; i += 1) {
    const next = text.replace(TAG, "");
    if (next === text) break;
    text = next;
  }
  return text.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, cap);
}

/** Allow same-origin paths and https URLs. Blocks javascript:, data: and lookalikes. */
export function safeHref(raw: string | null | undefined) {
  if (!raw) return null;
  const value = raw.trim();
  if (!value || value.length > 2000 || BLOCKED_SCHEME.test(value)) return null;
  if (value.startsWith("/")) {
    if (value.startsWith("//") || value.includes("\\") || value.includes(":")) return null;
    return value;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
