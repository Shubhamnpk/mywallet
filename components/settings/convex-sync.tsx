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
      if (!isAuthenticated) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to Convex first to enable sync.",
          variant: "destructive",
        })
        return
      }
      setShowSetupDialog(true)
    } else {
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
        const salt = new Uint8Array(32)
        const key = await import("@/lib/security").then(m => m.SecureWallet.deriveKeyFromPin("convex_sync_key", salt))
        const encryptedPassword = await import("@/lib/security").then(m => m.SecureWallet.encryptData(syncPassword, key))

        localStorage.setItem("convex_sync_password", encryptedPassword)
        localStorage.setItem("convex_sync_salt", btoa(String.fromCharCode(...salt)))
        localStorage.setItem("convex_sync_enabled", "true")
        window.location.reload()
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
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Enable Convex Sync</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync encrypted wallet data across your devices
                  </p>
                </div>
                <div className="flex items-center gap-2">

                  <Switch
                    checked={isEnabled}
                    onCheckedChange={handleToggleSync}
                    disabled={isSyncing || authLoading}
                  />
                </div>
              </div>

              {isEnabled && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${
                      isSyncing ? 'bg-yellow-500 animate-pulse' :
                      error ? 'bg-red-500' :
                      isPaused ? 'bg-orange-500' :
                      'bg-green-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {isSyncing ? '🔄 Syncing...' :
                         error ? '❌ Sync Error' :
                         isPaused ? '⏸️ Auto-Sync Paused' :
                         '✅ Auto-Sync Active'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isSyncing ? 'Uploading changes to cloud...' :
                         error ? `Last sync: ${formatLastSyncTime(lastSyncTime)}` :
                         isPaused ? 'Automatic sync is paused - manual sync available' :
                         `Last synced: ${formatLastSyncTime(lastSyncTime)}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!isPaused ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const result = await pauseSync()
                            if (result.success) {
                              console.log('[PAUSE] Auto sync paused')
                            }
                          }}
                          disabled={isSyncing}
                          className="text-xs"
                        >
                          ⏸️ Pause
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const result = await resumeSync()
                            if (result.success) {
                              console.log('[RESUME] Auto sync resumed')
                            }
                          }}
                          disabled={isSyncing}
                          className="text-xs"
                        >
                          ▶️ Resume
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          console.log('[MANUAL] Force sync triggered')
                          toast({
                            title: "Manual Sync Started",
                            description: "Forcing upload and download...",
                          })
                          const uploadResult = await syncToConvex()
                          const downloadResult = await syncFromConvex()

                          if (uploadResult.success && downloadResult.success) {
                            toast({
                              title: "Manual Sync Complete",
                              description: "Data synchronized successfully!",
                            })
                          } else {
                            toast({
                              title: "Manual Sync Failed",
                              description: "Check console for details.",
                              variant: "destructive",
                            })
                          }
                        }}
                        disabled={isSyncing}
                        className="text-xs"
                      >
                        🔄 Sync Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          console.log('[FORCE PULL] Force data pull triggered')
                          toast({
                            title: "Pulling Your Data",
                            description: "Retrieving all your existing data...",
                          })

                          try {
                            // Force sync from Convex using the user-wide approach
                            const syncPassword = `convex_sync_${user!.id}_${user!.email}`
                            const result = await syncFromConvex(syncPassword)

                            if (result.success) {
                              toast({
                                title: "Data Pulled Successfully! 🎉",
                                description: "All your existing data is now on this device.",
                              })
                            } else {
                              toast({
                                title: "Pull Failed",
                                description: "Could not retrieve your data. Check console for details.",
                                variant: "destructive",
                              })
                            }
                          } catch (error) {
                            console.error('[FORCE PULL] Error:', error)
                            toast({
                              title: "Pull Failed",
                              description: "Failed to pull existing data.",
                              variant: "destructive",
                            })
                          }
                        }}
                        disabled={isSyncing || !isAuthenticated}
                        className="text-xs"
                      >
                        📥 Pull My Data
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          console.log('[DEVICE RECOVERY] Manual device recovery triggered')
                          toast({
                            title: "Device Recovery",
                            description: "Checking for existing account data...",
                          })

                          try {
                            // Check if we have cloud data but no local data
                            const hasLocalData =
                              transactions.length > 0 ||
                              budgets.length > 0 ||
                              goals.length > 0 ||
                              debtAccounts.length > 0 ||
                              creditAccounts.length > 0 ||
                              debtCreditTransactions.length > 0 ||
                              categories.length > 0 ||
                              emergencyFund > 0 ||
                              userProfile !== null

                            console.log('[DEVICE RECOVERY] Local data check:', {
                              hasLocalData,
                              transactions: transactions.length,
                              budgets: budgets.length,
                              goals: goals.length,
                              debtAccounts: debtAccounts.length,
                              creditAccounts: creditAccounts.length,
                              categories: categories.length,
                              emergencyFund,
                              userProfile: !!userProfile,
                            })

                            if (!hasLocalData) {
                              // Force sync from Convex
                              const syncPassword = `convex_sync_${user!.id}_${user!.email}`
                              const result = await syncFromConvex(syncPassword)

                              if (result.success) {
                                toast({
                                  title: "Recovery Successful! 🎉",
                                  description: "Your existing account data has been restored.",
                                })
                              } else {
                                toast({
                                  title: "No Data Found",
                                  description: "No existing data found for this account.",
                                  variant: "default",
                                })
                              }
                            } else {
                              toast({
                                title: "Data Already Exists",
                                description: "This device already has data. Recovery not needed.",
                                variant: "default",
                              })
                            }
                          } catch (error) {
                            console.error('[DEVICE RECOVERY] Error:', error)
                            toast({
                              title: "Recovery Failed",
                              description: "Failed to recover account data.",
                              variant: "destructive",
                            })
                          }
                        }}
                        disabled={isSyncing || !isAuthenticated}
                        className="text-xs"
                      >
                        🔄 Recover Account
                      </Button>
                      {error && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.reload()}
                          className="text-xs"
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
