'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RefreshCw, X } from 'lucide-react'
import { usePWAUpdate } from './usePWAUpdate'

export default function UpdateNotification() {
  const { autoUpdate } = usePWAUpdate()
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const updateInitiatedRef = useRef(false)
  const reloadingRef = useRef(false)

  const clearCachesAndReload = useCallback(async () => {
    if (reloadingRef.current) return
    reloadingRef.current = true
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
    } catch {
      // ignore errors deleting caches
    }
    window.location.reload()
  }, [])

  const applyUpdate = useCallback(async () => {
    try {
      // If a waiting worker exists, ask it to skipWaiting and mark that we initiated the update.
      if (registration && registration.waiting) {
        try {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          updateInitiatedRef.current = true
        } catch {
          // Error posting message, falling back to reload
          try { sessionStorage.setItem('sw_update_success', '1') } catch {}
          await clearCachesAndReload()
        }
        return
      }

      // No waiting worker: clear caches and reload now to fetch latest assets from network
      try { sessionStorage.setItem('sw_update_success', '1') } catch {}
      await clearCachesAndReload()
    } catch (e) {
      // Error in applyUpdate - ignore and continue
    }
  }, [clearCachesAndReload, registration])

  const startCountdown = useCallback(() => {
    // Immediately apply update without countdown
    void applyUpdate()
  }, [applyUpdate])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let mounted = true
    const listeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = []

    const check = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (!mounted) return
        if (reg) {
          setRegistration(reg)
          if (reg.waiting && !autoUpdate) {
            setIsAvailable(true)
            startCountdown()
          }

          // replace inline listeners with named handlers and track them
          const updateFoundHandler = () => {
            const newWorker = reg.installing
            if (!newWorker) return

            const stateChangeHandler = () => {
              if (newWorker.state === 'installed' && reg.waiting) {
                if (!mounted) return
                if (!autoUpdate) {
                  setIsAvailable(true)
                  startCountdown()
                }
              }
            }

            newWorker.addEventListener('statechange', stateChangeHandler)
            listeners.push({ target: newWorker, type: 'statechange', handler: stateChangeHandler })
          }

          reg.addEventListener('updatefound', updateFoundHandler)
          listeners.push({ target: reg, type: 'updatefound', handler: updateFoundHandler })
        }
      } catch (e) {
        // ignore
      }
    }

    check()

    const onMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'UPDATE_READY' && !autoUpdate) {
        setIsAvailable(true)
        startCountdown()
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)

    // when a new worker takes control, clear caches if we initiated the update and reload
    const onControllerChange = async () => {
      if (reloadingRef.current) return

      // Snapshot whether we initiated the update to avoid race conditions
      const updateInitiated = updateInitiatedRef.current

      // If we initiated the update, attempt conservative cache cleanup. Don't block reload on cleanup failures.
      if (updateInitiated && 'caches' in window) {
        try {
          const keys = await caches.keys()
          await Promise.all(keys.map(k => caches.delete(k)))
        } catch (err) {
          // ignore cleanup errors - we still want to reload
        }
      }

      try {
        sessionStorage.setItem('sw_update_success', '1')
      } catch (e) {}

      // Mark reloading just before navigating away to prevent duplicate reloads
      reloadingRef.current = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      mounted = false

      // clean up any registered service-worker listeners
      listeners.forEach(({ target, type, handler }) => {
        target.removeEventListener(type, handler)
      })

      navigator.serviceWorker.removeEventListener('message', onMessage)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [autoUpdate, startCountdown])

  const handleCancel = () => {
    setIsAvailable(false)
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
            A new version is ready.  you can update now.
          </DialogDescription>
        </DialogHeader>
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
