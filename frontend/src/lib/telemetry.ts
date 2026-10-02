// Browser-side telemetry collection. Pure sensor reads — never touches safety state.
import type { LocationSample, Telemetry } from "./schemas";

const DEVICE_KEY = "deadhand.handset.v1";
const SEQ_KEY = "deadhand.seq.v1";

export function getHandsetId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEVICE_KEY);
}
export function setHandsetId(id: string) {
  localStorage.setItem(DEVICE_KEY, id);
}
export function clearHandsetId() {
  localStorage.removeItem(DEVICE_KEY);
}

/** Strictly increasing per-device sequence (ms clock, never repeats even if the clock steps back). */
export function nextSeq(): number {
  const prev = Number(localStorage.getItem(SEQ_KEY) ?? "0");
  const n = Math.max(Date.now(), prev + 1);
  localStorage.setItem(SEQ_KEY, String(n));
  return n;
}

export function readLocation(timeoutMs = 15000): Promise<LocationSample | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          timestamp: Math.round(p.timestamp),
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

type BatteryLike = { level: number; charging: boolean };
export async function collectTelemetry(withLocation = true): Promise<Telemetry> {
  let battery: BatteryLike | null = null;
  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
    battery = nav.getBattery ? await nav.getBattery() : null;
  } catch {
    battery = null;
  }
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  const location = withLocation ? await readLocation() : null;
  return {
    seq: nextSeq(),
    clientTs: Date.now(),
    battery: battery ? Math.round(battery.level * 100) : null,
    charging: battery ? battery.charging : null,
    network: navigator.onLine ? (conn?.effectiveType ?? "online") : "offline",
    wearableConnected: null,
    location,
  };
}
