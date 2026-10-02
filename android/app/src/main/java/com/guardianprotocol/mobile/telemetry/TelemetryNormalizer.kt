package com.guardianprotocol.mobile.telemetry

import com.guardianprotocol.mobile.data.TelemetryPayload
import java.time.Instant

object TelemetryNormalizer {
    fun normalize(
        sequence: Long,
        capturedAt: Instant,
        phone: SourceSnapshot,
        watch: WatchSnapshot?,
    ): TelemetryPayload = TelemetryPayload(
        sequence = sequence,
        capturedAt = capturedAt,
        location = phone.location,
        batteryPercent = phone.batteryPercent,
        charging = phone.charging,
        networkAvailable = phone.networkAvailable,
        phoneActive = phone.phoneActive,
        heartRateBpm = watch?.heartRateBpm,
        heartRateCapturedAt = watch?.heartRateCapturedAt,
        wearableSyncAt = watch?.syncedAt,
        wearableConnected = watch?.connected,
    )
}
