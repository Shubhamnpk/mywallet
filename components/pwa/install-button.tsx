'use client'

import { useEffect, useState } from 'react'

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Prefer a globally captured deferred prompt (set in RegisterSW)
    const globalPrompt = (window as any).__deferredPrompt
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt)
      setVisible(true)
      return
    }

    function handler(e: any) {
      e.preventDefault()
      try { (window as any).__deferredPrompt = e } catch {}
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
        // prefer global deferred prompt
        const prompt = deferredPrompt || (window as any).__deferredPrompt
        if (!prompt) {
          // nothing to do
          return
        }
        try {
          prompt.prompt()
          const choice = await prompt.userChoice
          setVisible(false)
          setDeferredPrompt(null)
          try { delete (window as any).__deferredPrompt } catch {}
        } catch (e) {
          // ignore
        }
      }}
      className="fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow-lg"
    >
      Install App
    </button>
  )
}
