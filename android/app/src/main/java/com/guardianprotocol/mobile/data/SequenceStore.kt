package com.guardianprotocol.mobile.data

import android.content.SharedPreferences

interface CounterStore {
    fun read(): Long

    fun write(value: Long)
}

class SharedPreferencesCounterStore(
    private val preferences: SharedPreferences,
    private val key: String = "telemetry_sequence",
) : CounterStore {
    override fun read(): Long = preferences.getLong(key, 0L)

    override fun write(value: Long) {
        check(preferences.edit().putLong(key, value).commit()) {
            "Unable to persist telemetry sequence"
        }
    }
}

class SequenceStore(private val storage: CounterStore) {
    @Synchronized
    fun next(): Long {
        val current = storage.read()
        check(current < Long.MAX_VALUE) { "Telemetry sequence exhausted" }
        val next = current + 1
        storage.write(next)
        return next
    }
}

class SecureCounterStore(
    private val secrets: SecretStore,
    private val key: String = "telemetry_sequence",
) : CounterStore {
    override fun read(): Long = secrets.get(key)?.toLongOrNull() ?: 0L

    override fun write(value: Long) {
        secrets.put(key, value.toString())
    }
}
