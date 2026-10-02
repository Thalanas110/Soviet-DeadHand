package com.guardianprotocol.mobile.data

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.time.Instant

data class LocationSample(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float?,
)

data class TelemetryPayload(
    val sequence: Long,
    val capturedAt: Instant,
    val location: LocationSample? = null,
    val batteryPercent: Int? = null,
    val charging: Boolean? = null,
    val networkAvailable: Boolean? = null,
    val phoneActive: Boolean? = null,
    val heartRateBpm: Int? = null,
    val heartRateCapturedAt: Instant? = null,
    val wearableSyncAt: Instant? = null,
    val wearableConnected: Boolean? = null,
    val priority: Int = 50,
) {
    val complete: Boolean
        get() = location != null

    fun encode(): ByteArray {
        val bytes = ByteArrayOutputStream()
        DataOutputStream(bytes).use { output ->
            output.writeLong(sequence)
            output.writeLong(capturedAt.toEpochMilli())
            output.writeLocation(location)
            output.writeNullableInt(batteryPercent)
            output.writeNullableBoolean(charging)
            output.writeNullableBoolean(networkAvailable)
            output.writeNullableBoolean(phoneActive)
            output.writeNullableInt(heartRateBpm)
            output.writeNullableInstant(heartRateCapturedAt)
            output.writeNullableInstant(wearableSyncAt)
            output.writeNullableBoolean(wearableConnected)
            output.writeInt(priority)
        }
        return bytes.toByteArray()
    }

    companion object {
        fun decode(bytes: ByteArray): TelemetryPayload {
            DataInputStream(ByteArrayInputStream(bytes)).use { input ->
                return TelemetryPayload(
                    sequence = input.readLong(),
                    capturedAt = Instant.ofEpochMilli(input.readLong()),
                    location = readLocation(input),
                    batteryPercent = readNullableInt(input),
                    charging = readNullableBoolean(input),
                    networkAvailable = readNullableBoolean(input),
                    phoneActive = readNullableBoolean(input),
                    heartRateBpm = readNullableInt(input),
                    heartRateCapturedAt = readNullableInstant(input),
                    wearableSyncAt = readNullableInstant(input),
                    wearableConnected = readNullableBoolean(input),
                    priority = input.readInt(),
                )
            }
        }

        private fun readLocation(input: DataInputStream): LocationSample? =
            if (!input.readBoolean()) {
                null
            } else {
                LocationSample(
                    latitude = input.readDouble(),
                    longitude = input.readDouble(),
                    accuracyMeters = readNullableFloat(input),
                )
            }

        private fun readNullableInt(input: DataInputStream): Int? =
            if (input.readBoolean()) input.readInt() else null

        private fun readNullableFloat(input: DataInputStream): Float? =
            if (input.readBoolean()) input.readFloat() else null

        private fun readNullableBoolean(input: DataInputStream): Boolean? =
            if (input.readBoolean()) input.readBoolean() else null

        private fun readNullableInstant(input: DataInputStream): Instant? =
            if (input.readBoolean()) Instant.ofEpochMilli(input.readLong()) else null
    }
}

private fun DataOutputStream.writeLocation(location: LocationSample?) {
    writeBoolean(location != null)
    if (location != null) {
        writeDouble(location.latitude)
        writeDouble(location.longitude)
        writeBoolean(location.accuracyMeters != null)
        if (location.accuracyMeters != null) writeFloat(location.accuracyMeters)
    }
}

private fun DataOutputStream.writeNullableInt(value: Int?) {
    writeBoolean(value != null)
    if (value != null) writeInt(value)
}

private fun DataOutputStream.writeNullableBoolean(value: Boolean?) {
    writeBoolean(value != null)
    if (value != null) writeBoolean(value)
}

private fun DataOutputStream.writeNullableInstant(value: Instant?) {
    writeBoolean(value != null)
    if (value != null) writeLong(value.toEpochMilli())
}
