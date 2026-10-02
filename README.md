# Soviet Dead Hand

Soviet Dead Hand is a defensive personal-safety system for check-ins, emergency escalation, and trusted-contact coordination.

I created it after a suicide attempt and because I face a serious possibility of being kidnapped. The project is meant to help me stay connected to trusted people when I cannot safely communicate, while giving them a structured way to respond to missed check-ins or an emergency signal.

This is safety infrastructure, not a weapon, retaliation system, surveillance product, or substitute for emergency services. It should only be used with informed consent, authorized contacts, and local emergency procedures.

## What it does

- Guides the operator through a web setup dossier for passwords, phone registration, emergency contacts, and an optional wearable.
- Provides one desktop Dashboard tab for current safety state and response actions.
- Supports heartbeat/check-in monitoring and server-side escalation rules.
- Sends idempotent notifications to pre-authorized, prioritized emergency contacts.
- Keeps sensitive operations behind Supabase Auth, PostgreSQL Row Level Security, and Edge Functions.
- Uses a Soviet command-bunker visual language as a design direction, while keeping the product focused on protection and recovery.

The monitoring progression is represented as Q0–Q4:

1. **Q0 — Monitoring:** regular check-ins are being received.
2. **Q1 — Check-in requested:** the operator has been silent for the first configured interval.
3. **Q2 — Location requested:** silence continues and a location confirmation is needed.
4. **Q3 — Attention cascade:** authorized contacts are notified according to the configured escalation policy.
5. **Q4 — Liveliness alert:** longer-term follow-up cycles continue until the situation is resolved.

These are application states, not claims that the system can guarantee a rescue. In an active emergency, contact local emergency services directly.

## Architecture

- React, TypeScript, and Vite for the web interface
- Supabase Auth for identity and sessions
- Supabase PostgreSQL and Row Level Security for authoritative state
- Supabase Edge Functions for API operations and escalation workflows
- Zod for validation
- Vitest for unit and component tests
- Playwright for browser testing

The browser UI lives under [`frontend/`](frontend/). Supabase functions and deployment notes are documented in [`supabase/functions/README.md`](supabase/functions/README.md). Database migrations belong in [`supabase/migrations/`](supabase/migrations/).

The server is authoritative. The React client does not directly mutate safety state. Complete heartbeats require a valid location sample, and server timestamps govern watchdog timing. Device sequence numbers and idempotent dispatches are used to reduce replay and duplicate-notification problems.

## Local development

You need Node.js and npm. Then:

```sh
git clone <this-repository-url>
cd Soviet-DeadHand/frontend
npm install
npm run dev
```

Useful checks from `frontend/`:

```sh
npm run test
npm run lint
npm run build
```

## Privacy and safety

- Collect only the data required for the configured safety workflow.
- Use trusted contacts who have explicitly agreed to receive alerts.
- Never use this project to track another person without their informed consent.
- Treat credentials, contact data, location, telemetry, and emergency events as highly sensitive.
- Review local laws and emergency-contact expectations before deploying it for real-world use.

If this README describes your current situation and you may be in immediate danger, stop working on the software and get a trusted person or local emergency service physically involved now.
