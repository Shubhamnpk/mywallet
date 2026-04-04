// Sound utility for wallet authentication and system events
// Centralizes audio feedback based on accessibility settings

const generateTone = (frequency: number, duration: number, type: OscillatorType = "sine") => {
  if (typeof window === "undefined") return

  try {
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
  } catch (error) {
    console.error("Failed to generate tone:", error)
  }
}

export const PRESET_SOUNDS = {
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
  "error-buzz": {
    name: "Error Buzz",
    generator: () => {
      generateTone(200, 0.15, "square")
      setTimeout(() => generateTone(150, 0.2, "square"), 100)
    },
  },
  none: { name: "No Sound", generator: () => {} },
}

export type SoundActivity = 
  | "transaction-success" 
  | "transaction-failed" 
  | "budget-warning" 
  | "pin-success" 
  | "pin-failed" 
  | "toggle" 
  | "enable" 
  | "default"

export const playSound = (activity: SoundActivity = "default") => {
  if (typeof window === "undefined") return

  // Default to true if no saved preference exists
  const soundEffectsEnabled = localStorage.getItem("wallet_sound_effects") !== "false"
  if (!soundEffectsEnabled) return

  let enabled = false
  let selected = "gentle-chime"
  let customUrl = ""

  // Map activities to their specific settings
  switch (activity) {
    case "transaction-success":
      enabled = localStorage.getItem("wallet_transaction_success_enabled") !== "false"
      selected = localStorage.getItem("wallet_transaction_success_selected_sound") || "success-tone"
      customUrl = localStorage.getItem("wallet_transaction_success_custom_url") || ""
      break
    case "transaction-failed":
      enabled = localStorage.getItem("wallet_transaction_failed_enabled") !== "false"
      selected = localStorage.getItem("wallet_transaction_failed_selected_sound") || "notification"
      customUrl = localStorage.getItem("wallet_transaction_failed_custom_url") || ""
      break
    case "budget-warning":
      enabled = localStorage.getItem("wallet_budget_warning_enabled") !== "false"
      selected = localStorage.getItem("wallet_budget_warning_selected_sound") || "notification"
      customUrl = localStorage.getItem("wallet_budget_warning_custom_url") || ""
      break
    case "pin-success":
      enabled = localStorage.getItem("wallet_pin_success_enabled") !== "false"
      selected = localStorage.getItem("wallet_pin_success_selected_sound") || "success-tone"
      customUrl = localStorage.getItem("wallet_pin_success_custom_url") || ""
      break
    case "pin-failed":
      enabled = localStorage.getItem("wallet_pin_failed_enabled") !== "false"
      selected = localStorage.getItem("wallet_pin_failed_selected_sound") || "error-buzz"
      customUrl = localStorage.getItem("wallet_pin_failed_custom_url") || ""
      break
    case "toggle":
    case "enable":
    case "default":
      enabled = true
      selected = localStorage.getItem("wallet_selected_sound") || "gentle-chime"
      customUrl = localStorage.getItem("wallet_custom_sound_url") || ""
      break
    default:
      enabled = true
  }

  if (!enabled) return

  try {
    if (selected === "custom" && customUrl) {
      const audio = new Audio(customUrl)
      audio.play().catch(console.error)
    } else if (selected !== "none") {
      const soundConfig = PRESET_SOUNDS[selected as keyof typeof PRESET_SOUNDS]
      if (soundConfig?.generator) {
        soundConfig.generator()
      } else {
        // Fallback tone
        generateTone(523, 0.2)
      }
    }
  } catch (error) {
    console.error("Error playing sound:", error)
  }
}
