"use client"

import { type ReactNode } from "react"
import { UserProvider } from "./user-context"
import { TransactionsProvider } from "./transactions-context"
import { BudgetsProvider } from "./budgets-context"
import { GoalsProvider } from "./goals-context"
import { CategoriesProvider } from "./categories-context"

export function DomainProviders({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <TransactionsProvider>
        <BudgetsProvider>
          <GoalsProvider>
            <CategoriesProvider>
              {children}
            </CategoriesProvider>
          </GoalsProvider>
        </BudgetsProvider>
      </TransactionsProvider>
    </UserProvider>
  )
}
