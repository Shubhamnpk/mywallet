"use client"

import dynamic from "next/dynamic"
import { ReactNode } from "react"

// Dynamically import ThemeProvider to disable SSR and prevent hydration mismatches
const ThemeProvider = dynamic(() => import("@/components/theme-provider").then(mod => ({ default: mod.ThemeProvider })), {
  ssr: false,
  loading: () => null
})

interface ThemeProviderWrapperProps {
  children: ReactNode
}

export function ThemeProviderWrapper({ children }: ThemeProviderWrapperProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  )
}