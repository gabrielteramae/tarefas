import { createFileRoute } from "@tanstack/react-router";
import { applyNewPassword, sendResetCode, verifyResetCode } from "@/lib/auth/password-reset.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/password-reset")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { step?: string; email?: string; code?: string; proof?: string; password?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return json({ ok: false, error: "Não foi possível continuar." }, 400);
        }
        if (body.step === "send") return json(await sendResetCode(String(body.email ?? "")));
        if (body.step === "verify") return json(await verifyResetCode(String(body.email ?? ""), String(body.code ?? "")));
        if (body.step === "reset") return json(await applyNewPassword(String(body.proof ?? ""), String(body.password ?? "")));
        return json({ ok: false, error: "Não foi possível continuar." }, 400);
      },
    },
  },
});
