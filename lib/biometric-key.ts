"use client"

import {
  AndroidBiometryStrength,
  BiometricAuth,
} from "@aparajita/capacitor-biometric-auth"
import {
  KeychainAccess,
  SecureStorage,
} from "@aparajita/capacitor-secure-storage"
import { getNativePlatform, isNativeMobilePlatform } from "./native-mobile"
import { SecureWallet } from "./security"

const BIOMETRIC_CREDENTIAL_ID_KEY = "wallet_biometric_credential_id"
const BIOMETRIC_ENABLED_KEY = "wallet_biometric_enabled"
const BIOMETRIC_USER_ID_KEY = "wallet_biometric_user_id"
const BIOMETRIC_PIN_WRAPPED_KEY = "wallet_biometric_pin_wrapped"
const BIOMETRIC_PRF_SALT_KEY = "wallet_biometric_prf_salt"
const NATIVE_BIOMETRIC_PIN_KEY = "wallet_biometric_native_pin"
const NATIVE_BIOMETRIC_CREDENTIAL_ID = "native-biometric-secure-store"

export interface BiometricSupportState {
  isSupported: boolean
  isEnrolled: boolean
  deviceIsSecure: boolean
  supportsSecureStorage: boolean
  platform: "web" | "ios" | "android"
  reason?: string
}

type WebAuthnExtensionSecret = ArrayBuffer | ArrayBufferView | undefined

interface WebAuthnExtensionResults {
  prf?: {
    results?: {
      first?: WebAuthnExtensionSecret
    }
  }
  hmacGetSecret?: {
    output1?: WebAuthnExtensionSecret
  }
}

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
  return (
    localStorage.getItem(BIOMETRIC_PIN_WRAPPED_KEY) !== null &&
    localStorage.getItem(BIOMETRIC_PRF_SALT_KEY) !== null
  )
}

export function isBiometricKeyConfigured(): boolean {
  return (
    Boolean(getBiometricCredentialId()) &&
    isBiometricEnabled() &&
    hasWrappedBiometricPin()
  )
}

async function configureNativeSecureStorage(): Promise<void> {
  await SecureStorage.setKeyPrefix("mywallet_")

  if (getNativePlatform() === "ios") {
    await SecureStorage.setDefaultKeychainAccess(
      KeychainAccess.whenPasscodeSetThisDeviceOnly,
    )
  }
}

async function getNativeStoredPin(): Promise<string | null> {
  await configureNativeSecureStorage()
  const stored = await SecureStorage.getItem(NATIVE_BIOMETRIC_PIN_KEY)
  return typeof stored === "string" && stored.length > 0 ? stored : null
}

async function authenticateNativeBiometric(reason: string): Promise<void> {
  await BiometricAuth.authenticate({
    reason,
    cancelTitle: "Cancel",
    iosFallbackTitle: "Use Passcode",
    allowDeviceCredential: true,
    androidTitle: "Unlock MyWallet",
    androidSubtitle: "Confirm your identity to continue",
    androidConfirmationRequired: false,
    androidBiometryStrength: AndroidBiometryStrength.strong,
  })
}

export async function getBiometricSupportState(): Promise<BiometricSupportState> {
  if (typeof window === "undefined") {
    return {
      isSupported: false,
      isEnrolled: false,
      deviceIsSecure: false,
      supportsSecureStorage: false,
      platform: "web",
    }
  }

  if (isNativeMobilePlatform()) {
    try {
      const info = await BiometricAuth.checkBiometry()
      return {
        isSupported: info.isAvailable,
        isEnrolled: info.isAvailable,
        deviceIsSecure: info.deviceIsSecure,
        supportsSecureStorage: true,
        platform: getNativePlatform(),
        reason: info.reason || undefined,
      }
    } catch (error) {
      return {
        isSupported: false,
        isEnrolled: false,
        deviceIsSecure: false,
        supportsSecureStorage: false,
        platform: getNativePlatform(),
        reason:
          error instanceof Error
            ? error.message
            : "Unable to check biometric support.",
      }
    }
  }

  const isSecureContext =
    window.location.protocol === "https:" || window.location.hostname === "localhost"
  if (!isSecureContext) {
    return {
      isSupported: false,
      isEnrolled: false,
      deviceIsSecure: false,
      supportsSecureStorage: false,
      platform: "web",
      reason: "Biometric authentication requires HTTPS or localhost.",
    }
  }

  if (!window.PublicKeyCredential) {
    return {
      isSupported: false,
      isEnrolled: false,
      deviceIsSecure: false,
      supportsSecureStorage: false,
      platform: "web",
      reason: "Your browser does not support Web Authentication API.",
    }
  }

  try {
    const available =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    return {
      isSupported: available,
      isEnrolled: available,
      deviceIsSecure: available,
      supportsSecureStorage: available,
      platform: "web",
      reason: available
        ? undefined
        : "No biometric authenticator is available for this browser/device.",
    }
  } catch (error) {
    return {
      isSupported: false,
      isEnrolled: false,
      deviceIsSecure: false,
      supportsSecureStorage: false,
      platform: "web",
      reason:
        error instanceof Error
          ? error.message
          : "Error checking biometric support.",
    }
  }
}

export async function hasWrappedBiometricPinAsync(): Promise<boolean> {
  if (isNativeMobilePlatform()) {
    return Boolean(await getNativeStoredPin())
  }

  return hasWrappedBiometricPin()
}

export async function isBiometricKeyConfiguredAsync(): Promise<boolean> {
  if (isNativeMobilePlatform()) {
    return isBiometricEnabled() && Boolean(await getNativeStoredPin())
  }

  return isBiometricKeyConfigured()
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

export async function clearBiometricKeyData(): Promise<void> {
  localStorage.removeItem(BIOMETRIC_CREDENTIAL_ID_KEY)
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY)
  localStorage.removeItem(BIOMETRIC_USER_ID_KEY)
  localStorage.removeItem(BIOMETRIC_PIN_WRAPPED_KEY)
  localStorage.removeItem(BIOMETRIC_PRF_SALT_KEY)

  if (isNativeMobilePlatform()) {
    await configureNativeSecureStorage()
    await SecureStorage.removeItem(NATIVE_BIOMETRIC_PIN_KEY)
  }
}

function extractSecretFromExtensions(
  extensions: WebAuthnExtensionResults | null | undefined,
): ArrayBuffer | null {
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
    !window.PublicKeyCredential
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
    } as unknown as AuthenticationExtensionsClientInputs,
  }

  const assertion = (await navigator.credentials.get({
    publicKey: requestOptions,
  })) as PublicKeyCredential

  if (!assertion) return null

  const assertionWithExtensions = assertion as PublicKeyCredential & {
    getClientExtensionResults?: () => WebAuthnExtensionResults
  }
  const extensionResults =
    assertionWithExtensions.getClientExtensionResults?.() ?? undefined
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
  if (isNativeMobilePlatform()) {
    await authenticateNativeBiometric(
      "Enable biometric unlock for your wallet PIN.",
    )
    await configureNativeSecureStorage()
    await SecureStorage.setItem(NATIVE_BIOMETRIC_PIN_KEY, pin)
    localStorage.setItem(
      BIOMETRIC_CREDENTIAL_ID_KEY,
      NATIVE_BIOMETRIC_CREDENTIAL_ID,
    )
    setBiometricEnabled(true)
    return true
  }

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
  if (isNativeMobilePlatform()) {
    await authenticateNativeBiometric(
      "Authenticate to unlock your wallet.",
    )
    return await getNativeStoredPin()
  }

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
