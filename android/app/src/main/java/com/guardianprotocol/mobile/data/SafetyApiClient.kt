package com.guardianprotocol.mobile.data

import java.net.HttpURLConnection
import java.net.URL

data class HttpRequest(
    val method: String,
    val url: String,
    val headers: Map<String, String>,
    val body: String,
)

data class HttpResponse(val statusCode: Int, val body: String)

fun interface HttpTransport {
    fun execute(request: HttpRequest): HttpResponse
}

class SafetyApiClient(
    private val baseUrl: String,
    private val transport: HttpTransport,
) {
    fun uploadHeartbeat(deviceToken: String, payload: TelemetryPayload): UploadDisposition {
        val request = HttpRequest(
            method = "POST",
            url = baseUrl.trimEnd('/') + "/functions/v1/telemetry-ingest",
            headers = mapOf(
                "Authorization" to "Bearer $deviceToken",
                "Content-Type" to "application/json",
            ),
            body = payloadJson(payload),
        )
        val response = runCatching { transport.execute(request) }
            .getOrElse { return UploadDisposition.RetryableFailure("NETWORK") }
        return classifyUpload(response.statusCode, extractErrorCode(response.body))
    }

    private fun payloadJson(payload: TelemetryPayload): String = buildString {
        append('{')
        append("\"seq\":").append(payload.sequence)
        append(",\"clientTs\":").append(payload.capturedAt.toEpochMilli())
        append(",\"complete\":").append(payload.complete)
        append(",\"battery\":").append(payload.batteryPercent ?: "null")
        append(",\"charging\":").append(payload.charging ?: "null")
        append(",\"networkAvailable\":").append(payload.networkAvailable ?: "null")
        append(",\"phoneActive\":").append(payload.phoneActive ?: "null")
        append(",\"heartRateBpm\":").append(payload.heartRateBpm ?: "null")
        append(",\"heartRateTimestamp\":")
            .append(payload.heartRateCapturedAt?.toEpochMilli() ?: "null")
        append(",\"wearableSyncTimestamp\":")
            .append(payload.wearableSyncAt?.toEpochMilli() ?: "null")
        append(",\"wearableConnected\":").append(payload.wearableConnected ?: "null")
        if (payload.location != null) {
            append(",\"lat\":").append(payload.location.latitude)
            append(",\"lon\":").append(payload.location.longitude)
            append(",\"locAcc\":").append(payload.location.accuracyMeters ?: "null")
        }
        append('}')
    }

    private fun extractErrorCode(body: String): String? =
        ERROR_CODE.find(body)?.groupValues?.getOrNull(1)

    private companion object {
        val ERROR_CODE = Regex("\\\"(?:code|error)\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"")
    }
}

class UrlConnectionTransport : HttpTransport {
    override fun execute(request: HttpRequest): HttpResponse {
        val connection = (URL(request.url).openConnection() as HttpURLConnection).apply {
            requestMethod = request.method
            connectTimeout = 15_000
            readTimeout = 15_000
            doOutput = request.body.isNotEmpty()
            request.headers.forEach { (name, value) -> setRequestProperty(name, value) }
        }
        return try {
            if (request.body.isNotEmpty()) {
                connection.outputStream.use { it.write(request.body.toByteArray(Charsets.UTF_8)) }
            }
            val stream = if (connection.responseCode >= 400) {
                connection.errorStream
            } else {
                connection.inputStream
            }
            HttpResponse(connection.responseCode, stream?.bufferedReader()?.use { it.readText() }.orEmpty())
        } finally {
            connection.disconnect()
        }
    }
}
