package com.guardianprotocol.mobile.data

import org.junit.Assert.assertEquals
import org.junit.Test

class SequenceStoreTest {
    @Test
    fun `next returns strictly increasing values`() {
        val store = SequenceStore(InMemoryCounterStore(41))

        assertEquals(42L, store.next())
        assertEquals(43L, store.next())
    }

    @Test
    fun `secure counter store persists sequence through secret storage`() {
        val secrets = object : SecretStore {
            private var value: String? = "41"
            override fun get(key: String): String? = value
            override fun put(key: String, value: String) { this.value = value }
        }

        assertEquals(42L, SequenceStore(SecureCounterStore(secrets)).next())
    }
}

private class InMemoryCounterStore(initial: Long) : CounterStore {
    private var value = initial

    override fun read(): Long = value

    override fun write(value: Long) {
        this.value = value
    }
}
