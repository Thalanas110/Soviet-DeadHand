# Password Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the numeric 4–8 digit PIN experience with an 8–64 character password experience while preserving the existing Supabase database columns, action payload names, covert duress behavior, and Q0–Q4 automaton.

**Architecture:** Keep `pin`, `checkin_pin_hash`, and `duress_pin_hash` as internal compatibility names because the database already stores bcrypt hashes and the edge RPCs accept text. Introduce one shared password policy in the frontend and Supabase edge-function schemas, replace the numeric `PinPad` with a password prompt, and update the settings form copy/constraints.

**Tech Stack:** React 19, TanStack Router, Vitest + Testing Library, Zod, Supabase Edge Functions, PostgreSQL `crypt`/bcrypt.

## Global Constraints

- Passwords must be 8–64 characters and may contain letters, numbers, and symbols.
- Check-in and duress passwords must remain different.
- Server-side edge-function validation remains authoritative; frontend validation is convenience only.
- Existing action fields (`pin`, `current`, `checkin`, `duress`) and database columns remain unchanged.
- Existing alarm enum names and Q0–Q4 automaton state names must not change.
- Do not log or persist plaintext passwords outside the existing server-side bcrypt hashing flow.
- Preserve mobile-safe dialogs, keyboard accessibility, and password visibility controls.

---

### Task 1: Define and test the password policy

**Files:**
- Modify: `frontend/src/lib/schemas.ts`
- Modify: `supabase/functions/_shared/schemas.ts`
- Create: `frontend/src/test/password-schema.test.ts`

**Interfaces:**
- Produces `passwordSchema`, a Zod string schema accepting 8–64 characters.
- Existing action payload keys remain named `pin` for compatibility.

- [ ] **Step 1: Write the failing frontend schema tests**

```tsx
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
    expect(
      setPinsSchema.safeParse({ checkin: "A7!alpha", duress: "A7!alpha" }).success,
    ).toBe(false);
    expect(
      setPinsSchema.safeParse({ checkin: "A7!alpha", duress: "B8@bravo" }).success,
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run from `frontend/`:

```powershell
npm.cmd test -- --run src/test/password-schema.test.ts
```

Expected: FAIL because the current schema only accepts digits and does not export `passwordSchema`.

- [ ] **Step 3: Implement the shared password policy**

In both schema files, add:

```ts
export const passwordSchema = z
  .string()
  .min(8, "Password must be 8–64 characters")
  .max(64, "Password must be 8–64 characters");
```

Use `passwordSchema` for `checkin`, `duress`, and action `pin` validation. Keep the `current` field optional with `.max(64)` so the first setup request can continue sending an empty current value; the database function remains responsible for checking the current credential when credentials are already configured.

- [ ] **Step 4: Run the focused test and verify it passes**

```powershell
npm.cmd test -- --run src/test/password-schema.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit the policy change**

```powershell
git add frontend/src/lib/schemas.ts frontend/src/test/password-schema.test.ts supabase/functions/_shared/schemas.ts
git commit -m "feat: allow password-style operator credentials"
```

### Task 2: Replace the numeric PIN prompt with a password prompt

**Files:**
- Modify: `frontend/src/components/deadhand/PinPad.tsx`
- Create: `frontend/src/test/password-prompt.test.tsx`

**Interfaces:**
- Keeps the existing `PinPad` export and `onSubmit(pin: string)` signature so console actions remain unchanged.
- Renders one native password input instead of a numeric keypad.

- [ ] **Step 1: Write the failing component test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PinPad } from "@/components/deadhand/PinPad";

it("accepts a mixed-character password without rendering a numeric keypad", () => {
  const onSubmit = vi.fn();
  render(<PinPad title="Authenticate" onSubmit={onSubmit} onCancel={vi.fn()} />);

  const input = screen.getByLabelText("Password");
  expect(input).toHaveAttribute("type", "password");
  expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();

  fireEvent.change(input, { target: { value: "A7!alpha" } });
  fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
  expect(onSubmit).toHaveBeenCalledWith("A7!alpha");
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

```powershell
npm.cmd test -- --run src/test/password-prompt.test.tsx
```

Expected: FAIL because the current component has no labeled password input and its confirm control is disabled for non-digit input.

- [ ] **Step 3: Implement the password prompt**

Replace the keypad state/actions with a controlled input capped at 64 characters. Use `type="password"`, `maxLength={64}`, `autoComplete="current-password"`, a show/hide toggle, and a disabled confirm button until the value has at least 8 characters. Keep cancel behavior and the existing `onSubmit` prop.

- [ ] **Step 4: Run focused and adjacent tests**

```powershell
npm.cmd test -- --run src/test/password-prompt.test.tsx src/test/readiness-rail.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit the prompt change**

```powershell
git add frontend/src/components/deadhand/PinPad.tsx frontend/src/test/password-prompt.test.tsx
git commit -m "feat: replace numeric pin pad with password prompt"
```

### Task 3: Update password setup and stand-down controls

**Files:**
- Modify: `frontend/src/routes/_authenticated/settings.tsx`

**Interfaces:**
- Sends the same `setPins` and `standDown` action shapes to `operatorApi`.
- Uses password labels and browser password-manager semantics without exposing credential values.

- [ ] **Step 1: Update the settings form constraints and copy**

Remove `inputMode="numeric"`; set `minLength={8}` and `maxLength={64}` on current, check-in, duress, and stand-down password fields; use `autoComplete="current-password"` for current/stand-down and `autoComplete="new-password"` for new credentials. Update placeholders, error text, and helper copy from PIN/code terminology to password terminology while retaining “duress” semantics.

- [ ] **Step 2: Run the full frontend tests and typecheck**

```powershell
npm.cmd test -- --run
npx.cmd tsc --noEmit
```

Expected: all tests pass and TypeScript exits successfully.

- [ ] **Step 3: Commit the setup change**

```powershell
git add frontend/src/routes/_authenticated/settings.tsx
git commit -m "feat: make credential setup password-based"
```

### Task 4: Run the complete verification gate

**Files:**
- Verify only; no new product files.

- [ ] **Step 1: Run all local CI-equivalent checks**

From `frontend/`:

```powershell
npx.cmd tsc --noEmit
npm.cmd test -- --run
npm.cmd run build
npm.cmd run lint
```

Expected: typecheck, tests, build, and lint exit 0. Existing Fast Refresh warnings may remain; no new lint errors are acceptable.

- [ ] **Step 2: Audit compatibility and secrets**

```powershell
rg -n "pinSchema|passwordSchema|inputMode=\"numeric\"|maxLength=\{8\}|Q[0-4]|safety_state" frontend/src supabase/functions supabase/migrations
git diff --check
git status --short
```

Expected: password validation is present in both frontend and edge schemas; no numeric PIN input remains in the settings/prompt UI; Q0–Q4 and database alarm enum names are unchanged; the worktree contains only intended files.

- [ ] **Step 3: Commit only if verification changed files**

The implementation commits above are the final product commits. Do not stage generated `dist/`, dependency trees, environment files, or the user’s untracked alarm MP3.
