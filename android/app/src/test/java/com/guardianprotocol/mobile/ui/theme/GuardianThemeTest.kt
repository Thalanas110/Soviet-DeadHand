package com.guardianprotocol.mobile.ui.theme

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Test

class GuardianThemeTest {
    @Test
    fun `palette preserves the web command surface tokens`() {
        assertEquals(Color(0xFF0B0C0A), GuardianColors.background)
        assertEquals(Color(0xFF121411), GuardianColors.card)
        assertEquals(Color(0xFF0E100D), GuardianColors.panel)
        assertEquals(Color(0xFF3A4038), GuardianColors.border)
        assertEquals(Color(0xFFC6CBC3), GuardianColors.radar)
        assertEquals(Color(0xFFFF3B30), GuardianColors.signalRed)
    }
}
