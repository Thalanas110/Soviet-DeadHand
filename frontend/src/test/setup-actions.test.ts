import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authorizeSetupContact,
  registerSetupDevice,
  saveSetupPasswords,
} from "@/lib/setup-actions";

const { action, add } = vi.hoisted(() => ({
  action: vi.fn(),
  add: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  operatorApi: { action },
  contactsApi: { add },
}));

beforeEach(() => vi.clearAllMocks());

describe("setup actions", () => {
  it("saves distinct passwords through the operator API", async () => {
    action.mockResolvedValue({ ok: true });

    await expect(
      saveSetupPasswords({
        current: "old-password",
        checkin: "check-password",
        duress: "duress-password",
      }),
    ).resolves.toEqual({ ok: true });
    expect(action).toHaveBeenCalledWith({
      action: "setPins",
      current: "old-password",
      checkin: "check-password",
      duress: "duress-password",
    });
  });

  it("turns a rejected current password into an actionable error", async () => {
    action.mockResolvedValue({ ok: false, error: "PIN_REJECTED" });

    await expect(
      saveSetupPasswords({
        current: "wrong",
        checkin: "check-password",
        duress: "duress-password",
      }),
    ).rejects.toThrow("Current password rejected");
  });

  it("returns a device token associated with its registered kind", async () => {
    action.mockResolvedValue({ ok: true, token: "device-token" });

    await expect(registerSetupDevice({ label: "Primary phone", kind: "phone" })).resolves.toEqual({
      token: "device-token",
      kind: "phone",
    });
    expect(action).toHaveBeenCalledWith({
      action: "registerDevice",
      label: "Primary phone",
      kind: "phone",
    });
  });

  it("rejects a device registration without a one-time token", async () => {
    action.mockResolvedValue({ ok: true });

    await expect(registerSetupDevice({ label: "Primary phone", kind: "phone" })).rejects.toThrow(
      "Registration failed",
    );
  });

  it("authorizes contacts through the contacts API", async () => {
    add.mockResolvedValue({ ok: true });
    const input = {
      alias: "Emergency contact",
      name: "Contact",
      email: "contact@example.test",
      phone: "",
      priority: 1,
    };

    await expect(authorizeSetupContact(input)).resolves.toEqual({ ok: true });
    expect(add).toHaveBeenCalledWith(input);
  });
});
