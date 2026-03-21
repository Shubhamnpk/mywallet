"use client"

import { SecureWallet } from "./security"

const BIOMETRIC_CREDENTIAL_ID_KEY = "wallet_biometric_credential_id"
const BIOMETRIC_ENABLED_KEY = "wallet_biometric_enabled"
const BIOMETRIC_USER_ID_KEY = "wallet_biometric_user_id"
const BIOMETRIC_PIN_WRAPPED_KEY = "wallet_biometric_pin_wrapped"
const BIOMETRIC_PRF_SALT_KEY = "wallet_biometric_prf_salt"

const decodeBase64 = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0))

const encodeBase64 = (value: Uint8Array) =>
  btoa(String.fromCharCode(...value))

export function getBiometricCredentialId(): string | null {
  return localStorage.getItem(BIOMETRIC_CREDENTIAL_ID_KEY)
}

export function isBiometricEnabled(): boolean {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true"
}

export function hasWrappedBiometricPin(): boolean {
  return localStorage.getItem(BIOMETRIC_PIN_WRAPPED_KEY) !== null &&
    localStorage.getItem(BIOMETRIC_PRF_SALT_KEY) !== null
}

export function isBiometricKeyConfigured(): boolean {
  return Boolean(getBiometricCredentialId()) && isBiometricEnabled() && hasWrappedBiometricPin()
}

export function ensureBiometricPrfSalt(): Uint8Array {
  const existing = localStorage.getItem(BIOMETRIC_PRF_SALT_KEY)
  if (existing) {
    return decodeBase64(existing)
  }
  const salt = crypto.getRandomValues(new Uint8Array(32))
  localStorage.setItem(BIOMETRIC_PRF_SALT_KEY, encodeBase64(salt))
  return salt
}

export function getBiometricPrfSalt(): Uint8Array | null {
  const stored = localStorage.getItem(BIOMETRIC_PRF_SALT_KEY)
  return stored ? decodeBase64(stored) : null
}

export function setBiometricEnabled(enabled: boolean): void {
  localStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? "true" : "false")
}

export function clearBiometricKeyData(): void {
  localStorage.removeItem(BIOMETRIC_CREDENTIAL_ID_KEY)
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY)
  localStorage.removeItem(BIOMETRIC_USER_ID_KEY)
  localStorage.removeItem(BIOMETRIC_PIN_WRAPPED_KEY)
  localStorage.removeItem(BIOMETRIC_PRF_SALT_KEY)
}

function extractSecretFromExtensions(extensions: any): ArrayBuffer | null {
  if (!extensions || typeof extensions !== "object") return null
  const prfResult = extensions.prf?.results?.first
  if (prfResult instanceof ArrayBuffer) return prfResult
  if (ArrayBuffer.isView(prfResult)) return prfResult.buffer as ArrayBuffer

  const hmacResult = extensions.hmacGetSecret?.output1
  if (hmacResult instanceof ArrayBuffer) return hmacResult
  if (ArrayBuffer.isView(hmacResult)) return hmacResult.buffer as ArrayBuffer

  return null
}

async function getBiometricSecret(
  credentialId: string,
  salt: Uint8Array,
): Promise<Uint8Array | null> {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !navigator.credentials ||
    !(window as any).PublicKeyCredential
  ) {
    return null
  }

  const challenge = new Uint8Array(32)
  crypto.getRandomValues(challenge)

  const credentialIdBytes = Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0))

  const requestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [
      {
        id: credentialIdBytes,
        type: "public-key",
        transports: ["internal"],
      },
    ],
    timeout: 60000,
    userVerification: "required",
    extensions: {
      prf: { eval: { first: salt } },
      hmacGetSecret: { salt1: salt },
    } as any,
  }

  const assertion = (await navigator.credentials.get({
    publicKey: requestOptions,
  })) as PublicKeyCredential

  if (!assertion) return null

  const extensionResults = (assertion as any).getClientExtensionResults?.() ?? {}
  const secret = extractSecretFromExtensions(extensionResults)
  if (!secret) return null

  return new Uint8Array(secret)
}

async function importBiometricAesKey(secret: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    secret as BufferSource,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  )
}

export async function wrapPinWithBiometric(pin: string): Promise<boolean> {
  const credentialId = getBiometricCredentialId()
  if (!credentialId) return false

  const salt = ensureBiometricPrfSalt()
  const secret = await getBiometricSecret(credentialId, salt)
  if (!secret) return false

  const key = await importBiometricAesKey(secret)
  const encrypted = await SecureWallet.encryptData(pin, key)

  localStorage.setItem(BIOMETRIC_PIN_WRAPPED_KEY, encrypted)
  setBiometricEnabled(true)
  return true
}

export async function unwrapPinWithBiometric(): Promise<string | null> {
  const credentialId = getBiometricCredentialId()
  const wrappedPin = localStorage.getItem(BIOMETRIC_PIN_WRAPPED_KEY)
  const salt = getBiometricPrfSalt()

  if (!credentialId || !wrappedPin || !salt) return null

  const secret = await getBiometricSecret(credentialId, salt)
  if (!secret) return null

  const key = await importBiometricAesKey(secret)
  try {
    return await SecureWallet.decryptData(wrappedPin, key)
  } catch {
    return null
  }
}
