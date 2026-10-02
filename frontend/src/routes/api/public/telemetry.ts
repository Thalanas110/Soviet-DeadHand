import { createFileRoute } from "@tanstack/react-router";
import { deviceTelemetrySchema } from "@/lib/schemas";

// Token-authenticated telemetry ingest for registered devices (e.g. a Huawei wearable bridge).
// Authorization: Bearer <device token shown once at registration>.
export const Route = createFileRoute("/api/public/telemetry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const m = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get("authorization") ?? "");
        if (!m) return json({ error: "UNAUTHORIZED" }, 401);
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "INVALID_JSON" }, 400);
        }
        const parsed = deviceTelemetrySchema.safeParse(body);
        if (!parsed.success) return json({ error: "INVALID_PAYLOAD" }, 400);
        const t = parsed.data;

        const { sha256Hex, seal } = await import("@/lib/crypto.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const tokenHash = await sha256Hex(m[1]!);
        const { data: dev } = await supabaseAdmin
          .from("devices")
          .select("user_id")
          .eq("token_hash", tokenHash)
          .is("revoked_at", null)
          .maybeSingle();
        if (!dev) return json({ error: "UNAUTHORIZED" }, 401);

        let enc: string | null = null, iv: string | null = null;
        if (t.location) {
          const s = await seal({ lat: t.location.lat, lng: t.location.lng }, `loc:${dev.user_id}`);
          enc = s.ciphertext;
          iv = s.iv;
        }
        const { data, error } = await supabaseAdmin.rpc("api_ingest_device", {
          _token_hash: tokenHash,
          _seq: t.seq,
          _client_ts: new Date(t.clientTs).toISOString(),
          _battery: t.battery ?? null!,
          _charging: t.charging ?? null!,
          _network: t.network ?? null!,
          _wearable: t.wearableConnected ?? null!,
          _loc_enc: enc!,
          _loc_iv: iv!,
          _loc_acc: t.location?.accuracy ?? null!,
          _loc_ts: t.location ? new Date(t.location.timestamp).toISOString() : null!,
        });
        if (error) {
          const code = /REPLAY_REJECTED/.test(error.message) ? "REPLAY_REJECTED" : "REJECTED";
          return json({ error: code }, code === "REPLAY_REJECTED" ? 409 : 400);
        }
        return json(data, 200);
      },
    },
  },
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
