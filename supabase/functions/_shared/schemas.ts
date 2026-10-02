import { z } from "https://esm.sh/zod@3.25.76";

export const passwordSchema = z
  .string()
  .min(8, "Password must be 8-64 characters")
  .max(64, "Password must be 8-64 characters");

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive().max(100000),
  timestamp: z.number().int().positive(),
});

export const telemetrySchema = z.object({
  seq: z.number().int().positive(),
  clientTs: z.number().int().positive(),
  battery: z.number().int().min(0).max(100).nullable().optional(),
  charging: z.boolean().nullable().optional(),
  network: z.string().max(40).nullable().optional(),
  wearableConnected: z.boolean().nullable().optional(),
  heartRateBpm: z.number().int().min(1).max(300).nullable().optional(),
  heartRateTimestamp: z.number().int().positive().nullable().optional(),
  wearableSyncTimestamp: z.number().int().positive().nullable().optional(),
  location: locationSchema.nullable().optional(),
});

const setPinsFieldsSchema = z.object({
  current: z.string().max(64).optional(),
  checkin: passwordSchema,
  duress: passwordSchema,
});

const distinctPasswords = (value: { checkin: string; duress: string }) =>
  value.checkin !== value.duress;

const distinctPasswordMessage = {
    message: "Duress password must differ from check-in password",
    path: ["duress"],
};

export const setPinsSchema = setPinsFieldsSchema.refine(
  distinctPasswords,
  distinctPasswordMessage,
);

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

export const actionSchema = z.union([
  z.object({ action: z.literal("bootstrap") }),
  z.object({
    action: z.literal("registerDevice"),
    label: registerDeviceSchema.shape.label,
    kind: registerDeviceSchema.shape.kind,
  }),
  z.object({ action: z.literal("revokeDevice"), deviceId: z.string().uuid() }),
  z
    .object({ action: z.literal("setPins"), ...setPinsFieldsSchema.shape })
    .refine(distinctPasswords, distinctPasswordMessage),
  z.object({
    action: z.literal("setArmed"),
    armed: z.boolean(),
    pin: passwordSchema,
  }),
  z.object({ action: z.literal("standDown"), pin: passwordSchema }),
  z.object({
    action: z.literal("checkIn"),
    deviceId: z.string().uuid(),
    pin: passwordSchema,
    ...telemetrySchema.shape,
  }),
  z.object({
    action: z.literal("silentAlarm"),
    deviceId: z.string().uuid().nullable(),
  }),
  z.object({
    action: z.literal("unsafeReport"),
    deviceId: z.string().uuid().nullable(),
  }),
  z.object({
    action: z.literal("heartbeat"),
    deviceId: z.string().uuid(),
    ...telemetrySchema.shape,
  }),
]);

export const contactsActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list") }),
  z.object({ action: z.literal("add"), ...contactSchema.shape }),
  z.object({ action: z.literal("remove"), contactId: z.string().uuid() }),
]);
