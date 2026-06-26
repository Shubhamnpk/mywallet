"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { useWalletData } from "./wallet-data-context"
import type { UserProfile } from "@/types/wallet"

type UserContextType = {
  userProfile: UserProfile | null
  updateUserProfile: (updates: Partial<UserProfile>) => void
  settings: any
  isAuthenticated: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const { userProfile, updateUserProfile, settings, isAuthenticated } = useWalletData()
  const value = useMemo(
    () => ({ userProfile, updateUserProfile, settings, isAuthenticated }),
    [userProfile, updateUserProfile, settings, isAuthenticated],
  )
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useUser must be used within UserProvider")
  return ctx
}
