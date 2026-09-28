import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { MfaSetting } from "@/components/mfa-setting";
import { Switch } from "@/components/ui/switch";
import { getPrefs, updatePrefs, type UserPrefs } from "@/lib/prefs";
import { applyTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/configuracoes")({ component: Configuracoes });

function Configuracoes() {
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);

  useEffect(() => {
    void getPrefs()
      .then(setPrefs)
      .catch(() => undefined);
  }, []);

  const patch = async (partial: Partial<UserPrefs>) => {
    if (!prefs) return;
    const optimistic = { ...prefs, ...partial };
    setPrefs(optimistic);
    if (partial.theme) applyTheme(partial.theme);
    try {
      const saved = await updatePrefs({ data: partial });
      setPrefs(saved);
      applyTheme(saved.theme);
    } catch {
      setPrefs(prefs);
      applyTheme(prefs.theme);
    }
  };

  const theme = prefs?.theme ?? "system";

  return (
    <AuthScreen title="Configurações">
      <SettingGroup>
        <SettingRow title="Aparência">
          <div className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1" role="group" aria-label="Aparência">
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
                onClick={() => void patch({ theme: value })}
                className={cn(
                  "min-h-11 rounded-full px-2 text-xs font-medium",
                  theme === value ? "bg-accent text-accent-fg" : "text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow title="Confirmar ao apagar">
          <Switch
            label="Confirmar ao apagar"
            checked={prefs?.confirmDelete ?? false}
            onCheckedChange={(v) => void patch({ confirmDelete: v })}
          />
        </SettingRow>
      </SettingGroup>
      <div className="mt-6">
        <MfaSetting />
      </div>
    </AuthScreen>
  );
}
