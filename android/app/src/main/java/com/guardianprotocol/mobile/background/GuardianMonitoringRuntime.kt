package com.guardianprotocol.mobile.background

class GuardianMonitoringRuntime(
    private val collector: TelemetryCollector,
    private val deviceToken: () -> String?,
    private val coordinator: SyncCoordinator,
) : MonitoringRuntime {
    override suspend fun sync(): SyncSummary {
        collector.collect()
        val token = deviceToken() ?: return SyncSummary(0, 0, 0)
        return coordinator.run(token, limit = 25)
    }
}
