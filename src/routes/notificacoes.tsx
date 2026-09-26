import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { Switch } from "@/components/ui/switch";
import { notificationsSupported } from "@/lib/notify";
import { getPrefs, updatePrefs, type UserPrefs } from "@/lib/prefs";

export const Route = createFileRoute("/notificacoes")({ component: Notificacoes });

function Notificacoes() {
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    void getPrefs()
      .then(setPrefs)
      .catch(() => undefined);
  }, []);

  const patch = async (partial: Partial<UserPrefs>) => {
    if (!prefs) return;
    const next = { ...prefs, ...partial };
    if ((next.notifyToday || next.notifyLate || next.notifyDone) && notificationsSupported() && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") setNote("O navegador bloqueou o aviso. O filtro fica salvo mesmo assim.");
    }
    const prev = prefs;
    setPrefs(next);
    try {
      setPrefs(await updatePrefs({ data: partial }));
    } catch {
      setPrefs(prev);
    }
  };

  return (
    <AuthScreen title="Notificações">
      <SettingGroup>
        <SettingRow title="Hoje" hint="Avisa o que vence hoje.">
          <Switch
            label="Hoje"
            checked={prefs?.notifyToday ?? false}
            onCheckedChange={(value) => void patch({ notifyToday: value })}
          />
        </SettingRow>
        <SettingRow title="Atrasadas" hint="Avisa o que passou do dia.">
          <Switch
            label="Atrasadas"
            checked={prefs?.notifyLate ?? false}
            onCheckedChange={(value) => void patch({ notifyLate: value })}
          />
        </SettingRow>
        <SettingRow title="Ao concluir" hint="Avisa quando você marca como feita.">
          <Switch
            label="Ao concluir"
            checked={prefs?.notifyDone ?? false}
            onCheckedChange={(value) => void patch({ notifyDone: value })}
          />
        </SettingRow>
      </SettingGroup>
      {note ? <p className="mt-3 text-xs text-muted">{note}</p> : null}
    </AuthScreen>
  );
}
