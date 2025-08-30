"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "next-themes"
import { Palette, Sun, Moon, Monitor, Contrast } from "lucide-react"

const colorThemes = [
  { id: "emerald", name: "Emerald", primary: "hsl(142, 76%, 36%)", description: "Fresh and natural" },
  { id: "blue", name: "Ocean Blue", primary: "hsl(221, 83%, 53%)", description: "Professional and trustworthy" },
  { id: "purple", name: "Royal Purple", primary: "hsl(262, 83%, 58%)", description: "Creative and modern" },
  { id: "orange", name: "Sunset Orange", primary: "hsl(25, 95%, 53%)", description: "Energetic and warm" },
  { id: "rose", name: "Rose Pink", primary: "hsl(330, 81%, 60%)", description: "Elegant and sophisticated" },
]

export function ThemeSettings() {
  const { theme, setTheme } = useTheme()
  const [colorTheme, setColorTheme] = useState("emerald")
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    // Load saved theme preferences
    const savedColorTheme = localStorage.getItem("wallet_color_theme") || "emerald"
    const savedHighContrast = localStorage.getItem("wallet_high_contrast") === "true"
    const savedReducedMotion = localStorage.getItem("wallet_reduced_motion") === "true"

    setColorTheme(savedColorTheme)
    setHighContrast(savedHighContrast)
    setReducedMotion(savedReducedMotion)
  }, [])

  const handleColorThemeChange = (newTheme: string) => {
    setColorTheme(newTheme)
    localStorage.setItem("wallet_color_theme", newTheme)

    // Apply theme to document root
    const root = document.documentElement
    const selectedTheme = colorThemes.find((t) => t.id === newTheme)
    if (selectedTheme) {
      root.style.setProperty("--primary", selectedTheme.primary)
    }
  }

  const handleHighContrastChange = (enabled: boolean) => {
    setHighContrast(enabled)
    localStorage.setItem("wallet_high_contrast", enabled.toString())

    // Apply high contrast mode
    if (enabled) {
      document.documentElement.classList.add("high-contrast")
    } else {
      document.documentElement.classList.remove("high-contrast")
    }
  }

  const handleReducedMotionChange = (enabled: boolean) => {
    setReducedMotion(enabled)
    localStorage.setItem("wallet_reduced_motion", enabled.toString())

    // Apply reduced motion
    if (enabled) {
      document.documentElement.classList.add("reduce-motion")
    } else {
      document.documentElement.classList.remove("reduce-motion")
    }
  }

  return (
    <div className="space-y-6">
      {/* Theme Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="w-5 h-5" />
            Theme Mode
          </CardTitle>
          <CardDescription>Choose your preferred theme mode</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={setTheme}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
                <Sun className="w-4 h-4" />
                Light
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
                <Moon className="w-4 h-4" />
                Dark
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
                <Monitor className="w-4 h-4" />
                System
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Color Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Color Theme
          </CardTitle>
          <CardDescription>Choose your preferred color scheme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {colorThemes.map((themeOption) => (
              <div
                key={themeOption.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  colorTheme === themeOption.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleColorThemeChange(themeOption.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: themeOption.primary }}
                  />
                  <div>
                    <p className="font-medium">{themeOption.name}</p>
                    <p className="text-sm text-muted-foreground">{themeOption.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Contrast className="w-5 h-5" />
            Visual Accessibility
          </CardTitle>
          <CardDescription>Adjust visual settings for better accessibility</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="high-contrast">High Contrast Mode</Label>
              <p className="text-sm text-muted-foreground">Increases contrast for better visibility</p>
            </div>
            <Switch id="high-contrast" checked={highContrast} onCheckedChange={handleHighContrastChange} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="reduced-motion">Reduce Motion</Label>
              <p className="text-sm text-muted-foreground">Minimizes animations and transitions</p>
            </div>
            <Switch id="reduced-motion" checked={reducedMotion} onCheckedChange={handleReducedMotionChange} />
          </div>
        </CardContent>
      </Card>

      {/* Theme Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Theme Preview</CardTitle>
          <CardDescription>See how your theme choices look</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Sample Transaction</h4>
              <span className="text-sm text-muted-foreground">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Coffee Shop</p>
                <p className="text-sm text-muted-foreground">Food & Dining</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-red-500">-$4.50</p>
                <p className="text-xs text-muted-foreground">12 minutes of work</p>
              </div>
            </div>
            <Button size="sm" className="w-full">
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
