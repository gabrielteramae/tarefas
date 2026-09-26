import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { CookieConsent } from "@/components/cookie-consent";
import { Toaster } from "@/components/ui/toaster";
import { readSavedConsent } from "@/lib/consent";
import { getPrefs } from "@/lib/prefs";
import { applyTheme, readStoredTheme } from "@/lib/theme";
import { keepSignedIn } from "@/lib/auth/client";
import { peekOAuthAttempt, pullOAuthAttempt } from "@/lib/auth/oauth-attempt";
import { NotFound } from "@/components/not-found";
import { OpenSplash } from "@/components/app-mark";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "format-detection", content: "telephone=no" },
      { title: APP_NAME },
      { name: "theme-color", content: "#09090b" },
      {
        name: "description",
        content: APP_DESCRIPTION,
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: Root,
});

function ThirdPartyFonts() {
  useEffect(() => {
    const id = "third-party-font";
    const sync = () => {
      const allow = readSavedConsent()?.thirdParty === true;
      const current = document.getElementById(id);
      if (!allow) {
        current?.remove();
        return;
      }
      if (current) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    };
    sync();
    window.addEventListener("cookie-consent", sync);
    return () => window.removeEventListener("cookie-consent", sync);
  }, []);
  return null;
}

function ViewportFrame() {
  useEffect(() => {
    const apply = () => {
      const view = window.visualViewport;
      const height = Math.round(view?.height ?? window.innerHeight);
      document.documentElement.style.setProperty("--app-h", `${height}px`);
    };
    apply();
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);
  return null;
}

function ThemeSync() {
  useEffect(() => {
    applyTheme(readStoredTheme());
    void getPrefs()
      .then((prefs) => applyTheme(prefs.theme))
      .catch(() => undefined);
  }, []);
  return null;
}

function OAuthResume() {
  useEffect(() => {
    let gone = false;
    let polling = false;
    const takeToken = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        if (!token) return false;
        keepSignedIn(token);
        params.delete("token");
        const q = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : "") + window.location.hash);
        window.location.replace("/");
        return true;
      } catch {
        return false;
      }
    };
    const poll = () => {
      if (gone || polling || takeToken() || !peekOAuthAttempt()) return;
      polling = true;
      void pullOAuthAttempt()
        .then((result) => {
          if (gone || result.status !== "ok") return;
          keepSignedIn(result.token);
          window.location.replace("/");
        })
        .finally(() => {
          polling = false;
        });
    };
    const timer = window.setInterval(poll, 250);
    poll();
    window.addEventListener("pageshow", poll);
    window.addEventListener("focus", poll);
    document.addEventListener("visibilitychange", poll);
    return () => {
      gone = true;
      window.clearInterval(timer);
      window.removeEventListener("pageshow", poll);
      window.removeEventListener("focus", poll);
      document.removeEventListener("visibilitychange", poll);
    };
  }, []);
  return null;
}

function Root() {
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){document.documentElement.dataset.splash="on"})();(function(){var broker="https://auth.grok.me";function target(href){try{var url=new URL(href,location.origin);if(url.origin!==location.origin)return null;var path=url.pathname.replace(/\\/+$/,"")||"/";if(path==="/sign-in"||path==="/api/auth/oauth2/authorize")return broker+path+url.search;if(path==="/auth/popup")return url.href;return null}catch(e){return null}}function leave(href){var next=target(href);if(!next)return false;if(next===location.href){try{if(sessionStorage.getItem("grok-auth.popup-reload")===next)return false;sessionStorage.setItem("grok-auth.popup-reload",next)}catch(e){}location.replace(next);return true}location.replace(next);return true}if(leave(location.href))return;var push=history.pushState,replace=history.replaceState;history.pushState=function(s,t,url){if(url&&leave(String(url)))return;return push.apply(this,arguments)};history.replaceState=function(s,t,url){if(url&&leave(String(url)))return;return replace.apply(this,arguments)};window.addEventListener("popstate",function(){leave(location.href)})})();(function(){try{var p=new URLSearchParams(location.search);var t=p.get("token");if(t){try{localStorage.setItem("grok-auth.bearer-token",t)}catch(e){}p.delete("token");var q=p.toString();history.replaceState(null,"",location.pathname+(q?"?"+q:"")+location.hash)}var a=p.get("attempt");if(a&&/^[0-9a-f]{32}$/.test(a)){try{localStorage.setItem("grok-auth.oauth-attempt",a)}catch(e){}fetch("/api/auth/oauth-claim?attempt="+encodeURIComponent(a),{method:"POST",credentials:"same-origin",cache:"no-store",keepalive:true})}}catch(e){}})();(function(){try{document.documentElement.setAttribute("data-theme",localStorage.getItem("dino-theme")==="light"?"light":"dark")}catch(e){document.documentElement.setAttribute("data-theme","dark")}})()',
          }}
        />
        <HeadContent />
      </head>
      <body>
        <ThemeSync />
        <ViewportFrame />
        <OAuthResume />
        <ThirdPartyFonts />
        <PreviewHostBridge />
        <AuthProvider>
          <div className="app-enter">
            <Outlet />
          </div>
        </AuthProvider>
        <OpenSplash />
        <CookieConsent />
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
