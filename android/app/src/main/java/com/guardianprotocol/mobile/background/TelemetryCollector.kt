package com.guardianprotocol.mobile.background

import com.guardianprotocol.mobile.data.EncryptedOutboxRepository
import com.guardianprotocol.mobile.data.SequenceStore
import com.guardianprotocol.mobile.telemetry.TelemetryNormalizer
import com.guardianprotocol.mobile.telemetry.TelemetrySource
import com.guardianprotocol.mobile.telemetry.WatchSnapshot
import java.time.Instant

class TelemetryCollector(
    private val phone: TelemetrySource,
    private val watch: () -> WatchSnapshot?,
    private val sequence: SequenceStore,
    private val outbox: EncryptedOutboxRepository,
    private val now: () -> Instant = { Instant.now() },
) {
    fun collect(): String {
        val payload = TelemetryNormalizer.normalize(
            sequence = sequence.next(),
            capturedAt = now(),
            phone = phone.snapshot(),
            watch = watch(),
        )
        return outbox.enqueue(payload)
    }
}
