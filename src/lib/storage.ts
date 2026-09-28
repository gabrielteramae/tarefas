import { THEME_STORAGE_KEY } from "@/lib/theme";

export const CONSENT_STORAGE_KEY = "cookie-banner";

export type StorageKind = "consent" | "preferences" | "session" | "other";

export function storageKind(key: string): StorageKind {
  if (key === CONSENT_STORAGE_KEY) return "consent";
  if (key === THEME_STORAGE_KEY || key === "dino-theme") return "preferences";
  if (key === "grok-auth.bearer-token" || key.startsWith("grok-auth.oauth-attempt")) return "session";
  return "other";
}

export function listLocalStorage(): Array<{ key: string; kind: StorageKind }> {
  if (typeof localStorage === "undefined") return [];
  try {
    const rows: Array<{ key: string; kind: StorageKind }> = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      rows.push({ key, kind: storageKind(key) });
    }
    return rows.sort((a, b) => a.key.localeCompare(b.key));
  } catch {
    return [];
  }
}

export function clearStoredKind(kind: "preferences" | "other") {
  if (typeof localStorage === "undefined") return;
  try {
    for (const row of listLocalStorage()) {
      if (row.kind === kind) localStorage.removeItem(row.key);
    }
  } catch {
    /* private mode */
  }
  if (kind === "preferences" && typeof document !== "undefined") {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }
}
