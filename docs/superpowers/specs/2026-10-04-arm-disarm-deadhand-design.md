# Arm and Disarm Dead Hand System Design

## Goal

Add a verified end-to-end capability for an authenticated operator to arm or disarm the Dead Hand watchdog with the normal password, while preserving the duress-password behavior that silently escalates the system instead of changing its armed state.

## Approved behavior

- The normal check-in password authorizes ordinary arm/disarm actions.
- Arming succeeds when the normal password is valid and records the armed timestamp.
- Disarming with the normal password succeeds only from the safe Q0 state. If the automaton is in Q1–Q4, the operator must complete a valid check-in before disarming.
- The duress password never disarms the system and never arms it as a side effect.
- A duress password entered from Q0, Q1, or Q2 immediately transitions the automaton to Q3.
- A duress password entered from Q3 transitions the automaton to Q4.
- A duress password entered from Q4 leaves it in Q4.
- Duress transitions create or reuse a covert incident and execute the emergency notification cascade. The response remains intentionally non-distinguishing to the caller so an observer cannot tell which password was entered.
- The dashboard refreshes authoritative state after the action and must not display a false “Disarmed” result after duress escalation.

## Architecture and data flow

The existing `setArmed` action remains the single client-to-server command. The React dashboard opens the existing password prompt and sends `{ action: "setArmed", armed, pin }` through `operatorApi`. The `operator-actions` Edge Function validates the request schema and delegates to the database RPC `api_set_armed`.

The database remains authoritative. `api_set_armed` classifies the password server-side, applies the normal arm/disarm rules, or calls `_open_duress` for a duress password. `_open_duress` owns the Q3/Q4 transition and notification side effects. The function returns a generic successful acknowledgement for duress, and the dashboard invalidates the operator snapshot so the visible state comes from the server rather than from optimistic client state.

The implementation will preserve the current API shape and state names. Any SQL change will be an additive migration that replaces the RPC definition safely for existing installations; no existing migration will be rewritten.

## UI behavior and errors

- The existing dashboard control remains the entry point and reflects the current `status.armed` value.
- A successful normal arm shows an armed acknowledgement.
- A successful normal disarm shows a disarmed acknowledgement only after the refreshed snapshot confirms `armed: false`.
- A duress acknowledgement uses neutral wording such as “Signal received”; it does not claim that the system was disarmed.
- `PINS_NOT_CONFIGURED`, `PIN_REJECTED`, and `CHECK_IN_BEFORE_DISARM` retain explicit operator guidance.
- Failed requests leave the current server state visible and keep the password prompt open so the operator can retry or cancel. Successful requests close the prompt after the operator snapshot refresh is invalidated.

## Testing strategy

Tests will be written before implementation and will cover:

1. The action contract accepts arm and disarm requests with a valid normal password and rejects malformed password input.
2. The database migration contains the authoritative normal-password and duress-password branches, including the Q0–Q2 → Q3 → Q4 progression and the no-disarm guarantee.
3. The dashboard action handling distinguishes normal disarm from duress acknowledgement and refreshes the operator query after either result.
4. Existing frontend unit, component, lint, and build checks continue to pass.

Because the repository’s CI workflow does not currently provision a Supabase database locally, SQL behavior will be verified through the migration contract tests plus the existing Edge Function/schema tests; the final report will identify any remote Supabase validation that is not available locally.

## Scope boundaries

- No new authentication mechanism or PIN type.
- No client-side mutation of `safety_status`.
- No changes to watchdog timing, notification provider integration, or unrelated setup flows.
- No changes to the existing user-authored favicon deletion.
