import { describe, expect, it } from "vitest";
import { resolveArmDisarmFeedback } from "@/lib/arm-disarm-feedback";

const status = (armed: boolean) => ({ armed });

describe("arm/disarm feedback", () => {
  it("confirms arming only when the refreshed status is armed", () => {
    expect(resolveArmDisarmFeedback({ requestedArmed: true, actionOk: true, status: status(true) })).toBe(
      "armed",
    );
  });

  it("confirms disarming only when the refreshed status is disarmed", () => {
    expect(
      resolveArmDisarmFeedback({ requestedArmed: false, actionOk: true, status: status(false) }),
    ).toBe("disarmed");
  });

  it("uses neutral signal feedback when duress leaves the requested state unchanged", () => {
    expect(
      resolveArmDisarmFeedback({ requestedArmed: false, actionOk: true, status: status(true) }),
    ).toBe("signal");
    expect(
      resolveArmDisarmFeedback({ requestedArmed: true, actionOk: true, status: status(false) }),
    ).toBe("signal");
  });

  it("reports rejected actions without implying a state change", () => {
    expect(
      resolveArmDisarmFeedback({ requestedArmed: false, actionOk: false, status: status(true) }),
    ).toBe("rejected");
  });
});
