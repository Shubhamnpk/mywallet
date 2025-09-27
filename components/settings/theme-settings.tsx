"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RotateCcw, Plus, Edit, Trash2 } from "lucide-react"
import { useTheme } from "next-themes"
import { useColorTheme } from "@/hooks/use-color-theme"
import { Palette, Sun, Moon, Monitor, Contrast, Type, Scissors, Shrink, Droplet } from "lucide-react"

const themeOptions = [
  {
    id: "light",
    name: "Light",
    icon: Sun,
    description: "Clean and bright"
  },
  {
    id: "dark",
    name: "Dark",
    icon: Moon,
    description: "Easy on the eyes"
  },
  {
    id: "system",
    name: "System",
    icon: Monitor,
    description: "Follows device setting"
  }
]

export function ThemeSettings() {
  const { theme, setTheme } = useTheme()
  const {
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
  } = useColorTheme()

  // Custom theme type
  type CustomTheme = {
    id: string
    name: string
    primary: string
    description: string
    gradient: string
    solid: string
  }

  // Custom theme management state
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wallet_custom_themes')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [customThemeModalOpen, setCustomThemeModalOpen] = useState(false)
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null)
  const [newThemeName, setNewThemeName] = useState('')
  const [newThemeColor, setNewThemeColor] = useState('#10b981')

  // Convert hex color to oklch format (same as in useColorTheme hook)
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

  // Custom theme management functions
  const saveCustomThemes = (themes: CustomTheme[]) => {
    setCustomThemes(themes)
    localStorage.setItem('wallet_custom_themes', JSON.stringify(themes))
  }

  const handleCreateCustomTheme = () => {
    setNewThemeColor('#10b981')
    setNewThemeName('')
    setEditingTheme(null)
    setCustomThemeModalOpen(true)
  }

  const handleEditCustomTheme = (theme: CustomTheme) => {
    setEditingTheme(theme)
    setNewThemeName(theme.name)
    setNewThemeColor(theme.primary)
    setCustomThemeModalOpen(true)
  }

  const handleDeleteCustomTheme = (themeId: string) => {
    const updatedThemes = customThemes.filter(t => t.id !== themeId)
    saveCustomThemes(updatedThemes)

    // If the deleted theme was selected, switch to default
    if (colorTheme === themeId) {
      handleColorThemeChange('emerald')
    }
  }

  const handleSaveCustomTheme = () => {
    if (!newThemeName.trim()) return

    const themeData = {
      id: editingTheme ? editingTheme.id : `custom-${Date.now()}`,
      name: newThemeName.trim(),
      primary: newThemeColor,
      description: editingTheme ? editingTheme.description : 'Custom theme',
      gradient: `from-[${newThemeColor}] via-[${newThemeColor}]/80 to-[${newThemeColor}]/60`,
      solid: `bg-[${newThemeColor}]`
    }

    let updatedThemes
    if (editingTheme) {
      updatedThemes = customThemes.map(t => t.id === editingTheme.id ? themeData : t)
    } else {
      updatedThemes = [...customThemes, themeData]
    }

    saveCustomThemes(updatedThemes)
    setCustomThemeModalOpen(false)
    setNewThemeName('')
    setEditingTheme(null)
  }

  return (
    <div className="space-y-6">
      {/* Reset to Defaults */}
      <div className="flex justify-end ">
        <Button
          variant="outline"
          onClick={handleResetToDefaults}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>
      </div>
      {/* Enhanced Theme Mode */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sun className="w-5 h-5" />
            Theme Mode
          </CardTitle>
          <CardDescription>Choose your preferred theme mode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((themeOption) => {
              const IconComponent = themeOption.icon
              const isSelected = theme === themeOption.id

              return (
                <div
                  key={themeOption.id}
                  onClick={() => setTheme(themeOption.id)}
                  className={`
                    relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                    ${isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30 hover:bg-primary/50'
                    }
                  `}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className={`
                      p-2 rounded-lg transition-colors
                      ${isSelected 
                        ? 'bg-primary text-accent-foreground' 
                        : 'bg-primary text-accent-foreground'
                      }
                    `}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{themeOption.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                        {themeOption.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
          <div className="space-y-4">
            {/* Built-in Themes */}
            <div className="grid grid-cols-2 gap-3">
              {colorThemes.map((themeOption) => {
                // Convert colors to OKLCH for accurate preview (same as actual theme application)
                let previewColor = themeOption.primary
                if (themeOption.id === "custom") {
                  previewColor = hexToOklch(customPrimaryColor)
                }

                return (
                  <div
                    key={themeOption.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      colorTheme === themeOption.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleColorThemeChange(themeOption.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: previewColor }}
                      />
                      <div>
                        <p className="font-medium">{themeOption.name}</p>
                        <p className="text-sm text-muted-foreground">{themeOption.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Custom Themes Section */}
            {customThemes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Your Custom Themes</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {customThemes.map((theme) => (
                    <div
                      key={theme.id}
                      className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all group ${
                        colorTheme === theme.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleColorThemeChange(theme.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: hexToOklch(theme.primary) }}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{theme.name}</p>
                          <p className="text-xs text-muted-foreground">Custom</p>
                        </div>
                      </div>

                      {/* Edit/Delete buttons */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditCustomTheme(theme)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCustomTheme(theme.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create Custom Theme Button */}
            <Button
              onClick={handleCreateCustomTheme}
              variant="outline"
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Custom Theme
            </Button>
          </div>

          {/* Gradient/Solid Toggle */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="use-gradient">Use Gradient Background</Label>
                <p className="text-sm text-muted-foreground">Enable gradient effects for the main balance card</p>
              </div>
              <Switch id="use-gradient" checked={useGradient} onCheckedChange={handleGradientToggle} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Color Picker - only show when custom theme is selected */}
      {colorTheme === "custom" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplet className="w-5 h-5" />
              Custom Colors
            </CardTitle>
            <CardDescription>Customize your color scheme with full control</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Color Preview */}
            <div className="p-4 rounded-lg border bg-gradient-to-r from-card to-muted/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Color Preview</h4>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: customPrimaryColor }}
                  />
                  <span className="text-xs text-muted-foreground">{customPrimaryColor}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" className="text-xs" style={{ backgroundColor: customPrimaryColor, borderColor: customPrimaryColor }}>
                  Primary Button
                </Button>
                <Badge variant="secondary" className="text-xs">Badge</Badge>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: customPrimaryColor }} />
              </div>
            </div>

            {/* Color Pickers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Color */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: customPrimaryColor }}
                  />
                  <Label htmlFor="custom-primary" className="font-medium">Primary Color</Label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Input
                      id="custom-primary"
                      type="color"
                      value={customPrimaryColor}
                      onChange={(e) => handleCustomPrimaryColorChange(e.target.value)}
                      className="w-14 h-10 p-1 border-2 rounded-lg cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customPrimaryColor}
                      onChange={(e) => handleCustomPrimaryColorChange(e.target.value)}
                      className="flex-1 font-mono text-sm"
                      placeholder="#000000"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for buttons, links, and primary UI elements
                  </p>
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-border"
                    style={{ backgroundColor: customBackgroundColor || 'transparent' }}
                  />
                  <Label htmlFor="custom-background" className="font-medium">Background Color</Label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Input
                      id="custom-background"
                      type="color"
                      value={customBackgroundColor}
                      onChange={(e) => handleCustomBackgroundColorChange(e.target.value)}
                      className="w-14 h-10 p-1 border-2 rounded-lg cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customBackgroundColor}
                      onChange={(e) => handleCustomBackgroundColorChange(e.target.value)}
                      className="flex-1 font-mono text-sm"
                      placeholder="transparent"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Optional custom background for the app
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Color Presets */}
            <div className="space-y-3">
              <Label className="font-medium">Quick Presets</Label>
              <div className="grid grid-cols-6 gap-2">
                {[
                  '#10b981', // emerald
                  '#3b82f6', // blue
                  '#8b5cf6', // purple
                  '#f59e0b', // orange
                  '#ec4899', // rose
                  '#06b6d4'  // cyan
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => handleCustomPrimaryColorChange(color)}
                    className="w-8 h-8 rounded-lg border-2 border-white shadow-sm hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click any color to apply it as your primary color
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Typography
          </CardTitle>
          <CardDescription>Choose your preferred font family</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="font-family">Font Family</Label>
            <Select value={fontFamily} onValueChange={handleFontFamilyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a font" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((font) => (
                  <SelectItem key={font.id} value={font.id}>
                    <span style={{ fontFamily: font.fontFamily }}>{font.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            Layout
          </CardTitle>
          <CardDescription>Adjust layout and spacing preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="border-radius">Border Radius</Label>
              <span className="text-sm text-muted-foreground">{borderRadius}%</span>
            </div>
            <Slider
              id="border-radius"
              min={0}
              max={100}
              step={5}
              value={[borderRadius]}
              onValueChange={(value) => handleBorderRadiusChange(value[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Sharp (0px)</span>
              <span>Rounded (20px)</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="compact-mode">Compact Mode</Label>
              <p className="text-sm text-muted-foreground">Use smaller spacing and elements</p>
            </div>
            <Switch id="compact-mode" checked={compactMode} onCheckedChange={handleCompactModeChange} />
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

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="show-scrollbars">Show Scrollbars</Label>
              <p className="text-sm text-muted-foreground">Display scrollbars with primary color theme</p>
            </div>
            <Switch id="show-scrollbars" checked={showScrollbars} onCheckedChange={handleShowScrollbarsChange} />
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

      {/* Custom Theme Modal */}
      <Dialog open={customThemeModalOpen} onOpenChange={setCustomThemeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              {editingTheme ? 'Edit Custom Theme' : 'Create Custom Theme'}
            </DialogTitle>
            <DialogDescription>
              {editingTheme
                ? 'Update your custom theme colors and name.'
                : 'Choose a color and give your custom theme a name.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Color Picker */}
            <div className="space-y-2">
              <Label htmlFor="theme-color">Theme Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="theme-color"
                  type="color"
                  value={newThemeColor}
                  onChange={(e) => setNewThemeColor(e.target.value)}
                  className="w-16 h-12 p-1 border-2 rounded-lg cursor-pointer"
                />
                <Input
                  type="text"
                  value={newThemeColor}
                  onChange={(e) => setNewThemeColor(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Color Preview */}
            <div className="p-3 rounded-lg border bg-gradient-to-r from-card to-muted/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Preview</span>
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: newThemeColor }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="text-xs" style={{ backgroundColor: newThemeColor, borderColor: newThemeColor }}>
                  Button
                </Button>
                <Badge variant="secondary" className="text-xs">Badge</Badge>
              </div>
            </div>

            {/* Theme Name */}
            <div className="space-y-2">
              <Label htmlFor="theme-name">Theme Name</Label>
              <Input
                id="theme-name"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="Enter theme name..."
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCustomThemeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCustomTheme}
              disabled={!newThemeName.trim()}
            >
              {editingTheme ? 'Update Theme' : 'Create Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
