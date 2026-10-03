import { useEffect, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export function CodeBoxes({
  digits,
  onDigits,
  error,
  autoFocus,
}: {
  digits: string[];
  onDigits: (next: string[]) => void;
  error?: boolean;
  autoFocus?: boolean;
}) {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) boxes.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (error) boxes.current[0]?.focus();
  }, [error]);

  const write = (index: number, raw: string) => {
    const pasted = raw.replace(/\D/g, "");
    if (!pasted) return;
    const next = [...digits];
    if (pasted.length > 1) {
      for (let i = 0; i < 6; i += 1) next[i] = pasted[i] ?? "";
      onDigits(next);
      if (next.join("").length < 6) boxes.current[Math.min(pasted.length, 5)]?.focus();
      return;
    }
    next[index] = pasted[0];
    onDigits(next);
    if (index < 5) boxes.current[index + 1]?.focus();
  };

  const onKey = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      onDigits(next);
      boxes.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            boxes.current[index] = node;
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={index === 0 ? 6 : 1}
          value={digit}
          aria-label={`Dígito ${index + 1}`}
          onChange={(event) => write(index, event.target.value)}
          onKeyDown={(event) => onKey(index, event)}
          className={cn(
            "field-live h-14 min-w-0 flex-1 rounded-xl border bg-surface text-center text-xl font-medium outline-none",
            error ? "border-danger" : "border-border focus:border-accent",
          )}
        />
      ))}
    </div>
  );
}
