"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Accessibility, Type, Volume2, Eye, RotateCcw, Upload, Play } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const generateTone = (frequency: number, duration: number, type: OscillatorType = "sine") => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
  oscillator.type = type

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration)
}

const PRESET_SOUNDS = {
  "gentle-chime": { name: "Gentle Chime", generator: () => generateTone(800, 0.3) },
  "soft-click": { name: "Soft Click", generator: () => generateTone(1000, 0.1, "square") },
  "success-tone": {
    name: "Success Tone",
    generator: () => {
      generateTone(523, 0.2)
      setTimeout(() => generateTone(659, 0.2), 100)
    },
  },
  notification: { name: "Notification", generator: () => generateTone(440, 0.4) },
  none: { name: "No Sound", generator: () => {} },
}

export function AccessibilitySettings() {
  const [screenReader, setScreenReader] = useState(false)
  const [keyboardNav, setKeyboardNav] = useState(true)
  const [fontSize, setFontSize] = useState([16])
  const [soundEffects, setSoundEffects] = useState(false)
  const [focusIndicators, setFocusIndicators] = useState(true)
  const [tooltips, setTooltips] = useState(true)
  const [selectedSound, setSelectedSound] = useState("gentle-chime")
  const [customSoundUrl, setCustomSoundUrl] = useState("")

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Load saved accessibility preferences
    const savedScreenReader = localStorage.getItem("wallet_screen_reader") === "true"
    const savedKeyboardNav = localStorage.getItem("wallet_keyboard_nav") !== "false"
    const savedFontSize = Number.parseInt(localStorage.getItem("wallet_font_size") || "16")
    const savedSoundEffects = localStorage.getItem("wallet_sound_effects") === "true"
    const savedFocusIndicators = localStorage.getItem("wallet_focus_indicators") !== "false"
    const savedTooltips = localStorage.getItem("wallet_tooltips") !== "false"
    const savedSelectedSound = localStorage.getItem("wallet_selected_sound") || "gentle-chime"
    const savedCustomSoundUrl = localStorage.getItem("wallet_custom_sound_url") || ""

    setScreenReader(savedScreenReader)
    setKeyboardNav(savedKeyboardNav)
    setFontSize([savedFontSize])
    setSoundEffects(savedSoundEffects)
    setFocusIndicators(savedFocusIndicators)
    setTooltips(savedTooltips)
    setSelectedSound(savedSelectedSound)
    setCustomSoundUrl(savedCustomSoundUrl)

    applyAccessibilitySettings(savedScreenReader, savedKeyboardNav, savedFontSize, savedFocusIndicators)
  }, [])

  const applyAccessibilitySettings = (sr: boolean, kn: boolean, fs: number, fi: boolean) => {
    if (sr) {
      document.documentElement.classList.add("screen-reader-optimized")
    } else {
      document.documentElement.classList.remove("screen-reader-optimized")
    }

    if (kn) {
      document.documentElement.classList.add("keyboard-nav-enabled")
    } else {
      document.documentElement.classList.remove("keyboard-nav-enabled")
    }

    if (fi) {
      document.documentElement.classList.add("enhanced-focus")
    } else {
      document.documentElement.classList.remove("enhanced-focus")
    }

    document.documentElement.style.setProperty("--base-font-size", `${fs}px`)
  }

  const announceToScreenReader = (message: string) => {
    if (screenReader) {
      const announcement = document.createElement("div")
      announcement.setAttribute("aria-live", "polite")
      announcement.setAttribute("aria-atomic", "true")
      announcement.className = "sr-only"
      announcement.textContent = message
      document.body.appendChild(announcement)
      setTimeout(() => document.body.removeChild(announcement), 1000)
    }
  }

  const playSound = (action = "default") => {
    if (!soundEffects) return

    try {
      if (selectedSound === "custom" && customSoundUrl) {
        // Use custom uploaded sound
        if (audioRef.current) {
          audioRef.current.src = customSoundUrl
          audioRef.current.play().catch(console.error)
        } else {
          audioRef.current = new Audio(customSoundUrl)
          audioRef.current.play().catch(console.error)
        }
      } else if (selectedSound !== "none") {
        // Use generated tone
        const soundConfig = PRESET_SOUNDS[selectedSound as keyof typeof PRESET_SOUNDS]
        if (soundConfig?.generator) {
          soundConfig.generator()
        }
      }
    } catch (error) {
      console.error("Error playing sound:", error)
    }
  }

  const handleScreenReaderChange = (enabled: boolean) => {
    setScreenReader(enabled)
    localStorage.setItem("wallet_screen_reader", enabled.toString())

    // Apply screen reader optimizations
    if (enabled) {
      document.documentElement.classList.add("screen-reader-optimized")
      announceToScreenReader("Screen reader mode enabled")
    } else {
      document.documentElement.classList.remove("screen-reader-optimized")
    }
    playSound("toggle")
  }

  const handleKeyboardNavChange = (enabled: boolean) => {
    setKeyboardNav(enabled)
    localStorage.setItem("wallet_keyboard_nav", enabled.toString())

    // Apply keyboard navigation styles
    if (enabled) {
      document.documentElement.classList.add("keyboard-nav-enabled")
    } else {
      document.documentElement.classList.remove("keyboard-nav-enabled")
    }
    playSound("toggle")
    announceToScreenReader(`Keyboard navigation ${enabled ? "enabled" : "disabled"}`)
  }

  const handleFontSizeChange = (value: number[]) => {
    setFontSize(value)
    localStorage.setItem("wallet_font_size", value[0].toString())

    // Apply font size
    document.documentElement.style.setProperty("--base-font-size", `${value[0]}px`)
    announceToScreenReader(`Font size changed to ${value[0]} pixels`)
  }

  const handleSoundEffectsChange = (enabled: boolean) => {
    setSoundEffects(enabled)
    localStorage.setItem("wallet_sound_effects", enabled.toString())

    if (enabled) {
      playSound("enable")
    }
    announceToScreenReader(`Sound effects ${enabled ? "enabled" : "disabled"}`)
  }

  const handleFocusIndicatorsChange = (enabled: boolean) => {
    setFocusIndicators(enabled)
    localStorage.setItem("wallet_focus_indicators", enabled.toString())

    // Apply focus indicator styles
    if (enabled) {
      document.documentElement.classList.add("enhanced-focus")
    } else {
      document.documentElement.classList.remove("enhanced-focus")
    }
    playSound("toggle")
    announceToScreenReader(`Enhanced focus indicators ${enabled ? "enabled" : "disabled"}`)
  }

  const handleTooltipsChange = (enabled: boolean) => {
    setTooltips(enabled)
    localStorage.setItem("wallet_tooltips", enabled.toString())
    playSound("toggle")
    announceToScreenReader(`Enhanced tooltips ${enabled ? "enabled" : "disabled"}`)
  }

  const handleSoundChange = (value: string) => {
    setSelectedSound(value)
    localStorage.setItem("wallet_selected_sound", value)

    // Play preview of selected sound
    if (value !== "none" && value !== "custom") {
      try {
        const soundConfig = PRESET_SOUNDS[value as keyof typeof PRESET_SOUNDS]
        if (soundConfig?.generator) {
          soundConfig.generator()
        }
      } catch (error) {
        console.error("Error playing preview sound:", error)
      }
    }
  }

  const handleCustomSoundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type.startsWith("audio/")) {
        const url = URL.createObjectURL(file)
        setCustomSoundUrl(url)
        setSelectedSound("custom")
        localStorage.setItem("wallet_custom_sound_url", url)
        localStorage.setItem("wallet_selected_sound", "custom")
        toast({
          title: "Custom sound uploaded",
          description: "Your custom sound effect has been set successfully.",
        })
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an audio file (MP3, WAV, etc.)",
          variant: "destructive",
        })
      }
    }
  }

  const resetToDefaults = () => {
    const defaults = {
      screenReader: false,
      keyboardNav: true,
      fontSize: 16,
      soundEffects: false,
      focusIndicators: true,
      tooltips: true,
      selectedSound: "gentle-chime",
      customSoundUrl: "",
    }

    setScreenReader(defaults.screenReader)
    setKeyboardNav(defaults.keyboardNav)
    setFontSize([defaults.fontSize])
    setSoundEffects(defaults.soundEffects)
    setFocusIndicators(defaults.focusIndicators)
    setTooltips(defaults.tooltips)
    setSelectedSound(defaults.selectedSound)
    setCustomSoundUrl(defaults.customSoundUrl)

    // Clear localStorage
    Object.keys(defaults).forEach((key) => {
      localStorage.removeItem(`wallet_${key.replace(/([A-Z])/g, "_$1").toLowerCase()}`)
    })

    // Apply default settings
    applyAccessibilitySettings(defaults.screenReader, defaults.keyboardNav, defaults.fontSize, defaults.focusIndicators)

    toast({
      title: "Settings reset",
      description: "All accessibility settings have been reset to defaults.",
    })
    announceToScreenReader("All accessibility settings have been reset to default values")
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={resetToDefaults} className="flex items-center gap-2 bg-transparent">
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>
      </div>

      {/* Screen Reader Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Accessibility className="w-5 h-5" />
            Screen Reader Support
          </CardTitle>
          <CardDescription>Optimize the interface for screen readers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="screen-reader">Screen Reader Mode</Label>
              <p className="text-sm text-muted-foreground">Enhanced ARIA labels and live announcements</p>
            </div>
            <Switch id="screen-reader" checked={screenReader} onCheckedChange={handleScreenReaderChange} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="tooltips">Enhanced Tooltips</Label>
              <p className="text-sm text-muted-foreground">Show detailed explanations for time calculations</p>
            </div>
            <Switch id="tooltips" checked={tooltips} onCheckedChange={handleTooltipsChange} />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Navigation & Focus
          </CardTitle>
          <CardDescription>Keyboard navigation and focus management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="keyboard-nav">Keyboard Navigation</Label>
              <p className="text-sm text-muted-foreground">Navigate using Tab, Enter, and arrow keys</p>
            </div>
            <Switch id="keyboard-nav" checked={keyboardNav} onCheckedChange={handleKeyboardNavChange} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="focus-indicators">Enhanced Focus Indicators</Label>
              <p className="text-sm text-muted-foreground">More visible focus outlines for better navigation</p>
            </div>
            <Switch id="focus-indicators" checked={focusIndicators} onCheckedChange={handleFocusIndicatorsChange} />
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Typography
          </CardTitle>
          <CardDescription>Adjust text size and readability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="font-size">Base Font Size: {fontSize[0]}px</Label>
            <Slider
              id="font-size"
              min={12}
              max={24}
              step={1}
              value={fontSize}
              onValueChange={handleFontSizeChange}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Small (12px)</span>
              <span>Default (16px)</span>
              <span>Large (24px)</span>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <p className="font-medium mb-2">Preview Text</p>
            <p style={{ fontSize: `${fontSize[0]}px` }}>
              This is how your text will appear with the selected font size. Transaction amounts and time calculations
              will scale accordingly.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Audio Feedback
          </CardTitle>
          <CardDescription>Sound effects and audio cues for actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="sound-effects">Sound Effects</Label>
              <p className="text-sm text-muted-foreground">Play sounds for actions like adding transactions</p>
            </div>
            <Switch id="sound-effects" checked={soundEffects} onCheckedChange={handleSoundEffectsChange} />
          </div>

          {soundEffects && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="sound-selection">Sound Selection</Label>
                <div className="flex items-center gap-2">
                  <Select value={selectedSound} onValueChange={handleSoundChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choose a sound" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRESET_SOUNDS).map(([key, sound]) => (
                        <SelectItem key={key} value={key}>
                          {sound.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom Sound</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => playSound("test")}
                    disabled={selectedSound === "none"}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {selectedSound === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="custom-sound">Upload Custom Sound</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleCustomSoundUpload}
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload MP3, WAV, or other audio files for custom sound effects
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accessibility Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Features</CardTitle>
          <CardDescription>Built-in accessibility features of MyWallet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">All interactive elements are keyboard accessible</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">ARIA labels provide context for screen readers</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">High contrast mode available for better visibility</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">Time calculations include detailed explanations</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">Reduced motion options for sensitive users</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
