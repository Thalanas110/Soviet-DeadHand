package com.guardianprotocol.mobile.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp

object GuardianColors {
    val background = Color(0xFF0B0C0A)
    val foreground = Color(0xFFF2F0E9)
    val card = Color(0xFF121411)
    val panel = Color(0xFF0E100D)
    val border = Color(0xFF3A4038)
    val radar = Color(0xFFC6CBC3)
    val signalRed = Color(0xFFFF3B30)
}

private val GuardianTypography = Typography(
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontSize = 12.sp,
        lineHeight = 18.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontSize = 12.sp,
        letterSpacing = 1.sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontSize = 20.sp,
        letterSpacing = 1.sp,
    ),
)

private val GuardianScheme = darkColorScheme(
    primary = GuardianColors.signalRed,
    onPrimary = GuardianColors.background,
    background = GuardianColors.background,
    onBackground = GuardianColors.foreground,
    surface = GuardianColors.card,
    onSurface = GuardianColors.foreground,
    surfaceVariant = GuardianColors.panel,
    onSurfaceVariant = GuardianColors.radar,
    outline = GuardianColors.border,
)

@Composable
fun GuardianProtocolTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = GuardianScheme,
        typography = GuardianTypography,
        content = content,
    )
}
