import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { homeSearch, readDockTab } from "@/lib/dock-tab";

export function BackButton({ className }: { className: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Voltar"
      className={className}
      onClick={() => {
        const index = (window.history.state as { __TSR_index?: number } | null)?.__TSR_index;
        if (typeof index === "number" && index > 0) {
          window.history.back();
          return;
        }
        void router.navigate({ to: "/", search: homeSearch(readDockTab()) });
      }}
    >
      <ChevronLeft className="size-5" />
    </button>
  );
}
