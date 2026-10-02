import { describe, expect, it } from "vitest";
import type { Contact, OperatorSnapshot } from "@/lib/api";
import {
  deriveSetupReadiness,
  firstIncompleteStage,
  hasRequiredSetup,
} from "@/lib/setup-readiness";

const contact = (authorized = true): Contact => ({
  id: "contact-1",
  alias: "Emergency contact",
  priority: 1,
  authorized,
  created_at: "2026-01-01",
  detail: { name: "Contact", email: "contact@example.test", phone: null },
});

const snapshot = (overrides: Partial<OperatorSnapshot> = {}): OperatorSnapshot => ({
  profile: {
    id: "operator",
    callsign: "OPERATOR",
    pins_configured: false,
    created_at: "2026-01-01",
  },
  status: null,
  devices: [],
  incidents: [],
  events: [],
  dispatches: [],
  lastLocation: null,
  ...overrides,
});

describe("setup readiness", () => {
  it("marks a fresh operator incomplete at passwords", () => {
    const readiness = deriveSetupReadiness(snapshot(), []);

    expect(readiness).toEqual({
      passwords: false,
      handset: false,
      cascade: false,
      wearable: false,
    });
    expect(firstIncompleteStage(readiness)).toBe("passwords");
    expect(hasRequiredSetup(readiness)).toBe(false);
  });

  it("ignores revoked devices and unauthorized contacts", () => {
    const readiness = deriveSetupReadiness(
      snapshot({
        profile: {
          id: "operator",
          callsign: "OPERATOR",
          pins_configured: true,
          created_at: "2026-01-01",
        },
        devices: [
          {
            id: "phone",
            label: "Phone",
            kind: "phone",
            last_seq: 0,
            last_seen_at: null,
            last_complete_at: null,
            created_at: "2026-01-01",
            revoked_at: "2026-01-02",
          },
          {
            id: "watch",
            label: "Watch",
            kind: "wearable",
            last_seq: 0,
            last_seen_at: null,
            last_complete_at: null,
            created_at: "2026-01-01",
            revoked_at: null,
          },
        ],
      }),
      [contact(false)],
    );

    expect(readiness).toEqual({
      passwords: true,
      handset: false,
      cascade: false,
      wearable: true,
    });
    expect(hasRequiredSetup(readiness)).toBe(false);
  });

  it("recognizes complete required setup while keeping wearable optional", () => {
    const readiness = deriveSetupReadiness(
      snapshot({
        profile: {
          id: "operator",
          callsign: "OPERATOR",
          pins_configured: true,
          created_at: "2026-01-01",
        },
        devices: [
          {
            id: "phone",
            label: "Phone",
            kind: "phone",
            last_seq: 0,
            last_seen_at: null,
            last_complete_at: null,
            created_at: "2026-01-01",
            revoked_at: null,
          },
        ],
      }),
      [contact()],
    );

    expect(firstIncompleteStage(readiness)).toBe("wearable");
    expect(hasRequiredSetup(readiness)).toBe(true);
  });
});
