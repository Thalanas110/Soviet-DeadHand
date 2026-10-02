# Supabase Edge API Design

**Status:** Proposed for review

## Goal

Make `frontend/` a UI and backend-facing API client only. All application backend behavior, database queries, RPC calls, sensitive-data encryption, authorization, and public telemetry ingestion will live under `supabase/`.

## Non-negotiable boundaries

- `frontend/` must not contain database table queries, RPC calls, server functions, server middleware, service-role credentials, or server-only crypto.
- `frontend/` may use the Supabase browser client only for authentication/session operations and invoking Edge Functions.
- `supabase/functions/` owns every application data read/write and every authorization check beyond basic client-session handling.
- `supabase/migrations/` remains the source of truth for schema, RLS, and PostgreSQL domain procedures.
- Environment values are not replaced in this change. New Supabase URLs and keys will be supplied separately.

## Architecture

```text
Browser UI
  ├─ Supabase Auth client: sign-in, sign-up, OAuth, session state
  └─ typed API client: functions.invoke(...)
       ↓
Supabase Edge Functions
  ├─ verify the access token and derive user ID
  ├─ validate request payloads
  ├─ encrypt/decrypt sensitive fields with DEADHAND_DATA_KEY
  ├─ call PostgreSQL RPCs or user-scoped service-role queries
  └─ return typed JSON responses
       ↓
Supabase PostgreSQL + Auth + Realtime
```

The frontend will become a client-only Vite/TanStack Router application. TanStack Start server entrypoints and server functions will be removed so there is no application backend outside Supabase.

## Edge Function layout

### `supabase/functions/operator-read`

Authenticated read endpoint. It returns the operator snapshot currently assembled by `useOperator`: safety status, profile, devices, incident events, notification dispatches, and incidents. It also owns the last-known-location read and decrypts location/contact fields only for the authenticated user.

### `supabase/functions/operator-actions`

Authenticated mutation endpoint with a discriminated action body for bootstrap, device registration/revocation, check-in, silent alarm, PIN updates, arming, and stand-down. It reuses the existing PostgreSQL procedures (`bootstrap_operator`, `api_checkin`, `api_silent_alarm`, `api_set_pins`, `api_set_armed`, and `api_stand_down`) and preserves their response semantics.

### `supabase/functions/contacts`

Authenticated contact list/create/remove endpoint. It validates input, encrypts contact details with the server-held data key, decrypts only the requesting user’s contacts for display, and de-authorizes contacts that cannot be deleted because of dispatch audit references.

### `supabase/functions/telemetry-ingest`

Public device endpoint with JWT verification disabled at the Edge Function gateway. It requires the device bearer token, validates telemetry, hashes/forwards the token to `api_ingest_device`, and returns the existing heartbeat acknowledgement. The current frontend server route at `frontend/src/routes/api/public/telemetry.ts` will be removed.

### `supabase/functions/_shared`

Shared Deno modules for CORS, JSON responses, authenticated-user extraction, service-role client creation, validation schemas, AES-256-GCM encryption/decryption, hashing, and typed error normalization. Secrets are read only inside Edge Functions.

## Frontend API contract

Create one typed module such as `frontend/src/lib/api.ts`. It will expose UI-oriented functions such as:

```ts
operatorApi.read(): Promise<OperatorSnapshot>
operatorApi.action(input: OperatorAction): Promise<OperatorActionResult>
contactsApi.list(): Promise<ContactView[]>
contactsApi.add(input: ContactInput): Promise<{ ok: true }>
contactsApi.remove(id: string): Promise<RemoveContactResult>
telemetryApi.ingest(input: DeviceTelemetry): Promise<TelemetryResult>
```

The module may call `supabase.functions.invoke`, but it may not call `.from`, `.select`, `.insert`, `.update`, `.delete`, `.upsert`, or `.rpc`. Components and hooks consume this module through React Query. Dashboard refresh uses authenticated polling rather than direct Postgres Realtime subscriptions, keeping the client contract entirely Edge-Function-based.

## Client-only migration

- Add a Vite `index.html` and React entrypoint that mounts `RouterProvider`.
- Keep TanStack Router route definitions and generated route tree, adapting root document/head handling for a browser SPA.
- Remove `src/start.ts`, `src/server.ts`, server middleware, server Supabase clients, server-only crypto, and TanStack server-function imports.
- Replace every `useServerFn(...)` call with the typed API client.
- Keep Supabase Auth browser calls because Auth is a Supabase-managed backend service; no application data query may use the browser client directly.
- Update package dependencies and Vite configuration to remove TanStack Start/Nitro server tooling if no longer required by the SPA build.

## Security and failure behavior

- Edge Functions derive `user_id` from the verified bearer token; request bodies cannot choose a user ID.
- Service-role clients are never bundled into `frontend/` and are never exposed to the browser.
- RLS remains enabled, and Edge Functions apply explicit user ownership filters even when using service-role access.
- `DEADHAND_DATA_KEY` remains server-only and is required for contact/location encryption and decryption.
- Silent-alarm responses preserve the existing innocuous acknowledgement behavior.
- Edge Functions return stable `{ ok, error }` JSON shapes so the UI can preserve current toast behavior.
- CORS allows only configured frontend origins and handles `OPTIONS` requests.

## Verification

- Static audit: no `.from`, `.select`, `.insert`, `.update`, `.delete`, `.upsert`, `.rpc`, `createServerFn`, `supabaseAdmin`, or server-only crypto references remain under `frontend/src` except the allowed Auth and Edge Function client calls.
- Frontend checks run from `frontend/`: `npm i`, `npm run lint`, `npm test`, and `npm run build`.
- Edge Function checks use Supabase’s local function serving/test workflow where the CLI is available.
- Contract tests cover authenticated reads, each mutation action, contact encryption/decryption, device-token telemetry ingestion, unauthorized requests, and stable error responses.
- No replacement Supabase URLs or environment secrets are committed.
