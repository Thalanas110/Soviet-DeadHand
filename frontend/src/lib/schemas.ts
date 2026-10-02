import { z } from "zod";

export const pinSchema = z.string().regex(/^\d{4,8}$/, "PIN must be 4–8 digits");

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive().max(100000),
  timestamp: z.number().int().positive(), // ms since epoch, from the device
});
export type LocationSample = z.infer<typeof locationSchema>;

export const telemetrySchema = z.object({
  seq: z.number().int().positive(),
  clientTs: z.number().int().positive(),
  battery: z.number().int().min(0).max(100).nullable().optional(),
  charging: z.boolean().nullable().optional(),
  network: z.string().max(40).nullable().optional(),
  wearableConnected: z.boolean().nullable().optional(),
  location: locationSchema.nullable().optional(),
});
export type Telemetry = z.infer<typeof telemetrySchema>;

export const checkInSchema = telemetrySchema.extend({
  deviceId: z.string().uuid(),
  pin: pinSchema,
});

export const deviceTelemetrySchema = telemetrySchema; // posted by token-authenticated devices / wearable bridge

export const setPinsSchema = z
  .object({ current: z.string().max(8).optional(), checkin: pinSchema, duress: pinSchema })
  .refine((v) => v.checkin !== v.duress, { message: "Duress PIN must differ from check-in PIN", path: ["duress"] });

export const contactSchema = z.object({
  alias: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  priority: z.number().int().min(1).max(9),
});

export const registerDeviceSchema = z.object({
  label: z.string().trim().min(1).max(40),
  kind: z.enum(["phone", "wearable"]),
});

/** A heartbeat is only a complete safety heartbeat when it carries a fresh, plausible location sample. */
export function isCompleteLocation(loc: LocationSample | null | undefined, now = Date.now()): boolean {
  if (!loc) return false;
  if (!(loc.accuracy > 0 && loc.accuracy <= 5000)) return false;
  return loc.timestamp >= now - 10 * 60_000 && loc.timestamp <= now + 2 * 60_000;
}

export type LocationFreshness = "CURRENT" | "LAST_KNOWN" | "UNKNOWN";
export function locationFreshness(receivedAt: string | null | undefined, now = Date.now()): LocationFreshness {
  if (!receivedAt) return "UNKNOWN";
  return now - new Date(receivedAt).getTime() <= 15 * 60_000 ? "CURRENT" : "LAST_KNOWN";
}

export const STATE_LABEL: Record<string, { code: string; ru: string; en: string }> = {
  NORMAL: { code: "СОСТ-0", ru: "НОРМА", en: "Normal" },
  ARE_YOU_ALIVE: { code: "СОСТ-1", ru: "ВЫ ЖИВЫ?", en: "Are you alive" },
  PROLONGED_NO_RESPONSE: { code: "СОСТ-2", ru: "НЕТ ОТВЕТА", en: "Prolonged no response" },
  CRITICAL_UNRESOLVED: { code: "СОСТ-3", ru: "КРИТИЧЕСКОЕ", en: "Critical — cascade executed" },
  RESOLVED: { code: "СОСТ-4", ru: "УРЕГУЛИРОВАНО", en: "Resolved" },
};

export const AYA_HOURS = 72;
export const PROLONGED_HOURS = 48;
