import { readSavedConsent } from "@/lib/consent";

const KEY = "tarefas-events";

export type AppEvent = "tarefa_criada" | "tarefa_concluida" | "entrar";

export function trackEvent(name: AppEvent) {
  try {
    if (readSavedConsent()?.analytics !== true) return;
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    localStorage.setItem(KEY, JSON.stringify([...list, { name, at: new Date().toISOString() }].slice(-80)));
  } catch {
    /* private mode or consent off */
  }
}
