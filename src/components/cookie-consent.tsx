import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import {
  CONSENT_OFF,
  CONSENT_ON,
  consentLabel,
  readSavedConsent,
  saveConsent,
  type Consent,
} from "@/lib/consent";

export { consentLabel, saveConsent };

let choice: Consent | null | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("cookie-consent"));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  return choice;
}

export function useConsentChoice() {
  return useSyncExternalStore(subscribe, snapshot, () => undefined);
}

export function reopenConsent() {
  choice = null;
  emit();
}

export function commitConsent(value: Consent) {
  saveConsent(value);
  choice = value;
  emit();
}

function publish(value: Consent) {
  commitConsent(value);
}

const CATEGORIES: Array<{ key: keyof Consent; title: string; hint: string }> = [
  { key: "preferences", title: "Preferências", hint: "Tema claro ou escuro neste aparelho." },
  { key: "analytics", title: "Análise", hint: "Não usamos hoje." },
  { key: "marketing", title: "Marketing", hint: "Não usamos hoje." },
  { key: "thirdParty", title: "Terceiros", hint: "Fonte do Google. O login fica no site deles." },
];

export function ConsentSwitches({
  value,
  onChange,
}: {
  value: Consent;
  onChange: (next: Consent) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-fg">Necessários</p>
          <p className="text-xs text-subtle">Login. Sempre ligados.</p>
        </div>
        <Switch label="Necessários" checked disabled onCheckedChange={() => undefined} />
      </div>
      {CATEGORIES.map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-fg">{item.title}</p>
            <p className="text-xs text-subtle">{item.hint}</p>
          </div>
          <Switch
            label={item.title}
            checked={value[item.key]}
            onCheckedChange={(checked) => onChange({ ...value, [item.key]: checked })}
          />
        </div>
      ))}
    </div>
  );
}

export function CookieConsent() {
  const current = useSyncExternalStore(subscribe, snapshot, () => undefined);
  const [draft, setDraft] = useState<Consent>(CONSENT_OFF);
  const [details, setDetails] = useState(false);
  const [aboveDock, setAboveDock] = useState(false);

  useEffect(() => {
    setAboveDock(window.location.pathname === "/");
    if (choice !== undefined) return;
    const stored = readSavedConsent();
    choice = stored;
    if (stored) saveConsent(stored);
    emit();
  }, []);

  if (current !== null) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      className={
        aboveDock
          ? "cookie-banner fixed inset-x-3 z-50 mx-auto max-w-lg rounded-2xl border border-border bg-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] bottom-[calc(5.75rem+env(safe-area-inset-bottom))]"
          : "cookie-banner fixed inset-x-3 z-50 mx-auto max-w-lg rounded-2xl border border-border bg-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] bottom-[max(0.75rem,env(safe-area-inset-bottom))]"
      }
    >
      <p id="cookie-banner-title" className="text-sm font-medium text-fg">
        Cookies
      </p>
      <p className="mt-1 text-sm text-muted">
        O login fica neste aparelho.{" "}
        <Link to="/termos" hash="privacidade" className="font-medium text-accent hover:underline">
          Privacidade
        </Link>
      </p>
      {details ? (
        <div className="mt-3">
          <ConsentSwitches value={draft} onChange={setDraft} />
        </div>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => publish(CONSENT_OFF)}
          className="h-10 flex-1 rounded-lg border border-border text-sm text-fg"
        >
          Necessários
        </button>
        {details ? (
          <button
            type="button"
            onClick={() => publish(draft)}
            className="h-10 flex-1 rounded-lg border border-border text-sm text-fg"
          >
            Salvar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setDetails(true)}
            className="h-10 flex-1 rounded-lg border border-border text-sm text-fg"
          >
            Ajustar
          </button>
        )}
        <button
          type="button"
          onClick={() => publish(CONSENT_ON)}
          className="h-10 flex-1 rounded-lg bg-accent text-sm font-medium text-accent-fg"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
