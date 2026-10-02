package com.guardianprotocol.mobile.data

import org.junit.Assert.assertEquals
import org.junit.Test

class DeviceRepositoryTest {
    @Test
    fun `registration stores the returned token in the secret store`() {
        val secrets = FakeSecretStore()
        val repository = DeviceRepository(
            api = FakeRegistrationApi(RegisteredDevice("device-1", "opaque-token", "phone")),
            secrets = secrets,
        )

        val registered = repository.registerPhone("phone")

        assertEquals("device-1", registered.id)
        assertEquals("opaque-token", secrets.values[DeviceRepository.DEVICE_TOKEN_KEY])
        assertEquals("opaque-token", repository.deviceToken())
    }
}

private class FakeSecretStore : SecretStore {
    val values = linkedMapOf<String, String>()

    override fun get(key: String): String? = values[key]

    override fun put(key: String, value: String) {
        values[key] = value
    }
}

private class FakeRegistrationApi(private val device: RegisteredDevice) : DeviceRegistrationApi {
    override fun registerDevice(label: String): RegisteredDevice = device
}
