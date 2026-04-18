import type { Goal, Transaction } from "@/types/wallet"
import { calculateGoalNetSavedAmount, validateGoalCurrentAmount } from "./goal-calculations"

/**
 * Synchronizes all goal currentAmount fields with actual transaction data
 * This ensures data consistency after migrating to transaction-based calculations
 */
export function synchronizeGoalAmountsWithTransactions(goals: Goal[], transactions: Transaction[]): {
  synchronizedGoals: Goal[]
  goalsUpdated: number
  totalDiscrepancy: number
  validationResults: Array<{
    goalId: string
    goalName: string
    wasAccurate: boolean
    oldAmount: number
    newAmount: number
    difference: number
  }>
} {
  const validationResults: Array<{
    goalId: string
    goalName: string
    wasAccurate: boolean
    oldAmount: number
    newAmount: number
    difference: number
  }> = []

  let goalsUpdated = 0
  let totalDiscrepancy = 0

  const synchronizedGoals = goals.map(goal => {
    const validation = validateGoalCurrentAmount(goal, transactions)
    
    validationResults.push({
      goalId: goal.id,
      goalName: goal.title || goal.name || "Unnamed Goal",
      wasAccurate: validation.isAccurate,
      oldAmount: validation.storedAmount,
      newAmount: validation.calculatedAmount,
      difference: validation.difference
    })

    if (!validation.isAccurate) {
      goalsUpdated++
      totalDiscrepancy += validation.difference
      return {
        ...goal,
        currentAmount: validation.calculatedAmount,
        updatedAt: new Date().toISOString()
      }
    }

    return goal
  })

  return {
    synchronizedGoals,
    goalsUpdated,
    totalDiscrepancy,
    validationResults
  }
}

/**
 * Generates a human-readable report of goal synchronization results
 */
export function generateSynchronizationReport(results: ReturnType<typeof synchronizeGoalAmountsWithTransactions>): string {
  const { goalsUpdated, totalDiscrepancy, validationResults } = results
  
  let report = `=== Goal Synchronization Report ===\n`
  report += `Total goals checked: ${validationResults.length}\n`
  report += `Goals updated: ${goalsUpdated}\n`
  report += `Total discrepancy corrected: ${totalDiscrepancy.toFixed(2)}\n\n`

  if (goalsUpdated > 0) {
    report += `Updated Goals:\n`
    validationResults
      .filter(result => !result.wasAccurate)
      .forEach(result => {
        report += `- ${result.goalName}: ${result.oldAmount.toFixed(2)} → ${result.newAmount.toFixed(2)} (diff: ${result.difference.toFixed(2)})\n`
      })
  } else {
    report += `All goal amounts are already accurate.\n`
  }

  return report
}

/**
 * One-time migration function to be called during app startup or version upgrade
 */
export function migrateGoalsToTransactionBasedCalculation(
  goals: Goal[], 
  transactions: Transaction[],
  autoSave: boolean = false
): {
  needsMigration: boolean
  migrationResults?: ReturnType<typeof synchronizeGoalAmountsWithTransactions>
  report?: string
} {
  const syncResults = synchronizeGoalAmountsWithTransactions(goals, transactions)
  
  if (syncResults.goalsUpdated === 0) {
    return {
      needsMigration: false
    }
  }

  const report = generateSynchronizationReport(syncResults)

  if (autoSave) {
    // In a real implementation, you would call the save functions here
    console.log("Auto-saving synchronized goals...")
    console.log(report)
  }

  return {
    needsMigration: true,
    migrationResults: syncResults,
    report
  }
}
