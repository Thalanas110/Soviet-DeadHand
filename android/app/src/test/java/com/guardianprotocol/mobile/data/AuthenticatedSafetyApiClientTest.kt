package com.guardianprotocol.mobile.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthenticatedSafetyApiClientTest {
    @Test
    fun `registration uses authenticated operator action`() {
        val transport = RecordingOperatorTransport(
            HttpResponse(200, "{\"id\":\"device-7\",\"token\":\"token-7\"}"),
        )
        val api = AuthenticatedSafetyApiClient("https://guardian.invalid", "session", transport)

        assertEquals(RegisteredDevice("device-7", "token-7", "phone"), api.registerDevice("phone"))
        assertEquals("Bearer session", transport.request.headers["Authorization"])
        assertTrue(transport.request.body.contains("\"action\":\"registerDevice\""))
        assertTrue(transport.request.body.contains("\"kind\":\"phone\""))
    }
}

private class RecordingOperatorTransport(private val response: HttpResponse) : HttpTransport {
    lateinit var request: HttpRequest

    override fun execute(request: HttpRequest): HttpResponse {
        this.request = request
        return response
    }
}
