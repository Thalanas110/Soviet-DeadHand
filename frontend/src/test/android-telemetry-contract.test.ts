import { describe, expect, it } from "vitest";
import { telemetrySchema } from "@/lib/schemas";

describe("Android telemetry contract", () => {
  it("accepts optional heart-rate and wearable-sync samples", () => {
    const parsed = telemetrySchema.parse({
      seq: 1,
      clientTs: 1_798_000_000_000,
      heartRateBpm: 72,
      heartRateTimestamp: 1_798_000_000_000,
      wearableSyncTimestamp: 1_798_000_000_000,
    });

    expect(parsed.heartRateBpm).toBe(72);
    expect(parsed.heartRateTimestamp).toBe(1_798_000_000_000);
    expect(parsed.wearableSyncTimestamp).toBe(1_798_000_000_000);
  });

  it("keeps missing location diagnostic", () => {
    const parsed = telemetrySchema.parse({ seq: 1, clientTs: 1_798_000_000_000 });

    expect(parsed.location).toBeUndefined();
  });
});
