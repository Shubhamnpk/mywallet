'use client'

import { useEffect, useState } from 'react'

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handler(e: any) {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={async () => {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        setVisible(false)
        setDeferredPrompt(null)
        console.log('PWA install choice', choice)
      }}
      className="fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow-lg"
    >
      Install App
    </button>
  )
}
