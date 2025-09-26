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
        // Keep silent in production
      })

    return () => {
      mounted = false
    }
  }, [])

  if (!Comp) return null
  const C = Comp
  return <C />
}
