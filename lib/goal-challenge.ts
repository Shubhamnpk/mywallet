import type { Goal, GoalChallengePlan } from "@/types/wallet"

const addMonths = (value: Date, months: number) => {
  const next = new Date(value)
  next.setMonth(next.getMonth() + months)
  return next
}

const getNormalizedChallengePlan = (goal: Goal): GoalChallengePlan | null => {
  const plan = goal.challengePlan
  if (!plan || plan.type !== "hard-plan") return null

  const nepalPercent = Number.isFinite(plan.allocation?.nepalPercent) ? plan.allocation.nepalPercent : 50
  const ukPercent = Number.isFinite(plan.allocation?.ukPercent) ? plan.allocation.ukPercent : 50

  return {
    ...plan,
    mode: plan.mode === "hard" ? "hard" : "easy",
    baseTargetAmount: Number.isFinite(plan.baseTargetAmount) ? plan.baseTargetAmount : goal.targetAmount,
    penaltyAmount: Number.isFinite(plan.penaltyAmount) ? plan.penaltyAmount : 50,
    graceMonths: Number.isFinite(plan.graceMonths) && plan.graceMonths > 0 ? plan.graceMonths : 1,
    allocation: {
      nepalPercent,
      ukPercent,
    },
    hardModeRewardPoints: Number.isFinite(plan.hardModeRewardPoints) ? plan.hardModeRewardPoints : 10,
  }
}

const buildPenaltyHistory = (goal: Goal, now = new Date()) => {
  const plan = getNormalizedChallengePlan(goal)
  if (!plan) {
    return {
      plan: null,
      penaltyHistory: goal.challengePenaltyHistory || [],
      currentDeadline: new Date(goal.targetDate),
      effectiveTargetAmount: goal.targetAmount,
      penaltyTotal: 0,
      changed: false,
    }
  }

  const existingHistory = Array.isArray(goal.challengePenaltyHistory) ? goal.challengePenaltyHistory : []
  const penaltyHistory = [...existingHistory]
  let changed = !Array.isArray(goal.challengePenaltyHistory)
  let currentDeadline = new Date(goal.targetDate)
  let effectiveTargetAmount = plan.baseTargetAmount

  for (const snapshot of existingHistory) {
    currentDeadline = new Date(snapshot.newDeadline)
    effectiveTargetAmount = snapshot.effectiveTargetAmount
  }

  while (now > currentDeadline && goal.currentAmount < effectiveTargetAmount) {
    const previousDeadline = new Date(currentDeadline)
    currentDeadline = addMonths(currentDeadline, plan.graceMonths)
    effectiveTargetAmount += plan.penaltyAmount

    penaltyHistory.push({
      id: `goal-penalty-${goal.id}-${penaltyHistory.length + 1}`,
      cycleNumber: penaltyHistory.length + 1,
      penaltyAmount: plan.penaltyAmount,
      previousDeadline: previousDeadline.toISOString(),
      newDeadline: currentDeadline.toISOString(),
      effectiveTargetAmount,
      appliedAt: now.toISOString(),
    })
    changed = true
  }

  return {
    plan,
    penaltyHistory,
    currentDeadline,
    effectiveTargetAmount,
    penaltyTotal: penaltyHistory.reduce((sum, snapshot) => sum + snapshot.penaltyAmount, 0),
    changed,
  }
}

export const syncGoalChallengeState = (goal: Goal, now = new Date()) => {
  const { plan, penaltyHistory, changed } = buildPenaltyHistory(goal, now)
  if (!plan) return goal

  const nextPoints = goal.challengePoints || { total: 0, history: [] }
  const pointsChanged = !goal.challengePoints
  if (!changed && !pointsChanged) return goal

  return {
    ...goal,
    challengePenaltyHistory: penaltyHistory,
    challengePoints: nextPoints,
  }
}

export const getGoalChallengeSummary = (goal: Goal, now = new Date()) => {
  const { plan, penaltyHistory, currentDeadline, effectiveTargetAmount, penaltyTotal } = buildPenaltyHistory(goal, now)
  if (!plan) return null

  const safeCurrentAmount = Number.isFinite(goal.currentAmount) ? goal.currentAmount : 0
  const penaltiesApplied = penaltyHistory.length

  const remainingAmount = Math.max(0, effectiveTargetAmount - safeCurrentAmount)
  const progress = effectiveTargetAmount > 0 ? Math.min((safeCurrentAmount / effectiveTargetAmount) * 100, 100) : 0

  return {
    plan,
    penaltiesApplied,
    penaltyTotal,
    effectiveTargetAmount,
    remainingAmount,
    progress,
    currentDeadline,
    nextPenaltyDate: safeCurrentAmount >= effectiveTargetAmount ? null : currentDeadline,
    penaltyHistory,
    points: goal.challengePoints || { total: 0, history: [] },
    utilization: {
      nepalPercent: plan.allocation.nepalPercent,
      ukPercent: plan.allocation.ukPercent,
      countsInvestmentAsExpense: plan.mode === "hard",
      hardModeRewardPoints: plan.hardModeRewardPoints,
    },
  }
}

export const getGoalEffectiveTargetAmount = (goal: Goal, now = new Date()) =>
  getGoalChallengeSummary(goal, now)?.effectiveTargetAmount ?? goal.targetAmount

export const getGoalEffectiveRemainingAmount = (goal: Goal, now = new Date()) =>
  getGoalChallengeSummary(goal, now)?.remainingAmount ?? Math.max(0, goal.targetAmount - goal.currentAmount)

export const getGoalEffectiveProgress = (goal: Goal, now = new Date()) =>
  getGoalChallengeSummary(goal, now)?.progress ?? (goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0)
