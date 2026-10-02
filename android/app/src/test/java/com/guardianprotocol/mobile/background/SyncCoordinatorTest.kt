package com.guardianprotocol.mobile.background

import com.guardianprotocol.mobile.data.EncryptedOutboxRepository
import com.guardianprotocol.mobile.data.OutboxStorage
import com.guardianprotocol.mobile.data.StoredOutboxEntry
import com.guardianprotocol.mobile.data.SafetyApiClient
import com.guardianprotocol.mobile.data.TelemetryPayload
import com.guardianprotocol.mobile.data.UploadDisposition
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant
import javax.crypto.spec.SecretKeySpec

class SyncCoordinatorTest {
    @Test
    fun `accepted entries are acknowledged and transient failures remain queued`() {
        val storage = BackgroundOutboxStorage()
        val outbox = EncryptedOutboxRepository(storage, SecretKeySpec(ByteArray(32) { 3 }, "AES"))
        outbox.enqueue(TelemetryPayload(1, Instant.EPOCH))
        outbox.enqueue(TelemetryPayload(2, Instant.EPOCH))
        val uploader = FakeUploader(
            listOf(
                UploadDisposition.Accepted,
                UploadDisposition.RetryableFailure("NETWORK"),
            ),
        )

        val result = SyncCoordinator(outbox, uploader, now = { Instant.EPOCH }).run("token", 10)

        assertEquals(SyncSummary(1, 1, 0), result)
        assertEquals(listOf(2L), outbox.pending(10).map { it.payload.sequence })
    }
}

private class FakeUploader(responses: List<UploadDisposition>) : HeartbeatUploader {
    private val pending = responses.toMutableList()

    override fun uploadHeartbeat(deviceToken: String, payload: TelemetryPayload): UploadDisposition = pending.removeAt(0)
}

private class BackgroundOutboxStorage : OutboxStorage {
    private val entries = linkedMapOf<String, StoredOutboxEntry>()

    override fun put(entry: StoredOutboxEntry) {
        entries[entry.id] = entry
    }

    override fun all(): List<StoredOutboxEntry> = entries.values.toList()

    override fun remove(id: String) {
        entries.remove(id)
    }
}
