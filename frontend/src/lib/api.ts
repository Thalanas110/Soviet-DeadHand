import { supabase } from "@/integrations/supabase/client";
import type { ContactInput, RegisterDeviceInput, Telemetry } from "./schemas";
import type { AlarmState } from "./deadhand-state";

export type OperatorAction =
  | { action: "bootstrap" }
  | ({ action: "registerDevice" } & RegisterDeviceInput)
  | { action: "revokeDevice"; deviceId: string }
  | ({ action: "setPins" } & { current?: string; checkin: string; duress: string })
  | { action: "setArmed"; armed: boolean; pin: string }
  | { action: "standDown"; pin: string }
  | ({ action: "checkIn" } & Telemetry & { deviceId: string; pin: string })
  | { action: "silentAlarm"; deviceId: string | null }
  | { action: "unsafeReport"; deviceId: string | null }
  | ({ action: "heartbeat" } & Telemetry & { deviceId: string });

export type OperatorSnapshot = {
  profile: { id: string; callsign: string; pins_configured: boolean; created_at: string } | null;
  status: OperatorStatus | null;
  devices: Device[];
  incidents: Incident[];
  events: IncidentEvent[];
  dispatches: Dispatch[];
  lastLocation: LocationRecord | null;
};

export type OperatorStatus = {
  state: AlarmState;
  automaton_state: "Q0" | "Q1" | "Q2" | "Q3" | "Q4";
  armed: boolean;
  armed_at: string | null;
  state_entered_at: string;
  last_any_heartbeat_at: string | null;
  last_complete_heartbeat_at: string | null;
};
export type Device = {
  id: string;
  label: string;
  kind: "phone" | "wearable";
  last_seq: number;
  last_seen_at: string | null;
  last_complete_at: string | null;
  created_at: string;
  revoked_at: string | null;
};
export type Incident = {
  id: string;
  state: string;
  trigger: string;
  opened_at: string;
  resolved_at: string | null;
};
export type IncidentEvent = {
  id: string;
  created_at: string;
  rule: string;
  prev_state: string | null;
  new_state: string | null;
};
export type Dispatch = { id: string; priority: number; status: string; created_at: string };
export type LocationRecord = {
  lat: number;
  lng: number;
  accuracy: number | null;
  received_at: string;
};

export type ActionResult = {
  ok: boolean;
  error?: string;
  complete?: boolean;
  id?: string;
  token?: string;
  acknowledged_at?: string;
};

export async function formatApiError(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : "API request failed";
  const context = (error as { context?: unknown } | null)?.context;
  if (!(context instanceof Response)) return fallback;

  try {
    const payload = (await context.clone().json()) as {
      details?: Array<{ message?: string; path?: Array<string | number> }>;
      received?: {
        checkinLength?: number | null;
        duressLength?: number | null;
        valuesEqual?: boolean;
      };
    };
    const details = payload.details
      ?.map(({ message, path }) => `${path?.join(".") || "request"}: ${message || "invalid value"}`)
      .join("; ");
    const received = payload.received;
    const receivedSummary = received
      ? ` (received lengths checkin=${received.checkinLength ?? "?"}, duress=${received.duressLength ?? "?"}; valuesEqual=${received.valuesEqual ?? "?"})`
      : "";
    return details ? `${fallback}: ${details}${receivedSummary}` : fallback;
  } catch {
    return fallback;
  }
}

async function invoke<T>(functionName: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body: body as Record<string, unknown>,
  });
  if (error) throw new Error(await formatApiError(error));
  if (data === undefined) throw new Error("API returned no data");
  return data as T;
}

export const operatorApi = {
  read: () => invoke<OperatorSnapshot>("operator-read", { action: "snapshot" }),
  lastLocation: () =>
    invoke<OperatorSnapshot["lastLocation"]>("operator-read", { action: "lastLocation" }),
  action: (input: OperatorAction) => invoke<ActionResult>("operator-actions", input),
  telemetryEndpoint: `${import.meta.env["VITE_SUPABASE_URL"] ?? ""}/functions/v1/telemetry-ingest`,
};

export type Contact = {
  id: string;
  alias: string;
  priority: number;
  authorized: boolean;
  created_at: string;
  detail: { name: string; email: string; phone: string | null } | null;
};

export const contactsApi = {
  list: () => invoke<Contact[]>("contacts", { action: "list" }),
  add: (input: ContactInput) => invoke<{ ok: true }>("contacts", { action: "add", ...input }),
  remove: (contactId: string) =>
    invoke<{ ok: true; deauthorized: boolean }>("contacts", { action: "remove", contactId }),
};

export const telemetryApi = {
  ingest: (input: Telemetry, token: string) =>
    fetch(operatorApi.telemetryEndpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
};
