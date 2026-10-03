import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";

const SLOP = 18;

function setPressed(event: { currentTarget: HTMLElement }, pressed: boolean) {
  event.currentTarget.classList.toggle("is-pressed", pressed);
}

/**
 * Press feedback starts on contact. The action runs on release if the finger
 * barely moved, and the click that follows is ignored so one tap never runs twice.
 */
export function useTapAction() {
  const taps = useRef(new Map<string, { x: number; y: number }>());
  const skip = useRef(new Set<string>());

  return (key: string, action: () => void) => ({
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      setPressed(event, true);
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      taps.current.set(key, { x: event.clientX, y: event.clientY });
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      setPressed(event, false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const origin = taps.current.get(key);
      taps.current.delete(key);
      if (!origin) return;
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > SLOP) return;
      skip.current.add(key);
      window.setTimeout(() => skip.current.delete(key), 400);
      action();
    },
    onPointerLeave(event: ReactPointerEvent<HTMLElement>) {
      if (event.pointerType === "mouse") setPressed(event, false);
    },
    onPointerCancel(event: ReactPointerEvent<HTMLElement>) {
      setPressed(event, false);
      taps.current.delete(key);
    },
    onClick(event: ReactMouseEvent<HTMLElement>) {
      setPressed(event, false);
      if (skip.current.delete(key)) {
        event.preventDefault();
        return;
      }
      action();
    },
  });
}
