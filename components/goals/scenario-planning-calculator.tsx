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
  PiggyBank,
  Zap,
  ArrowRight,
  Info,
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
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
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

  const resetSimulation = () => {
    setPurchaseAmount("")
    setTimeframe("12")
    setMonthlySavings("")
  }

  const applyPreset = (scenario: typeof presetScenarios[0]) => {
    setPurchaseAmount(scenario.amount.toString())
    setTimeframe(scenario.timeframe.toString())
    // Auto-calculate a reasonable savings rate if not set
    if (!monthlySavings) {
      setMonthlySavings(Math.ceil(scenario.amount / scenario.timeframe).toString())
    }
  }

  return (
    <Card className="glass-card border-primary/20 overflow-hidden shadow-2xl relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-info to-primary/50 opacity-50" />

      <CardHeader className="border-b border-primary/5 py-4 px-6 bg-primary/5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-tight">
            <div className="p-2 bg-primary rounded-xl text-white shadow-lg shadow-primary/20">
              <Calculator className="w-5 h-5" />
            </div>
            Strategic Scenario Engine
          </CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={resetSimulation} className="h-8 w-8 rounded-full hover:bg-error/10 hover:text-error transition-colors">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset Simulation</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Badge className="bg-primary/20 text-primary border-primary/30 font-black text-[10px] tracking-widest uppercase px-2 py-0.5">
              Live Simulation
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-1 xl:grid-cols-12">
          {/* Left Panel: Inputs (4 cols) */}
          <div className="xl:col-span-4 p-6 border-r border-primary/5 space-y-8 bg-muted/5">
            {/* Presets Grid */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Target Blueprints
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {presetScenarios.map((scenario) => (
                  <Button
                    key={scenario.name}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(scenario)}
                    className="justify-start rounded-xl border-primary/10 hover:bg-primary/5 hover:border-primary/30 transition-all font-bold text-[10px] uppercase tracking-tighter px-3 h-9"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2" />
                    {scenario.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Core Parameters */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="purchase-amount" className="text-[11px] font-black uppercase tracking-widest text-primary/80">Acquisition Cost</Label>
                  <Badge variant="secondary" className="text-[10px] font-mono">{formatCurrency(Number(purchaseAmount) || 0, userProfile.currency, userProfile.customCurrency)}</Badge>
                </div>
                <div className="relative group/input">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black opacity-40">
                    {getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                  </span>
                  <Input
                    id="purchase-amount"
                    type="number"
                    placeholder="0.00"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                    className="h-11 pl-10 rounded-2xl bg-background border-primary/10 focus:border-primary font-black text-lg transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-info/80">Time Horizon</Label>
                  <Badge variant="outline" className="text-[10px] border-info/30 text-info">{timeframe} Months</Badge>
                </div>
                <Slider
                  value={[Number(timeframe)]}
                  min={1}
                  max={60}
                  step={1}
                  onValueChange={(val) => setTimeframe(val[0].toString())}
                  className="py-4"
                />
                <div className="flex justify-between text-[9px] font-black text-muted-foreground/40 uppercase tracking-tighter">
                  <span>1 Month</span>
                  <span>5 Years</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-success/80">Monthly Capacity</Label>
                  <Badge variant="outline" className="text-[10px] border-success/30 text-success">{formatCurrency(Number(monthlySavings) || 0, userProfile.currency, userProfile.customCurrency)}</Badge>
                </div>
                <Slider
                  value={[Number(monthlySavings)]}
                  min={0}
                  max={Math.max(monthlyIncome, Number(monthlySavings) || 1000)}
                  step={50}
                  onValueChange={(val) => setMonthlySavings(val[0].toString())}
                  className="py-4"
                />
                <div className="flex justify-between text-[9px] font-black text-muted-foreground/40 uppercase tracking-tighter">
                  <span>रु 0</span>
                  <span>Max Income</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Advisor Output (8 cols) */}
          <div className="xl:col-span-8 p-6 space-y-6">
            {scenarioResult ? (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                {/* Strategic Verdict HUD */}
                <div className={cn(
                  "relative rounded-[32px] border-2 p-6 overflow-hidden transition-all duration-700",
                  getFeasibilityColor(scenarioResult.feasibility).split(' ')[1] === 'bg-emerald-50' ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-500/20 shadow-emerald-500/10' :
                    getFeasibilityColor(scenarioResult.feasibility).split(' ')[1] === 'bg-blue-50' ? 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-500/20 shadow-blue-500/10' :
                      getFeasibilityColor(scenarioResult.feasibility).split(' ')[1] === 'bg-amber-50' ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-500/20 shadow-amber-500/10' :
                        'bg-red-50/50 dark:bg-red-950/10 border-red-500/20 shadow-red-500/10'
                )}>
                  {/* Background Decoration */}
                  <div className="absolute top-0 right-0 p-8 text-primary opacity-[0.03] scale-150 rotate-12">
                    <LayoutDashboard className="w-48 h-48" />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", getFeasibilityColor(scenarioResult.feasibility))}>
                          {scenarioResult.feasibility === 'excellent' && <ShieldCheck className="w-5 h-5" />}
                          {scenarioResult.feasibility === 'good' && <TrendingUp className="w-5 h-5" />}
                          {scenarioResult.feasibility === 'challenging' && <AlertTriangle className="w-5 h-5" />}
                          {scenarioResult.feasibility === 'impossible' && <TrendingDown className="w-5 h-5" />}
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-80">Simulation Verdict</h3>
                      </div>
                      <h2 className={cn("text-3xl font-black tracking-tighter uppercase", getFeasibilityColor(scenarioResult.feasibility).split(' ')[0])}>
                        {scenarioResult.feasibility} PLAN
                      </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-background/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-sm min-w-[140px]">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Total Project</p>
                        <p className="text-xl font-black font-mono tracking-tighter">
                          {formatCurrency(scenarioResult.purchaseAmount, userProfile.currency, userProfile.customCurrency)}
                        </p>
                      </div>
                      <div className="bg-background/40 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-sm min-w-[140px]">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Safety Buffer</p>
                        <p className={cn(
                          "text-xl font-black font-mono tracking-tighter",
                          scenarioResult.remainingBalance >= 0 ? 'text-emerald-500' : 'text-red-500'
                        )}>
                          {formatCurrency(scenarioResult.remainingBalance, userProfile.currency, userProfile.customCurrency)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-primary/5 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Recommendations List */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Strategic Advice
                      </p>
                      <div className="space-y-3">
                        {scenarioResult.recommendations.map((rec, i) => (
                          <div key={i} className="flex gap-3 text-[13px] font-bold leading-relaxed opacity-90 group/item">
                            <div className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0 group-hover/item:scale-150 transition-transform" />
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Goal Impacts Visualization */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-blue-500" /> Collateral Impact
                      </p>
                      <div className="space-y-2">
                        {scenarioResult.goalImpacts.length > 0 ? (
                          scenarioResult.goalImpacts.slice(0, 3).map((impact) => (
                            <div key={impact.goal.id} className="flex items-center justify-between p-3 rounded-xl bg-background/30 border border-white/5 group/impact hover:bg-white/10 transition-colors">
                              <span className="text-xs font-black truncate max-w-[120px]">{impact.goal.title || impact.goal.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-red-500">+{impact.delayMonths}m delay</span>
                                <Badge className={cn("text-[8px] font-black px-1.5 h-4 border-none uppercase shadow-sm", getSeverityColor(impact.severity))}>
                                  {impact.severity}
                                </Badge>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex items-center justify-center p-8 text-xs font-bold opacity-40 italic border border-dashed rounded-2xl">
                            Zero impact on existing milestones
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Capital Readiness Timeline */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                      <LayoutDashboard className="w-3.5 h-3.5" /> Project Capital Readiness
                    </h4>
                    <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                      {Math.min(100, Math.round((currentBalance / scenarioResult.purchaseAmount) * 100))}% Ready
                    </span>
                  </div>

                  <div className="p-6 rounded-[32px] bg-muted/20 border border-primary/5 relative group/progress">
                    <div className="relative h-2.5 bg-background/50 rounded-full overflow-hidden shadow-inner border border-primary/5">
                      <div
                        className="h-full bg-gradient-to-r from-primary via-info to-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                        style={{ width: `${Math.min(100, (currentBalance / scenarioResult.purchaseAmount) * 100)}%` }}
                      >
                        <div className="w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:24px_24px] animate-pulse" />
                      </div>
                    </div>

                    <div className="mt-6 p-4 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 flex items-center gap-5 group/banner hover:scale-[1.01] transition-all">
                      <div className="p-3 bg-white/20 rounded-xl group-hover/banner:rotate-6 transition-transform">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">Execution Strategy</p>
                        <p className="text-xs md:text-sm font-extrabold leading-tight">
                          Saving <span className="bg-white text-primary px-1.5 py-0.5 rounded-md mx-1">{formatCurrency(scenarioResult.monthlySavings, userProfile.currency, userProfile.customCurrency)}</span>
                          per month will complete this project in <span className="bg-white/20 px-1.5 py-0.5 rounded-md mx-1">{scenarioResult.timeframe} months</span>.
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 opacity-40 group-hover/banner:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center space-y-6 opacity-30 select-none">
                <div className="p-12 rounded-full bg-primary/5 border border-primary/10 relative">
                  <Calculator className="w-24 h-24 text-primary animate-pulse" />
                  <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-20" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-widest">Awaiting Parameters</h3>
                  <p className="text-sm font-bold max-w-xs">Enter your target acquisition cost to initialize the strategic simulation.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

  )
}