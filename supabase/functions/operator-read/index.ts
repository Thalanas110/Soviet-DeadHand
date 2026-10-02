import { requireUser } from "../_shared/auth.ts";
import { preflight } from "../_shared/cors.ts";
import { adminClient } from "../_shared/admin.ts";
import { body, errorResponse, HttpError, json, run } from "../_shared/http.ts";
import { open } from "../_shared/crypto.ts";
import type { OperatorSnapshot } from "../_shared/types.ts";

type ReadRequest = { action?: "snapshot" | "lastLocation" };

async function snapshot(userId: string): Promise<OperatorSnapshot> {
  const db = adminClient();
  const [
    profile,
    status,
    devices,
    incidents,
    events,
    dispatches,
    lastHeartbeat,
  ] = await Promise.all([
    db
      .from("profiles")
      .select("id, callsign, pins_configured, created_at")
      .eq("id", userId)
      .maybeSingle(),
    db.from("safety_status").select("*").eq("user_id", userId).maybeSingle(),
    db
      .from("devices")
      .select(
        "id, label, kind, last_seq, last_seen_at, last_complete_at, created_at, revoked_at",
      )
      .eq("user_id", userId)
      .order("created_at"),
    db
      .from("incidents")
      .select("*")
      .eq("user_id", userId)
      .or("covert.eq.false,resolved_at.not.is.null")
      .order("opened_at", { ascending: false })
      .limit(10),
    db
      .from("incident_events")
      .select("*")
      .eq("user_id", userId)
      .eq("covert", false)
      .order("created_at", { ascending: false })
      .limit(40),
    db
      .from("notification_dispatches")
      .select(
        "id, incident_id, contact_id, priority, status, created_at, sent_at, attempts",
      )
      .eq("user_id", userId)
      .eq("covert", false)
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("heartbeats")
      .select("received_at, location_enc, location_iv, location_accuracy")
      .eq("user_id", userId)
      .eq("complete", true)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const failed = [
    profile,
    status,
    devices,
    incidents,
    events,
    dispatches,
    lastHeartbeat,
  ].find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);

  return {
    profile: profile.data,
    status: status.data,
    devices: devices.data ?? [],
    incidents: incidents.data ?? [],
    events: events.data ?? [],
    dispatches: dispatches.data ?? [],
    lastLocation: await decryptLocation(userId, lastHeartbeat.data),
  };
}

async function decryptLocation(
  userId: string,
  row: Record<string, unknown> | null,
) {
  if (!row?.location_enc || !row.location_iv) return null;
  try {
    const point = await open<{ lat: number; lng: number }>(
      String(row.location_enc),
      String(row.location_iv),
      `loc:${userId}`,
    );
    return {
      ...point,
      accuracy: row.location_accuracy,
      received_at: row.received_at,
    };
  } catch {
    return null;
  }
}

Deno.serve((request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;

  return run(async () => {
    if (request.method !== "POST")
      throw new HttpError(405, "METHOD_NOT_ALLOWED");
    const userId = await requireUser(request);
    const input = await body<ReadRequest>(request);
    if (input.action === "lastLocation")
      return json((await snapshot(userId)).lastLocation);
    return json(await snapshot(userId));
  }).catch(errorResponse);
});
