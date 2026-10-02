package com.guardianprotocol.mobile.background

import com.guardianprotocol.mobile.data.CounterStore
import com.guardianprotocol.mobile.data.EncryptedOutboxRepository
import com.guardianprotocol.mobile.data.OutboxStorage
import com.guardianprotocol.mobile.data.SequenceStore
import com.guardianprotocol.mobile.data.StoredOutboxEntry
import com.guardianprotocol.mobile.data.TelemetryPayload
import com.guardianprotocol.mobile.data.UploadDisposition
import com.guardianprotocol.mobile.telemetry.SourceSnapshot
import com.guardianprotocol.mobile.telemetry.TelemetrySource
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant
import javax.crypto.spec.SecretKeySpec

class GuardianMonitoringRuntimeTest {
    @Test
    fun `runtime collects even when registration is not ready`() = kotlinx.coroutines.runBlocking {
        val storage = RuntimeOutboxStorage()
        val outbox = EncryptedOutboxRepository(storage, SecretKeySpec(ByteArray(32) { 4 }, "AES"))
        val collector = TelemetryCollector(
            phone = object : TelemetrySource {
                override fun snapshot() = SourceSnapshot(null, 50, false, true, false)
            },
            watch = { null },
            sequence = SequenceStore(object : CounterStore {
                var value = 0L
                override fun read() = value
                override fun write(value: Long) { this.value = value }
            }),
            outbox = outbox,
            now = { Instant.EPOCH },
        )
        val coordinator = SyncCoordinator(outbox, object : HeartbeatUploader {
            override fun uploadHeartbeat(deviceToken: String, payload: TelemetryPayload) = UploadDisposition.Accepted
        }, now = { Instant.EPOCH })

        val result = GuardianMonitoringRuntime(collector, { null }, coordinator).sync()

        assertEquals(SyncSummary(0, 0, 0), result)
        assertEquals(1, storage.entries.size)
    }
}

private class RuntimeOutboxStorage : OutboxStorage {
    val entries = linkedMapOf<String, StoredOutboxEntry>()
    override fun put(entry: StoredOutboxEntry) { entries[entry.id] = entry }
    override fun all(): List<StoredOutboxEntry> = entries.values.toList()
    override fun remove(id: String) { entries.remove(id) }
}
