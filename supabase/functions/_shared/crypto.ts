const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function unb64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function importKey(secret: string): Promise<CryptoKey> {
  if (!secret || secret.length < 32)
    throw new Error("Encryption key not configured");
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function getKey(): Promise<CryptoKey> {
  const runtime = (
    globalThis as typeof globalThis & {
      Deno?: { env: { get(name: string): string | undefined } };
    }
  ).Deno;
  return importKey(runtime?.env.get("DEADHAND_DATA_KEY") ?? "");
}

export async function sealWith(key: CryptoKey, data: unknown, aad: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(aad) },
    key,
    enc.encode(JSON.stringify(data)),
  );
  return { ciphertext: b64(ciphertext), iv: b64(iv) };
}

export async function openWith<T = unknown>(
  key: CryptoKey,
  ciphertext: string,
  iv: string,
  aad: string,
): Promise<T> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(iv), additionalData: enc.encode(aad) },
    key,
    unb64(ciphertext),
  );
  return JSON.parse(dec.decode(plaintext)) as T;
}

export async function seal(data: unknown, aad: string) {
  return sealWith(await getKey(), data, aad);
}

export async function open<T = unknown>(
  ciphertext: string,
  iv: string,
  aad: string,
) {
  return openWith<T>(await getKey(), ciphertext, iv, aad);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken(bytes = 32): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
