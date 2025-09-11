"use client"

import { ReactNode } from "react"
import { ConvexProvider } from "convex/react"
import convex from "@/lib/convex-client"

interface ConvexProviderWrapperProps {
  children: ReactNode
}

export function ConvexProviderWrapper({ children }: ConvexProviderWrapperProps) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  )
}
