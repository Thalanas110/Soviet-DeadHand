import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ReadinessRail } from "@/components/deadhand/ReadinessRail";

it("marks an active readiness rail as decorative", () => {
  render(<ReadinessRail active />);
  expect(screen.getByTestId("readiness-rail")).toHaveAttribute("aria-hidden", "true");
  expect(screen.getByTestId("readiness-rail")).toHaveClass("is-active");
});
