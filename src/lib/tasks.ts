import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { plainText } from "@/lib/text";

export type TaskCategory = "trabalho" | "casa" | "estudo";
export type TaskPriority = "urgente" | "normal" | "depois";

export type TaskRow = {
  id: string;
  text: string;
  done: boolean;
  category: TaskCategory;
  priority: TaskPriority;
  dueAt: string | null;
  endsAt: string | null;
  sortOrder: number;
};

const CATEGORIES = ["trabalho", "casa", "estudo"] as const;
const PRIORITIES = ["urgente", "normal", "depois"] as const;

const TASK_MAX = 80;
const TASK_CAP = 80;
const RATE_MAX = 40;
const RATE_WINDOW_MS = 60_000;

const buckets = new Map<string, number[]>();

function fail(): never {
  throw new Error("Request failed");
}

function rateLimit(userId: string) {
  const now = Date.now();
  const hits = (buckets.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) fail();
  hits.push(now);
  buckets.set(userId, hits);
}

function sanitizeTaskText(raw: string) {
  const text = plainText(raw, TASK_MAX);
  if (!text) fail();
  return text;
}

const IdInput = z.object({
  id: z.string().uuid(),
});

const AddInput = z.object({
  text: z.string().max(200),
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueAt: z.string().max(40).nullable().optional(),
  endsAt: z.string().max(40).nullable().optional(),
  id: z.string().uuid().optional(),
  sortOrder: z.number().int().min(-100000).max(100000).optional(),
});

const SpanInput = z.object({
  id: z.string().uuid(),
  startAt: z.string().max(40).nullable(),
  endAt: z.string().max(40).nullable(),
});

const OrderInput = z.object({
  ids: z.array(z.string().uuid()).max(80),
});

type DbTask = {
  id: string;
  text: string;
  done: boolean;
  category: string;
  priority: string;
  due_at: string | null;
  ends_at: string | null;
  sort_order: number;
};

function asCategory(value: string): TaskCategory {
  return CATEGORIES.includes(value as TaskCategory) ? (value as TaskCategory) : "estudo";
}

function asPriority(value: string): TaskPriority {
  return PRIORITIES.includes(value as TaskPriority) ? (value as TaskPriority) : "normal";
}

function toRow(row: DbTask): TaskRow {
  return {
    id: row.id,
    text: plainText(row.text, TASK_MAX) || row.text.slice(0, TASK_MAX),
    done: Boolean(row.done),
    category: asCategory(row.category),
    priority: asPriority(row.priority),
    dueAt: row.due_at,
    endsAt: row.ends_at,
    sortOrder: Number(row.sort_order) || 0,
  };
}

function parseDue(raw: string | null | undefined) {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) fail();
  return date.toISOString();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDay(day: string, delta: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** Client calendar day, rejected if it is not close to the server clock. */
function trustedDay(raw: string | undefined) {
  const utc = todayKey();
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return utc;
  const picked = Date.parse(`${raw}T12:00:00Z`);
  if (!Number.isFinite(picked)) return utc;
  if (Math.abs(picked - Date.now()) > 36 * 60 * 60 * 1000) return utc;
  return raw;
}

export const listTasks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TaskRow[]> => {
    const sql = await getSql();
    return sql<DbTask>`
      select id, text, done, category, priority, due_at::text as due_at, ends_at::text as ends_at, sort_order
      from tasks
      where user_id = ${context.userId}
      order by sort_order asc, created_at desc
      limit ${TASK_CAP}
    `.then((rows) => rows.map(toRow));
  });

export const addTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => AddInput.parse(input))
  .handler(async ({ context, data }): Promise<TaskRow> => {
    rateLimit(context.userId);
    const text = sanitizeTaskText(data.text);
    const category = data.category ?? "estudo";
    const priority = data.priority ?? "normal";
    const dueAt = parseDue(data.dueAt);
    const endsAt = parseDue(data.endsAt);
    const sql = await getSql();
    const recent = await sql<{ id: string }>`
      select id from tasks
      where user_id = ${context.userId} and text = ${text}
        and created_at > now() - interval '2 seconds'
      limit 1
    `;
    if (recent[0] && recent[0].id !== data.id) {
      const existing = await sql<DbTask>`
        select id, text, done, category, priority, due_at::text as due_at, ends_at::text as ends_at, sort_order
        from tasks where id = ${recent[0].id} and user_id = ${context.userId}
      `;
      if (existing[0]) return toRow(existing[0]);
    }
    const counted = await sql<{ n: number }>`
      select count(*)::int as n from tasks where user_id = ${context.userId}
    `;
    if ((counted[0]?.n ?? 0) >= TASK_CAP) fail();
    const id = data.id ?? crypto.randomUUID();
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const mins = await sql<{ n: number }>`
        select coalesce(min(sort_order), 0)::int as n from tasks where user_id = ${context.userId}
      `;
      sortOrder = (mins[0]?.n ?? 0) - 1;
    }
    const rows = await sql<DbTask>`
      insert into tasks (id, user_id, text, done, category, priority, due_at, ends_at, sort_order)
      values (${id}, ${context.userId}, ${text}, false, ${category}, ${priority}, ${dueAt}, ${endsAt}, ${sortOrder})
      returning id, text, done, category, priority, due_at::text as due_at, ends_at::text as ends_at, sort_order
    `;
    const row = rows[0];
    if (!row) fail();
    return toRow(row);
  });

export const toggleTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => IdInput.parse(input))
  .handler(async ({ context, data }): Promise<TaskRow> => {
    rateLimit(context.userId);
    const sql = await getSql();
    const rows = await sql<DbTask>`
      update tasks
      set done = not done
      where id = ${data.id} and user_id = ${context.userId}
      returning id, text, done, category, priority, due_at::text as due_at, ends_at::text as ends_at, sort_order
    `;
    const row = rows[0];
    if (!row) fail();
    return toRow(row);
  });

export const setTaskSpan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => SpanInput.parse(input))
  .handler(async ({ context, data }): Promise<TaskRow> => {
    rateLimit(context.userId);
    let startAt = parseDue(data.startAt);
    let endAt = parseDue(data.endAt);
    if (startAt && endAt && new Date(endAt).getTime() < new Date(startAt).getTime()) {
      const swap = startAt;
      startAt = endAt;
      endAt = swap;
    }
    if (startAt && !endAt) endAt = startAt;
    if (endAt && !startAt) startAt = endAt;
    const sql = await getSql();
    const rows = await sql<DbTask>`
      update tasks
      set due_at = ${startAt}, ends_at = ${endAt}
      where id = ${data.id} and user_id = ${context.userId}
      returning id, text, done, category, priority, due_at::text as due_at, ends_at::text as ends_at, sort_order
    `;
    const row = rows[0];
    if (!row) fail();
    return toRow(row);
  });

export const removeTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => IdInput.parse(input))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    rateLimit(context.userId);
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      delete from tasks
      where id = ${data.id} and user_id = ${context.userId}
      returning id
    `;
    if (!rows[0]) fail();
    return { ok: true };
  });

export const deleteAllTasks = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    rateLimit(context.userId);
    const sql = await getSql();
    await sql`delete from tasks where user_id = ${context.userId}`;
    return { ok: true };
  });

export const exportMyData = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const tasks = await sql<DbTask>`
      select id, text, done, category, priority, due_at::text as due_at, ends_at::text as ends_at, sort_order
      from tasks where user_id = ${context.userId}
      order by sort_order asc, created_at desc
    `;
    return { version: 1 as const, exportedAt: new Date().toISOString(), tasks: tasks.map(toRow) };
  });

const ImportTask = z.object({
  id: z.string().uuid().optional(),
  text: z.string().max(200),
  done: z.boolean().optional(),
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueAt: z.string().max(40).nullable().optional(),
  endsAt: z.string().max(40).nullable().optional(),
  sortOrder: z.number().int().min(-100000).max(100000).optional(),
});

function parseImport(input: unknown) {
  const body = Array.isArray(input) ? { tasks: input } : input;
  const parsed = z
    .object({
      version: z.number().int().optional(),
      exportedAt: z.string().max(40).optional(),
      tasks: z.array(ImportTask).max(TASK_CAP),
    })
    .parse(body);
  if (parsed.version !== undefined && parsed.version !== 1) fail();
  return parsed.tasks;
}

function softDue(raw: string | null | undefined) {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export const importTasks = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parseImport(input))
  .handler(async ({ context, data }): Promise<{ imported: number; skipped: number }> => {
    rateLimit(context.userId);
    const sql = await getSql();
    const counted = await sql<{ n: number }>`
      select count(*)::int as n from tasks where user_id = ${context.userId}
    `;
    let room = TASK_CAP - (counted[0]?.n ?? 0);
    let imported = 0;
    let skipped = 0;
    for (const item of data) {
      const text = plainText(item.text, TASK_MAX);
      if (!text || room <= 0) {
        skipped += 1;
        continue;
      }
      let id = item.id ?? crypto.randomUUID();
      const owner = await sql<{ user_id: string }>`select user_id from tasks where id = ${id}`;
      if (owner[0]?.user_id === context.userId) {
        skipped += 1;
        continue;
      }
      if (owner[0]) id = crypto.randomUUID();
      const rows = await sql<{ id: string }>`
        insert into tasks (id, user_id, text, done, category, priority, due_at, ends_at, sort_order)
        values (
          ${id}, ${context.userId}, ${text}, ${item.done === true},
          ${item.category ?? "estudo"}, ${item.priority ?? "normal"},
          ${softDue(item.dueAt)}, ${softDue(item.endsAt)}, ${item.sortOrder ?? imported}
        )
        on conflict (id) do nothing
        returning id
      `;
      if (rows[0]) {
        imported += 1;
        room -= 1;
      } else skipped += 1;
    }
    return { imported, skipped };
  });

export const reorderTasks = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => OrderInput.parse(input))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    rateLimit(context.userId);
    const sql = await getSql();
    for (let i = 0; i < data.ids.length; i += 1) {
      await sql`
        update tasks set sort_order = ${i}
        where id = ${data.ids[i]} and user_id = ${context.userId}
      `;
    }
    return { ok: true };
  });

export const getStreak = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ streak: number }> => {
    const sql = await getSql();
    const rows = await sql<{ current_streak: number }>`
      select current_streak from user_streaks where user_id = ${context.userId}
    `;
    return { streak: Number(rows[0]?.current_streak) || 0 };
  });

const ClearInput = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const recordClear = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ClearInput.parse(input ?? {}))
  .handler(async ({ context, data }): Promise<{ streak: number }> => {
    rateLimit(context.userId);
    const sql = await getSql();
    const pending = await sql<{ n: number }>`
      select count(*)::int as n from tasks where user_id = ${context.userId} and done = false
    `;
    if ((pending[0]?.n ?? 1) > 0) {
      const current = await sql<{ current_streak: number }>`
        select current_streak from user_streaks where user_id = ${context.userId}
      `;
      return { streak: Number(current[0]?.current_streak) || 0 };
    }
    const today = trustedDay(data.day);
    const yesterday = shiftDay(today, -1);
    const rows = await sql<{ current_streak: number; last_clear_date: string | null }>`
      select current_streak, last_clear_date::text as last_clear_date
      from user_streaks where user_id = ${context.userId}
    `;
    const last = rows[0]?.last_clear_date?.slice(0, 10) ?? null;
    const prev = Number(rows[0]?.current_streak) || 0;
    const streak = last === today ? prev : last === yesterday ? prev + 1 : 1;
    await sql`
      insert into user_streaks (user_id, current_streak, last_clear_date)
      values (${context.userId}, ${streak}, ${today})
      on conflict (user_id) do update
      set current_streak = ${streak}, last_clear_date = ${today}
    `;
    return { streak };
  });
