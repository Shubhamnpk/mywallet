"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DEVELOPER_MODE_EVENT,
  DEVELOPER_MODE_STORAGE_KEY,
  getDeveloperModeSnapshot,
  isDeveloperModeEnvEnabled,
  setStoredDeveloperMode,
} from "@/lib/developer-mode"

type UseDeveloperModeOptions = {
  shortcut?: boolean
  onShortcut?: (enabled: boolean) => void
}

export function useDeveloperMode(options: UseDeveloperModeOptions = {}) {
  const [isDeveloperMode, setIsDeveloperMode] = useState(false)
  const isEnvDeveloperMode = isDeveloperModeEnvEnabled()

  const refresh = useCallback(() => {
    setIsDeveloperMode(getDeveloperModeSnapshot())
  }, [])

  const setDeveloperMode = useCallback((enabled: boolean) => {
    setStoredDeveloperMode(enabled)
    setIsDeveloperMode(enabled)
  }, [])

  const toggleDeveloperMode = useCallback(() => {
    const nextValue = !getDeveloperModeSnapshot()
    setStoredDeveloperMode(nextValue)
    setIsDeveloperMode(nextValue)
    return nextValue
  }, [])

  useEffect(() => {
    refresh()

    const onStorage = (event: StorageEvent) => {
      if (event.key === DEVELOPER_MODE_STORAGE_KEY) refresh()
    }
    const onDeveloperModeChange = () => refresh()

    window.addEventListener("storage", onStorage)
    window.addEventListener(DEVELOPER_MODE_EVENT, onDeveloperModeChange)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener(DEVELOPER_MODE_EVENT, onDeveloperModeChange)
    }
  }, [refresh])

  useEffect(() => {
    if (!options.shortcut) return

    const onKeyDown = (event: KeyboardEvent) => {
      const isToggle = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "d"
      if (!isToggle) return

      event.preventDefault()
      const enabled = toggleDeveloperMode()
      options.onShortcut?.(enabled)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [options, toggleDeveloperMode])

  return {
    isDeveloperMode,
    isEnvDeveloperMode,
    setDeveloperMode,
    toggleDeveloperMode,
  }
}
