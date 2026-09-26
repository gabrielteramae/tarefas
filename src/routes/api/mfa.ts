import { createFileRoute } from "@tanstack/react-router";
import { confirmMfa, currentMfa, disableMfa, mfaStatus, startMfa, verifyMfa } from "@/lib/auth/mfa.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/mfa")({
  server: {
    handlers: {
      GET: async () => {
        const auth = await currentMfa();
        if (!auth) return json({ enabled: false, verified: true });
        return json(await mfaStatus(auth.id, auth.token));
      },
      POST: async ({ request }) => {
        const auth = await currentMfa();
        if (!auth) return json({ ok: false, error: "Entre de novo." }, 401);
        let body: { step?: string; code?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return json({ ok: false, error: "Não deu." }, 400);
        }
        const code = String(body.code ?? "");
        if (body.step === "start") return json(await startMfa(auth.id, auth.email));
        if (body.step === "confirm") return json(await confirmMfa(auth.id, auth.token, code));
        if (body.step === "disable") return json(await disableMfa(auth.id, code));
        if (body.step === "verify") return json(await verifyMfa(auth.id, auth.token, code));
        return json({ ok: false, error: "Não deu." }, 400);
      },
    },
  },
});
