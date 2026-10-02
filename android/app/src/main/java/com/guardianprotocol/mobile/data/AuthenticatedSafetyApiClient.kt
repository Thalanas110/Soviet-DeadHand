package com.guardianprotocol.mobile.data

class AuthenticatedSafetyApiClient(
    private val baseUrl: String,
    private val sessionToken: String,
    private val transport: HttpTransport,
) : DeviceRegistrationApi {
    override fun registerDevice(label: String): RegisteredDevice {
        val response = transport.execute(
            HttpRequest(
                method = "POST",
                url = baseUrl.trimEnd('/') + "/functions/v1/operator-actions",
                headers = mapOf(
                    "Authorization" to "Bearer $sessionToken",
                    "Content-Type" to "application/json",
                ),
                body = "{\"action\":\"registerDevice\",\"label\":${jsonString(label)},\"kind\":\"phone\"}",
            ),
        )
        require(response.statusCode in 200..299) { "Device registration failed" }
        val id = FIELD.find(response.body)?.groupValues?.getOrNull(1)
            ?: error("Device registration response missing id")
        val token = TOKEN.find(response.body)?.groupValues?.getOrNull(1)
            ?: error("Device registration response missing token")
        return RegisteredDevice(id, token, label)
    }

    private companion object {
        val FIELD = Regex("\\\"id\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"")
        val TOKEN = Regex("\\\"token\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"")
    }
}

private fun jsonString(value: String): String = buildString {
    append('"')
    value.forEach { character ->
        when (character) {
            '\\' -> append("\\\\")
            '"' -> append("\\\"")
            '\n' -> append("\\n")
            '\r' -> append("\\r")
            '\t' -> append("\\t")
            else -> append(character)
        }
    }
    append('"')
}
