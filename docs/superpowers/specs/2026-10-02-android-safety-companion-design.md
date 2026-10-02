# Native Android Safety Companion Design

**Date:** 2026-10-02  
**Status:** Design for review  
**Scope:** Native Android companion for the existing Guardian Protocol web console and Supabase backend

## Goal

Build a native Android companion that preserves the web console's command-bunker visual language while collecting phone and Huawei Watch GT 5 telemetry in the background, queueing data safely offline, and submitting user responses and telemetry to the existing server-authoritative safety protocol.

The companion is safety-only. It provides check-ins, explicit SOS/duress responses, location and device-health telemetry, trusted-contact escalation through the existing server workflow, and auditable incident records. It must not trigger physical harm, retaliation, or autonomous destructive action.

## Existing project constraints

- The browser console is React, TypeScript, Vite, and Supabase.
- Supabase Edge Functions and PostgreSQL are the only backend; no separate API server is introduced.
- Existing telemetry ingestion already supports monotonic sequence numbers, server receipt timestamps, battery, charging, network, wearable connection, and encrypted location.
- Existing server fields distinguish `last_any_heartbeat_at` from `last_complete_heartbeat_at`.
- A complete heartbeat requires valid location; diagnostic telemetry without location must not update the complete-heartbeat timestamp.
- Q0-Q4 automaton behavior and semantic alarm state values remain unchanged.
- Existing local quality gates are `npm run lint`, `npm run test`, and `npm run build` in `frontend/`; no GitHub Actions workflow is currently present.
- The repository's roadmap identifies live email delivery as blocked. A production safety claim requires a real, tested notification delivery provider rather than dispatch records alone.

## Non-goals

- No autonomous physical intervention, weapon control, retaliation, or self-harm capability.
- No client-side ownership of the Q0-Q4 countdown, transitions, watchdog, or contact cascade.
- No separate short-interval At-Risk mode. The Android app follows the existing pseudocode and automaton exactly.
- No direct Huawei Watch GT 5 application or direct-watch SDK dependency in v1.
- No replacement of the web console; the Android app is a complementary field device.

## User experience and visual system

The Android UI will feel like the same product as the web console, not a generic safety app. It will reuse the existing cold-war command-bunker direction: phosphor amber and radar green, CRT-style readouts, Sovietized nomenclature, tactile controls, readiness indicators, Q0-Q4 labels, and neutral confirmation wording.

The layout will be native and one-handed rather than a compressed desktop copy. The primary screens are:

1. **Command:** current server state, readiness, phone health, watch freshness, location freshness, pending uploads, and check-in.
2. **Emergency:** explicit SOS and covert duress responses with identical visible confirmation behavior.
3. **Devices:** phone telemetry, Huawei Health Kit authorization, watch freshness, connection state, battery, and degraded-state explanations.
4. **Contacts:** trusted contacts and escalation priority, matching the web console.
5. **Incident ledger:** immutable local/server event history, sync status, and last-known telemetry snapshots.
6. **Settings/security:** permissions, monitoring state, encryption status, device revocation, and battery/background guidance.

The UI may show a cached state, but it must label stale data and never imply that monitoring is active when required permissions, collection, or server synchronization are unavailable.

## Architecture

The Android app is split into a foreground presentation layer and a background telemetry/synchronization layer.

```text
Phone sensors ───────┐
                     ├─> telemetry adapters
Huawei Health Kit ───┘
                            |
                    normalized telemetry
                            |
                 encrypted Room-backed outbox
                            |
              foreground collection + sync workers
                            |
                 Supabase telemetry endpoint
```

### Components

- `PhoneTelemetrySource`: location, battery, charging, network, and phone activity signals.
- `HuaweiHealthKitSource`: authorized heart-rate samples and watch sync/freshness information obtained through the phone-side Huawei Health integration.
- `TelemetryNormalizer`: maps source data into the Android telemetry model without allowing source-specific fields to alter server state semantics.
- `EncryptedOutboxRepository`: persists telemetry payloads and retry metadata on disk; it does not keep the safety queue only in memory.
- `TelemetryForegroundService`: performs active collection while monitoring is enabled and exposes the required user-visible status notification.
- `TelemetrySyncWorker`: drains the outbox with network constraints, bounded retry/backoff, and reboot recovery.
- `SafetyApiClient`: calls device registration, check-in, SOS/duress, heartbeat, snapshot, and telemetry endpoints.
- `StatusRepository`: combines server snapshot state with local collection health to drive the Compose UI.
- `AutomatonSnapshot`: read-only server state model for Q0-Q4 and semantic alarm state; it contains no local transition evaluator.

The web console and Android client share backend contracts, not UI code. Any telemetry schema extension must be backward compatible with existing browser and edge-function callers.

## Telemetry model

V1 collects only the approved minimal safety bundle:

- phone location with accuracy and source timestamp;
- phone battery percentage and charging state;
- network classification;
- phone/watch connection and last-sync freshness;
- authorized heart-rate samples when Huawei provides them.

Heart rate is supporting telemetry. It is not interpreted as proof that the user is safe or unsafe, and the absence of heart-rate data does not independently trigger an alarm.

Each upload includes a device-scoped monotonic sequence number, client timestamp, optional telemetry fields, and optional location. The server assigns `received_at`, validates replay protection, encrypts location, and decides whether the record is complete.

The Android extension should add optional heart-rate and watch-freshness data without changing the meaning of existing fields. Location remains the only field that can make a heartbeat complete.

## Huawei Watch GT 5 integration

The phone is the v1 hub. The Android app requests user authorization for the phone-side Huawei Health/Health Kit path, reads the approved data, and reports both the data freshness and the integration health.

The source abstraction must allow a future direct-watch adapter, but v1 must not assume that the GT 5 can host or reliably run the companion's safety logic. Direct commercial-wearable integration is a later, separately approved adapter and cannot be a prerequisite for phone monitoring.

If Huawei data is delayed or unavailable, phone telemetry continues and the UI enters a clearly labeled degraded watch state. Missing watch data is never treated as proof of harm.

## Server authority and automaton contract

All safety timing and state transitions are server-side. The Android app submits telemetry and responses, then renders the latest server snapshot.

The initial Q0 -> Q1 silence window starts at the server's last point of contact:

- the latest valid phone or watch telemetry updates the point of contact;
- server `received_at` is authoritative, not the device clock;
- a diagnostic contact can reset the silence timer without updating `last_complete_heartbeat_at`;
- if no prior contact exists, the server-side arm/registration timestamp is the initial point of contact;
- app launch, installation, and local countdowns never start or reset the watchdog.

The Android client preserves the existing protocol exactly:

- Q0 -> Q1 after 24 hours without a point of contact;
- Q1 -> Q2 after 72 hours without the required response;
- Q2 -> Q3 after a further 48 hours without the required response;
- Q3/Q4 alert cycles repeat every 120 hours;
- explicit duress enters Q3 immediately;
- correct, duress, and unsafe response behavior follows the existing pseudocode;
- Q3 represents an emergency contact cascade and auditable attention state, never physical retaliation.

Offline Android state can display the last cached automaton snapshot and a stale-data indicator, but it must not advance, cancel, or reinterpret the automaton.

## Background operation and failure behavior

The foreground service is started from a visible user action after monitoring prerequisites pass. It uses a persistent notification and reports local collection health. WorkManager handles durable upload retries, periodic synchronization, and restart/reboot recovery.

The app requests only the permissions required by the enabled feature and explains each permission in the setup flow. Background location and foreground-service limitations are treated as product constraints, not bypass targets.

User-visible local states are:

- `MONITORING`
- `DEGRADED — LOCATION LIMITED`
- `DEGRADED — WATCH SYNC DELAYED`
- `OFFLINE — QUEUED`
- `PAUSED — PERMISSION REQUIRED`
- `REAUTHORIZATION REQUIRED`

Failure rules:

- no location produces diagnostic telemetry but not a complete heartbeat;
- no network queues encrypted telemetry on disk;
- app restart or reboot resumes the outbox and rechecks monitoring prerequisites;
- token revocation or replay rejection stops blind retries and marks the device for reauthorization;
- queue pressure preserves SOS, check-in, location, and connection events before best-effort heart-rate samples;
- a degraded state never resets or suppresses a server-side alarm;
- if the phone is powered off, destroyed, forcibly stopped, or completely disconnected, the server can only use the last-known snapshot and watchdog rules.

## Security and privacy

- Device credentials are stored using Android Keystore-protected storage.
- Pending location and heart-rate payloads are encrypted locally with AES-GCM.
- Location is sent only over authenticated HTTPS and remains server-encrypted according to the existing Supabase implementation.
- The outbox exposes only the minimum metadata needed for retry ordering; sensitive payloads remain encrypted at rest.
- Duress and normal check-in confirmations use identical visible wording and timing.
- Permission revocation is explicit in the UI and transitions the app to a degraded state rather than silently collecting less data.
- The app does not infer kidnapping, suicide, or physical danger from heart rate or missing watch data; only the defined server protocol and explicit user responses drive escalation.

## Testing and verification strategy

The Android project will use test-first development for new behavior and will add tests before implementation for:

- telemetry normalization from phone and Huawei sources;
- monotonic sequence generation and replay-safe outbox ordering;
- encryption/decryption of queued payloads;
- retry, backoff, duplicate, revoked-token, and offline behavior;
- complete versus diagnostic heartbeat classification;
- permission and degraded-state mapping;
- exact Q0-Q4 snapshot rendering and response routing;
- identical visible confirmation behavior for normal and duress responses;
- Compose UI flows for readiness, check-in, SOS, device health, and reauthorization;
- server contract tests for optional heart-rate/watch-freshness fields and existing callers.

Before implementation is declared complete, verification must include:

- Android unit and instrumentation tests on a clean build;
- deterministic tests for server timestamps, sequence replay, and the exact 24h/72h/48h/120h windows;
- existing frontend `npm run lint`, `npm run test`, and `npm run build`;
- Supabase migration/function checks for any backend changes;
- manual verification on a physical Android phone with Huawei Health and a paired Watch GT 5;
- a failure drill covering permission revocation, network loss, process restart, reboot, watch disconnect, and server reauthorization;
- confirmation that live contact delivery is exercised end-to-end before production use.

## Delivery boundaries

Implementation should be staged as independently testable work:

1. Android project/toolchain and native visual shell.
2. Shared API contracts and device registration.
3. Encrypted outbox and phone telemetry collection.
4. Huawei Health Kit adapter and watch freshness.
5. Background service, WorkManager sync, and degraded-state UI.
6. Check-in/SOS/duress flows and server-side telemetry extension.
7. Incident ledger, physical-device testing, and live notification delivery verification.

No stage may claim life-saving readiness until server-side escalation and real contact delivery have been tested under the documented failure drills.
