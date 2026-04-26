"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertTriangle,
  Fingerprint,
  Lock,
  Settings,
  Shield,
  Unlock,
} from "lucide-react"
import { SecureKeyManager } from "@/lib/key-manager"
import {
  clearBiometricKeyData,
  ensureBiometricPrfSalt,
  getBiometricCredentialId,
  getBiometricSupportState,
  hasWrappedBiometricPinAsync,
  isBiometricKeyConfiguredAsync,
  setBiometricEnabled,
  unwrapPinWithBiometric,
  wrapPinWithBiometric,
} from "@/lib/biometric-key"
import { isNativeMobilePlatform } from "@/lib/native-mobile"

interface BiometricAuthProps {
  pinEnabled?: boolean
  onAuthenticated?: () => void
  onError?: (error: string) => void
  onEnrollmentSuccess?: () => void
}

export function BiometricAuth({
  pinEnabled = false,
  onAuthenticated,
  onError,
  onEnrollmentSuccess,
}: BiometricAuthProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [isKeyWrapped, setIsKeyWrapped] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [credentialId, setCredentialId] = useState<string | null>(null)
  const [supportPlatform, setSupportPlatform] = useState<"web" | "ios" | "android">("web")

  useEffect(() => {
    void checkBiometricSupport()
    void checkExistingCredentials()
  }, [])

  const checkBiometricSupport = async () => {
    const support = await getBiometricSupportState()
    setSupportPlatform(support.platform)
    setIsSupported(support.isSupported)
    if (!support.isSupported && support.reason) {
      setAuthError(support.reason)
    }
  }

  const checkExistingCredentials = async () => {
    const storedCredentialId = getBiometricCredentialId()
    if (storedCredentialId) {
      setIsEnrolled(true)
      setCredentialId(storedCredentialId)
      setIsKeyWrapped(await hasWrappedBiometricPinAsync())
      return
    }

    const configured = await isBiometricKeyConfiguredAsync()
    setIsEnrolled(configured)
    setIsKeyWrapped(configured)
  }

  const getConsistentUserId = () => {
    let userId = localStorage.getItem("wallet_biometric_user_id")
    if (!userId) {
      const array = new Uint8Array(16)
      crypto.getRandomValues(array)
      userId = btoa(String.fromCharCode(...array))
      localStorage.setItem("wallet_biometric_user_id", userId)
    }
    return Uint8Array.from(atob(userId), (c) => c.charCodeAt(0))
  }

  const enrollBiometric = async () => {
    if (!isSupported) {
      const error = "Biometric authentication is not supported on this device"
      setAuthError(error)
      onError?.(error)
      return
    }

    try {
      setIsAuthenticating(true)
      setAuthError(null)

      if (isNativeMobilePlatform()) {
        localStorage.setItem(
          "wallet_biometric_credential_id",
          "native-biometric-secure-store",
        )
        setIsEnrolled(true)
        setCredentialId("native-biometric-secure-store")
      } else {
        const challenge = new Uint8Array(32)
        crypto.getRandomValues(challenge)
        const prfSalt = ensureBiometricPrfSalt()

        const createCredentialOptions: PublicKeyCredentialCreationOptions = {
          challenge,
          rp: {
            name: "MyWallet",
            id: window.location.hostname,
          },
          user: {
            id: getConsistentUserId(),
            name: "wallet-user",
            displayName: "MyWallet User",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: "direct",
          extensions: {
            prf: { eval: { first: prfSalt } },
            hmacCreateSecret: true,
          } as unknown as AuthenticationExtensionsClientInputs,
        }

        const credential = (await navigator.credentials.create({
          publicKey: createCredentialOptions,
        })) as PublicKeyCredential | null

        if (!credential) {
          throw new Error("Biometric credential creation failed")
        }

        const nextCredentialId = btoa(
          String.fromCharCode(...new Uint8Array(credential.rawId)),
        )
        localStorage.setItem("wallet_biometric_credential_id", nextCredentialId)
        setIsEnrolled(true)
        setCredentialId(nextCredentialId)
      }

      const cachedPin = SecureKeyManager.getCachedSessionPin()
      if (!cachedPin) {
        setBiometricEnabled(false)
        setIsKeyWrapped(false)
        setAuthError("Biometric enrolled. Unlock once with your PIN to finish setup.")
        return
      }

      const wrapped = await wrapPinWithBiometric(cachedPin)
      if (!wrapped) {
        setBiometricEnabled(false)
        setIsKeyWrapped(false)
        setAuthError(
          "Biometric enrolled, but secure key storage is not supported on this device.",
        )
        return
      }

      setIsKeyWrapped(true)
      onEnrollmentSuccess?.()
    } catch (error) {
      console.error("Biometric enrollment failed:", error)
      let errorMessage = "Biometric enrollment failed"

      if (error instanceof Error) {
        switch (error.name) {
          case "NotAllowedError":
            errorMessage =
              "Biometric enrollment was canceled or denied. Please try again and allow access."
            break
          case "NotSupportedError":
            errorMessage = "This device does not support biometric authentication."
            break
          case "SecurityError":
            errorMessage =
              "Security error: please ensure you are accessing the app securely."
            break
          case "AbortError":
            errorMessage = "Biometric enrollment was canceled."
            break
          case "InvalidStateError":
            errorMessage =
              "Biometric credentials already exist. Disable biometric unlock before re-enrolling."
            break
          default:
            errorMessage = `Enrollment failed: ${error.message}`
        }
      }

      setAuthError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsAuthenticating(false)
    }
  }

  const authenticateBiometric = async () => {
    if (!isSupported || !isEnrolled || !credentialId) {
      const error = "Biometric authentication is not properly configured"
      setAuthError(error)
      onError?.(error)
      return
    }

    try {
      setIsAuthenticating(true)
      setAuthError(null)
      const pin = await unwrapPinWithBiometric()
      if (!pin) {
        setAuthError("Biometric unlock is not available. Please unlock once with your PIN.")
        onError?.("Biometric unlock failed")
        return
      }
      onAuthenticated?.()
    } catch (error) {
      let errorMessage = "Biometric authentication failed"

      if (error instanceof Error) {
        switch (error.name) {
          case "NotAllowedError":
            errorMessage =
              "Biometric authentication was canceled or denied. Please try again."
            break
          case "SecurityError":
            errorMessage =
              "Security error: please ensure you are accessing the app securely."
            break
          case "AbortError":
            errorMessage = "Biometric authentication was canceled."
            break
          case "NotSupportedError":
            errorMessage = "Biometric authentication is not supported on this device."
            break
          default:
            errorMessage = `Authentication failed: ${error.message}`
        }
      }

      setAuthError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsAuthenticating(false)
    }
  }

  const disableBiometric = async () => {
    await clearBiometricKeyData()
    setIsEnrolled(false)
    setCredentialId(null)
    setIsKeyWrapped(false)
    setAuthError(null)
  }

  if (!pinEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5" />
            Biometric Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-primary/20 bg-primary/5">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <AlertDescription className="text-primary">
              <strong>PIN Required</strong>
              Biometric authentication requires PIN protection to be enabled first.
              Please set up your PIN in the section above.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5" />
            Biometric Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isSupported ? (isEnrolled ? "bg-green-500" : "bg-yellow-500") : "bg-red-500"
                }`}
              />
              <span className="text-sm">
                {isSupported
                  ? isEnrolled
                    ? isKeyWrapped
                      ? "Biometric authentication enabled"
                      : "Biometric enrolled; finish setup with PIN"
                    : "Biometric available but not enrolled"
                  : "Biometric authentication not supported"}
              </span>
            </div>
            <Badge variant={isEnrolled ? "default" : "secondary"}>
              {isEnrolled ? (isKeyWrapped ? "Enabled" : "Pending") : "Disabled"}
            </Badge>
          </div>

          {!isSupported && supportPlatform === "web" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  For best compatibility, use Chrome, Firefox, Safari, or Edge on
                  a secure connection (HTTPS).
                </span>
              </div>
            </div>
          )}

          {authError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{authError}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!isEnrolled ? (
              <Button
                onClick={enrollBiometric}
                disabled={!isSupported || isAuthenticating}
                className="flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                {isAuthenticating ? "Enrolling..." : "Enable Biometric"}
              </Button>
            ) : (
              <>
                <Button
                  onClick={authenticateBiometric}
                  disabled={isAuthenticating || !isKeyWrapped}
                  className="flex items-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  {isAuthenticating ? "Authenticating..." : "Authenticate"}
                </Button>
                {!isKeyWrapped && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const cachedPin = SecureKeyManager.getCachedSessionPin()
                      if (!cachedPin) {
                        setAuthError("Please unlock once with your PIN to finish setup.")
                        return
                      }
                      setIsAuthenticating(true)
                      try {
                        const wrapped = await wrapPinWithBiometric(cachedPin)
                        if (!wrapped) {
                          setAuthError("Secure biometric storage is not supported on this device.")
                          return
                        }
                        setIsKeyWrapped(true)
                        setAuthError(null)
                      } finally {
                        setIsAuthenticating(false)
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Finish Setup
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    void disableBiometric()
                  }}
                  className="flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Disable
                </Button>
              </>
            )}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>- Biometric authentication uses your device biometric sensor</p>
            <p>- Native iOS and Android builds store the protected PIN in OS-backed secure storage</p>
            <p>- Your biometric data never leaves your device</p>
            <p>- You can disable biometric authentication at any time</p>
            {supportPlatform === "web" && (
              <p>- Web support requires HTTPS or localhost and a compatible browser</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
