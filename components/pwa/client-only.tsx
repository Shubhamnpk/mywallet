"use client"

import React, { useEffect, useState } from 'react'

export default function PWAClientLoader() {
  const [Comp, setComp] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    let mounted = true
    // Dynamically import the PWA client only in the browser
    import('./pwa-client')
      .then((m) => {
        if (mounted) setComp(() => m.default)
      })
      .catch((err) => {
        // Keep silent in production, but log in dev
        if (process.env.NODE_ENV === 'development') console.error('Failed to load PWA client', err)
      })

    return () => {
      mounted = false
    }
  }, [])

  if (!Comp) return null
  const C = Comp
  return <C />
}
