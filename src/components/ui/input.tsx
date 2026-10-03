import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "field-live h-12 w-full rounded-lg border border-border bg-surface px-4 text-base text-fg",
          "placeholder:text-subtle",
          "outline-none transition-colors duration-200 ease-out",
          "focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/30",
          "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/30",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
