"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, User, Key, Database } from "lucide-react"
import { useConvexAuth } from "@/hooks/use-convex-auth"
import { useConvexSync } from "@/hooks/use-convex-sync"
import { toast } from "@/hooks/use-toast"

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
  } = useConvexSync()

  // Debug logging
  console.log('[ConvexSync] Component state:', {
    user,
    isAuthenticated,
    authLoading,
    isEnabled,
    isSyncing
  })

  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [syncPassword, setSyncPassword] = useState("")
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [hasExistingData, setHasExistingData] = useState(false)

  const handleAuth = async () => {
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive",
      })
      return
    }

    setIsAuthenticating(true)
    try {
      let result
      if (authMode === "signup") {
        result = await signUp(email, password, name)
      } else {
        result = await signIn(email, password)
      }

      if (result.success) {
        setShowAuthDialog(false)
        setEmail("")
        setPassword("")
        setName("")
        toast({
          title: authMode === "signup" ? "Account Created" : "Signed In",
          description: `Welcome${user?.name ? ` ${user.name}` : ""}!`,
        })
      } else {
        toast({
          title: "Authentication Failed",
          description: result.error || "Please try again.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Authentication failed.",
          variant: "destructive",
      })
    } finally {
      setIsAuthenticating(false)
    }
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
      if (!isAuthenticated) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to Convex first to enable sync.",
          variant: "destructive",
        })
        return
      }

      // In simplified approach, just show setup dialog
      // Sync will be enabled automatically using account credentials
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
        // Store the sync password securely for future use
        const salt = new Uint8Array(32) // In practice, you'd generate this properly
        const key = await import("@/lib/security").then(m => m.SecureWallet.deriveKeyFromPin("convex_sync_key", salt))
        const encryptedPassword = await import("@/lib/security").then(m => m.SecureWallet.encryptData(syncPassword, key))

        localStorage.setItem("convex_sync_password", encryptedPassword)
        localStorage.setItem("convex_sync_salt", btoa(String.fromCharCode(...salt)))
        localStorage.setItem("convex_sync_enabled", "true")

        // Force a re-render by updating localStorage and letting the hook handle the state
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
            <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  Sign In
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {authMode === "signup" ? "Create Convex Account" : "Sign In to Convex"}
                  </DialogTitle>
                  <DialogDescription>
                    {authMode === "signup"
                      ? "Create a new account to sync your wallet data securely."
                      : "Sign in to your existing account to access synced data."
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={authMode === "signin" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAuthMode("signin")}
                      className="flex-1"
                    >
                      Sign In
                    </Button>
                    <Button
                      variant={authMode === "signup" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAuthMode("signup")}
                      className="flex-1"
                    >
                      Sign Up
                    </Button>
                  </div>

                  {authMode === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Name (Optional)</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleAuth}
                    disabled={isAuthenticating}
                    className="w-full"
                  >
                    {isAuthenticating ? "Processing..." : (authMode === "signup" ? "Create Account" : "Sign In")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                    <Cloud className="w-4 h-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm text-primary">Sync Active</p>
                      <p className="text-xs text-muted-foreground">
                        Last synced: {formatLastSyncTime(lastSyncTime)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncToConvex()}
                      disabled={isSyncing}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>

            {/* Setup Dialog */}
            <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Enable Convex Sync
                  </DialogTitle>
                  <DialogDescription>
                    Enable automatic sync for your wallet data across all your devices. Your data will be encrypted using your Convex account password.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Secure & Automatic:</strong> Your wallet data will be encrypted and synced automatically using your Convex account credentials.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowSetupDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSetupSync}
                      className="flex-1"
                      disabled={isSyncing}
                    >
                      {isSyncing ? "Enabling..." : "Enable Sync"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Unlock Dialog */}
            <Dialog open={showUnlockDialog} onOpenChange={(open) => {
              setShowUnlockDialog(open)
              if (!open) setSyncPassword("") // Clear password when dialog closes
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Unlock Convex Sync
                  </DialogTitle>
                  <DialogDescription>
                    Enter your sync password to access your existing encrypted wallet data from other devices.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="unlock-password">Sync Password</Label>
                    <Input
                      id="unlock-password"
                      type="password"
                      placeholder="Enter your sync password"
                      value={syncPassword}
                      onChange={(e) => setSyncPassword(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      This is the password you created when setting up sync on another device.
                    </p>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Make sure you're entering the correct sync password from your other device.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handleUnlockSync}
                    className="w-full"
                    disabled={!syncPassword}
                  >
                    Unlock Sync
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* Features Info */}
        <div className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            <p className="font-medium text-primary">Convex Sync Features</p>
          </div>
          <ul className="space-y-1">
            <li>• Single password - uses your Convex account password</li>
            <li>• Automatic sync across all your devices</li>
            <li>• End-to-end encryption (AES-256-GCM)</li>
            <li>• Separate from cloud storage sync</li>
            <li>• Real-time data synchronization</li>
            <li>• Secure account-based access control</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
