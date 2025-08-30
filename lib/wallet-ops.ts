import type { Budget, Goal, Category, Transaction } from "@/types/wallet"

export function updateBudgetSpendingHelper(
  budgets: Budget[],
  category: string,
  amount: number,
  currencySymbol?: string,
) {
  const warnings: any[] = []
  const relevantBudgets = budgets.filter(
    (budget) => budget.categories.includes(category) || budget.category === category,
  )
  if (relevantBudgets.length === 0) {
    return { updatedBudgets: budgets, warnings }
  }

  const updatedBudgets = budgets.map((budget) => {
    if (relevantBudgets.some((rb) => rb.id === budget.id)) {
      const newSpent = budget.spent + amount
      if (newSpent > budget.limit) {
        const excess = newSpent - budget.limit
        warnings.push({
          budget: budget.category,
          message: `Budget exceeded by ${currencySymbol || "$"}${excess.toFixed(2)}`,
          type: "budget_exceeded",
          excess: excess,
        })
      } else if (newSpent > budget.limit * budget.alertThreshold) {
        const percentage = Math.round((newSpent / budget.limit) * 100)
        warnings.push({
          budget: budget.category,
          message: `Budget ${percentage}% used (${currencySymbol || "$"}${newSpent.toFixed(2)} of ${currencySymbol || "$"}${budget.limit.toFixed(2)})`,
          type: "budget_warning",
          percentage: percentage,
        })
      }
      return { ...budget, spent: newSpent }
    }
    return budget
  })

  return { updatedBudgets, warnings }
}

export function updateGoalContributionHelper(goals: Goal[], goalId: string, amount: number) {
  const updatedGoals = goals.map((g) => (g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g))
  return updatedGoals
}

export function updateCategoryStatsHelper(categories: Category[], transactions: Transaction[]) {
  const updatedCategories = categories.map((category) => {
    const categoryTransactions = transactions.filter((t) => t.category === category.name)
    const totalSpent = categoryTransactions.reduce((sum, t) => sum + t.amount, 0)

    return {
      ...category,
      totalSpent,
      transactionCount: categoryTransactions.length,
    }
  })

  return updatedCategories
}
