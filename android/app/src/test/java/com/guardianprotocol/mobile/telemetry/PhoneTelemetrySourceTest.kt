package com.guardianprotocol.mobile.telemetry

import com.guardianprotocol.mobile.data.LocationSample
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PhoneTelemetrySourceTest {
    @Test
    fun `source exposes each provider value without inventing availability`() {
        val source = PhoneTelemetrySource(
            locationProvider = { null },
            batteryProvider = { BatterySnapshot(12, false) },
            networkProvider = { true },
            activityProvider = { false },
        )

        val snapshot = source.snapshot()

        assertNull(snapshot.location)
        assertEquals(12, snapshot.batteryPercent)
        assertEquals(false, snapshot.charging)
        assertEquals(true, snapshot.networkAvailable)
        assertEquals(false, snapshot.phoneActive)
    }

    @Test
    fun `location provider value is forwarded`() {
        val location = LocationSample(14.6, 121.0, 5f)
        val source = PhoneTelemetrySource(
            locationProvider = { location },
            batteryProvider = { BatterySnapshot(90, true) },
            networkProvider = { false },
            activityProvider = { true },
        )

        assertEquals(location, source.snapshot().location)
    }
}
