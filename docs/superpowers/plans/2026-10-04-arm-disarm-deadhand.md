# Arm and Disarm Dead Hand System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Dead Hand arm/disarm control enforce the normal password, preserve the check-in gate for disarming, and treat the duress password as an immediate Q3/Q4 escalation without falsely reporting a disarm.

**Architecture:** Keep `setArmed` as the single authenticated command. Add an additive SQL migration that fixes the authoritative `api_set_armed` PIN branch, then use a small frontend feedback helper to report success only after the refreshed server snapshot confirms the requested armed state. The dashboard remains a server-authoritative view and does not mutate safety state locally.

**Tech Stack:** React, TypeScript, TanStack Query, Vitest, Supabase Edge Functions, PostgreSQL/PLpgSQL migrations, ESLint, Vite.

## Global Constraints

- The normal check-in password authorizes ordinary arm/disarm actions.
- Disarming with the normal password succeeds only from Q0; Q1–Q4 requires a valid check-in first.
- The duress password never arms or disarms the system; Q0–Q2 → Q3, Q3 → Q4, and Q4 remains Q4.
- Any SQL change is an additive migration; existing migrations are not rewritten.
- Keep the existing server-authoritative API shape and preserve the user-authored favicon deletion outside this worktree.
- Do not weaken existing tests, lint, build, or CI checks.

---

### Task 1: Enforce normal and duress PIN behavior in the database

**Files:**
- Create: `supabase/migrations/20261004220000_arm_disarm_duress.sql`
- Create: `frontend/src/test/arm-disarm-migration.test.ts`

**Interfaces:**
- Consumes: Existing `profiles`, `safety_status`, `incident_events`, `_classify_pin`, and `_open_duress` database functions.
- Produces: A replacement `public.api_set_armed(_user uuid, _armed boolean, _pin text) returns jsonb` function with explicit `UNCONFIGURED`, `REJECTED`, `DURESS`, and normal-password branches.

- [ ] **Step 1: Write the failing migration contract test**

Create `frontend/src/test/arm-disarm-migration.test.ts`:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationDir = join(dirname(fileURLToPath(import.meta.url)), "../../../supabase/migrations");

function latestMigration() {
  const name = readdirSync(migrationDir)
    .filter((entry) => entry.endsWith(".sql"))
    .sort()
    .at(-1);
  if (!name) throw new Error("No Supabase migrations found");
  return readFileSync(join(migrationDir, name), "utf8");
}

describe("arm/disarm migration contract", () => {
  it("rejects unconfigured and rejected passwords before updating armed state", () => {
    const sql = latestMigration();

    expect(sql).toMatch(
      /if _cls in \('UNCONFIGURED','REJECTED'\) then[\s\S]*case when _cls = 'UNCONFIGURED' then 'PINS_NOT_CONFIGURED' else 'PIN_REJECTED' end/,
    );
  });

  it("routes duress input to the existing Q3/Q4 escalation helper", () => {
    const sql = latestMigration();

    expect(sql).toMatch(
      /if _cls = 'DURESS' then[\s\S]*perform public\._open_duress\(_user, null, null\);[\s\S]*return jsonb_build_object\('ok', true, 'acknowledged_at', now\(\)\);/,
    );
  });

  it("keeps normal disarm gated on the safe Q0 automaton state", () => {
    const sql = latestMigration();

    expect(sql).toContain("if not _armed and st.automaton_state <> 'Q0' then");
    expect(sql).toMatch(/update safety_status\s+set armed = _armed/);
  });
});
```

- [ ] **Step 2: Run the contract test and verify it fails for the missing rejected-PIN branch**

Run from the worktree root:

```powershell
npm test --prefix frontend -- --run src/test/arm-disarm-migration.test.ts
```

Expected: FAIL in the first test because the current latest migration only checks `UNCONFIGURED` in `api_set_armed`; the other two tests identify the existing behavior.

- [ ] **Step 3: Add the additive SQL migration**

Create `supabase/migrations/20261004220000_arm_disarm_duress.sql`:

```sql
begin;

create or replace function public.api_set_armed(_user uuid, _armed boolean, _pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  _cls text;
  st safety_status;
begin
  _cls := public._classify_pin(_user, _pin);
  if _cls in ('UNCONFIGURED','REJECTED') then
    return jsonb_build_object(
      'ok', false,
      'error', case when _cls = 'UNCONFIGURED' then 'PINS_NOT_CONFIGURED' else 'PIN_REJECTED' end
    );
  end if;

  if _cls = 'DURESS' then
    perform public._open_duress(_user, null, null);
    return jsonb_build_object('ok', true, 'acknowledged_at', now());
  end if;

  select * into st from safety_status where user_id = _user for update;
  if not _armed and st.automaton_state <> 'Q0' then
    return jsonb_build_object('ok', false, 'error', 'CHECK_IN_BEFORE_DISARM');
  end if;

  update safety_status
  set armed = _armed,
      armed_at = case when _armed then now() else armed_at end,
      updated_at = now()
  where user_id = _user;

  insert into incident_events(user_id, rule, actor, details)
  values (_user, case when _armed then 'ARMED' else 'DISARMED' end, 'operator', '{}'::jsonb);

  return jsonb_build_object('ok', true, 'acknowledged_at', now());
end $$;

commit;
```

This explicitly rejects invalid normal passwords before the state update, preserves the generic duress acknowledgement, and leaves `_open_duress` responsible for Q3/Q4 transitions and notification dispatches.

- [ ] **Step 4: Run the migration contract test and verify it passes**

Run:

```powershell
npm test --prefix frontend -- --run src/test/arm-disarm-migration.test.ts
```

Expected: 3 tests passed.

- [ ] **Step 5: Commit the database behavior and contract test**

```powershell
git add supabase/migrations/20261004220000_arm_disarm_duress.sql frontend/src/test/arm-disarm-migration.test.ts
git commit -m "fix: enforce dead hand arm and disarm pin rules"
```

### Task 2: Make dashboard feedback reflect the authoritative result

**Files:**
- Create: `frontend/src/lib/arm-disarm-feedback.ts`
- Create: `frontend/src/test/arm-disarm-feedback.test.ts`
- Modify: `frontend/src/routes/_authenticated/console.tsx:1-110`

**Interfaces:**
- Consumes: `OperatorStatus.armed`, the requested boolean, and the `ActionResult.ok` value returned by `operatorApi.action`.
- Produces: `resolveArmDisarmFeedback(input): "armed" | "disarmed" | "signal" | "rejected"`, used only for dashboard acknowledgement copy.

- [ ] **Step 1: Write the failing feedback tests**

Create `frontend/src/test/arm-disarm-feedback.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveArmDisarmFeedback } from "@/lib/arm-disarm-feedback";

const status = (armed: boolean) => ({ armed });

describe("arm/disarm feedback", () => {
  it("confirms arming only when the refreshed status is armed", () => {
    expect(resolveArmDisarmFeedback({ requestedArmed: true, actionOk: true, status: status(true) })).toBe("armed");
  });

  it("confirms disarming only when the refreshed status is disarmed", () => {
    expect(resolveArmDisarmFeedback({ requestedArmed: false, actionOk: true, status: status(false) })).toBe("disarmed");
  });

  it("uses neutral signal feedback when duress leaves the requested state unchanged", () => {
    expect(resolveArmDisarmFeedback({ requestedArmed: false, actionOk: true, status: status(true) })).toBe("signal");
    expect(resolveArmDisarmFeedback({ requestedArmed: true, actionOk: true, status: status(false) })).toBe("signal");
  });

  it("reports rejected actions without implying a state change", () => {
    expect(resolveArmDisarmFeedback({ requestedArmed: false, actionOk: false, status: status(true) })).toBe("rejected");
  });
});
```

- [ ] **Step 2: Run the feedback test and verify it fails because the helper does not exist**

Run:

```powershell
npm test --prefix frontend -- --run src/test/arm-disarm-feedback.test.ts
```

Expected: FAIL with the module/function missing.

- [ ] **Step 3: Implement the minimal feedback helper**

Create `frontend/src/lib/arm-disarm-feedback.ts`:

```ts
import type { OperatorStatus } from "@/lib/api";

export type ArmDisarmFeedback = "armed" | "disarmed" | "signal" | "rejected";

export function resolveArmDisarmFeedback({
  requestedArmed,
  actionOk,
  status,
}: {
  requestedArmed: boolean;
  actionOk: boolean;
  status: Pick<OperatorStatus, "armed"> | null | undefined;
}): ArmDisarmFeedback {
  if (!actionOk) return "rejected";
  if (status?.armed !== requestedArmed) return "signal";
  return requestedArmed ? "armed" : "disarmed";
}
```

- [ ] **Step 4: Run the feedback test and verify it passes**

Run:

```powershell
npm test --prefix frontend -- --run src/test/arm-disarm-feedback.test.ts
```

Expected: 4 tests passed.

- [ ] **Step 5: Update the dashboard action flow**

In `frontend/src/routes/_authenticated/console.tsx`, import `OperatorSnapshot` and `resolveArmDisarmFeedback`. Replace the `setArmed` branch in `onPin` with this flow:

```tsx
      } else {
        const requestedArmed = pad === "arm";
        const r = await operatorApi.action({ action: "setArmed", armed: requestedArmed, pin });
        if (!r.ok) {
          toast.error(
            r.error === "PINS_NOT_CONFIGURED"
              ? "Set your PINs under Codes first"
              : r.error === "CHECK_IN_BEFORE_DISARM"
                ? "Check in before disarming"
                : "Rejected",
          );
          return;
        }

        await qc.invalidateQueries({ queryKey: ["operator"] });
        const refreshed = qc.getQueryData<OperatorSnapshot>(["operator"]);
        const feedback = resolveArmDisarmFeedback({
          requestedArmed,
          actionOk: r.ok,
          status: refreshed?.status,
        });
        toast.success(
          feedback === "armed"
            ? "ВЗВЕДЕНО · Armed"
            : feedback === "disarmed"
              ? "Disarmed"
              : "Signal received",
        );
        setPad(null);
        return;
      }
```

Also add `import type { OperatorSnapshot } from "@/lib/api";` and `import { resolveArmDisarmFeedback } from "@/lib/arm-disarm-feedback";`. Keep the existing check-in branch’s query invalidation and prompt close behavior unchanged; the new early return ensures rejected arm/disarm actions keep the prompt open.

- [ ] **Step 6: Run the focused frontend tests**

Run:

```powershell
npm test --prefix frontend -- --run src/test/arm-disarm-feedback.test.ts src/test/arm-disarm-migration.test.ts src/test/password-prompt.test.tsx
```

Expected: all focused tests pass, including the existing password prompt test.

- [ ] **Step 7: Commit the dashboard behavior**

```powershell
git add frontend/src/lib/arm-disarm-feedback.ts frontend/src/test/arm-disarm-feedback.test.ts frontend/src/routes/_authenticated/console.tsx
git commit -m "fix: show authoritative dead hand arm status"
```

### Task 3: Run the complete repository quality gates

**Files:**
- Verify: `supabase/migrations/20261004220000_arm_disarm_duress.sql`
- Verify: `frontend/src/lib/arm-disarm-feedback.ts`
- Verify: `frontend/src/routes/_authenticated/console.tsx`

**Interfaces:**
- Consumes: The committed database migration, frontend feedback helper, and dashboard action flow.
- Produces: Fresh local evidence for every frontend CI lane and a clean feature diff.

- [ ] **Step 1: Run the complete frontend test lane**

```powershell
npm test --prefix frontend -- --run
```

Expected: exit code 0 with every test file passing and no focused or skipped tests.

- [ ] **Step 2: Run the frontend lint lane**

```powershell
npm run lint --prefix frontend
```

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: Run the frontend build lane**

```powershell
npm run build --prefix frontend
```

Expected: exit code 0 with a completed Vite production build.

- [ ] **Step 4: Validate the final diff and worktree**

```powershell
git diff --check HEAD~2..HEAD
git status --short --branch
git log --oneline -3
```

Expected: no whitespace errors, only the two feature commits on `feat/arm-disarm-deadhand`, and no unrelated file changes. If Supabase CLI/database credentials are unavailable, report SQL execution as unverified rather than claiming the migration ran remotely.

- [ ] **Step 5: Commit any necessary check-driven correction and rerun the affected gate**

If a check identifies a defect, write or update the smallest regression test first, make the minimal fix in the affected feature files, rerun the failing lane, and commit it with this focused command:

```powershell
git add supabase/migrations/20261004220000_arm_disarm_duress.sql frontend/src/lib/arm-disarm-feedback.ts frontend/src/test/arm-disarm-feedback.test.ts frontend/src/test/arm-disarm-migration.test.ts frontend/src/routes/_authenticated/console.tsx
git commit -m "fix: correct arm disarm verification feedback"
```

Do not weaken or skip a required CI lane to obtain a green result.
