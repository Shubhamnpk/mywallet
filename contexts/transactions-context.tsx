"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { useWalletData } from "./wallet-data-context"
import type { Transaction } from "@/types/wallet"

type TransactionsContextType = {
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, "id" | "timeEquivalent">) => Promise<any>
  deleteTransaction: (id: string) => void
  updateTransaction: (id: string, updates: Partial<Pick<Transaction, "amount" | "description" | "category" | "date" | "subcategory">>) => Promise<{ success: boolean; transaction?: Transaction; error?: string }>
  calculateTimeEquivalent: (amount: number) => number
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined)

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { transactions, addTransaction, deleteTransaction, updateTransaction, calculateTimeEquivalent } = useWalletData()
  const value = useMemo(
    () => ({ transactions, addTransaction, deleteTransaction, updateTransaction, calculateTimeEquivalent }),
    [transactions, addTransaction, deleteTransaction, updateTransaction, calculateTimeEquivalent],
  )
  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error("useTransactions must be used within TransactionsProvider")
  return ctx
}
