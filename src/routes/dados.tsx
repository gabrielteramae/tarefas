import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { BackupActions } from "@/components/backup-actions";
import { Button } from "@/components/ui/button";
import { readPersistence, type PersistenceSnapshot } from "@/lib/persistence";

export const Route = createFileRoute("/dados")({ component: Dados });

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Dados() {
  const [snap, setSnap] = useState<PersistenceSnapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      setSnap(await readPersistence());
    } catch {
      setError("Não carregou. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const engine = snap?.engine === "postgres" ? "Na sua conta" : snap ? "Neste aparelho" : "…";

  return (
    <AuthScreen title="Dados salvos">
      <SettingGroup>
        <SettingRow title="Onde fica">
          <span className="text-xs text-muted">{engine}</span>
        </SettingRow>
        <SettingRow title="Tarefas">
          <span className="text-xs text-fg">{snap ? snap.tasks : "…"}</span>
        </SettingRow>
        <SettingRow title="Concluídas">
          <span className="text-xs text-fg">{snap ? snap.done : "…"}</span>
        </SettingRow>
        <SettingRow title="Com dia marcado">
          <span className="text-xs text-fg">{snap ? snap.scheduled : "…"}</span>
        </SettingRow>
        <SettingRow title="Última mudança">
          <span className="text-xs text-muted">{formatWhen(snap?.newestAt ?? null)}</span>
        </SettingRow>
      </SettingGroup>

      <h2 className="mt-8 mb-3 text-sm font-medium text-muted">Suas tarefas</h2>
      <ul className="flex flex-col gap-2">
        {snap && snap.rows.length === 0 ? (
          <li className="rounded-xl border border-border bg-surface px-4 py-6 text-sm text-muted">
            Nenhuma tarefa ainda.
          </li>
        ) : (
          snap?.rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-sm text-fg">{row.text}</p>
              <p className="mt-1 text-xs text-subtle">
                {row.done ? "Feita" : "Para fazer"}
                {row.dueAt ? ` · ${formatWhen(row.dueAt)}` : ""} · {formatWhen(row.createdAt)}
              </p>
            </li>
          ))
        )}
      </ul>

      <Button className="mt-6 w-full" disabled={busy} onClick={() => void load()}>
        {busy ? "Atualizando…" : "Atualizar"}
      </Button>
      <p className="mt-4 text-center text-xs text-subtle">
        A lista fica na sua conta, não neste navegador. Exportar guarda uma cópia.
      </p>
      <div className="mt-3">
        <BackupActions onImported={() => void load()} />
      </div>
      {error ? <p className="mt-3 text-center text-xs text-danger">{error}</p> : null}
    </AuthScreen>
  );
}
