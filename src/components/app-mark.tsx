import { useLayoutEffect, useRef, useState } from "react";
import { APP_NAME } from "@/lib/brand";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

const OPENED = "tarefas-opened";
const LEAVE_MS = 380;

function seenThisSession() {
  try {
    return sessionStorage.getItem(OPENED) === "1";
  } catch {
    return false;
  }
}

function rememberOpen() {
  try {
    sessionStorage.setItem(OPENED, "1");
  } catch {
    /* ignore */
  }
}

function markSplash(phase: "on" | "out" | "off") {
  if (phase === "off") document.documentElement.removeAttribute("data-splash");
  else document.documentElement.dataset.splash = phase;
}

export function AppMark({ className, animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("mark text-accent", animate && "mark-alive", className)} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="currentColor" />
      <rect x="22.5" y="10" width="5.2" height="12" rx="2.6" fill="#09090b" />
      <rect x="36.3" y="10" width="5.2" height="12" rx="2.6" fill="#09090b" />
      <rect x="14.5" y="18" width="35" height="33" rx="7" fill="none" stroke="#09090b" strokeWidth="3.6" />
      <circle cx="25.6" cy="34.4" r="5.2" fill="#09090b" />
      <circle cx="27.5" cy="34.4" r="1.7" fill="currentColor" />
      <g className="eye-right">
        <circle cx="38.4" cy="34.4" r="5.2" fill="#09090b" />
        <circle cx="40.3" cy="34.4" r="1.7" fill="currentColor" />
      </g>
    </svg>
  );
}

export function OpenSplash() {
  const { isPending } = useCurrentUserState();
  const pending = useRef(isPending);
  pending.current = isPending;
  const [phase, setPhase] = useState<"on" | "out" | "off">("off");
  const left = useRef(false);

  useLayoutEffect(() => {
    if (document.documentElement.dataset.splash !== "on" || seenThisSession()) {
      markSplash("off");
      return;
    }
    setPhase("on");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const min = reduce ? 80 : 860;
    const max = reduce ? 120 : 1100;
    const started = performance.now();
    let hideTimer = 0;
    let poll = 0;
    const leave = () => {
      if (left.current) return;
      left.current = true;
      rememberOpen();
      setPhase("out");
      markSplash("out");
      hideTimer = window.setTimeout(() => {
        setPhase("off");
        markSplash("off");
      }, reduce ? 0 : LEAVE_MS);
    };
    const tick = () => {
      const elapsed = performance.now() - started;
      if (elapsed >= max || (elapsed >= min && !pending.current)) leave();
      else poll = window.setTimeout(tick, 40);
    };
    poll = window.setTimeout(tick, min);
    return () => {
      window.clearTimeout(poll);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "off") return null;

  return (
    <div className={cn("open-splash", phase === "out" && "is-leaving")} role="presentation">
      <div className="open-lockup">
        <AppMark animate className="h-28 w-28" />
        <p className="load-name">{APP_NAME}</p>
      </div>
    </div>
  );
}
