'use client'

import { useEffect, useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RefreshCw, X } from 'lucide-react'

export default function UpdateNotification() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const [countdown, setCountdown] = useState(8)
  const updateInitiatedRef = useRef(false)
  const reloadingRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let mounted = true

    const check = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (!mounted) return
        if (reg) {
          setRegistration(reg)
          if (reg.waiting) {
            setIsAvailable(true)
            startCountdown()
          }
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (!newWorker) return
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && reg.waiting) {
                setIsAvailable(true)
                startCountdown()
              }
            })
          })
        }
      } catch (e) {
        // ignore
      }
    }

    check()

    const onMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'UPDATE_READY') {
        setIsAvailable(true)
        startCountdown()
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)

    // when a new worker takes control, clear caches if we initiated the update and reload
    const onControllerChange = async () => {
      if (reloadingRef.current) return
      reloadingRef.current = true
      try {
        if (updateInitiatedRef.current && 'caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map(k => caches.delete(k)))
        }
      } catch (err) {
        // ignore cleanup errors
      }
      try {
        sessionStorage.setItem('sw_update_success', '1')
      } catch (e) {}
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      mounted = false
      if (timerRef.current) clearInterval(timerRef.current)
      navigator.serviceWorker.removeEventListener('message', onMessage)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const startCountdown = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setCountdown(8)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        // Apply update on the final tick (last second) before reaching zero
        if (prev <= 1) {
          console.log('Countdown reached final tick, applying update')
          if (timerRef.current) clearInterval(timerRef.current)
          setIsAvailable(false) // Close the dialog
          applyUpdate()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }
  const applyUpdate = async () => {
    console.log('applyUpdate called')
    try {
      // If a waiting worker exists, ask it to skipWaiting and mark that we initiated the update.
      if (registration && registration.waiting) {
        console.log('Found waiting worker, posting SKIP_WAITING')
        try {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          updateInitiatedRef.current = true
        } catch (e) {
          console.log('Error posting message, falling back to reload')
          // fallback: clear caches and reload immediately if posting fails
          try { sessionStorage.setItem('sw_update_success', '1') } catch (e) {}
          await clearCachesAndReload()
        }
        return
      }

      console.log('No waiting worker, clearing caches and reloading')
      // No waiting worker: clear caches and reload now to fetch latest assets from network
  try { sessionStorage.setItem('sw_update_success', '1') } catch (e) {}
  await clearCachesAndReload()
    } catch (e) {
      console.log('Error in applyUpdate:', e)
      // ignore
    }
  }

  async function clearCachesAndReload() {
    if (reloadingRef.current) return
    reloadingRef.current = true
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
    } catch (err) {
      // ignore errors deleting caches
    }
    window.location.reload()
  }

  const handleCancel = () => {
    setIsAvailable(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  return (
    <Dialog open={isAvailable} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Update Available
          </DialogTitle>
          <DialogDescription>
            A new version is ready. We'll update automatically, or you can update now.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center py-4">
          <div className="text-center">
            <div className="text-lg font-medium text-muted-foreground">{countdown}</div>
            <p className="text-sm text-muted-foreground">Updating soon...</p>
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={applyUpdate}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Update Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
