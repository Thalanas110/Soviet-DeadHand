import { describe, expect, it } from "vitest";
import { importKey, openWith, sealWith } from "../../../supabase/functions/_shared/crypto";

describe("Edge Function encryption", () => {
  it("seals and opens operator-bound data", async () => {
    const key = await importKey("a-secret-that-is-at-least-32-bytes-long");
    const sealed = await sealWith(key, { lat: 1.23, lng: 4.56 }, "loc:user-1");

    await expect(openWith(key, sealed.ciphertext, sealed.iv, "loc:user-1")).resolves.toEqual({
      lat: 1.23,
      lng: 4.56,
    });
  });

  it("rejects ciphertext opened for a different operator", async () => {
    const key = await importKey("a-secret-that-is-at-least-32-bytes-long");
    const sealed = await sealWith(key, { secret: true }, "loc:user-1");

    await expect(openWith(key, sealed.ciphertext, sealed.iv, "loc:user-2")).rejects.toThrow();
  });
});
