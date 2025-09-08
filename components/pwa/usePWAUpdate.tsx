"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'

export function usePWAUpdate() {
  const [isSupported, setIsSupported] = useState<boolean>(false)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [autoUpdate, setAutoUpdateState] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('pwa_auto_update')
      // default to enabled unless explicitly set to '0'
      if (v === null) return true
      return v === '1'
    } catch (e) {
      return true
    }
  })
  const updateInitiatedRef = useRef<boolean>(false)
  const reloadingRef = useRef(false)
  const lastUpdateCheckRef = useRef<number>(0)

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator)

    if (!('serviceWorker' in navigator)) return

    let regReady = false

    const handleReg = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (!reg) return

        // if a waiting worker already exists
        if (reg.waiting) {
          setWaitingWorker(reg.waiting)
          setIsUpdateAvailable(true)
        }

        reg.addEventListener('updatefound', () => {
           const installing = reg.installing
           if (!installing) return
           installing.addEventListener('statechange', () => {
             if (installing.state === 'installed') {
               if (reg.waiting) {
                 setWaitingWorker(reg.waiting)
                 setIsUpdateAvailable(true)
                 // Only auto-apply update if autoUpdate is enabled
                 if (autoUpdate) {
                   toast.info('Update detected, auto updating...')
                   reg.waiting.postMessage({ type: 'SKIP_WAITING' })
                   updateInitiatedRef.current = true
                   try { localStorage.setItem('sw:update:requested', Date.now().toString()) } catch (e) {}
                 }
               }
             }
           })
         })

        regReady = true
      } catch (e) {
        // ignore
      }
    }

    handleReg()

    // helper: delete only known SW/app caches to avoid deleting user data
    const clearSWCaches = async () => {
      if (!('caches' in window)) return
      try {
        const keys = await caches.keys()
        const toDelete = keys.filter(name => /workbox|precache|next|static-resources|next-static|images|start-url|runtime/i.test(name))
        await Promise.all(toDelete.map(k => caches.delete(k)))
      } catch (e) {
        // ignore
      }
    }

    // reload when the new SW takes control; clear old caches first
    const onControllerChange = async () => {
      // Reload only for updates we initiated (manual or auto), not for first install.
      if (!updateInitiatedRef.current || reloadingRef.current) return
      reloadingRef.current = true
      try {
        await clearSWCaches()
      } catch (e) {
        // ignore
      }
      // mark that update was applied so UI can show success after reload (other tabs may read this)
      try { localStorage.setItem('sw:update:applied', Date.now().toString()) } catch (e) {}
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
  // on online, check for updates (with rate limiting)
    const onOnline = async () => {
      const now = Date.now()
      // Only check for updates if it's been more than 5 minutes since last check
      if (now - lastUpdateCheckRef.current < 5 * 60 * 1000) return
      lastUpdateCheckRef.current = now
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (!reg) return
        await reg.update()
      } catch (e) {
        // ignore
      }
    }

    window.addEventListener('online', onOnline)

    // listen for update requests from other tabs so we can reflect update state
    const onStorage = (ev: StorageEvent) => {
      if (!ev.key) return
      if (ev.key === 'sw:update:requested') {
        // another tab asked to update; re-check registration so we update UI
        (async () => {
          try {
            const reg = await navigator.serviceWorker.getRegistration()
            if (reg && reg.waiting) {
              setWaitingWorker(reg.waiting)
              setIsUpdateAvailable(true)
            }
          } catch (e) {}
        })()
      }
      if (ev.key === 'sw:update:applied') {
        // ensure UI state clears in case a different tab applied update
        setIsUpdateAvailable(false)
        setWaitingWorker(null)
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('storage', onStorage)
    }
  }, [autoUpdate])

  const applyUpdate = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg && reg.waiting) {
        try {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          updateInitiatedRef.current = true
          try { localStorage.setItem('sw:update:requested', Date.now().toString()) } catch (e) {}
        } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
  }, [])

  const checkForUpdate = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) return
      await reg.update()
      if (reg.waiting) {
        setWaitingWorker(reg.waiting)
        setIsUpdateAvailable(true)
      } else {
        setIsUpdateAvailable(false)
      }
    } catch (e) {
      // ignore
    }
  }, [])

  const setAutoUpdate = useCallback((v: boolean) => {
    try { localStorage.setItem('pwa_auto_update', v ? '1' : '0') } catch {}
    setAutoUpdateState(v)
  }, [])

  return {
    isSupported,
    isUpdateAvailable,
    waitingWorker,
    autoUpdate,
    setAutoUpdate,
    applyUpdate,
    checkForUpdate
  }
}

export default usePWAUpdate
