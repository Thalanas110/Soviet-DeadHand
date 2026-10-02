# Supabase Edge Functions

The browser talks to these functions through `supabase.functions.invoke`. Database reads, writes, authorization checks, device-token handling, and sensitive-data encryption stay inside this directory or in PostgreSQL migrations.

Functions:

- `operator-read` — authenticated, user-scoped dashboard snapshots and decrypted last-known location.
- `operator-actions` — authenticated device registration/revocation, heartbeat, check-in, alarm, PIN, arming, and stand-down actions.
- `contacts` — authenticated encrypted emergency-contact management.
- `telemetry-ingest` — device-token-authenticated telemetry ingestion. Supabase gateway JWT verification is disabled for this function because device tokens are application credentials; the function validates their SHA-256 hash itself.

Required function secrets:

- `SUPABASE_URL` (or `PROJECT_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` (or `SERVICE_ROLE_KEY`)
- `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY` for the authenticated bootstrap RPC
- `DEADHAND_DATA_KEY` — at least 32 characters; used to derive the AES-256-GCM key
- `FRONTEND_ORIGIN` — deployed frontend origin for CORS; local development may use the default wildcard

Deploy after supplying the project secrets:

```sh
supabase functions deploy operator-read
supabase functions deploy operator-actions
supabase functions deploy contacts
supabase functions deploy telemetry-ingest --no-verify-jwt
```

The SQL migration remains responsible for RLS, immutable ledgers, state transitions, and scheduled watchdog behavior.

The watchdog follows the Q0–Q4 automaton documented in the repository root: 24h silence enters Q1, Q1 lasts 72h, Q2 lasts 48h, Q3 fires the cascade, and Q3/Q4 repeat their alert cycle every 120h.
