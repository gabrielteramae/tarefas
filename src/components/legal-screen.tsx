import type { ReactNode } from "react";
import { BackButton } from "@/components/back-button";

export function LegalScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div className="page-shell mx-auto w-full max-w-lg">
        <header className="mb-8 flex items-center gap-2">
          <BackButton className="grid size-11 place-items-center rounded-lg text-muted tap-target hover:bg-surface-2 hover:text-fg" />
          <h1 className="min-w-0 flex-1 text-xl font-semibold tracking-tight">{title}</h1>
        </header>
        {children}
        <p className="mt-10 text-center text-[11px] leading-relaxed text-subtle">
          © 2026 Gabriel Teramae Chan. Todos os direitos reservados.
        </p>
      </div>
    </main>
  );
}
