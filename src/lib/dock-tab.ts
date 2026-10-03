export type DockTab = "tarefas" | "hoje" | "feitas" | "mais";
export type StoredTab = Exclude<DockTab, "tarefas">;

const KEY = "tarefas-tab";
let memoryTab: DockTab = "tarefas";

export function parseDockTab(value: string | null): DockTab {
  if (value === "tarefas" || value === "hoje" || value === "feitas" || value === "mais") return value;
  return "tarefas";
}

export function readDockTab(): DockTab {
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored !== null) {
      memoryTab = parseDockTab(stored);
    }
  } catch {
    /* private mode */
  }
  return memoryTab;
}

export function writeDockTab(tab: DockTab) {
  memoryTab = tab;
  try {
    sessionStorage.setItem(KEY, tab);
  } catch {
    /* private mode */
  }
}

export function homeSearch(tab = readDockTab()): { aba?: StoredTab } {
  if (tab === "hoje" || tab === "feitas" || tab === "mais") return { aba: tab };
  return {};
}

export function homePath(tab = readDockTab()) {
  const search = homeSearch(tab);
  return search.aba ? `/?aba=${search.aba}` : "/";
}
