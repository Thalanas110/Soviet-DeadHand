# Native Android Safety Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native Kotlin/Jetpack Compose Android companion that collects phone and Huawei Watch GT 5 telemetry through the phone-side Health Kit path, queues it securely offline, and submits responses and telemetry to the existing server-authoritative Guardian Protocol.

**Architecture:** The Android app is a native field client with a Compose UI, an encrypted disk-backed telemetry outbox, a visible foreground monitoring service, and WorkManager-based synchronization. Supabase remains authoritative for last-contact timestamps, Q0-Q4 transitions, duress classification, incidents, and trusted-contact cascades.

**Tech Stack:** Kotlin, Jetpack Compose, Android SDK, Android Keystore, Room, WorkManager, Android platform location/network/battery APIs, Huawei Health Kit, Supabase Auth/Edge Functions, PostgreSQL migrations, TypeScript/Zod, Vitest, Android JUnit/instrumentation tests.

## Global Constraints

- Use a native Android module under android/; do not use React Native, Flutter, or a WebView for the safety client.
- Map the web CSS tokens signal-red, radar, background, panel, card, border, crt, and readiness-rail into Compose theme tokens.
- The Android client never advances, cancels, or locally reinterprets the Q0-Q4 automaton.
- The server uses the latest server-received phone or wearable contact for the initial 24h Q0 silence window; client clocks and app launch time do not drive watchdog state.
- Preserve exact timing: Q0->Q1 at 24h, Q1->Q2 at 72h, Q2->Q3 at 48h, Q3/Q4 cycles at 120h.
- V1 collects only location, phone battery/charging/network, phone/watch connection and sync freshness, and authorized heart-rate samples.
- A valid location is required for a complete heartbeat; diagnostic telemetry without location updates last-any-contact only.
- V1 uses phone-side Huawei Health Kit; direct GT 5 integration is an adapter boundary, not a dependency.
- Duress and ordinary check-in confirmations remain visually and temporally indistinguishable.
- New behavior uses test-first development: write a failing test, run it, implement the minimum, then rerun before refactoring.
- Preserve the unrelated untracked audio file and all existing frontend coverage.
- Before completion, run npm run lint, npm run test, and npm run build in frontend/, plus Android unit/instrumentation checks and Supabase checks.
- Do not claim life-saving readiness until real trusted-contact delivery is configured and exercised; the current repository records dispatches but its roadmap marks email delivery as blocked.

## File map

### Android module

- android/settings.gradle.kts, android/build.gradle.kts, android/gradle.properties, and android/gradle/wrapper/*: Gradle project and wrapper.
- android/app/build.gradle.kts: Android/Kotlin/Compose/Room/WorkManager/Huawei dependencies and test configuration.
- android/app/src/main/AndroidManifest.xml: application, foreground-service, location, notification, and boot declarations.
- android/app/src/main/java/com/guardianprotocol/mobile/MainActivity.kt: Compose host and navigation entry point.
- android/app/src/main/java/com/guardianprotocol/mobile/core/*: clocks, sequence generation, secure storage, connection state, and results.
- android/app/src/main/java/com/guardianprotocol/mobile/data/*: Room database, encrypted outbox, API client, device registration, snapshot reads, and uploads.
- android/app/src/main/java/com/guardianprotocol/mobile/telemetry/*: phone and Huawei source ports, normalization, permissions, and health.
- android/app/src/main/java/com/guardianprotocol/mobile/background/*: foreground service, notification, worker, and restart coordination.
- android/app/src/main/java/com/guardianprotocol/mobile/ui/*: Compose theme, shell, readiness rail, and screens.
- android/app/src/test/* and android/app/src/androidTest/*: JVM, Compose, lifecycle, permission, and device tests.
- android/README.md: Android Studio setup, Huawei authorization, emulator limits, and physical-device verification.

### Existing backend/frontend contracts

- supabase/migrations/20261002210000_android_telemetry_fields.sql: additive heartbeat fields and updated RPC signatures.
- supabase/functions/_shared/schemas.ts and schemas.test.ts: Edge validation and contract tests.
- supabase/functions/operator-actions/index.ts and telemetry-ingest/index.ts: forwarding of optional Android telemetry fields.
- frontend/src/lib/schemas.ts, frontend/src/lib/api.ts, and frontend/src/integrations/supabase/types.ts: browser compatibility types.
- frontend/src/test/*: regression coverage for unchanged Q0-Q4 and telemetry validation.
- .github/workflows/ci.yml: frontend and Android gates, only if no workflow exists when implementation starts.
- README.md: Android setup and local verification commands.

---

### Task 1: Scaffold the native Android project

**Files:**
- Create: android/settings.gradle.kts
- Create: android/build.gradle.kts
- Create: android/gradle.properties
- Create: android/app/build.gradle.kts
- Create: android/app/src/main/AndroidManifest.xml
- Create: android/app/src/main/java/com/guardianprotocol/mobile/MainActivity.kt
- Create: android/app/src/main/res/values/strings.xml
- Create: android/app/src/test/java/com/guardianprotocol/mobile/ProjectSmokeTest.kt
- Create: android/README.md

**Interfaces:**
- Produces an installable com.guardianprotocol.mobile debug APK.
- Produces ./gradlew.bat :app:testDebugUnitTest and ./gradlew.bat :app:lintDebug.
- MainActivity renders only the initial Compose shell in this task.

- [ ] Step 1: Create an Empty Activity project through Android Studio at repository/android with package com.guardianprotocol.mobile, Kotlin, Jetpack Compose, minimum SDK 26, and the generated Gradle wrapper.
- [ ] Step 2: Add a smoke test whose body is assertTrue(true).
- [ ] Step 3: Run from android/:

~~~powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.guardianprotocol.mobile.ProjectSmokeTest"
~~~

Expected: BUILD SUCCESSFUL.
- [ ] Step 4: Keep MainActivity limited to a Compose shell and add application/notification strings without requesting runtime permissions.
- [ ] Step 5: Run:

~~~powershell
.\gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
~~~

Expected: exit code 0 and a debug APK under app/build/outputs/apk/debug/.
- [ ] Step 6: Commit:

~~~powershell
git add android
git commit -m "feat: scaffold native Android client"
~~~

### Task 2: Extend the server telemetry contract without changing automaton behavior

**Files:**
- Create: supabase/migrations/20261002210000_android_telemetry_fields.sql
- Create: supabase/functions/_shared/schemas.test.ts
- Modify: supabase/functions/_shared/schemas.ts
- Modify: supabase/functions/operator-actions/index.ts
- Modify: supabase/functions/telemetry-ingest/index.ts
- Modify: frontend/src/lib/schemas.ts
- Modify: frontend/src/lib/api.ts
- Modify: frontend/src/integrations/supabase/types.ts
- Test: frontend/src/test/deadhand-state.test.ts

**Interfaces:**
- Add optional heartRateBpm, heartRateTimestamp, and wearableSyncTimestamp fields.
- Extend the SQL heartbeats table and ingest/check-in RPCs with nullable values.
- Keep all existing request names, errors, location completeness rules, and Q0-Q4 behavior unchanged.

- [ ] Step 1: Write failing schema tests for optional heart-rate/watch-sync fields and a missing-location diagnostic payload.
- [ ] Step 2: Run:

~~~powershell
Push-Location frontend
npm test -- --run src/test/deadhand-state.test.ts
Pop-Location
~~~

Expected: the new contract assertion fails because the fields are absent.
- [ ] Step 3: Add nullable heart_rate_bpm, heart_rate_ts, and wearable_sync_ts columns to public.heartbeats and matching nullable arguments to _ingest, api_ingest_device, and api_checkin.
- [ ] Step 4: Forward the fields through both authenticated and device-token Edge Function paths. Continue updating last_any_heartbeat_at for every accepted contact and last_complete_heartbeat_at only for a valid location.
- [ ] Step 5: Run:

~~~powershell
Push-Location frontend
npm test -- --run src/test/deadhand-state.test.ts src/test/api-error.test.ts
npm run lint
npm run build
Pop-Location
~~~

Expected: existing Q0-Q4 tests and frontend gates pass.
- [ ] Step 6: Run configured Deno/Supabase validation if available, then commit:

~~~powershell
git add supabase/migrations/20261002210000_android_telemetry_fields.sql supabase/functions/_shared/schemas.ts supabase/functions/_shared/schemas.test.ts supabase/functions/operator-actions/index.ts supabase/functions/telemetry-ingest/index.ts frontend/src/lib/schemas.ts frontend/src/lib/api.ts frontend/src/integrations/supabase/types.ts frontend/src/test/deadhand-state.test.ts
git commit -m "feat: extend telemetry contract for Android sources"
~~~

### Task 3: Build the Android domain model and encrypted outbox

**Files:**
- Create: android/app/src/main/java/com/guardianprotocol/mobile/core/Clock.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/core/SequenceStore.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/core/SecureStore.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/data/TelemetryPayload.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/data/OutboxEntity.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/data/TelemetryDatabase.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/data/EncryptedOutboxRepository.kt
- Create: android/app/src/test/java/com/guardianprotocol/mobile/data/SequenceStoreTest.kt
- Create: android/app/src/test/java/com/guardianprotocol/mobile/data/EncryptedOutboxRepositoryTest.kt

**Interfaces:**
- SequenceStore.next(): Long returns a strictly increasing device-local sequence.
- EncryptedOutboxRepository.enqueue(payload): OutboxId writes encrypted payload bytes and retry metadata to Room.
- pending(limit): List<OutboxEntry> returns sequence-ordered entries.
- ack(id) deletes only an accepted entry; markRetry(id, nextAttemptAt, reason) preserves the entry.

- [ ] Step 1: Write a failing test showing sequence values 42 and 43 after initial value 41.
- [ ] Step 2: Run:

~~~powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.guardianprotocol.mobile.data.SequenceStoreTest"
~~~

Expected: failure because the sequence implementation is absent.
- [ ] Step 3: Implement Keystore-protected sequence/token storage and commit sequence state before exposing a payload to the uploader.
- [ ] Step 4: Write a failing outbox test proving queued payload bytes are not plaintext and acknowledgement removes only the accepted row.
- [ ] Step 5: Implement Room entities, AES-GCM payload encryption, sequence ordering, retry metadata, and priority preservation for SOS/check-in/location/connection entries over best-effort heart-rate entries.
- [ ] Step 6: Run:

~~~powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.guardianprotocol.mobile.data.*"
.\gradlew.bat :app:testDebugUnitTest
~~~

Expected: all Android JVM tests pass.
- [ ] Step 7: Commit:

~~~powershell
git add android/app/src/main/java/com/guardianprotocol/mobile/core android/app/src/main/java/com/guardianprotocol/mobile/data android/app/src/test/java/com/guardianprotocol/mobile/data android/app/build.gradle.kts
git commit -m "feat: add encrypted Android telemetry outbox"
~~~

### Task 4: Add Supabase auth, device registration, snapshot reads, and upload handling

**Files:**
- Create: android/app/src/main/java/com/guardianprotocol/mobile/data/SafetyApiClient.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/data/DeviceRepository.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/data/SyncResult.kt
- Create: android/app/src/test/java/com/guardianprotocol/mobile/data/SafetyApiClientTest.kt
- Create: android/app/src/test/java/com/guardianprotocol/mobile/data/DeviceRepositoryTest.kt

**Interfaces:**
- DeviceRepository.registerPhone(label): RegisteredDevice invokes the existing registerDevice action and securely stores the returned token.
- SafetyApiClient.uploadHeartbeat(deviceToken, payload): UploadResult calls telemetry-ingest.
- readSnapshot(session): OperatorSnapshot reads server state.
- submitCheckIn(session, deviceId, telemetry, password): ActionResult preserves current results.
- submitDuress(session, deviceId): ActionResult returns a generic acknowledgement.

- [ ] Step 1: Write failing tests mapping REPLAY_REJECTED and DEVICE_NOT_AUTHORIZED to permanent reauthorization, and network failures to retry.
- [ ] Step 2: Add typed HTTP/API interfaces using one authenticated operator path and one device-token telemetry path. Never log tokens, passwords, locations, or heart rate.
- [ ] Step 3: Implement device registration and secure token persistence.
- [ ] Step 4: Implement upload disposition: 2xx acknowledges; replay/revocation stops automatic retry; network/5xx retains the entry with exponential backoff; validation failures become diagnostic entries.
- [ ] Step 5: Run:

~~~powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.guardianprotocol.mobile.data.*"
.\gradlew.bat :app:lintDebug
~~~

- [ ] Step 6: Commit:

~~~powershell
git add android/app/src/main/java/com/guardianprotocol/mobile/data android/app/src/test/java/com/guardianprotocol/mobile/data
git commit -m "feat: connect Android client to Supabase safety API"
~~~

### Task 5: Implement phone telemetry collection and normalization

**Files:**
- Create: android/app/src/main/java/com/guardianprotocol/mobile/telemetry/TelemetrySource.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/telemetry/PhoneTelemetrySource.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/telemetry/TelemetryNormalizer.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/telemetry/PermissionState.kt
- Create: android/app/src/test/java/com/guardianprotocol/mobile/telemetry/TelemetryNormalizerTest.kt
- Create: android/app/src/test/java/com/guardianprotocol/mobile/telemetry/PhoneTelemetrySourceTest.kt

**Interfaces:**
- TelemetrySource.snapshot(): SourceSnapshot returns latest data and explicit availability flags.
- PhoneTelemetrySource supplies location, battery, charging, network, and phone-active signals without a Google-only API.
- TelemetryNormalizer.normalize(phone, watch, clock): TelemetryPayload creates one payload and never marks it complete locally.

- [ ] Step 1: Write failing tests showing missing location produces diagnostic telemetry while available heart rate is preserved.
- [ ] Step 2: Implement platform location/network/battery adapters with explicit provider and permission states.
- [ ] Step 3: Implement normalization of phone and watch snapshots, preserving source timestamps and wearable sync freshness.
- [ ] Step 4: Run:

~~~powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.guardianprotocol.mobile.telemetry.*"
~~~

- [ ] Step 5: Commit:

~~~powershell
git add android/app/src/main/java/com/guardianprotocol/mobile/telemetry android/app/src/test/java/com/guardianprotocol/mobile/telemetry
git commit -m "feat: collect and normalize phone telemetry"
~~~

### Task 6: Add the Huawei Health Kit phone-side adapter

**Files:**
- Create: android/app/src/main/java/com/guardianprotocol/mobile/telemetry/huawei/HuaweiHealthKitSource.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/telemetry/huawei/HealthKitPermissionCoordinator.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/telemetry/huawei/HuaweiHealthKitStatus.kt
- Create: android/app/src/test/java/com/guardianprotocol/mobile/telemetry/huawei/HuaweiHealthKitSourceTest.kt
- Modify: android/app/build.gradle.kts
- Modify: android/README.md

**Interfaces:**
- HealthKitPermissionCoordinator.status(): HealthKitPermissionState reports unavailable, denied, authorized, or needs-review.
- HuaweiHealthKitSource.snapshot(): WatchSnapshot returns heart-rate sample, sync timestamp, connection/freshness, and source-health status.
- The source depends on a small injected HMS gateway so JVM tests do not load HMS classes.

- [ ] Step 1: Write a failing test proving denied Health Kit authorization produces PermissionRequired without throwing.
- [ ] Step 2: Add HMS dependencies and configuration through Gradle properties; keep client IDs and signing values out of source control.
- [ ] Step 3: Implement approved scope authorization, latest heart-rate read, Huawei Health synchronization timestamp, and explicit degraded state. Do not implement a watch-side APK or direct Bluetooth path.
- [ ] Step 4: Run:

~~~powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.guardianprotocol.mobile.telemetry.huawei.*"
.\gradlew.bat :app:assembleDebug
~~~

- [ ] Step 5: Commit:

~~~powershell
git add android/app/build.gradle.kts android/app/src/main/java/com/guardianprotocol/mobile/telemetry/huawei android/app/src/test/java/com/guardianprotocol/mobile/telemetry/huawei android/README.md
git commit -m "feat: integrate Huawei Health Kit telemetry"
~~~

### Task 7: Add foreground monitoring, WorkManager sync, and lifecycle recovery

**Files:**
- Create: android/app/src/main/java/com/guardianprotocol/mobile/background/MonitoringService.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/background/TelemetrySyncWorker.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/background/MonitoringNotification.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/background/MonitoringCoordinator.kt
- Create: android/app/src/test/java/com/guardianprotocol/mobile/background/TelemetrySyncWorkerTest.kt
- Create: android/app/src/test/java/com/guardianprotocol/mobile/background/MonitoringCoordinatorTest.kt
- Modify: android/app/src/main/AndroidManifest.xml

**Interfaces:**
- MonitoringCoordinator.start(): StartResult validates prerequisites before starting the visible service.
- MonitoringCoordinator.stop(): StopResult stops collection only after authenticated server stand-down is confirmed.
- TelemetrySyncWorker returns success, retry, or permanent failure from SyncDisposition.
- MonitoringNotification renders actual collection health without embedding alarm transitions.

- [ ] Step 1: Write a failing worker test proving offline upload requests retry and retains the outbox row.
- [ ] Step 2: Implement the visible foreground service, location service declaration, persistent notification, and bounded collection loop.
- [ ] Step 3: Implement a CoroutineWorker with network constraints, unique work, exponential backoff, reboot-safe rescheduling, and sequence-ordered draining.
- [ ] Step 4: Restore secure state after restart/boot and surface permission or reauthorization states instead of claiming monitoring.
- [ ] Step 5: Run:

~~~powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.guardianprotocol.mobile.background.*"
.\gradlew.bat :app:lintDebug
~~~

- [ ] Step 6: Commit:

~~~powershell
git add android/app/src/main/java/com/guardianprotocol/mobile/background android/app/src/test/java/com/guardianprotocol/mobile/background android/app/src/main/AndroidManifest.xml
git commit -m "feat: add resilient Android background monitoring"
~~~

### Task 8: Build the Compose command shell and visual-parity screens

**Files:**
- Create: android/app/src/main/java/com/guardianprotocol/mobile/ui/theme/Color.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/ui/theme/Theme.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/ui/theme/Type.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/ui/GuardianShell.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/ui/ReadinessRail.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/ui/CommandScreen.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/ui/EmergencyScreen.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/ui/DevicesScreen.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/ui/ContactsScreen.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/ui/IncidentsScreen.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/ui/SettingsScreen.kt
- Create: android/app/src/androidTest/java/com/guardianprotocol/mobile/ui/CommandScreenTest.kt
- Create: android/app/src/androidTest/java/com/guardianprotocol/mobile/ui/DuressConfirmationTest.kt

**Interfaces:**
- GuardianShell consumes a read-only OperatorSnapshot and local collection status.
- ReadinessRail renders Q0-Q4 using the same labels and semantic mapping as frontend/src/lib/schemas.ts.
- Screens consume state flows and emit intents; they do not call Supabase or mutate the automaton directly.

- [ ] Step 1: Write Compose tests showing Monitoring plus DEGRADED — LOCATION LIMITED.
- [ ] Step 2: Map web values into Compose: background #0b0c0a, foreground #f2f0e9, card #121411, panel #0e100d, border #3a4038, radar #c6cbc3, signal/accent #ff3b30, JetBrains Mono fallback, zero-radius surfaces, CRT utility styling, and readiness rail states.
- [ ] Step 3: Implement the one-handed shell and command screen with Q0-Q4 frame, last server capture, pending outbox count, and prominent check-in.
- [ ] Step 4: Implement devices, contacts, incidents, and settings with real API values and explicit empty/error/degraded states.
- [ ] Step 5: Run:

~~~powershell
.\gradlew.bat :app:connectedDebugAndroidTest
~~~

Expected: UI tests pass on an emulator or connected device.
- [ ] Step 6: Commit:

~~~powershell
git add android/app/src/main/java/com/guardianprotocol/mobile/ui android/app/src/androidTest/java/com/guardianprotocol/mobile/ui android/app/src/main/java/com/guardianprotocol/mobile/MainActivity.kt
git commit -m "feat: add native command-bunker mobile UI"
~~~

### Task 9: Implement server-routed check-in, SOS, duress, and snapshot flows

**Files:**
- Create: android/app/src/main/java/com/guardianprotocol/mobile/safety/SafetyActionRepository.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/safety/ConfirmationPresenter.kt
- Create: android/app/src/test/java/com/guardianprotocol/mobile/safety/SafetyActionRepositoryTest.kt
- Create: android/app/src/androidTest/java/com/guardianprotocol/mobile/safety/EmergencyFlowTest.kt
- Modify: android/app/src/main/java/com/guardianprotocol/mobile/ui/CommandScreen.kt
- Modify: android/app/src/main/java/com/guardianprotocol/mobile/ui/EmergencyScreen.kt
- Modify: android/app/src/main/java/com/guardianprotocol/mobile/data/SafetyApiClient.kt

**Interfaces:**
- SafetyActionRepository.checkIn(password): ActionResult submits current telemetry and password.
- SafetyActionRepository.sendDuress(): ActionResult invokes silent-alarm and returns generic acknowledgement.
- SafetyActionRepository.sendUnsafeReport(): ActionResult submits the unsafe report without a distinct visible path.
- ConfirmationPresenter.confirmationFor(result): String uses identical visible copy for accepted normal and duress flows.

- [ ] Step 1: Write a failing test proving normal and duress accepted results use identical visible confirmation.
- [ ] Step 2: Route actions through the existing operator-actions endpoints; never add a local Q0-Q4 evaluator.
- [ ] Step 3: Add deliberate hold confirmation for explicit SOS, covert duress password entry, and neutral post-submit status.
- [ ] Step 4: Refresh the server snapshot after each acknowledged action; if unreachable, preserve the local event and show stale/offline rather than claiming escalation succeeded.
- [ ] Step 5: Run:

~~~powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.guardianprotocol.mobile.safety.*"
.\gradlew.bat :app:connectedDebugAndroidTest --tests "com.guardianprotocol.mobile.safety.EmergencyFlowTest"
~~~

- [ ] Step 6: Commit:

~~~powershell
git add android/app/src/main/java/com/guardianprotocol/mobile/safety android/app/src/main/java/com/guardianprotocol/mobile/ui android/app/src/test/java/com/guardianprotocol/mobile/safety android/app/src/androidTest/java/com/guardianprotocol/mobile/safety android/app/src/main/java/com/guardianprotocol/mobile/data/SafetyApiClient.kt
git commit -m "feat: add server-routed mobile safety actions"
~~~

### Task 10: Add incident ledger, permission preflight, and physical-device verification

**Files:**
- Create: android/app/src/main/java/com/guardianprotocol/mobile/ui/PermissionPreflightScreen.kt
- Create: android/app/src/main/java/com/guardianprotocol/mobile/data/IncidentLedgerRepository.kt
- Create: android/app/src/test/java/com/guardianprotocol/mobile/data/IncidentLedgerRepositoryTest.kt
- Create: android/app/src/androidTest/java/com/guardianprotocol/mobile/PermissionPreflightTest.kt
- Modify: android/README.md
- Modify: README.md

**Interfaces:**
- PermissionPreflight.evaluate(): ReadinessReport checks account, device token, location, notifications, service, Health Kit, server reachability, and battery/background settings.
- IncidentLedgerRepository.observe(): Flow<List<IncidentLedgerEntry>> merges local action/sync records with server incidents/events/dispatch records without fabricating delivery.

- [ ] Step 1: Write a failing test proving missing location permission blocks READY.
- [ ] Step 2: Implement preflight and exact remediation for permission, server, Health Kit, device-token, and battery restrictions.
- [ ] Step 3: Implement local/server incident merge and explicit recorded/sent/failed/unknown dispatch states.
- [ ] Step 4: Run all local gates:

~~~powershell
Push-Location frontend
npm run lint
npm run test
npm run build
Pop-Location
Push-Location android
.\gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
Pop-Location
~~~

- [ ] Step 5: On a real Android phone paired to the Huawei Watch GT 5, verify authorization, heart-rate read, sync delay, phone location, battery/network, airplane-mode queueing, process restart, reboot recovery, permission revocation, token revocation, duplicate sequence rejection, normal check-in, duress, explicit SOS, Q0 snapshot display, and stale snapshot labeling.
- [ ] Step 6: Commit:

~~~powershell
git add android/app/src/main/java/com/guardianprotocol/mobile/ui/PermissionPreflightScreen.kt android/app/src/main/java/com/guardianprotocol/mobile/data/IncidentLedgerRepository.kt android/app/src/test/java/com/guardianprotocol/mobile/data/IncidentLedgerRepositoryTest.kt android/app/src/androidTest/java/com/guardianprotocol/mobile/PermissionPreflightTest.kt android/README.md README.md
git commit -m "test: verify Android safety readiness and incident ledger"
~~~

### Task 11: Add repository quality gates

**Files:**
- Create: .github/workflows/ci.yml
- Modify: README.md

**Interfaces:**
- CI runs frontend lint/test/build and Android unit/lint/build on every pull request and push.
- Every lane is required; no failing lane is advisory or skipped.

- [ ] Step 1: Add separate frontend and android jobs. Frontend runs npm ci, npm run lint, npm run test, and npm run build from frontend/. Android runs ./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug from android/ and caches lockfile-keyed Gradle dependencies.
- [ ] Step 2: Validate command forwarding and whitespace:

~~~powershell
git diff --check
~~~

If a YAML parser is available, parse .github/workflows/ci.yml and confirm both working directories and all commands.
- [ ] Step 3: Run the exact commands locally:

~~~powershell
Push-Location frontend
npm ci
npm run lint
npm run test
npm run build
Pop-Location
Push-Location android
.\gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
Pop-Location
~~~

- [ ] Step 4: Commit:

~~~powershell
git add .github/workflows/ci.yml README.md
git commit -m "ci: gate frontend and Android quality checks"
~~~

## Verification checklist before completion

- [ ] Android debug APK builds from a clean checkout using the Gradle wrapper.
- [ ] Android unit, Compose, and physical-device checks pass without focused or skipped tests.
- [ ] Frontend lint, tests, and production build pass after the telemetry contract extension.
- [ ] Server rejects replayed sequences and preserves server received_at authority.
- [ ] Q0-Q4 tests cover exact timing and response transitions without a client watchdog.
- [ ] No location or heart-rate payload is stored unencrypted in the Android outbox.
- [ ] Huawei Health Kit denial and sync delay produce explicit degraded states.
- [ ] Normal and duress confirmations are indistinguishable to the device host.
- [ ] Offline queue recovery, reboot, process restart, permission revocation, and token revocation are verified.
- [ ] Live contact delivery is tested separately and is not represented as complete by dispatch-record creation alone.
