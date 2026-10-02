package com.guardianprotocol.mobile.telemetry.huawei

class HuaweiHealthKitSource(private val client: HealthKitClient) {
    fun status(): HealthKitStatus = client.status()

    fun snapshot(): WatchHealthSnapshot? {
        if (status() != HealthKitStatus.AUTHORIZED) return null
        val sample = client.latestHeartRate()
        return WatchHealthSnapshot(
            heartRateBpm = sample?.bpm,
            heartRateCapturedAt = sample?.capturedAt,
            syncedAt = client.lastSync(),
            connected = client.isWatchConnected(),
        )
    }
}
