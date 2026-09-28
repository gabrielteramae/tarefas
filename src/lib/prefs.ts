import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { isThemeMode, type ThemeMode } from "@/lib/theme";

export type UserPrefs = {
  displayName: string;
  confirmDelete: boolean;
  notifyToday: boolean;
  notifyLate: boolean;
  notifyDone: boolean;
  theme: ThemeMode;
};

const DEFAULTS: UserPrefs = {
  displayName: "",
  confirmDelete: false,
  notifyToday: false,
  notifyLate: false,
  notifyDone: false,
  theme: "system",
};

function asBool(v: unknown, fallback: boolean) {
  if (typeof v === "boolean") return v;
  if (v === "t" || v === "true" || v === 1) return true;
  if (v === "f" || v === "false" || v === 0) return false;
  return fallback;
}

function readFilters(raw: unknown) {
  const picked = new Set(typeof raw === "string" ? raw.split(",").filter(Boolean) : []);
  return {
    notifyToday: picked.has("hoje"),
    notifyLate: picked.has("atraso"),
    notifyDone: picked.has("feita"),
  };
}

function writeFilters(prefs: Pick<UserPrefs, "notifyToday" | "notifyLate" | "notifyDone">) {
  return [prefs.notifyToday ? "hoje" : "", prefs.notifyLate ? "atraso" : "", prefs.notifyDone ? "feita" : ""]
    .filter(Boolean)
    .join(",");
}

function rowToPrefs(row: Record<string, unknown> | undefined): UserPrefs {
  if (!row) return { ...DEFAULTS };
  return {
    displayName: typeof row.display_name === "string" ? row.display_name : "",
    confirmDelete: asBool(row.confirm_delete, false),
    ...readFilters(row.notify_filters),
        theme: isThemeMode(row.theme) ? row.theme : "system",
  };
}

function sanitizeName(raw: string) {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

const Patch = z
  .object({
    displayName: z.string().max(80).optional(),
    confirmDelete: z.boolean().optional(),
    notifyToday: z.boolean().optional(),
    notifyLate: z.boolean().optional(),
    notifyDone: z.boolean().optional(),
    theme: z.enum(["dark", "light", "system"]).optional(),
  })
  .strict();

export const getPrefs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<UserPrefs> => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select display_name, confirm_delete, notify_filters, theme
      from user_prefs where user_id = ${context.userId}
    `;
    if (rows[0]) return rowToPrefs(rows[0]);
    await sql`
            insert into user_prefs (user_id, theme) values (${context.userId}, 'system')
      on conflict (user_id) do nothing
    `;
    return { ...DEFAULTS };
  });

export const updatePrefs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => Patch.parse(input))
  .handler(async ({ context, data }): Promise<UserPrefs> => {
    const sql = await getSql();
    const currentRows = await sql<Record<string, unknown>>`
      select display_name, confirm_delete, notify_filters, theme
      from user_prefs where user_id = ${context.userId}
    `;
    const current = rowToPrefs(currentRows[0]);
    const next: UserPrefs = {
      displayName: data.displayName !== undefined ? sanitizeName(data.displayName) : current.displayName,
      confirmDelete: data.confirmDelete ?? current.confirmDelete,
      notifyToday: data.notifyToday ?? current.notifyToday,
      notifyLate: data.notifyLate ?? current.notifyLate,
      notifyDone: data.notifyDone ?? current.notifyDone,
      theme: data.theme ?? current.theme,
    };
    const filters = writeFilters(next);
    await sql`
      insert into user_prefs (
        user_id, display_name, confirm_delete, notify_filters, theme, updated_at
      )
      values (
        ${context.userId}, ${next.displayName},
        ${next.confirmDelete}, ${filters}, ${next.theme}, now()
      )
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        confirm_delete = excluded.confirm_delete,
        notify_filters = excluded.notify_filters,
        theme = excluded.theme,
        updated_at = now()
    `;
    return next;
  });
