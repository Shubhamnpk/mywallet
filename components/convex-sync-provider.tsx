"use client"

import { ReactNode, useEffect } from "react"
import { useConvexSync } from "@/hooks/use-convex-sync"

interface ConvexSyncProviderProps {
  children: ReactNode
}

export function ConvexSyncProvider({ children }: ConvexSyncProviderProps) {
  // Initialize sync globally - this ensures sync works throughout the entire app
  const { isEnabled, isAuthenticated } = useConvexSync()

  // Log sync status for debugging
  useEffect(() => {
    if (isEnabled && isAuthenticated) {
    } else if (isEnabled && !isAuthenticated) {
    } else {
    }
  }, [isEnabled, isAuthenticated])

  return <>{children}</>
}
