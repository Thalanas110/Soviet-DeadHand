package com.guardianprotocol.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            GuardianProtocolPreview()
        }
    }
}

@Composable
private fun GuardianProtocolPreview() {
    MaterialTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0B0C0A)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "GUARDIAN PROTOCOL / INITIALIZING",
                color = Color(0xFFFF3B30),
                fontFamily = FontFamily.Monospace,
            )
        }
    }
}
