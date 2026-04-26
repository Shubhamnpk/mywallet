"use client"

import { Capacitor } from "@capacitor/core"

export type NativePlatform = "android" | "ios" | "web"

export function getNativePlatform(): NativePlatform {
  if (typeof window === "undefined") {
    return "web"
  }

  const platform = Capacitor.getPlatform()
  if (platform === "ios" || platform === "android") {
    return platform
  }

  return "web"
}

export function isNativeMobilePlatform(): boolean {
  return Capacitor.isNativePlatform() && getNativePlatform() !== "web"
}
