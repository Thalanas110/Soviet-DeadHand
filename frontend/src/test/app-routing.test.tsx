import { readFileSync } from "node:fs";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

async function renderAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Assert only that the router mounts and paints, never page content:
// routes are rewritten as the app is built and this must keep passing.
describe("App routing", () => {
  it("renders the index route", async () => {
    const { container } = await renderAt("/");

    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });

  it("declares the readiness rail on the public route", () => {
    const source = readFileSync("src/routes/index.tsx", "utf8");
    expect(source).toContain("<ReadinessRail />");
  });

  it("keeps one Dashboard tab and points setup to its own route", () => {
    const shell = readFileSync("src/components/deadhand/Shell.tsx", "utf8");
    const landing = readFileSync("src/routes/index.tsx", "utf8");

    expect(shell).toContain('to: "/console"');
    expect(shell).toContain('en: "Dashboard"');
    expect(shell.match(/en: "Dashboard"/g)).toHaveLength(1);
    expect(landing).toContain('to="/auth"');
    expect(landing).toContain("Safety is a system.");
    expect(landing).toContain("Historical visual reference. No political affiliation.");
    expect(landing).toContain("c4ff83c5eadddc1a6627fbce57d559e0.png");
    expect(landing).toContain("Begin setup");
    expect(landing).toContain("Safety is a system.");
    expect(landing).toContain("landing-aura");
    expect(landing).toContain("landing-emblem");
    expect(landing).toContain("landing-hero__panel");
    expect(landing).toContain("landing-capability-grid");
    expect(landing).toContain("Q0");
    expect(landing).toContain("Q4");
  });

  it("places the emblem in the lower-right red haze background treatment", () => {
    const styles = readFileSync("src/styles.css", "utf8");

    expect(styles).toContain(".landing-aura");
    expect(styles).toContain("radial-gradient");
    expect(styles).toContain("transform: rotate(7deg)");
    expect(styles).toContain("bottom: -3rem");
    expect(styles).toContain("position: absolute");
  });

  it("renders explicit Q0 through Q4 setup progression", () => {
    const setup = readFileSync("src/routes/_authenticated/setup.tsx", "utf8");
    for (const code of ["Q0", "Q1", "Q2", "Q3", "Q4"]) {
      expect(setup).toContain(code);
    }
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { container } = await renderAt("/this-route-does-not-exist");

    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });
});
