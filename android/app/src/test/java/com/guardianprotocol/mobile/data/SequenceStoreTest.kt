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
}

private class InMemoryCounterStore(initial: Long) : CounterStore {
    private var value = initial

    override fun read(): Long = value

    override fun write(value: Long) {
        this.value = value
    }
}
