import { cn } from "@/lib/utils";

export function ReadinessRail({
  active = false,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("readiness-rail", active && "is-active", className)}
      data-testid="readiness-rail"
    />
  );
}
