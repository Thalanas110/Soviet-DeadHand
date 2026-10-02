import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  checkInSchema,
  contactSchema,
  pinSchema,
  registerDeviceSchema,
  setPinsSchema,
  telemetrySchema,
} from "./schemas";

// All safety-state mutations go through SECURITY DEFINER database procedures that only the
// server (service role) may execute. The browser never writes safety state directly.

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function sealLocation(userId: string, loc: z.infer<typeof telemetrySchema>["location"]) {
  if (!loc) return { enc: null, iv: null, acc: null, ts: null };
  const { seal } = await import("./crypto.server");
  const { ciphertext, iv } = await seal({ lat: loc.lat, lng: loc.lng }, `loc:${userId}`);
  return { enc: ciphertext, iv, acc: loc.accuracy, ts: new Date(loc.timestamp).toISOString() };
}

function rpcResult(data: unknown, error: { message: string } | null) {
  if (error) return { ok: false, error: error.message.replace(/^.*?(DEVICE_NOT_AUTHORIZED|REPLAY_REJECTED).*$/, "$1") };
  const d = (data ?? {}) as { ok?: boolean; error?: string };
  return d.error ? { ok: Boolean(d.ok), error: d.error } : { ok: Boolean(d.ok), error: "" };
}

export const bootstrap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("bootstrap_operator");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registerDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => registerDeviceSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { randomToken, sha256Hex } = await import("./crypto.server");
    const token = randomToken();
    const db = await admin();
    const { data: row, error } = await db
      .from("devices")
      .insert({ user_id: context.userId, label: data.label, kind: data.kind, token_hash: await sha256Hex(token) })
      .select("id")
      .single();
    if (error) throw new Error("Device registration failed");
    // The raw token is shown once and never stored.
    return { id: row.id, token };
  });

export const revokeDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { error } = await db
      .from("devices")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error("Revoke failed");
    return { ok: true };
  });

export const sendHeartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => telemetrySchema.extend({ deviceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const loc = await sealLocation(context.userId, data.location);
    const db = await admin();
    const { data: dev } = await db.from("devices").select("id").eq("id", data.deviceId).eq("user_id", context.userId).maybeSingle();
    if (!dev) return { ok: false, error: "DEVICE_NOT_AUTHORIZED" };
    const { data: tok } = await db.from("devices").select("token_hash").eq("id", data.deviceId).single();
    const { data: res, error } = await db.rpc("api_ingest_device", {
      _token_hash: tok!.token_hash,
      _seq: data.seq,
      _client_ts: new Date(data.clientTs).toISOString(),
      _battery: data.battery ?? null!,
      _charging: data.charging ?? null!,
      _network: data.network ?? null!,
      _wearable: data.wearableConnected ?? null!,
      _loc_enc: loc.enc!,
      _loc_iv: loc.iv!,
      _loc_acc: loc.acc!,
      _loc_ts: loc.ts!,
    });
    if (error) return rpcResult(null, error);
    const r = (res ?? {}) as { complete?: boolean };
    return { ok: true, error: "", complete: Boolean(r.complete) };
  });

export const checkIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => checkInSchema.parse(d))
  .handler(async ({ data, context }) => {
    const loc = await sealLocation(context.userId, data.location);
    const db = await admin();
    const { data: res, error } = await db.rpc("api_checkin", {
      _user: context.userId,
      _device: data.deviceId,
      _seq: data.seq,
      _client_ts: new Date(data.clientTs).toISOString(),
      _battery: data.battery ?? null!,
      _charging: data.charging ?? null!,
      _network: data.network ?? null!,
      _wearable: data.wearableConnected ?? null!,
      _loc_enc: loc.enc!,
      _loc_iv: loc.iv!,
      _loc_acc: loc.acc!,
      _loc_ts: loc.ts!,
      _pin: data.pin,
    });
    return rpcResult(res, error);
  });

/** Silent alarm: always returns the same innocuous acknowledgement. */
export const silentAlarm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ deviceId: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    await db.rpc("api_silent_alarm", { _user: context.userId, _device: data.deviceId! });
    return { ok: true, acknowledged_at: new Date().toISOString() };
  });

export const setPins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => setPinsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: res, error } = await db.rpc("api_set_pins", {
      _user: context.userId,
      _current: data.current ?? "",
      _checkin: data.checkin,
      _duress: data.duress,
    });
    return rpcResult(res, error);
  });

export const setArmed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ armed: z.boolean(), pin: pinSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: res, error } = await db.rpc("api_set_armed", { _user: context.userId, _armed: data.armed, _pin: data.pin });
    return rpcResult(res, error);
  });

export const standDown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ pin: pinSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: res, error } = await db.rpc("api_stand_down", { _user: context.userId, _pin: data.pin });
    return rpcResult(res, error);
  });

export const addContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => contactSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { seal } = await import("./crypto.server");
    const sealed = await seal({ name: data.name, email: data.email, phone: data.phone || null }, `contact:${context.userId}`);
    const { error } = await context.supabase.from("emergency_contacts").insert({
      user_id: context.userId,
      alias: data.alias,
      priority: data.priority,
      contact_enc: sealed.ciphertext,
      contact_iv: sealed.iv,
    });
    if (error) throw new Error("Could not save contact");
    return { ok: true };
  });

export const listContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { open } = await import("./crypto.server");
    const { data, error } = await context.supabase
      .from("emergency_contacts")
      .select("id, alias, priority, authorized, contact_enc, contact_iv, created_at")
      .order("priority");
    if (error) throw new Error("Could not load contacts");
    return Promise.all(
      (data ?? []).map(async (c) => {
        let detail: { name: string; email: string; phone: string | null } | null = null;
        try {
          detail = await open(c.contact_enc, c.contact_iv, `contact:${context.userId}`);
        } catch {
          detail = null;
        }
        return { id: c.id, alias: c.alias, priority: c.priority, authorized: c.authorized, created_at: c.created_at, detail };
      }),
    );
  });

export const removeContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("emergency_contacts").delete().eq("id", data.id);
    if (error) {
      // Contacts already referenced by a dispatch are retained for audit; de-authorize instead.
      const db = await admin();
      await db.from("emergency_contacts").update({ authorized: false }).eq("id", data.id).eq("user_id", context.userId);
      return { ok: true, deauthorized: true };
    }
    return { ok: true, deauthorized: false };
  });

export const getLastKnownLocation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("heartbeats")
      .select("received_at, location_enc, location_iv, location_accuracy")
      .eq("complete", true)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.location_enc || !data.location_iv) return null;
    const { open } = await import("./crypto.server");
    try {
      const p = await open<{ lat: number; lng: number }>(data.location_enc, data.location_iv, `loc:${context.userId}`);
      return { ...p, accuracy: data.location_accuracy, received_at: data.received_at };
    } catch {
      return null;
    }
  });
