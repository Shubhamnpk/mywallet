"use client"

import { useEffect, useState } from 'react'
import { useOfflineMode } from '@/hooks/use-offline-mode'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  AlertCircle,
  CheckCircle2,
  Database,
  Clock
} from 'lucide-react'

export function OfflinePage() {
  const offlineMode = useOfflineMode()
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
    // Load last sync time from localStorage
    const syncTime = localStorage.getItem('wallet_last_sync')
    if (syncTime) {
      setLastSyncTime(new Date(syncTime))
    }
  }, [])

  const handleRetryConnection = () => {
    window.location.reload()
  }

  const handleManualSync = () => {
    offlineMode.syncPendingData()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
            <WifiOff className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">You're Offline</CardTitle>
          <p className="text-muted-foreground">
            No internet connection detected
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium">Offline Mode</span>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>

          {/* Data Status */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Database className="w-4 h-4" />
              Local Data Status
            </h3>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                {offlineMode.pendingSyncItems > 0 ? (
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
                <span>Pending: {offlineMode.pendingSyncItems}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>
                  {lastSyncTime
                    ? `Synced ${lastSyncTime.toLocaleDateString()}`
                    : 'Never synced'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Available Features */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Available Offline</h3>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>View transactions</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Add new transactions</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Manage budgets</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Track goals</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleRetryConnection}
              className="w-full"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Connection
            </Button>

            {offlineMode.pendingSyncItems > 0 && (
              <Button
                onClick={handleManualSync}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Cloud className="w-4 h-4 mr-2" />
                Sync Pending Data ({offlineMode.pendingSyncItems})
              </Button>
            )}
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground text-center">
            <p>Your data will automatically sync when you're back online.</p>
            <p className="mt-1">Last updated: {new Date().toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}