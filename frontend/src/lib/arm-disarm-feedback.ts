import type { OperatorStatus } from "@/lib/api";

export type ArmDisarmFeedback = "armed" | "disarmed" | "signal" | "rejected";

export function resolveArmDisarmFeedback({
  requestedArmed,
  actionOk,
  status,
}: {
  requestedArmed: boolean;
  actionOk: boolean;
  status: Pick<OperatorStatus, "armed"> | null | undefined;
}): ArmDisarmFeedback {
  if (!actionOk) return "rejected";
  if (status?.armed !== requestedArmed) return "signal";
  return requestedArmed ? "armed" : "disarmed";
}
