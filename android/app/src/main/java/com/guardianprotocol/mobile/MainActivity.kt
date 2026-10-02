package com.guardianprotocol.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import com.guardianprotocol.mobile.ui.GuardianShell
import com.guardianprotocol.mobile.ui.theme.GuardianProtocolTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            GuardianProtocolTheme {
                GuardianShell()
            }
        }
    }
}
