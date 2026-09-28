import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DockNav, type DockTab } from "@/components/dock-nav";
import { PhoneScroll } from "@/components/phone-scroll";
import { TaskCard, type TaskActions } from "@/components/task-card";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addTask,
  getStreak,
  listTasks,
  recordClear,
  removeTask,
  reorderTasks,
  setTaskSpan,
  toggleTask,
  type TaskRow,
} from "@/lib/tasks";
import { getPrefs } from "@/lib/prefs";
import { notifyDone, notifyDue, localDay } from "@/lib/notify";
import { MoreHub } from "@/components/more-hub";
import { cn } from "@/lib/utils";
import { useTapAction } from "@/lib/use-tap-action";
import { calendarDay, clockOf, spanDays, withClock } from "@/lib/dates";
import { plainText } from "@/lib/text";
import { publishTasksChanged, subscribeTasksChanged } from "@/lib/tab-sync";

function isUnauthorized(err: unknown) {
  return err instanceof Error && err.message === "Unauthorized";
}

function isoDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function todayParts(date: Date) {
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  const rest = date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  return {
    title: rest,
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
  };
}

function monthTitle(date: Date) {
  const text = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  const clean = text.replace(".", "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function Agenda({
  groups,
  today,
}: {
  groups: { open: TaskRow[]; days: string[]; byDay: Map<string, TaskRow[]> };
  today: Date;
}) {
  const todayKey = isoDay(today);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(todayKey);
  const week = ["2ª", "3ª", "4ª", "5ª", "6ª", "sá", "do"];
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const pad = (first.getDay() + 6) % 7;
  const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: Array<{ key: string; day: number } | null> = [
    ...Array.from({ length: pad }, () => null),
    ...Array.from({ length: count }, (_, index) => {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), index + 1);
      return { key: isoDay(date), day: index + 1 };
    }),
  ];
  const selectedTasks = [...(groups.byDay.get(selected) ?? [])];
  const tap = useTapAction();

  return (
      <div className="tab-pane flex flex-col gap-5 pb-28">
      <section className="rounded-3xl bg-surface px-4 py-4 shadow-card">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button type="button" className="tap-target grid size-11 place-items-center rounded-full text-muted" {...tap("prev-month", () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)))} aria-label="Mês anterior">
            ‹
          </button>
          <p className="text-xl font-semibold tracking-tight">{monthTitle(cursor)}</p>
          <button type="button" className="tap-target grid size-11 place-items-center rounded-full text-muted" {...tap("next-month", () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)))} aria-label="Próximo mês">
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-2 text-center text-[11px] text-subtle">
          {week.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
          {cells.map((cell, index) =>
            cell ? (
              <button
                key={cell.key}
                type="button"
                {...tap(cell.key, () => setSelected(cell.key))}
                className="tap-target flex min-h-11 flex-col items-center justify-center py-1"
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-sm",
                    selected === cell.key && "bg-accent text-accent-fg",
                    selected !== cell.key && cell.key === todayKey && "text-accent",
                  )}
                >
                  {cell.day}
                </span>
                <span className={cn("mt-0.5 size-1 rounded-full", groups.byDay.has(cell.key) ? "bg-accent" : "bg-transparent")} />
              </button>
            ) : (
              <span key={`empty-${index}`} />
            ),
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-fg">
          {selected === todayKey
            ? "Tarefas de hoje"
            : new Date(`${selected}T12:00:00`).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
        </h2>
        {selectedTasks.length === 0 ? (
          <p className="text-sm text-subtle">Nada neste dia.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedTasks.map((task) => (
              <li key={task.id} className="truncate rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
                {task.text}
              </li>
            ))}
          </ul>
        )}
      </section>
      {groups.open.length > 0 ? (
        <p className="text-xs text-subtle">
          {groups.open.length === 1
            ? "1 tarefa sem dia. Marque na lista."
            : `${groups.open.length} tarefas sem dia. Marque na lista.`}
        </p>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <main className="app-frame grid place-items-center text-muted" aria-busy="true">
        <p className="text-sm">Abrindo…</p>
      </main>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <TaskBoard />;
}

function TaskBoard() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<DockTab>("tarefas");
  const [streak, setStreak] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const [clock, setClock] = useState(() => new Date());
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const orderRef = useRef<string[] | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const dragY = useRef(0);
  const dragFrame = useRef(0);
  const rowEls = useRef<HTMLElement[]>([]);
  const tails = useRef(new Map<string, Promise<void>>());
  const filtersRef = useRef({ today: false, late: false, done: false });
  const loadedRef = useRef<TaskRow[] | null>(null);
  const addingRef = useRef(false);
  const recentAdd = useRef({ text: "", at: 0 });
  const inflight = useRef(0);
  const pendingDeletes = useRef(new Map<string, { task: TaskRow; index: number; timer: number }>());
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const chain = (id: string, job: () => Promise<void>) => {
    const prev = tails.current.get(id) ?? Promise.resolve();
    const next = prev.then(job).catch(() => undefined);
    tails.current.set(id, next);
  };

  const commit = (next: TaskRow[]) => {
    tasksRef.current = next;
    loadedRef.current = next;
    setTasks(next);
  };

  useEffect(() => {
    let cancelled = false;
    const ping = () => {
      if (cancelled || !loadedRef.current) return;
      notifyDue(loadedRef.current, filtersRef.current);
    };
    listTasks()
      .then((rows) => {
        if (cancelled) return;
        setTasks(rows);
        loadedRef.current = rows;
        ping();
      })
      .catch((err) => {
        if (isUnauthorized(err) || cancelled) return;
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    void getPrefs()
      .then((p) => {
        if (cancelled) return;
        setConfirmDelete(p.confirmDelete);
        filtersRef.current = { today: p.notifyToday, late: p.notifyLate, done: p.notifyDone };
        ping();
      })
      .catch(() => undefined);
    void getStreak()
      .then((row) => {
        if (!cancelled) setStreak(row.streak);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const arm = () => {
      const now = new Date();
      setClock(now);
      const next = new Date(now);
      next.setHours(24, 0, 2, 0);
      return window.setTimeout(arm, Math.max(1000, next.getTime() - now.getTime()));
    };
    const timer = arm();
    const onVis = () => {
      if (document.visibilityState === "visible") setClock(new Date());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    let timer = 0;
    const reload = () => {
      if (inflight.current > 0 || pendingDeletes.current.size > 0 || !loadedRef.current) return;
      void listTasks()
        .then((rows) => {
          if (inflight.current === 0 && pendingDeletes.current.size === 0) commit(rows);
        })
        .catch(() => undefined);
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(reload, 150);
    };
    const stop = subscribeTasksChanged(schedule);
    const onVis = () => {
      if (document.visibilityState === "visible") schedule();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const typing = Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable));
      if (event.key === "Escape") {
        setOpenId(null);
        if (typing) target?.blur();
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      const order: DockTab[] = ["tarefas", "hoje", "feitas", "mais"];
      const inDock = Boolean(target?.closest("nav[aria-label='Seções']"));
      if (inDock && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        event.preventDefault();
        const index = order.indexOf(tabRef.current);
        const next = event.key === "ArrowRight" ? (index + 1) % order.length : (index + order.length - 1) % order.length;
        const tab = order[next];
        if (tab) setTab(tab);
      }
      if (event.key === "n" && tabRef.current === "tarefas") {
        document.getElementById("nova-tarefa")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const focusComposer = (event: { currentTarget: HTMLInputElement }) => {
    const el = event.currentTarget;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }, 280);
  };

  const add = async () => {
    if (addingRef.current) return;
    const text = plainText(draft, 80);
    if (!text) return;
    const now = Date.now();
    if (recentAdd.current.text === text && now - recentAdd.current.at < 900) return;
    addingRef.current = true;
    recentAdd.current = { text, at: now };
    setAdding(true);
    setDraft("");
    const id = crypto.randomUUID();
    const temp: TaskRow = {
      id,
      text,
      done: false,
      category: "estudo",
      priority: "normal",
      dueAt: null,
      endsAt: null,
      sortOrder: (tasksRef.current[0]?.sortOrder ?? 0) - 1,
    };
    tasksRef.current = [temp, ...tasksRef.current];
    commit(tasksRef.current);
    inflight.current += 1;
    chain(id, async () => {
      try {
        const local = tasksRef.current.find((task) => task.id === id);
        if (!local) return;
        const saved = await addTask({
          data: { id, text: local.text, category: local.category, dueAt: local.dueAt, sortOrder: local.sortOrder },
        });
        if (saved.id !== id) commit(tasksRef.current.filter((task) => task.id !== id));
        else commit(tasksRef.current.map((task) => (task.id === id ? { ...task, text: saved.text } : task)));
        publishTasksChanged();
        setLive(`Adicionada: ${saved.text}`);
      } catch (err) {
        if (isUnauthorized(err)) return;
        if (!tasksRef.current.some((task) => task.id === id)) return;
        commit(tasksRef.current.filter((task) => task.id !== id));
        setDraft(text);
      } finally {
        inflight.current -= 1;
        addingRef.current = false;
        setAdding(false);
      }
    });
  };

  const toggle = async (id: string) => {
    const current = tasksRef.current.find((task) => task.id === id);
    const willDone = !current?.done;
    const next = tasksRef.current.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
    commit(next);
    if (current) setLive(willDone ? `Concluída: ${current.text}` : `Reaberta: ${current.text}`);
    if (willDone && filtersRef.current.done && current) notifyDone(id, current.text);
    inflight.current += 1;
    chain(id, async () => {
      try {
        const desired = tasksRef.current.find((task) => task.id === id)?.done;
        if (desired === undefined) return;
        let row = await toggleTask({ data: { id } });
        if (row.done !== desired) row = await toggleTask({ data: { id } });
        if (desired && tasksRef.current.every((task) => task.done)) {
          const cleared = await recordClear({ data: { day: localDay() } }).catch(() => null);
          if (cleared) setStreak(cleared.streak);
        }
        publishTasksChanged();
      } catch (err) {
        if (isUnauthorized(err)) return;
        const rows = await listTasks().catch(() => null);
        if (rows) commit(rows);
      } finally {
        inflight.current -= 1;
      }
    });
  };

  const restore = (id: string) => {
    const pending = pendingDeletes.current.get(id);
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pendingDeletes.current.delete(id);
    if (tasksRef.current.some((item) => item.id === id)) return;
    const next = [...tasksRef.current];
    next.splice(Math.min(pending.index, next.length), 0, pending.task);
    commit(next);
    setLive(`Restaurada: ${pending.task.text}`);
  };

  const remove = (id: string) => {
    const snapshot = tasksRef.current;
    const index = snapshot.findIndex((task) => task.id === id);
    const task = snapshot[index];
    if (!task || pendingDeletes.current.has(id)) return;
    if (confirmDelete && !window.confirm("Apagar esta tarefa?")) return;
    commit(snapshot.filter((item) => item.id !== id));
    setLive(`Apagada: ${task.text}. Dá para desfazer.`);
    const timer = window.setTimeout(() => {
      pendingDeletes.current.delete(id);
      inflight.current += 1;
      chain(id, async () => {
        try {
          await removeTask({ data: { id } });
          publishTasksChanged();
        } catch (err) {
          if (isUnauthorized(err)) return;
          const rows = await listTasks().catch(() => null);
          if (rows) commit(rows);
          else if (!tasksRef.current.some((item) => item.id === id)) {
            const next = [...tasksRef.current];
            next.splice(Math.min(index, next.length), 0, task);
            commit(next);
          }
        } finally {
          inflight.current -= 1;
        }
      });
    }, 5000);
    pendingDeletes.current.set(id, { task, index, timer });
    toast("Tarefa apagada", {
      duration: 5000,
      action: { label: "Desfazer", onClick: () => restore(id) },
    });
  };

  const refreshRows = () => {
    rowEls.current = [...document.querySelectorAll<HTMLElement>("[data-task-id]")];
  };

  const persistOrder = async (ids: string[]) => {
    try {
      await Promise.all([...tails.current.values()]);
      await reorderTasks({ data: { ids } });
      publishTasksChanged();
    } catch (err) {
      if (isUnauthorized(err)) return;
    }
  };

  const moveBefore = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const prev = tasksRef.current;
    const pending = prev.filter((task) => !task.done);
    const done = prev.filter((task) => task.done);
    const from = pending.findIndex((task) => task.id === fromId);
    const to = pending.findIndex((task) => task.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...pending];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    const ordered = [...next, ...done];
    for (let index = 0; index < ordered.length; index += 1) {
      const task = ordered[index];
      if (task && task.sortOrder !== index) task.sortOrder = index;
    }
    orderRef.current = ordered.map((task) => task.id);
    commit(ordered);
  };

  const dragStart = (id: string) => {
    dragIdRef.current = id;
    setDragId(id);
    refreshRows();
  };

  const dragMove = (id: string, y: number) => {
    if (dragIdRef.current !== id) return;
    dragY.current = y;
    if (dragFrame.current) return;
    dragFrame.current = window.requestAnimationFrame(() => {
      dragFrame.current = 0;
      const current = dragIdRef.current;
      if (!current) return;
      const pointerY = dragY.current;
      const pending = tasksRef.current.filter((item) => !item.done);
      const index = pending.findIndex((item) => item.id === current);
      if (index < 0) return;
      const mine = rowEls.current.find((row) => row.dataset.taskId === current);
      if (!mine) return;
      const mineBox = mine.getBoundingClientRect();
      const goingUp = pointerY < mineBox.top + mineBox.height / 2;
      const neighbor = pending[goingUp ? index - 1 : index + 1];
      if (!neighbor) return;
      const other = rowEls.current.find((row) => row.dataset.taskId === neighbor.id);
      if (!other) return;
      const mid = other.getBoundingClientRect().top + other.getBoundingClientRect().height / 2;
      if ((goingUp && pointerY < mid) || (!goingUp && pointerY > mid)) {
        moveBefore(current, neighbor.id);
        refreshRows();
      }
    });
  };

  const dragEnd = () => {
    if (dragFrame.current) window.cancelAnimationFrame(dragFrame.current);
    dragFrame.current = 0;
    dragIdRef.current = null;
    if (orderRef.current) void persistOrder(orderRef.current);
    orderRef.current = null;
    setDragId(null);
  };

  const expand = (id: string) => {
    setOpenId((current) => (current === id ? null : id));
  };

  const spanChange = (task: TaskRow, which: "start" | "end" | "startClock" | "endClock", value: string) => {
    const current = tasksRef.current.find((item) => item.id === task.id) ?? task;
    let start = calendarDay(current.dueAt);
    let end = calendarDay(current.endsAt ?? current.dueAt);
    let startClock = clockOf(current.dueAt);
    let endClock = clockOf(current.endsAt);
    if (which === "start") start = value;
    else if (which === "end") end = value;
    else if (which === "startClock") startClock = value;
    else endClock = value;
    if (start && end && end < start) {
      if (which === "start") end = start;
      else if (which === "end") start = end;
    }
    if (!start && end) start = end;
    if (start && !end) end = start;
    const startAt = start ? withClock(start, startClock) : null;
    const endAt = end ? withClock(end, endClock) : null;
    const previous = current;
    const next = tasksRef.current.map((item) => (item.id === task.id ? { ...item, dueAt: startAt, endsAt: endAt } : item));
    commit(next);
    chain(task.id, async () => {
      try {
        await setTaskSpan({ data: { id: task.id, startAt, endAt } });
        publishTasksChanged();
      } catch (err) {
        if (isUnauthorized(err) || !previous) return;
        const restored = tasksRef.current.map((item) => (item.id === task.id ? previous : item));
        commit(restored);
      }
    });
  };

  const api = useRef<TaskActions>(null!);
  const actions = useMemo<TaskActions>(
    () => ({
      toggle: (id) => void api.current.toggle(id),
      remove: (id) => void api.current.remove(id),
      span: (task, which, value) => api.current.span(task, which, value),
      dragStart: (id) => api.current.dragStart(id),
      dragMove: (id, y) => api.current.dragMove(id, y),
      dragEnd: () => api.current.dragEnd(),
      dragCancel: () => api.current.dragEnd(),
      expand: (id) => api.current.expand(id),
    }),
    [],
  );
  api.current = {
    toggle,
    remove,
    span: spanChange,
    dragStart,
    dragMove,
    dragEnd,
    dragCancel: dragEnd,
    expand,
  };

  const titles: Record<DockTab, string> = {
    tarefas: "Lista",
    hoje: "Calendário",
    feitas: "Feitas",
    mais: "Mais",
  };

  const stats = useMemo(() => {
    let open = 0;
    let done = 0;
    for (const task of tasks) {
      if (task.done) done += 1;
      else open += 1;
    }
    return { open, done, total: tasks.length };
  }, [tasks]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (tab === "feitas") return tasks.filter((task) => task.done);
    return tasks.filter((task) => !task.done && (!q || task.text.toLowerCase().includes(q)));
  }, [tasks, tab, query]);

  const agenda = useMemo(() => {
    const pending = tasks.filter((task) => !task.done);
    const open = pending.filter((task) => !task.dueAt && !task.endsAt);
    const byDay = new Map<string, TaskRow[]>();
    for (const task of pending) {
      for (const key of spanDays(task.dueAt, task.endsAt)) {
        const list = byDay.get(key) ?? [];
        list.push(task);
        byDay.set(key, list);
      }
    }
    return { open, days: [...byDay.keys()].sort(), byDay };
  }, [tasks]);

  const today = clock;
  const parts = todayParts(today);
  const openLabel = stats.open === 0 ? "Nada para fazer" : stats.open === 1 ? "1 para fazer" : `${stats.open} para fazer`;

  return (
    <main className="app-frame text-fg">
      <div className="app-shell mx-auto w-full max-w-lg">
        <header className="mb-5 shrink-0">
          {tab === "tarefas" ? (
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{parts.title}</h1>
              <p className="mt-1 text-sm text-muted">
                {parts.weekday}
                {ready ? ` · ${openLabel}` : ""}
                {streak > 0 ? ` · ${streak} ${streak === 1 ? "dia seguido" : "dias seguidos"}` : ""}
              </p>
            </div>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">{titles[tab]}</h1>
          )}
        </header>

        {tab === "tarefas" ? (
          <form
            className="mb-6 flex shrink-0 flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void add();
            }}
          >
            <div className="flex gap-3">
              <Input
                value={draft}
                maxLength={80}
                enterKeyHint="done"
                onChange={(event) => setDraft(event.target.value)}
                onFocus={focusComposer}
                id="nova-tarefa"
                placeholder="O que precisa ser feito?"
                aria-label="Nova tarefa"
                autoComplete="off"
              />
              <Button type="submit" aria-label="Adicionar tarefa" className="shrink-0" disabled={adding}>
                <Plus className="size-5" strokeWidth={2} aria-hidden="true" />
              </Button>
            </div>
          </form>
        ) : null}

        {tab === "tarefas" ? (
          <div className="mb-4 shrink-0">
            <Input
              value={query}
              maxLength={80}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar"
              aria-label="Buscar tarefa"
            />
          </div>
        ) : null}

        {tab === "feitas" ? (
          <div className="mb-4 grid shrink-0 grid-cols-3 gap-2">
            {(
              [
                ["Feitas", String(stats.done)],
                ["Sequência", String(streak)],
                ["Taxa", stats.total ? `${Math.round((stats.done / stats.total) * 100)}%` : "0%"],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-surface px-3 py-3 shadow-card">
                <p className="text-lg font-semibold">{value}</p>
                <p className="text-xs text-subtle">{label}</p>
              </div>
            ))}
          </div>
        ) : null}

        <PhoneScroll>
          {tab === "hoje" ? (
            <Agenda groups={agenda} today={clock} />
          ) : tab === "mais" ? (
            <MoreHub />
          ) : (
            <ul key={tab} className="tab-pane flex flex-col gap-3 pb-28">
              {ready && visible.length === 0 ? (
                <li className="rounded-xl border border-border bg-surface px-5 py-10 text-center">
                  <p className="text-sm text-muted">{tab === "feitas" ? "Nada feito ainda" : "Nada para fazer"}</p>
                </li>
              ) : (
                visible.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    openList={tab === "tarefas"}
                    reorder={!query.trim()}
                    dragging={dragId === task.id}
                    expanded={openId === task.id}
                    actions={actions}
                  />
                ))
              )}
            </ul>
          )}
        </PhoneScroll>
      </div>

      <DockNav tab={tab} onChange={setTab} />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {live}
      </p>
    </main>
  );
}
