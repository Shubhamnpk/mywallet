"use client"

import { useState } from "react"
import { useOfflineMode } from "@/hooks/use-offline-mode"
import { useServiceWorker } from "@/hooks/use-service-worker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Wifi,
  WifiOff,
} from "lucide-react"
import { OfflineModal } from "./offline-modal"

export function OfflineBadge() {
  const offlineMode = useOfflineMode()
  const serviceWorker = useServiceWorker()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Only show if offline or has pending items or update available
  if (offlineMode.isOnline && offlineMode.pendingSyncItems === 0 && !serviceWorker.updateAvailable) {
    return null
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={() => setIsModalOpen(true)}
        title={offlineMode.isOnline ? "Online - Click for details" : "Offline - Click for details"}
      >
        <div className="flex items-center gap-1">
          {offlineMode.isOnline ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-orange-600" />
          )}
          <span className="text-xs">
            {offlineMode.isOnline ? "Online" : "Offline"}
          </span>
          {offlineMode.pendingSyncItems > 0 && (
            <Badge variant="secondary" className="text-xs ml-1">
              {offlineMode.pendingSyncItems}
            </Badge>
          )}
        </div>
      </Button>

      <OfflineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        offlineMode={offlineMode}
        serviceWorker={serviceWorker}
      />
    </>
  )
}