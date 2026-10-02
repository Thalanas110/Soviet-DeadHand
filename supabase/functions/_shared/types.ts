export type JsonObject = Record<string, unknown>;

export type OperatorSnapshot = {
  profile: {
    id: string;
    callsign: string;
    pins_configured: boolean;
    created_at: string;
  } | null;
  status: JsonObject | null;
  devices: JsonObject[];
  incidents: JsonObject[];
  events: JsonObject[];
  dispatches: JsonObject[];
  lastLocation: JsonObject | null;
};

export type Contact = {
  id: string;
  alias: string;
  priority: number;
  authorized: boolean;
  name: string;
  email: string;
  phone: string;
};
