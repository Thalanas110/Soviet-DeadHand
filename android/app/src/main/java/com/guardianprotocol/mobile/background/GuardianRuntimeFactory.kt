package com.guardianprotocol.mobile.background

import android.content.Context
import com.guardianprotocol.mobile.core.AndroidKeystoreKey
import com.guardianprotocol.mobile.core.AndroidSecureStore
import com.guardianprotocol.mobile.data.EncryptedOutboxRepository
import com.guardianprotocol.mobile.data.FileOutboxStorage
import com.guardianprotocol.mobile.data.SafetyApiClient
import com.guardianprotocol.mobile.data.SecureCounterStore
import com.guardianprotocol.mobile.data.SequenceStore
import com.guardianprotocol.mobile.telemetry.AndroidPhoneTelemetrySource
import java.io.File
import java.security.KeyStore

object GuardianRuntimeFactory {
    fun create(context: Context, endpoint: String): MonitoringRuntime {
        val secureStore = AndroidSecureStore(context)
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val payloadKey = AndroidKeystoreKey.getOrCreate(keyStore, "guardian_outbox_payloads")
        val outbox = EncryptedOutboxRepository(
            storage = FileOutboxStorage(File(context.filesDir, "guardian_outbox.bin")),
            key = payloadKey,
        )
        val collector = TelemetryCollector(
            phone = AndroidPhoneTelemetrySource(context),
            watch = { null },
            sequence = SequenceStore(SecureCounterStore(secureStore)),
            outbox = outbox,
        )
        val uploader = SafetyApiClient(endpoint, com.guardianprotocol.mobile.data.UrlConnectionTransport())
        val coordinator = SyncCoordinator(outbox, uploader)
        return GuardianMonitoringRuntime(
            collector = collector,
            deviceToken = { secureStore.get("registered_device_token").takeUnless { endpoint.isBlank() } },
            coordinator = coordinator,
        )
    }
}
