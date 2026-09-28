import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export type LinkedAccount = {
  providerId: string;
  label: string;
  createdAt: string | null;
};

function labelFor(providerId: string) {
  if (providerId === "credential") return "E-mail e senha";
  if (providerId === "grok-google" || providerId === "google") return "Google";
  return "OAuth";
}

function isXAccount(providerId: string) {
  return providerId === "grok-x" || providerId === "twitter" || providerId === "x";
}

export const listLinkedAccounts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LinkedAccount[]> => {
    const sql = await getSql();
    const rows = await sql<{ provider_id: string; created_at: string | null }>`
      select "providerId" as provider_id, "createdAt"::text as created_at
      from "account"
      where "userId" = ${context.userId}
      order by "createdAt" asc
    `;
    return rows
      .filter((row) => !isXAccount(row.provider_id))
      .map((row) => ({
      providerId: row.provider_id,
      label: labelFor(row.provider_id),
      createdAt: row.created_at,
    }));
  });
