import { describe, expect, it } from "vitest";
import { readSetPinsForm, setPinsValidationMessage } from "@/lib/schemas";

describe("set-pins validation", () => {
  it("reads check-in and duress values from their distinct form controls", () => {
    const form = document.createElement("form");
    form.innerHTML = `
      <input name="current" value="" />
      <input name="checkin" value="%%Morales911%%" />
      <input name="duress" value="Dimate105%!" />
    `;

    expect(readSetPinsForm(form)).toEqual({
      current: "",
      checkin: "%%Morales911%%",
      duress: "Dimate105%!",
    });
  });

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
