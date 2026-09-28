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
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
      <nav aria-label="Seções" className="mx-auto flex max-w-lg items-end">
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
                "tap-target flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs transition-colors duration-150",
                active ? "text-accent" : "text-subtle",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
