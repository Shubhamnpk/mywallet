"use client"

import { useEffect, useState } from "react"

export function useAccessibility() {
  const [soundEffects, setSoundEffects] = useState(true)
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

  useEffect(() => {
    const savedSoundEffectsValue = localStorage.getItem("wallet_sound_effects")
    const savedSoundEffects = savedSoundEffectsValue === null ? true : savedSoundEffectsValue === "true"
    const savedSelectedSound = localStorage.getItem("wallet_selected_sound") || "gentle-chime"
    const savedCustomSoundUrl = localStorage.getItem("wallet_custom_sound_url") || ""

    // Load per-activity settings
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

    setSoundEffects(savedSoundEffects)
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
  }, [])

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
        const audio = new Audio(customUrl)
        audio.play().catch(console.error)
      } else if (selected !== "none") {
        // Use generated tone
        const soundConfig = PRESET_SOUNDS[selected as keyof typeof PRESET_SOUNDS]
        if (soundConfig?.generator) {
          soundConfig.generator()
        }
      }
    } catch (error) {
    }
  }

  const announceToScreenReader = (message: string) => {
    const screenReaderEnabled = localStorage.getItem("wallet_screen_reader") === "true"
    if (screenReaderEnabled) {
      const announcement = document.createElement("div")
      announcement.setAttribute("aria-live", "polite")
      announcement.setAttribute("aria-atomic", "true")
      announcement.className = "sr-only"
      announcement.textContent = message
      document.body.appendChild(announcement)
      setTimeout(() => document.body.removeChild(announcement), 1000)
    }
  }

  return {
    playSound,
    announceToScreenReader,
    soundEffects,
    selectedSound,
    // Per-activity settings
    transactionSuccessEnabled,
    transactionFailedEnabled,
    budgetWarningEnabled,
    pinSuccessEnabled,
    pinFailedEnabled,
    transactionSuccessSelectedSound,
    transactionFailedSelectedSound,
    budgetWarningSelectedSound,
    pinSuccessSelectedSound,
    pinFailedSelectedSound,
  }
}
