"use client"

import { useState, useEffect, useCallback } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useConvexAuth } from "./use-convex-auth"
import { useWalletData } from "@/contexts/wallet-data-context"
import { SecureWallet } from "@/lib/security"
import { toast } from "@/hooks/use-toast"

interface SyncState {
  isEnabled: boolean
  isSyncing: boolean
  lastSyncTime: number | null
  error: string | null
}

export function useConvexSync() {
  const { user, isAuthenticated } = useConvexAuth()
  const { userProfile, transactions, budgets, goals, debtAccounts, creditAccounts, debtCreditTransactions, categories, emergencyFund, importData } = useWalletData()

  const [syncState, setSyncState] = useState<SyncState>({
    isEnabled: false,
    isSyncing: false,
    lastSyncTime: null,
    error: null,
  })

  // Load sync settings from localStorage
  useEffect(() => {
    const isEnabled = localStorage.getItem("convex_sync_enabled") === "true"
    const lastSyncTime = localStorage.getItem("convex_last_sync_time")

    setSyncState(prev => ({
      ...prev,
      isEnabled,
      lastSyncTime: lastSyncTime ? parseInt(lastSyncTime) : null,
    }))
  }, [])



  const storeWalletDataMutation = useMutation(api.walletData.storeWalletData)
  const getWalletData = useQuery(
    api.walletData.getWalletData,
    isAuthenticated && user?.id ? { userId: user.id as any } : "skip"
  )
  const registerDeviceMutation = useMutation(api.walletData.registerDevice)
  const getUserDevices = useQuery(
    api.walletData.getUserDevices,
    isAuthenticated && user?.id ? { userId: user.id as any } : "skip"
  )
  const removeDeviceMutation = useMutation(api.walletData.removeDevice)


  // Generate user-friendly device name
  const getDeviceInfo = () => {
    let deviceId = localStorage.getItem("convex_device_id")
    let deviceName = localStorage.getItem("convex_device_name")

    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("convex_device_id", deviceId)
    }

    if (!deviceName) {
      // Generate user-friendly device name
      const userAgent = navigator.userAgent
      let browser = "Browser"
      let os = "Device"

      // Detect browser
      if (userAgent.includes("Chrome")) browser = "Chrome"
      else if (userAgent.includes("Firefox")) browser = "Firefox"
      else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari"
      else if (userAgent.includes("Edge")) browser = "Edge"

      // Detect OS
      if (userAgent.includes("Windows")) os = "Windows"
      else if (userAgent.includes("Mac")) os = "macOS"
      else if (userAgent.includes("Linux")) os = "Linux"
      else if (userAgent.includes("Android")) os = "Android"
      else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS"

      deviceName = `${browser} on ${os}`
      localStorage.setItem("convex_device_name", deviceName)
    }

    return { deviceId, deviceName }
  }

  // Generate consistent salt from user data
  const generateConsistentSalt = (userId: string, userEmail: string): Uint8Array => {
    // Create a deterministic salt based on user data
    const userData = `${userId}_${userEmail}_convex_sync_salt`
    const encoder = new TextEncoder()
    const data = encoder.encode(userData)

    // Use SHA-256 to create a consistent 32-byte salt
    return new Uint8Array(data.slice(0, 32))
  }

  // Encrypt wallet data
  const encryptWalletData = async (data: any, password: string) => {
    try {
      const dataString = JSON.stringify(data)
      // Use consistent salt based on user data for cross-device compatibility
      const salt = generateConsistentSalt(user!.id, user!.email)
      const key = await SecureWallet.deriveKeyFromPin(password, salt)
      const encrypted = await SecureWallet.encryptData(dataString, key)
      const hash = await SecureWallet.generateIntegrityHash(dataString)
      return { encrypted, hash }
    } catch (error) {
      throw new Error("Encryption failed")
    }
  }

  // Decrypt wallet data
  const decryptWalletData = async (encryptedData: string, password: string) => {
    try {
      // Use the same consistent salt as encryption
      const salt = generateConsistentSalt(user!.id, user!.email)
      const key = await SecureWallet.deriveKeyFromPin(password, salt)
      const decrypted = await SecureWallet.decryptData(encryptedData, key)
      return JSON.parse(decrypted)
    } catch (error) {
      throw new Error("Decryption failed")
    }
  }

  // Enable Convex sync
  const enableSync = async () => {
    if (!isAuthenticated || !user) {
      return { success: false, error: "User not authenticated" }
    }

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }))

      // Update settings
      localStorage.setItem("convex_sync_enabled", "true")
      setSyncState(prev => ({
        ...prev,
        isEnabled: true,
        isSyncing: false,
      }))

      return { success: true }
    } catch (error: any) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message || "Failed to enable sync",
      }))

      return { success: false, error: error.message }
    }
  }

  // Disable Convex sync
  const disableSync = async () => {
    try {
      // Clear sync data
      localStorage.removeItem("convex_sync_enabled")
      localStorage.removeItem("convex_sync_password")
      localStorage.removeItem("convex_last_sync_time")

      setSyncState({
        isEnabled: false,
        isSyncing: false,
        lastSyncTime: null,
        error: null,
      })

      toast({
        title: "Convex Sync Disabled",
        description: "Sync has been disabled. Your data will no longer sync to Convex.",
      })

      return { success: true }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to disable sync",
        variant: "destructive",
      })

      return { success: false, error: error.message }
    }
  }

  // Sync data to Convex (manual push)
  const syncToConvex = async (password?: string) => {
    if (!isAuthenticated || !user || !syncState.isEnabled) {
      return { success: false, error: "Sync not enabled or user not authenticated" }
    }

    // Use provided password or generate one from user ID for consistency
    const syncPassword = password || `convex_sync_${user.id}_${user.email}`

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }))

      // Register/update device
      const { deviceId, deviceName } = getDeviceInfo()
      await registerDeviceMutation({
        userId: user.id as any,
        deviceId,
        deviceName,
      })

      // Prepare wallet data - EXCLUDE default categories
      const userCreatedCategories = categories.filter(cat => !cat.isDefault)

      const walletData = {
        userProfile,
        transactions,
        budgets,
        goals,
        debtAccounts,
        creditAccounts,
        categories: userCreatedCategories, // Only sync user-created categories
        emergencyFund,
        exportedAt: Date.now(),
      }

      // Encrypt data
      const { encrypted, hash } = await encryptWalletData(walletData, syncPassword)

      // Store in Convex
      await storeWalletDataMutation({
        userId: user.id as any,
        encryptedData: encrypted,
        dataHash: hash,
      })

      const now = Date.now()
      localStorage.setItem("convex_last_sync_time", now.toString())

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: now,
      }))

      return { success: true }
    } catch (error: any) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message || "Push failed",
      }))

      return { success: false, error: error.message }
    }
  }

  // Sync data from Convex (manual pull)
  const syncFromConvex = useCallback(async (password?: string) => {
    if (!isAuthenticated || !user) {
      return { success: false, error: "User not authenticated" }
    }

    // Use provided password or generate one from user ID for consistency
    const syncPassword = password || `convex_sync_${user.id}_${user.email}`

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }))

      // Get data from Convex
      const latestData = getWalletData

      if (!latestData) {
        setSyncState(prev => ({ ...prev, isSyncing: false }))
        toast({
          title: "No Data Found",
          description: "No data found in cloud to sync.",
        })
        return { success: true, message: "No remote data to sync" }
      }

      // Decrypt data
      const remoteData = await decryptWalletData(latestData.encryptedData, syncPassword)

      // Import the remote data directly (replace local data)
      const success = await importData(remoteData)

      if (success) {
        const now = Date.now()
        localStorage.setItem("convex_last_sync_time", now.toString())

        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: now,
        }))

        toast({
          title: "Data Pulled Successfully",
          description: "Remote data has been imported to this device.",
        })

        return { success: true, data: remoteData }
      } else {
        toast({
          title: "Import Failed",
          description: "Failed to import remote data.",
          variant: "destructive",
        })
        return { success: false, error: "Import failed" }
      }
    } catch (error: any) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message || "Download failed",
      }))

      toast({
        title: "Pull Failed",
        description: error.message || "Failed to pull data from cloud.",
        variant: "destructive",
      })

      return { success: false, error: error.message || "Download failed" }
    }
  }, [isAuthenticated, user, getWalletData, importData])



  // Get current device info
  const getCurrentDevice = () => {
    return getDeviceInfo()
  }

  // Remove a device
  const removeDevice = async (deviceId: string) => {
    if (!isAuthenticated || !user) {
      return { success: false, error: "User not authenticated" }
    }

    try {
      const result = await removeDeviceMutation({
        userId: user.id as any,
        deviceId,
      })

      if (result.success) {
        toast({
          title: "Device Removed",
          description: `Successfully removed ${result.deviceName || 'device'}.`,
        })
        return { success: true }
      } else {
        toast({
          title: "Remove Failed",
          description: result.error || "Failed to remove device.",
          variant: "destructive",
        })
        return { success: false, error: result.error }
      }
    } catch (error: any) {
      toast({
        title: "Remove Failed",
        description: error.message || "Failed to remove device.",
        variant: "destructive",
      })
      return { success: false, error: error.message }
    }
  }

  return {
    ...syncState,
    enableSync,
    disableSync,
    syncToConvex,
    syncFromConvex,
    getCurrentDevice,
    removeDevice,
    devices: getUserDevices || [],
    getWalletData,
    user,
    isAuthenticated,
  }
}
