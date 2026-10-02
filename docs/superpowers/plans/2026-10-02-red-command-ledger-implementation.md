# Red Command Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the client-only Dead Hand interface into a red-dominant, highly militarized command-post experience while retaining neutral safety-product copy and a custom repository-native favicon.

**Architecture:** The visual system is centralized in `frontend/src/styles.css` through Industrial tokens and reusable utilities. A small presentational readiness-rail component provides the recurring visual motif; routes and shell consume it without changing API, automaton, or backend behavior. The favicon is an SVG served from `frontend/public/` and linked from `frontend/index.html`.

**Tech Stack:** React 19, TanStack Router, Tailwind CSS v4, Vitest, Testing Library, Vite, repository-native SVG.

## Global Constraints

- The frontend remains client-only; no browser database queries or backend changes.
- Preserve Q0-Q4 automaton behaviour and semantic `safety_state` values exactly.
- Use the Industrial anchor: warm-black `#0B0C0A`, monospaced type only, flat 1px borders, square controls, and alarm red `#FF3B30` as the sole signal colour.
- Keep the existing safety/product copy factual; add no political slogans, party symbols, fabricated telemetry, or filler labels.
- Add a custom repository-native SVG favicon; do not use externally sourced imagery.
- Preserve responsive navigation, keyboard operation, contrast, and `prefers-reduced-motion` support.

---

### Task 1: Add the reusable readiness rail

**Files:**
- Create: `frontend/src/components/deadhand/ReadinessRail.tsx`
- Create: `frontend/src/test/readiness-rail.test.tsx`

**Interfaces:**
- Produces: `ReadinessRail({ active?: boolean; className?: string }): JSX.Element`.
- Consumed by: `frontend/src/components/deadhand/Shell.tsx` and `frontend/src/routes/index.tsx`.

- [ ] **Step 1: Write the failing component test**

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ReadinessRail } from "@/components/deadhand/ReadinessRail";

it("marks an active readiness rail as decorative", () => {
  render(<ReadinessRail active />);
  expect(screen.getByTestId("readiness-rail")).toHaveAttribute("aria-hidden", "true");
  expect(screen.getByTestId("readiness-rail")).toHaveClass("is-active");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- --run src/test/readiness-rail.test.tsx` from `frontend/`.

Expected: FAIL because the `ReadinessRail` module does not exist.

- [ ] **Step 3: Implement the decorative rail**

```tsx
import { cn } from "@/lib/utils";

export function ReadinessRail({ active = false, className }: { active?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("readiness-rail", active && "is-active", className)}
      data-testid="readiness-rail"
    />
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd test -- --run src/test/readiness-rail.test.tsx` from `frontend/`.

Expected: PASS with 1 test.

- [ ] **Step 5: Commit the component and test**

```powershell
git add frontend/src/components/deadhand/ReadinessRail.tsx frontend/src/test/readiness-rail.test.tsx
git commit -m "feat: add command readiness rail"
```

### Task 2: Establish Industrial CSS tokens and motion policy

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `frontend/index.html`

**Interfaces:**
- Consumes: `.readiness-rail` emitted by `ReadinessRail`.
- Produces: `plate`, `crt`, `hazard`, `readiness-rail`, `command-grid`, and `@media (prefers-reduced-motion: reduce)` styling contracts used by all routes.

- [ ] **Step 1: Write the failing visual-contract test**

```tsx
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("defines the command ledger red signal token and reduced-motion rule", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  expect(css).toContain("--signal-red: #ff3b30");
  expect(css).toContain("prefers-reduced-motion: reduce");
});
```

Add this test to `frontend/src/test/readiness-rail.test.tsx`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- --run src/test/readiness-rail.test.tsx` from `frontend/`.

Expected: FAIL because `--signal-red` and the reduced-motion media rule are absent.

- [ ] **Step 3: Retokenize the global stylesheet and font link**

Implement these exact visual constraints:

```css
:root {
  --background: #0b0c0a;
  --panel: #11130f;
  --steel: #31362e;
  --signal-red: #ff3b30;
  --foreground: #e5e8df;
}

.readiness-rail { background: var(--steel); }
.readiness-rail.is-active { background: var(--signal-red); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```

Use only the existing JetBrains Mono font family in `frontend/index.html` and the theme; remove the Russo One import and display-font fallback. Keep all surfaces flat, square, and border-defined; replace amber-first glows, soft shadows, and rounded decorative circles with restrained red linework and scanlines.

- [ ] **Step 4: Run the test and production build**

Run:

```powershell
npm.cmd test -- --run src/test/readiness-rail.test.tsx
npm.cmd run build
```

Expected: PASS and Vite build exit 0.

- [ ] **Step 5: Commit the visual foundation**

```powershell
git add frontend/src/styles.css frontend/index.html frontend/src/test/readiness-rail.test.tsx
git commit -m "feat: establish red command ledger theme"
```

### Task 3: Create and install the custom favicon

**Files:**
- Create: `frontend/public/favicon.svg`
- Modify: `frontend/index.html`
- Modify: `frontend/src/test/readiness-rail.test.tsx`

**Interfaces:**
- Produces: `/favicon.svg`, a 64-by-64 geometric beacon mark with a warm-black base, steel frame, and alarm-red concentric signal geometry.
- Consumed by: browser tab metadata in `frontend/index.html`.

- [ ] **Step 1: Write the failing favicon contract test**

```tsx
it("uses the custom SVG favicon", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const favicon = readFileSync(new URL("../../public/favicon.svg", import.meta.url), "utf8");
  expect(html).toContain('href="/favicon.svg"');
  expect(favicon).toContain('viewBox="0 0 64 64"');
  expect(favicon).toContain("#ff3b30");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- --run src/test/readiness-rail.test.tsx` from `frontend/`.

Expected: FAIL because `/favicon.svg` does not exist and the HTML still references `.ico`.

- [ ] **Step 3: Create the SVG and link it**

Create a simple, original SVG with a dark square field, a framed circular beacon, three red radial segments, and no text, flags, stars, hammers, sickles, or political imagery. Replace the existing favicon link with:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
```

- [ ] **Step 4: Run the test and build**

Run:

```powershell
npm.cmd test -- --run src/test/readiness-rail.test.tsx
npm.cmd run build
```

Expected: PASS and build exit 0.

- [ ] **Step 5: Commit the favicon**

```powershell
git add frontend/public/favicon.svg frontend/index.html frontend/src/test/readiness-rail.test.tsx
git commit -m "feat: add command beacon favicon"
```

### Task 4: Apply the command-ledger composition to the product routes

**Files:**
- Modify: `frontend/src/components/deadhand/Shell.tsx`
- Modify: `frontend/src/routes/index.tsx`
- Modify: `frontend/src/routes/auth.tsx`
- Modify: `frontend/src/routes/_authenticated/console.tsx`
- Modify: `frontend/src/test/app-routing.test.tsx`

**Interfaces:**
- Consumes: `ReadinessRail`, Industrial CSS utilities, existing route data, and existing `OperatorStatus.automaton_state`.
- Produces: consistent red readiness rail, readable state hierarchy, and unchanged route/access behavior.

- [ ] **Step 1: Write the failing routing/landmark test**

```tsx
it("keeps the command navigation and renders the readiness rail", async () => {
  await renderRoute("/auth");
  expect(screen.getByRole("main")).toBeInTheDocument();
  expect(screen.getAllByTestId("readiness-rail").length).toBeGreaterThan(0);
});
```

Use the existing route-test setup and adjust the route path only if its helper requires an authenticated route fixture.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- --run src/test/app-routing.test.tsx` from `frontend/`.

Expected: FAIL because the requested route does not yet render a readiness rail.

- [ ] **Step 3: Restyle the routes without changing product behavior**

Apply these composition rules:

- `Shell`: mount a passive readiness rail at the left edge; use a red active-nav indicator and narrow steel header divider.
- Landing: replace the circular radar treatment with squared instrument geometry and a red beacon field; preserve all current factual safety copy and route links.
- Auth: give the form a flat, left-aligned command-card layout with a red top rule; do not alter form labels, validation, or sign-in behavior.
- Console: use `automaton_state` only to brighten the readiness rail and state frame for Q3/Q4; retain existing timers, buttons, safety actions, and neutral confirmation wording.
- Mobile: retain the bottom navigation and ensure the rail never blocks content or touch targets.

- [ ] **Step 4: Run route tests and inspect responsive rendering**

Run:

```powershell
npm.cmd test -- --run src/test/app-routing.test.tsx
npm.cmd run build
```

Inspect `/`, `/auth`, and `/console` at desktop and mobile widths. Confirm that the rail is decorative, red is dominant but readable, and no political symbols or fabricated status data appear.

- [ ] **Step 5: Commit the route restyle**

```powershell
git add frontend/src/components/deadhand/Shell.tsx frontend/src/routes/index.tsx frontend/src/routes/auth.tsx frontend/src/routes/_authenticated/console.tsx frontend/src/test/app-routing.test.tsx
git commit -m "feat: restyle command post interface"
```

### Task 5: Run the complete frontend quality gate

**Files:**
- Verify: `frontend/src/**`

**Interfaces:**
- Verifies: all visual additions build without changing routing, automaton behaviour, or Edge Function boundaries.

- [ ] **Step 1: Run all frontend checks**

```powershell
npx.cmd tsc --noEmit
npm.cmd test -- --run
npm.cmd run build
npm.cmd run lint
```

Expected: TypeScript, tests, build, and lint exit 0. Record any existing warnings separately from errors.

- [ ] **Step 2: Audit frontend/backend boundaries and whitespace**

```powershell
git diff --check
rg -n 'supabase\.from|supabase\.rpc|createServerFn|useServerFn|@tanstack/react-start|SUPABASE_SERVICE_ROLE_KEY|DEADHAND_DATA_KEY' frontend/src
```

Expected: `git diff --check` exits 0; the boundary search returns no matches.

- [ ] **Step 3: Commit final polish**

```powershell
git add frontend
git commit -m "chore: verify command ledger frontend"
```

## Self-Review

- Spec coverage: Tasks 1-4 implement the red command-ledger direction, readiness rail, favicon, Industrial styling, responsive route treatment, and no-propaganda content constraints. Task 5 covers verification.
- Placeholder scan: no unresolved placeholders or unspecified implementation steps remain.
- Type consistency: `ReadinessRail` is defined in Task 1 and used by Tasks 2 and 4; `OperatorStatus.automaton_state` remains the console state input and is not modified.
