import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";

const SLOP = 14;

/**
 * Fires the action on touch-up when the finger barely moved, and ignores the
 * click that follows so a tap never runs twice. Mouse and keyboard still use
 * click. A scroll (finger travels) does not count as a tap.
 */
export function useTapAction() {
  const taps = useRef(new Map<string, { x: number; y: number }>());
  const skip = useRef(new Set<string>());

  return (key: string, action: () => void) => ({
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      taps.current.set(key, { x: event.clientX, y: event.clientY });
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      const origin = taps.current.get(key);
      taps.current.delete(key);
      if (!origin) return;
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > SLOP) return;
      event.preventDefault();
      skip.current.add(key);
      window.setTimeout(() => skip.current.delete(key), 700);
      action();
    },
    onPointerCancel() {
      taps.current.delete(key);
    },
    onClick(event: ReactMouseEvent<HTMLElement>) {
      if (skip.current.delete(key)) {
        event.preventDefault();
        return;
      }
      action();
    },
  });
}
