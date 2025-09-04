"use client"

import { useState } from 'react'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { useServiceWorker } from '@/hooks/use-service-worker'
import { useOfflineMode } from '@/hooks/use-offline-mode'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bug,
  Download,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

export function PWADebugModal() {
  const installPrompt = useInstallPrompt()
  const serviceWorker = useServiceWorker()
  const offlineMode = useOfflineMode()
  const [isOpen, setIsOpen] = useState(false)

  const StatusBadge = ({ condition }: { condition: boolean }) => (
    <Badge variant={condition ? "default" : "secondary"} className="text-xs">
      {condition ? "✓" : "✗"}
    </Badge>
  )

  const FeatureCheck = ({ condition, label }: { condition: boolean; label: string }) => (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      {condition ? (
        <CheckCircle2 className="w-3 h-3 text-green-600" />
      ) : (
        <AlertCircle className="w-3 h-3 text-red-600" />
      )}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="fixed bottom-4 left-4 z-50">
          <Bug className="w-4 h-4 mr-1" />
          Debug
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Bug className="w-4 h-4" />
            PWA Debug
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {/* Install Status */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Install Status</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Installable</span>
                <StatusBadge condition={installPrompt.isInstallable} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Installed</span>
                <StatusBadge condition={installPrompt.isInstalled} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Prompt Ready</span>
                <StatusBadge condition={!!installPrompt.deferredPrompt} />
              </div>
            </div>
            
            <div className="flex gap-2">
              {installPrompt.isInstallable && installPrompt.deferredPrompt && (
                <Button onClick={installPrompt.promptInstall} size="sm" className="flex-1 text-xs">
                  <Download className="w-3 h-3 mr-1" />
                  Install
                </Button>
              )}
              <Button
                onClick={installPrompt.checkInstallability}
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
              >
                Check
              </Button>
            </div>
          </div>

          {/* Service Worker Status */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Service Worker</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Supported</span>
                <StatusBadge condition={serviceWorker.isSupported} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registered</span>
                <StatusBadge condition={serviceWorker.isRegistered} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Installing</span>
                <StatusBadge condition={serviceWorker.isInstalling} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Update Available</span>
                <StatusBadge condition={serviceWorker.updateAvailable} />
              </div>
            </div>
            {serviceWorker.updateAvailable && (
              <Button onClick={serviceWorker.updateServiceWorker} variant="outline" size="sm" className="w-full text-xs">
                <Cloud className="w-3 h-3 mr-1" />
                Update SW
              </Button>
            )}
          </div>

          {/* Offline Status */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Offline Status</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Online</span>
                <StatusBadge condition={offlineMode.isOnline} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Pending</span>
                <Badge variant={offlineMode.pendingSyncItems > 0 ? "default" : "secondary"} className="text-xs px-1">
                  {offlineMode.pendingSyncItems}
                </Badge>
              </div>
            </div>
            {offlineMode.pendingSyncItems > 0 && (
              <Button onClick={offlineMode.syncPendingData} variant="outline" size="sm" className="w-full text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                Sync
              </Button>
            )}
          </div>

          {/* PWA Feature Checks */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">PWA Features</h3>
            <div className="grid grid-cols-2 gap-1">
              <FeatureCheck condition={'serviceWorker' in navigator} label="SW API" />
              <FeatureCheck condition={'caches' in window} label="Cache API" />
              <FeatureCheck condition={'BackgroundSyncManager' in window} label="Bg Sync" />
              <FeatureCheck condition={window.matchMedia('(display-mode: standalone)').matches} label="PWA Mode" />
              <FeatureCheck condition={location.protocol === 'https:'} label="HTTPS" />
              <FeatureCheck condition={'onbeforeinstallprompt' in window} label="Install API" />
            </div>
          </div>

          {/* PWA Criteria */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">PWA Criteria</h3>
            <div className="grid grid-cols-2 gap-1">
              <FeatureCheck 
                condition={location.protocol === 'https:' || location.hostname === 'localhost'} 
                label="Secure Origin" 
              />
              <FeatureCheck 
                condition={!!document.querySelector('link[rel="manifest"]')} 
                label="Manifest" 
              />
              <FeatureCheck 
                condition={!!(navigator.serviceWorker && navigator.serviceWorker.controller)} 
                label="SW Active" 
              />
              <FeatureCheck 
                condition={!window.matchMedia('(display-mode: standalone)').matches} 
                label="Not Installed" 
              />
            </div>
          </div>

          {/* Quick Tips */}
          <div className="p-2 bg-muted rounded text-xs">
            <p className="font-medium mb-1">💡 Tips:</p>
            <div className="text-muted-foreground space-y-0.5">
              <div>• Check console for debug messages</div>
              <div>• Refresh after SW registers</div>
              <div>• Clear data if prompt dismissed</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}