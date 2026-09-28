import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Database,
  FileText,
  Link2,
  Lock,
  LogOut,
  Palette,
  Search,
  Shield,
  Trash2,
} from "lucide-react";
import { authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { getPrefs, updatePrefs } from "@/lib/prefs";
import { applyTheme, readStoredTheme, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const subscribe = () => () => {};

function hit(query: string, label: string) {
  return query.length === 0 || label.toLowerCase().includes(query);
}

function Group({ title, show, children }: { title: string; show: boolean; children: ReactNode }) {
  if (!show) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-sm text-muted">{title}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl bg-surface">{children}</div>
    </section>
  );
}

function RowLink({
  to,
  icon: Icon,
  label,
  hint,
}: {
  to: "/perfil" | "/notificacoes" | "/dados" | "/oauth" | "/configuracoes" | "/ajuda" | "/termos" | "/privacidade";
  icon: LucideIcon;
  label: string;
  hint?: string;
}) {
  return (
    <Link to={to} className="flex min-h-14 items-center gap-3 px-4 text-fg tap-target">
      <Icon className="size-5 shrink-0 text-accent" strokeWidth={1.8} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{label}</span>
        {hint ? <span className="block truncate text-xs text-subtle">{hint}</span> : null}
      </span>
      <ChevronRight className="size-4 shrink-0 text-subtle" />
    </Link>
  );
}

export function MoreHub() {
  const user = useCurrentUser();
  const gateSession = useSyncExternalStore(subscribe, hasGateSessionMarker, () => false);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setTheme(readStoredTheme());
    void getPrefs()
      .then((prefs) => {
        setTheme(prefs.theme);
        setConfirmDelete(prefs.confirmDelete);
      })
      .catch(() => undefined);
  }, []);

  const q = query.trim().toLowerCase();
  const name = user?.displayName?.trim() || "Sua conta";
  const email = user?.primaryEmail || "";
  const initial = (name || email || "T").charAt(0).toUpperCase();

  const showProfile = hit(q, `${name} ${email} perfil conta`);
  const showTheme = hit(q, "aparência tema escuro claro");
  const showNotify = hit(q, "notificações avisos");
  const showConfirm = hit(q, "confirmar ao apagar");
  const showData = hit(q, "dados salvos");
  const showAccounts = hit(q, "contas ligadas google");
  const showSecurity = hit(q, "segurança verificação configurações");
  const showHelp = hit(q, "ajuda");
  const showTerms = hit(q, "termos");
  const showPrivacy = hit(q, "privacidade");
  const showLeave = authEnabled && !gateSession && hit(q, "sair");
  const any =
    showProfile ||
    showTheme ||
    showNotify ||
    showConfirm ||
    showData ||
    showAccounts ||
    showSecurity ||
    showHelp ||
    showTerms ||
    showPrivacy ||
    showLeave;

  const setMode = (next: ThemeMode) => {
    const prev = theme;
    setTheme(next);
    applyTheme(next);
    void updatePrefs({ data: { theme: next } }).catch(() => {
      setTheme(prev);
      applyTheme(prev);
    });
  };

  const setConfirm = (next: boolean) => {
    const prev = confirmDelete;
    setConfirmDelete(next);
    void updatePrefs({ data: { confirmDelete: next } }).catch(() => setConfirmDelete(prev));
  };

  return (
    <div className="tab-pane pb-28">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar ajustes"
          aria-label="Buscar ajustes"
          className="pl-10"
        />
      </div>

      {showProfile ? (
        <Link to="/perfil" className="mt-5 flex min-h-16 items-center gap-3 rounded-2xl bg-surface px-4 py-3 tap-target">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="" className="size-11 rounded-full object-cover" />
          ) : (
            <span className="grid size-11 place-items-center rounded-full bg-surface-2 text-base font-semibold text-accent">
              {initial}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{name}</span>
            {email ? <span className="block truncate text-xs text-muted">{email}</span> : null}
          </span>
          <ChevronRight className="size-4 shrink-0 text-subtle" />
        </Link>
      ) : null}

      <Group title="Aplicativo" show={showTheme || showNotify || showConfirm}>
        {showTheme ? (
          <div className="flex flex-col gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <Palette className="size-5 shrink-0 text-accent" strokeWidth={1.8} aria-hidden="true" />
              <span className="min-w-0 flex-1 text-sm">Aparência</span>
            </div>
            <div className="grid grid-cols-3 rounded-full bg-surface-2 p-1" role="group" aria-label="Aparência">
              {(
                [
                  ["system", "Auto"],
                  ["dark", "Escuro"],
                  ["light", "Claro"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={theme === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    "min-h-11 rounded-full px-2 text-xs font-medium tap-target",
                    theme === value ? "bg-accent text-accent-fg" : "text-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {showNotify ? <RowLink to="/notificacoes" icon={Bell} label="Notificações" hint="Hoje, atraso e concluídas" /> : null}
        {showConfirm ? (
          <div className="flex min-h-14 items-center gap-3 px-4">
            <Trash2 className="size-5 shrink-0 text-accent" strokeWidth={1.8} />
            <span className="min-w-0 flex-1 text-sm">Confirmar ao apagar</span>
            <Switch label="Confirmar ao apagar" checked={confirmDelete} onCheckedChange={setConfirm} />
          </div>
        ) : null}
      </Group>

      <Group title="Conta" show={showData || showAccounts || showSecurity}>
        {showData ? <RowLink to="/dados" icon={Database} label="Dados salvos" /> : null}
        {showAccounts ? <RowLink to="/oauth" icon={Link2} label="Contas ligadas" /> : null}
        {showSecurity ? <RowLink to="/configuracoes" icon={Shield} label="Segurança" hint="Verificação em duas etapas" /> : null}
      </Group>

      <Group title="Sobre" show={showHelp || showTerms || showPrivacy}>
        {showHelp ? <RowLink to="/ajuda" icon={CircleHelp} label="Ajuda" /> : null}
        {showTerms ? <RowLink to="/termos" icon={FileText} label="Termos" /> : null}
        {showPrivacy ? <RowLink to="/privacidade" icon={Lock} label="Privacidade" /> : null}
      </Group>

      {showLeave ? (
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut("/login").catch(() => setSigningOut(false));
          }}
          className="mt-6 flex min-h-14 w-full items-center gap-3 rounded-2xl bg-surface px-4 text-sm text-danger tap-target disabled:opacity-50"
        >
          <LogOut className="size-5" strokeWidth={1.8} />
          {signingOut ? "Saindo…" : "Sair"}
        </button>
      ) : null}

      {!any ? <p className="py-12 text-center text-sm text-muted">Nada com esse nome.</p> : null}
    </div>
  );
}
