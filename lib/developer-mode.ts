"use client"

export const DEVELOPER_MODE_STORAGE_KEY = "wallet_developer_mode"
export const DEVELOPER_MODE_EVENT = "wallet-developer-mode-change"

const DEV_VALUES = new Set(["dev", "development", "1", "true"])

export function isDeveloperModeEnvEnabled() {
  const values = [
    process.env.NEXT_PUBLIC_APP_ENV,
    process.env.NEXT_PUBLIC_APP_MODE,
    process.env.NEXT_PUBLIC_DEV_MODE,
    process.env.NEXT_PUBLIC_APP_DEV_TOOLS,
  ]

  return values.some((value) => DEV_VALUES.has((value || "").toLowerCase()))
}

export function getStoredDeveloperMode() {
  if (typeof window === "undefined") return false
  return localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY) === "true"
}

export function getDeveloperModeOverride() {
  if (typeof window === "undefined") return null
  const value = localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY)
  if (value === "true") return true
  if (value === "false") return false
  return null
}

export function setStoredDeveloperMode(enabled: boolean) {
  if (typeof window === "undefined") return
  localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, String(enabled))
  window.dispatchEvent(new CustomEvent(DEVELOPER_MODE_EVENT, { detail: enabled }))
}

export function getDeveloperModeSnapshot() {
  const override = getDeveloperModeOverride()
  return override ?? isDeveloperModeEnvEnabled()
}
