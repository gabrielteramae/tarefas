import { useLayoutEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { OAUTH_ESCAPE_KEY, trappedOAuthTarget } from "@/lib/auth/trapped-oauth";

export function NotFound() {
  const target = typeof window === "undefined" ? null : trappedOAuthTarget(window.location.href);
  const [stuck, setStuck] = useState(false);

  useLayoutEffect(() => {
    if (!target) return;
    try {
      if (sessionStorage.getItem(OAUTH_ESCAPE_KEY) === target) {
        setStuck(true);
        return;
      }
      sessionStorage.setItem(OAUTH_ESCAPE_KEY, target);
    } catch {
      /* storage blocked — the link below still works */
      setStuck(true);
      return;
    }
    window.location.replace(target);
  }, [target]);

  if (target) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center text-fg">
        <a href={target} className="text-sm font-medium text-accent">
          {stuck ? "Continuar para o Google" : "Abrindo o Google…"}
        </a>
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center text-fg">
      <div>
        <p className="text-sm text-muted">Essa página não existe.</p>
        <Link to="/" className="mt-3 inline-block text-sm font-medium text-accent">
          Voltar
        </Link>
      </div>
    </main>
  );
}
