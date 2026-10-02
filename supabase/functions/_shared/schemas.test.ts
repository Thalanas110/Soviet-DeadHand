import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { telemetrySchema } from "./schemas.ts";

Deno.test("telemetry accepts optional Android heart-rate fields", () => {
  const parsed = telemetrySchema.parse({
    seq: 1,
    clientTs: 1_798_000_000_000,
    heartRateBpm: 72,
    heartRateTimestamp: 1_798_000_000_000,
    wearableSyncTimestamp: 1_798_000_000_000,
  });

  assertEquals(parsed.heartRateBpm, 72);
  assertEquals(parsed.heartRateTimestamp, 1_798_000_000_000);
  assertEquals(parsed.wearableSyncTimestamp, 1_798_000_000_000);
});

Deno.test("telemetry without location remains diagnostic", () => {
  const parsed = telemetrySchema.parse({ seq: 1, clientTs: 1_798_000_000_000 });
  assertEquals(parsed.location, undefined);
});
