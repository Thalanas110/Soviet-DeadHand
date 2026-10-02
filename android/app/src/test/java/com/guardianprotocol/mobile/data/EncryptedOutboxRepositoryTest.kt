package com.guardianprotocol.mobile.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import java.time.Instant
import javax.crypto.spec.SecretKeySpec

class EncryptedOutboxRepositoryTest {
    @Test
    fun `queued payload is encrypted and acknowledgement removes only that entry`() {
        val storage = InMemoryOutboxStorage()
        val repository = EncryptedOutboxRepository(
            storage = storage,
            key = SecretKeySpec(ByteArray(32) { 7 }, "AES"),
        )
        val first = repository.enqueue(TelemetryPayload(sequence = 1, capturedAt = Instant.EPOCH))
        val second = repository.enqueue(TelemetryPayload(sequence = 2, capturedAt = Instant.EPOCH))

        assertFalse(storage.raw(first).contentEquals("sequence=1".encodeToByteArray()))
        assertEquals(listOf(1L, 2L), repository.pending(10).map { it.payload.sequence })

        repository.ack(first)

        assertEquals(listOf(second), repository.pending(10).map { it.id })
    }
}

private class InMemoryOutboxStorage : OutboxStorage {
    private val values = linkedMapOf<String, StoredOutboxEntry>()

    override fun put(entry: StoredOutboxEntry) {
        values[entry.id] = entry
    }

    override fun all(): List<StoredOutboxEntry> = values.values.toList()

    override fun remove(id: String) {
        values.remove(id)
    }

    fun raw(id: String): ByteArray = values.getValue(id).ciphertext
}
