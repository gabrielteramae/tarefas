import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
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
import { notifyDone, notifyDue } from "@/lib/notify";
import { AccountMenu } from "@/components/account-menu";
import { cn } from "@/lib/utils";
import { useTapAction } from "@/lib/use-tap-action";
import { calendarDay, clockOf, spanDays, withClock } from "@/lib/dates";

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
  const text = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Agenda({
  groups,
  ready,
}: {
  groups: { open: TaskRow[]; days: string[]; byDay: Map<string, TaskRow[]> };
  ready: boolean;
}) {
  const today = new Date();
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

  if (ready && groups.days.length === 0 && groups.open.length === 0) {
    return (
      <div className="rounded-3xl bg-surface px-5 py-10 text-center shadow-card">
        <p className="text-sm text-muted">Nada no calendário</p>
      </div>
    );
  }

    return (
      <div className="tab-pane flex flex-col gap-5 pb-28">
      <section className="rounded-3xl bg-surface px-4 py-4 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" className="tap-target px-3 py-2 text-lg text-muted" {...tap("prev-month", () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)))} aria-label="Mês anterior">
            ‹
          </button>
          <p className="text-sm font-medium">{monthTitle(cursor)}</p>
          <button type="button" className="tap-target px-3 py-2 text-lg text-muted" {...tap("next-month", () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)))} aria-label="Próximo mês">
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
      <main className="min-h-dvh bg-bg px-5 pt-10">
        <div className="mx-auto h-40 w-full max-w-lg animate-pulse rounded-2xl bg-surface" />
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
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<DockTab>("tarefas");
  const [streak, setStreak] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
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

  const add = async () => {
    const text = draft.trim();
    if (!text) return;
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
    chain(id, async () => {
      const local = tasksRef.current.find((task) => task.id === id);
      if (!local) return;
      try {
        await addTask({
          data: { id, text: local.text, category: local.category, dueAt: local.dueAt, sortOrder: local.sortOrder },
        });
      } catch (err) {
        if (isUnauthorized(err)) return;
        if (!tasksRef.current.some((task) => task.id === id)) return;
        commit(tasksRef.current.filter((task) => task.id !== id));
        setDraft(text);
      }
    });
  };

  const toggle = async (id: string) => {
    const current = tasksRef.current.find((task) => task.id === id);
    const willDone = !current?.done;
    const next = tasksRef.current.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
    commit(next);
    if (willDone && filtersRef.current.done && current) notifyDone(id, current.text);
    chain(id, async () => {
      const desired = tasksRef.current.find((task) => task.id === id)?.done;
      if (desired === undefined) return;
      try {
        let row = await toggleTask({ data: { id } });
        if (row.done !== desired) row = await toggleTask({ data: { id } });
        if (desired && tasksRef.current.every((task) => task.done)) {
          const cleared = await recordClear().catch(() => null);
          if (cleared) setStreak(cleared.streak);
        }
      } catch (err) {
        if (isUnauthorized(err)) return;
        const rows = await listTasks().catch(() => null);
        if (rows) commit(rows);
      }
    });
  };

  const remove = async (id: string) => {
    if (confirmDelete && !window.confirm("Apagar esta tarefa?")) return;
    const snapshot = tasksRef.current;
    commit(snapshot.filter((task) => task.id !== id));
    chain(id, async () => {
      try {
        await removeTask({ data: { id } });
      } catch (err) {
        if (isUnauthorized(err)) return;
        const rows = await listTasks().catch(() => null);
        if (rows) commit(rows);
        else commit(snapshot);
      }
    });
  };

  const refreshRows = () => {
    rowEls.current = [...document.querySelectorAll<HTMLElement>("[data-task-id]")];
  };

  const persistOrder = async (ids: string[]) => {
    try {
      await Promise.all([...tails.current.values()]);
      await reorderTasks({ data: { ids } });
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

  const today = new Date();
  const parts = todayParts(today);
  const openLabel = !ready ? "Carregando…" : stats.open === 0 ? "Nada para fazer" : stats.open === 1 ? "1 para fazer" : `${stats.open} para fazer`;

  return (
    <main className="app-frame text-fg">
      <div className="app-shell mx-auto w-full max-w-lg">
        <header className="mb-5 flex shrink-0 items-center justify-between gap-3">
          {tab === "tarefas" ? (
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{parts.title}</h1>
              <p className="mt-1 text-sm text-muted">
                {parts.weekday}
                {" · "}
                {openLabel}
                {streak > 0 ? ` · ${streak} ${streak === 1 ? "dia seguido" : "dias seguidos"}` : ""}
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{titles[tab]}</h1>
            </div>
          )}
          <AccountMenu />
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
                onChange={(event) => setDraft(event.target.value)}
                id="nova-tarefa"
                placeholder="O que precisa ser feito?"
                aria-label="Nova tarefa"
              />
              <Button type="submit" aria-label="Adicionar tarefa" className="shrink-0">
                <Plus className="size-5" strokeWidth={2} />
              </Button>
            </div>
          </form>
        ) : null}

        {tab === "tarefas" ? (
          <div className="mb-4 shrink-0">
            <Input
              value={query}
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
            <Agenda groups={agenda} ready={ready} />
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
    </main>
  );
}
