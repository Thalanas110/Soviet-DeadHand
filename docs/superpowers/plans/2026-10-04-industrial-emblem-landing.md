# Industrial Emblem Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the public landing page as a dark Industrial safety dossier with the existing emblem as a cataloged visual specimen, while preserving routes and behavior.

**Architecture:** Keep `frontend/src/routes/index.tsx` responsible for landing structure and authored copy. Keep landing-only layout, specimen, grid, and responsive rules in `frontend/src/styles.css`; do not change shared `plate`, `crt`, or glow utilities used by authenticated pages. Update the existing routing contract test for English-first content and preserved entry behavior.

**Tech Stack:** React 19, TanStack Router, Tailwind CSS v4, landing-specific CSS, Vitest, Testing Library, ESLint, Vite.

## Global Constraints

- Use Industrial tokens: warm-black `#0B0C0A`, monospace type, signal red `#FF3B30`, flat 1px borders, square corners.
- Public copy is English-first.
- The emblem is a historical graphic reference only; copy must not imply political affiliation or ideological endorsement.
- Use standard UI labels such as `Sign in` and `Begin setup`.
- Do not fabricate telemetry, operator identities, or pseudo-system readouts.
- Preserve TanStack Router paths and existing authentication/setup behavior.
- Reuse `frontend/public/c4ff83c5eadddc1a6627fbce57d559e0.png`.
- Do not modify Supabase, Android, or post-auth flows.
- Run `npm test -- --run`, `npm run lint`, and `npm run build` from `frontend/` before completion.

---

## File Map

- Modify `frontend/src/routes/index.tsx`: English-first landing structure and copy.
- Modify `frontend/src/styles.css`: landing-only Industrial layout and specimen rules.
- Modify `frontend/src/test/app-routing.test.tsx`: source-level public landing contract.

## Task 1: Lock the landing-page content contract

**Files:** Modify `frontend/src/test/app-routing.test.tsx` in the existing landing contract test.

**Interfaces:** Consume the public route source; produce regression assertions for English copy, preserved `/auth` entry points, the emblem asset, and the safety-only boundary.

- [ ] **Step 1: Replace mojibake-specific assertions with exact English contract assertions.** Keep the existing Dashboard assertions, then assert `to="/auth"`, `Personal safety, under your control`, `Historical visual reference. No political affiliation.`, the emblem filename, `Begin setup`, `Q0`, and `Q4`.
- [ ] **Step 2: Run the focused test and verify it fails for the expected reason.** From `frontend/`, run `npm test -- --run src/test/app-routing.test.tsx`. Expected: the landing contract fails because the old file lacks the new English-first headline/disclaimer.
- [ ] **Step 3: Confirm no existing route assertion is weakened.** Keep the checks for `to: "/console"`, exactly one `Dashboard` tab, the setup route, and Q0–Q4 progression. Do not use focused/skipped tests.
- [ ] **Step 4: Commit the contract test.** Run `git add frontend/src/test/app-routing.test.tsx; git commit -m "test: define English landing page contract"`.

## Task 2: Rebuild the landing route structure and copy

**Files:** Modify `frontend/src/routes/index.tsx`.

**Interfaces:** Consume TanStack Router `Link`, `ReadinessRail`, the existing emblem asset, and `/auth`; produce a public landing page with English-first copy, hero specimen, setup path, escalation model, and safety framing.

- [ ] **Step 1: Replace route metadata.** Use title `Dead Hand · Personal Safety Watchdog`; description `A defensive personal safety system for check-ins, trusted contacts, connected devices, and emergency escalation.`; use the same values for Open Graph title/description; keep type and Twitter metadata.
- [ ] **Step 2: Replace the stage arrays with authored English content.** Use:
  - Q0 / Monitoring / Registered devices report heartbeat signals.
  - Q1 / Check-in / A missed check-in opens the configured response window.
  - Q2 / Direct response / A second silence requests a direct response.
  - Q3 / Contact cascade / Trusted contacts are notified according to your configuration.
  - Q4 / Liveliness alert / An unresolved safety event is marked for follow-up.
  - 01 / Access credentials / Passwords for check-ins and duress / Required.
  - 02 / Primary handset / Connected phone for monitoring / Required.
  - 03 / Emergency contacts / Trusted contact cascade / Required.
  - 04 / Wearable bridge / Optional connected device / Recommended.
- [ ] **Step 3: Replace the header and hero.** Keep `<ReadinessRail />`, a compact brand row, and `Sign in` to `/auth`. Use kicker `Personal safety / setup`, headline `Personal safety, under your control.`, description `Dead Hand watches for missed check-ins, device silence, and configured distress signals—then follows the response path you choose.`, and `Begin setup` to `/auth`. Facts identify `Setup /setup`, `Dashboard /console`, and `Response path Q0–Q4`.
- [ ] **Step 4: Replace the emblem panel with the cataloged specimen.** Use `aria-labelledby="emblem-title"`, label `Historical visual reference`, the existing image source, alt text `Historical red emblem used as a visual reference for the product identity`, and footer copy `Safety-only system` plus `Historical visual reference. No political affiliation.`. Decorative crosshairs must use `aria-hidden="true"`.
- [ ] **Step 5: Replace lower sections.** Use headings `Set up the safety system` and `How the response path works`; keep required/recommended statuses; remove Russian strings and `Link sealed`; use `Complete the required items before opening the Dashboard.`; retain the footer disclaimer `Safety-only system. Not a replacement for calling emergency services.`.
- [ ] **Step 6: Run the focused routing test.** From `frontend/`, run `npm test -- --run src/test/app-routing.test.tsx`; expected PASS for the index route, readiness rail, public contract, setup progression, and not-found route.
- [ ] **Step 7: Commit route copy/structure.** Run `git add frontend/src/routes/index.tsx; git commit -m "feat: refocus landing copy around personal safety"`.

## Task 3: Implement the Industrial specimen layout

**Files:** Modify the landing-only blocks in `frontend/src/styles.css` around lines 220–415.

**Interfaces:** Consume landing class names and existing root CSS variables; produce responsive dark Industrial layout with flat panels, measured rules, keyboard-visible focus, and mobile-safe stacking.

- [ ] **Step 1: Replace landing-only layout rules.** Keep global tokens/utilities unchanged. Establish a ruled header, hero, section, and footer; use a stacked grid by default and at `min-width: 768px` use `grid-template-columns: minmax(0, 1.05fr) minmax(22rem, 0.95fr)`, centered alignment, and a 4rem gap.
- [ ] **Step 2: Make the specimen surface flat.** Do not use the shared `plate` utility on the landing page because it has a shadow. Give `.landing-seal` a `var(--panel)` background, 1px border, square corners, and padding; keep the crosshair geometry and image width `min(72%, 19rem)`; use borders/color only, with no landing-specific glow or box shadow.
- [ ] **Step 3: Add landing-only flat information surfaces.** Create `.landing-panel` and `.landing-stage-card` with `var(--panel)`/`var(--card)` backgrounds and 1px borders. Keep facts, setup list, and response cards legible through rules and spacing, not rounded cards, gradients, or decorative shadows.
- [ ] **Step 4: Add accessible focus and mobile behavior.** Add `.landing-page a:focus-visible` with a 2px signal-red outline and 3px offset. Below 480px, stack fact cells and allow the specimen footer to wrap without clipping. Preserve the reduced-motion media query.
- [ ] **Step 5: Run focused checks.** From `frontend/`, run `npm test -- --run src/test/app-routing.test.tsx` and `npm run lint`; expected exit code 0 for both.
- [ ] **Step 6: Commit styles.** Run `git add frontend/src/styles.css; git commit -m "style: build industrial emblem specimen landing"`.

## Task 4: Run the complete frontend quality gate

**Files:** Verify the three landing files above; do not modify Android or backend files.

**Interfaces:** Consume the completed public route and produce fresh local evidence for the repository frontend CI lane.

- [ ] **Step 1: Run `npm test -- --run` from `frontend/`.** Expected: Vitest exits 0, all existing tests pass, and no tests are skipped/focused.
- [ ] **Step 2: Run `npm run lint` from `frontend/`.** Expected: ESLint exits 0 with no errors.
- [ ] **Step 3: Run `npm run build` from `frontend/`.** Expected: Vite exits 0 and produces the production build.
- [ ] **Step 4: Inspect the final diff.** Run `git diff --check HEAD~3..HEAD` and `git status --short`; expected no whitespace errors and only intended landing/spec files, while preserving the pre-existing `frontend/public/favicon.ico` deletion without staging or reverting it.
- [ ] **Step 5: Report exact verification evidence.** If remote GitHub Actions is accessible, report the corresponding run; otherwise label remote CI unverified.
