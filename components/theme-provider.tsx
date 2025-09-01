"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"
import { useColorTheme } from "@/hooks/use-color-theme"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Apply color themes on every page load
  useColorTheme()

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
