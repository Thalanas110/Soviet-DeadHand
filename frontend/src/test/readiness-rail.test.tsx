import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ReadinessRail } from "@/components/deadhand/ReadinessRail";

it("marks an active readiness rail as decorative", () => {
  render(<ReadinessRail active />);
  expect(screen.getByTestId("readiness-rail")).toHaveAttribute("aria-hidden", "true");
  expect(screen.getByTestId("readiness-rail")).toHaveClass("is-active");
});

it("defines the command ledger red signal token and reduced-motion rule", () => {
  const css = readFileSync("src/styles.css", "utf8");
  expect(css).toContain("--signal-red: #ff3b30");
  expect(css).toContain("prefers-reduced-motion: reduce");
});

it("uses the custom SVG favicon", () => {
  const html = readFileSync("index.html", "utf8");
  const favicon = readFileSync("public/favicon.svg", "utf8");
  expect(html).toContain('href="/favicon.svg"');
  expect(favicon).toContain('viewBox="0 0 64 64"');
  expect(favicon).toContain("#ff3b30");
});
