"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { useWalletData } from "./wallet-data-context"
import type { Budget } from "@/types/wallet"

type BudgetsContextType = {
  budgets: Budget[]
  addBudget: (budget: Omit<Budget, "id">) => void
  updateBudget: (id: string, updates: Partial<Budget>) => void
  deleteBudget: (id: string) => void
}

const BudgetsContext = createContext<BudgetsContextType | undefined>(undefined)

export function BudgetsProvider({ children }: { children: ReactNode }) {
  const { budgets, addBudget, updateBudget, deleteBudget } = useWalletData()
  const value = useMemo(
    () => ({ budgets, addBudget, updateBudget, deleteBudget }),
    [budgets, addBudget, updateBudget, deleteBudget],
  )
  return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>
}

export function useBudgets() {
  const ctx = useContext(BudgetsContext)
  if (!ctx) throw new Error("useBudgets must be used within BudgetsProvider")
  return ctx
}
