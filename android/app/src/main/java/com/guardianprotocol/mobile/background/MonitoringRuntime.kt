package com.guardianprotocol.mobile.background

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

interface MonitoringRuntime {
    suspend fun sync(): SyncSummary
}

object MonitoringRuntimeProvider {
    @Volatile
    var current: MonitoringRuntime = object : MonitoringRuntime {
        override suspend fun sync(): SyncSummary = SyncSummary(0, 0, 0)
    }
}

class MonitoringWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result = runCatching {
        MonitoringRuntimeProvider.current.sync()
    }.fold(
        onSuccess = { Result.success() },
        onFailure = { Result.retry() },
    )
}

object MonitoringSchedule {
    private const val UNIQUE_NAME = "guardian-periodic-monitoring"

    fun install(context: Context) {
        val request = PeriodicWorkRequestBuilder<MonitoringWorker>(15, TimeUnit.MINUTES).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            UNIQUE_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            request,
        )
    }
}
