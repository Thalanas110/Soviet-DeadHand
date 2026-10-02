package com.guardianprotocol.mobile

import android.Manifest
import android.os.Bundle
import android.content.Intent
import android.content.pm.PackageManager
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.content.ContextCompat
import com.guardianprotocol.mobile.background.MonitoringService
import com.guardianprotocol.mobile.background.GuardianRuntimeFactory
import com.guardianprotocol.mobile.background.MonitoringRuntimeProvider
import com.guardianprotocol.mobile.core.MonitoringPermissions
import com.guardianprotocol.mobile.ui.GuardianShell
import com.guardianprotocol.mobile.ui.theme.SovietDeadHandTheme

class MainActivity : ComponentActivity() {
    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) {
        startMonitoringIfPermitted()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SovietDeadHandTheme {
                GuardianShell()
            }
        }
        MonitoringRuntimeProvider.current = GuardianRuntimeFactory.create(
            applicationContext,
            BuildConfig.SUPABASE_URL,
        )
        requestMonitoringPermissions()
    }

    private fun requestMonitoringPermissions() {
        val missing = MonitoringPermissions.missing(this)
        if (missing.isEmpty()) {
            startMonitoringIfPermitted()
        } else {
            permissionLauncher.launch(missing)
        }
    }

    private fun startMonitoringIfPermitted() {
        if (!MonitoringPermissions.hasLocation(this)) return
        val intent = Intent(this, MonitoringService::class.java)
        ContextCompat.startForegroundService(this, intent)
    }
}
