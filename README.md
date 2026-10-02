# Guardian Protocol

DEAD HAND — FULL PROTOCOL v1
Build Dead Hand as a Supabase-only personal safety monitoring and emergency escalation system.
Stack:
React
TypeScript
Vite
Supabase Auth
Supabase PostgreSQL
Supabase Row Level Security
Supabase Edge Functions
Supabase Edge Function API
Supabase scheduled jobs / Cron
Zod
Vitest
Playwright

DO NOT create ExpressJS, NestJS, Fastify, Render backend, or any separate API server. Supabase is the backend.
Remember to write all database migrations in SQL files under supabase/migrations/.

Aesthetics & Theme:
Sovietized militaristic-style dead hand system (Комплекс «Периметр»). Cold War command bunker aesthetic with phosphor amber / radar green CRT readouts, Soviet military nomenclature, tactile arming toggles, and status indicators, while strictly functioning as a defensive, safety-only personal emergency monitoring and escalation system.

Layout & Form Factor:
Mobile-first design. Provide both a mobile tactical handheld dashboard (one-handed rapid check-in, duress silent alarm toggle, countdown ticker, encrypted link indicators) and a responsive desktop command post console.

Cryptography:
All sensitive data (telemetry, coordinates, biometric samples, contact info) must be encrypted with AES-256-GCM using Web Crypto API.

Core Doctrine & Rules:
1. The server (Supabase/PostgreSQL) is authoritative. React is UI only and never directly mutates safety state.
2. Every complete safety heartbeat requires a valid location sample. Without location, it is incomplete diagnostic telemetry only and must not update last_complete_heartbeat_at.
3. Monotonic sequence numbers per device to prevent replay attacks. Server timestamps (received_at) govern watchdog timing.
4. Core automaton: Q0 monitoring -> Q1 “Are you safe?” after 24h silence -> Q2 “Where are you?” after 72h without response -> Q3 attention/cascade after a further 48h -> Q4 liveliness-alert cycles every 120h. The database retains semantic alarm states; Q0-Q4 are stored separately as automaton nodes.
5. Covert duress code / silent alarm that displays safe confirmation to hostiles while immediately escalating to emergency dispatch.
6. Support Huawei wearable telemetry loss and phone heartbeat loss correlation.
7. Idempotent notification cascade dispatching to pre-authorized prioritized emergency contacts with immutable last-known telemetry snapshots.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
cd frontend
npm i
npm run dev
```

The browser UI lives entirely under `frontend/`. It uses Supabase Auth for session management and invokes the typed API in `frontend/src/lib/api.ts`; all application data queries, mutations, authorization checks, and sensitive-data operations run in `supabase/functions/`. See [`supabase/functions/README.md`](supabase/functions/README.md) for deployment and secret configuration.
