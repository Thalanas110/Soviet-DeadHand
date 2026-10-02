package com.guardianprotocol.mobile.data

import org.junit.Assert.assertEquals
import org.junit.Test

class SyncResultTest {
    @Test
    fun `replay and authorization failures stop automatic retry`() {
        assertEquals(
            UploadDisposition.PermanentFailure("REPLAY_REJECTED"),
            classifyUpload(409, "REPLAY_REJECTED"),
        )
        assertEquals(
            UploadDisposition.PermanentFailure("DEVICE_NOT_AUTHORIZED"),
            classifyUpload(401, "DEVICE_NOT_AUTHORIZED"),
        )
    }

    @Test
    fun `network and server failures remain retryable`() {
        assertEquals(UploadDisposition.RetryableFailure("HTTP_503"), classifyUpload(503, null))
        assertEquals(UploadDisposition.RetryableFailure("NETWORK"), classifyUpload(null, null))
    }
}
