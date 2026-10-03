import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { dbSource, getSql } from "@/lib/db";
import { plainText } from "@/lib/text";

export type StoredTask = {
  id: string;
  text: string;
  done: boolean;
  dueAt: string | null;
  createdAt: string;
};

export type PersistenceSnapshot = {
  engine: "postgres" | "pglite";
  tasks: number;
  done: number;
  scheduled: number;
  newestAt: string | null;
  rows: StoredTask[];
};

export const readPersistence = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PersistenceSnapshot> => {
    const sql = await getSql();
    const counts = await sql<{
      tasks: number;
      done: number;
      scheduled: number;
      newest_at: string | null;
    }>`
      select
        count(*)::int as tasks,
        count(*) filter (where done)::int as done,
        count(*) filter (where due_at is not null)::int as scheduled,
        max(created_at)::text as newest_at
      from tasks
      where user_id = ${context.userId}
    `;
    const rows = await sql<{
      id: string;
      text: string;
      done: boolean;
      due_at: string | null;
      created_at: string;
    }>`
      select id, text, done, due_at::text as due_at, created_at::text as created_at
      from tasks
      where user_id = ${context.userId}
      order by created_at desc
      limit 12
    `;
    const head = counts[0];
    return {
      engine: dbSource === "neon" ? "postgres" : "pglite",
      tasks: head?.tasks ?? 0,
      done: head?.done ?? 0,
      scheduled: head?.scheduled ?? 0,
      newestAt: head?.newest_at ?? null,
      rows: rows.map((row) => ({
        id: row.id,
        text: plainText(row.text, 80) || "Tarefa",
        done: Boolean(row.done),
        dueAt: row.due_at,
        createdAt: row.created_at,
      })),
    };
  });
