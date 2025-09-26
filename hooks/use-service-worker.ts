"use client"

import { useEffect, useState } from 'react'

interface ServiceWorkerState {
  isSupported: boolean
  isRegistered: boolean
  isInstalling: boolean
  isWaiting: boolean
  updateAvailable: boolean
  registration: ServiceWorkerRegistration | null
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    updateAvailable: false,
    registration: null
  })

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    setState(prev => ({ ...prev, isSupported: true }))

    const registerServiceWorker = async () => {
      try {
        setState(prev => ({ ...prev, isInstalling: true }))

        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        setState(prev => ({
          ...prev,
          isRegistered: true,
          isInstalling: false,
          registration
        }))

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState(prev => ({
                  ...prev,
                  isWaiting: true,
                  updateAvailable: true
                }))
              }
            })
          }
        })

        // Handle messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SYNC_COMPLETE') {
            // You can trigger a refresh or show a notification here
          }
        })

      } catch (error) {
        setState(prev => ({
          ...prev,
          isInstalling: false,
          isRegistered: false
        }))
      }
    }

    registerServiceWorker()

    // Handle controller change (when new SW takes control)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })

  }, [])

  const updateServiceWorker = () => {
    if (state.registration && state.registration.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  const unregisterServiceWorker = async () => {
    if (state.registration) {
      await state.registration.unregister()
      setState(prev => ({
        ...prev,
        isRegistered: false,
        registration: null
      }))
    }
  }

  return {
    ...state,
    updateServiceWorker,
    unregisterServiceWorker
  }
}