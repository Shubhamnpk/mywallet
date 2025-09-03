"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "next-themes"
import { useColorTheme } from "@/hooks/use-color-theme"
import { Palette, Sun, Moon, Monitor, Contrast } from "lucide-react"

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
    colorThemes,
    handleColorThemeChange,
    handleGradientToggle,
    handleHighContrastChange,
    handleReducedMotionChange,
    handleShowScrollbarsChange,
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
            {colorThemes.map((themeOption) => (
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
    </div>
  )
}