import { SecureWallet } from "./security"

export interface BackupEnvelope {
  version: string
  createdAt: string
  salt: string // base64
  payload: string // base64 (iv + ciphertext) as produced by SecureWallet.encryptData
  integrityHash: string // base64 SHA-256 of the plaintext data
}

const BACKUP_VERSION = "1.0"

/**
 * Create an encrypted backup for the provided data using a PIN.
 * Returns a JSON string containing the backup envelope.
 */
export async function createEncryptedBackup(data: any, pin: string): Promise<string> {
  // Normalize data
  const plain = JSON.stringify(data)

  // Generate salt for key derivation and encode it
  const salt = SecureWallet.generateSalt()
  const saltBase64 = btoa(String.fromCharCode(...salt))

  // Derive key and encrypt
  const key = await SecureWallet.deriveKeyFromPin(pin, salt)
  const payload = await SecureWallet.encryptData(plain, key)

  // Compute integrity hash of plaintext
  const integrityHash = await SecureWallet.generateIntegrityHash(plain)

  const envelope: BackupEnvelope = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    salt: saltBase64,
    payload,
    integrityHash,
  }

  return JSON.stringify(envelope)
}

/**
 * Restore an encrypted backup created with createEncryptedBackup.
 * Returns the parsed data on success or throws an error.
 */
export async function restoreEncryptedBackup(backupJson: string, pin: string): Promise<any> {
  let envelope: BackupEnvelope
  try {
    envelope = JSON.parse(backupJson) as BackupEnvelope
  } catch (err) {
    throw new Error("Invalid backup format: failed to parse JSON")
  }

  if (!envelope.payload || !envelope.salt) {
    throw new Error("Invalid backup: missing fields")
  }

  // Decode salt
  const salt = new Uint8Array(
    atob(envelope.salt)
      .split("")
      .map((c) => c.charCodeAt(0)),
  )

  // Derive key using provided PIN and salt
  const key = await SecureWallet.deriveKeyFromPin(pin, salt)

  // Decrypt
  const plain = await SecureWallet.decryptData(envelope.payload, key)

  // Verify integrity
  const computedHash = await SecureWallet.generateIntegrityHash(plain)
  if (computedHash !== envelope.integrityHash) {
    throw new Error("Integrity check failed: backup data does not match stored hash")
  }

  try {
    return JSON.parse(plain)
  } catch (err) {
    // if JSON parsing fails, return raw string
    return plain
  }
}
