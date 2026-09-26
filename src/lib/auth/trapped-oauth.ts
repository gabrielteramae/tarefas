import { GROK_ISSUER } from "./providers";

export const OAUTH_ESCAPE_KEY = "grok-auth.oauth-escape";

/**
 * The preview sometimes keeps a Google redirect inside this app and shows
 * "Not Found". These paths belong to the broker, or to the dev popup handler.
 */
export function trappedOAuthTarget(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/auth/popup") return href;
  if (path === "/sign-in" || path === "/api/auth/oauth2/authorize") {
    return `${GROK_ISSUER}${path}${url.search}`;
  }
  return null;
}
