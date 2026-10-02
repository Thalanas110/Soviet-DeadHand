// AES-256-GCM via Web Crypto. Key is derived from the server-held DEADHAND_DATA_KEY secret.
// The user id is bound as additional authenticated data so ciphertext cannot be moved between operators.

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]!);
  return btoa(s);
}
function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function importKey(secret: string): Promise<CryptoKey> {
  if (!secret || secret.length < 32) throw new Error("Encryption key not configured");
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function getKey(): Promise<CryptoKey> {
  return importKey(process.env["DEADHAND_DATA_KEY"] ?? "");
}

export async function sealWith(key: CryptoKey, data: unknown, aad: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(aad) },
    key,
    enc.encode(JSON.stringify(data)),
  );
  return { ciphertext: b64(ct), iv: b64(iv) };
}

export async function openWith<T = unknown>(key: CryptoKey, ciphertext: string, iv: string, aad: string): Promise<T> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(iv), additionalData: enc.encode(aad) },
    key,
    unb64(ciphertext),
  );
  return JSON.parse(dec.decode(pt)) as T;
}

export async function seal(data: unknown, aad: string) {
  return sealWith(await getKey(), data, aad);
}
export async function open<T = unknown>(ciphertext: string, iv: string, aad: string) {
  return openWith<T>(await getKey(), ciphertext, iv, aad);
}

export async function sha256Hex(value: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32): string {
  const u = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(u).map((b) => b.toString(16).padStart(2, "0")).join("");
}
