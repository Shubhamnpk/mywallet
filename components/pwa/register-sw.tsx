'use client'

import { useEffect } from 'react'

export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // Prevent stale production precache from breaking local dev.
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            void registration.unregister()
          })
        }).catch(() => {})
      }
      return
    }

    // capture beforeinstallprompt so other UI can trigger the install prompt
    function onBeforeInstall(e: any) {
      e.preventDefault()
      try { (window as any).__deferredPrompt = e } catch {}
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    function onServiceWorkerMessage(event: MessageEvent) {
      const data = event.data
      if (data?.type === 'NOTIFICATION_CLICKED' && typeof data.url === 'string') {
        window.location.href = data.url
      }
    }

    if ('serviceWorker' in navigator) {
      // next-pwa will generate /sw.js in production
      navigator.serviceWorker.register('/sw.js').catch(() => {})
      navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage)
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage)
      }
    }
  }, [])
  return null
}
