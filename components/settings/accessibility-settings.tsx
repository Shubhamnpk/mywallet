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
  const [keyboardNav, setKeyboardNav] = useState(false)
  const [fontSize, setFontSize] = useState([16])
  const [soundEffects, setSoundEffects] = useState(true)
  const [focusIndicators, setFocusIndicators] = useState(false)
  const [tooltips, setTooltips] = useState(false)
  const [selectedSound, setSelectedSound] = useState("gentle-chime")
  const [customSoundUrl, setCustomSoundUrl] = useState("")

  // Per-activity sound settings
  const [transactionSuccessEnabled, setTransactionSuccessEnabled] = useState(true)
  const [transactionFailedEnabled, setTransactionFailedEnabled] = useState(true)
  const [budgetWarningEnabled, setBudgetWarningEnabled] = useState(true)
  const [pinSuccessEnabled, setPinSuccessEnabled] = useState(true)
  const [pinFailedEnabled, setPinFailedEnabled] = useState(true)
  const [transactionSuccessSelectedSound, setTransactionSuccessSelectedSound] = useState("success-tone")
  const [transactionFailedSelectedSound, setTransactionFailedSelectedSound] = useState("notification")
  const [budgetWarningSelectedSound, setBudgetWarningSelectedSound] = useState("notification")
  const [pinSuccessSelectedSound, setPinSuccessSelectedSound] = useState("success-tone")
  const [pinFailedSelectedSound, setPinFailedSelectedSound] = useState("notification")
  const [transactionSuccessCustomUrl, setTransactionSuccessCustomUrl] = useState("")
  const [transactionFailedCustomUrl, setTransactionFailedCustomUrl] = useState("")
  const [budgetWarningCustomUrl, setBudgetWarningCustomUrl] = useState("")
  const [pinSuccessCustomUrl, setPinSuccessCustomUrl] = useState("")
  const [pinFailedCustomUrl, setPinFailedCustomUrl] = useState("")

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const transactionSuccessFileInputRef = useRef<HTMLInputElement>(null)
  const transactionFailedFileInputRef = useRef<HTMLInputElement>(null)
  const budgetWarningFileInputRef = useRef<HTMLInputElement>(null)
  const pinSuccessFileInputRef = useRef<HTMLInputElement>(null)
  const pinFailedFileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Load saved accessibility preferences
    const savedScreenReader = localStorage.getItem("wallet_screen_reader") === "true"
    const savedKeyboardNav = localStorage.getItem("wallet_keyboard_nav") === "true"
    const savedFontSize = Number.parseInt(localStorage.getItem("wallet_font_size") || "16")
    const savedSoundEffectsValue = localStorage.getItem("wallet_sound_effects")
    const savedSoundEffects = savedSoundEffectsValue === null ? true : savedSoundEffectsValue === "true"
    const savedFocusIndicators = localStorage.getItem("wallet_focus_indicators") === "true"
    const savedTooltips = localStorage.getItem("wallet_tooltips") === "true"
    const savedSelectedSound = localStorage.getItem("wallet_selected_sound") || "gentle-chime"
    const savedCustomSoundUrl = localStorage.getItem("wallet_custom_sound_url") || ""

    // Load per-activity settings with defaults
    const savedTransactionSuccessEnabled = localStorage.getItem("wallet_transaction_success_enabled")
    const savedTransactionFailedEnabled = localStorage.getItem("wallet_transaction_failed_enabled")
    const savedBudgetWarningEnabled = localStorage.getItem("wallet_budget_warning_enabled")
    const savedPinSuccessEnabled = localStorage.getItem("wallet_pin_success_enabled")
    const savedPinFailedEnabled = localStorage.getItem("wallet_pin_failed_enabled")
    const savedTransactionSuccessSelectedSound = localStorage.getItem("wallet_transaction_success_selected_sound") || "success-tone"
    const savedTransactionFailedSelectedSound = localStorage.getItem("wallet_transaction_failed_selected_sound") || "notification"
    const savedBudgetWarningSelectedSound = localStorage.getItem("wallet_budget_warning_selected_sound") || "notification"
    const savedPinSuccessSelectedSound = localStorage.getItem("wallet_pin_success_selected_sound") || "success-tone"
    const savedPinFailedSelectedSound = localStorage.getItem("wallet_pin_failed_selected_sound") || "notification"
    const savedTransactionSuccessCustomUrl = localStorage.getItem("wallet_transaction_success_custom_url") || ""
    const savedTransactionFailedCustomUrl = localStorage.getItem("wallet_transaction_failed_custom_url") || ""
    const savedBudgetWarningCustomUrl = localStorage.getItem("wallet_budget_warning_custom_url") || ""
    const savedPinSuccessCustomUrl = localStorage.getItem("wallet_pin_success_custom_url") || ""
    const savedPinFailedCustomUrl = localStorage.getItem("wallet_pin_failed_custom_url") || ""

    setScreenReader(savedScreenReader)
    setKeyboardNav(savedKeyboardNav)
    setFontSize([savedFontSize])
    setSoundEffects(savedSoundEffects)
    setFocusIndicators(savedFocusIndicators)
    setTooltips(savedTooltips)
    setSelectedSound(savedSelectedSound)
    setCustomSoundUrl(savedCustomSoundUrl)

    setTransactionSuccessEnabled(savedTransactionSuccessEnabled === null ? true : savedTransactionSuccessEnabled === "true")
    setTransactionFailedEnabled(savedTransactionFailedEnabled === null ? true : savedTransactionFailedEnabled === "true")
    setBudgetWarningEnabled(savedBudgetWarningEnabled === null ? true : savedBudgetWarningEnabled === "true")
    setPinSuccessEnabled(savedPinSuccessEnabled === null ? true : savedPinSuccessEnabled === "true")
    setPinFailedEnabled(savedPinFailedEnabled === null ? true : savedPinFailedEnabled === "true")
    setTransactionSuccessSelectedSound(savedTransactionSuccessSelectedSound)
    setTransactionFailedSelectedSound(savedTransactionFailedSelectedSound)
    setBudgetWarningSelectedSound(savedBudgetWarningSelectedSound)
    setPinSuccessSelectedSound(savedPinSuccessSelectedSound)
    setPinFailedSelectedSound(savedPinFailedSelectedSound)
    setTransactionSuccessCustomUrl(savedTransactionSuccessCustomUrl)
    setTransactionFailedCustomUrl(savedTransactionFailedCustomUrl)
    setBudgetWarningCustomUrl(savedBudgetWarningCustomUrl)
    setPinSuccessCustomUrl(savedPinSuccessCustomUrl)
    setPinFailedCustomUrl(savedPinFailedCustomUrl)

    applyAccessibilitySettings(savedScreenReader, savedKeyboardNav, savedFontSize, savedFocusIndicators)

    // Listen for authentication success events
    const handleAuthSuccess = () => playSound('pin-success')
    window.addEventListener('wallet-auth-success', handleAuthSuccess)

    return () => {
      window.removeEventListener('wallet-auth-success', handleAuthSuccess)
    }
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

  const playSound = (activity = "default") => {
    if (!soundEffects) return

    let enabled = false
    let selected = selectedSound
    let customUrl = customSoundUrl

    switch (activity) {
      case "transaction-success":
        enabled = transactionSuccessEnabled
        selected = transactionSuccessSelectedSound
        customUrl = transactionSuccessCustomUrl
        break
      case "transaction-failed":
        enabled = transactionFailedEnabled
        selected = transactionFailedSelectedSound
        customUrl = transactionFailedCustomUrl
        break
      case "budget-warning":
        enabled = budgetWarningEnabled
        selected = budgetWarningSelectedSound
        customUrl = budgetWarningCustomUrl
        break
      case "pin-success":
        enabled = pinSuccessEnabled
        selected = pinSuccessSelectedSound
        customUrl = pinSuccessCustomUrl
        break
      case "pin-failed":
        enabled = pinFailedEnabled
        selected = pinFailedSelectedSound
        customUrl = pinFailedCustomUrl
        break
      default:
        enabled = true
    }

    if (!enabled) return

    try {
      if (selected === "custom" && customUrl) {
        // Use custom uploaded sound
        if (audioRef.current) {
          audioRef.current.src = customUrl
          audioRef.current.play().catch(console.error)
        } else {
          audioRef.current = new Audio(customUrl)
          audioRef.current.play().catch(console.error)
        }
      } else if (selected !== "none") {
        // Use generated tone
        const soundConfig = PRESET_SOUNDS[selected as keyof typeof PRESET_SOUNDS]
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

  const handleActivityToggle = (activity: string) => (enabled: boolean) => {
    switch (activity) {
      case "transaction-success":
        setTransactionSuccessEnabled(enabled)
        localStorage.setItem("wallet_transaction_success_enabled", enabled.toString())
        break
      case "transaction-failed":
        setTransactionFailedEnabled(enabled)
        localStorage.setItem("wallet_transaction_failed_enabled", enabled.toString())
        break
      case "budget-warning":
        setBudgetWarningEnabled(enabled)
        localStorage.setItem("wallet_budget_warning_enabled", enabled.toString())
        break
      case "pin-success":
        setPinSuccessEnabled(enabled)
        localStorage.setItem("wallet_pin_success_enabled", enabled.toString())
        break
      case "pin-failed":
        setPinFailedEnabled(enabled)
        localStorage.setItem("wallet_pin_failed_enabled", enabled.toString())
        break
    }
    announceToScreenReader(`${activity.replace("-", " ").replace("pin", "auth")} sound ${enabled ? "enabled" : "disabled"}`)
  }

  const handleActivitySoundChange = (activity: string) => (value: string) => {
    switch (activity) {
      case "transaction-success":
        setTransactionSuccessSelectedSound(value)
        localStorage.setItem("wallet_transaction_success_selected_sound", value)
        break
      case "transaction-failed":
        setTransactionFailedSelectedSound(value)
        localStorage.setItem("wallet_transaction_failed_selected_sound", value)
        break
      case "budget-warning":
        setBudgetWarningSelectedSound(value)
        localStorage.setItem("wallet_budget_warning_selected_sound", value)
        break
      case "pin-success":
        setPinSuccessSelectedSound(value)
        localStorage.setItem("wallet_pin_success_selected_sound", value)
        break
      case "pin-failed":
        setPinFailedSelectedSound(value)
        localStorage.setItem("wallet_pin_failed_selected_sound", value)
        break
    }

    // Play preview if not none or custom
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

  const handleActivityCustomSoundUpload = (activity: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type.startsWith("audio/")) {
        const url = URL.createObjectURL(file)
        switch (activity) {
          case "transaction-success":
            setTransactionSuccessCustomUrl(url)
            setTransactionSuccessSelectedSound("custom")
            localStorage.setItem("wallet_transaction_success_custom_url", url)
            localStorage.setItem("wallet_transaction_success_selected_sound", "custom")
            break
          case "transaction-failed":
            setTransactionFailedCustomUrl(url)
            setTransactionFailedSelectedSound("custom")
            localStorage.setItem("wallet_transaction_failed_custom_url", url)
            localStorage.setItem("wallet_transaction_failed_selected_sound", "custom")
            break
          case "budget-warning":
            setBudgetWarningCustomUrl(url)
            setBudgetWarningSelectedSound("custom")
            localStorage.setItem("wallet_budget_warning_custom_url", url)
            localStorage.setItem("wallet_budget_warning_selected_sound", "custom")
            break
          case "pin-success":
            setPinSuccessCustomUrl(url)
            setPinSuccessSelectedSound("custom")
            localStorage.setItem("wallet_pin_success_custom_url", url)
            localStorage.setItem("wallet_pin_success_selected_sound", "custom")
            break
          case "pin-failed":
            setPinFailedCustomUrl(url)
            setPinFailedSelectedSound("custom")
            localStorage.setItem("wallet_pin_failed_custom_url", url)
            localStorage.setItem("wallet_pin_failed_selected_sound", "custom")
            break
        }
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
      keyboardNav: false,
      fontSize: 16,
      soundEffects: true,
      focusIndicators: false,
      tooltips: false,
      selectedSound: "gentle-chime",
      customSoundUrl: "",
      transactionSuccessEnabled: true,
      transactionFailedEnabled: true,
      budgetWarningEnabled: true,
      pinSuccessEnabled: true,
      pinFailedEnabled: true,
      transactionSuccessSelectedSound: "success-tone",
      transactionFailedSelectedSound: "notification",
      budgetWarningSelectedSound: "notification",
      pinSuccessSelectedSound: "success-tone",
      pinFailedSelectedSound: "notification",
      transactionSuccessCustomUrl: "",
      transactionFailedCustomUrl: "",
      budgetWarningCustomUrl: "",
      pinSuccessCustomUrl: "",
      pinFailedCustomUrl: "",
    }

    setScreenReader(defaults.screenReader)
    setKeyboardNav(defaults.keyboardNav)
    setFontSize([defaults.fontSize])
    setSoundEffects(defaults.soundEffects)
    setFocusIndicators(defaults.focusIndicators)
    setTooltips(defaults.tooltips)
    setSelectedSound(defaults.selectedSound)
    setCustomSoundUrl(defaults.customSoundUrl)
    setTransactionSuccessEnabled(defaults.transactionSuccessEnabled)
    setTransactionFailedEnabled(defaults.transactionFailedEnabled)
    setBudgetWarningEnabled(defaults.budgetWarningEnabled)
    setPinSuccessEnabled(defaults.pinSuccessEnabled)
    setPinFailedEnabled(defaults.pinFailedEnabled)
    setTransactionSuccessSelectedSound(defaults.transactionSuccessSelectedSound)
    setTransactionFailedSelectedSound(defaults.transactionFailedSelectedSound)
    setBudgetWarningSelectedSound(defaults.budgetWarningSelectedSound)
    setPinSuccessSelectedSound(defaults.pinSuccessSelectedSound)
    setPinFailedSelectedSound(defaults.pinFailedSelectedSound)
    setTransactionSuccessCustomUrl(defaults.transactionSuccessCustomUrl)
    setTransactionFailedCustomUrl(defaults.transactionFailedCustomUrl)
    setBudgetWarningCustomUrl(defaults.budgetWarningCustomUrl)
    setPinSuccessCustomUrl(defaults.pinSuccessCustomUrl)
    setPinFailedCustomUrl(defaults.pinFailedCustomUrl)

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
          <CardDescription>Sound effects and audio cues for specific actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="sound-effects">Enable Sound Effects</Label>
              <p className="text-sm text-muted-foreground">Master toggle for all audio feedback</p>
            </div>
            <Switch id="sound-effects" checked={soundEffects} onCheckedChange={handleSoundEffectsChange} />
          </div>

          {soundEffects && (
            <div className="space-y-6 pt-4 border-t">
              {/* Transaction Success */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Transaction Success Sound</Label>
                    <p className="text-sm text-muted-foreground">Play sound when transaction is added successfully</p>
                  </div>
                  <Switch
                    checked={transactionSuccessEnabled}
                    onCheckedChange={handleActivityToggle("transaction-success")}
                  />
                </div>
                {transactionSuccessEnabled && (
                  <div className="ml-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={transactionSuccessSelectedSound}
                        onValueChange={handleActivitySoundChange("transaction-success")}
                      >
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
                        onClick={() => playSound("transaction-success")}
                        disabled={transactionSuccessSelectedSound === "none"}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                    {transactionSuccessSelectedSound === "custom" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            ref={transactionSuccessFileInputRef}
                            type="file"
                            accept="audio/*"
                            onChange={handleActivityCustomSoundUpload("transaction-success")}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => transactionSuccessFileInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Transaction Failed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Transaction Failed Sound</Label>
                    <p className="text-sm text-muted-foreground">Play sound when transaction fails</p>
                  </div>
                  <Switch
                    checked={transactionFailedEnabled}
                    onCheckedChange={handleActivityToggle("transaction-failed")}
                  />
                </div>
                {transactionFailedEnabled && (
                  <div className="ml-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={transactionFailedSelectedSound}
                        onValueChange={handleActivitySoundChange("transaction-failed")}
                      >
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
                        onClick={() => playSound("transaction-failed")}
                        disabled={transactionFailedSelectedSound === "none"}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                    {transactionFailedSelectedSound === "custom" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            ref={transactionFailedFileInputRef}
                            type="file"
                            accept="audio/*"
                            onChange={handleActivityCustomSoundUpload("transaction-failed")}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => transactionFailedFileInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Budget Warning */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Budget Warning Sound</Label>
                    <p className="text-sm text-muted-foreground">Play sound when budget limits are exceeded</p>
                  </div>
                  <Switch
                    checked={budgetWarningEnabled}
                    onCheckedChange={handleActivityToggle("budget-warning")}
                  />
                </div>
                {budgetWarningEnabled && (
                  <div className="ml-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={budgetWarningSelectedSound}
                        onValueChange={handleActivitySoundChange("budget-warning")}
                      >
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
                        onClick={() => playSound("budget-warning")}
                        disabled={budgetWarningSelectedSound === "none"}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                    {budgetWarningSelectedSound === "custom" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            ref={budgetWarningFileInputRef}
                            type="file"
                            accept="audio/*"
                            onChange={handleActivityCustomSoundUpload("budget-warning")}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => budgetWarningFileInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PIN Success */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auth Success Sound</Label>
                    <p className="text-sm text-muted-foreground">Play sound when authentication is successful</p>
                  </div>
                  <Switch
                    checked={pinSuccessEnabled}
                    onCheckedChange={handleActivityToggle("pin-success")}
                  />
                </div>
                {pinSuccessEnabled && (
                  <div className="ml-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={pinSuccessSelectedSound}
                        onValueChange={handleActivitySoundChange("pin-success")}
                      >
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
                        onClick={() => playSound("pin-success")}
                        disabled={pinSuccessSelectedSound === "none"}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                    {pinSuccessSelectedSound === "custom" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            ref={pinSuccessFileInputRef}
                            type="file"
                            accept="audio/*"
                            onChange={handleActivityCustomSoundUpload("pin-success")}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => pinSuccessFileInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PIN Failed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auth Failed Sound</Label>
                    <p className="text-sm text-muted-foreground">Play sound when authentication fails</p>
                  </div>
                  <Switch
                    checked={pinFailedEnabled}
                    onCheckedChange={handleActivityToggle("pin-failed")}
                  />
                </div>
                {pinFailedEnabled && (
                  <div className="ml-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={pinFailedSelectedSound}
                        onValueChange={handleActivitySoundChange("pin-failed")}
                      >
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
                        onClick={() => playSound("pin-failed")}
                        disabled={pinFailedSelectedSound === "none"}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                    {pinFailedSelectedSound === "custom" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            ref={pinFailedFileInputRef}
                            type="file"
                            accept="audio/*"
                            onChange={handleActivityCustomSoundUpload("pin-failed")}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => pinFailedFileInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
