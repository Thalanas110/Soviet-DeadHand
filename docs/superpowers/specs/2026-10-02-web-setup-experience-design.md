# Web Setup Experience Design

**Date:** 2026-10-02
**Scope:** React/Vite web application under `frontend/` only

## Problem

The web application currently opens with a landing page and an authenticated console that share the mobile tactical dashboard's interaction model. The web surface needs a distinct purpose: help an operator configure the safety system once, then hand off to the existing live console for monitoring and action.

The Android implementation is being developed in a separate worktree and is explicitly out of scope. This design does not require Android changes, shared backend changes, database migrations, or new safety-state APIs.

## Goals

- Make the web entry experience a desktop-first setup flow for the existing account, password, device, and emergency-contact capabilities.
- Preserve the existing live `/console`, `/devices`, `/contacts`, and `/settings` surfaces for post-setup operation and maintenance.
- Keep live monitoring consolidated in one Dashboard tab backed by `/console`; setup must not duplicate the dashboard.
- Route authenticated operators to setup when required configuration is incomplete and to the console when it is complete.
- Increase the landing page's Sovietized command-post character while maintaining the Industrial visual anchor and content discipline.
- Keep all configuration mutations on the existing typed Supabase Edge Function APIs.
- Verify the change with frontend tests, lint, and production build checks.

## Non-goals

- Changing Android source code or files under `.worktrees/native-android-safety-companion`.
- Adding or changing Supabase migrations, Edge Functions, database state, or API contracts.
- Creating a separate backend or duplicating server-side safety logic.
- Adding callsign editing: the current API exposes the callsign as read-only profile information and bootstrap creates the default `OPERATOR` callsign.
- Making the Huawei wearable bridge available. Wearables remain supported by setup but are recommended rather than blocking because the bridge is not available yet.

## Product flow

### Landing and authentication

The landing page remains public and explains the defensive safety system, its escalation doctrine, and the purpose of the web setup surface. Its primary action leads to authentication.

After authentication, the web app bootstraps the operator and reads the existing operator snapshot. The destination is derived from the snapshot:

- Required configuration incomplete → `/setup`.
- Required configuration complete → `/console`.

The same destination rule applies after email or OAuth sign-in. The existing authenticated route protection remains in place.

### Setup stages

The `/setup` route is an authenticated, desktop-first setup dossier. It opens on the first incomplete stage, while all stages remain selectable so returning operators can repair a specific item.

The authenticated web navigation has one Dashboard tab for the live monitoring console. Setup is a separate configuration surface; it may show readiness summaries and links to the Dashboard, but it does not render a second live dashboard or duplicate console controls.

The readiness model is derived only from server data:

| Stage | Server signal | Requirement |
| --- | --- | --- |
| Access passwords | `profile.pins_configured` | Required |
| Handset | At least one active device with `kind === "phone"` | Required |
| Emergency cascade | At least one authorized emergency contact | Required |
| Wearable | At least one active device with `kind === "wearable"` | Recommended, non-blocking |

The callsign is shown as read-only identity information when available. It is not presented as an editable setup step.

Each stage composes the existing actions:

- Passwords use `operatorApi.action({ action: "setPins", ... })` and preserve the existing validation rules.
- Devices use `operatorApi.action({ action: "registerDevice", label, kind })`; the one-time token behavior remains unchanged.
- Contacts use `contactsApi.add(input)` and preserve the existing encrypted contact API behavior.

Successful actions invalidate the relevant React Query data and immediately update the readiness rail. Errors stay local to the active stage and use the existing toast mechanism. Password values never appear in summaries or readiness labels.

“Continue to console” is always available, but required gaps remain explicit. The UI never renders a successful readiness state without the corresponding server data.

## Visual direction

The implementation holds the **Industrial** anchor:

- Surface: warm black `#0B0C0A`.
- Typography: JetBrains Mono / monospace throughout.
- Signal: signal red `#FF3B30` as the single semantic accent.
- Structure: flat surfaces and 1px borders, with no rounded cards or decorative shadows.
- Texture: restrained scanline/grid treatment already present in the web system.

The memorable differentiator is a vertical Q0–Q4 readiness rail that advances as setup stages are completed. It ties the setup activity to the product's actual automaton without fabricating telemetry or pretending configuration is live safety state.

The landing page will use meaningful Soviet command-post language and proper Cyrillic paired with plain English where useful. Standard UI actions retain standard labels. Decorative Unicode glyphs, fake telemetry, fake operator identities, filler code comments, and synthetic status strings are excluded.

## Component and data boundaries

The setup experience should use small web-only units with explicit responsibilities:

- A setup route owns authenticated page state, stage selection, and query invalidation.
- A readiness derivation helper converts the operator snapshot and contact list into typed stage status. It is pure and independently testable.
- Stage components own their forms and invoke the existing API functions; they do not mutate safety state directly.
- Existing operational routes remain available and continue to own their current mobile-oriented controls.
- Shared style tokens and the existing command-post primitives may be reused, but the setup layout should not turn the live console into a setup wizard.

No new API endpoint or shared database state is required.

## Error handling and edge cases

- A missing or stale snapshot keeps the setup page in its existing loading/error handling path rather than guessing readiness.
- Revoked devices do not satisfy the handset or wearable stage.
- Unauthorized contacts do not satisfy the cascade stage.
- A one-time device token remains visible only after a successful registration and is not persisted by the setup route.
- Password validation and server rejection continue to be surfaced as actionable local errors.
- A wearable-only configuration remains incomplete because the handset stage is required.
- A configured operator can revisit `/setup` directly for maintenance without being forced through the flow again.

## Testing and verification

Add or update frontend tests for:

- Readiness derivation for fresh, partially configured, revoked-device, unauthorized-contact, and fully configured snapshots.
- Authenticated destination selection for incomplete versus complete configuration.
- Setup stage success and failure behavior, including query invalidation and no password leakage in rendered status content.
- Landing-page setup navigation and Sovietized doctrine content.

Run the frontend quality gates before completion:

```text
npm run lint
npm run test
npm run build
```

The final diff must contain only the web implementation, its tests, and focused documentation. The root worktree's pre-existing untracked file `frontend/public/Military Alarm - Sound FX Copyright Free.mp3` must remain unmodified and unstaged. No Android worktree files may appear in the diff.
