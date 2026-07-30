"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AmountInput } from "@/components/ui/amount-input"
import { Badge } from "@/components/ui/badge"
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  LayoutDashboard
} from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Goal, UserProfile } from "@/types/wallet"
import { formatCurrency, cn, getCurrencySymbol } from "@/lib/utils"

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

  const currencySymbol = getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)

  const scenarioResult = useMemo((): ScenarioResult | null => {
    const amount = Number.parseFloat(purchaseAmount) || 0
    const months = Number.parseInt(timeframe) || 12
    const savings = Number.parseFloat(monthlySavings) || 0

    if (amount <= 0) return null

    const totalSavings = savings * months
    const remainingBalance = currentBalance - amount
    const totalAvailable = currentBalance + totalSavings

    const goalImpacts: GoalImpact[] = goals
      .filter(goal => goal.currentAmount < goal.targetAmount)
      .map(goal => {
        const remaining = goal.targetAmount - goal.currentAmount
        const targetDate = new Date(goal.targetDate)
        const today = new Date()
        const monthsToTarget = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)))

        const currentMonthly = remaining / monthsToTarget
        const monthsAfterPurchase = Math.max(1, monthsToTarget - months)
        const newMonthly = remaining / monthsAfterPurchase
        const additionalMonthly = Math.max(0, newMonthly - currentMonthly)
        const delayMonths = months

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

    let feasibility: ScenarioResult['feasibility'] = 'excellent'
    if (totalAvailable < amount) {
      feasibility = 'impossible'
    } else if (remainingBalance < 0 && savings < amount / months) {
      feasibility = 'challenging'
    } else if (remainingBalance < monthlyIncome * 3) {
      feasibility = 'good'
    }

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
  }, [purchaseAmount, timeframe, monthlySavings, goals, currentBalance, monthlyIncome])

  const presetScenarios = [
    { name: "New Car", amount: 25000, timeframe: 24 },
    { name: "Home Down Payment", amount: 50000, timeframe: 36 },
    { name: "Vacation", amount: 5000, timeframe: 12 },
    { name: "Emergency Fund", amount: monthlyIncome * 6, timeframe: 12 },
    { name: "Wedding", amount: 20000, timeframe: 18 },
    { name: "Home Renovation", amount: 30000, timeframe: 24 }
  ]

  const resetSimulation = () => {
    setPurchaseAmount("")
    setTimeframe("12")
    setMonthlySavings("")
  }

  const applyPreset = (scenario: typeof presetScenarios[0]) => {
    setPurchaseAmount(scenario.amount.toString())
    setTimeframe(scenario.timeframe.toString())
    if (!monthlySavings) {
      setMonthlySavings(Math.ceil(scenario.amount / scenario.timeframe).toString())
    }
  }

  return (
    <Card className="border-primary/15 shadow-lg overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/30" />

      <CardHeader className="border-b border-primary/10 py-2.5 px-4 md:py-4 md:px-6 bg-primary/[0.03]">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 md:gap-3 min-w-0 text-sm md:text-lg font-black uppercase tracking-tight">
            <div className="p-1.5 md:p-2 bg-primary rounded-xl text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
              <Calculator className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <span className="truncate">Purchase Planner</span>
          </CardTitle>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={resetSimulation} className="h-7 w-7 md:h-8 md:w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
                    <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Badge className="bg-primary/15 text-primary border-primary/20 font-black text-[8px] md:text-[10px] tracking-widest uppercase px-1.5 md:px-2 py-0.5">
              Preview
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-1 xl:grid-cols-12">
          {/* Left Panel: Inputs */}
          <div className="xl:col-span-4 p-3 md:p-6 border-r border-primary/10 space-y-3 md:space-y-6 bg-muted/5">
            <div className="space-y-3 md:space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Quick Start
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {presetScenarios.map((scenario) => (
                  <Button
                    key={scenario.name}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(scenario)}
                    className="justify-start rounded-xl border-primary/15 hover:bg-primary/5 hover:border-primary/30 transition-all font-bold text-[10px] uppercase tracking-tighter px-2.5 h-8 md:px-3 md:h-9"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-1.5" />
                    {scenario.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4 md:space-y-6">
              <div className="space-y-2 md:space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="purchase-amount" className="text-[11px] font-black uppercase tracking-widest text-primary/80">Purchase Amount</Label>
                </div>
                <AmountInput
                  id="purchase-amount"
                  value={purchaseAmount}
                  onChange={setPurchaseAmount}
                  currencySymbol={currencySymbol}
                  className="h-10 md:h-11 rounded-2xl border-primary/15 focus:border-primary font-black text-base md:text-lg transition-all"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-primary/80">Timeframe</Label>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{timeframe} Months</Badge>
                </div>
                <Slider
                  value={[Number(timeframe)]}
                  min={1}
                  max={60}
                  step={1}
                  onValueChange={(val) => setTimeframe(val[0].toString())}
                  className="py-2 md:py-4"
                />
                <div className="flex justify-between text-[9px] font-black text-muted-foreground/40 uppercase tracking-tighter">
                  <span>1 Month</span>
                  <span>5 Years</span>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-primary/80">Monthly Savings</Label>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{formatCurrency(Number(monthlySavings) || 0, userProfile.currency, userProfile.customCurrency)}</Badge>
                </div>
                <Slider
                  value={[Number(monthlySavings)]}
                  min={0}
                  max={Math.max(monthlyIncome, Number(monthlySavings) || 1000)}
                  step={50}
                  onValueChange={(val) => setMonthlySavings(val[0].toString())}
                  className="py-2 md:py-4"
                />
                <div className="flex justify-between text-[9px] font-black text-muted-foreground/40 uppercase tracking-tighter">
                  <span>{currencySymbol} 0</span>
                  <span>Max Income</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Advisor Output */}
          <div className="xl:col-span-8 p-3 md:p-6 space-y-3 md:space-y-6">
            {scenarioResult ? (
              <div className="space-y-4 md:space-y-6 animate-in fade-in zoom-in-95 duration-500">
                {/* Strategic Verdict */}
                <div className="relative rounded-2xl md:rounded-[32px] border md:border-2 p-3 md:p-6 overflow-hidden transition-all duration-700 bg-card/50 border-primary/15 shadow-sm">
                  <div className="hidden md:block absolute top-0 right-0 p-8 text-primary opacity-[0.03] scale-150 rotate-12">
                    <LayoutDashboard className="w-48 h-48" />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 relative">
                    <div className="space-y-1 md:space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "p-1.5 rounded-lg",
                          scenarioResult.feasibility === 'excellent' && "bg-primary/15 text-primary",
                          scenarioResult.feasibility === 'good' && "bg-primary/10 text-primary",
                          scenarioResult.feasibility === 'challenging' && "bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
                          scenarioResult.feasibility === 'impossible' && "bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400",
                        )}>
                          {scenarioResult.feasibility === 'excellent' && <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />}
                          {scenarioResult.feasibility === 'good' && <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />}
                          {scenarioResult.feasibility === 'challenging' && <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />}
                          {scenarioResult.feasibility === 'impossible' && <TrendingDown className="w-4 h-4 md:w-5 md:h-5" />}
                        </div>
                        <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/80">Result</h3>
                      </div>
                      <h2 className={cn(
                        "text-2xl md:text-3xl font-black tracking-tighter uppercase",
                        scenarioResult.feasibility === 'excellent' && "text-primary",
                        scenarioResult.feasibility === 'good' && "text-primary",
                        scenarioResult.feasibility === 'challenging' && "text-amber-600 dark:text-amber-400",
                        scenarioResult.feasibility === 'impossible' && "text-red-600 dark:text-red-400",
                      )}>
                        {scenarioResult.feasibility} PLAN
                      </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                      <div className="bg-background/60 backdrop-blur-md rounded-xl md:rounded-2xl p-2.5 md:p-4 border border-primary/10 shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5 md:mb-1">Total Cost</p>
                        <p className="text-base md:text-xl font-black font-mono tracking-tighter">
                          {formatCurrency(scenarioResult.purchaseAmount, userProfile.currency, userProfile.customCurrency)}
                        </p>
                      </div>
                      <div className="bg-background/60 backdrop-blur-md rounded-xl md:rounded-2xl p-2.5 md:p-4 border border-primary/10 shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5 md:mb-1">Remaining Balance</p>
                        <p className={cn(
                          "text-base md:text-xl font-black font-mono tracking-tighter",
                          scenarioResult.remainingBalance >= 0 ? 'text-primary' : 'text-red-500'
                        )}>
                          {formatCurrency(scenarioResult.remainingBalance, userProfile.currency, userProfile.customCurrency)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 md:mt-8 pt-3 md:pt-6 border-t border-primary/10 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8">
                    <div className="space-y-3 md:space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-primary" /> Recommendations
                      </p>
                      <div className="space-y-2 md:space-y-3">
                        {scenarioResult.recommendations.length > 0 ? scenarioResult.recommendations.map((rec, i) => (
                          <div key={i} className="flex gap-3 text-xs md:text-[13px] font-bold leading-relaxed text-foreground/80 group/item">
                            <div className="w-1 h-1 rounded-full bg-primary mt-1.5 md:mt-2 shrink-0 group-hover/item:scale-150 transition-transform" />
                            {rec}
                          </div>
                        )) : (
                          <div className="text-xs md:text-[13px] font-bold text-muted-foreground/60 italic">
                            No adjustments needed , this plan aligns with your current trajectory.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-primary" /> Goal Impact
                      </p>
                      <div className="space-y-2">
                        {scenarioResult.goalImpacts.length > 0 ? (
                          scenarioResult.goalImpacts.slice(0, 3).map((impact) => (
                            <div key={impact.goal.id} className="flex items-center justify-between p-2 md:p-3 rounded-xl bg-muted/30 border border-primary/10 hover:bg-muted/50 transition-colors">
                              <span className="text-[11px] md:text-xs font-black truncate max-w-[100px] md:max-w-[120px]">{impact.goal.title || impact.goal.name}</span>
                              <div className="flex items-center gap-2 md:gap-3">
                                <span className="text-[9px] md:text-[10px] font-bold text-destructive">+{impact.delayMonths}m delay</span>
                                <Badge className={cn(
                                  "text-[7px] md:text-[8px] font-black px-1 md:px-1.5 h-3.5 md:h-4 border-none uppercase shadow-sm",
                                  impact.severity === 'low' && "bg-primary/10 text-primary",
                                  impact.severity === 'medium' && "bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
                                  impact.severity === 'high' && "bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400",
                                )}>
                                  {impact.severity}
                                </Badge>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex items-center justify-center p-6 md:p-8 text-xs font-bold text-muted-foreground/50 italic border border-dashed rounded-2xl">
                            Zero impact on existing milestones
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Savings Progress */}
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between gap-2 whitespace-nowrap">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-1.5 truncate">
                      <LayoutDashboard className="w-3.5 h-3.5 text-primary shrink-0" /> Savings Progress
                    </h4>
                    <span className="text-[10px] md:text-xs font-black text-primary bg-primary/10 px-1.5 md:px-2 py-0.5 rounded-lg shrink-0">
                      {Math.min(100, Math.round((currentBalance / scenarioResult.purchaseAmount) * 100))}% Ready
                    </span>
                  </div>

                  <div className="p-3 md:p-6 rounded-2xl md:rounded-[32px] bg-muted/20 border border-primary/10 relative group/progress">
                    <div className="relative h-2 bg-muted-foreground/10 rounded-full overflow-hidden shadow-inner border border-primary/5">
                      <div
                        className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary/60 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                        style={{ width: `${Math.min(100, (currentBalance / scenarioResult.purchaseAmount) * 100)}%` }}
                      >
                        <div className="w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:24px_24px] animate-pulse" />
                      </div>
                    </div>

                    <div className="mt-3 md:mt-6 p-2.5 md:p-4 rounded-xl md:rounded-2xl bg-primary text-primary-foreground shadow-lg md:shadow-xl shadow-primary/20 flex items-center gap-2 md:gap-5 group/banner hover:scale-[1.01] transition-all">
                      <div className="hidden sm:block p-2 md:p-3 bg-primary-foreground/20 rounded-xl group-hover/banner:rotate-6 transition-transform">
                        <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary-foreground/60 mb-0.5">Your Plan</p>
                        <p className="text-[10px] md:text-sm font-extrabold leading-tight text-primary-foreground/90">
                          Saving <span className="bg-primary-foreground/20 text-primary-foreground px-1 md:px-1.5 py-0.5 rounded-md mx-0.5 md:mx-1">{formatCurrency(scenarioResult.monthlySavings, userProfile.currency, userProfile.customCurrency)}</span>
                          per month will complete this in <span className="bg-primary-foreground/20 px-1 md:px-1.5 py-0.5 rounded-md mx-0.5 md:mx-1">{scenarioResult.timeframe} months</span>.
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground/40 group-hover/banner:translate-x-1 transition-transform shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[200px] md:min-h-[400px] flex flex-col items-center justify-center text-center space-y-3 md:space-y-6 opacity-30 select-none">
                <div className="p-6 md:p-12 rounded-full bg-primary/5 border border-primary/10 relative">
                  <Calculator className="w-12 h-12 md:w-24 md:h-24 text-primary animate-pulse" />
                  <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-20" />
                </div>
                <div className="space-y-1 md:space-y-2">
                  <h3 className="text-lg md:text-xl font-black uppercase tracking-widest">Enter an Amount</h3>
                   <p className="text-xs md:text-sm font-bold max-w-xs">Enter a purchase amount to see how it affects your goals.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
