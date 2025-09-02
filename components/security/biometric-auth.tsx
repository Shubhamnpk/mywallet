"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Fingerprint,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Lock,
  Unlock
} from "lucide-react"

interface BiometricAuthProps {
  onAuthenticated?: () => void
  onError?: (error: string) => void
}

export function BiometricAuth({ onAuthenticated, onError }: BiometricAuthProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [credentialId, setCredentialId] = useState<string | null>(null)

  useEffect(() => {
    checkBiometricSupport()
    checkExistingCredentials()
  }, [])

  const checkBiometricSupport = async () => {
    // Check if we're in a secure context
    const isSecureContext = window.location.protocol === 'https:' || window.location.hostname === 'localhost'

    if (!isSecureContext) {
      setIsSupported(false)
      setAuthError('Biometric authentication requires HTTPS or localhost. Please access the app securely.')
      return
    }

    if (!window.PublicKeyCredential) {
      setIsSupported(false)
      setAuthError('Your browser does not support Web Authentication API.')
      return
    }

    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      setIsSupported(available)
      if (!available) {
        setAuthError('No biometric authenticator available on this device.')
      }
    } catch (error) {
      console.error('Error checking biometric support:', error)
      setIsSupported(false)
      setAuthError('Error checking biometric support. Please try again.')
    }
  }

  const checkExistingCredentials = () => {
    const storedCredentialId = localStorage.getItem('wallet_biometric_credential_id')
    if (storedCredentialId) {
      setIsEnrolled(true)
      setCredentialId(storedCredentialId)
    }
  }

  const getConsistentUserId = () => {
    let userId = localStorage.getItem('wallet_biometric_user_id')
    if (!userId) {
      // Generate a consistent user ID and store it
      const array = new Uint8Array(16)
      crypto.getRandomValues(array)
      userId = btoa(String.fromCharCode(...array))
      localStorage.setItem('wallet_biometric_user_id', userId)
    }
    return Uint8Array.from(atob(userId), c => c.charCodeAt(0))
  }

  const enrollBiometric = async () => {
    if (!isSupported) {
      const error = 'Biometric authentication is not supported on this device'
      setAuthError(error)
      onError?.(error)
      return
    }

    try {
      setIsAuthenticating(true)
      setAuthError(null)

      // Create credential creation options
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const createCredentialOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'MyWallet',
          id: window.location.hostname
        },
        user: {
          id: getConsistentUserId(),
          name: 'wallet-user',
          displayName: 'MyWallet User'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'direct'
      }

      const credential = await navigator.credentials.create({
        publicKey: createCredentialOptions
      }) as PublicKeyCredential

      if (credential) {
        // Store credential ID for future authentication
        const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
        localStorage.setItem('wallet_biometric_credential_id', credentialId)
        localStorage.setItem('wallet_biometric_enabled', 'true')

        setIsEnrolled(true)
        setCredentialId(credentialId)

        console.log('Biometric enrollment successful')
      }

    } catch (error) {
      console.error('Biometric enrollment failed:', error)
      let errorMessage = 'Biometric enrollment failed'

      if (error instanceof Error) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'Biometric enrollment was cancelled or denied. Please try again and allow access.'
            break
          case 'NotSupportedError':
            errorMessage = 'This device does not support biometric authentication.'
            break
          case 'SecurityError':
            errorMessage = 'Security error: Please ensure you\'re accessing the app securely (HTTPS or localhost).'
            break
          case 'AbortError':
            errorMessage = 'Biometric enrollment was cancelled.'
            break
          case 'InvalidStateError':
            errorMessage = 'Biometric credentials already exist. Please disable first if you want to re-enroll.'
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
      const error = 'Biometric authentication is not properly configured'
      setAuthError(error)
      onError?.(error)
      return
    }

    try {
      setIsAuthenticating(true)
      setAuthError(null)

      // Create credential request options
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const credentialIdBytes = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0))

      const requestCredentialOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [{
          id: credentialIdBytes,
          type: 'public-key',
          transports: ['internal']
        }],
        timeout: 60000,
        userVerification: 'required'
      }

      const assertion = await navigator.credentials.get({
        publicKey: requestCredentialOptions
      }) as PublicKeyCredential

      if (assertion) {
        console.log('Biometric authentication successful')
        onAuthenticated?.()
      }

    } catch (error) {
      console.error('Biometric authentication failed:', error)
      let errorMessage = 'Biometric authentication failed'

      if (error instanceof Error) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'Biometric authentication was cancelled or denied. Please try again.'
            break
          case 'SecurityError':
            errorMessage = 'Security error: Please ensure you\'re accessing the app securely (HTTPS or localhost).'
            break
          case 'AbortError':
            errorMessage = 'Biometric authentication was cancelled.'
            break
          case 'NotSupportedError':
            errorMessage = 'Biometric authentication is not supported on this device.'
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

  const disableBiometric = () => {
    localStorage.removeItem('wallet_biometric_credential_id')
    localStorage.removeItem('wallet_biometric_enabled')
    localStorage.removeItem('wallet_biometric_user_id')
    setIsEnrolled(false)
    setCredentialId(null)
    setAuthError(null)
  }

  const getBrowserSupportInfo = () => {
    const userAgent = navigator.userAgent
    const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor)
    const isFirefox = /Firefox/.test(userAgent)
    const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor)
    const isEdge = /Edg/.test(userAgent)

    return { isChrome, isFirefox, isSafari, isEdge }
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
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                isSupported ? (isEnrolled ? 'bg-green-500' : 'bg-yellow-500') : 'bg-red-500'
              }`} />
              <span className="text-sm">
                {isSupported
                  ? (isEnrolled ? 'Biometric authentication enabled' : 'Biometric available but not enrolled')
                  : 'Biometric authentication not supported'
                }
              </span>
            </div>
            <Badge variant={isEnrolled ? 'default' : 'secondary'}>
              {isEnrolled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          {/* Browser Info */}
          {!isSupported && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  For best compatibility, use Chrome, Firefox, Safari, or Edge on a secure connection (HTTPS).
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{authError}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!isEnrolled ? (
              <Button
                onClick={enrollBiometric}
                disabled={!isSupported || isAuthenticating}
                className="flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                {isAuthenticating ? 'Enrolling...' : 'Enable Biometric'}
              </Button>
            ) : (
              <>
                <Button
                  onClick={authenticateBiometric}
                  disabled={isAuthenticating}
                  className="flex items-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
                </Button>
                <Button
                  variant="outline"
                  onClick={disableBiometric}
                  className="flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Disable
                </Button>
              </>
            )}
          </div>

          {/* Information */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Biometric authentication uses your device's fingerprint or face recognition</p>
            <p>• Your biometric data never leaves your device and is stored securely</p>
            <p>• You can disable biometric authentication at any time</p>
            <p>• Requires HTTPS connection or localhost for security</p>
            <p>• Works with Chrome, Firefox, Safari, and Edge browsers</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}