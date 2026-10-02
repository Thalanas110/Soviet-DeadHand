package com.guardianprotocol.mobile.telemetry

import com.guardianprotocol.mobile.data.LocationSample
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class TelemetryNormalizerTest {
    @Test
    fun `missing location remains diagnostic while heart rate is preserved`() {
        val payload = TelemetryNormalizer.normalize(
            sequence = 10,
            capturedAt = Instant.ofEpochMilli(2_000),
            phone = SourceSnapshot(
                location = null,
                batteryPercent = 81,
                charging = true,
                networkAvailable = true,
                phoneActive = true,
            ),
            watch = WatchSnapshot(
                heartRateBpm = 72,
                heartRateCapturedAt = Instant.ofEpochMilli(1_500),
                syncedAt = Instant.ofEpochMilli(1_900),
                connected = true,
            ),
        )

        assertFalse(payload.complete)
        assertEquals(72, payload.heartRateBpm)
        assertEquals(81, payload.batteryPercent)
    }

    @Test
    fun `location makes payload complete without changing source timestamps`() {
        val timestamp = Instant.ofEpochMilli(2_000)
        val payload = TelemetryNormalizer.normalize(
            sequence = 11,
            capturedAt = timestamp,
            phone = SourceSnapshot(
                location = LocationSample(14.5995, 120.9842, 8f),
                batteryPercent = 40,
                charging = false,
                networkAvailable = true,
                phoneActive = false,
            ),
            watch = null,
        )

        assertTrue(payload.complete)
        assertEquals(timestamp, payload.capturedAt)
        assertEquals(14.5995, payload.location?.latitude ?: 0.0, 0.0)
    }
}
