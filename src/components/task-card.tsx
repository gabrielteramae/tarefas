import { memo } from "react";
import { Check, CalendarDays, GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadPhoneCalendar, googleAgendaUrl, phoneCalendarHref } from "@/lib/agenda";
import { calendarDay, clockOf, formatRange } from "@/lib/dates";
import type { TaskRow } from "@/lib/tasks";
import { useTapAction } from "@/lib/use-tap-action";
import { cn } from "@/lib/utils";

export type SpanWhich = "start" | "end" | "startClock" | "endClock";

export type TaskActions = {
  toggle: (id: string) => void;
  remove: (id: string) => void;
  span: (task: TaskRow, which: SpanWhich, value: string) => void;
  dragStart: (id: string) => void;
  dragMove: (id: string, y: number) => void;
  dragEnd: () => void;
  dragCancel: () => void;
  expand: (id: string) => void;
};

function detail(task: TaskRow) {
  const range = formatRange(task.dueAt, task.endsAt);
  const flag = task.priority === "urgente" ? "Urgente" : task.priority === "depois" ? "Depois" : "";
  return [flag, range].filter(Boolean).join(" · ");
}

function isOverdue(task: TaskRow) {
  const day = calendarDay(task.endsAt ?? task.dueAt);
  if (!day || task.done) return false;
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  return day < `${now.getFullYear()}-${month}-${date}`;
}

type Props = {
  task: TaskRow;
  openList: boolean;
  reorder: boolean;
  dragging: boolean;
  expanded: boolean;
  actions: TaskActions;
};

function TaskCardView({ task, openList, reorder, dragging, expanded, actions }: Props) {
  const tap = useTapAction();
  const late = isOverdue(task);
  const editable = openList && !task.done;
  const note = detail(task);
  const google = googleAgendaUrl(task);
  const phone = phoneCalendarHref(task);

  return (
    <li
      data-task-id={task.id}
      className={cn(
        "task-card rounded-2xl border border-border bg-surface px-2 py-1",
        expanded && "is-open",
        dragging && "is-dragging opacity-40",
      )}
    >
      <div className="flex items-center gap-0.5">
        {editable && reorder ? (
          <button
            type="button"
            aria-label="Arrastar para reordenar"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              actions.dragStart(task.id);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              actions.dragMove(task.id, event.clientY);
            }}
            onPointerUp={() => actions.dragEnd()}
            onPointerCancel={() => actions.dragCancel()}
            className="grid size-11 shrink-0 touch-none place-items-center text-subtle"
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          {...tap(`done-${task.id}`, () => actions.toggle(task.id))}
          aria-label={task.done ? "Desmarcar tarefa" : "Concluir tarefa"}
          className="tap-target grid size-11 shrink-0 place-items-center"
        >
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-md border",
              task.done ? "border-accent bg-accent text-accent-fg" : "border-border text-transparent",
            )}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        </button>
        <div className="min-w-0 flex-1 py-2">
          <p className={cn("truncate text-sm leading-snug", task.done && "text-subtle line-through")}>{task.text}</p>
          {note ? <p className={cn("truncate text-xs", late ? "text-danger" : "text-subtle")}>{note}</p> : null}
        </div>
        {editable ? (
          <button
            type="button"
            {...tap(`when-${task.id}`, () => actions.expand(task.id))}
            aria-expanded={expanded}
            aria-label={`Editar período de ${task.text}`}
            className={cn(
              "tap-target grid size-11 shrink-0 place-items-center",
              expanded ? "text-accent" : "text-subtle",
            )}
          >
            <CalendarDays className="size-4" />
          </button>
        ) : null}
        <Button
          variant="danger"
          className="h-11 min-w-11 px-2"
          aria-label="Apagar tarefa"
          {...tap(`del-${task.id}`, () => actions.remove(task.id))}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {editable && expanded ? (
        <div className="grid gap-3 px-1 pb-2">
          <label className="grid gap-1.5 text-xs text-subtle">
            De
            <input
              type="date"
              aria-label={`Começo de ${task.text}`}
              value={calendarDay(task.dueAt)}
              onChange={(event) => actions.span(task, "start", event.target.value)}
              className="task-date"
              lang="pt-BR"
            />
            {calendarDay(task.dueAt) ? (
              <input
                type="time"
                aria-label={`Hora de começo de ${task.text}`}
                value={clockOf(task.dueAt)}
                onChange={(event) => actions.span(task, "startClock", event.target.value)}
                className="task-time"
              />
            ) : null}
          </label>
          <label className="grid gap-1.5 text-xs text-subtle">
            Até
            <input
              type="date"
              aria-label={`Fim de ${task.text}`}
              value={calendarDay(task.endsAt ?? task.dueAt)}
              onChange={(event) => actions.span(task, "end", event.target.value)}
              className="task-date"
              lang="pt-BR"
            />
            {calendarDay(task.endsAt ?? task.dueAt) ? (
              <input
                type="time"
                aria-label={`Hora de fim de ${task.text}`}
                value={clockOf(task.endsAt)}
                onChange={(event) => actions.span(task, "endClock", event.target.value)}
                className="task-time"
              />
            ) : null}
          </label>
          {google && phone ? (
            <div className="grid grid-cols-2 gap-2">
              <a
                href={google}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-surface-2 px-2 text-center text-xs text-fg"
              >
                Google Agenda
              </a>
              <a
                href={phone}
                download="tarefa.ics"
                onClick={(event) => {
                  event.preventDefault();
                  void downloadPhoneCalendar(task).then(() => {
                    toast("Arquivo salvo. Abra no app Calendário.");
                  });
                }}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-surface-2 px-2 text-center text-xs text-fg"
              >
                Calendário
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export const TaskCard = memo(TaskCardView, (prev, next) => {
  return (
    prev.task === next.task &&
    prev.openList === next.openList &&
    prev.reorder === next.reorder &&
    prev.dragging === next.dragging &&
    prev.expanded === next.expanded &&
    prev.actions === next.actions
  );
});
