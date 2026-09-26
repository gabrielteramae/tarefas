import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { runPreSignInSignOut, runSignOut } from "../../../scripts/sign-out-plan.mjs";
import { beginOAuthAttempt, callbackWithAttempt, clearOAuthAttempt } from "./oauth-attempt";
import { OAUTH_ESCAPE_KEY } from "./trapped-oauth";
import { GROK_PROVIDERS } from "./providers";

/**
 * Better Auth client for this React SPA (browser-side).
 *
 * Talks to this app's OWN Better Auth at same-origin `/api/auth/*`. In the live
 * preview the app is an embedded iframe with PARTITIONED cookies, so after a
 * popup sign-in it can't read the session cookie — it authenticates with a
 * bearer token instead (captured from the popup, see `signIn`). The `onRequest`
 * hook attaches that token when present; when deployed (cookie auth) no token
 * is stored, so nothing changes.
 *
 * To sign out call `signOut()` below, NOT `authClient.signOut()`: the raw call
 * leaves the bearer token in place, and `onRequest` keeps re-attaching it, so
 * the visitor stays signed in.
 */
export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
  fetchOptions: {
    onRequest(ctx) {
      const token = getBearerToken();
      if (token) ctx.headers.set("Authorization", `Bearer ${token}`);
      return ctx;
    },
  },
});

/**
 * True when sign-in UI should be shown — i.e. whenever `VITE_AUTH_ENABLED` is
 * not `"false"`. The shipped template sets it to `"false"`
 * (`.grok/app-env.json`), which selects the dev user (see `use-current-user`);
 * with the key removed, sign-in is real in preview (baked preview client) and
 * when deployed (injected per-app client).
 */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

/** The upstream providers to render sign-in buttons for. */
export { GROK_PROVIDERS };

// The embedded preview iframe has partitioned cookies, so we keep the session
// bearer in localStorage and attach it to every request. It survives leaving
// the app. Sign-out clears it. Deployed cookie auth does not need this token.
const BEARER_KEY = "grok-auth.bearer-token";

/** The stored session token, or null. */
export function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(BEARER_KEY);
    if (saved) return saved;
    const legacy = window.sessionStorage.getItem(BEARER_KEY);
    if (!legacy) return null;
    window.localStorage.setItem(BEARER_KEY, legacy);
    window.sessionStorage.removeItem(BEARER_KEY);
    return legacy;
  } catch {
    return null;
  }
}

function setBearerToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(BEARER_KEY, token);
    else window.localStorage.removeItem(BEARER_KEY);
    window.sessionStorage.removeItem(BEARER_KEY);
  } catch {
    /* storage unavailable — ignore */
  }
}

/** Keep this browser signed in after the app is closed. `null` forgets the session. */
export function keepSignedIn(token: string | null) {
  setBearerToken(token && token.length > 0 ? token : null);
}

/**
 * The sandbox live preview runs this app inside an iframe on a `*.grok-sandbox.com`
 * host, where a full-page redirect to the broker can't work — so sign-in uses a
 * popup there and a normal redirect everywhere else.
 */
function inLivePreview(): boolean {
  return (
    typeof window !== "undefined" &&
    window.location.hostname.endsWith(".grok-sandbox.com")
  );
}

function isPhone(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Popup only inside a desktop preview iframe. A phone popup loses the session on the way back from Google. */
function needsAuthPopup(): boolean {
  if (isPhone() || !inLivePreview()) return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function assignAuthUrl(url: string) {
  if (isPhone()) {
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = url;
        return;
      }
    } catch {
      /* the frame cannot leave; fall through to this window */
    }
  }
  window.location.href = url;
}

/** Message the popup posts back to the opener once sign-in completes. */
type PopupMessage = { source: "grok-auth-popup"; token: string | null; error?: string };

/**
 * Start sign-in with one upstream provider (`providerId` from `GROK_PROVIDERS`),
 * federating through the Grok auth broker.
 *
 * - **Live preview** (`*.grok-sandbox.com` iframe): opens a POPUP to
 *   `/auth/popup`, served by the template Vite plugin (see `vite.config.ts` +
 *   `popup.server.ts`) — 302s to the broker/upstream login (no app chrome) and,
 *   on return, posts the session bearer token back. We store it and refresh the
 *   session; no top-level navigation of the iframe to the broker.
 * - **Deployed** (and local non-iframe): a normal full-page redirect into the broker.
 *
 * Either way it clears any existing local session FIRST so switching providers
 * actually switches identity.
 */
export async function signIn(
  providerId: string,
  opts: { callbackURL?: string; errorCallbackURL?: string } = {},
): Promise<void> {
  const callbackURL = opts.callbackURL ?? "/";
  const errorCallbackURL = opts.errorCallbackURL ?? "/login?erro=google";

  // Open the popup SYNCHRONOUSLY on the user gesture — before any await
  // (including signOut). Awaiting first drops user-gesture privilege in some
  // browsers when the opener is a cross-origin live-preview iframe.
  const usePopup = needsAuthPopup();
  const popup = usePopup ? openSignInPopup(providerId) : null;
  try {
    sessionStorage.removeItem(OAUTH_ESCAPE_KEY);
  } catch {
    /* storage blocked */
  }
  // Phones open Google in another browser. Remember the attempt BEFORE any
  // await so a storage-blocked webview still has the id when it comes back.
  // Desktop popups must not take this path.
  const attempt = usePopup ? null : beginOAuthAttempt();

  // Clear any prior session so switching providers actually switches identity.
  // Bounded because the popup is already open — a request that never settles
  // would leave it hanging — but bounded PER ENVIRONMENT: only the server can
  // end a deployed session, so cutting it short at the preview's 1.5s would
  // start OAuth with the old session still live.
  await runPreSignInSignOut({
    livePreview: inLivePreview(),
    hasBearer: Boolean(getBearerToken()),
    requestSignOut: () => authClient.signOut(),
    clearToken: () => setBearerToken(null),
  });

  if (needsAuthPopup()) {
    if (!popup) throw new Error("Pop-up blocked — allow pop-ups for sign-in");
    const token = await waitForPopupToken(popup);
    if (!token) throw new Error("Sign-in was cancelled or failed");
    setBearerToken(token);
    // Refresh the client session store with the bearer attached (onRequest).
    // Avoid a full iframe reload when we're already on the destination — that
    // reload was the slow "still loading after the popup closed" feeling.
    try {
      await authClient.getSession();
    } catch {
      /* session store will recover on next useSession fetch */
    }
    if (typeof window !== "undefined") {
      const dest = new URL(callbackURL, window.location.origin);
      const here = window.location;
      if (dest.origin !== here.origin || dest.pathname !== here.pathname || dest.search !== here.search) {
        window.location.href = callbackURL;
      }
    }
    return;
  }

  // The cookie from the phone's other browser never reaches this screen, so
  // the callback stores the session under this attempt and the login page
  // claims it when that browser closes.
  const doneURL = attempt ? callbackWithAttempt(callbackURL, attempt) : callbackURL;
  const failURL = attempt ? callbackWithAttempt(errorCallbackURL, attempt) : errorCallbackURL;

  let leaving = false;
  try {
    const { data, error } = await authClient.signIn.oauth2({
      providerId,
      callbackURL: doneURL,
      errorCallbackURL: failURL,
    });
    if (error || !data?.url) {
      clearOAuthAttempt();
      throw new Error(error?.message ?? "Sign-in failed");
    }
    leaving = true;
    assignAuthUrl(data.url);
  } catch (err) {
    if (!leaving) clearOAuthAttempt();
    throw err;
  }
}

/**
 * Open `/auth/popup` in a new window. Must run synchronously inside the click
 * handler (no await before this). The path is served by the template Vite
 * plugin (`authPopupPlugin` in vite.config.ts) — NOT by a React route.
 *
 * Opens the real URL directly (not about:blank → assign). From a cross-origin
 * iframe the about:blank dance often fails on the first click and the window
 * ends up showing the app shell.
 */
function openSignInPopup(providerId: string): Window | null {
  const origin = window.location.origin;
  const url = `${origin}/auth/popup?providerId=${encodeURIComponent(providerId)}`;
  // Unique name per attempt so a prior attempt stuck on the SPA is not reused.
  const name = `grok-signin-${Date.now()}`;
  return window.open(url, name, "popup,width=500,height=650");
}

/**
 * Wait for the popup's completion page to postMessage the session bearer (or
 * for the user to dismiss the popup).
 */
function waitForPopupToken(popup: Window): Promise<string | null> {
  return new Promise((resolve) => {
    const origin = window.location.origin;
    let settled = false;
    let closeTimer: number | undefined;
    let sawOpen = false;
    const settle = (token: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(token);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const data = event.data as PopupMessage | undefined;
      if (!data || data.source !== "grok-auth-popup") return;
      if (data.token) setBearerToken(data.token);
      settle(data.token ?? null);
    };
    // Phones often report the Google window as closed while the person is still
    // signing in, and drop window.opener on the way back. Only treat a close as
    // cancel after the window was actually open, and accept a token saved by the
    // return page even if the message never arrives.
    const started = Date.now();
    const pollTimer = window.setInterval(() => {
      const saved = getBearerToken();
      if (saved) {
        settle(saved);
        return;
      }
      if (Date.now() - started > 180_000) {
        settle(null);
        return;
      }
      let closed = false;
      try {
        closed = popup.closed;
      } catch {
        closed = false;
      }
      if (!closed) {
        sawOpen = true;
        return;
      }
      if (!sawOpen || closeTimer !== undefined) return;
      closeTimer = window.setTimeout(() => settle(getBearerToken()), 90_000);
    }, 300);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== BEARER_KEY || !event.newValue) return;
      settle(event.newValue);
    };
    function cleanup() {
      window.clearInterval(pollTimer);
      if (closeTimer !== undefined) window.clearTimeout(closeTimer);
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
    }
    window.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
  });
}

/**
 * Sign out of THIS app's local session, clear the preview token, then redirect.
 *
 * Use this, never `authClient.signOut()` — see the note on `authClient`.
 * Sequencing lives in `scripts/sign-out-plan.mjs` so it can be unit-tested.
 *
 * **Rejects when deployed if the server never confirms.** There the session is
 * an HttpOnly cookie only the server can clear, so redirecting anyway would
 * report a sign-out that did not happen. `<UserButton />` handles that for you;
 * a hand-rolled control must catch it and let the visitor retry. In the live
 * preview the local clear is sufficient, so it always resolves.
 */
export async function signOut(redirectTo = "/"): Promise<void> {
  await runSignOut({
    livePreview: inLivePreview(),
    hasBearer: Boolean(getBearerToken()),
    // Better Auth resolves with `{ error }` instead of rejecting, so surface a
    // failed response as a rejection for the sequence to act on.
    requestSignOut: async () => {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message ?? "Sign-out failed");
    },
    clearToken: () => setBearerToken(null),
    redirect: () => {
      window.location.href = redirectTo;
    },
  });
}
