import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex h-12 min-w-12 items-center justify-center rounded-lg px-4 text-sm font-medium transition-transform duration-75 ease-out select-none tap-target",
          "focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:outline-none",
          "disabled:pointer-events-none disabled:opacity-40",
          variant === "primary" && "bg-accent text-accent-fg hover:brightness-110",
          variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-fg",
          variant === "danger" && "text-danger hover:bg-surface-2",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
