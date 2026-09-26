import { useEffect, useState } from "react";
import { getBearerToken } from "@/lib/auth/client";
import { CodeBoxes } from "@/components/code-boxes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingGroup, SettingRow } from "@/components/auth-screen";

type Status = { enabled: boolean };
type Start = { ok: boolean; secret?: string; error?: string };
type Done = { ok: boolean; error?: string; backups?: string[] };

function headers() {
  const token = getBearerToken();
  return {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

export function MfaSetting() {
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [offCode, setOffCode] = useState("");
  const [mode, setMode] = useState<"idle" | "setup" | "off" | "saved">("idle");
  const [backups, setBackups] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void fetch("/api/mfa", { headers: headers(), credentials: "include" })
      .then((res) => res.json())
      .then((data: Status) => setEnabled(Boolean(data.enabled)))
      .catch(() => undefined);
  }, []);

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/mfa", { method: "POST", headers: headers(), credentials: "include", body: JSON.stringify({ step: "start" }) });
      const data = (await res.json()) as Start;
      if (!data.ok || !data.secret) {
        setError(data.error ?? "Não deu para começar.");
        return;
      }
      setSecret(data.secret);
      setDigits(Array(6).fill(""));
      setMode("setup");
    } catch {
      setError("Não deu para começar.");
    } finally {
      setBusy(false);
    }
  };

  const finish = async (step: "confirm" | "disable") => {
    const code = step === "disable" ? offCode : digits.join("");
    const ready = step === "disable" ? code.replace(/[^A-Za-z0-9]/g, "").length >= 6 : code.length === 6;
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/mfa", {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify({ step, code }),
      });
      const data = (await res.json()) as Done;
      if (!data.ok) {
        setError(data.error ?? "Código incorreto.");
        return;
      }
      setEnabled(step === "confirm");
      setSecret("");
      setDigits(Array(6).fill(""));
      if (step === "confirm" && data.backups?.length) {
        setBackups(data.backups);
        setMode("saved");
        return;
      }
      setMode("idle");
    } catch {
      setError("Código incorreto.");
    } finally {
      setBusy(false);
    }
  };

  const grouped = secret.replace(/(.{4})/g, "$1 ").trim();

  return (
    <SettingGroup>
      <SettingRow title="Verificação em duas etapas" hint={enabled ? "Ligada. Pede código ao entrar." : "Desligada"}>
        {mode !== "idle" ? null : enabled ? (
          <button type="button" className="text-xs font-medium text-danger" onClick={() => { setMode("off"); setError(""); setOffCode(""); }}>
            Desligar
          </button>
        ) : (
          <button type="button" className="text-xs font-medium text-accent" disabled={busy} onClick={() => void start()}>
            Ligar
          </button>
        )}
      </SettingRow>
      {mode === "saved" ? (
        <div className="px-4 py-3">
          <p className="text-xs text-muted">Guarde estes códigos. Cada um funciona uma vez.</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm tracking-wide">
            {backups.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-3 text-xs font-medium text-accent"
            onClick={() => {
              void navigator.clipboard?.writeText(backups.join("\n")).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? "Copiados" : "Copiar códigos"}
          </button>
          <Button className="mt-3 h-10 w-full" onClick={() => setMode("idle")}>
            Guardei
          </Button>
        </div>
      ) : null}
      {mode === "setup" || mode === "off" ? (
        <div className="px-4 py-3">
          {mode === "setup" && secret ? (
            <>
              <p className="text-xs text-muted">No autenticador, escolha inserir a chave.</p>
              <p className="mt-2 font-mono text-sm tracking-widest text-fg">{grouped}</p>
              <button
                type="button"
                className="mt-2 text-xs font-medium text-accent"
                onClick={() => {
                  void navigator.clipboard?.writeText(secret).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                {copied ? "Copiada" : "Copiar chave"}
              </button>
            </>
          ) : (
            <p className="text-xs text-muted">Digite o código do app ou um reserva.</p>
          )}
          <div className="mt-3">
            {mode === "off" ? (
              <Input
                autoCapitalize="characters"
                autoComplete="one-time-code"
                value={offCode}
                maxLength={9}
                placeholder="Código"
                onChange={(event) => setOffCode(event.target.value.toUpperCase())}
              />
            ) : (
              <CodeBoxes digits={digits} error={Boolean(error)} autoFocus onDigits={setDigits} />
            )}
          </div>
          {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
          <Button
            className="mt-3 h-10 w-full"
            disabled={busy || (mode === "off" ? offCode.replace(/[^A-Za-z0-9]/g, "").length < 6 : digits.join("").length < 6)}
            onClick={() => void finish(mode === "setup" ? "confirm" : "disable")}
          >
            {busy ? "Conferindo…" : mode === "setup" ? "Confirmar" : "Desligar"}
          </Button>
        </div>
      ) : null}
    </SettingGroup>
  );
}
