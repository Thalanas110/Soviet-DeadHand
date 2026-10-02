package com.guardianprotocol.mobile.data

sealed interface UploadDisposition {
    data object Accepted : UploadDisposition

    data class PermanentFailure(val code: String) : UploadDisposition

    data class RetryableFailure(val reason: String) : UploadDisposition
}

fun classifyUpload(statusCode: Int?, errorCode: String?): UploadDisposition {
    if (statusCode in 200..299) return UploadDisposition.Accepted
    if (errorCode == "REPLAY_REJECTED" || errorCode == "DEVICE_NOT_AUTHORIZED") {
        return UploadDisposition.PermanentFailure(errorCode)
    }
    if (statusCode == null) return UploadDisposition.RetryableFailure("NETWORK")
    if (statusCode >= 500 || statusCode == 408 || statusCode == 429) {
        return UploadDisposition.RetryableFailure("HTTP_$statusCode")
    }
    return UploadDisposition.PermanentFailure(errorCode ?: "HTTP_$statusCode")
}
