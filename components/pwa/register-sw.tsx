'use client'

import { useEffect } from 'react'

const MIGRATION_KEY = 'pwa-migrated-to-serwist-v2'

export default function RegisterSW() {
  useEffect(() => {
    // 1. Safe Migration Path: Force-Unregister Old Workers Once
    async function migratePWA() {
      if (!('serviceWorker' in navigator)) return

      // If we haven't migrated yet, we clear everything once
      if (localStorage.getItem(MIGRATION_KEY) !== 'true') {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const registration of registrations) {
            await registration.unregister()
          }

          // Clear Workbox/Old Caches
          const cacheNames = await caches.keys()
          for (const name of cacheNames) {
            await caches.delete(name)
          }

          // Set migration flag BEFORE reload to prevent infinite loops
          localStorage.setItem(MIGRATION_KEY, 'true')

          // Reload to ensure the new script is fetched and the old one is truly gone
          window.location.reload()
          return true
        } catch (error) {
          console.error('PWA Migration failed:', error)
          // Mark as migrated anyway to avoid stuck state
          localStorage.setItem(MIGRATION_KEY, 'true')
        }
      }
      return false
    }

    async function handleRegistration() {
      // Run migration check
      const didMigrate = await migratePWA()
      if (didMigrate) return // Stop if we're reloading anyway

      if (process.env.NODE_ENV !== 'production') {
        // Prevent stale production precache from breaking local dev.
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
        }
        return
      }

      // 2. Normal Registration Logic for Serwist
      function onServiceWorkerMessage(event: MessageEvent) {
        const data = event.data
        if (data?.type === 'NOTIFICATION_CLICKED' && typeof data.url === 'string') {
          window.location.href = data.url
        }
      }

      // Register the new Serwist worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.error('Serwist registration failed:', err)
        })
        navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage)
      }
    }

    // Capture beforeinstallprompt so other UI can trigger the install prompt
    function onBeforeInstall(e: any) {
      e.preventDefault()
      try {
        ;(window as any).__deferredPrompt = e
      } catch {}
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    handleRegistration()

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      if ('serviceWorker' in navigator) {
        // Cleaning up message listeners
        // Note: we don't unregister workers on unmount
      }
    }
  }, [])

  return null
}
