"use client"

import { useEffect, useState, useCallback, useRef } from 'react'

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

    // reload when the new SW takes control; if we initiated the update, clear caches first
    const onControllerChange = async () => {
      if (reloadingRef.current) return
      reloadingRef.current = true
      try {
        if (updateInitiatedRef.current && 'caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map(k => caches.delete(k)))
        }
      } catch (e) {
        // ignore cleanup errors
      }
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    // on online, check for updates and auto-apply if enabled
    const onOnline = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (!reg) return
        await reg.update()
        if (reg.waiting) {
          setWaitingWorker(reg.waiting)
          setIsUpdateAvailable(true)
          if (autoUpdate) {
            // request skip waiting and mark that we initiated an update
            try {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' })
              updateInitiatedRef.current = true
            } catch (e) {}
          }
        }
      } catch (e) {
        // ignore
      }
    }

    window.addEventListener('online', onOnline)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      window.removeEventListener('online', onOnline)
    }
  }, [autoUpdate])

  const applyUpdate = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg && reg.waiting) {
        try {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          updateInitiatedRef.current = true
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
