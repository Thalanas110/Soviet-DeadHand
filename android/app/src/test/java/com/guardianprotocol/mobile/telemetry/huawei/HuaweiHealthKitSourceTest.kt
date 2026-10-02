package com.guardianprotocol.mobile.telemetry.huawei

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.Instant

class HuaweiHealthKitSourceTest {
    @Test
    fun `authorized Health Kit sample becomes a watch snapshot`() {
        val source = HuaweiHealthKitSource(object : HealthKitClient {
            override fun status(): HealthKitStatus = HealthKitStatus.AUTHORIZED

            override fun latestHeartRate(): HeartRateSample =
                HeartRateSample(72, Instant.ofEpochMilli(1_000))

            override fun lastSync(): Instant = Instant.ofEpochMilli(1_500)

            override fun isWatchConnected(): Boolean = true
        })

        assertEquals(
            WatchHealthSnapshot(72, Instant.ofEpochMilli(1_000), Instant.ofEpochMilli(1_500), true),
            source.snapshot(),
        )
    }

    @Test
    fun `unauthorized Health Kit source is explicit and empty`() {
        val source = HuaweiHealthKitSource(object : HealthKitClient {
            override fun status(): HealthKitStatus = HealthKitStatus.NEEDS_AUTHORIZATION

            override fun latestHeartRate(): HeartRateSample? = HeartRateSample(72, Instant.EPOCH)

            override fun lastSync(): Instant? = Instant.EPOCH

            override fun isWatchConnected(): Boolean = true
        })

        assertNull(source.snapshot())
        assertEquals(HealthKitStatus.NEEDS_AUTHORIZATION, source.status())
    }
}
