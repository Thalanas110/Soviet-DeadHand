import { requireAuth } from "../_shared/auth.ts";
import { preflight } from "../_shared/cors.ts";
import { adminClient, publicClient } from "../_shared/admin.ts";
import { body, errorResponse, HttpError, json, run } from "../_shared/http.ts";
import { randomToken, seal, sha256Hex } from "../_shared/crypto.ts";
import { actionSchema, telemetrySchema } from "../_shared/schemas.ts";

type Action = ReturnType<typeof actionSchema.parse>;

function rpcResult(data: unknown, error: { message: string } | null) {
  if (error) {
    const known = error.message.match(
      /(DEVICE_NOT_AUTHORIZED|REPLAY_REJECTED|PINS_NOT_CONFIGURED|PIN_REJECTED|LOCATION_REQUIRED|CHECK_IN_BEFORE_DISARM|PINS_MUST_DIFFER)/,
    )?.[1];
    return { ok: false, error: known ?? "REQUEST_REJECTED" };
  }
  const result = (data ?? {}) as {
    ok?: boolean;
    error?: string;
    complete?: boolean;
    acknowledged_at?: string;
  };
  return { ...result, ok: Boolean(result.ok), error: result.error ?? "" };
}

async function sealLocation(
  userId: string,
  location: ReturnType<typeof telemetrySchema.parse>["location"],
) {
  if (!location) return { enc: null, iv: null, acc: null, ts: null };
  const sealed = await seal(
    { lat: location.lat, lng: location.lng },
    `loc:${userId}`,
  );
  return {
    enc: sealed.ciphertext,
    iv: sealed.iv,
    acc: location.accuracy,
    ts: new Date(location.timestamp).toISOString(),
  };
}

async function deviceTokenHash(
  userId: string,
  deviceId: string,
): Promise<string | null> {
  const { data, error } = await adminClient()
    .from("devices")
    .select("token_hash")
    .eq("id", deviceId)
    .eq("user_id", userId)
    .eq("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.token_hash ?? null;
}

async function callIngest(
  userId: string,
  deviceId: string,
  input: Extract<Action, { action: "heartbeat" }>,
) {
  const tokenHash = await deviceTokenHash(userId, deviceId);
  if (!tokenHash) return { ok: false, error: "DEVICE_NOT_AUTHORIZED" };
  const location = await sealLocation(userId, input.location);
  const { data, error } = await adminClient().rpc("api_ingest_device", {
    _token_hash: tokenHash,
    _seq: input.seq,
    _client_ts: new Date(input.clientTs).toISOString(),
    _battery: input.battery ?? null,
    _charging: input.charging ?? null,
    _network: input.network ?? null,
    _wearable: input.wearableConnected ?? null,
    _loc_enc: location.enc,
    _loc_iv: location.iv,
    _loc_acc: location.acc,
    _loc_ts: location.ts,
  });
  return rpcResult(data, error);
}

async function execute(userId: string, token: string, input: Action) {
  const db = adminClient();
  switch (input.action) {
    case "bootstrap": {
      const { error } = await publicClient(token).rpc("bootstrap_operator");
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    case "registerDevice": {
      const deviceToken = randomToken();
      const { data, error } = await db
        .from("devices")
        .insert({
          user_id: userId,
          label: input.label,
          kind: input.kind,
          token_hash: await sha256Hex(deviceToken),
        })
        .select("id")
        .single();
      if (error) throw new Error("Device registration failed");
      return { id: data.id, token: deviceToken };
    }
    case "revokeDevice": {
      const { error } = await db
        .from("devices")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", input.deviceId)
        .eq("user_id", userId);
      if (error) throw new Error("Revoke failed");
      return { ok: true };
    }
    case "setPins": {
      const { data, error } = await db.rpc("api_set_pins", {
        _user: userId,
        _current: input.current ?? "",
        _checkin: input.checkin,
        _duress: input.duress,
      });
      return rpcResult(data, error);
    }
    case "setArmed": {
      const { data, error } = await db.rpc("api_set_armed", {
        _user: userId,
        _armed: input.armed,
        _pin: input.pin,
      });
      return rpcResult(data, error);
    }
    case "standDown": {
      const { data, error } = await db.rpc("api_stand_down", {
        _user: userId,
        _pin: input.pin,
      });
      return rpcResult(data, error);
    }
    case "checkIn": {
      const location = await sealLocation(userId, input.location);
      const { data, error } = await db.rpc("api_checkin", {
        _user: userId,
        _device: input.deviceId,
        _seq: input.seq,
        _client_ts: new Date(input.clientTs).toISOString(),
        _battery: input.battery ?? null,
        _charging: input.charging ?? null,
        _network: input.network ?? null,
        _wearable: input.wearableConnected ?? null,
        _loc_enc: location.enc,
        _loc_iv: location.iv,
        _loc_acc: location.acc,
        _loc_ts: location.ts,
        _pin: input.pin,
      });
      return rpcResult(data, error);
    }
    case "silentAlarm": {
      const authorizedDevice = input.deviceId
        ? await deviceTokenHash(userId, input.deviceId)
        : null;
      const { error } = await db.rpc("api_silent_alarm", {
        _user: userId,
        _device: authorizedDevice ? input.deviceId : null,
      });
      if (error) throw new Error("Alarm request failed");
      return { ok: true, acknowledged_at: new Date().toISOString() };
    }
    case "heartbeat":
      return callIngest(userId, input.deviceId, input);
  }
}

Deno.serve((request) => {
  const preflightResponse = preflight(request);
  if (preflightResponse) return preflightResponse;

  return run(async () => {
    if (request.method !== "POST")
      throw new HttpError(405, "METHOD_NOT_ALLOWED");
    const auth = await requireAuth(request);
    const parsed = actionSchema.safeParse(await body<unknown>(request));
    if (!parsed.success) throw new HttpError(400, "INVALID_REQUEST");
    return json(await execute(auth.userId, auth.token, parsed.data));
  }).catch(errorResponse);
});
