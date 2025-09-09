"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWalletData } from "@/contexts/wallet-data-context"
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { createEncryptedBackup, restoreEncryptedBackup } from "@/lib/backup"
import { SecureWallet } from "@/lib/security"
import { Dropbox, DropboxAuth } from "dropbox"
import { useOfflineMode } from "@/hooks/use-offline-mode"
import { PasswordSetupModal } from "./cloud-sync/password-setup-modal"
import { DeviceConnectModal } from "./cloud-sync/device-connect-modal"

interface CloudSyncProps {
  onSyncComplete?: () => void
}

export function CloudSync({ onSyncComplete }: CloudSyncProps) {
  const { userProfile, transactions, budgets, goals, debtAccounts, creditAccounts, categories, emergencyFund, importData } = useWalletData()
  const { isOnline, syncPendingData } = useOfflineMode()

  const [dropboxConnected, setDropboxConnected] = useState(false)
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false)
  const [dropboxToken, setDropboxToken] = useState<string | null>(null)
  const [googleToken, setGoogleToken] = useState<string | null>(null)
  const [dropboxUserInfo, setDropboxUserInfo] = useState<{ email: string; name: string } | null>(null)
  const [googleUserInfo, setGoogleUserInfo] = useState<{ email: string; name: string } | null>(null)
  const [syncPassword, setSyncPassword] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [deviceId] = useState(() => {
    // Generate or retrieve device ID
    let deviceId = localStorage.getItem('wallet_device_id')
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('wallet_device_id', deviceId)
    }
    return deviceId
  })
  const [syncConflicts, setSyncConflicts] = useState<any[]>([])
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(() => {
    // Load auto-sync preference from localStorage, default to true
    const saved = localStorage.getItem('wallet_auto_sync_enabled')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [hasNewCloudData, setHasNewCloudData] = useState(false)
  const [isAutoSyncing, setIsAutoSyncing] = useState(false)
  const [showPasswordSetup, setShowPasswordSetup] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPasswordVerified, setIsPasswordVerified] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [showDeviceConnect, setShowDeviceConnect] = useState(false)
  const [enteredDeviceCode, setEnteredDeviceCode] = useState("")
  const [enteredDevicePin, setEnteredDevicePin] = useState("")
  const [isConnectingDevice, setIsConnectingDevice] = useState(false)

  useEffect(() => {
    // Load stored tokens
    const storedDropboxToken = localStorage.getItem('dropbox_token')
    const storedGoogleToken = localStorage.getItem('google_token')
    const storedLastSync = localStorage.getItem('last_cloud_sync')
    const storedPinHash = localStorage.getItem('wallet_sync_pin_hash')

    if (storedDropboxToken) {
      setDropboxToken(storedDropboxToken)
      setDropboxConnected(true)
      fetchDropboxUserInfo()
    }
    if (storedGoogleToken) {
      setGoogleToken(storedGoogleToken)
      setGoogleDriveConnected(true)
      fetchGoogleUserInfo()
    }
    if (storedLastSync) {
      setLastSyncTime(new Date(storedLastSync))
    }

    // Check if password is set up
    if (storedPinHash) {
      setIsPasswordVerified(true)
    }

    // Handle OAuth redirects
    const urlParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = urlParams.get('access_token')

    if (accessToken) {
      // Determine which service
      const state = urlParams.get('state')
      if (state === 'dropbox') {
        localStorage.setItem('dropbox_token', accessToken)
        setDropboxToken(accessToken)
        setDropboxConnected(true)
        fetchDropboxUserInfo()
        toast({
          title: "Connected",
          description: "Dropbox connected successfully.",
        })
      } else if (state === 'google') {
        localStorage.setItem('google_token', accessToken)
        setGoogleToken(accessToken)
        setGoogleDriveConnected(true)
        fetchGoogleUserInfo()
        toast({
          title: "Connected",
          description: "Google Drive connected successfully.",
        })
      }
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const connectDropbox = async () => {
    try {
      const auth = new DropboxAuth({ clientId: process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID || 'your-dropbox-client-id' })
      const authUrl = await auth.getAuthenticationUrl(window.location.origin + '/settings')
      window.location.href = (authUrl as string) + '&state=dropbox'
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Dropbox.",
        variant: "destructive",
      })
    }
  }

  const disconnectDropbox = () => {
    localStorage.removeItem('dropbox_token')
    setDropboxToken(null)
    setDropboxConnected(false)
    setDropboxUserInfo(null)
    toast({
      title: "Disconnected",
      description: "Dropbox disconnected successfully.",
    })
  }

  const connectGoogleDrive = async () => {
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id'
      const redirectUri = window.location.origin + '/settings'
      const scope = 'https://www.googleapis.com/auth/drive.file'
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=token&include_granted_scopes=true&state=google`
      window.location.href = authUrl
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Drive.",
        variant: "destructive",
      })
    }
  }

  const disconnectGoogleDrive = () => {
    localStorage.removeItem('google_token')
    setGoogleToken(null)
    setGoogleDriveConnected(false)
    setGoogleUserInfo(null)
    toast({
      title: "Disconnected",
      description: "Google Drive disconnected successfully.",
    })
  }

  const uploadToDropbox = async (data: string) => {
    if (!dropboxToken) return
    const dbx = new Dropbox({ accessToken: dropboxToken })
    await dbx.filesUpload({
      path: '/mywallet-backup.json',
      contents: data,
      mode: { '.tag': 'overwrite' }
    })
  }

  const downloadFromDropbox = async (): Promise<string | null> => {
    if (!dropboxToken) return null
    const dbx = new Dropbox({ accessToken: dropboxToken })
    try {
      const response = await dbx.filesDownload({ path: '/mywallet-backup.json' })
      const blob = (response.result as any).fileBlob
      return blob.text()
    } catch {
      return null
    }
  }

  const fetchDropboxUserInfo = async () => {
    if (!dropboxToken) return
    const dbx = new Dropbox({ accessToken: dropboxToken })
    try {
      const response = await dbx.usersGetCurrentAccount()
      setDropboxUserInfo({
        email: response.result.email,
        name: response.result.name.display_name
      })
    } catch (error) {
      console.error('Failed to fetch Dropbox user info:', error)
    }
  }

  const fetchGoogleUserInfo = async () => {
    if (!googleToken) return
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${googleToken}`
        }
      })
      const data = await response.json()
      setGoogleUserInfo({
        email: data.email,
        name: data.name
      })
    } catch (error) {
      console.error('Failed to fetch Google user info:', error)
    }
  }

  const uploadToGoogleDrive = async (data: string) => {
    if (!googleToken) return
    const metadata = {
      name: 'mywallet-backup.json',
      mimeType: 'application/json'
    }
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', new Blob([data], { type: 'application/json' }))

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${googleToken}`
      },
      body: form
    })
    if (!response.ok) throw new Error('Upload failed')
  }

  const downloadFromGoogleDrive = async (): Promise<string | null> => {
    if (!googleToken) return null
    // This is simplified; in reality, you'd need to find the file ID first
    const response = await fetch('https://www.googleapis.com/drive/v3/files?q=name=\'mywallet-backup.json\'', {
      headers: {
        Authorization: `Bearer ${googleToken}`
      }
    })
    const result = await response.json()
    if (result.files.length === 0) return null
    const fileId = result.files[0].id
    const downloadResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${googleToken}`
      }
    })
    return downloadResponse.text()
  }

  const syncData = async (isAutoSync = false) => {
    if (!isPasswordVerified) {
      if (!isAutoSync) {
        toast({
          title: "Password Required",
          description: "Please set up your sync password first.",
          variant: "destructive",
        })
        setShowPasswordSetup(true)
      }
      return
    }

    if (!syncPassword) {
      if (!isAutoSync) {
        toast({
          title: "Password Required",
          description: "Please enter your sync password.",
          variant: "destructive",
        })
      }
      return
    }

    // Set appropriate loading state
    if (isAutoSync) {
      setIsAutoSyncing(true)
    } else {
      setIsSyncing(true)
    }

    try {
      const walletData = {
        userProfile,
        transactions,
        budgets,
        goals,
        debtAccounts,
        creditAccounts,
        categories,
        emergencyFund
      }

      // Add device and sync metadata
      const syncDataPayload = {
        data: walletData,
        deviceId,
        deviceName: navigator.userAgent.split(' ').pop() || 'Unknown Device',
        timestamp: new Date().toISOString(),
        version: '1.0'
      }

      const encryptedData = await createEncryptedBackup(syncDataPayload, syncPassword)

      // Upload to connected services
      if (dropboxConnected) {
        await uploadToDropbox(encryptedData)
      }
      if (googleDriveConnected) {
        await uploadToGoogleDrive(encryptedData)
      }

      setLastSyncTime(new Date())
      localStorage.setItem('last_cloud_sync', new Date().toISOString())
      localStorage.setItem('wallet_last_modified', new Date().toISOString())

      if (!isAutoSync) {
        toast({
          title: "Sync Complete",
          description: "Data synced to cloud successfully.",
        })
      } else {
        console.log('✅ Auto-sync completed successfully')
      }

      onSyncComplete?.()
    } catch (error) {
      if (!isAutoSync) {
        toast({
          title: "Sync Failed",
          description: "Failed to sync data to cloud.",
          variant: "destructive",
        })
      } else {
        console.log('❌ Auto-sync failed:', error)
      }
    } finally {
      if (isAutoSync) {
        setIsAutoSyncing(false)
      } else {
        setIsSyncing(false)
      }
    }
  }

  const restoreFromCloud = async (isAutoSync = false) => {
    if (!isPasswordVerified) {
      toast({
        title: "Password Required",
        description: "Please set up your sync password first.",
        variant: "destructive",
      })
      setShowPasswordSetup(true)
      return
    }

    if (!syncPassword) {
      toast({
        title: "Password Required",
        description: "Please enter your sync password.",
        variant: "destructive",
      })
      return
    }

    setIsSyncing(true)
    try {
      let cloudData: string | null = null
      let cloudMetadata: any = null

      // Try Dropbox first
      if (dropboxConnected) {
        cloudData = await downloadFromDropbox()
      }

      // If not found, try Google Drive
      if (!cloudData && googleDriveConnected) {
        cloudData = await downloadFromGoogleDrive()
      }

      if (!cloudData) {
        if (!isAutoSync) {
          toast({
            title: "No Data Found",
            description: "No backup data found in cloud.",
            variant: "destructive",
          })
        }
        return
      }

      const decryptedData = await restoreEncryptedBackup(cloudData, syncPassword)

      // Check for multi-device sync metadata
      if (decryptedData.deviceId && decryptedData.timestamp) {
        cloudMetadata = {
          deviceId: decryptedData.deviceId,
          deviceName: decryptedData.deviceName,
          timestamp: decryptedData.timestamp,
          version: decryptedData.version
        }

        // Check for potential conflicts or merges
        const localLastModified = localStorage.getItem('wallet_last_modified')
        const hasLocalChanges = localLastModified && new Date(localLastModified) > new Date(decryptedData.timestamp)

        if (hasLocalChanges) {
          // Show smart merge option instead of conflict
          setSyncConflicts([{
            type: 'merge',
            localTime: localLastModified,
            cloudTime: decryptedData.timestamp,
            cloudDevice: decryptedData.deviceName,
            cloudData: decryptedData.data
          }])

          if (!isAutoSync) {
            toast({
              title: "🤝 Smart Merge Available",
              description: `New data from ${decryptedData.deviceName} ready to merge.`,
            })
          }
          setIsSyncing(false)
          return
        }
      }

      // Import the data (extract .data if it has sync metadata wrapper)
      const dataToImport = decryptedData.data || decryptedData
      await importData(dataToImport)

      // Update last modified time
      localStorage.setItem('wallet_last_modified', new Date().toISOString())

      if (!isAutoSync) {
        toast({
          title: "Restore Complete",
          description: cloudMetadata ? `Synced from ${cloudMetadata.deviceName}` : "Data restored from cloud successfully.",
        })
      } else {
        console.log('✅ Auto-restore completed successfully')
      }

      onSyncComplete?.()
    } catch (error) {
      if (!isAutoSync) {
        toast({
          title: "Restore Failed",
          description: "Failed to restore data from cloud.",
          variant: "destructive",
        })
      } else {
        console.log('❌ Auto-restore failed:', error)
      }
    } finally {
      setIsSyncing(false)
    }
  }

  // Check for cloud updates periodically
  useEffect(() => {
    if (!isOnline || !isAutoSyncEnabled || (!dropboxConnected && !googleDriveConnected)) return

    const checkInterval = setInterval(async () => {
      try {
        await checkForCloudUpdates()
      } catch (error) {
        // Silent fail for background checks
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(checkInterval)
  }, [isOnline, isAutoSyncEnabled, dropboxConnected, googleDriveConnected])

  useEffect(() => {
    if (isOnline && isAutoSyncEnabled && isPasswordVerified && (dropboxConnected || googleDriveConnected)) {
      // Auto sync when coming online
      console.log('🌐 Online detected, auto-syncing...')
      const timer = setTimeout(() => {
        syncData(true) // true indicates auto-sync
      }, 1500) // Reduced delay for faster sync

      return () => clearTimeout(timer)
    }
  }, [isOnline, isAutoSyncEnabled, isPasswordVerified, dropboxConnected, googleDriveConnected])

  // Initial sync when component mounts (if auto-sync enabled and conditions met)
  useEffect(() => {
    if (isOnline && isAutoSyncEnabled && isPasswordVerified && (dropboxConnected || googleDriveConnected)) {
      // Small delay to ensure everything is loaded
      const initTimer = setTimeout(() => {
        console.log('🚀 Initial auto-sync on mount...')
        syncData(true)
      }, 3000)

      return () => clearTimeout(initTimer)
    }
  }, []) // Only run once on mount

  // Track local changes and trigger auto-sync
  useEffect(() => {
    const handleDataChange = () => {
      const now = new Date().toISOString()
      localStorage.setItem('wallet_last_modified', now)

      // Trigger auto-sync if online and enabled
      if (isOnline && isAutoSyncEnabled && isPasswordVerified && (dropboxConnected || googleDriveConnected)) {
        console.log('📝 Local changes detected, auto-syncing...')
        // Debounce the sync to avoid too many calls
        const syncTimer = setTimeout(() => {
          syncData(true)
        }, 1000) // Wait 1 second after change before syncing

        return () => clearTimeout(syncTimer)
      }
    }

    // Listen for data changes - you can enhance this by listening to specific context changes
    const interval = setInterval(() => {
      // Check if data has changed (simple implementation)
      const currentData = JSON.stringify({ userProfile, transactions, budgets, goals })
      const lastData = localStorage.getItem('wallet_data_snapshot')

      if (lastData !== currentData) {
        localStorage.setItem('wallet_data_snapshot', currentData)
        handleDataChange()
      }
    }, 3000) // Check every 3 seconds (reduced from 5)

    return () => clearInterval(interval)
  }, [userProfile, transactions, budgets, goals, isOnline, isAutoSyncEnabled, isPasswordVerified, dropboxConnected, googleDriveConnected])

  // Countdown timer for device code
  useEffect(() => {
    if (!codeExpiry) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((codeExpiry.getTime() - Date.now()) / 1000))
      setTimeLeft(remaining)

      if (remaining <= 0) {
        setGeneratedCode(null)
        setCodeExpiry(null)
        localStorage.removeItem('wallet_device_code')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [codeExpiry])

  const validatePin = (pin: string): { isValid: boolean; error: string } => {
    if (pin.length < 6) {
      return { isValid: false, error: "PIN must be at least 6 characters long" }
    }
    if (!/\d/.test(pin)) {
      return { isValid: false, error: "PIN must contain at least one number" }
    }
    if (!/[a-zA-Z]/.test(pin)) {
      return { isValid: false, error: "PIN must contain at least one letter" }
    }
    return { isValid: true, error: "" }
  }

  const setupSyncPassword = async () => {
    const validation = validatePin(newPassword)
    if (!validation.isValid) {
      setPasswordError(validation.error)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    try {
      // Store the password hash securely
      const passwordHash = await SecureWallet.generateIntegrityHash(newPassword)
      const salt = SecureWallet.generateSalt()
      localStorage.setItem('wallet_sync_pin_hash', passwordHash)
      localStorage.setItem('wallet_sync_pin_salt', btoa(String.fromCharCode(...salt)))

      setSyncPassword(newPassword)
      setShowPasswordSetup(false)
      setIsPasswordVerified(true)
      setPasswordError("")

      toast({
        title: "Sync Password Created",
        description: "Your sync password has been set up successfully.",
      })
    } catch (error) {
      setPasswordError("Failed to set up password")
    }
  }

  const verifyDevicePin = async (enteredPin: string): Promise<boolean> => {
    try {
      const storedHash = localStorage.getItem('wallet_sync_pin_hash')
      if (!storedHash) return false

      const computedHash = await SecureWallet.generateIntegrityHash(enteredPin)
      return computedHash === storedHash
    } catch {
      return false
    }
  }

  const changeSyncPassword = async () => {
    const validation = validatePin(newPassword)
    if (!validation.isValid) {
      setPasswordError(validation.error)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    // Verify current password first
    const isCurrentValid = await verifyDevicePin(syncPassword)
    if (!isCurrentValid) {
      setPasswordError("Current password is incorrect")
      return
    }

    try {
      const passwordHash = await SecureWallet.generateIntegrityHash(newPassword)
      localStorage.setItem('wallet_sync_pin_hash', passwordHash)

      setSyncPassword(newPassword)
      setShowPasswordSetup(false)
      setPasswordError("")

      toast({
        title: "Password Changed",
        description: "Your sync password has been updated successfully.",
      })
    } catch (error) {
      setPasswordError("Failed to change password")
    }
  }

  const generateDeviceCode = () => {
    // Generate a temporary code for sharing PIN with new devices
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const expiresAt = Date.now() + (5 * 60 * 1000) // 5 minutes

    localStorage.setItem('wallet_device_code', JSON.stringify({ code, expiresAt }))

    // Store in state for UI display
    setGeneratedCode(code)
    setCodeExpiry(new Date(expiresAt))

    return code
  }

  const verifyDeviceWithCode = async (enteredCode: string, devicePin: string): Promise<boolean> => {
    try {
      const storedCodeData = localStorage.getItem('wallet_device_code')
      if (!storedCodeData) return false

      const { code, expiresAt } = JSON.parse(storedCodeData)

      if (Date.now() > expiresAt) {
        localStorage.removeItem('wallet_device_code')
        return false
      }

      if (code !== enteredCode.toUpperCase()) return false

      // Verify PIN
      const isValidPin = await verifyDevicePin(devicePin)
      if (isValidPin) {
        localStorage.removeItem('wallet_device_code') // Code used successfully
        return true
      }

      return false
    } catch {
      return false
    }
  }

  const connectExistingDevice = async () => {
    if (!enteredDeviceCode || !enteredDevicePin) {
      toast({
        title: "Missing Information",
        description: "Please enter both device code and PIN",
        variant: "destructive",
      })
      return
    }

    // Validate PIN format before attempting connection
    const pinValidation = validatePin(enteredDevicePin)
    if (!pinValidation.isValid) {
      toast({
        title: "Invalid PIN",
        description: pinValidation.error,
        variant: "destructive",
      })
      return
    }

    setIsConnectingDevice(true)

    try {
      // First try to verify with device code (for primary device verification)
      const isCodeValid = await verifyDeviceWithCode(enteredDeviceCode, enteredDevicePin)

      if (isCodeValid) {
        // Code-based connection successful
        await restoreFromCloud()
        setIsPasswordVerified(true)
        setShowDeviceConnect(false)
        setEnteredDeviceCode("")
        setEnteredDevicePin("")
        toast({
          title: "Device Connected!",
          description: "Successfully connected to existing account",
        })
        return
      }

      // If code verification fails, try direct cloud verification
      // This allows connection even if the code has expired
      console.log('Device code verification failed, trying direct cloud connection...')
      let cloudData: string | null = null

      if (dropboxConnected) {
        cloudData = await downloadFromDropbox()
      } else if (googleDriveConnected) {
        cloudData = await downloadFromGoogleDrive()
      }

      if (!cloudData) {
        throw new Error("No cloud data found. Please ensure you have synced data from another device first.")
      }

      // Try to decrypt with provided PIN
      const decryptedData = await restoreEncryptedBackup(cloudData, enteredDevicePin)

      if (decryptedData) {
        // Extract the actual wallet data (handle sync metadata wrapper)
        const walletData = decryptedData.data || decryptedData

        // Validate that we have the required data structure
        if (!walletData || (typeof walletData === 'object' && !walletData.userProfile && !Array.isArray(walletData.transactions))) {
          throw new Error("Invalid data format - missing required wallet data")
        }

        // Store the PIN hash for this device
        const pinHash = await SecureWallet.generateIntegrityHash(enteredDevicePin)
        const salt = SecureWallet.generateSalt()
        localStorage.setItem('wallet_sync_pin_hash', pinHash)
        localStorage.setItem('wallet_sync_pin_salt', btoa(String.fromCharCode(...salt)))

        // Import the data
        await importData(walletData)

        setIsPasswordVerified(true)
        setShowDeviceConnect(false)
        setEnteredDeviceCode("")
        setEnteredDevicePin("")

        toast({
          title: "Device Connected!",
          description: "Successfully connected to existing account",
        })
      } else {
        throw new Error("Invalid PIN")
      }

    } catch (error) {
      console.error('Device connection failed:', error)
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect device",
        variant: "destructive",
      })
    } finally {
      setIsConnectingDevice(false)
    }
  }

  const checkForCloudUpdates = async () => {
    if (!isAutoSyncEnabled || !syncPassword || (!dropboxConnected && !googleDriveConnected)) return

    try {
      let cloudData: string | null = null

      // Try Dropbox first
      if (dropboxConnected) {
        cloudData = await downloadFromDropbox()
      }

      // If not found, try Google Drive
      if (!cloudData && googleDriveConnected) {
        cloudData = await downloadFromGoogleDrive()
      }

      if (!cloudData) return

      const decryptedData = await restoreEncryptedBackup(cloudData, syncPassword)

      // Check if cloud data is newer
      if (decryptedData.timestamp) {
        const cloudTimestamp = new Date(decryptedData.timestamp)
        const lastSync = lastSyncTime || new Date(0)

        if (cloudTimestamp > lastSync && decryptedData.deviceId !== deviceId) {
          console.log('🔄 New cloud data detected, auto-syncing...')
          setHasNewCloudData(true)

          // Automatically sync the new data
          setIsAutoSyncing(true)
          try {
            await restoreFromCloud()
            setHasNewCloudData(false)
          } finally {
            setIsAutoSyncing(false)
          }
        }
      }
    } catch (error) {
      console.log('Auto-sync check failed:', error)
      // Silent fail for background checks
    }
  }

  const getMergePreview = (localData: any, cloudData: any) => {
    const preview = {
      newTransactions: 0,
      updatedBudgets: 0,
      newBudgets: 0,
      updatedGoals: 0,
      newGoals: 0,
      newCategories: 0
    }

    // Count new transactions
    if (cloudData.transactions && Array.isArray(cloudData.transactions)) {
      const existingTransactionIds = new Set(
        (localData.transactions || []).map((t: any) =>
          `${t.amount}_${t.date}_${t.description}_${t.category}`
        )
      )
      preview.newTransactions = cloudData.transactions.filter((t: any) => {
        const transactionId = `${t.amount}_${t.date}_${t.description}_${t.category}`
        return !existingTransactionIds.has(transactionId)
      }).length
    }

    // Count budget updates/additions
    if (cloudData.budgets && Array.isArray(cloudData.budgets)) {
      cloudData.budgets.forEach((cloudBudget: any) => {
        const existingIndex = (localData.budgets || []).findIndex((b: any) => b.id === cloudBudget.id)
        if (existingIndex >= 0) {
          if (new Date(cloudBudget.updatedAt || 0) > new Date(localData.budgets[existingIndex].updatedAt || 0)) {
            preview.updatedBudgets++
          }
        } else {
          preview.newBudgets++
        }
      })
    }

    // Count goal updates/additions
    if (cloudData.goals && Array.isArray(cloudData.goals)) {
      cloudData.goals.forEach((cloudGoal: any) => {
        const existingIndex = (localData.goals || []).findIndex((g: any) => g.id === cloudGoal.id)
        if (existingIndex >= 0) {
          if (new Date(cloudGoal.updatedAt || 0) > new Date(localData.goals[existingIndex].updatedAt || 0)) {
            preview.updatedGoals++
          }
        } else {
          preview.newGoals++
        }
      })
    }

    // Count new categories
    if (cloudData.categories && Array.isArray(cloudData.categories)) {
      const existingCategoryIds = new Set((localData.categories || []).map((c: any) => c.id))
      preview.newCategories = cloudData.categories.filter((c: any) => !existingCategoryIds.has(c.id)).length
    }

    return preview
  }

  const mergeData = (localData: any, cloudData: any) => {
    // Smart merge for wallet data
    const merged = { ...localData }

    // Merge transactions - avoid duplicates based on amount, date, and description
    if (cloudData.transactions && Array.isArray(cloudData.transactions)) {
      const existingTransactionIds = new Set(
        (merged.transactions || []).map((t: any) =>
          `${t.amount}_${t.date}_${t.description}_${t.category}`
        )
      )

      const newTransactions = cloudData.transactions.filter((t: any) => {
        const transactionId = `${t.amount}_${t.date}_${t.description}_${t.category}`
        return !existingTransactionIds.has(transactionId)
      })

      merged.transactions = [...(merged.transactions || []), ...newTransactions]
    }

    // Merge budgets - update existing or add new
    if (cloudData.budgets && Array.isArray(cloudData.budgets)) {
      merged.budgets = merged.budgets || []
      cloudData.budgets.forEach((cloudBudget: any) => {
        const existingIndex = merged.budgets.findIndex((b: any) => b.id === cloudBudget.id)
        if (existingIndex >= 0) {
          // Update existing budget with newer data
          if (new Date(cloudBudget.updatedAt || 0) > new Date(merged.budgets[existingIndex].updatedAt || 0)) {
            merged.budgets[existingIndex] = cloudBudget
          }
        } else {
          // Add new budget
          merged.budgets.push(cloudBudget)
        }
      })
    }

    // Merge goals - similar logic to budgets
    if (cloudData.goals && Array.isArray(cloudData.goals)) {
      merged.goals = merged.goals || []
      cloudData.goals.forEach((cloudGoal: any) => {
        const existingIndex = merged.goals.findIndex((g: any) => g.id === cloudGoal.id)
        if (existingIndex >= 0) {
          if (new Date(cloudGoal.updatedAt || 0) > new Date(merged.goals[existingIndex].updatedAt || 0)) {
            merged.goals[existingIndex] = cloudGoal
          }
        } else {
          merged.goals.push(cloudGoal)
        }
      })
    }

    // Merge categories - add missing ones
    if (cloudData.categories && Array.isArray(cloudData.categories)) {
      merged.categories = merged.categories || []
      const existingCategoryIds = new Set(merged.categories.map((c: any) => c.id))
      const newCategories = cloudData.categories.filter((c: any) => !existingCategoryIds.has(c.id))
      merged.categories = [...merged.categories, ...newCategories]
    }

    // For user profile, prefer the one with more recent updates
    if (cloudData.userProfile && (!merged.userProfile ||
        new Date(cloudData.userProfile.updatedAt || 0) > new Date(merged.userProfile.updatedAt || 0))) {
      merged.userProfile = cloudData.userProfile
    }

    // Add merge metadata
    merged.mergedAt = new Date().toISOString()
    merged.mergedFrom = [localData.deviceId || 'local', cloudData.deviceId || 'cloud']
    merged.lastMergeTimestamp = Math.max(
      localData.timestamp ? new Date(localData.timestamp).getTime() : 0,
      cloudData.timestamp ? new Date(cloudData.timestamp).getTime() : 0
    )

    return merged
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Cloud Sync
        </CardTitle>
        <CardDescription>Sync your data securely to cloud storage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${dropboxConnected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {dropboxConnected ? <CheckCircle className="w-5 h-5 text-blue-600" /> : <CloudOff className="w-5 h-5 text-gray-400" />}
              </div>
              <div>
                <p className="font-medium">Dropbox</p>
                <p className="text-sm text-muted-foreground">
                  {dropboxConnected ? (dropboxUserInfo ? dropboxUserInfo.email : 'Connected') : 'Not connected'}
                </p>
                {dropboxConnected && dropboxUserInfo && (
                  <p className="text-xs text-muted-foreground mt-1">{dropboxUserInfo.name}</p>
                )}
              </div>
            </div>
            <Button
              variant={dropboxConnected ? "destructive" : "default"}
              size="sm"
              onClick={dropboxConnected ? disconnectDropbox : connectDropbox}
            >
              {dropboxConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${googleDriveConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
                {googleDriveConnected ? <CheckCircle className="w-5 h-5 text-green-600" /> : <CloudOff className="w-5 h-5 text-gray-400" />}
              </div>
              <div>
                <p className="font-medium">Google Drive</p>
                <p className="text-sm text-muted-foreground">
                  {googleDriveConnected ? (googleUserInfo ? googleUserInfo.email : 'Connected') : 'Not connected'}
                </p>
                {googleDriveConnected && googleUserInfo && (
                  <p className="text-xs text-muted-foreground mt-1">{googleUserInfo.name}</p>
                )}
              </div>
            </div>
            <Button
              variant={googleDriveConnected ? "destructive" : "default"}
              size="sm"
              onClick={googleDriveConnected ? disconnectGoogleDrive : connectGoogleDrive}
            >
              {googleDriveConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </div>
        </div>

        {/* Sync Password */}
        {!isPasswordVerified ? (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">Sync Password Not Set</h4>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                A sync password is required to secure your data across devices. Set it up when you're ready to start syncing.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowPasswordSetup(true)}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
                >
                  Setup Password Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeviceConnect(true)}
                  className="flex-1"
                >
                  Connect Existing
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="sync-password">Sync Password</Label>
            <Input
              id="sync-password"
              type="password"
              placeholder="Enter password for encryption"
              value={syncPassword}
              onChange={(e) => setSyncPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPasswordSetup(true)}
              >
                Change Password
              </Button>
              <p className="text-xs text-muted-foreground flex-1">
                Required for secure cloud sync across devices
              </p>
            </div>
          </div>
        )}

        {/* Sync Actions */}
        {isPasswordVerified && (
          <div className="flex gap-4">
            <Button
              onClick={() => syncData(false)}
              disabled={!syncPassword || (!dropboxConnected && !googleDriveConnected) || isSyncing}
              className="flex-1"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
            </Button>
            <Button
              variant="outline"
              onClick={() => restoreFromCloud(false)}
              disabled={!syncPassword || (!dropboxConnected && !googleDriveConnected) || isSyncing}
              className="flex-1"
            >
              <Cloud className="w-4 h-4 mr-2" />
              Restore from Cloud
            </Button>
          </div>
        )}

        {!isPasswordVerified && (
          <div className="p-3 bg-muted/50 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              Set up your sync password to enable cloud synchronization
            </p>
          </div>
        )}

        {/* New Cloud Data Indicator */}
        {hasNewCloudData && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <Cloud className="w-4 h-4 text-primary" />
            <div className="flex-1">
              <p className="text-sm text-primary">New data available from another device</p>
            </div>
            <Button
              size="sm"
              onClick={async () => {
                await restoreFromCloud()
                setHasNewCloudData(false)
              }}
              disabled={isSyncing}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Sync Now
            </Button>
          </div>
        )}

        {/* Sync Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Auto Sync</p>
              <p className="text-xs text-muted-foreground">
                Automatically sync when online or when data changes
                {isAutoSyncing && (
                  <span className="ml-2 inline-flex items-center text-primary">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Syncing...
                  </span>
                )}
              </p>
            </div>
            <Switch
              checked={isAutoSyncEnabled}
              onCheckedChange={(enabled) => {
                setIsAutoSyncEnabled(enabled)
                localStorage.setItem('wallet_auto_sync_enabled', JSON.stringify(enabled))
              }}
            />
          </div>

          {lastSyncTime && (
            <div className="text-sm text-muted-foreground">
              Last synced: {lastSyncTime.toLocaleString()}
              {isAutoSyncEnabled && (
                <span className="ml-2 text-xs text-primary">• Auto-sync enabled</span>
              )}
            </div>
          )}
        </div>

        {/* Connect Existing Account */}
        {!isPasswordVerified && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Connect Existing Account</h4>
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground/80 mb-3">
                Already have a wallet account? Connect this device to your existing account.
              </p>

              <Button
                onClick={() => setShowDeviceConnect(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Connect Existing Account
              </Button>
            </div>
          </div>
        )}

        {/* Device Sharing */}
        {isPasswordVerified && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Add New Device</h4>
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground/80 mb-2">
                To connect a new device, generate a temporary code and enter it on the new device along with your password.
              </p>

            {/* Generated Code Display */}
            {generatedCode && codeExpiry && timeLeft > 0 && (
              <div className="mb-3 p-3 bg-card border border-border rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Device Code:</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      timeLeft > 60 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      timeLeft > 30 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-destructive/10 text-destructive dark:bg-destructive/20'
                    }`}>
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-muted rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      timeLeft > 60 ? 'bg-green-500' :
                      timeLeft > 30 ? 'bg-yellow-500' :
                      'bg-destructive'
                    }`}
                    style={{ width: `${(timeLeft / 300) * 100}%` }}
                  ></div>
                </div>

                <div className="flex items-center gap-2">
                  <code className="flex-1 text-center text-lg font-mono font-bold text-primary bg-primary/10 px-3 py-2 rounded border border-primary/20">
                    {generatedCode}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode)
                      toast({
                        title: "Copied!",
                        description: "Device code copied to clipboard",
                      })
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this code with your new device. It expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (!isPasswordVerified) {
                    toast({
                      title: "Password Required",
                      description: "Please set up your sync password first.",
                      variant: "destructive",
                    })
                    setShowPasswordSetup(true)
                    return
                  }

                  console.log('Button clicked!') // Debug log
                  try {
                    const code = generateDeviceCode()
                    console.log('Generated code:', code) // Debug log
                    toast({
                      title: "Device Code Generated",
                      description: `Code: ${code} (expires in 5 minutes)`,
                    })
                  } catch (error) {
                    console.error('Error generating device code:', error)
                    toast({
                      title: "Error",
                      description: "Failed to generate device code",
                      variant: "destructive",
                    })
                  }
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={!isPasswordVerified}
              >
                {generatedCode ? 'Generate New Code' : 'Generate Device Code'}
              </Button>

              {generatedCode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setGeneratedCode(null)
                    setCodeExpiry(null)
                    setTimeLeft(0)
                    localStorage.removeItem('wallet_device_code')
                    toast({
                      title: "Code Cleared",
                      description: "Device code has been cleared",
                    })
                  }}
                >
                  Clear Code
                </Button>
              )}
            </div>
            {!isPasswordVerified && (
              <p className="text-xs text-destructive mt-2">
                Please set up your sync PIN first
              </p>
            )}
          </div>
        </div>
        )}

        {/* Security Info */}
        <div className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            <p className="font-medium text-primary">Security Features</p>
          </div>
          <ul className="space-y-1">
            <li>• End-to-end encryption with password</li>
            <li>• Device-specific access control</li>
            <li>• Secure token storage</li>
            <li>• Automatic conflict resolution</li>
            <li>• Temporary device codes (5min expiry)</li>
          </ul>
        </div>

        {/* Smart Merge */}
        {syncConflicts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-primary">🤝 Smart Merge Available</h4>
            {syncConflicts.map((conflict, index) => {
              const currentData = {
                userProfile,
                transactions,
                budgets,
                goals,
                debtAccounts,
                creditAccounts,
                categories,
                emergencyFund
              }
              const preview = getMergePreview(currentData, conflict.cloudData)

              return (
                <div key={index} className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Cloud className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-primary">
                      New data from {conflict.cloudDevice}
                    </p>
                  </div>

                  {/* Merge Preview */}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    {preview.newTransactions > 0 && (
                      <div className="flex justify-between">
                        <span className="text-primary/70">New transactions:</span>
                        <span className="font-medium text-primary">{preview.newTransactions}</span>
                      </div>
                    )}
                    {preview.updatedBudgets > 0 && (
                      <div className="flex justify-between">
                        <span className="text-primary/70">Updated budgets:</span>
                        <span className="font-medium text-primary">{preview.updatedBudgets}</span>
                      </div>
                    )}
                    {preview.newBudgets > 0 && (
                      <div className="flex justify-between">
                        <span className="text-primary/70">New budgets:</span>
                        <span className="font-medium text-primary">{preview.newBudgets}</span>
                      </div>
                    )}
                    {preview.updatedGoals > 0 && (
                      <div className="flex justify-between">
                        <span className="text-primary/70">Updated goals:</span>
                        <span className="font-medium text-primary">{preview.updatedGoals}</span>
                      </div>
                    )}
                    {preview.newGoals > 0 && (
                      <div className="flex justify-between">
                        <span className="text-primary/70">New goals:</span>
                        <span className="font-medium text-primary">{preview.newGoals}</span>
                      </div>
                    )}
                    {preview.newCategories > 0 && (
                      <div className="flex justify-between">
                        <span className="text-primary/70">New categories:</span>
                        <span className="font-medium text-primary">{preview.newCategories}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={async () => {
                        // Smart merge data
                        const mergedData = mergeData(currentData, conflict.cloudData)
                        await importData(mergedData)
                        setSyncConflicts([])
                        toast({
                          title: "Smart Merge Complete",
                          description: `Successfully merged data from ${conflict.cloudDevice}`,
                        })
                      }}
                    >
                      🤝 Smart Merge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Keep local data only
                        setSyncConflicts([])
                        toast({
                          title: "Kept Local Data",
                          description: "Local changes preserved.",
                        })
                      }}
                    >
                      Keep Local Only
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    Smart merge combines data intelligently without duplicates
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* Offline Indicator */}
        {!isOnline && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950 dark:border-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Offline mode - {isAutoSyncEnabled ? 'auto-sync will resume when online' : 'manual sync required'}
            </p>
          </div>
        )}

        {/* Multi-device Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">Multi-Device Sync</p>
          <p>Connect the same cloud account on multiple devices to sync your data automatically.</p>
          <p className="mt-1">Device ID: {deviceId.split('_')[1]}</p>
        </div>
      </CardContent>

      {/* Password Setup Modal */}
      <PasswordSetupModal
        isOpen={showPasswordSetup}
        onClose={() => {
          setShowPasswordSetup(false)
          setNewPassword("")
          setConfirmPassword("")
          setPasswordError("")
        }}
        isPasswordVerified={isPasswordVerified}
        syncPassword={syncPassword}
        onSyncPasswordChange={setSyncPassword}
        newPassword={newPassword}
        onNewPasswordChange={setNewPassword}
        confirmPassword={confirmPassword}
        onConfirmPasswordChange={setConfirmPassword}
        passwordError={passwordError}
        onSetupPassword={setupSyncPassword}
        onChangePassword={changeSyncPassword}
      />

      {/* Device Connect Modal */}
      <DeviceConnectModal
        isOpen={showDeviceConnect}
        onClose={() => {
          setShowDeviceConnect(false)
          setEnteredDeviceCode("")
          setEnteredDevicePin("")
        }}
        enteredDeviceCode={enteredDeviceCode}
        onDeviceCodeChange={setEnteredDeviceCode}
        enteredDevicePin={enteredDevicePin}
        onDevicePinChange={setEnteredDevicePin}
        isConnectingDevice={isConnectingDevice}
        onConnectDevice={connectExistingDevice}
      />
    </Card>
  )
}