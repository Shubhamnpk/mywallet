"use client"

import { useEffect, useState } from "react"

export function useAccessibility() {
  const [soundEffects, setSoundEffects] = useState(false)
  const [selectedSound, setSelectedSound] = useState("gentle-chime")
  const [customSoundUrl, setCustomSoundUrl] = useState("")

  useEffect(() => {
    const savedSoundEffects = localStorage.getItem("wallet_sound_effects") === "true"
    const savedSelectedSound = localStorage.getItem("wallet_selected_sound") || "gentle-chime"
    const savedCustomSoundUrl = localStorage.getItem("wallet_custom_sound_url") || ""

    setSoundEffects(savedSoundEffects)
    setSelectedSound(savedSelectedSound)
    setCustomSoundUrl(savedCustomSoundUrl)
  }, [])

  const playSound = (action = "default") => {
    if (!soundEffects) return

    const PRESET_SOUNDS = {
      "gentle-chime": "/sounds/gentle-chime.mp3",
      "soft-click": "/sounds/soft-click.mp3",
      "success-tone": "/sounds/success-tone.mp3",
      notification: "/sounds/notification.mp3",
      none: "",
    }

    const soundUrl =
      selectedSound === "custom" && customSoundUrl
        ? customSoundUrl
        : PRESET_SOUNDS[selectedSound as keyof typeof PRESET_SOUNDS]

    if (soundUrl) {
      const audio = new Audio(soundUrl)
      audio.play().catch(console.error)
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
  }
}
