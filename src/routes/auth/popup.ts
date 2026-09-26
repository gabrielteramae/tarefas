import { createFileRoute } from "@tanstack/react-router";
import { handleAuthPopupRequest } from "@/lib/auth/popup.server";

/** Backend entry for the Google link. A document GET redirects to Google. */
export const Route = createFileRoute("/auth/popup")({
  server: {
    handlers: {
      GET: async ({ request }) => handleAuthPopupRequest(request),
    },
  },
});
