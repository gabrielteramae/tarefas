const attempts = new Map<string, number[]>();

export function strongPassword(password: string) {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function validEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function attemptCount(key: string, windowMs: number) {
  const now = Date.now();
  const hits = (attempts.get(key) ?? []).filter((at) => now - at < windowMs);
  attempts.set(key, hits);
  return hits.length;
}

export function tooManyAttempts(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const hits = (attempts.get(key) ?? []).filter((at) => now - at < windowMs);
  hits.push(now);
  attempts.set(key, hits);
  return hits.length > max;
}

export function safePushEndpoint(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.href.length > 2000) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function cleanLine(raw: string, max: number) {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
