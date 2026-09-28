import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
};

export function Switch({ checked, onCheckedChange, label, disabled = false }: Props) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "relative inline-flex h-11 w-16 shrink-0 items-center rounded-full transition-colors duration-300 ease-out",
        "focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-accent data-[state=unchecked]:bg-subtle/70",
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-7 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
          "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          "data-[state=unchecked]:translate-x-1 data-[state=checked]:translate-x-8",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
