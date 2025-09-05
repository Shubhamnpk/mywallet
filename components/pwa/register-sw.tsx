'use client'

import { useEffect } from 'react'

export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // next-pwa will generate /sw.js in production
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('Service worker registered:', reg)
      }).catch((err) => console.warn('SW registration failed:', err))
    }
  }, [])
  return null
}
