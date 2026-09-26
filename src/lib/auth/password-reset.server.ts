import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { getSql } from "@/lib/db";
import { strongPassword, tooManyAttempts, validEmail } from "@/lib/security";

const CODE_MS = 10 * 60 * 1000;
const RESEND_MS = 30 * 1000;
const MAX_GUESSES = 5;

type CodeEntry = { userId: string; hash: Buffer; exp: number; sentAt: number; guesses: number };
type ProofEntry = { userId: string; exp: number };

const memory = globalThis as typeof globalThis & {
  __passwordResetCodes__?: Map<string, CodeEntry>;
  __passwordResetProofs__?: Map<string, ProofEntry>;
};

function codes() {
  return (memory.__passwordResetCodes__ ??= new Map());
}

function proofs() {
  return (memory.__passwordResetProofs__ ??= new Map());
}

function hashCode(userId: string, code: string) {
  return createHash("sha256").update(`${userId}:${code}`).digest();
}

function same(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

async function accountFor(email: string) {
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    select id from "user" where lower(email) = ${email} limit 1
  `;
  return rows[0]?.id ?? null;
}

export async function sendResetCode(email: string) {
  const clean = email.trim().toLowerCase();
  if (!validEmail(clean)) return { ok: false as const, error: "E-mail inválido." };
  if (tooManyAttempts(`reset-send:${clean}`, 5, 10 * 60 * 1000)) {
    return { ok: false as const, error: "Muitas tentativas. Espere um pouco." };
  }
  const userId = await accountFor(clean);
  if (!userId) return { ok: false as const, error: "E-mail não encontrado." };
  const previous = codes().get(clean);
  if (previous && Date.now() - previous.sentAt < RESEND_MS) {
    const wait = Math.ceil((RESEND_MS - (Date.now() - previous.sentAt)) / 1000);
    return { ok: false as const, error: `Espere ${wait}s para enviar de novo.`, wait };
  }
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  codes().set(clean, {
    userId,
    hash: hashCode(userId, code),
    exp: Date.now() + CODE_MS,
    sentAt: Date.now(),
    guesses: 0,
  });
  return { ok: true as const, code };
}

export async function verifyResetCode(email: string, code: string) {
  const clean = email.trim().toLowerCase();
  const digits = code.replace(/\D/g, "");
  if (!validEmail(clean) || digits.length !== 6) {
    return { ok: false as const, error: "Código incorreto." };
  }
  const entry = codes().get(clean);
  if (!entry || entry.exp < Date.now()) {
    codes().delete(clean);
    return { ok: false as const, error: "Código expirado. Peça outro." };
  }
  if (!same(entry.hash, hashCode(entry.userId, digits))) {
    entry.guesses += 1;
    if (entry.guesses >= MAX_GUESSES) codes().delete(clean);
    return { ok: false as const, error: "Código incorreto." };
  }
  codes().delete(clean);
  const proof = randomBytes(24).toString("hex");
  proofs().set(proof, { userId: entry.userId, exp: Date.now() + CODE_MS });
  return { ok: true as const, proof };
}

export async function applyNewPassword(proof: string, password: string) {
  if (!strongPassword(password)) {
    return { ok: false as const, error: "Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo." };
  }
  const entry = proofs().get(proof);
  if (!entry || entry.exp < Date.now()) {
    proofs().delete(proof);
    return { ok: false as const, error: "Pedido expirado. Comece de novo." };
  }
  proofs().delete(proof);
  const hashed = await hashPassword(password);
  const sql = await getSql();
  const existing = await sql<{ id: string }>`
    select id from "account" where "userId" = ${entry.userId} and "providerId" = 'credential' limit 1
  `;
  if (existing[0]) {
    await sql`
      update "account" set password = ${hashed}, "updatedAt" = now()
      where "userId" = ${entry.userId} and "providerId" = 'credential'
    `;
  } else {
    const id = randomBytes(16).toString("hex");
    await sql`
      insert into "account" ("id", "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
      values (${id}, ${entry.userId}, 'credential', ${entry.userId}, ${hashed}, now(), now())
    `;
  }
  await sql`delete from "session" where "userId" = ${entry.userId}`;
  return { ok: true as const };
}
