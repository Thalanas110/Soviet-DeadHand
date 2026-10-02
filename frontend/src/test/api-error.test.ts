import { describe, expect, it } from "vitest";
import { formatApiError } from "@/lib/api";

describe("API errors", () => {
  it("includes non-sensitive validation details from an Edge Function response", async () => {
    const error = Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      context: new Response(
        JSON.stringify({
          error: "INVALID_REQUEST",
          details: [
            {
              code: "too_small",
              message: "Password must be 8-64 characters",
              path: ["checkin"],
            },
          ],
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    });

    await expect(formatApiError(error)).resolves.toBe(
      "Edge Function returned a non-2xx status code: checkin: Password must be 8-64 characters",
    );
  });
});
