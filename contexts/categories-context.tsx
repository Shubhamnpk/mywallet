"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { useWalletData } from "./wallet-data-context"
import type { Category } from "@/types/wallet"

type CategoriesContextType = {
  categories: Category[]
  addCategory: (category: Omit<Category, "id" | "createdAt" | "totalSpent" | "transactionCount">) => Category
  updateCategory: (id: string, updates: Partial<Category>) => void
  deleteCategory: (id: string) => void
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined)

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { categories, addCategory, updateCategory, deleteCategory } = useWalletData()
  const value = useMemo(
    () => ({ categories, addCategory, updateCategory, deleteCategory }),
    [categories, addCategory, updateCategory, deleteCategory],
  )
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useCategories() {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error("useCategories must be used within CategoriesProvider")
  return ctx
}
