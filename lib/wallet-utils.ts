import type { UserProfile, Category, Transaction } from "@/types/wallet"

export function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function calculateBalance(transactions: Transaction[]) {
  return transactions.reduce((sum, transaction) => {
    return sum + (transaction.type === "income" ? transaction.amount : -transaction.amount)
  }, 0)
}

export const initializeDefaultCategories = (): Category[] => {
  const expenseCategories = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Education",
    "Travel",
    "Groceries",
    "Housing",
    "Insurance",
    "Other",
  ]

  const incomeCategories = [
    "Salary",
    "Freelance",
    "Business",
    "Investment",
    "Gift",
    "Bonus",
    "Side Hustle",
    "Rental Income",
    "Refund",
    "Other",
  ]

  const defaultCats: Category[] = []

  expenseCategories.forEach((name, index) => {
    defaultCats.push({
      id: `expense_${Date.now()}_${index}`,
      name,
      type: "expense",
      isDefault: true,
      createdAt: new Date().toISOString(),
      totalSpent: 0,
      transactionCount: 0,
    })
  })

  incomeCategories.forEach((name, index) => {
    defaultCats.push({
      id: `income_${Date.now()}_${index}`,
      name,
      type: "income",
      isDefault: true,
      createdAt: new Date().toISOString(),
      totalSpent: 0,
      transactionCount: 0,
    })
  })

  return defaultCats
}

export function calculateTimeEquivalent(amount: number, profile: UserProfile): number {
  const hourlyRate = profile.monthlyEarning / (profile.workingDaysPerMonth * profile.workingHoursPerDay)
  return amount / hourlyRate
}
