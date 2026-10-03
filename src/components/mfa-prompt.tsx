import { useState } from "react";
import { getBearerToken, signOut } from "@/lib/auth/client";
import { CodeBoxes } from "@/components/code-boxes";
import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function post(body: Record<string, string>) {
  const token = getBearerToken();
  const res = await fetch("/api/mfa", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return (await res.json()) as { ok: boolean; error?: string };
}

export function MfaPrompt({ onOk }: { onOk: () => void }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [reserve, setReserve] = useState(false);
  const [backup, setBackup] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (value = reserve ? backup : digits.join("")) => {
    if (busy) return;
    const compact = value.replace(/[^A-Za-z0-9]/g, "");
    if (reserve) {
      if (compact.length < 8) {
        setError("O código reserva tem 8 caracteres.");
        return;
      }
    } else if (value.length !== 6) {
      setError("Digite os 6 números.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await post({ step: "verify", code: value });
      if (!result.ok) {
        setError(result.error ?? "Código incorreto.");
        setDigits(Array(6).fill(""));
        return;
      }
      onOk();
    } catch {
      setError("Código incorreto.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div className="page-shell mx-auto flex w-full max-w-sm flex-col pt-16">
        <h1 className="text-2xl font-semibold tracking-tight">Código de acesso</h1>
        <p className="mt-2 text-sm text-muted">
          {reserve ? "Use um código reserva. Cada um vale uma vez." : "Abra o autenticador e digite os 6 números."}
        </p>
        <div className="mt-6">
          {reserve ? (
            <Input
              autoFocus
              autoCapitalize="characters"
              autoComplete="one-time-code"
              value={backup}
              maxLength={9}
              placeholder="XXXX-XXXX"
              onChange={(event) => setBackup(event.target.value.toUpperCase())}
            />
          ) : (
            <CodeBoxes
              digits={digits}
              error={Boolean(error)}
              autoFocus
              onDigits={(next) => {
                setDigits(next);
                const code = next.join("");
                if (code.length === 6 && !next.includes("")) void submit(code);
              }}
            />
          )}
        </div>
        {error ? <FieldError id="mfa-error">{error}</FieldError> : null}
        <Button className="mt-6 h-12 w-full" disabled={busy} onClick={() => void submit()}>
          {busy ? "Conferindo…" : "Continuar"}
        </Button>
        <button
          type="button"
          className="mt-4 text-sm text-muted"
          onClick={() => {
            setError("");
            setReserve((value) => !value);
          }}
        >
          {reserve ? "Usar o autenticador" : "Código reserva"}
        </button>
        <button type="button" className="mt-6 text-sm text-subtle" onClick={() => void signOut("/login")}>
          Sair
        </button>
      </div>
    </main>
  );
}
