"use client"

import { useState, useEffect } from "react"

const colorThemes = [
  {
    id: "emerald",
    name: "Emerald",
    primary: "oklch(0.58 0.18 160)",
    description: "Fresh and natural",
    gradient: "from-emerald-600 via-emerald-500 to-green-400",
    solid: "bg-emerald-600"
  },
  {
    id: "blue",
    name: "Ocean Blue",
    primary: "oklch(0.58 0.2 250)",
    description: "Professional and trustworthy",
    gradient: "from-blue-600 via-blue-500 to-indigo-400",
    solid: "bg-blue-600"
  },
  {
    id: "purple",
    name: "Royal Purple",
    primary: "oklch(0.58 0.22 290)",
    description: "Creative and modern",
    gradient: "from-purple-600 via-purple-500 to-pink-400",
    solid: "bg-purple-600"
  },
  {
    id: "orange",
    name: "Sunset Orange",
    primary: "oklch(0.65 0.2 65)",
    description: "Energetic and warm",
    gradient: "from-orange-600 via-orange-500 to-red-400",
    solid: "bg-orange-600"
  },
  {
    id: "rose",
    name: "Rose Pink",
    primary: "oklch(0.6 0.2 0)",
    description: "Elegant and sophisticated",
    gradient: "from-rose-600 via-rose-500 to-pink-400",
    solid: "bg-rose-600"
  },
  {
    id: "custom",
    name: "Custom",
    primary: "oklch(0.58 0.18 160)", // Default, will be overridden by custom
    description: "Choose your own colors",
    gradient: "from-primary via-primary to-primary",
    solid: "bg-primary"
  },
]

const fontOptions = [
  { id: "system", name: "System Default", fontFamily: "system-ui, -apple-system, sans-serif" },
  { id: "inter", name: "Inter", fontFamily: "'Inter', sans-serif" },
  { id: "roboto", name: "Roboto", fontFamily: "'Roboto', sans-serif" },
  { id: "open-sans", name: "Open Sans", fontFamily: "'Open Sans', sans-serif" },
  { id: "lato", name: "Lato", fontFamily: "'Lato', sans-serif" },
  { id: "poppins", name: "Poppins", fontFamily: "'Poppins', sans-serif" },
  { id: "nunito", name: "Nunito", fontFamily: "'Nunito', sans-serif" },
]

const borderRadiusOptions = [
  { id: "none", name: "None", value: "0px" },
  { id: "small", name: "Small", value: "4px" },
  { id: "medium", name: "Medium", value: "8px" },
  { id: "large", name: "Large", value: "12px" },
]

// Default theme settings
const defaultSettings = {
  colorTheme: "emerald",
  useGradient: true,
  highContrast: false,
  reducedMotion: false,
  showScrollbars: true,
  customPrimaryColor: "#10b981",
  customBackgroundColor: "", // Empty string means no custom background
  borderRadius: 50, // 50% = 8px (medium)
  compactMode: false,
  fontFamily: "system",
}

export function useColorTheme() {
  const [colorTheme, setColorTheme] = useState("emerald")
  const [useGradient, setUseGradient] = useState(true)
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [showScrollbars, setShowScrollbars] = useState(true)
  const [customPrimaryColor, setCustomPrimaryColor] = useState("#10b981")
  const [customBackgroundColor, setCustomBackgroundColor] = useState("")
  const [borderRadius, setBorderRadius] = useState(50) // Percentage: 0-100
  const [compactMode, setCompactMode] = useState(false)
  const [fontFamily, setFontFamily] = useState("system")
  const [mounted, setMounted] = useState(false)

  // Apply color theme to CSS variables (only on client side)
  const applyColorTheme = (themeId: string) => {
    if (typeof window === 'undefined') return

    if (themeId === "custom") {
      // For custom theme, convert hex to oklch and use the custom primary color
      const oklchColor = hexToOklch(customPrimaryColor)
      document.documentElement.style.setProperty("--primary", oklchColor)
    } else if (themeId.startsWith("custom-")) {
      // Handle user-created custom themes
      const customThemes = JSON.parse(localStorage.getItem('wallet_custom_themes') || '[]')
      const customTheme = customThemes.find((t: any) => t.id === themeId)
      if (customTheme) {
        const oklchColor = hexToOklch(customTheme.primary)
        document.documentElement.style.setProperty("--primary", oklchColor)
      }
    } else {
      const selectedTheme = colorThemes.find((t) => t.id === themeId)
      if (selectedTheme) {
        // Convert HSL to OKLCH for consistency
        document.documentElement.style.setProperty("--primary", selectedTheme.primary)
      }
    }
  }

  // Convert hex color to oklch format
  const hexToOklch = (hex: string) => {
    // Simple conversion - for better accuracy, you'd use a proper color conversion library
    // This is a basic approximation
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    // Convert RGB to OKLCH (simplified)
    // This is a rough approximation - in production, use a proper color library
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min

    let h = 0
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6
      else if (max === g) h = (b - r) / delta + 2
      else h = (r - g) / delta + 4
      h *= 60
    }

    const l = (max + min) / 2
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
    const c = s * Math.sqrt(l * (1 - l)) // Approximation

    return `oklch(${l} ${c} ${h})`
  }

  // Apply additional theme settings
  const applyThemeSettings = () => {
    if (typeof window === 'undefined') return

    // Apply border radius (0-100% maps to 0-20px)
    const radiusPx = (borderRadius / 100) * 20
    document.documentElement.style.setProperty("--radius", `${radiusPx}px`)

    // Apply font family
    const fontOption = fontOptions.find(opt => opt.id === fontFamily)
    if (fontOption) {
      document.documentElement.style.setProperty("--font-family", fontOption.fontFamily)
      document.body.style.fontFamily = fontOption.fontFamily
    }

    // Apply custom background color
    document.documentElement.style.setProperty("--custom-bg", customBackgroundColor)

    // Apply compact mode
    if (compactMode) {
      document.documentElement.classList.add("compact-mode")
      document.body.style.fontSize = "14px" // Smaller font in compact mode
    } else {
      document.documentElement.classList.remove("compact-mode")
      document.body.style.fontSize = "16px" // Default font size
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

    if (showScrollbars) {
      document.documentElement.classList.remove("hide-scrollbars")
      document.documentElement.classList.add("show-scrollbars")
    } else {
      document.documentElement.classList.add("hide-scrollbars")
      document.documentElement.classList.remove("show-scrollbars")
    }
  }

  // Load saved preferences on mount
  useEffect(() => {
    setMounted(true)

    const savedColorTheme = localStorage.getItem("wallet_color_theme") || "emerald"
    const savedUseGradient = localStorage.getItem("wallet_use_gradient") !== "false" // Default to true
    const savedHighContrast = localStorage.getItem("wallet_high_contrast") === "true"
    const savedReducedMotion = localStorage.getItem("wallet_reduced_motion") === "true"
    const savedShowScrollbarsValue = localStorage.getItem("wallet_show_scrollbars")
    const savedShowScrollbars = savedShowScrollbarsValue === null ? true : savedShowScrollbarsValue === "true"
    const savedCustomPrimaryColor = localStorage.getItem("wallet_custom_primary_color") || "#10b981"
    const savedCustomBackgroundColor = localStorage.getItem("wallet_custom_background_color") || ""
    const savedBorderRadiusValue = localStorage.getItem("wallet_border_radius")
    const savedBorderRadius = savedBorderRadiusValue ? parseInt(savedBorderRadiusValue, 10) : 50
    const savedCompactMode = localStorage.getItem("wallet_compact_mode") === "true"
    const savedFontFamily = localStorage.getItem("wallet_font_family") || "system"

    setColorTheme(savedColorTheme)
    setUseGradient(savedUseGradient)
    setHighContrast(savedHighContrast)
    setReducedMotion(savedReducedMotion)
    setShowScrollbars(savedShowScrollbars)
    setCustomPrimaryColor(savedCustomPrimaryColor)
    setCustomBackgroundColor(savedCustomBackgroundColor)
    setBorderRadius(savedBorderRadius)
    setCompactMode(savedCompactMode)
    setFontFamily(savedFontFamily)

    // Save default values to localStorage if not already set
    if (localStorage.getItem("wallet_show_scrollbars") === null) {
      localStorage.setItem("wallet_show_scrollbars", "true")
    }

    // Apply the saved settings
    applyColorTheme(savedColorTheme)
    applyThemeSettings()
    applyAccessibilitySettings()
  }, [])

  // Update accessibility settings when they change
  useEffect(() => {
    applyAccessibilitySettings()
  }, [highContrast, reducedMotion, showScrollbars, mounted])

  // Update theme settings when they change
  useEffect(() => {
    if (mounted) {
      applyThemeSettings()
    }
  }, [borderRadius, fontFamily, customBackgroundColor, compactMode, mounted])

  // Update color theme when custom color changes
  useEffect(() => {
    if (mounted && colorTheme === "custom") {
      applyColorTheme("custom")
    }
  }, [customPrimaryColor, mounted, colorTheme])

  const handleColorThemeChange = (newTheme: string) => {
    setColorTheme(newTheme)
    localStorage.setItem("wallet_color_theme", newTheme)

    // Reset custom background when switching away from custom theme
    if (newTheme !== "custom") {
      setCustomBackgroundColor("")
      localStorage.setItem("wallet_custom_background_color", "")
    }

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

  const handleShowScrollbarsChange = (enabled: boolean) => {
    setShowScrollbars(enabled)
    localStorage.setItem("wallet_show_scrollbars", enabled.toString())
    // Also apply immediately for instant effect
    if (enabled) {
      document.documentElement.classList.remove("hide-scrollbars")
      document.documentElement.classList.add("show-scrollbars")
    } else {
      document.documentElement.classList.add("hide-scrollbars")
      document.documentElement.classList.remove("show-scrollbars")
    }
  }

  const handleCustomPrimaryColorChange = (color: string) => {
    setCustomPrimaryColor(color)
    localStorage.setItem("wallet_custom_primary_color", color)
  }

  const handleCustomBackgroundColorChange = (color: string) => {
    setCustomBackgroundColor(color)
    localStorage.setItem("wallet_custom_background_color", color)
  }

  const handleBorderRadiusChange = (radius: number) => {
    setBorderRadius(radius)
    localStorage.setItem("wallet_border_radius", radius.toString())
  }

  const handleCompactModeChange = (enabled: boolean) => {
    setCompactMode(enabled)
    localStorage.setItem("wallet_compact_mode", enabled.toString())
  }

  const handleFontFamilyChange = (font: string) => {
    setFontFamily(font)
    localStorage.setItem("wallet_font_family", font)
  }

  const handleResetToDefaults = () => {
    // Reset all settings to defaults
    setColorTheme(defaultSettings.colorTheme)
    setUseGradient(defaultSettings.useGradient)
    setHighContrast(defaultSettings.highContrast)
    setReducedMotion(defaultSettings.reducedMotion)
    setShowScrollbars(defaultSettings.showScrollbars)
    setCustomPrimaryColor(defaultSettings.customPrimaryColor)
    setCustomBackgroundColor(defaultSettings.customBackgroundColor)
    setBorderRadius(defaultSettings.borderRadius)
    setCompactMode(defaultSettings.compactMode)
    setFontFamily(defaultSettings.fontFamily)

    // Clear localStorage and save defaults
    localStorage.removeItem("wallet_color_theme")
    localStorage.removeItem("wallet_use_gradient")
    localStorage.removeItem("wallet_high_contrast")
    localStorage.removeItem("wallet_reduced_motion")
    localStorage.removeItem("wallet_show_scrollbars")
    localStorage.removeItem("wallet_custom_primary_color")
    localStorage.removeItem("wallet_custom_background_color")
    localStorage.removeItem("wallet_border_radius")
    localStorage.removeItem("wallet_compact_mode")
    localStorage.removeItem("wallet_font_family")

    // Apply default settings
    applyColorTheme(defaultSettings.colorTheme)
    applyThemeSettings()
    applyAccessibilitySettings()
  }

  return {
    colorTheme,
    useGradient,
    highContrast,
    reducedMotion,
    showScrollbars,
    customPrimaryColor,
    customBackgroundColor,
    borderRadius,
    compactMode,
    fontFamily,
    colorThemes,
    fontOptions,
    borderRadiusOptions,
    handleColorThemeChange,
    handleGradientToggle,
    handleHighContrastChange,
    handleReducedMotionChange,
    handleShowScrollbarsChange,
    handleCustomPrimaryColorChange,
    handleCustomBackgroundColorChange,
    handleBorderRadiusChange,
    handleCompactModeChange,
    handleFontFamilyChange,
    handleResetToDefaults,
  }
}
