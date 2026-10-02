import { describe, expect, it } from "vitest";
import { setPinsValidationMessage } from "@/lib/schemas";

describe("set-pins validation", () => {
  it("reports when the check-in and duress passwords are identical", () => {
    expect(
      setPinsValidationMessage({
        current: "",
        checkin: "A7!alpha",
        duress: "A7!alpha",
      }),
    ).toBe("Duress password must differ from check-in password");
  });

  it("accepts two distinct passwords", () => {
    expect(
      setPinsValidationMessage({
        current: "",
        checkin: "A7!alpha",
        duress: "B8@bravo",
      }),
    ).toBeNull();
  });
});
