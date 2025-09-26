"use client"

import { useEffect } from 'react'
import { useServiceWorker } from '@/hooks/use-service-worker'

export function ServiceWorkerRegister() {
  const serviceWorker = useServiceWorker()

  useEffect(() => {
    if (serviceWorker.updateAvailable) {
      // Show update notification
    }
  }, [serviceWorker.updateAvailable])

  return null // This component doesn't render anything
}