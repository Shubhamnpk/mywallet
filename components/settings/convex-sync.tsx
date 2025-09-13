"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, User, Database } from "lucide-react"
import { useConvexAuth } from "@/hooks/use-convex-auth"
import { useConvexSync } from "@/hooks/use-convex-sync"
import { useWalletData } from "@/contexts/wallet-data-context"
import { toast } from "@/hooks/use-toast"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { ConvexAuthModal } from "@/components/auth/convex-auth-modal"
import { DeviceManagement } from "./device-management"

export function ConvexSync() {
  const { user, isAuthenticated, signUp, signIn, signOut, isLoading: authLoading } = useConvexAuth()
  const {
    isEnabled,
    isPaused,
    isSyncing,
    lastSyncTime,
    error,
    enableSync,
    disableSync,
    pauseSync,
    resumeSync,
    syncToConvex,
    syncFromConvex,
    refreshSyncState,
  } = useConvexSync()
  const { transactions, budgets, goals, categories, emergencyFund, debtAccounts, creditAccounts, debtCreditTransactions, userProfile } = useWalletData()

  // Device management
  const connectedDevices = useQuery(
    api.walletData.getConnectedDevices,
    isAuthenticated && user?.id ? { userId: user.id as any } : "skip"
  )
  const updateDeviceStatusMutation = useMutation(api.walletData.updateDeviceStatus)

  const [syncPassword, setSyncPassword] = useState("")
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)
  const [hasExistingData, setHasExistingData] = useState(false)

  // Generate or retrieve secure sync password
  const getSecureSyncPassword = async (): Promise<string> => {
    try {
      const storedEncryptedPassword = localStorage.getItem("convex_sync_password")
      const saltString = localStorage.getItem("convex_sync_salt")

      if (storedEncryptedPassword && saltString) {
        const salt = new Uint8Array(atob(saltString).split("").map(char => char.charCodeAt(0)))
        const key = await import("@/lib/security").then(m => m.SecureWallet.deriveKeyFromPin("convex_sync_key", salt))
        return await import("@/lib/security").then(m => m.SecureWallet.decryptData(storedEncryptedPassword, key))
      }

      // Generate cryptographically secure random password
      const randomBytes = crypto.getRandomValues(new Uint8Array(32))
      const securePassword = btoa(String.fromCharCode(...randomBytes))

      // Store it securely
      const salt = crypto.getRandomValues(new Uint8Array(32))
      const key = await import("@/lib/security").then(m => m.SecureWallet.deriveKeyFromPin("convex_sync_key", salt))
      const newEncryptedPassword = await import("@/lib/security").then(m => m.SecureWallet.encryptData(securePassword, key))

      localStorage.setItem("convex_sync_password", newEncryptedPassword)
      localStorage.setItem("convex_sync_salt", btoa(String.fromCharCode(...salt)))

      return securePassword
    } catch (error) {
      console.error("Failed to get/generate secure sync password:", error)
      throw new Error("Failed to generate secure sync password")
    }
  }

  // Helper function to check if device has local data
  const hasLocalData = () =>
    transactions.length > 0 ||
    budgets.length > 0 ||
    goals.length > 0 ||
    debtAccounts.length > 0 ||
    creditAccounts.length > 0 ||
    debtCreditTransactions.length > 0 ||
    categories.length > 0 ||
    emergencyFund > 0 ||
    userProfile !== null

  // Helper function for sync operations with error handling
  const performSyncOperation = async (operation: () => Promise<any>, successMessage: string, errorMessage: string) => {
    try {
      const result = await operation()
      if (result.success) {
        toast({ title: successMessage, description: "Operation completed successfully!" })
      } else {
        toast({ title: "Operation Failed", description: errorMessage, variant: "destructive" })
      }
      return result
    } catch (error) {
      console.error(errorMessage, error)
      toast({ title: "Operation Failed", description: errorMessage, variant: "destructive" })
      return { success: false }
    }
  }

  // Get sync status display info
  const getSyncStatus = () => {
    if (isSyncing) return { icon: '🔄 Syncing...', text: 'Uploading changes to cloud...', color: 'bg-yellow-500 animate-pulse' }
    if (error) return { icon: '❌ Sync Error', text: `Last sync: ${formatLastSyncTime(lastSyncTime)}`, color: 'bg-red-500' }
    if (isPaused) return { icon: '⏸️ Auto-Sync Paused', text: 'Automatic sync is paused - manual sync available', color: 'bg-orange-500' }
    return { icon: '✅ Auto-Sync Active', text: `Last synced: ${formatLastSyncTime(lastSyncTime)}`, color: 'bg-green-500' }
  }



  const handleSetupSync = async () => {
    // No password needed - using Convex account password
    const result = await enableSync()
    if (result.success) {
      setShowSetupDialog(false)
      setSyncPassword("")
    }
  }

  const handleToggleSync = async (enabled: boolean) => {
    if (enabled) {
      if (isSyncing) {
        toast({
          title: "Cannot Enable Sync",
          description: "Please wait for current sync operation to complete.",
          variant: "destructive",
        })
        return
      }
      if (!isAuthenticated) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to Convex first to enable sync.",
          variant: "destructive",
        })
        return
      }
      // Clear the manually disabled flag when user enables sync
      localStorage.removeItem("sync_manually_disabled")

      // Directly enable sync (no setup dialog needed)
      const result = await enableSync()
      if (result.success) {
        toast({
          title: "Sync Enabled",
          description: "Automatic sync is now active.",
        })
      }
    } else {
      // Allow disabling even during sync
      await disableSync()
    }
  }

  const handleUnlockSync = async () => {
    if (!syncPassword) {
      toast({
        title: "Password Required",
        description: "Please enter your sync password.",
        variant: "destructive",
      })
      return
    }

    try {
      // Try to sync from Convex with the provided password
      const result = await syncFromConvex(syncPassword)
      if (result.success) {
        const salt = crypto.getRandomValues(new Uint8Array(32))
        const key = await import("@/lib/security").then(m => m.SecureWallet.deriveKeyFromPin("convex_sync_key", salt))
        const encryptedPassword = await import("@/lib/security").then(m => m.SecureWallet.encryptData(syncPassword, key))
        localStorage.setItem("convex_sync_password", encryptedPassword)
        localStorage.setItem("convex_sync_salt", btoa(String.fromCharCode(...salt)))
        localStorage.setItem("convex_sync_enabled", "true")
        refreshSyncState()
        toast({
          title: "Sync Unlocked",
          description: "Successfully connected to your existing sync data.",
        })
      } else {
        toast({
          title: "Invalid Password",
          description: "The sync password is incorrect. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Unlock Failed",
        description: error.message || "Failed to unlock sync data.",
        variant: "destructive",
      })
    }
  }

  const formatLastSyncTime = (timestamp: number | null) => {
    if (!timestamp) return "Never"
    return new Date(timestamp).toLocaleString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Convex Sync
        </CardTitle>
        <CardDescription>
          Sync your encrypted wallet data across devices using Convex
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Authentication Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isAuthenticated ? 'bg-green-100' : 'bg-gray-100'}`}>
              {isAuthenticated ? <CheckCircle className="w-5 h-5 text-green-600" /> : <User className="w-5 h-5 text-gray-400" />}
            </div>
            <div>
              <p className="font-medium">
                {isAuthenticated ? (user?.name || user?.email || "User") : "Not signed in"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated ? user?.email : "Sign in to enable sync"}
              </p>
            </div>
          </div>
          {isAuthenticated ? (
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          ) : (
            <Button size="sm" onClick={() => setShowAuthDialog(true)}>
              Sign In
            </Button>
          )}
        </div>

        {/* Sync Settings */}
        {isAuthenticated && (
          <>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium">Enable Convex Sync</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync encrypted wallet data across your devices
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={handleToggleSync}
                      disabled={authLoading}
                    />
                    {isEnabled && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          // Force disable by clearing ALL sync-related localStorage keys
                          const keysToRemove = [
                            "convex_sync_enabled",
                            "convex_sync_password",
                            "convex_sync_salt",
                            "convex_last_sync_time",
                            "convex_sync_paused",
                            "convex_sync_auto_enabled", // Clear any auto-enable flags
                            "sync_manually_disabled" // Clear first, then set
                          ]

                          keysToRemove.forEach(key => localStorage.removeItem(key))

                          // Mark as manually disabled to prevent auto-re-enable
                          localStorage.setItem("sync_manually_disabled", "true")

                          // Force state update
                          refreshSyncState()

                          toast({
                            title: "Sync Force Disabled",
                            description: "Sync has been disabled. Any ongoing operations were cancelled.",
                          })
                        }}
                        className="text-xs flex-1 sm:flex-none"
                      >
                        Force Disable
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {isEnabled && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${getSyncStatus().color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{getSyncStatus().icon}</p>
                      <p className="text-xs text-muted-foreground">{getSyncStatus().text}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isPaused ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await pauseSync()
                          }}
                          disabled={isSyncing}
                          className="text-xs flex-1 sm:flex-none min-w-[80px]"
                        >
                          ⏸️ Pause
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await resumeSync()
                          }}
                          disabled={isSyncing}
                          className="text-xs flex-1 sm:flex-none min-w-[80px]"
                        >
                          ▶️ Resume
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => performSyncOperation(
                          async () => {
                            const uploadResult = await syncToConvex()
                            const downloadResult = await syncFromConvex()
                            return uploadResult.success && downloadResult.success ? { success: true } : { success: false }
                          },
                          "Manual Sync Complete",
                          "Manual sync failed"
                        )}
                        disabled={isSyncing}
                        className="text-xs flex-1 sm:flex-none min-w-[80px]"
                      >
                        🔄 Sync Now
                      </Button>
                      {error && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.reload()}
                          className="text-xs flex-1 sm:flex-none min-w-[80px]"
                        >
                          🔄 Retry
                        </Button>
                      )}
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {error}
                        <br />
                        <span className="text-xs opacity-75">
                          Changes will sync automatically when connection is restored.
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}

                  {!error && !isSyncing && (
                    <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950/20 p-2 rounded border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span className="font-medium text-green-800 dark:text-green-200">
                          Automatic Sync Active
                        </span>
                      </div>
                      <p className="mt-1 text-green-700 dark:text-green-300">
                        All changes are automatically synced across your devices in real-time.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Sync Options - Only show when auto-sync is disabled */}
              {!isEnabled && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Manual Sync Options</p>
                      <p className="text-xs text-muted-foreground">
                        Manual operations available when auto-sync is disabled
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => performSyncOperation(
                          async () => await syncToConvex(await getSecureSyncPassword()),
                          "Data Pushed Successfully! 📤",
                          "Failed to push data to cloud"
                        )}
                        disabled={isSyncing || !isAuthenticated}
                        className="text-xs flex-1 sm:flex-none min-w-[100px]"
                      >
                        📤 Push My Data
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => performSyncOperation(
                          async () => await syncFromConvex(await getSecureSyncPassword()),
                          "Data Pulled Successfully! 🎉",
                          "Failed to pull existing data"
                        )}
                        disabled={isSyncing || !isAuthenticated}
                        className="text-xs flex-1 sm:flex-none min-w-[100px]"
                      >
                        📥 Pull My Data
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (hasLocalData()) {
                            toast({
                              title: "Data Already Exists",
                              description: "This device already has data. Recovery not needed.",
                              variant: "default",
                            })
                            return
                          }

                          const result = await performSyncOperation(
                            async () => await syncFromConvex(await getSecureSyncPassword()),
                            "Recovery Successful! 🎉",
                            "Failed to recover account data"
                          )

                          if (!result.success) {
                            toast({
                              title: "No Data Found",
                              description: "No existing data found for this account.",
                              variant: "default",
                            })
                          }
                        }}
                        disabled={isSyncing || !isAuthenticated}
                        className="text-xs flex-1 sm:flex-none min-w-[120px]"
                      >
                        🔄 Recover Account
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Connected Devices Section */}
            {isEnabled && connectedDevices && (
              <DeviceManagement
                devices={connectedDevices}
                userId={user!.id}
                currentDeviceId={localStorage.getItem("convex_device_id")}
              />
            )}
          </>
        )}

        {/* Convex Auth Modal */}
        <ConvexAuthModal
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          signUp={signUp}
          signIn={signIn}
          isLoading={authLoading}
          title="Sign in to Convex Sync"
          description="Sign in to your Convex account to enable cross-device synchronization of your wallet data."
          initialMode="signin"
        />
      </CardContent>
    </Card>
  )
}
