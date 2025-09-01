"use client"

import { useOfflineMode } from "@/hooks/use-offline-mode"
import { useServiceWorker } from "@/hooks/use-service-worker"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  AlertCircle,
  CheckCircle2
} from "lucide-react"

interface OfflineModalProps {
  isOpen: boolean
  onClose: () => void
  offlineMode: ReturnType<typeof useOfflineMode>
  serviceWorker: ReturnType<typeof useServiceWorker>
}

export function OfflineModal({ isOpen, onClose, offlineMode, serviceWorker }: OfflineModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {offlineMode.isOnline ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-orange-600" />
            )}
            {offlineMode.isOnline ? 'Back Online' : 'Offline Mode'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              offlineMode.isOnline
                ? 'bg-green-100 text-green-600'
                : 'bg-orange-100 text-orange-600'
            }`}>
              {offlineMode.isOnline ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {offlineMode.isOnline ? 'Back Online' : 'Offline Mode'}
                </span>
                {offlineMode.pendingSyncItems > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {offlineMode.pendingSyncItems} pending
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {offlineMode.isOnline
                  ? 'Your data is being synced'
                  : 'Changes will sync when online'
                }
              </p>
            </div>

            <div className="flex gap-1">
              {offlineMode.isOnline && offlineMode.pendingSyncItems > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={offlineMode.syncPendingData}
                  className="h-8 w-8 p-0"
                  title="Sync pending data"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              )}

              {serviceWorker.updateAvailable && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={serviceWorker.updateServiceWorker}
                  className="h-8 w-8 p-0"
                  title="Update app"
                >
                  <Cloud className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Additional details when offline */}
          {!offlineMode.isOnline && (
            <div className="pt-3 border-t">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">PWA Status</p>
                  <p className="font-medium flex items-center gap-1">
                    {serviceWorker.isRegistered ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        Ready
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-orange-600" />
                        Installing
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Sync</p>
                  <p className="font-medium">
                    {offlineMode.lastSyncTime
                      ? offlineMode.lastSyncTime.toLocaleTimeString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}