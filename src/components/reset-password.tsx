import { useEffect, useState, type FormEvent } from "react";
import { Check, ChevronLeft, Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBoxes } from "@/components/code-boxes";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | "done";

const RULES = [
  { key: "length", label: "8 caracteres", test: (password: string) => password.length >= 8 },
  { key: "case", label: "Maiúscula e minúscula", test: (password: string) => /[A-Z]/.test(password) && /[a-z]/.test(password) },
  { key: "number", label: "Um número", test: (password: string) => /\d/.test(password) },
  { key: "symbol", label: "Um símbolo", test: (password: string) => /[^A-Za-z0-9]/.test(password) },
] as const;

async function post(body: Record<string, string>) {
  const res = await fetch("/api/password-reset", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { ok: boolean; error?: string; code?: string; proof?: string };
}

export function ResetPassword({
  initialEmail,
  onBack,
}: {
  initialEmail: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [proof, setProof] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  const checks = RULES.map((rule) => ({ ...rule, ok: rule.test(password) }));
  const matched = password.length > 0 && password === confirm;
  const ready = checks.every((rule) => rule.ok) && matched;
  const score = checks.filter((rule) => rule.ok).length;

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await post({ step: "send", email });
      if (!result.ok || !result.code) {
        setError(result.error ?? "Não enviou. Tente de novo.");
        return;
      }
      setCode(result.code);
      setDigits(Array(6).fill(""));
      setWait(30);
      setStep(2);
    } catch {
      setError("Não enviou. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (busy || value.length !== 6) return;
    setBusy(true);
    setError("");
    try {
      const result = await post({ step: "verify", email, code: value });
      if (!result.ok || !result.proof) {
        setError(result.error ?? "Código incorreto.");
        setDigits(Array(6).fill(""));
        return;
      }
      setProof(result.proof);
      setStep(3);
    } catch {
      setError("Código incorreto.");
    } finally {
      setBusy(false);
    }
  };

  const fill = () => {
    const next = code.split("");
    setDigits(next);
    void verify(code);
  };

  const reset = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    setError("");
    try {
      const result = await post({ step: "reset", proof, password });
      if (!result.ok) {
        setError(result.error ?? "Não atualizou. Tente de novo.");
        return;
      }
      setStep("done");
    } catch {
      setError("Não atualizou. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    setError("");
    if (step === 1 || step === "done") onBack();
    else if (step === 2) setStep(1);
    else setStep(2);
  };

  if (step === "done") {
    return (
      <main className="relative min-h-dvh bg-bg text-fg">
        <div className="page-shell mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center text-center">
          <div className="grid size-16 place-items-center rounded-full bg-accent text-accent-fg">
            <Check className="size-8" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Senha atualizada</h1>
          <p className="mt-2 text-sm text-muted">Entre com a senha nova.</p>
          <Button type="button" className="mt-8 h-12 w-full" onClick={onBack}>
            Voltar para entrar
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh bg-bg text-fg">
      <div className="page-shell mx-auto flex min-h-dvh w-full max-w-sm flex-col pt-8">
        <div className="mb-8 flex items-center gap-3">
          <button type="button" className="grid size-9 place-items-center rounded-full text-muted hover:text-fg" aria-label="Voltar" onClick={back}>
            <ChevronLeft className="size-5" />
          </button>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
          <span className="text-xs text-subtle">{step} de 3</span>
        </div>

        {step === 1 ? (
          <form className="flex flex-col" onSubmit={send}>
            <Lock className="size-7 text-accent" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Esqueceu a senha?</h1>
            <p className="mt-2 text-sm text-muted">Informe o e-mail. O código aparece aqui.</p>
            <div className="relative mt-6">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="pl-10"
                placeholder="E-mail"
                required
              />
            </div>
            {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
            <Button type="submit" disabled={busy} className="mt-4 h-12 w-full">
              {busy ? "Enviando…" : "Enviar código"}
            </Button>
            <button type="button" className="mt-4 text-sm text-muted" onClick={onBack}>
              Lembrou? <span className="font-medium text-accent">Entrar</span>
            </button>
          </form>
        ) : null}

        {step === 2 ? (
          <div>
            {code ? (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
                <Mail className="size-4 shrink-0 text-accent" />
                <p className="min-w-0 flex-1 text-sm">
                  Código <span className="font-semibold tracking-widest">{code}</span>
                </p>
                <button type="button" className="text-sm font-medium text-accent" onClick={fill}>
                  Preencher
                </button>
              </div>
            ) : null}
            <h1 className="text-2xl font-semibold tracking-tight">Confira o código</h1>
            <p className="mt-2 text-sm text-muted">6 dígitos de {email}.</p>
            <div className="mt-6">
              <CodeBoxes
                digits={digits}
                error={Boolean(error)}
                autoFocus
                onDigits={(next) => {
                  setDigits(next);
                  const filled = next.join("");
                  if (filled.length === 6 && !next.includes("")) void verify(filled);
                }}
              />
            </div>
            {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
            {busy ? <p className="mt-3 text-xs text-subtle">Conferindo…</p> : null}
            <p className="mt-6 text-sm text-muted">
              Não chegou?{" "}
              {wait > 0 ? (
                <span>Reenviar em 0:{String(wait).padStart(2, "0")}</span>
              ) : (
                <button type="button" className="font-medium text-accent" onClick={() => void send()}>
                  Reenviar
                </button>
              )}
            </p>
          </div>
        ) : null}

        {step === 3 ? (
          <form onSubmit={reset}>
            <KeyRound className="size-7 text-accent" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Nova senha</h1>
            <p className="mt-2 text-sm text-muted">Escolha uma senha nova.</p>
            <div className="relative mt-6">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
              <Input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="px-10"
                placeholder="Nova senha"
                required
              />
              <button type="button" className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center text-subtle" aria-label={show ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShow((value) => !value)}>
                {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn("h-full transition-[width]", score < 3 ? "bg-danger" : "bg-accent")}
                style={{ width: `${(score / RULES.length) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-subtle">{score === 4 ? "Forte" : score === 0 ? "" : "Ainda fraca"}</p>
            <div className="relative mt-3">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
              <Input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                maxLength={128}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="pl-10"
                placeholder="Confirmar senha"
                required
              />
            </div>
            <ul className="mt-4 flex flex-col gap-1.5 text-xs">
              {checks.map((rule) => (
                <li key={rule.key} className={cn("flex items-center gap-2", rule.ok ? "text-accent" : "text-subtle")}>
                  <Check className="size-3.5" />
                  {rule.label}
                </li>
              ))}
              <li className={cn("flex items-center gap-2", matched ? "text-accent" : "text-subtle")}>
                <Check className="size-3.5" />
                As senhas conferem
              </li>
            </ul>
            {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
            <Button type="submit" disabled={!ready || busy} className="mt-4 h-12 w-full">
              {busy ? "Atualizando…" : "Atualizar senha"}
            </Button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
