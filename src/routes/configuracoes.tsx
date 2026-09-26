import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { MfaSetting } from "@/components/mfa-setting";
import { Switch } from "@/components/ui/switch";
import { getPrefs, updatePrefs, type UserPrefs } from "@/lib/prefs";
import { applyTheme, type ThemeMode } from "@/lib/theme";
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

  const theme = prefs?.theme ?? "dark";

  return (
    <AuthScreen title="Configurações">
      <SettingGroup>
        <SettingRow title="Aparência">
          <div className="relative grid w-[148px] grid-cols-2 rounded-full border border-border bg-surface-2 p-0.5">
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-accent",
                "transition-transform duration-300 ease-out motion-reduce:transition-none",
                theme === "light" && "translate-x-full",
              )}
            />
            {(
              [
                ["dark", "Escuro"],
                ["light", "Claro"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={theme === value}
                onClick={() => void patch({ theme: value satisfies ThemeMode })}
                className={cn(
                  "relative z-10 h-8 rounded-full text-xs font-medium transition-colors duration-300 ease-out",
                  theme === value ? "text-accent-fg" : "text-muted",
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
