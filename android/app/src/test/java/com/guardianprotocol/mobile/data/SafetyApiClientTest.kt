package com.guardianprotocol.mobile.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class SafetyApiClientTest {
    @Test
    fun `heartbeat upload sends device token only as authorization and maps success`() {
        val transport = RecordingTransport(HttpResponse(202, "{}"))
        val client = SafetyApiClient("https://guardian.invalid", transport)
        val payload = TelemetryPayload(
            sequence = 7,
            capturedAt = Instant.ofEpochMilli(1_000),
            heartRateBpm = 72,
        )

        assertEquals(UploadDisposition.Accepted, client.uploadHeartbeat("secret-token", payload))
        assertEquals("Bearer secret-token", transport.request.headers["Authorization"])
        assertTrue(transport.request.body.contains("\"seq\":7"))
        assertTrue(transport.request.body.contains("\"heartRateBpm\":72"))
        assertTrue(!transport.request.body.contains("secret-token"))
    }

    @Test
    fun `replay response is returned as permanent failure`() {
        val client = SafetyApiClient(
            baseUrl = "https://guardian.invalid",
            transport = RecordingTransport(HttpResponse(409, "{\"code\":\"REPLAY_REJECTED\"}")),
        )

        assertEquals(
            UploadDisposition.PermanentFailure("REPLAY_REJECTED"),
            client.uploadHeartbeat("token", TelemetryPayload(1, Instant.EPOCH)),
        )
    }
}

private class RecordingTransport(private val response: HttpResponse) : HttpTransport {
    lateinit var request: HttpRequest

    override fun execute(request: HttpRequest): HttpResponse {
        this.request = request
        return response
    }
}
