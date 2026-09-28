const CHANNEL = "tarefas-sync";
const STORAGE_KEY = "tarefas-sync";

const tabId = Math.random().toString(36).slice(2);

type SyncMessage = { type: "tasks"; tab: string; at: number };

function parse(raw: unknown): SyncMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<SyncMessage>;
  if (row.type !== "tasks" || typeof row.tab !== "string") return null;
  return { type: "tasks", tab: row.tab, at: Number(row.at) || 0 };
}

/** Tell other tabs the list changed. This tab ignores its own message. */
export function publishTasksChanged() {
  const message: SyncMessage = { type: "tasks", tab: tabId, at: Date.now() };
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    /* private mode */
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
  } catch {
    /* private mode */
  }
}

export function subscribeTasksChanged(onChange: () => void) {
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      const message = parse(event.data);
      if (!message || message.tab === tabId) return;
      onChange();
    };
  } catch {
    channel = null;
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const message = parse(JSON.parse(event.newValue));
      if (!message || message.tab === tabId) return;
    } catch {
      return;
    }
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}
