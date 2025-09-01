"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  Target,
  PiggyBank
} from "lucide-react"
import type { Goal, UserProfile } from "@/types/wallet"
import { formatCurrency } from "@/lib/utils"

interface ScenarioPlanningCalculatorProps {
  goals: Goal[]
  userProfile: UserProfile
  currentBalance: number
  monthlyIncome: number
}

interface ScenarioResult {
  purchaseAmount: number
  timeframe: number
  monthlySavings: number
  totalSavings: number
  remainingBalance: number
  goalImpacts: GoalImpact[]
  feasibility: 'excellent' | 'good' | 'challenging' | 'impossible'
  recommendations: string[]
}

interface GoalImpact {
  goal: Goal
  delayMonths: number
  additionalMonthly: number
  totalImpact: number
  severity: 'low' | 'medium' | 'high'
}

export function ScenarioPlanningCalculator({
  goals,
  userProfile,
  currentBalance,
  monthlyIncome
}: ScenarioPlanningCalculatorProps) {
  const [purchaseAmount, setPurchaseAmount] = useState("")
  const [timeframe, setTimeframe] = useState("12")
  const [monthlySavings, setMonthlySavings] = useState("")

  const scenarioResult = useMemo((): ScenarioResult | null => {
    const amount = Number.parseFloat(purchaseAmount) || 0
    const months = Number.parseInt(timeframe) || 12
    const savings = Number.parseFloat(monthlySavings) || 0

    if (amount <= 0) return null

    const totalSavings = savings * months
    const remainingBalance = currentBalance - amount
    const totalAvailable = currentBalance + totalSavings

    // Calculate goal impacts
    const goalImpacts: GoalImpact[] = goals
      .filter(goal => goal.currentAmount < goal.targetAmount)
      .map(goal => {
        const remaining = goal.targetAmount - goal.currentAmount
        const targetDate = new Date(goal.targetDate)
        const today = new Date()
        const monthsToTarget = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)))

        const currentMonthly = remaining / monthsToTarget
        const newMonthly = remaining / Math.max(1, monthsToTarget - months)
        const additionalMonthly = Math.max(0, newMonthly - currentMonthly)
        const delayMonths = monthsToTarget - Math.max(1, monthsToTarget - months)

        let severity: 'low' | 'medium' | 'high' = 'low'
        if (delayMonths > 6) severity = 'high'
        else if (delayMonths > 3) severity = 'medium'

        return {
          goal,
          delayMonths,
          additionalMonthly,
          totalImpact: additionalMonthly * months,
          severity
        }
      })

    // Determine feasibility
    let feasibility: ScenarioResult['feasibility'] = 'excellent'
    if (totalAvailable < amount) {
      feasibility = 'impossible'
    } else if (remainingBalance < 0 && savings < amount / months) {
      feasibility = 'challenging'
    } else if (remainingBalance < monthlyIncome * 3) {
      feasibility = 'good'
    }

    // Generate recommendations
    const recommendations: string[] = []
    if (feasibility === 'impossible') {
      recommendations.push("Consider increasing your savings rate or extending the timeframe")
      recommendations.push("Look for ways to reduce the purchase amount")
    } else if (feasibility === 'challenging') {
      recommendations.push("Build an emergency fund first")
      recommendations.push("Consider part-time work or side income")
    } else if (remainingBalance < monthlyIncome * 6) {
      recommendations.push("Maintain at least 6 months of expenses in savings")
    }

    if (goalImpacts.some(impact => impact.severity === 'high')) {
      recommendations.push("This purchase may significantly delay your financial goals")
    }

    return {
      purchaseAmount: amount,
      timeframe: months,
      monthlySavings: savings,
      totalSavings,
      remainingBalance,
      goalImpacts,
      feasibility,
      recommendations
    }
  }, [purchaseAmount, timeframe, monthlySavings, goals, currentBalance])

  const getFeasibilityColor = (feasibility: ScenarioResult['feasibility']) => {
    switch (feasibility) {
      case 'excellent': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'challenging': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'impossible': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const getSeverityColor = (severity: GoalImpact['severity']) => {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-50'
      case 'medium': return 'text-amber-600 bg-amber-50'
      case 'high': return 'text-red-600 bg-red-50'
    }
  }

  const presetScenarios = [
    { name: "New Car", amount: 25000, timeframe: 24 },
    { name: "Home Down Payment", amount: 50000, timeframe: 36 },
    { name: "Vacation", amount: 5000, timeframe: 12 },
    { name: "Emergency Fund", amount: monthlyIncome * 6, timeframe: 12 },
    { name: "Wedding", amount: 20000, timeframe: 18 },
    { name: "Home Renovation", amount: 30000, timeframe: 24 }
  ]

  const applyPreset = (scenario: typeof presetScenarios[0]) => {
    setPurchaseAmount(scenario.amount.toString())
    setTimeframe(scenario.timeframe.toString())
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Scenario Planning Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Scenarios */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Quick Scenarios</Label>
          <div className="flex flex-wrap gap-2">
            {presetScenarios.map((scenario) => (
              <Button
                key={scenario.name}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(scenario)}
                className="text-xs"
              >
                {scenario.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchase-amount">Purchase Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="purchase-amount"
                type="number"
                placeholder="0"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeframe">Timeframe (Months)</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 months</SelectItem>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="12">1 year</SelectItem>
                <SelectItem value="18">18 months</SelectItem>
                <SelectItem value="24">2 years</SelectItem>
                <SelectItem value="36">3 years</SelectItem>
                <SelectItem value="48">4 years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly-savings">Monthly Savings</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="monthly-savings"
                type="number"
                placeholder="0"
                value={monthlySavings}
                onChange={(e) => setMonthlySavings(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {scenarioResult && (
          <div className="space-y-6">
            {/* Feasibility Overview */}
            <div className="p-4 rounded-lg border-2" style={{
              backgroundColor: getFeasibilityColor(scenarioResult.feasibility).split(' ')[1],
              borderColor: getFeasibilityColor(scenarioResult.feasibility).split(' ')[3]
            }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  {scenarioResult.feasibility === 'excellent' && <CheckCircle2 className="w-5 h-5" />}
                  {scenarioResult.feasibility === 'good' && <TrendingUp className="w-5 h-5" />}
                  {scenarioResult.feasibility === 'challenging' && <AlertTriangle className="w-5 h-5" />}
                  {scenarioResult.feasibility === 'impossible' && <TrendingDown className="w-5 h-5" />}
                  Scenario Feasibility
                </h3>
                <Badge className={getFeasibilityColor(scenarioResult.feasibility)}>
                  {scenarioResult.feasibility.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Needed</p>
                  <p className="font-semibold">
                    {formatCurrency(scenarioResult.purchaseAmount, userProfile.currency, userProfile.customCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Available Now</p>
                  <p className="font-semibold">
                    {formatCurrency(currentBalance, userProfile.currency, userProfile.customCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Will Save</p>
                  <p className="font-semibold">
                    {formatCurrency(scenarioResult.totalSavings, userProfile.currency, userProfile.customCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining Balance</p>
                  <p className={`font-semibold ${
                    scenarioResult.remainingBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(scenarioResult.remainingBalance, userProfile.currency, userProfile.customCurrency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Goal Impacts */}
            {scenarioResult.goalImpacts.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Impact on Financial Goals
                </h4>

                <div className="space-y-3">
                  {scenarioResult.goalImpacts.map((impact) => (
                    <div key={impact.goal.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{impact.goal.title || impact.goal.name}</span>
                        <Badge className={getSeverityColor(impact.severity)}>
                          {impact.severity.toUpperCase()} IMPACT
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Delay</p>
                          <p className="font-semibold">{impact.delayMonths} months</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Extra Monthly</p>
                          <p className="font-semibold">
                            {formatCurrency(impact.additionalMonthly, userProfile.currency, userProfile.customCurrency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Impact</p>
                          <p className="font-semibold">
                            {formatCurrency(impact.totalImpact, userProfile.currency, userProfile.customCurrency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {scenarioResult.recommendations.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-2">
                  <PiggyBank className="w-4 h-4" />
                  Recommendations
                </h4>
                <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                  {scenarioResult.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Savings Progress Visualization */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Savings Progress
              </h4>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current Balance</span>
                  <span>{formatCurrency(currentBalance, userProfile.currency, userProfile.customCurrency)}</span>
                </div>
                <Progress
                  value={Math.min(100, (currentBalance / scenarioResult.purchaseAmount) * 100)}
                  className="h-2"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>0</span>
                  <span>{formatCurrency(scenarioResult.purchaseAmount, userProfile.currency, userProfile.customCurrency)}</span>
                </div>
              </div>

              {scenarioResult.monthlySavings > 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Monthly Savings Plan:</strong> Save{' '}
                    {formatCurrency(scenarioResult.monthlySavings, userProfile.currency, userProfile.customCurrency)}{' '}
                    per month for {scenarioResult.timeframe} months to reach your goal.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}