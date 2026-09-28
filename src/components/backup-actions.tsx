import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { exportMyData, importTasks } from "@/lib/tasks";
import { publishTasksChanged } from "@/lib/tab-sync";

export function BackupActions({ onImported }: { onImported?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const download = async () => {
    setBusy(true);
    setStatus("");
    try {
      const payload = await exportMyData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tarefas.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setStatus("Arquivo baixado.");
    } catch {
      setStatus("Não exportou. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setStatus("");
    try {
      if (file.size > 200_000) {
        setStatus("Arquivo grande demais.");
        return;
      }
      const parsed = JSON.parse(await file.text()) as { version?: unknown };
      if (parsed && typeof parsed === "object" && "version" in parsed && parsed.version !== 1 && parsed.version !== undefined) {
        setStatus("Este arquivo é de uma versão que o app não lê.");
        return;
      }
      const result = await importTasks({ data: parsed });
      publishTasksChanged();
      onImported?.();
      setStatus(
        result.imported === 0
          ? "Nada novo para importar."
          : result.imported === 1
            ? "1 tarefa importada."
            : `${result.imported} tarefas importadas.`,
      );
    } catch {
      setStatus("Não importou. Use o arquivo exportado por este app.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3">
        <Button variant="ghost" className="w-full border border-border" disabled={busy} onClick={() => void download()}>
          Exportar tarefas
        </Button>
        <Button variant="ghost" className="w-full border border-border" disabled={busy} onClick={() => input.current?.click()}>
          Importar tarefas
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        tabIndex={-1}
        aria-label="Arquivo de tarefas para importar"
        className="sr-only"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
      <p className="mt-3 text-center text-xs text-subtle">A importação soma. Não apaga o que já está na lista.</p>
      {status ? (
        <p className="mt-2 text-center text-xs text-muted" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
