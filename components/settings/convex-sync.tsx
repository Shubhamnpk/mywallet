"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, User, Database, Upload, Download, Shield, Smartphone, Monitor, Trash2 } from "lucide-react"
import { useConvexAuth } from "@/hooks/use-convex-auth"
import { useConvexSync } from "@/hooks/use-convex-sync"
import { toast } from "@/hooks/use-toast"
import { ConvexAuthModal } from "@/components/auth/convex-auth-modal"
import { useState } from "react"

export function ConvexSync() {
  const { user, isAuthenticated, signUp, signIn, signOut, isLoading: authLoading } = useConvexAuth()
  const {
    isEnabled,
    isSyncing,
    lastSyncTime,
    error,
    enableSync,
    disableSync,
    syncToConvex,
    syncFromConvex,
    devices,
    getCurrentDevice,
    removeDevice,
  } = useConvexSync()

  const [showAuthDialog, setShowAuthDialog] = useState(false)

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
      const result = await enableSync()
      if (result.success) {
        toast({
          title: "Sync Enabled",
          description: "You can now manually push and pull data.",
        })
      }
    } else {
      await disableSync()
    }
  }

  const handlePushData = async () => {
    const result = await syncToConvex()
    if (result.success) {
      toast({
        title: "Data Pushed",
        description: "Your local data has been uploaded to the cloud.",
      })
    }
  }

  const handlePullData = async () => {
    const result = await syncFromConvex()
    if (result.success) {
      toast({
        title: "Data Pulled",
        description: "Remote data has been downloaded to this device.",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Convex Sync
        </CardTitle>
        <CardDescription>
          Manually sync your encrypted wallet data across devices using Convex
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
                {isAuthenticated ? user?.email : "Sign in to enable manual sync"}
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

        {/* Manual Sync Controls */}
        {isAuthenticated && (
          <div className="space-y-4">
            {/* Sync Status Summary */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Manual Sync {isEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {isEnabled
                      ? 'You can manually push and pull your encrypted data'
                      : 'Enable sync to access manual push/pull operations'
                    }
                  </p>
                  {lastSyncTime && isEnabled && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Last sync: {new Date(lastSyncTime).toLocaleString()}
                    </p>
                  )}
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={handleToggleSync}
                  disabled={authLoading || isSyncing}
                />
              </div>
            </div>

            {isEnabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    onClick={handlePushData}
                    disabled={isSyncing}
                    className="flex items-center gap-2 h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                  >
                    <Upload className="w-4 h-4" />
                    {isSyncing ? "Pushing..." : "Push Data"}
                  </Button>
                  <Button
                    onClick={handlePullData}
                    disabled={isSyncing}
                    variant="outline"
                    className="flex items-center gap-2 h-12 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-950/20"
                  >
                    <Download className="w-4 h-4" />
                    {isSyncing ? "Pulling..." : "Pull Data"}
                  </Button>
                </div>

                {lastSyncTime && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded text-center">
                    Last sync: {new Date(lastSyncTime).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
                Error: {error}
              </div>
            )}

            {/* Connected Devices */}
            {devices.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-medium">Device Security</h4>
                  <Badge variant="secondary" className="text-xs">
                    {devices.length} device{devices.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {devices.map((device) => {
                    const currentDevice = getCurrentDevice()
                    const isCurrentDevice = device.deviceId === currentDevice.deviceId
                    const isMobile = device.deviceName.toLowerCase().includes('iphone') ||
                                   device.deviceName.toLowerCase().includes('android') ||
                                   device.deviceName.toLowerCase().includes('ios')
                    const isDesktop = device.deviceName.toLowerCase().includes('windows') ||
                                    device.deviceName.toLowerCase().includes('mac') ||
                                    device.deviceName.toLowerCase().includes('linux')

                    return (
                      <div
                        key={device.deviceId}
                        className={`p-4 rounded-lg border transition-colors ${
                          isCurrentDevice
                            ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                            : 'bg-muted/30 border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              isCurrentDevice
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            }`}>
                              {isMobile ? (
                                <Smartphone className="w-4 h-4" />
                              ) : isDesktop ? (
                                <Monitor className="w-4 h-4" />
                              ) : (
                                <Database className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{device.deviceName}</p>
                                {isCurrentDevice && (
                                  <Badge variant="default" className="text-xs bg-green-600">
                                    Current Device
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  Last active: {new Date(device.lastActive).toLocaleString()}
                                </p>
                                {device.ipAddress && (
                                  <p className="text-xs text-muted-foreground">
                                    IP: {device.ipAddress}
                                  </p>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Registered: {new Date(device.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {!isCurrentDevice && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeDevice(device.deviceId)}
                              className="text-xs hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                        Security Tip
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Remove devices you no longer use or recognize to keep your account secure.
                        Each device has access to your encrypted wallet data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Convex Auth Modal */}
        <ConvexAuthModal
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          signUp={signUp}
          signIn={signIn}
          isLoading={authLoading}
          title="Sign in to Convex Sync"
          description="Sign in to your Convex account to enable manual synchronization of your wallet data."
          initialMode="signin"
        />
      </CardContent>
    </Card>
  )
}
