import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/field-error";
import { Input } from "@/components/ui/input";
import { nameProblem } from "@/lib/form";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { getPrefs, updatePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/perfil")({ component: Perfil });

function Perfil() {
  const user = useCurrentUser();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState("");
  const [nameError, setNameError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getPrefs()
      .then((p) => setName(p.displayName || user?.displayName || ""))
      .catch(() => setName(user?.displayName || ""));
  }, [user?.displayName]);

  const initial = (name || user?.primaryEmail || "D").trim().charAt(0).toUpperCase();

  const save = async () => {
    const problem = nameProblem(name);
    setNameError(problem);
    if (problem) {
      setSaved("");
      return;
    }
    setBusy(true);
    setSaved("");
    try {
      const next = await updatePrefs({ data: { displayName: name } });
      setName(next.displayName);
      setSaved("Nome atualizado.");
    } catch {
      setSaved("Não salvou. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen title="Perfil">
      <div className="mb-8 flex flex-col items-center gap-3">
        {user?.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt=""
            width={80}
            height={80}
            decoding="async"
            className="size-20 rounded-full object-cover outline outline-1 -outline-offset-1 outline-fg/10"
          />
        ) : (
          <span className="grid size-20 place-items-center rounded-full bg-surface-2 text-2xl font-semibold text-fg">
            {initial}
          </span>
        )}
        <p className="text-sm text-muted">{user?.primaryEmail ?? "Sua conta"}</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <SettingGroup>
          <div className="px-4 py-3">
            <label className="text-xs text-subtle" htmlFor="perfil-nome">
              Nome
            </label>
            <Input
              id="perfil-nome"
              value={name}
              maxLength={40}
              enterKeyHint="done"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "perfil-nome-error" : undefined}
              onChange={(e) => {
                setName(e.target.value.slice(0, 40));
                if (nameError) setNameError("");
              }}
              placeholder="Seu nome"
              autoComplete="nickname"
              className="mt-2"
            />
            <FieldError id="perfil-nome-error">{nameError}</FieldError>
          </div>
          <SettingRow title="E-mail">
            <span className="max-w-[45%] truncate text-xs text-muted">{user?.primaryEmail ?? "—"}</span>
          </SettingRow>
        </SettingGroup>

        <Button type="submit" className="mt-6 w-full" disabled={busy}>
          {busy ? "Salvando…" : "Salvar"}
        </Button>
      </form>
      {saved ? <p className="mt-3 text-center text-xs text-muted">{saved}</p> : null}
    </AuthScreen>
  );
}
