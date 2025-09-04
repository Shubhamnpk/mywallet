"use client"

import { useState, useEffect } from 'react'

interface InstallPromptState {
  isInstallable: boolean
  isInstalled: boolean
  deferredPrompt: any
}

export function useInstallPrompt() {
  const [state, setState] = useState<InstallPromptState>({
    isInstallable: false,
    isInstalled: false,
    deferredPrompt: null
  })

  useEffect(() => {
    console.log('Install Prompt: Initializing...')

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('Install Prompt: App is already installed (standalone mode)')
      setState(prev => ({ ...prev, isInstalled: true }))
      return
    }

    // Check service worker status
    const checkServiceWorker = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            console.log('Install Prompt: Service worker registered:', registration.scope)
            if (navigator.serviceWorker.controller) {
              console.log('Install Prompt: Service worker is controlling the page')
            } else {
              console.log('Install Prompt: Service worker registered but not controlling page yet')
            }
          } else {
            console.log('Install Prompt: No service worker registration found')
          }
        })
      }
    }

    checkServiceWorker()

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('Install Prompt: beforeinstallprompt event fired!')
      e.preventDefault()
      setState(prev => ({
        ...prev,
        isInstallable: true,
        deferredPrompt: e
      }))
    }

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      console.log('Install Prompt: App was installed successfully!')
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        deferredPrompt: null
      }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check again after a delay to see if service worker is controlling
    setTimeout(checkServiceWorker, 2000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!state.deferredPrompt) return false

    try {
      state.deferredPrompt.prompt()
      const { outcome } = await state.deferredPrompt.userChoice

      setState(prev => ({
        ...prev,
        isInstallable: false,
        deferredPrompt: null
      }))

      return outcome === 'accepted'
    } catch (error) {
      console.error('Install prompt failed:', error)
      return false
    }
  }

  // Manual install check for browsers that don't support beforeinstallprompt
  const checkInstallability = async () => {
    console.log('Install Prompt: Manual installability check...')

    // Check if all PWA criteria are met
    const hasHTTPS = location.protocol === 'https:' || location.hostname === 'localhost'
    const hasManifest = !!document.querySelector('link[rel="manifest"]')
    const hasServiceWorker = !!(await navigator.serviceWorker?.getRegistration())
    const isNotInstalled = !window.matchMedia('(display-mode: standalone)').matches

    console.log('Install Prompt: Criteria check:', {
      hasHTTPS,
      hasManifest,
      hasServiceWorker,
      isNotInstalled
    })

    if (hasHTTPS && hasManifest && hasServiceWorker && isNotInstalled) {
      console.log('Install Prompt: All criteria met, app should be installable')
      // For browsers that don't support beforeinstallprompt, we can still show a manual install button
      setState(prev => ({ ...prev, isInstallable: true }))
    }
  }

  return {
    ...state,
    promptInstall,
    checkInstallability
  }
}