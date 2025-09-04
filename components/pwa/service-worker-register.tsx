"use client"

import { useEffect } from 'react'
import { useServiceWorker } from '@/hooks/use-service-worker'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function ServiceWorkerRegister() {
  const serviceWorker = useServiceWorker()
  const installPrompt = useInstallPrompt()

  useEffect(() => {
    if (serviceWorker.updateAvailable) {
      // Show update notification
      console.log('App update available!')
    }
  }, [serviceWorker.updateAvailable])

  const handleInstall = async () => {
    const accepted = await installPrompt.promptInstall()
    if (accepted) {
      console.log('App installed successfully!')
    }
  }

  // Show install button if installable and not installed
  if (installPrompt.isInstallable && !installPrompt.isInstalled) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={handleInstall}
          className="shadow-lg"
          size="sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Install App
        </Button>
      </div>
    )
  }

  return null
}