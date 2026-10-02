import type { Contact, OperatorSnapshot } from "@/lib/api";

export type SetupStageId = "passwords" | "handset" | "cascade" | "wearable";
export type SetupReadiness = Record<SetupStageId, boolean>;

export function deriveSetupReadiness(
  snapshot: OperatorSnapshot | undefined,
  contacts: Contact[] | undefined,
): SetupReadiness {
  const devices = snapshot?.devices ?? [];

  return {
    passwords: snapshot?.profile?.pins_configured === true,
    handset: devices.some((device) => device.kind === "phone" && !device.revoked_at),
    cascade: (contacts ?? []).some((contact) => contact.authorized),
    wearable: devices.some((device) => device.kind === "wearable" && !device.revoked_at),
  };
}

export function firstIncompleteStage(readiness: SetupReadiness): SetupStageId | null {
  return (
    (["passwords", "handset", "cascade", "wearable"] as const).find((stage) => !readiness[stage]) ??
    null
  );
}

export function initialSetupStage(readiness: SetupReadiness): SetupStageId {
  return firstIncompleteStage(readiness) ?? "passwords";
}

export function hasRequiredSetup(readiness: SetupReadiness) {
  return readiness.passwords && readiness.handset && readiness.cascade;
}
