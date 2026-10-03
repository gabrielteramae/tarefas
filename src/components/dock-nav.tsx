import type { LucideIcon } from "lucide-react";
import { CalendarDays, CircleCheck, LayoutGrid, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTapAction } from "@/lib/use-tap-action";

export type DockTab = "tarefas" | "hoje" | "feitas" | "mais";

const ITEMS: Array<{ id: DockTab; label: string; icon: LucideIcon }> = [
  { id: "tarefas", label: "Lista", icon: ListChecks },
  { id: "hoje", label: "Calendário", icon: CalendarDays },
  { id: "feitas", label: "Feitas", icon: CircleCheck },
  { id: "mais", label: "Mais", icon: LayoutGrid },
];

export function DockNav({ tab, onChange }: { tab: DockTab; onChange: (tab: DockTab) => void }) {
  const tap = useTapAction();
  return (
    <div className="dock-bar shrink-0 border-t border-border bg-surface px-1 pt-1">
      <nav aria-label="Seções" className="mx-auto grid max-w-lg grid-cols-4">
        {ITEMS.map((item) => {
          const active = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              {...tap(item.id, () => onChange(item.id))}
              className={cn(
                "tap-target flex h-14 min-h-14 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 text-[11px] leading-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:outline-none sm:text-xs",
                active ? "text-accent" : "text-subtle",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
