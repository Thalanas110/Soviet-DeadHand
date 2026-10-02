package com.guardianprotocol.mobile.telemetry

import com.guardianprotocol.mobile.data.LocationSample
import java.time.Instant

interface TelemetrySource {
    fun snapshot(): SourceSnapshot
}

data class SourceSnapshot(
    val location: LocationSample?,
    val batteryPercent: Int?,
    val charging: Boolean?,
    val networkAvailable: Boolean?,
    val phoneActive: Boolean?,
)

data class WatchSnapshot(
    val heartRateBpm: Int?,
    val heartRateCapturedAt: Instant?,
    val syncedAt: Instant?,
    val connected: Boolean?,
)
