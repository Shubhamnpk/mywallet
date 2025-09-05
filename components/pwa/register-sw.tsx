'use client'

import { useEffect } from 'react'

export default function RegisterSW() {
  useEffect(() => {
    // capture beforeinstallprompt so other UI can trigger the install prompt
    function onBeforeInstall(e: any) {
      e.preventDefault()
      try { (window as any).__deferredPrompt = e } catch {}
      console.log('beforeinstallprompt captured')
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    if ('serviceWorker' in navigator) {
      // next-pwa will generate /sw.js in production
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('Service worker registered:', reg)
      }).catch((err) => console.warn('SW registration failed:', err))
    }
  return () => { window.removeEventListener('beforeinstallprompt', onBeforeInstall) }
  }, [])
  return null
}
