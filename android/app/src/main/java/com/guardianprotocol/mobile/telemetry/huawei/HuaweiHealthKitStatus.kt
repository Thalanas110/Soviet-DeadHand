package com.guardianprotocol.mobile.telemetry.huawei

enum class HealthKitStatus {
    UNAVAILABLE,
    NEEDS_AUTHORIZATION,
    AUTHORIZED,
    ERROR,
}

data class HeartRateSample(
    val bpm: Int,
    val capturedAt: java.time.Instant,
)

data class WatchHealthSnapshot(
    val heartRateBpm: Int?,
    val heartRateCapturedAt: java.time.Instant?,
    val syncedAt: java.time.Instant?,
    val connected: Boolean?,
)

interface HealthKitClient {
    fun status(): HealthKitStatus

    fun latestHeartRate(): HeartRateSample?

    fun lastSync(): java.time.Instant?

    fun isWatchConnected(): Boolean?
}

class HealthKitPermissionCoordinator(private val client: HealthKitClient) {
    fun status(): HealthKitStatus = client.status()

    fun requiresUserAction(): Boolean = status() == HealthKitStatus.NEEDS_AUTHORIZATION
}
