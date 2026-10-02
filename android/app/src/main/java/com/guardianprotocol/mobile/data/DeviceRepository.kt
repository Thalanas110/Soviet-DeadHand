package com.guardianprotocol.mobile.data

interface SecretStore {
    fun get(key: String): String?

    fun put(key: String, value: String)
}

data class RegisteredDevice(
    val id: String,
    val token: String,
    val label: String,
)

fun interface DeviceRegistrationApi {
    fun registerDevice(label: String): RegisteredDevice
}

class DeviceRepository(
    private val api: DeviceRegistrationApi,
    private val secrets: SecretStore,
) {
    fun registerPhone(label: String): RegisteredDevice {
        val device = api.registerDevice(label)
        secrets.put(DEVICE_TOKEN_KEY, device.token)
        secrets.put(DEVICE_ID_KEY, device.id)
        return device
    }

    fun deviceToken(): String? = secrets.get(DEVICE_TOKEN_KEY)

    fun deviceId(): String? = secrets.get(DEVICE_ID_KEY)

    companion object {
        const val DEVICE_TOKEN_KEY = "registered_device_token"
        const val DEVICE_ID_KEY = "registered_device_id"
    }
}
