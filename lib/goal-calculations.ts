import type { Goal, Transaction } from "@/types/wallet"

// Cache for goal transaction calculations to improve performance
const goalTransactionCache = new Map<string, {
  transactions: Transaction[]
  calculated: number
  spent: number
  net: number
  timestamp: number
}>()

const CACHE_TTL = 5000 // 5 seconds cache

/**
 * Get filtered goal transactions with caching for performance
 */
function getGoalTransactionsCached(goalId: string, transactions: Transaction[]): Transaction[] {
  const cacheKey = goalId
  const now = Date.now()
  const cached = goalTransactionCache.get(cacheKey)
  
  // Return cached result if still valid
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.transactions
  }
  
  // Filter and cache the transactions (includes goal contributions AND goal_transfer spending)
  const goalTransactions = transactions.filter(transaction => 
    (transaction.allocationType === "goal" || transaction.allocationType === "goal_transfer") && 
    transaction.allocationTarget === goalId
  )
  
  // Calculate values once and cache them
  const calculated = goalTransactions
    .filter(tx => tx.actual === tx.amount)
    .reduce((total, tx) => total + tx.amount, 0)
    
  const spent = goalTransactions
    .filter(tx => 
      tx.actual === 0 || 
      tx.category === "goal spending" ||
      tx.description?.toLowerCase().includes("spent from goal")
    )
    .reduce((total, tx) => total + tx.amount, 0)
  
  goalTransactionCache.set(cacheKey, {
    transactions: goalTransactions,
    calculated,
    spent,
    net: calculated - spent,
    timestamp: now
  })
  
  return goalTransactions
}

/**
 * Calculate the actual saved amount for a goal based on transaction history
 * Optimized with caching for better performance with many transactions
 */
export function calculateGoalActualSavedAmount(goalId: string, transactions: Transaction[]): number {
  const cached = goalTransactionCache.get(goalId)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.calculated
  }
  
  getGoalTransactionsCached(goalId, transactions) // This will cache the result
  return goalTransactionCache.get(goalId)?.calculated || 0
}

/**
 * Calculate the amount spent from a goal based on transaction history
 * Optimized with caching for better performance
 */
export function calculateGoalSpentAmount(goalId: string, transactions: Transaction[]): number {
  const cached = goalTransactionCache.get(goalId)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.spent
  }
  
  getGoalTransactionsCached(goalId, transactions) // This will cache the result
  return goalTransactionCache.get(goalId)?.spent || 0
}

/**
 * Calculate the net amount saved for a goal (contributions - spending)
 * Optimized with caching for better performance
 */
export function calculateGoalNetSavedAmount(goalId: string, transactions: Transaction[]): number {
  const cached = goalTransactionCache.get(goalId)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.net
  }
  
  getGoalTransactionsCached(goalId, transactions) // This will cache the result
  return goalTransactionCache.get(goalId)?.net || 0
}

/**
 * Get all transactions related to a specific goal
 * Optimized with caching and sorting
 */
export function getGoalTransactions(goalId: string, transactions: Transaction[]): Transaction[] {
  const goalTransactions = getGoalTransactionsCached(goalId, transactions)
  return goalTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * Clear the goal transaction cache - useful when transactions are updated
 */
export function clearGoalTransactionCache(goalId?: string): void {
  if (goalId) {
    goalTransactionCache.delete(goalId)
  } else {
    goalTransactionCache.clear()
  }
}

/**
 * Calculate goal progress based on actual transaction data
 */
export function calculateGoalProgress(goal: Goal, transactions: Transaction[]): {
  netSaved: number
  contributed: number
  spent: number
  progressPercentage: number
  remaining: number
  isCompleted: boolean
} {
  const contributed = calculateGoalActualSavedAmount(goal.id, transactions)
  const spent = calculateGoalSpentAmount(goal.id, transactions)
  const netSaved = contributed - spent
  const effectiveTarget = goal.targetAmount
  const progressPercentage = effectiveTarget > 0 ? Math.min((netSaved / effectiveTarget) * 100, 100) : 0
  const remaining = Math.max(0, effectiveTarget - netSaved)
  const isCompleted = progressPercentage >= 100

  return {
    netSaved,
    contributed,
    spent,
    progressPercentage,
    remaining,
    isCompleted
  }
}

/**
 * Validate if stored currentAmount matches transaction-based calculation
 */
export function validateGoalCurrentAmount(goal: Goal, transactions: Transaction[]): {
  isAccurate: boolean
  storedAmount: number
  calculatedAmount: number
  difference: number
} {
  const calculatedAmount = calculateGoalNetSavedAmount(goal.id, transactions)
  const storedAmount = goal.currentAmount || 0
  const difference = Math.abs(storedAmount - calculatedAmount)
  const isAccurate = difference < 0.01 // Allow for tiny floating point differences

  return {
    isAccurate,
    storedAmount,
    calculatedAmount,
    difference
  }
}
