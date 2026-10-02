import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { importKey, openWith, sealWith } from "./crypto.ts";

Deno.test("AES-GCM round trip binds data to the operator", async () => {
  const key = await importKey("a-secret-that-is-at-least-32-bytes-long");
  const sealed = await sealWith(key, { lat: 1.23, lng: 4.56 }, "loc:user-1");
  assertEquals(
    await openWith(key, sealed.ciphertext, sealed.iv, "loc:user-1"),
    { lat: 1.23, lng: 4.56 },
  );
});

Deno.test("AES-GCM rejects an AAD mismatch", async () => {
  const key = await importKey("a-secret-that-is-at-least-32-bytes-long");
  const sealed = await sealWith(key, { secret: true }, "loc:user-1");
  await assertRejects(() =>
    openWith(key, sealed.ciphertext, sealed.iv, "loc:user-2"),
  );
});

Deno.test("AES-GCM rejects a missing or short secret", async () => {
  await assertRejects(() => importKey(""));
  await assertRejects(() => importKey("too-short"));
});
