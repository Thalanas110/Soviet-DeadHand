# Supabase Edge API Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every application data query, mutation, authorization check, and sensitive-data operation into Supabase Edge Functions while leaving `frontend/` as a UI and typed API client only.

**Architecture:** The browser uses Supabase Auth for sign-in/session state and invokes typed Edge Function APIs. Edge Functions under `supabase/functions/` validate access tokens and payloads, perform encryption/decryption, call existing PostgreSQL procedures, and execute user-scoped reads. TanStack Start server handlers are removed and the frontend becomes a client-only Vite/TanStack Router application.

**Tech Stack:** React, TanStack Router, React Query, Vite, Supabase Auth, Supabase Edge Functions/Deno, Supabase PostgreSQL, Zod, AES-256-GCM, Vitest.

## Global Constraints

- `frontend/` must not contain database table queries, RPC calls, server functions, server middleware, service-role credentials, or server-only crypto.
- `frontend/` may use the Supabase browser client only for authentication/session operations and invoking Edge Functions.
- `supabase/functions/` owns every application data read/write and every authorization check beyond basic client-session handling.
- `supabase/migrations/` remains the source of truth for schema, RLS, and PostgreSQL domain procedures.
- Environment values are not replaced in this change; new Supabase URLs and keys will be supplied separately.
- Preserve the existing innocuous silent-alarm acknowledgement and stable `{ ok, error }` mutation results.

---

### Task 1: Create shared Edge Function infrastructure

**Files:**
- Create: `supabase/functions/_shared/cors.ts`
- Create: `supabase/functions/_shared/http.ts`
- Create: `supabase/functions/_shared/auth.ts`
- Create: `supabase/functions/_shared/admin.ts`
- Create: `supabase/functions/_shared/crypto.ts`
- Create: `supabase/functions/_shared/schemas.ts`
- Create: `supabase/functions/_shared/types.ts`
- Test: `supabase/functions/_shared/crypto.test.ts`

**Interfaces:**
- `withCors(response: Response): Response` adds configured CORS headers and supports `OPTIONS`.
- `json(data: unknown, init?: ResponseInit): Response` serializes JSON consistently.
- `requireUser(request: Request): Promise<{ userId: string; accessToken: string }>` verifies the bearer token with Supabase Auth.
- `getAdminClient()` returns the service-role Supabase client and is callable only from Deno Edge Functions.
- `seal(data: unknown, aad: string)` and `open<T>(ciphertext: string, iv: string, aad: string)` use `DEADHAND_DATA_KEY` and AES-256-GCM.

- [x] Copy the request validation schemas from `frontend/src/lib/schemas.ts` into the Deno-compatible shared module without importing frontend files.
- [x] Implement auth extraction so user IDs always come from the verified token, never from request bodies.
- [x] Implement CORS, JSON errors, Supabase service-role client creation, hashing, random device-token generation, and AES-256-GCM.
- [x] Add crypto tests covering round-trip encryption, AAD mismatch rejection, and missing/short key rejection.
- [ ] Run `deno test supabase/functions/_shared/crypto.test.ts` when Deno is available.

### Task 2: Add authenticated operator read API

**Files:**
- Create: `supabase/functions/operator-read/index.ts`
- Create: `supabase/functions/operator-read/index.test.ts`
- Create/modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/hooks/use-operator.ts`

**Interfaces:**
- Edge Function request: `GET` or `{ action: "snapshot" | "last-known-location" }` with the Supabase access token.
- Snapshot response: `{ status, profile, devices, events, dispatches, incidents }`.
- Last-known-location response: `{ lat, lng, accuracy, received_at } | null`.
- Frontend API: `operatorApi.read()` and `operatorApi.lastKnownLocation()`.

- [x] Implement `operator-read` auth, action validation, user-scoped reads, ordering/limits matching the current `useOperator` queries, and encrypted-location decryption.
- [ ] Add function tests for unauthorized requests, ownership filtering, snapshot shape, and absent location.
- [x] Replace all `supabase.from(...)` calls in `use-operator.ts` with `operatorApi.read()`.
- [x] Replace direct Postgres Realtime invalidation with React Query polling through `operatorApi.read()`.
- [x] Verify `frontend/src/hooks/use-operator.ts` contains no `.from`, `.select`, `.rpc`, or channel subscription calls.

### Task 3: Add authenticated operator actions API

**Files:**
- Create: `supabase/functions/operator-actions/index.ts`
- Create: `supabase/functions/operator-actions/index.test.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/routes/_authenticated/console.tsx`
- Modify: `frontend/src/routes/_authenticated/devices.tsx`
- Modify: `frontend/src/routes/_authenticated/settings.tsx`
- Delete: `frontend/src/lib/deadhand.functions.ts`

**Interfaces:**
- Request union:

```ts
type OperatorAction =
  | { action: "bootstrap" }
  | { action: "register-device"; label: string; kind: "phone" | "wearable" }
  | { action: "revoke-device"; id: string }
  | { action: "heartbeat"; deviceId: string; telemetry: Telemetry }
  | { action: "check-in"; deviceId: string; telemetry: Telemetry; pin: string }
  | { action: "silent-alarm"; deviceId: string | null }
  | { action: "set-pins"; current?: string; checkin: string; duress: string }
  | { action: "set-armed"; armed: boolean; pin: string }
  | { action: "stand-down"; pin: string };
```

- Response union preserves current results: `{ ok: true, ... }` or `{ ok: false, error: string }`.
- Frontend API: `operatorApi.action(input: OperatorAction)`.

- [x] Move device registration, revocation, heartbeat, check-in, alarm, PIN, arm, and stand-down logic into the Edge Function.
- [x] Keep sensitive location sealing and device-token hashing inside `_shared/crypto.ts`.
- [x] Call existing PostgreSQL procedures with the authenticated user ID and preserve their error mapping.
- [ ] Add tests for each action, invalid payloads, missing auth, user ownership, replay/device authorization errors, and silent-alarm acknowledgement.
- [x] Replace every `useServerFn(...)` usage in console, devices, and settings with `operatorApi.action(...)`.
- [x] Delete the TanStack server-function module after all imports are removed.

### Task 4: Add contacts Edge Function

**Files:**
- Create: `supabase/functions/contacts/index.ts`
- Create: `supabase/functions/contacts/index.test.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/routes/_authenticated/contacts.tsx`

**Interfaces:**
- Request union: `{ action: "list" }`, `{ action: "add"; contact: ContactInput }`, or `{ action: "remove"; id: string }`.
- List response: `ContactView[]` with decrypted detail only for the authenticated user.
- Add/remove response: stable `{ ok: true, deauthorized?: boolean }` or `{ ok: false, error: string }`.

- [x] Implement authenticated ownership checks, validation, server-side AES-256-GCM contact encryption/decryption, and fallback de-authorization on FK restrictions.
- [ ] Add tests for encrypted persistence, user isolation, invalid contacts, list decryption failure handling, and remove fallback.
- [x] Replace `useServerFn(listContacts/addContact/removeContact)` with `contactsApi` calls.

### Task 5: Move public telemetry ingestion into Supabase

**Files:**
- Create: `supabase/functions/telemetry-ingest/index.ts`
- Create: `supabase/functions/telemetry-ingest/index.test.ts`
- Delete: `frontend/src/routes/api/public/telemetry.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/routes/_authenticated/devices.tsx`

**Interfaces:**
- Public request: `Authorization: Bearer <device-token>` plus the existing telemetry JSON body.
- Response: `{ ok: true, complete: boolean, heartbeat_id?: string }` or `{ ok: false, error: string }`.

- [x] Disable Supabase gateway JWT verification only for this function and enforce the device bearer token in function code.
- [x] Validate telemetry with the shared schema, hash the token, and call `api_ingest_device`.
- [ ] Add tests for missing token, invalid payloads, unauthorized devices, replay rejection, and complete/incomplete heartbeats.
- [x] Update the displayed device endpoint from the deleted frontend route to the Supabase Edge Function URL format.

### Task 6: Remove frontend backend runtime and convert to client-only Vite UI

**Files:**
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/routes/__root.tsx`
- Modify: `frontend/src/routes/_authenticated/route.tsx`
- Delete: `frontend/src/start.ts`
- Delete: `frontend/src/server.ts`
- Delete: `frontend/src/integrations/supabase/auth-attacher.ts`
- Delete: `frontend/src/integrations/supabase/auth-middleware.ts`
- Delete: `frontend/src/integrations/supabase/client.server.ts`
- Delete: `frontend/src/lib/crypto.server.ts`
- Delete: `frontend/src/lib/error-capture.ts`
- Delete: `frontend/src/lib/error-page.ts`

**Interfaces:**
- Browser entry mounts `RouterProvider` against the existing generated route tree.
- Authenticated route guard uses Supabase Auth session state only.
- No frontend file imports `@tanstack/react-start` server APIs or service-role code.

- [x] Add the SPA document and React entrypoint.
- [x] Adapt root document/head/error rendering from TanStack Start shell APIs to browser-compatible TanStack Router APIs.
- [x] Simplify Vite config to React, Tailwind, and TypeScript path plugins without Nitro/TanStack Start server plugins.
- [x] Remove backend-only files and update package dependencies to eliminate unused server runtime packages.
- [x] Confirm authentication still uses the browser Supabase client only for auth/session operations.

### Task 7: Update configuration, docs, and verification gates

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/bun.lock`
- Modify: `supabase/config.toml`
- Modify: `README.md`
- Modify: `frontend/src/lib/api.ts`
- Create: `supabase/functions/README.md`

- [x] Add explicit Edge Function configuration and document required Supabase secrets without inserting their values.
- [x] Remove unused frontend server dependencies and regenerate the frontend dependency lockfile with the available package manager.
- [x] Document `supabase functions deploy` commands and the frontend Edge Function API boundary.
- [x] Run static audits proving no direct database query methods or server-only modules remain under `frontend/src`.
- [x] Run from `frontend/`: `npm i`, `npm run lint`, `npm test`, and `npm run build`.
- [ ] Run Edge Function tests and local serving checks where the Supabase CLI/Deno runtime is available.
