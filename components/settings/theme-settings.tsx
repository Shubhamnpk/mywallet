"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { RotateCcw } from "lucide-react"
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

  return (
    <div className="space-y-6">
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
          <div className="grid grid-cols-2 gap-3">
            {colorThemes.map((themeOption) => {
              // For custom theme, use the actual custom color
              const displayColor = themeOption.id === "custom" ? customPrimaryColor : themeOption.primary

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
                    {themeOption.id === "custom" ? (
                      // Custom theme with inline color picker
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={customPrimaryColor}
                          onChange={(e) => handleCustomPrimaryColorChange(e.target.value)}
                          className="w-8 h-8 p-0 border-2 border-white shadow-sm rounded-full cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <p className="font-medium">{themeOption.name}</p>
                          <p className="text-sm text-muted-foreground">{themeOption.description}</p>
                        </div>
                      </div>
                    ) : (
                      // Regular themes
                      <>
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: displayColor }}
                        />
                        <div>
                          <p className="font-medium">{themeOption.name}</p>
                          <p className="text-sm text-muted-foreground">{themeOption.description}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
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
            <CardDescription>Customize your color scheme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="custom-primary">Primary Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="custom-primary"
                    type="color"
                    value={customPrimaryColor}
                    onChange={(e) => handleCustomPrimaryColorChange(e.target.value)}
                    className="w-12 h-10 p-1 border rounded"
                  />
                  <Input
                    type="text"
                    value={customPrimaryColor}
                    onChange={(e) => handleCustomPrimaryColorChange(e.target.value)}
                    className="flex-1"
                    placeholder="#000000"
                  />
                </div>
              </div>
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

      {/* Background */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Background
          </CardTitle>
          <CardDescription>Customize background appearance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-background">Custom Background Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="custom-background"
                  type="color"
                  value={customBackgroundColor}
                  onChange={(e) => handleCustomBackgroundColorChange(e.target.value)}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  type="text"
                  value={customBackgroundColor}
                  onChange={(e) => handleCustomBackgroundColorChange(e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                This color may be used in certain UI elements
              </p>
            </div>
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

      {/* Reset to Defaults */}
      <div className="flex justify-center pt-4">
        <Button
          variant="outline"
          onClick={handleResetToDefaults}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  )
}
