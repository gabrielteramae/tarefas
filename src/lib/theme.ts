export type ThemeMode = "dark" | "light" | "system";

export const THEME_STORAGE_KEY = "tarefas-theme";
const LEGACY_THEME_KEY = "dino-theme";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light" || value === "system";
}

export function resolveTheme(choice: ThemeMode): "dark" | "light" {
  if (choice === "light" || choice === "dark") return choice;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem(LEGACY_THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* private mode */
  }
  return "system";
}

function persistThemeAllowed() {
  try {
    const raw = localStorage.getItem("cookie-banner");
    if (raw === "essential") return false;
    if (!raw || raw === "all") return true;
    return JSON.parse(raw).preferences !== false;
  } catch {
    return true;
  }
}

let media: MediaQueryList | null = null;
let onMedia: (() => void) | null = null;

function watchSystem(choice: ThemeMode) {
  if (onMedia && media) media.removeEventListener("change", onMedia);
  media = null;
  onMedia = null;
  if (choice !== "system" || typeof window === "undefined") return;
  media = window.matchMedia("(prefers-color-scheme: light)");
  onMedia = () => applyTheme("system");
  media.addEventListener("change", onMedia);
}

export function applyTheme(choice: ThemeMode) {
  if (typeof document === "undefined") return;
  const theme = resolveTheme(choice);
  const root = document.documentElement;
  const previous = root.dataset.theme;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (previous && previous !== theme && !reduce) {
    root.classList.add("theme-swap");
    void root.offsetHeight;
    window.setTimeout(() => root.classList.remove("theme-swap"), 380);
  }
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const bar = theme === "light" ? "#f6f3ee" : "#09090b";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bar);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", theme);
  try {
    if (persistThemeAllowed()) {
      localStorage.setItem(THEME_STORAGE_KEY, choice);
      localStorage.removeItem(LEGACY_THEME_KEY);
    }
  } catch {
    /* private mode */
  }
  watchSystem(choice);
}
