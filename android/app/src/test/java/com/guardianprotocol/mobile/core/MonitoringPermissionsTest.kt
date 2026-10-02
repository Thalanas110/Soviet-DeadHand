package com.guardianprotocol.mobile.core

import org.junit.Assert.assertTrue
import org.junit.Test

class MonitoringPermissionsTest {
    @Test
    fun `monitoring declares location and notification requirements`() {
        assertTrue(MonitoringPermissions.required.contains(MonitoringPermissions.FINE_LOCATION))
        assertTrue(MonitoringPermissions.required.contains(MonitoringPermissions.COARSE_LOCATION))
        assertTrue(MonitoringPermissions.required.contains(MonitoringPermissions.NOTIFICATIONS))
    }
}
