import type { ReactNode } from "react";
import type { SetupStageId } from "@/lib/setup-readiness";

export function SetupStage({
  id,
  title,
  required,
  complete,
  active,
  onSelect,
  children,
}: {
  id: SetupStageId;
  title: string;
  required: boolean;
  complete: boolean;
  active: boolean;
  onSelect?: () => void;
  children: ReactNode;
}) {
  return (
    <section className={`plate ${active ? "border-primary" : ""}`} data-stage={id}>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center justify-between border-b border-border px-3 py-3 text-left"
      >
        <span>
          <span className="block text-[10px] uppercase tracking-[0.25em] text-primary">
            {title}
          </span>
          <span className="mt-1 block text-[10px] uppercase tracking-widest text-muted-foreground">
            {required ? "Required" : "Recommended"} · {complete ? "Ready" : "Incomplete"}
          </span>
        </span>
        <span className="font-display text-xs text-primary">{complete ? "READY" : "OPEN"}</span>
      </button>
      {active && <div className="p-4">{children}</div>}
    </section>
  );
}
