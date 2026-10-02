import { describe, expect, it } from "vitest";
import { tokenForDeviceKind, type SetupDeviceToken } from "@/lib/setup-device-token";

describe("setup device tokens", () => {
  it("only returns a token for the matching device kind", () => {
    const phoneToken: SetupDeviceToken = { token: "phone-token", kind: "phone" };

    expect(tokenForDeviceKind(phoneToken, "phone")).toBe("phone-token");
    expect(tokenForDeviceKind(phoneToken, "wearable")).toBeNull();
  });
});
