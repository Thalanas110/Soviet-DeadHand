import { z } from "https://esm.sh/zod@3.25.76";

export const pinSchema = z
  .string()
  .regex(/^\d{4,8}$/, "PIN must be 4-8 digits");

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
  location: locationSchema.nullable().optional(),
});

export const setPinsSchema = z
  .object({
    current: z.string().max(8).optional(),
    checkin: pinSchema,
    duress: pinSchema,
  })
  .refine((value) => value.checkin !== value.duress, {
    message: "Duress PIN must differ from check-in PIN",
    path: ["duress"],
  });

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
    .object({ action: z.literal("setPins"), ...setPinsSchema.shape })
    .refine((value) => value.checkin !== value.duress, {
      message: "Duress PIN must differ from check-in PIN",
      path: ["duress"],
    }),
  z.object({
    action: z.literal("setArmed"),
    armed: z.boolean(),
    pin: pinSchema,
  }),
  z.object({ action: z.literal("standDown"), pin: pinSchema }),
  z.object({
    action: z.literal("checkIn"),
    deviceId: z.string().uuid(),
    pin: pinSchema,
    ...telemetrySchema.shape,
  }),
  z.object({
    action: z.literal("silentAlarm"),
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
