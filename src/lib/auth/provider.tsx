import { useEffect, useState, type ReactNode } from "react";
import { getBearerToken } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { MfaPrompt } from "@/components/mfa-prompt";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [gate, setGate] = useState<"wait" | "need" | "ok">("ok");
  const [checked, setChecked] = useState("");

  useEffect(() => {
    if (isPending) return;
    const id = user?.id ?? "";
    if (!id) {
      setChecked("");
      setGate("ok");
      return;
    }
    let gone = false;
    setGate("wait");
    const token = getBearerToken();
    void fetch("/api/mfa", {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data: { enabled?: boolean; verified?: boolean }) => {
        if (gone) return;
        setChecked(id);
        setGate(data.enabled && !data.verified ? "need" : "ok");
      })
      .catch(() => {
        if (gone) return;
        setChecked(id);
        setGate("ok");
      });
    return () => {
      gone = true;
    };
  }, [user?.id, isPending]);

  if (user && (gate === "wait" || checked !== user.id)) return <main className="min-h-dvh bg-bg" />;
  if (gate === "need") return <MfaPrompt onOk={() => setGate("ok")} />;
  return <>{children}</>;
}
