package com.guardianprotocol.mobile.background

import com.guardianprotocol.mobile.data.EncryptedOutboxRepository
import com.guardianprotocol.mobile.data.TelemetryPayload
import com.guardianprotocol.mobile.data.UploadDisposition
import java.time.Instant
import kotlin.math.min

interface HeartbeatUploader {
    fun uploadHeartbeat(deviceToken: String, payload: TelemetryPayload): UploadDisposition
}

data class SyncSummary(
    val accepted: Int,
    val retried: Int,
    val quarantined: Int,
)

class SyncCoordinator(
    private val outbox: EncryptedOutboxRepository,
    private val uploader: HeartbeatUploader,
    private val now: () -> Instant = { Instant.now() },
) {
    fun run(deviceToken: String, limit: Int): SyncSummary {
        var accepted = 0
        var retried = 0
        var quarantined = 0
        outbox.pending(limit).forEach { entry ->
            when (val result = uploader.uploadHeartbeat(deviceToken, entry.payload)) {
                UploadDisposition.Accepted -> {
                    outbox.ack(entry.id)
                    accepted += 1
                }

                is UploadDisposition.RetryableFailure -> {
                    val seconds = min(86_400L, 30L shl entry.attempts.coerceAtMost(11))
                    outbox.markRetry(entry.id, now().plusSeconds(seconds), result.reason)
                    retried += 1
                }

                is UploadDisposition.PermanentFailure -> {
                    outbox.markPermanent(entry.id, result.code)
                    quarantined += 1
                }
            }
        }
        return SyncSummary(accepted, retried, quarantined)
    }
}
