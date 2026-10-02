import { describe, expect, it } from "vitest";
import { passwordSchema, setPinsSchema } from "@/lib/schemas";

describe("password credentials", () => {
  it("accepts an 8-character mixed password and longer passwords", () => {
    expect(passwordSchema.safeParse("A7!alpha").success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(64)).success).toBe(true);
  });

  it("rejects passwords outside the 8–64 character policy", () => {
    expect(passwordSchema.safeParse("A7!abc").success).toBe(false);
    expect(passwordSchema.safeParse("a".repeat(65)).success).toBe(false);
  });

  it("requires distinct check-in and duress passwords", () => {
    expect(setPinsSchema.safeParse({ checkin: "A7!alpha", duress: "A7!alpha" }).success).toBe(
      false,
    );
    expect(setPinsSchema.safeParse({ checkin: "A7!alpha", duress: "B8@bravo" }).success).toBe(true);
  });
});
