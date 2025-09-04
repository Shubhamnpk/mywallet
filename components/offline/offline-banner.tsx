"use client"

import { useState } from 'react'
import { useOfflineMode } from '@/hooks/use-offline-mode'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  WifiOff,
  Cloud,
  X,
  AlertCircle
} from 'lucide-react'

export function OfflineBanner() {
  const offlineMode = useOfflineMode()
  const [isVisible, setIsVisible] = useState(true)

  // Only show if offline and banner is visible
  if (offlineMode.isOnline || !isVisible) {
    return null
  }

  const handleSync = () => {
    offlineMode.syncPendingData()
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5" />
            <div>
              <p className="font-medium">You're offline</p>
              <p className="text-sm opacity-90">
                Changes will sync when you're back online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {offlineMode.pendingSyncItems > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {offlineMode.pendingSyncItems} pending
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSync}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Cloud className="w-3 h-3 mr-1" />
                  Sync
                </Button>
              </div>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsVisible(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}