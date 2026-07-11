"use client"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

const cycle = ["light", "dark", "system"] as const

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  const toggleTheme = () => {
    const idx = cycle.indexOf(theme as (typeof cycle)[number])
    setTheme(cycle[(idx + 1) % cycle.length])
  }

  const isDark = theme === "dark"
  const isSystem = theme === "system"

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="relative bg-transparent"
    >
      <Sun
        className={`h-[1.2rem] w-[1.2rem] transition-all duration-300 ${
          isDark || isSystem ? "rotate-90 scale-0" : "rotate-0 scale-100"
        }`}
      />
      <Moon
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 ${
          isDark ? "rotate-0 scale-100" : "rotate-90 scale-0"
        }`}
      />
      <Monitor
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 ${
          isSystem ? "rotate-0 scale-100" : "rotate-90 scale-0"
        }`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
