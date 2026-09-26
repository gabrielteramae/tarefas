import { useEffect, useRef, useState } from "react";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const LEAVE_MS = 640;
const HOLD_MS = 2060;

function markSplash(phase: "on" | "out" | "off") {
  if (phase === "off") document.documentElement.removeAttribute("data-splash");
  else document.documentElement.dataset.splash = phase;
}

export function AppMark({ className, animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("mark", animate && "mark-alive", className)} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#4dba62" />
      <rect x="22.5" y="11" width="5" height="11" rx="2.5" fill="#09090b" />
      <rect x="36.5" y="11" width="5" height="11" rx="2.5" fill="#09090b" />
      <rect x="15" y="18.5" width="34" height="32" rx="6.5" fill="none" stroke="#09090b" strokeWidth="3.4" />
      <circle cx="25.8" cy="34.2" r="5.15" fill="#09090b" />
      <circle cx="27.7" cy="34.2" r="1.7" fill="#4dba62" />
      <g className="eye-right">
        <circle cx="38.2" cy="34.2" r="5.15" fill="#09090b" />
        <circle cx="40.1" cy="34.2" r="1.7" fill="#4dba62" />
      </g>
    </svg>
  );
}

export function OpenSplash() {
  const [phase, setPhase] = useState<"on" | "out" | "off">("on");
  const left = useRef(false);

  useEffect(() => {
    markSplash("on");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let hideTimer = 0;
    const leave = () => {
      if (left.current) return;
      left.current = true;
      setPhase("out");
      markSplash("out");
      hideTimer = window.setTimeout(() => {
        setPhase("off");
        markSplash("off");
      }, LEAVE_MS);
    };
    const wait = window.setTimeout(leave, reduce ? 280 : HOLD_MS);
    return () => {
      window.clearTimeout(wait);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "off") return null;

  return (
    <div className={cn("open-splash", phase === "out" && "is-leaving")} role="presentation">
      <div className="open-lockup">
        <AppMark animate className="size-24" />
        <p className="load-name">{APP_NAME}</p>
      </div>
    </div>
  );
}
