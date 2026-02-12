"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useWalletData } from "@/contexts/wallet-data-context"
import { cn } from "@/lib/utils"
import type { UserProfile, Goal } from "@/types/wallet"

import { formatCurrency } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"
import {
  Target,
  PiggyBank,
  Home,
  Car,
  GraduationCap,
  Heart,
  Plane,
  ShoppingBag,
  Briefcase,
  Star,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  Trophy
} from "lucide-react"

interface GoalDialogProps {
  isOpen: boolean
  onClose: () => void
  userProfile: UserProfile
  editingGoal?: Goal | null
}

const GOAL_CATEGORIES = [
  {
    id: "emergency",
    name: "Emergency Fund",
    icon: AlertTriangle,
    color: "text-error bg-error/10 border-error/20",
    description: "Build a safety net for unexpected expenses (3-6 months of living costs)",
  },
  {
    id: "savings",
    name: "General Savings",
    icon: PiggyBank,
    color: "text-primary bg-primary/10 border-primary/20",
    description: "Save for future needs and opportunities",
  },
  {
    id: "house",
    name: "Home Purchase",
    icon: Home,
    color: "text-info bg-info/10 border-info/20",
    description: "Save for buying, building, or improving a home",
  },
  {
    id: "car",
    name: "Vehicle",
    icon: Car,
    color: "text-muted-foreground bg-muted border-muted-foreground/20",
    description: "Save for a car, motorcycle, or transportation",
  },
  {
    id: "education",
    name: "Education",
    icon: GraduationCap,
    color: "text-primary bg-primary/10 border-primary/20",
    description: "Fund education, courses, or skill development",
  },
  {
    id: "health",
    name: "Health & Wellness",
    icon: Heart,
    color: "text-error bg-error/10 border-error/20",
    description: "Medical expenses, insurance, and health investments",
  },
  {
    id: "travel",
    name: "Travel & Spiritual",
    icon: Plane,
    color: "text-info bg-info/10 border-info/20",
    description: "Vacations, pilgrimages, and travel experiences",
  },
  {
    id: "wedding",
    name: "Wedding & Ceremonies",
    icon: Star,
    color: "text-warning bg-warning/10 border-warning/20",
    description: "Wedding expenses and traditional ceremonies",
  },
  {
    id: "retirement",
    name: "Retirement",
    icon: Trophy,
    color: "text-warning bg-warning/10 border-warning/20",
    description: "Save for retirement and golden years",
  },
  {
    id: "business",
    name: "Business/Investment",
    icon: Briefcase,
    color: "text-primary bg-primary/10 border-primary/20",
    description: "Start a business or invest in opportunities",
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: ShoppingBag,
    color: "text-warning bg-warning/10 border-warning/20",
    description: "Consumer goods and personal purchases",
  },
  {
    id: "other",
    name: "Other",
    icon: Target,
    color: "text-muted-foreground bg-muted border-muted-foreground/20",
    description: "Custom goals and personal objectives",
  },
]

const PRIORITY_LEVELS = [
  { id: "low", name: "Low", color: "text-info bg-info/10 border-info/20", icon: Star, description: "Nice to have, flexible timeline" },
  { id: "medium", name: "Medium", color: "text-warning bg-warning/10 border-warning/20", icon: Star, description: "Important, moderate urgency" },
  { id: "high", name: "High", color: "text-error bg-error/10 border-error/20", icon: AlertTriangle, description: "Critical, needs immediate attention" },
]

const GOAL_TEMPLATES = [
  {
    name: "Emergency Fund",
    category: "emergency",
    targetAmount: 10000,
    description: "Build a 3-6 month emergency fund for unexpected expenses",
    priority: "high" as const,
  },
  {
    name: "Wedding Fund",
    category: "wedding",
    targetAmount: 20000,
    description: "Save for wedding expenses and traditional ceremonies",
    priority: "high" as const,
  },
  {
    name: "Pilgrimage Fund",
    category: "travel",
    targetAmount: 5000,
    description: "Save for spiritual journeys and religious pilgrimages",
    priority: "medium" as const,
  },
  {
    name: "Home Purchase",
    category: "house",
    targetAmount: 50000,
    description: "Save for buying or building your family home",
    priority: "high" as const,
  },
  {
    name: "Education Fund",
    category: "education",
    targetAmount: 25000,
    description: "Save for education, courses, or skill development",
    priority: "high" as const,
  },
  {
    name: "Retirement Fund",
    category: "retirement",
    targetAmount: 100000,
    description: "Save for retirement and ensure family security",
    priority: "medium" as const,
  },
  {
    name: "Business Startup",
    category: "business",
    targetAmount: 15000,
    description: "Save to start your own business or investment",
    priority: "medium" as const,
  },
  {
    name: "Festival Shopping",
    category: "shopping",
    targetAmount: 2000,
    description: "Save for festive shopping and family celebrations",
    priority: "low" as const,
  },
]

export function GoalDialog({ isOpen, onClose, userProfile, editingGoal }: GoalDialogProps) {
  const { addGoal, updateGoal } = useWalletData()
  const [formData, setFormData] = useState({
    title: "",
    targetAmount: "",
    targetDate: "",
    description: "",
    category: "savings",
    priority: "medium" as "low" | "medium" | "high",
    autoContribute: false,
    contributionAmount: "",
    contributionFrequency: "monthly" as "daily" | "weekly" | "monthly",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showTemplates, setShowTemplates] = useState(!editingGoal)

  const applyTemplate = (template: typeof GOAL_TEMPLATES[0]) => {
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

    setFormData({
      ...formData,
      title: template.name,
      targetAmount: template.targetAmount.toString(),
      targetDate: oneYearFromNow.toISOString().split("T")[0],
      description: template.description,
      category: template.category,
      priority: template.priority,
    })
    setShowTemplates(false)
  }

  const currencySymbol = useMemo(
    () => getCurrencySymbol(userProfile?.currency || "USD", (userProfile as any)?.customCurrency),
    [userProfile?.currency, (userProfile as any)?.customCurrency],
  )

  // Calculate goal insights
  const goalInsights = useMemo(() => {
    if (!formData.targetAmount || !formData.targetDate) return null

    const targetAmount = Number.parseFloat(formData.targetAmount)
    const targetDate = new Date(formData.targetDate)
    const today = new Date()

    const monthsDiff = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    const monthlyNeeded = targetAmount / monthsDiff

    const weeksDiff = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7)))
    const weeklyNeeded = targetAmount / weeksDiff

    return {
      monthsToGoal: monthsDiff,
      monthlyContribution: monthlyNeeded,
      weeklyContribution: weeklyNeeded,
      totalTime: monthsDiff,
    }
  }, [formData.targetAmount, formData.targetDate])

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        title: editingGoal.title || editingGoal.name || "",
        targetAmount: editingGoal.targetAmount.toString(),
        targetDate: editingGoal.targetDate.split("T")[0], // Format date for input
        description: editingGoal.description || "",
        category: editingGoal.category || "savings",
        priority: editingGoal.priority || "medium",
        autoContribute: editingGoal.autoContribute || false,
        contributionAmount: editingGoal.contributionAmount?.toString() || "",
        contributionFrequency: editingGoal.contributionFrequency || "monthly",
      })
    } else {
      setFormData({
        title: "",
        targetAmount: "",
        targetDate: "",
        description: "",
        category: "savings",
        priority: "medium",
        autoContribute: false,
        contributionAmount: "",
        contributionFrequency: "monthly",
      })
    }
    setErrors({})
  }, [editingGoal, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Goal name is required"
    }

    if (!formData.targetAmount || Number.parseFloat(formData.targetAmount) <= 0) {
      newErrors.targetAmount = "Please enter a valid target amount"
    }

    if (!formData.targetDate) {
      newErrors.targetDate = "Target date is required"
    } else {
      const targetDate = new Date(formData.targetDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (targetDate <= today) {
        newErrors.targetDate = "Target date must be in the future"
      }
    }

    if (formData.autoContribute && (!formData.contributionAmount || Number.parseFloat(formData.contributionAmount) <= 0)) {
      newErrors.contributionAmount = "Contribution amount is required when auto-contribute is enabled"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const goalData = {
      title: formData.title,
      targetAmount: Number.parseFloat(formData.targetAmount),
      targetDate: formData.targetDate,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      autoContribute: formData.autoContribute,
      ...(formData.autoContribute && {
        contributionAmount: Number.parseFloat(formData.contributionAmount),
        contributionFrequency: formData.contributionFrequency,
      }),
    }

    if (editingGoal) {
      updateGoal(editingGoal.id, goalData)
    } else {
      addGoal({
        ...goalData,
        createdAt: new Date().toISOString(),
      } as any)
    }

    setFormData({
      title: "",
      targetAmount: "",
      targetDate: "",
      description: "",
      category: "savings",
      priority: "medium",
      autoContribute: false,
      contributionAmount: "",
      contributionFrequency: "monthly",
    })
    setErrors({})
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-3xl border-primary/20 rounded-[32px] p-6 shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary glow-primary">
              <Target className="w-5 h-5" />
            </div>
            {editingGoal ? "Calibrate Goal" : "Initialize Goal"}
          </DialogTitle>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1.5 ml-12">
            {editingGoal ? "Updating manifestation parameters" : "Configuring accumulation vector"}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Goal Templates Selection Digital Showroom */}
          {showTemplates && !editingGoal && (
            <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden group/templates">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                      <Star className="w-5 h-5 text-warning animate-pulse" />
                      Digital Goal Blueprint
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">Accelerate your journey with curated templates</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplates(false)}
                    className="rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/10"
                  >
                    Custom Build
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {GOAL_TEMPLATES.map((template, index) => {
                    const category = GOAL_CATEGORIES.find(c => c.id === template.category)
                    const IconComponent = category?.icon || Target
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="group/template-btn p-3.5 rounded-2xl border border-primary/10 bg-background/50 text-left transition-all hover:border-primary hover:shadow-xl hover:scale-[1.02] relative overflow-hidden"
                      >
                        <div className={cn("p-2 rounded-xl w-fit mb-3 transition-transform group-hover/template-btn:scale-110", category?.color)}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="font-black text-[12px] tracking-tight mb-0.5">{template.name}</div>
                        <div className="text-lg font-black font-mono tracking-tighter text-primary">
                          {currencySymbol}{template.targetAmount.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground mt-2 line-clamp-2 leading-tight">
                          {template.description}
                        </div>

                        {/* Interactive Accent */}
                        <div className="absolute -right-2 -bottom-2 opacity-0 group-hover/template-btn:opacity-10 transition-opacity">
                          <IconComponent className="w-16 h-16" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Core Configuration Panels */}
          <div className="grid grid-cols-1 gap-6">
            <Card className="glass-card border-primary/5">
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="title" className="text-[11px] font-black uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Target className="w-3.5 h-3.5" /> Goal Identity
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Tesla Roadster fund"
                      className={cn("h-10 rounded-xl bg-muted/30 border-primary/10 font-black", errors.title && "border-error ring-1 ring-error/20")}
                    />
                    {errors.title && <p className="text-[10px] font-black uppercase text-error ml-1">{errors.title}</p>}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="targetAmount" className="text-[11px] font-black uppercase tracking-widest ml-1 flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5" /> Capital Target
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary/40">{currencySymbol}</div>
                      <Input
                        id="targetAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.targetAmount}
                        onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                        placeholder="0.00"
                        className={cn("h-10 pl-10 rounded-xl bg-muted/30 border-primary/10 font-black font-mono", errors.targetAmount && "border-error ring-1 ring-error/20")}
                      />
                    </div>
                    {errors.targetAmount && <p className="text-[10px] font-black uppercase text-error ml-1">{errors.targetAmount}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="targetDate" className="text-[11px] font-black uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" /> Maturity Date
                    </Label>
                    <Input
                      id="targetDate"
                      type="date"
                      value={formData.targetDate}
                      onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                      min={new Date().toISOString().split("T")[0]}
                      className={cn("h-10 rounded-xl bg-muted/30 border-primary/10 font-black uppercase", errors.targetDate && "border-error ring-1 ring-error/20")}
                    />
                    {errors.targetDate && <p className="text-[10px] font-black uppercase text-error ml-1">{errors.targetDate}</p>}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="category" className="text-[11px] font-black uppercase tracking-widest ml-1">Asset Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-primary/10 font-black">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-primary/10">
                        {GOAL_CATEGORIES.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-3">
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="description" className="text-[11px] font-black uppercase tracking-widest ml-1">Strategy Notes</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your vision for this goal..."
                    rows={2}
                    className="rounded-2xl bg-muted/30 border-primary/10 font-medium min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card border-primary/5">
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="priority" className="text-[11px] font-black uppercase tracking-widest ml-1">Strategic Priority</Label>
                    <Select value={formData.priority} onValueChange={(value: "low" | "medium" | "high") => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-primary/10 font-black">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-primary/10">
                        {PRIORITY_LEVELS.map((priority) => (
                          <SelectItem key={priority.id} value={priority.id}>
                            <div className="flex items-center gap-2">
                              {priority.name} Vision
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground px-1 leading-relaxed italic">
                    {PRIORITY_LEVELS.find(p => p.id === formData.priority)?.description}
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-primary/5 overflow-hidden">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-[11px] font-black uppercase tracking-widest ml-1">Auto-Stream</Label>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5">Automated capital flow</p>
                    </div>
                    <button
                      title="Toggle Auto-Contribute"
                      type="button"
                      onClick={() => setFormData({ ...formData, autoContribute: !formData.autoContribute })}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 shadow-inner",
                        formData.autoContribute ? "bg-primary glow-primary" : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white shadow-xl transition-all duration-500",
                          formData.autoContribute ? "translate-x-6 scale-110" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  {formData.autoContribute && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary/40">{currencySymbol}</div>
                        <Input
                          id="contributionAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.contributionAmount}
                          onChange={(e) => setFormData({ ...formData, contributionAmount: e.target.value })}
                          placeholder="0.00"
                          className={cn("h-10 pl-10 rounded-xl bg-muted/30 border-primary/10 font-black font-mono", errors.contributionAmount && "border-error")}
                        />
                      </div>
                      <Select
                        value={formData.contributionFrequency}
                        onValueChange={(value: "daily" | "weekly" | "monthly") =>
                          setFormData({ ...formData, contributionFrequency: value })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-primary/10 font-black">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="daily">Daily Stream</SelectItem>
                          <SelectItem value="weekly">Weekly Injection</SelectItem>
                          <SelectItem value="monthly">Monthly Allocation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Goal Insights Preview Digital HUD */}
          {goalInsights && formData.targetAmount && formData.targetDate && (
            <Card className="border-2 border-primary/20 bg-primary/5 overflow-hidden group/insights">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest">Financial Projection Insight</h4>
                    <p className="text-[9px] font-bold text-primary opacity-60 uppercase">Dynamic AI estimation</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col p-3 bg-background/60 rounded-2xl border border-primary/5 items-center justify-center transition-all hover:bg-primary/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Duration</span>
                    <p className="text-xl font-black font-mono tracking-tighter text-primary">{goalInsights.monthsToGoal}m</p>
                    <p className="text-[8px] font-bold text-muted-foreground/40 uppercase mt-0.5">Timeline</p>
                  </div>
                  <div className="flex flex-col p-3 bg-background/60 rounded-2xl border border-primary/5 items-center justify-center transition-all hover:bg-success/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Monthly</span>
                    <p className="text-xl font-black font-mono tracking-tighter text-success">
                      {currencySymbol}{Math.round(goalInsights.monthlyContribution).toLocaleString()}
                    </p>
                    <p className="text-[8px] font-bold text-muted-foreground/40 uppercase mt-0.5">Injection</p>
                  </div>
                  <div className="flex flex-col p-3 bg-background/60 rounded-2xl border border-primary/5 items-center justify-center transition-all hover:bg-info/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Weekly</span>
                    <p className="text-xl font-black font-mono tracking-tighter text-info">
                      {currencySymbol}{Math.round(goalInsights.weeklyContribution).toLocaleString()}
                    </p>
                    <p className="text-[8px] font-bold text-muted-foreground/40 uppercase mt-0.5">Pace</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] border-primary/10 hover:bg-primary/5">
              Discard
            </Button>
            <Button type="submit" className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 glow-primary">
              {editingGoal ? "Save Manifestation" : "Initialize Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
