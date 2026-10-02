package com.guardianprotocol.mobile.background

import com.guardianprotocol.mobile.data.CounterStore
import com.guardianprotocol.mobile.data.EncryptedOutboxRepository
import com.guardianprotocol.mobile.data.LocationSample
import com.guardianprotocol.mobile.data.OutboxStorage
import com.guardianprotocol.mobile.data.SequenceStore
import com.guardianprotocol.mobile.data.StoredOutboxEntry
import com.guardianprotocol.mobile.telemetry.TelemetrySource
import com.guardianprotocol.mobile.telemetry.WatchSnapshot
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant
import javax.crypto.spec.SecretKeySpec

class TelemetryCollectorTest {
    @Test
    fun `collector combines phone and watch into encrypted outbox payload`() {
        val outbox = EncryptedOutboxRepository(
            storage = CollectorOutboxStorage(),
            key = SecretKeySpec(ByteArray(32) { 9 }, "AES"),
        )
        val collector = TelemetryCollector(
            phone = FakePhoneSource(),
            watch = { WatchSnapshot(72, Instant.EPOCH, Instant.EPOCH, true) },
            sequence = SequenceStore(FakeCounterStore()),
            outbox = outbox,
            now = { Instant.ofEpochMilli(1_000) },
        )

        collector.collect()

        val payload = outbox.pending(1).single().payload
        assertEquals(1L, payload.sequence)
        assertEquals(72, payload.heartRateBpm)
        assertEquals(14.6, payload.location?.latitude ?: 0.0, 0.0)
    }
}

private class FakePhoneSource : TelemetrySource {
    override fun snapshot() = com.guardianprotocol.mobile.telemetry.SourceSnapshot(
        location = LocationSample(14.6, 121.0, 5f),
        batteryPercent = 80,
        charging = false,
        networkAvailable = true,
        phoneActive = true,
    )
}

private class FakeCounterStore : CounterStore {
    private var value = 0L
    override fun read(): Long = value
    override fun write(value: Long) { this.value = value }
}

private class CollectorOutboxStorage : OutboxStorage {
    private val entries = linkedMapOf<String, StoredOutboxEntry>()
    override fun put(entry: StoredOutboxEntry) { entries[entry.id] = entry }
    override fun all(): List<StoredOutboxEntry> = entries.values.toList()
    override fun remove(id: String) { entries.remove(id) }
}
