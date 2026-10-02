import { requireDeviceToken } from "../_shared/auth.ts";
import { preflight } from "../_shared/cors.ts";
import { adminClient } from "../_shared/admin.ts";
import { body, errorResponse, HttpError, json, run } from "../_shared/http.ts";
import { seal, sha256Hex } from "../_shared/crypto.ts";
import { telemetrySchema } from "../_shared/schemas.ts";

Deno.serve((request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;

  return run(async () => {
    if (request.method !== "POST")
      throw new HttpError(405, "METHOD_NOT_ALLOWED");
    const token = requireDeviceToken(request);
    const parsed = telemetrySchema.safeParse(await body<unknown>(request));
    if (!parsed.success) throw new HttpError(400, "INVALID_REQUEST");

    const db = adminClient();
    const tokenHash = await sha256Hex(token);
    const { data: device, error: deviceError } = await db
      .from("devices")
      .select("id, user_id")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();
    if (deviceError || !device)
      throw new HttpError(401, "DEVICE_NOT_AUTHORIZED");

    const location = parsed.data.location
      ? await seal(
          { lat: parsed.data.location.lat, lng: parsed.data.location.lng },
          `loc:${device.user_id}`,
        )
      : null;
    const { data, error } = await db.rpc("api_ingest_device", {
      _token_hash: tokenHash,
      _seq: parsed.data.seq,
      _client_ts: new Date(parsed.data.clientTs).toISOString(),
      _battery: parsed.data.battery ?? null,
      _charging: parsed.data.charging ?? null,
      _network: parsed.data.network ?? null,
      _wearable: parsed.data.wearableConnected ?? null,
      _loc_enc: location?.ciphertext ?? null,
      _loc_iv: location?.iv ?? null,
      _loc_acc: parsed.data.location?.accuracy ?? null,
      _loc_ts: parsed.data.location
        ? new Date(parsed.data.location.timestamp).toISOString()
        : null,
    });
    if (error)
      throw new HttpError(
        400,
        error.message.includes("REPLAY_REJECTED")
          ? "REPLAY_REJECTED"
          : "INGEST_REJECTED",
      );
    return json({ ok: true, ...(data as Record<string, unknown>) });
  }).catch(errorResponse);
});
