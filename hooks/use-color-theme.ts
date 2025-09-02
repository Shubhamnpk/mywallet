"use client"

import { useState, useEffect } from "react"

const colorThemes = [
  {
    id: "emerald",
    name: "Emerald",
    primary: "hsl(142, 76%, 36%)",
    description: "Fresh and natural",
    gradient: "from-emerald-600 via-emerald-500 to-green-400",
    solid: "bg-emerald-600"
  },
  {
    id: "blue",
    name: "Ocean Blue",
    primary: "hsl(221, 83%, 53%)",
    description: "Professional and trustworthy",
    gradient: "from-blue-600 via-blue-500 to-indigo-400",
    solid: "bg-blue-600"
  },
  {
    id: "purple",
    name: "Royal Purple",
    primary: "hsl(262, 83%, 58%)",
    description: "Creative and modern",
    gradient: "from-purple-600 via-purple-500 to-pink-400",
    solid: "bg-purple-600"
  },
  {
    id: "orange",
    name: "Sunset Orange",
    primary: "hsl(25, 95%, 53%)",
    description: "Energetic and warm",
    gradient: "from-orange-600 via-orange-500 to-red-400",
    solid: "bg-orange-600"
  },
  {
    id: "rose",
    name: "Rose Pink",
    primary: "hsl(330, 81%, 60%)",
    description: "Elegant and sophisticated",
    gradient: "from-rose-600 via-rose-500 to-pink-400",
    solid: "bg-rose-600"
  },
]

export function useColorTheme() {
  const [colorTheme, setColorTheme] = useState("emerald")
  const [useGradient, setUseGradient] = useState(true)
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Apply color theme to CSS variables (only on client side)
  const applyColorTheme = (themeId: string) => {
    if (typeof window === 'undefined') return

    const selectedTheme = colorThemes.find((t) => t.id === themeId)
    if (selectedTheme) {
      document.documentElement.style.setProperty("--primary", selectedTheme.primary)
    }
  }

  // Apply accessibility settings (only on client side)
  const applyAccessibilitySettings = () => {
    if (typeof window === 'undefined') return

    if (highContrast) {
      document.documentElement.classList.add("high-contrast")
    } else {
      document.documentElement.classList.remove("high-contrast")
    }

    if (reducedMotion) {
      document.documentElement.classList.add("reduce-motion")
    } else {
      document.documentElement.classList.remove("reduce-motion")
    }
  }

  // Load saved preferences on mount
  useEffect(() => {
    setMounted(true)

    const savedColorTheme = localStorage.getItem("wallet_color_theme") || "emerald"
    const savedUseGradient = localStorage.getItem("wallet_use_gradient") !== "false" // Default to true
    const savedHighContrast = localStorage.getItem("wallet_high_contrast") === "true"
    const savedReducedMotion = localStorage.getItem("wallet_reduced_motion") === "true"

    setColorTheme(savedColorTheme)
    setUseGradient(savedUseGradient)
    setHighContrast(savedHighContrast)
    setReducedMotion(savedReducedMotion)

    // Apply the saved settings
    applyColorTheme(savedColorTheme)
    applyAccessibilitySettings()
  }, [])

  // Update accessibility settings when they change
  useEffect(() => {
    applyAccessibilitySettings()
  }, [highContrast, reducedMotion, mounted])

  const handleColorThemeChange = (newTheme: string) => {
    setColorTheme(newTheme)
    localStorage.setItem("wallet_color_theme", newTheme)
    applyColorTheme(newTheme)
  }

  const handleGradientToggle = (enabled: boolean) => {
    setUseGradient(enabled)
    localStorage.setItem("wallet_use_gradient", enabled.toString())
  }

  const handleHighContrastChange = (enabled: boolean) => {
    setHighContrast(enabled)
    localStorage.setItem("wallet_high_contrast", enabled.toString())
  }

  const handleReducedMotionChange = (enabled: boolean) => {
    setReducedMotion(enabled)
    localStorage.setItem("wallet_reduced_motion", enabled.toString())
  }

  return {
    colorTheme,
    useGradient,
    highContrast,
    reducedMotion,
    colorThemes,
    handleColorThemeChange,
    handleGradientToggle,
    handleHighContrastChange,
    handleReducedMotionChange,
  }
}