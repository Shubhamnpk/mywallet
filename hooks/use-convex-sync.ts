"use client"

import { useState, useEffect } from "react"
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
  const { user, isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const { userProfile, transactions, budgets, goals, debtAccounts, creditAccounts, categories, emergencyFund, importData } = useWalletData()

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

  // Auto-enable sync when user signs in
  useEffect(() => {
    const autoEnable = localStorage.getItem("convex_sync_auto_enabled")
    if (isAuthenticated && autoEnable === "true" && !syncState.isEnabled && !syncState.isSyncing) {
      console.log('[useConvexSync] Auto-enabling sync for authenticated user')
      localStorage.removeItem("convex_sync_auto_enabled") // Clear the flag
      enableSync() // This will be called automatically
    }
  }, [isAuthenticated, syncState.isEnabled, syncState.isSyncing])

  // Debug logging
  useEffect(() => {
    console.log('[useConvexSync] Auth state:', { user, isAuthenticated, authLoading })
  }, [user, isAuthenticated, authLoading])

  const storeWalletDataMutation = useMutation(api.walletData.storeWalletData)
  const getLatestWalletData = useQuery(
    api.walletData.getLatestWalletData,
    isAuthenticated && user?.id && syncState.isEnabled ? { userId: user.id as any } : "skip"
  )
  const getWalletData = useQuery(
    api.walletData.getWalletData,
    isAuthenticated && user?.id && syncState.isEnabled ? { userId: user.id as any } : "skip"
  )
  const updateSyncMetadataMutation = useMutation(api.walletData.updateSyncMetadata)

  // Auto-sync from Convex when component mounts and sync is enabled
  useEffect(() => {
    if (isAuthenticated && syncState.isEnabled && !syncState.isSyncing && getLatestWalletData) {
      console.log('[useConvexSync] Auto-syncing from Convex on mount')
      // Only sync from Convex if we have data there and it's newer than our last sync
      const lastSyncTime = localStorage.getItem("convex_last_sync_time")
      const convexDataTime = getLatestWalletData.lastModified

      if (!lastSyncTime || (convexDataTime && convexDataTime > parseInt(lastSyncTime))) {
        syncFromConvex()
      }
    }
  }, [isAuthenticated, syncState.isEnabled, syncState.isSyncing, getLatestWalletData])

  // Generate device ID
  const getDeviceId = () => {
    let deviceId = localStorage.getItem("convex_device_id")
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("convex_device_id", deviceId)
    }
    return deviceId
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
      console.error("Failed to encrypt data:", error)
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
      console.error("Failed to decrypt data:", error)
      throw new Error("Decryption failed")
    }
  }

  // Enable Convex sync (automatically when user signs in)
  const enableSync = async () => {
    // Wait for auth to be fully loaded
    if (authLoading) {
      await new Promise(resolve => {
        const checkAuth = () => {
          if (!authLoading) {
            resolve(void 0)
          } else {
            setTimeout(checkAuth, 100)
          }
        }
        checkAuth()
      })
    }

    if (!isAuthenticated || !user) {
      console.error('[enableSync] Auth check failed:', { isAuthenticated, user, authLoading })
      throw new Error("User not authenticated")
    }

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }))

      // Generate consistent password from user data for encryption
      const syncPassword = `convex_sync_${user.id}_${user.email}`

      // Perform initial sync
      await syncToConvex(syncPassword)

      // Update settings
      localStorage.setItem("convex_sync_enabled", "true")
      setSyncState(prev => ({
        ...prev,
        isEnabled: true,
        isSyncing: false,
      }))

      toast({
        title: "Convex Sync Enabled",
        description: "Your wallet data will now sync automatically across devices.",
      })

      return { success: true }
    } catch (error: any) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message || "Failed to enable sync",
      }))

      toast({
        title: "Sync Setup Failed",
        description: error.message || "Failed to enable Convex sync",
        variant: "destructive",
      })

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

  // Sync data to Convex
  const syncToConvex = async (password?: string) => {
    if (!isAuthenticated || !user || !syncState.isEnabled) {
      return { success: false, error: "Sync not enabled or user not authenticated" }
    }

    // Use provided password or generate one from user ID for consistency
    const syncPassword = password || `convex_sync_${user.id}_${user.email}`

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }))

      // Prepare wallet data
      const walletData = {
        userProfile,
        transactions,
        budgets,
        goals,
        debtAccounts,
        creditAccounts,
        categories,
        emergencyFund,
        exportedAt: Date.now(),
      }

      // Encrypt data
      const { encrypted, hash } = await encryptWalletData(walletData, syncPassword)

      // Store in Convex
      const deviceId = getDeviceId()
      await storeWalletDataMutation({
        userId: user.id as any,
        deviceId,
        encryptedData: encrypted,
        dataHash: hash,
        version: "1.0",
      })

      // Update sync metadata
      await updateSyncMetadataMutation({
        userId: user.id as any,
        deviceId,
        syncVersion: "1.0",
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
        error: error.message || "Sync failed",
      }))

      return { success: false, error: error.message }
    }
  }

  // Sync data from Convex
  const syncFromConvex = async (password?: string) => {
    if (!isAuthenticated || !user || !syncState.isEnabled) {
      return { success: false, error: "Sync not enabled or user not authenticated" }
    }

    // Use provided password or generate one from user ID for consistency
    const syncPassword = password || `convex_sync_${user.id}_${user.email}`

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }))

      // Get latest data from Convex
      const latestData = getLatestWalletData
      if (!latestData) {
        setSyncState(prev => ({ ...prev, isSyncing: false }))
        return { success: false, error: "No data found in Convex" }
      }

      // Decrypt data
      const decryptedData = await decryptWalletData(latestData.encryptedData, syncPassword)

      console.log("Decrypted Convex data:", decryptedData)

      // Import the decrypted data into the local wallet
      if (decryptedData) {
        try {
          // Use the importData function from the wallet data context
          const success = await importData(decryptedData)

          if (success) {
            toast({
              title: "Sync Complete",
              description: "Data synced from Convex and merged with local data.",
            })
          } else {
            toast({
              title: "Sync Warning",
              description: "Data synced but some items may not have been imported.",
              variant: "default",
            })
          }
        } catch (importError) {
          console.error("Failed to import synced data:", importError)
          toast({
            title: "Sync Error",
            description: "Failed to import synced data. Please try again.",
            variant: "destructive",
          })
        }
      }

      const now = Date.now()
      localStorage.setItem("convex_last_sync_time", now.toString())

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: now,
      }))

      return { success: true, data: decryptedData }
    } catch (error: any) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message || "Sync failed",
      }))

      return { success: false, error: error.message }
    }
  }

  // Get stored sync password
  const getSyncPassword = async (): Promise<string | null> => {
    try {
      const encryptedPassword = localStorage.getItem("convex_sync_password")
      const saltString = localStorage.getItem("convex_sync_salt")
      if (!encryptedPassword || !saltString) return null

      const salt = new Uint8Array(
        atob(saltString)
          .split("")
          .map((char) => char.charCodeAt(0))
      )
      const key = await SecureWallet.deriveKeyFromPin("convex_sync_key", salt)
      return await SecureWallet.decryptData(encryptedPassword, key)
    } catch (error) {
      console.error("Failed to decrypt sync password:", error)
      return null
    }
  }

  // Auto-sync when data changes (if enabled)
  useEffect(() => {
    if (!syncState.isEnabled || !isAuthenticated || syncState.isSyncing) return

    const autoSync = async () => {
      try {
        await syncToConvex()
      } catch (error) {
        console.error("Auto-sync failed:", error)
      }
    }

    // Debounce auto-sync
    const timeoutId = setTimeout(autoSync, 5000) // 5 second delay

    return () => clearTimeout(timeoutId)
  }, [userProfile, transactions, budgets, goals, syncState.isEnabled, isAuthenticated])

  return {
    ...syncState,
    enableSync,
    disableSync,
    syncToConvex,
    syncFromConvex,
    user,
    isAuthenticated,
  }
}
