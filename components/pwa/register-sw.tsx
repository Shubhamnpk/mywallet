'use client'

import { useEffect } from 'react'
import { recordNotificationDelivery } from '@/lib/notification-history'

export default function RegisterSW() {
  useEffect(() => {
    localStorage.removeItem('pwa-migrated-to-serwist-v2')

    if (process.env.NODE_ENV !== 'production') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister()
          }
        })
      }
      return
    }

    function onServiceWorkerMessage(event: MessageEvent) {
      const data = event.data
      if (data?.type === 'NOTIFICATION_CLICKED' && typeof data.url === 'string') {
        window.location.href = data.url
        return
      }
      if (data?.type === 'PUSH_NOTIFICATION_SHOWN') {
        const tag = typeof data.tag === 'string' ? data.tag : 'mywallet-push'
        recordNotificationDelivery({
          dedupeKey: `push:${tag}:${data.title || ''}`,
          title: typeof data.title === 'string' ? data.title : 'MyWallet',
          body: typeof data.body === 'string' ? data.body : '',
          source: 'push',
          channel: 'push',
        })
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Serwist registration failed:', err)
      })
      navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage)
    }

    function onBeforeInstall(e: any) {
      e.preventDefault()
      try {
        ;(window as any).__deferredPrompt = e
      } catch {}
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    }
  }, [])

  return null
}
