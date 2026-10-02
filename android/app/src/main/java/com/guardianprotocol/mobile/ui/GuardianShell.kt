package com.guardianprotocol.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.RectangleShape
import com.guardianprotocol.mobile.ui.theme.GuardianColors

data class GuardianUiState(
    val serverPhase: String,
    val serverStatus: String,
    val wearableStatus: String,
    val countdownLabel: String,
    val lastContact: String = "LAST CONTACT / NOT YET RECEIVED",
) {
    companion object {
        fun initial() = GuardianUiState(
            serverPhase = "Q0 / WATCH",
            serverStatus = "SERVER LINK / PENDING",
            wearableStatus = "HEALTH KIT / NEEDS SETUP",
            countdownLabel = "NO LOCAL COUNTDOWN",
        )
    }
}

@Composable
fun GuardianShell(
    state: GuardianUiState = GuardianUiState.initial(),
    onCheckIn: () -> Unit = {},
    onDuress: () -> Unit = {},
) {
    Surface(color = GuardianColors.background, contentColor = GuardianColors.foreground) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                text = "GUARDIAN PROTOCOL",
                style = MaterialTheme.typography.headlineSmall,
                color = GuardianColors.signalRed,
            )
            Text(
                text = "NATIVE SAFETY COMPANION / PHONE + WATCH",
                style = MaterialTheme.typography.bodyMedium,
                color = GuardianColors.radar,
            )
            HorizontalDivider(color = GuardianColors.border)
            StatusPanel(state)
            ReadinessRail(state)
            ActionPanel(onCheckIn, onDuress)
            SourcePanel(state)
            Text(
                text = "SERVER AUTHORITY / Q0-Q4 TRANSITIONS ARE NOT CALCULATED ON THIS DEVICE",
                style = MaterialTheme.typography.bodyMedium,
                color = GuardianColors.radar,
            )
        }
    }
}

@Composable
private fun StatusPanel(state: GuardianUiState) {
    CommandPanel {
        Text("STATE / ${state.serverPhase}", color = GuardianColors.signalRed)
        Spacer(Modifier.height(8.dp))
        Text(state.serverStatus, color = GuardianColors.radar)
        Text(state.countdownLabel, color = GuardianColors.radar)
        Text(state.lastContact, color = GuardianColors.radar)
    }
}

@Composable
private fun ReadinessRail(state: GuardianUiState) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, GuardianColors.border)
            .padding(12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text("PHONE / READY", color = GuardianColors.radar)
        Text(state.wearableStatus, color = GuardianColors.radar)
    }
}

@Composable
private fun ActionPanel(onCheckIn: () -> Unit, onDuress: () -> Unit) {
    CommandPanel {
        Text("CONTACT COMMAND", color = GuardianColors.foreground)
        Spacer(Modifier.height(10.dp))
        Row(modifier = Modifier.fillMaxWidth()) {
            ActionButton("CHECK IN", GuardianColors.radar, onCheckIn, Modifier.weight(1f))
            Spacer(Modifier.width(10.dp))
            ActionButton("SILENT DURESS", GuardianColors.signalRed, onDuress, Modifier.weight(1f))
        }
    }
}

@Composable
private fun ActionButton(
    label: String,
    color: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit,
    modifier: Modifier,
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(56.dp),
        shape = RectangleShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = color,
            contentColor = GuardianColors.background,
        ),
    ) {
        Text(label, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
private fun SourcePanel(state: GuardianUiState) {
    CommandPanel {
        Text("SOURCE READINESS", color = GuardianColors.foreground)
        Spacer(Modifier.height(8.dp))
        Text("PHONE LOCATION / PERMISSION REQUIRED", color = GuardianColors.radar)
        Text(state.wearableStatus, color = GuardianColors.radar)
        Text("OUTBOX / ENCRYPTED DISK QUEUE", color = GuardianColors.radar)
        Text("MONITOR / FOREGROUND + WORKMANAGER", color = GuardianColors.radar)
    }
}

@Composable
private fun CommandPanel(content: @Composable () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(GuardianColors.panel)
            .border(1.dp, GuardianColors.border)
            .padding(14.dp),
        content = { content() },
    )
}
