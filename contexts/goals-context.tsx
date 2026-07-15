"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { useWalletData } from "./wallet-data-context"
import type { Goal } from "@/types/wallet"

type GoalsContextType = {
  goals: Goal[]
  addGoal: (goal: Omit<Goal, "id" | "currentAmount">) => Goal
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  transferToGoal: (goalId: string, amount: number) => Promise<any>
  useGoalForInvestment: (goalId: string, amount: number, options?: { market?: "nepal" | "uk" | "split"; notes?: string }) => Promise<any>
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined)

export function GoalsProvider({ children }: { children: ReactNode }) {
  const { goals, addGoal, updateGoal, deleteGoal, transferToGoal, useGoalForInvestment } = useWalletData()
  const value = useMemo(
    () => ({ goals, addGoal, updateGoal, deleteGoal, transferToGoal, useGoalForInvestment }),
    [goals, addGoal, updateGoal, deleteGoal, transferToGoal, useGoalForInvestment],
  )
  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
}

export function useGoals() {
  const ctx = useContext(GoalsContext)
  if (!ctx) throw new Error("useGoals must be used within GoalsProvider")
  return ctx
}
