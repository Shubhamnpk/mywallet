"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface PrivacyModeContextType {
  isPrivacyModeEnabled: boolean
  togglePrivacyMode: () => void
  maskAmount: (amount: number) => string
  maskText: (text: string) => string
}

const PrivacyModeContext = createContext<PrivacyModeContextType | undefined>(undefined)

export function PrivacyModeProvider({ children }: { children: ReactNode }) {
  const [isPrivacyModeEnabled, setIsPrivacyModeEnabled] = useState(false)

  useEffect(() => {
    // Load privacy mode preference from localStorage
    const saved = localStorage.getItem('wallet_privacy_mode')
    if (saved) {
      setIsPrivacyModeEnabled(JSON.parse(saved))
    }
  }, [])

  const togglePrivacyMode = () => {
    const newState = !isPrivacyModeEnabled
    setIsPrivacyModeEnabled(newState)
    localStorage.setItem('wallet_privacy_mode', JSON.stringify(newState))
  }

  const maskAmount = (amount: number): string => {
    if (!isPrivacyModeEnabled) return amount.toString()
    return '••••••'
  }

  const maskText = (text: string): string => {
    if (!isPrivacyModeEnabled) return text
    if (text.length <= 2) return '••'
    return text[0] + '•'.repeat(text.length - 2) + text[text.length - 1]
  }

  return (
    <PrivacyModeContext.Provider value={{
      isPrivacyModeEnabled,
      togglePrivacyMode,
      maskAmount,
      maskText
    }}>
      {children}
    </PrivacyModeContext.Provider>
  )
}

export function usePrivacyMode() {
  const context = useContext(PrivacyModeContext)
  if (context === undefined) {
    throw new Error('usePrivacyMode must be used within a PrivacyModeProvider')
  }
  return context
}