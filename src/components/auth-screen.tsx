import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthScreen({ title, children }: { title: string; children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return null;
  if (!user) return <RedirectToSignIn />;

  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div className="page-shell mx-auto w-full max-w-lg">
        <header className="mb-7 grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
          <Link
            to="/"
            aria-label="Voltar"
            className="grid size-11 place-items-center rounded-full bg-surface text-fg tap-target"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="truncate text-center text-lg font-semibold tracking-tight">{title}</h1>
          <span />
        </header>
        {children}
      </div>
    </main>
  );
}

export function SettingRow({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg">{title}</p>
        {hint ? <p className="mt-0.5 text-xs text-subtle">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function SettingGroup({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border overflow-hidden rounded-2xl bg-surface">{children}</div>;
}
