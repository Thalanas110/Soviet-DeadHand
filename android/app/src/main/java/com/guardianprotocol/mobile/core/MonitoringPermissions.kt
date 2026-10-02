package com.guardianprotocol.mobile.core

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

object MonitoringPermissions {
    const val FINE_LOCATION = Manifest.permission.ACCESS_FINE_LOCATION
    const val COARSE_LOCATION = Manifest.permission.ACCESS_COARSE_LOCATION
    const val NOTIFICATIONS = Manifest.permission.POST_NOTIFICATIONS

    val required = listOf(FINE_LOCATION, COARSE_LOCATION, NOTIFICATIONS)

    fun missing(context: Context): Array<String> = required
        .filter { ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED }
        .toTypedArray()

    fun hasLocation(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
}
