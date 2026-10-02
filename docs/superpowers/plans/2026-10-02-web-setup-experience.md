# Web Setup Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a web-only setup experience that routes incomplete operators through configuration while keeping one live Dashboard tab for the existing console.

**Architecture:** Add a pure readiness model over the existing operator snapshot and contact list, use it to select `/setup` or `/console` after authentication, and implement `/setup` as a desktop-first staged configuration route. Keep `/console` as the single Dashboard surface and reuse the existing typed Edge Function APIs for passwords, devices, and contacts.

**Tech Stack:** React 19, TypeScript, Vite, TanStack Router, TanStack Query, Supabase Edge Function APIs, Vitest, Testing Library, Tailwind CSS v4.

## Global Constraints

- Change only the web app under `frontend/`, its web tests, and focused documentation; do not touch Android or `.worktrees/native-android-safety-companion`.
- Keep `/console` as the only live Dashboard tab; `/setup` must not duplicate console monitoring or safety controls.
- Required setup stages are passwords, an active handset, and an authorized emergency contact; an active wearable is recommended and non-blocking.
- Use existing `operatorApi` and `contactsApi`; add no migrations, Edge Functions, backend state, or API contracts.
- Hold the Industrial visual anchor: `#0B0C0A`, JetBrains Mono/monospace, signal red `#FF3B30`, flat 1px borders, and restrained scanlines/grid.
- Use standard UI copy for standard actions; do not add fake telemetry, fake identities, Unicode icon substitutes, or filler status labels.
- Preserve the pre-existing untracked `frontend/public/Military Alarm - Sound FX Copyright Free.mp3` and never stage it.

---

### Task 1: Add and test the setup readiness model

**Files:**
- Create: `frontend/src/lib/setup-readiness.ts`
- Create: `frontend/src/test/setup-readiness.test.ts`

**Interfaces:**
- Consumes: `OperatorSnapshot` and `Contact` from `frontend/src/lib/api.ts`.
- Produces: `SetupStageId`, `SetupReadiness`, `deriveSetupReadiness`, `firstIncompleteStage`, and `hasRequiredSetup`.

- [ ] **Step 1: Write the failing readiness tests**

```ts
import { describe, expect, it } from "vitest";
import type { Contact, OperatorSnapshot } from "@/lib/api";
import { deriveSetupReadiness, firstIncompleteStage, hasRequiredSetup } from "@/lib/setup-readiness";

const contact = (authorized = true): Contact => ({
  id: "contact-1",
  alias: "Emergency contact",
  priority: 1,
  authorized,
  created_at: "2026-01-01",
  detail: { name: "Contact", email: "contact@example.test", phone: null },
});

const snapshot = (overrides: Partial<OperatorSnapshot> = {}): OperatorSnapshot => ({
  profile: { id: "operator", callsign: "OPERATOR", pins_configured: false, created_at: "2026-01-01" },
  status: null,
  devices: [],
  incidents: [],
  events: [],
  dispatches: [],
  lastLocation: null,
  ...overrides,
});

describe("setup readiness", () => {
  it("marks a fresh operator incomplete at passwords", () => {
    const readiness = deriveSetupReadiness(snapshot(), []);
    expect(readiness).toEqual({ passwords: false, handset: false, cascade: false, wearable: false });
    expect(firstIncompleteStage(readiness)).toBe("passwords");
    expect(hasRequiredSetup(readiness)).toBe(false);
  });

  it("ignores revoked devices and unauthorized contacts", () => {
    const readiness = deriveSetupReadiness(
      snapshot({
        profile: { id: "operator", callsign: "OPERATOR", pins_configured: true, created_at: "2026-01-01" },
        devices: [
          { id: "phone", label: "Phone", kind: "phone", last_seq: 0, last_seen_at: null, last_complete_at: null, created_at: "2026-01-01", revoked_at: "2026-01-02" },
          { id: "watch", label: "Watch", kind: "wearable", last_seq: 0, last_seen_at: null, last_complete_at: null, created_at: "2026-01-01", revoked_at: null },
        ],
      }),
      [contact(false)],
    );
    expect(readiness).toEqual({ passwords: true, handset: false, cascade: false, wearable: true });
    expect(hasRequiredSetup(readiness)).toBe(false);
  });

  it("recognizes complete required setup while keeping wearable optional", () => {
    const readiness = deriveSetupReadiness(
      snapshot({
        profile: { id: "operator", callsign: "OPERATOR", pins_configured: true, created_at: "2026-01-01" },
        devices: [{ id: "phone", label: "Phone", kind: "phone", last_seq: 0, last_seen_at: null, last_complete_at: null, created_at: "2026-01-01", revoked_at: null }],
      }),
      [contact()],
    );
    expect(firstIncompleteStage(readiness)).toBe("wearable");
    expect(hasRequiredSetup(readiness)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run src/test/setup-readiness.test.ts` from `frontend/`.

Expected: FAIL because `@/lib/setup-readiness` does not exist.

- [ ] **Step 3: Write the minimal readiness implementation**

```ts
import type { Contact, OperatorSnapshot } from "@/lib/api";

export type SetupStageId = "passwords" | "handset" | "cascade" | "wearable";
export type SetupReadiness = Record<SetupStageId, boolean>;

export function deriveSetupReadiness(
  snapshot: OperatorSnapshot | undefined,
  contacts: Contact[] | undefined,
): SetupReadiness {
  const devices = snapshot?.devices ?? [];
  return {
    passwords: snapshot?.profile?.pins_configured === true,
    handset: devices.some((device) => device.kind === "phone" && !device.revoked_at),
    cascade: (contacts ?? []).some((contact) => contact.authorized),
    wearable: devices.some((device) => device.kind === "wearable" && !device.revoked_at),
  };
}

export function firstIncompleteStage(readiness: SetupReadiness): SetupStageId | null {
  return (["passwords", "handset", "cascade", "wearable"] as const).find(
    (stage) => !readiness[stage],
  ) ?? null;
}

export function hasRequiredSetup(readiness: SetupReadiness) {
  return readiness.passwords && readiness.handset && readiness.cascade;
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --run src/test/setup-readiness.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/setup-readiness.ts frontend/src/test/setup-readiness.test.ts
git commit -m "feat: add web setup readiness model"
```

### Task 2: Route authenticated operators to setup or Dashboard

**Files:**
- Create: `frontend/src/lib/setup-routing.ts`
- Create: `frontend/src/test/setup-routing.test.ts`
- Modify: `frontend/src/routes/auth.tsx`

**Interfaces:**
- Consumes: the readiness model, `operatorApi`, and `contactsApi`.
- Produces: `loadSetupDestination(): Promise<"/setup" | "/console">`.

- [ ] **Step 1: Write the failing routing tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSetupDestination } from "@/lib/setup-routing";

const action = vi.fn();
const read = vi.fn();
const list = vi.fn();

vi.mock("@/lib/api", () => ({
  operatorApi: { action, read },
  contactsApi: { list },
}));

beforeEach(() => vi.clearAllMocks());

describe("post-auth destination", () => {
  it("bootstraps and routes incomplete operators to setup", async () => {
    action.mockResolvedValue({ ok: true });
    read.mockResolvedValue({ profile: { pins_configured: false }, devices: [] });
    list.mockResolvedValue([]);
    await expect(loadSetupDestination()).resolves.toBe("/setup");
    expect(action).toHaveBeenCalledWith({ action: "bootstrap" });
  });

  it("routes an operator with required setup to Dashboard", async () => {
    action.mockResolvedValue({ ok: true });
    read.mockResolvedValue({
      profile: { pins_configured: true },
      devices: [{ kind: "phone", revoked_at: null }],
    });
    list.mockResolvedValue([{ authorized: true }]);
    await expect(loadSetupDestination()).resolves.toBe("/console");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run src/test/setup-routing.test.ts`

Expected: FAIL because `@/lib/setup-routing` does not exist.

- [ ] **Step 3: Implement the API-backed destination helper**

```ts
import { contactsApi, operatorApi } from "@/lib/api";
import { deriveSetupReadiness, hasRequiredSetup } from "@/lib/setup-readiness";

export async function loadSetupDestination(): Promise<"/setup" | "/console"> {
  await operatorApi.action({ action: "bootstrap" });
  const [snapshot, contacts] = await Promise.all([operatorApi.read(), contactsApi.list()]);
  return hasRequiredSetup(deriveSetupReadiness(snapshot, contacts)) ? "/console" : "/setup";
}
```

- [ ] **Step 4: Update authentication navigation**

In `frontend/src/routes/auth.tsx`, use `loadSetupDestination` for both an existing session and a `SIGNED_IN` event:

```ts
const routeAuthenticatedUser = async () => {
  try {
    navigate({ to: await loadSetupDestination(), replace: true });
  } catch {
    toast.error("Could not load operator setup");
  }
};
```

Keep confirmation-only sign-up behavior unchanged. Do not navigate until a real session exists.

- [ ] **Step 5: Run focused tests and lint**

Run: `npm test -- --run src/test/setup-routing.test.ts src/test/password-schema.test.ts && npm run lint`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/setup-routing.ts frontend/src/test/setup-routing.test.ts frontend/src/routes/auth.tsx
git commit -m "feat: route incomplete operators to setup"
```

### Task 3: Build the authenticated setup dossier

**Files:**
- Create: `frontend/src/routes/_authenticated/setup.tsx`
- Create: `frontend/src/components/deadhand/SetupStage.tsx`
- Create: `frontend/src/test/setup-page.test.tsx`

**Interfaces:**
- Consumes: `useOperator`, `contactsApi`, `operatorApi`, `SetupReadiness`, and `SetupStageId`.
- Produces: `/setup` with four selectable stages, required readiness summary, one-time device-token display, and a link to the single Dashboard tab.

- [ ] **Step 1: Write the failing stage tests**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SetupStage } from "@/components/deadhand/SetupStage";

describe("SetupStage", () => {
  it("shows required versus incomplete without exposing password values", () => {
    render(
      <SetupStage id="passwords" title="Access passwords" required complete={false} active>
        <input aria-label="Check-in password" type="password" value="secret" readOnly />
      </SetupStage>,
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("marks a completed recommended stage", () => {
    render(
      <SetupStage id="wearable" title="Wearable" required={false} complete active={false}>
        <p>Optional device registration</p>
      </SetupStage>,
    );
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run src/test/setup-page.test.tsx`

Expected: FAIL because `SetupStage` does not exist.

- [ ] **Step 3: Implement the reusable stage shell**

```tsx
import type { ReactNode } from "react";
import type { SetupStageId } from "@/lib/setup-readiness";

export function SetupStage({
  id,
  title,
  required,
  complete,
  active,
  onSelect,
  children,
}: {
  id: SetupStageId;
  title: string;
  required: boolean;
  complete: boolean;
  active: boolean;
  onSelect?: () => void;
  children: ReactNode;
}) {
  return (
    <section className={"plate " + (active ? "border-primary" : "")} data-stage={id}>
      <button type="button" onClick={onSelect} className="flex w-full items-center justify-between border-b border-border px-3 py-3 text-left">
        <span>
          <span className="block text-[10px] uppercase tracking-[0.25em] text-primary">{title}</span>
          <span className="mt-1 block text-[10px] uppercase tracking-widest text-muted-foreground">
            {required ? "Required" : "Recommended"} · {complete ? "Ready" : "Incomplete"}
          </span>
        </span>
        <span className="font-display text-xs text-primary">{complete ? "Q0" : "—"}</span>
      </button>
      {active && <div className="p-4">{children}</div>}
    </section>
  );
}
```

- [ ] **Step 4: Implement `/setup` with existing API actions**

The route must:

1. Use `useOperator()` and a React Query contact list keyed by `["contacts"]`.
2. Derive readiness with `deriveSetupReadiness` and select `firstIncompleteStage`, defaulting to `passwords` while data is loading.
3. Render a desktop two-column dossier: a Q0–Q4 vertical readiness rail and stage list on the left; the active form and a concise readiness summary on the right.
4. Submit passwords through `readSetPinsForm`, `setPinsValidationMessage`, and `operatorApi.action({ action: "setPins", ...values })\), then invalidate `["operator"]`.
5. Register devices through `operatorApi.action({ action: "registerDevice", label, kind })\), show the returned token once, and invalidate `["operator"]`.
6. Authorize contacts through `contactsApi.add({ alias, name, email, phone, priority })\), then invalidate `["contacts"]`.
7. Render wearable registration as recommended and non-blocking.
8. Provide a single `Link` to `/console` labeled `Open Dashboard`; do not render console telemetry or safety controls in setup.
9. Use standard labels such as `Save`, `Register`, `Authorize`, `Continue`, and `Open Dashboard`.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --run src/test/setup-page.test.tsx src/test/setup-readiness.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/routes/_authenticated/setup.tsx frontend/src/components/deadhand/SetupStage.tsx frontend/src/test/setup-page.test.tsx
git commit -m "feat: add authenticated web setup dossier"
```

### Task 4: Make Dashboard singular and increase landing-page Sovietization

**Files:**
- Modify: `frontend/src/components/deadhand/Shell.tsx`
- Modify: `frontend/src/routes/index.tsx`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/test/app-routing.test.tsx`

**Interfaces:**
- Consumes: existing route links and Industrial CSS tokens.
- Produces: one authenticated Dashboard navigation target at `/console`, setup access without a second dashboard, and a landing page with a visible setup map.

- [ ] **Step 1: Add failing source-level assertions**

Extend `frontend/src/test/app-routing.test.tsx`:

```ts
it("keeps one Dashboard tab and points setup to its own route", () => {
  const shell = readFileSync("src/components/deadhand/Shell.tsx", "utf8");
  const landing = readFileSync("src/routes/index.tsx", "utf8");
  expect(shell).toContain('to: "/console"');
  expect(shell).toContain('en: "Dashboard"');
  expect(shell.match(/en: "Dashboard"/g)).toHaveLength(1);
  expect(landing).toContain('to="/auth"');
  expect(landing).toContain("Комплекс");
  expect(landing).toContain("Настройка");
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run src/test/app-routing.test.tsx`

Expected: FAIL because the current navigation says `Console` and the landing copy is not setup-oriented.

- [ ] **Step 3: Update navigation**

Rename only the first nav label from `Console` to `Dashboard`, keep its target `/console`, and provide setup access from the setup page and a small desktop header link. Do not add a second Dashboard entry or duplicate console panels in setup. Keep the current mobile bottom navigation count and operational routes intact.

- [ ] **Step 4: Rewrite the landing page within the Industrial anchor**

Keep `#0B0C0A`, JetBrains Mono, `#FF3B30\), flat borders, and the existing scanline/grid treatment. Recompose the page as a command-post dossier with:

- `МЁРТВАЯ РУКА` with `Dead Hand` as the plain-English identification;
- meaningful text identifying `Комплекс «Периметр»` as the defensive personal safety system;
- a primary `Begin setup` action linking to `/auth`;
- a visible setup map naming passwords, handset, emergency cascade, and recommended wearable;
- the existing Q0–Q4 doctrine with Cyrillic labels paired with English explanations;
- CSS rule markers instead of Unicode bullet/icon substitutes;
- no fabricated session data, timestamps, telemetry, or fake operator identity.

Do not introduce warm paper, rounded cards, serif type, or a second neon accent.

- [ ] **Step 5: Add only focused setup-map CSS**

Add a named utility/class for the vertical setup map and reduced-motion behavior in `styles.css`. Keep borders flat and avoid rounded-corner or shadow tokens that conflict with Industrial.

- [ ] **Step 6: Run focused tests and lint**

Run: `npm test -- --run src/test/app-routing.test.tsx src/test/readiness-rail.test.tsx && npm run lint`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/deadhand/Shell.tsx frontend/src/routes/index.tsx frontend/src/styles.css frontend/src/test/app-routing.test.tsx
git commit -m "feat: make web landing setup-oriented"
```

### Task 5: Generate the route tree and run the complete frontend gate

**Files:**
- Create/modify generated output: `frontend/src/routeTree.gen.ts`
- Verify only: all files changed by Tasks 1–4

- [ ] **Step 1: Generate the TanStack file route tree**

From `frontend/`, run:

```bash
npx --yes --package @tanstack/router-cli tsr generate
```

Expected: `src/routeTree.gen.ts` includes `/setup`. Do not hand-edit generated route output.

- [ ] **Step 2: Run the complete frontend quality gate**

From `frontend/`, run:

```bash
npm run lint
npm run test
npm run build
```

Expected: all commands exit 0; no focused tests, skipped tests, disabled checks, or weakened assertions are introduced.

- [ ] **Step 3: Verify scope and diff hygiene**

From the repository root, run:

```bash
git diff --check
git status --short
git diff --name-only HEAD~4..HEAD
```

Expected: changed paths are limited to the web implementation, tests, generated route tree, and focused docs; the pre-existing alarm audio remains untracked and no Android worktree path appears.

- [ ] **Step 4: Commit generated route output if it is not already included**

```bash
git add frontend/src/routeTree.gen.ts
git commit -m "chore: generate setup route tree"
```
