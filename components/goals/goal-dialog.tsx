"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useWalletData } from "@/contexts/wallet-data-context"
import { cn } from "@/lib/utils"
import type { Goal, UserProfile } from "@/types/wallet"
import { getCurrencySymbol } from "@/lib/currency"
import { getGoalChallengeSummary } from "@/lib/goal-challenge"
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Car,
  DollarSign,
  GraduationCap,
  Heart,
  Home,
  PiggyBank,
  Plane,
  ShoppingBag,
  Star,
  Target,
  Trophy,
  TrendingUp,
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
    description: "Build a safety net for unexpected expenses (3-6 months of living costs).",
  },
  {
    id: "savings",
    name: "General Savings",
    icon: PiggyBank,
    color: "text-primary bg-primary/10 border-primary/20",
    description: "Save for future needs and opportunities.",
  },
  {
    id: "house",
    name: "Home Purchase",
    icon: Home,
    color: "text-info bg-info/10 border-info/20",
    description: "Save for buying, building, or improving a home.",
  },
  {
    id: "car",
    name: "Vehicle",
    icon: Car,
    color: "text-muted-foreground bg-muted border-muted-foreground/20",
    description: "Save for a car, motorcycle, or transportation.",
  },
  {
    id: "education",
    name: "Education",
    icon: GraduationCap,
    color: "text-primary bg-primary/10 border-primary/20",
    description: "Fund education, courses, or skill development.",
  },
  {
    id: "health",
    name: "Health & Wellness",
    icon: Heart,
    color: "text-error bg-error/10 border-error/20",
    description: "Medical expenses, insurance, and health investments.",
  },
  {
    id: "travel",
    name: "Travel & Spiritual",
    icon: Plane,
    color: "text-info bg-info/10 border-info/20",
    description: "Vacations, pilgrimages, and travel experiences.",
  },
  {
    id: "wedding",
    name: "Wedding & Ceremonies",
    icon: Star,
    color: "text-warning bg-warning/10 border-warning/20",
    description: "Wedding expenses and traditional ceremonies.",
  },
  {
    id: "retirement",
    name: "Retirement",
    icon: Trophy,
    color: "text-warning bg-warning/10 border-warning/20",
    description: "Save for retirement and long-term comfort.",
  },
  {
    id: "business",
    name: "Business/Investment",
    icon: Briefcase,
    color: "text-primary bg-primary/10 border-primary/20",
    description: "Start a business or invest in opportunities.",
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: ShoppingBag,
    color: "text-warning bg-warning/10 border-warning/20",
    description: "Consumer goods and personal purchases.",
  },
  {
    id: "other",
    name: "Other",
    icon: Target,
    color: "text-muted-foreground bg-muted border-muted-foreground/20",
    description: "Custom goals and personal objectives.",
  },
]

const PRIORITY_LEVELS = [
  { id: "low", name: "Low", description: "Nice to have, flexible timeline." },
  { id: "medium", name: "Medium", description: "Important, moderate urgency." },
  { id: "high", name: "High", description: "Critical, needs more focus." },
]

const GOAL_TEMPLATES = [
  {
    name: "Emergency Fund",
    category: "emergency",
    targetAmount: 10000,
    description: "Build a 3-6 month emergency fund for unexpected expenses.",
    priority: "high" as const,
  },
  {
    name: "Wedding Fund",
    category: "wedding",
    targetAmount: 20000,
    description: "Save for wedding expenses and traditional ceremonies.",
    priority: "high" as const,
  },
  {
    name: "Pilgrimage Fund",
    category: "travel",
    targetAmount: 5000,
    description: "Save for spiritual journeys and religious pilgrimages.",
    priority: "medium" as const,
  },
  {
    name: "Home Purchase",
    category: "house",
    targetAmount: 50000,
    description: "Save for buying or building your family home.",
    priority: "high" as const,
  },
  {
    name: "Education Fund",
    category: "education",
    targetAmount: 25000,
    description: "Save for education, courses, or skill development.",
    priority: "high" as const,
  },
  {
    name: "Retirement Fund",
    category: "retirement",
    targetAmount: 100000,
    description: "Save for retirement and long-term family security.",
    priority: "medium" as const,
  },
  {
    name: "Business Startup",
    category: "business",
    targetAmount: 15000,
    description: "Save to start your own business or investment.",
    priority: "medium" as const,
  },
  {
    name: "Festival Shopping",
    category: "shopping",
    targetAmount: 2000,
    description: "Save for festive shopping and family celebrations.",
    priority: "low" as const,
  },
  {
    name: "Hard Plan Challenge",
    category: "savings",
    targetAmount: 300,
    description: "Save 300 in 3 months. If you miss the target, add 50 extra before completion and keep the fund split 50% NEP and 50% UK.",
    priority: "high" as const,
    targetMonths: 3,
    autoContribute: true,
    contributionAmount: 100,
    contributionFrequency: "monthly" as const,
    challengeMode: "easy" as const,
  },
]

type GoalCreationMode = "template" | "custom"

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
    challengeMode: "easy" as "easy" | "hard",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [goalCreationMode, setGoalCreationMode] = useState<GoalCreationMode>("template")
  const [selectedTemplateName, setSelectedTemplateName] = useState("")

  const currencySymbol = useMemo(
    () => getCurrencySymbol(userProfile?.currency || "USD", (userProfile as any)?.customCurrency),
    [userProfile?.currency, (userProfile as any)?.customCurrency],
  )

  const goalInsights = useMemo(() => {
    if (!formData.targetAmount || !formData.targetDate) return null

    const targetAmount = Number.parseFloat(formData.targetAmount)
    const targetDate = new Date(formData.targetDate)
    const today = new Date()

    const monthsDiff = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    const weeksDiff = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7)))

    return {
      monthsToGoal: monthsDiff,
      monthlyContribution: targetAmount / monthsDiff,
      weeklyContribution: targetAmount / weeksDiff,
    }
  }, [formData.targetAmount, formData.targetDate])

  const challengePreview = useMemo(() => {
    if (selectedTemplateName !== "Hard Plan Challenge" && !editingGoal?.challengePlan) return null

    const previewGoal: Goal = {
      id: "preview",
      title: formData.title || "Hard Plan Challenge",
      targetAmount: Number.parseFloat(formData.targetAmount || "0"),
      currentAmount: 0,
      targetDate: formData.targetDate || new Date().toISOString(),
      category: formData.category,
      priority: formData.priority,
      createdAt: new Date().toISOString(),
      autoContribute: formData.autoContribute,
      contributionAmount: formData.contributionAmount ? Number.parseFloat(formData.contributionAmount) : undefined,
      contributionFrequency: formData.contributionFrequency,
      description: formData.description,
      challengePlan: {
        type: "hard-plan",
        mode: formData.challengeMode,
        baseTargetAmount: Number.parseFloat(formData.targetAmount || "0") || 300,
        penaltyAmount: 50,
        graceMonths: 1,
        allocation: {
          nepalPercent: 50,
          ukPercent: 50,
        },
        hardModeRewardPoints: 10,
      },
    }

    return getGoalChallengeSummary(previewGoal)
  }, [
    editingGoal?.challengePlan,
    formData.autoContribute,
    formData.category,
    formData.challengeMode,
    formData.contributionAmount,
    formData.contributionFrequency,
    formData.description,
    formData.priority,
    formData.targetAmount,
    formData.targetDate,
    formData.title,
    selectedTemplateName,
  ])

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        title: editingGoal.title || editingGoal.name || "",
        targetAmount: editingGoal.targetAmount.toString(),
        targetDate: editingGoal.targetDate.split("T")[0],
        description: editingGoal.description || "",
        category: editingGoal.category || "savings",
        priority: editingGoal.priority || "medium",
        autoContribute: editingGoal.autoContribute || false,
        contributionAmount: editingGoal.contributionAmount?.toString() || "",
        contributionFrequency: editingGoal.contributionFrequency || "monthly",
        challengeMode: editingGoal.challengePlan?.mode === "hard" ? "hard" : "easy",
      })
      setGoalCreationMode("custom")
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
        challengeMode: "easy",
      })
      setGoalCreationMode("template")
    }

    setSelectedTemplateName("")
    setErrors({})
  }, [editingGoal, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Goal name is required."
    }

    if (!formData.targetAmount || Number.parseFloat(formData.targetAmount) <= 0) {
      newErrors.targetAmount = "Enter a valid target amount."
    }

    if (!formData.targetDate) {
      newErrors.targetDate = "Target date is required."
    } else {
      const targetDate = new Date(formData.targetDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (targetDate <= today) {
        newErrors.targetDate = "Target date must be in the future."
      }
    }

    if (formData.autoContribute && (!formData.contributionAmount || Number.parseFloat(formData.contributionAmount) <= 0)) {
      newErrors.contributionAmount = "Enter a valid contribution amount."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const applyTemplate = (template: (typeof GOAL_TEMPLATES)[0]) => {
    const targetDate = new Date()
    targetDate.setMonth(targetDate.getMonth() + ("targetMonths" in template && template.targetMonths ? template.targetMonths : 12))

    setFormData((prev) => ({
      ...prev,
      title: template.name,
      targetAmount: template.targetAmount.toString(),
      targetDate: targetDate.toISOString().split("T")[0],
      description: template.description,
      category: template.category,
      priority: template.priority,
      autoContribute: "autoContribute" in template ? Boolean(template.autoContribute) : prev.autoContribute,
      contributionAmount: "contributionAmount" in template && template.contributionAmount
        ? template.contributionAmount.toString()
        : "",
      contributionFrequency: "contributionFrequency" in template && template.contributionFrequency
        ? template.contributionFrequency
        : "monthly",
      challengeMode: template.name === "Hard Plan Challenge" ? "easy" : prev.challengeMode,
    }))
    setSelectedTemplateName(template.name)
    setGoalCreationMode("custom")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const goalData = {
      title: formData.title.trim(),
      targetAmount: Number.parseFloat(formData.targetAmount),
      targetDate: formData.targetDate,
      description: formData.description.trim(),
      category: formData.category,
      priority: formData.priority,
      autoContribute: formData.autoContribute,
      ...(formData.autoContribute && {
        contributionAmount: Number.parseFloat(formData.contributionAmount),
        contributionFrequency: formData.contributionFrequency,
      }),
      ...((selectedTemplateName === "Hard Plan Challenge" || editingGoal?.challengePlan) && {
        challengePlan: {
          type: "hard-plan" as const,
          mode: formData.challengeMode,
          baseTargetAmount: Number.parseFloat(formData.targetAmount),
          penaltyAmount: 50,
          graceMonths: 1,
          allocation: {
            nepalPercent: 50,
            ukPercent: 50,
          },
          hardModeRewardPoints: 10,
        },
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

    onClose()
  }

  const isTemplateMode = !editingGoal && goalCreationMode === "template"
  const isFormMode = !!editingGoal || goalCreationMode === "custom"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Target className="w-5 h-5 text-primary" />
            {editingGoal ? "Edit Goal" : "Create Savings Goal"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {editingGoal
              ? "Update your goal details and keep your plan on track."
              : "Choose a template or be creative"}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
            {!editingGoal && (
              <Card>
                <CardContent className="pt-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">How do you want to start?</p>
                      <p className="text-xs text-muted-foreground">Templates are fast. Custom gives full control.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant={goalCreationMode === "template" ? "default" : "outline"}
                        onClick={() => setGoalCreationMode("template")}
                      >
                        Templates
                      </Button>
                      <Button
                        type="button"
                        variant={goalCreationMode === "custom" ? "default" : "outline"}
                        onClick={() => setGoalCreationMode("custom")}
                      >
                        Custom
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!editingGoal && goalCreationMode === "template" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Goal Templates</CardTitle>
                  <p className="text-sm text-muted-foreground">Tap a template to pre-fill the form, then adjust anything.</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                    {GOAL_TEMPLATES.map((template) => {
                      const category = GOAL_CATEGORIES.find((c) => c.id === template.category)
                      const IconComponent = category?.icon || Target
                      return (
                        <button
                          key={template.name}
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className="text-left rounded-lg border p-3 transition hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn("rounded-md border p-1.5", category?.color)}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <p className="font-medium text-sm">{template.name}</p>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-primary">
                            {currencySymbol}
                            {template.targetAmount.toLocaleString()}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {!editingGoal && goalCreationMode === "custom" && selectedTemplateName && (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Using template: <span className="font-medium text-foreground">{selectedTemplateName}</span>
              </div>
            )}

            {((!editingGoal && goalCreationMode === "custom" && selectedTemplateName === "Hard Plan Challenge") || editingGoal?.challengePlan) && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-5">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">Hard plan rules</p>
                    <p className="text-xs text-muted-foreground">
                      Save toward the target on time. If the active deadline is missed, the plan adds an extra 50 and gives one more month to complete.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Suggested split after funding: 50% for NEP and 50% for UK.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Challenge mode</Label>
                        <Select
                          value={formData.challengeMode}
                          onValueChange={(value: "easy" | "hard") => setFormData((prev) => ({ ...prev, challengeMode: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy mode</SelectItem>
                            <SelectItem value="hard">Hard mode</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="rounded-md border bg-background/80 p-3 text-xs text-muted-foreground">
                        {formData.challengeMode === "easy"
                          ? "Easy mode: using the fund for investment does not reduce saved progress."
                          : "Hard mode: investment usage counts like expense, reduces saved progress, and earns 10 points per use."}
                      </div>
                    </div>
                    {challengePreview && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-md border bg-background/80 p-3">
                          <p className="text-[11px] text-muted-foreground">Current target</p>
                          <p className="mt-1 text-sm font-semibold">
                            {currencySymbol}{challengePreview.effectiveTargetAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-md border bg-background/80 p-3">
                          <p className="text-[11px] text-muted-foreground">Penalty rule</p>
                          <p className="mt-1 text-sm font-semibold">
                            {currencySymbol}{challengePreview.plan.penaltyAmount} every {challengePreview.plan.graceMonths} month
                          </p>
                        </div>
                        <div className="rounded-md border bg-background/80 p-3">
                          <p className="text-[11px] text-muted-foreground">Utilization split</p>
                          <p className="mt-1 text-sm font-semibold">
                            {challengePreview.utilization.nepalPercent}% NEP / {challengePreview.utilization.ukPercent}% UK
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {isFormMode && (
              <>
                <Card>
                  <CardContent className="space-y-4 pt-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          Goal Name
                        </Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => {
                            setFormData((prev) => ({ ...prev, title: e.target.value }))
                            if (errors.title) setErrors((prev) => ({ ...prev, title: "" }))
                          }}
                          placeholder="e.g., Emergency fund, New bike, Family trip"
                          className={errors.title ? "border-destructive" : ""}
                        />
                        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="targetAmount" className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Target Amount
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                            {currencySymbol}
                          </span>
                          <Input
                            id="targetAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.targetAmount}
                            onChange={(e) => {
                              setFormData((prev) => ({ ...prev, targetAmount: e.target.value }))
                              if (errors.targetAmount) setErrors((prev) => ({ ...prev, targetAmount: "" }))
                            }}
                            placeholder="0.00"
                            className={cn("pl-10", errors.targetAmount && "border-destructive")}
                          />
                        </div>
                        {errors.targetAmount && <p className="text-sm text-destructive">{errors.targetAmount}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="targetDate" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          Target Date
                        </Label>
                        <Input
                          id="targetDate"
                          type="date"
                          value={formData.targetDate}
                          onChange={(e) => {
                            setFormData((prev) => ({ ...prev, targetDate: e.target.value }))
                            if (errors.targetDate) setErrors((prev) => ({ ...prev, targetDate: "" }))
                          }}
                          min={new Date().toISOString().split("T")[0]}
                          className={errors.targetDate ? "border-destructive" : ""}
                        />
                        {errors.targetDate && <p className="text-sm text-destructive">{errors.targetDate}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {GOAL_CATEGORIES.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2">
                                  <category.icon className="w-4 h-4" />
                                  <span>{category.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {GOAL_CATEGORIES.find((c) => c.id === formData.category)?.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Note (Optional)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Why this goal matters to you, or your saving plan."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="pt-2.5 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <Label htmlFor="priority" className="shrink-0">Priority</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value: "low" | "medium" | "high") =>
                            setFormData((prev) => ({ ...prev, priority: value }))
                          }
                        >
                          <SelectTrigger id="priority" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_LEVELS.map((priority) => (
                              <SelectItem key={priority.id} value={priority.id}>
                                {priority.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {PRIORITY_LEVELS.find((p) => p.id === formData.priority)?.description}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-2.5 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <Label htmlFor="auto-contribute">Auto-contribute</Label>
                          <p className="text-[11px] text-muted-foreground">Add money automatically on a schedule.</p>
                        </div>
                        <Switch
                          id="auto-contribute"
                          checked={formData.autoContribute}
                          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, autoContribute: checked }))}
                        />
                      </div>

                      {formData.autoContribute && (
                        <div className="space-y-2 rounded-md border bg-muted/20 p-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                                {currencySymbol}
                              </span>
                              <Input
                                id="contributionAmount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.contributionAmount}
                                onChange={(e) => {
                                  setFormData((prev) => ({ ...prev, contributionAmount: e.target.value }))
                                  if (errors.contributionAmount) setErrors((prev) => ({ ...prev, contributionAmount: "" }))
                                }}
                                placeholder="Contribution amount"
                                className={cn("pl-10", errors.contributionAmount && "border-destructive")}
                              />
                            </div>
                            <Select
                              value={formData.contributionFrequency}
                              onValueChange={(value: "daily" | "weekly" | "monthly") =>
                                setFormData((prev) => ({ ...prev, contributionFrequency: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {errors.contributionAmount && <p className="text-sm text-destructive">{errors.contributionAmount}</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {goalInsights && formData.targetAmount && formData.targetDate && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Savings Plan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
                        <div className="rounded-md border bg-background p-3 text-center">
                          <p className="text-xs text-muted-foreground">Time left</p>
                          <p className="text-lg font-semibold text-primary">{goalInsights.monthsToGoal} months</p>
                        </div>
                        <div className="rounded-md border bg-background p-3 text-center">
                          <p className="text-xs text-muted-foreground">Per month</p>
                          <p className="text-lg font-semibold">
                            {currencySymbol}
                            {Math.round(goalInsights.monthlyContribution).toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-md border bg-background p-3 text-center">
                          <p className="text-xs text-muted-foreground">Per week</p>
                          <p className="text-lg font-semibold">
                            {currencySymbol}
                            {Math.round(goalInsights.weeklyContribution).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          <DialogFooter className="mt-4 flex flex-row gap-2 border-t bg-background pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            {isTemplateMode ? (
              <Button type="button" onClick={() => setGoalCreationMode("custom")} className="flex-1">
                Continue with Custom Goal
              </Button>
            ) : (
              <Button type="submit" className="flex-1" disabled={!formData.title || !formData.targetAmount || !formData.targetDate}>
                {editingGoal ? "Save Changes" : "Create Goal"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
