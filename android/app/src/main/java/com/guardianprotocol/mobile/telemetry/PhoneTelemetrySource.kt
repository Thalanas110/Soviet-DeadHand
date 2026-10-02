package com.guardianprotocol.mobile.telemetry

import android.Manifest
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.ConnectivityManager
import android.os.BatteryManager
import androidx.core.content.ContextCompat
import com.guardianprotocol.mobile.data.LocationSample

data class BatterySnapshot(val percent: Int?, val charging: Boolean?)

class PhoneTelemetrySource(
    private val locationProvider: () -> LocationSample?,
    private val batteryProvider: () -> BatterySnapshot,
    private val networkProvider: () -> Boolean?,
    private val activityProvider: () -> Boolean?,
) : TelemetrySource {
    override fun snapshot(): SourceSnapshot {
        val battery = batteryProvider()
        return SourceSnapshot(
            location = locationProvider(),
            batteryPercent = battery.percent,
            charging = battery.charging,
            networkAvailable = networkProvider(),
            phoneActive = activityProvider(),
        )
    }
}

class AndroidPhoneTelemetrySource(private val context: Context) : TelemetrySource {
    private val locationManager = context.getSystemService(LocationManager::class.java)
    private val connectivityManager = context.getSystemService(ConnectivityManager::class.java)
    private val activityManager = context.getSystemService(ActivityManager::class.java)

    private val delegate = PhoneTelemetrySource(
        locationProvider = ::lastLocation,
        batteryProvider = ::battery,
        networkProvider = ::networkAvailable,
        activityProvider = ::processActive,
    )

    override fun snapshot(): SourceSnapshot = delegate.snapshot()

    private fun lastLocation(): LocationSample? {
        val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        if (!hasFine && !hasCoarse) return null

        return locationManager.allProviders
            .asSequence()
            .mapNotNull { provider -> runCatching { locationManager.getLastKnownLocation(provider) }.getOrNull() }
            .maxByOrNull { it.time }
            ?.let { LocationSample(it.latitude, it.longitude, it.accuracy) }
    }

    private fun battery(): BatterySnapshot {
        val intent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = intent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val status = intent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val percent = if (level >= 0 && scale > 0) (level * 100 / scale).coerceIn(0, 100) else null
        val charging = status.takeIf { it >= 0 }?.let {
            it == BatteryManager.BATTERY_STATUS_CHARGING || it == BatteryManager.BATTERY_STATUS_FULL
        }
        return BatterySnapshot(percent, charging)
    }

    private fun networkAvailable(): Boolean = connectivityManager.activeNetwork != null

    private fun processActive(): Boolean {
        val processName = context.applicationInfo.processName
        return activityManager.runningAppProcesses
            ?.firstOrNull { it.processName == processName }
            ?.importance
            ?.let { it <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND }
            ?: false
    }
}
