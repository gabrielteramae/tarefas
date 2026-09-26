import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { tooManyAttempts } from "@/lib/security";
import { getAuthContext } from "./verify.server";
import { createTotpSecret, verifyTotp } from "./totp.server";

const BACKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type MfaRow = { secret: string; enabled: boolean; backups: string };

async function row(userId: string) {
  const sql = await getSql();
  const rows = await sql<MfaRow>`
    select secret, enabled, backups from user_mfa where user_id = ${userId} limit 1
  `;
  return rows[0] ?? null;
}

export async function mfaStatus(userId: string, token: string) {
  const current = await row(userId);
  if (!current?.enabled) return { enabled: false, verified: true };
  const sql = await getSql();
  const ok = await sql`
    select 1 as ok from user_mfa_ok
    where session_token = ${token} and expires_at > now()
    limit 1
  `;
  return { enabled: true, verified: Boolean(ok[0]) };
}

export async function assertMfaSatisfied(userId: string, token: string) {
  const status = await mfaStatus(userId, token);
  if (status.enabled && !status.verified) {
    const error = new Error("MfaRequired");
    error.name = "MfaRequiredError";
    throw error;
  }
}

function backupCode() {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i += 1) out += BACKUP_ALPHABET[bytes[i] % BACKUP_ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

function hashBackup(userId: string, code: string) {
  const clean = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return createHash("sha256").update(`${userId}:${clean}`).digest("hex");
}

function takeBackup(userId: string, code: string, stored: string) {
  const want = Buffer.from(hashBackup(userId, code));
  const list = stored ? stored.split(",").filter(Boolean) : [];
  let hit = -1;
  for (let i = 0; i < list.length; i += 1) {
    const have = Buffer.from(list[i]);
    if (have.length === want.length && timingSafeEqual(have, want)) hit = i;
  }
  if (hit < 0) return null;
  list.splice(hit, 1);
  return list.join(",");
}

export async function startMfa(userId: string, email: string | null) {
  const current = await row(userId);
  if (current?.enabled) return { ok: false as const, error: "A verificação já está ligada." };
  const secret = current?.secret ?? createTotpSecret();
  const sql = await getSql();
  if (current) {
    await sql`update user_mfa set secret = ${secret} where user_id = ${userId}`;
  } else {
    await sql`insert into user_mfa (user_id, secret, enabled) values (${userId}, ${secret}, false)`;
  }
  const label = email ?? "conta";
  return {
    ok: true as const,
    secret,
    otpauth: `otpauth://totp/Tarefas:${encodeURIComponent(label)}?secret=${secret}&issuer=Tarefas&digits=6&period=30`,
  };
}

async function markSession(userId: string, token: string) {
  const sql = await getSql();
  await sql`
    insert into user_mfa_ok (session_token, user_id, expires_at)
    values (${token}, ${userId}, now() + interval '7 days')
    on conflict (session_token) do update set expires_at = excluded.expires_at, user_id = excluded.user_id
  `;
}

export async function confirmMfa(userId: string, token: string, code: string) {
  const current = await row(userId);
  if (!current) return { ok: false as const, error: "Comece de novo." };
  if (!verifyTotp(current.secret, code)) return { ok: false as const, error: "Código incorreto." };
  const codes = Array.from({ length: 8 }, backupCode);
  const hashes = codes.map((item) => hashBackup(userId, item)).join(",");
  const sql = await getSql();
  await sql`update user_mfa set enabled = true, backups = ${hashes} where user_id = ${userId}`;
  await markSession(userId, token);
  return { ok: true as const, backups: codes };
}

async function acceptCode(userId: string, code: string, current: MfaRow) {
  if (verifyTotp(current.secret, code)) return current.backups;
  const next = takeBackup(userId, code, current.backups);
  if (next == null) return null;
  const sql = await getSql();
  await sql`update user_mfa set backups = ${next} where user_id = ${userId}`;
  return next;
}

export async function disableMfa(userId: string, code: string) {
  const current = await row(userId);
  if (!current?.enabled) return { ok: true as const };
  if ((await acceptCode(userId, code, current)) == null) return { ok: false as const, error: "Código incorreto." };
  const sql = await getSql();
  await sql`delete from user_mfa where user_id = ${userId}`;
  await sql`delete from user_mfa_ok where user_id = ${userId}`;
  return { ok: true as const };
}

export async function verifyMfa(userId: string, token: string, code: string) {
  if (tooManyAttempts(`mfa:${userId}`, 8, 10 * 60 * 1000)) {
    return { ok: false as const, error: "Muitas tentativas. Espere um pouco." };
  }
  const current = await row(userId);
  if (!current?.enabled) return { ok: true as const };
  if ((await acceptCode(userId, code, current)) == null) return { ok: false as const, error: "Código incorreto." };
  await markSession(userId, token);
  return { ok: true as const };
}

export async function currentMfa() {
  const auth = await getAuthContext();
  if (!auth) return null;
  return auth;
}
