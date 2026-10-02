package com.guardianprotocol.mobile.ui

import org.junit.Assert.assertEquals
import org.junit.Test

class GuardianUiStateTest {
    @Test
    fun `initial state makes server authority and source setup visible`() {
        val state = GuardianUiState.initial()

        assertEquals("Q0 / WATCH", state.serverPhase)
        assertEquals("SERVER LINK / PENDING", state.serverStatus)
        assertEquals("HEALTH KIT / NEEDS SETUP", state.wearableStatus)
        assertEquals("NO LOCAL COUNTDOWN", state.countdownLabel)
    }
}
