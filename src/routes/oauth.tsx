import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { listLinkedAccounts, type LinkedAccount } from "@/lib/oauth-accounts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/oauth")({ component: OAuth });

const GOOGLE = GROK_PROVIDERS.find((provider) => provider.idp === "google");

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.04h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.31 2.99-7.43Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.34l-3.23-2.5c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.58A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.99A6 6 0 0 1 6.07 12c0-.69.12-1.36.32-1.99V7.43H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.57l3.34-2.58Z" />
      <path fill="#EA4335" d="M12 5.88c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.96 2.89 14.7 2 12 2 7.94 2 4.43 4.34 3.05 7.43l3.34 2.58C7.18 7.64 9.39 5.88 12 5.88Z" />
    </svg>
  );
}

function when(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function OAuth() {
  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listLinkedAccounts()
      .then(setAccounts)
      .catch(() => setError("Não consegui ver as contas ligadas."));
  }, []);

  const googleLinked = accounts?.some(
    (account) => account.providerId === "grok-google" || account.providerId === "google",
  );

  const connectGoogle = () => {
    if (!GOOGLE || busy) return;
    setBusy(true);
    void signIn(GOOGLE.providerId, { callbackURL: "/oauth" }).catch(() => {
      setBusy(false);
      setError("O Google não entrou. Tente de novo.");
    });
  };

  return (
    <AuthScreen title="Contas">
      <SettingGroup>
        {accounts && accounts.length === 0 ? (
          <SettingRow title="Nenhuma conta ligada" />
        ) : (
          accounts?.map((account) => (
            <SettingRow
              key={account.providerId}
              title={account.label}
            >
              <span className="text-xs text-subtle">{when(account.createdAt)}</span>
            </SettingRow>
          ))
        )}
      </SettingGroup>

      {GOOGLE && accounts && !googleLinked ? (
        <button
          type="button"
          onClick={connectGoogle}
          disabled={busy}
          className={cn(
            "mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm text-fg",
            "transition-transform duration-150 ease-out hover:bg-surface-2 active:scale-[0.96]",
            "disabled:opacity-50",
          )}
        >
          <GoogleMark />
          {busy ? "Abrindo o Google…" : "Continuar com Google"}
        </button>
      ) : null}

      <p className="mt-4 text-xs text-subtle">
        Outro e-mail do Google é outra lista. A senha do Google não fica aqui.
      </p>
      {error ? <p className="mt-3 text-center text-xs text-danger">{error}</p> : null}
    </AuthScreen>
  );
}
