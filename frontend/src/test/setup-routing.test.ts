import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSetupDestination } from "@/lib/setup-routing";

const { action, read, list } = vi.hoisted(() => ({
  action: vi.fn(),
  read: vi.fn(),
  list: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  operatorApi: { action, read },
  contactsApi: { list },
}));

beforeEach(() => vi.clearAllMocks());

describe("post-auth destination", () => {
  it("bootstraps and routes incomplete operators to setup", async () => {
    action.mockResolvedValue({ ok: true });
    read.mockResolvedValue({ profile: { pins_configured: false }, devices: [] });
    list.mockResolvedValue([]);

    await expect(loadSetupDestination()).resolves.toBe("/setup");
    expect(action).toHaveBeenCalledWith({ action: "bootstrap" });
  });

  it("routes an operator with required setup to Dashboard", async () => {
    action.mockResolvedValue({ ok: true });
    read.mockResolvedValue({
      profile: { pins_configured: true },
      devices: [{ kind: "phone", revoked_at: null }],
    });
    list.mockResolvedValue([{ authorized: true }]);

    await expect(loadSetupDestination()).resolves.toBe("/console");
  });
});
