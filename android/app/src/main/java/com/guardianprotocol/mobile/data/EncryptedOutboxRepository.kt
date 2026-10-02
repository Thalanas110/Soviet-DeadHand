package com.guardianprotocol.mobile.data

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.SecureRandom
import java.time.Instant
import java.util.Base64
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class EncryptedPayload(
    val nonce: ByteArray,
    val ciphertext: ByteArray,
)

data class StoredOutboxEntry(
    val id: String,
    val sequence: Long,
    val priority: Int,
    val nextAttemptAt: Instant,
    val attempts: Int,
    val reason: String?,
    val nonce: ByteArray,
    val ciphertext: ByteArray,
)

data class OutboxEntry(
    val id: String,
    val payload: TelemetryPayload,
    val nextAttemptAt: Instant,
    val attempts: Int,
    val reason: String?,
)

interface OutboxStorage {
    fun put(entry: StoredOutboxEntry)

    fun all(): List<StoredOutboxEntry>

    fun remove(id: String)
}

class EncryptedOutboxRepository(
    private val storage: OutboxStorage,
    private val key: SecretKey,
    private val now: () -> Instant = { Instant.now() },
) {
    fun enqueue(payload: TelemetryPayload): String {
        val id = UUID.randomUUID().toString()
        val encrypted = PayloadCipher(key).encrypt(payload.encode())
        storage.put(
            StoredOutboxEntry(
                id = id,
                sequence = payload.sequence,
                priority = payload.priority,
                nextAttemptAt = now(),
                attempts = 0,
                reason = null,
                nonce = encrypted.nonce,
                ciphertext = encrypted.ciphertext,
            ),
        )
        return id
    }

    fun pending(limit: Int): List<OutboxEntry> =
        storage.all()
            .asSequence()
            .filter { it.nextAttemptAt <= now() }
            .sortedWith(compareBy<StoredOutboxEntry> { it.priority }.thenBy { it.sequence })
            .take(limit.coerceAtLeast(0))
            .map { entry ->
                OutboxEntry(
                    id = entry.id,
                    payload = TelemetryPayload.decode(
                        PayloadCipher(key).decrypt(
                            EncryptedPayload(entry.nonce, entry.ciphertext),
                        ),
                    ),
                    nextAttemptAt = entry.nextAttemptAt,
                    attempts = entry.attempts,
                    reason = entry.reason,
                )
            }
            .toList()

    fun ack(id: String) {
        storage.remove(id)
    }

    fun markRetry(id: String, nextAttemptAt: Instant, reason: String) {
        val existing = storage.all().firstOrNull { it.id == id } ?: return
        storage.put(existing.copy(attempts = existing.attempts + 1, nextAttemptAt = nextAttemptAt, reason = reason))
    }
}

class PayloadCipher(private val key: SecretKey) {
    private val random = SecureRandom()

    fun encrypt(plaintext: ByteArray): EncryptedPayload {
        val nonce = ByteArray(12).also(random::nextBytes)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(128, nonce))
        return EncryptedPayload(nonce = nonce, ciphertext = cipher.doFinal(plaintext))
    }

    fun decrypt(payload: EncryptedPayload): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, payload.nonce))
        return cipher.doFinal(payload.ciphertext)
    }
}

class FileOutboxStorage(private val file: File) : OutboxStorage {
    override fun put(entry: StoredOutboxEntry) {
        val entries = read().associateBy { it.id }.toMutableMap()
        entries[entry.id] = entry
        write(entries.values.toList())
    }

    override fun all(): List<StoredOutboxEntry> = read()

    override fun remove(id: String) {
        write(read().filterNot { it.id == id })
    }

    private fun read(): List<StoredOutboxEntry> {
        if (!file.exists()) return emptyList()
        DataInputStream(file.inputStream().buffered()).use { input ->
            return buildList {
                repeat(input.readInt()) {
                    val id = input.readUTF()
                    val sequence = input.readLong()
                    val priority = input.readInt()
                    val nextAttemptAt = Instant.ofEpochMilli(input.readLong())
                    val attempts = input.readInt()
                    val reason = if (input.readBoolean()) input.readUTF() else null
                    val nonce = input.readBytes()
                    val ciphertext = input.readBytes()
                    add(StoredOutboxEntry(id, sequence, priority, nextAttemptAt, attempts, reason, nonce, ciphertext))
                }
            }
        }
    }

    private fun write(entries: List<StoredOutboxEntry>) {
        file.parentFile?.mkdirs()
        val temp = File(file.parentFile, "${file.name}.tmp")
        DataOutputStream(temp.outputStream().buffered()).use { output ->
            output.writeInt(entries.size)
            entries.forEach { entry ->
                output.writeUTF(entry.id)
                output.writeLong(entry.sequence)
                output.writeInt(entry.priority)
                output.writeLong(entry.nextAttemptAt.toEpochMilli())
                output.writeInt(entry.attempts)
                output.writeBoolean(entry.reason != null)
                if (entry.reason != null) output.writeUTF(entry.reason)
                output.writeBytes(entry.nonce)
                output.writeBytes(entry.ciphertext)
            }
        }
        Files.move(temp.toPath(), file.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
    }
}

private fun DataInputStream.readBytes(): ByteArray {
    val size = readInt()
    require(size >= 0) { "Invalid outbox entry" }
    return ByteArray(size).also(::readFully)
}

private fun DataOutputStream.writeBytes(value: ByteArray) {
    writeInt(value.size)
    write(value)
}
