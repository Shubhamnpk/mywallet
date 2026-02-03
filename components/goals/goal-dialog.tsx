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
    color: "text-red-600 bg-red-50",
    description: "Build a safety net for unexpected expenses (3-6 months of living costs)",
  },
  {
    id: "savings",
    name: "General Savings",
    icon: PiggyBank,
    color: "text-green-600 bg-green-50",
    description: "Save for future needs and opportunities",
  },
  {
    id: "house",
    name: "Home Purchase",
    icon: Home,
    color: "text-blue-600 bg-blue-50",
    description: "Save for buying, building, or improving a home",
  },
  {
    id: "car",
    name: "Vehicle",
    icon: Car,
    color: "text-gray-600 bg-gray-50",
    description: "Save for a car, motorcycle, or transportation",
  },
  {
    id: "education",
    name: "Education",
    icon: GraduationCap,
    color: "text-purple-600 bg-purple-50",
    description: "Fund education, courses, or skill development",
  },
  {
    id: "health",
    name: "Health & Wellness",
    icon: Heart,
    color: "text-pink-600 bg-pink-50",
    description: "Medical expenses, insurance, and health investments",
  },
  {
    id: "travel",
    name: Plane,
    color: "text-cyan-600 bg-cyan-50",
    description: "Vacations, pilgrimages, and travel experiences",
  },
  {
    id: "wedding",
    name: "Wedding & Ceremonies",
    icon: Star,
    color: "text-rose-600 bg-rose-50",
    description: "Wedding expenses and traditional ceremonies",
  },
  {
    id: "retirement",
    name: "Retirement",
    icon: Trophy,
    color: "text-amber-600 bg-amber-50",
    description: "Save for retirement and golden years",
  },
  {
    id: "business",
    name: "Business/Investment",
    icon: Briefcase,
    color: "text-indigo-600 bg-indigo-50",
    description: "Start a business or invest in opportunities",
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: ShoppingBag,
    color: "text-orange-600 bg-orange-50",
    description: "Consumer goods and personal purchases",
  },
  {
    id: "other",
    name: "Other",
    icon: Target,
    color: "text-slate-600 bg-slate-50",
    description: "Custom goals and personal objectives",
  },
]

const PRIORITY_LEVELS = [
  { id: "low", name: "Low", color: "text-blue-600 bg-blue-50", icon: Star, description: "Nice to have, flexible timeline" },
  { id: "medium", name: "Medium", color: "text-amber-600 bg-amber-50", icon: Star, description: "Important, moderate urgency" },
  { id: "high", name: "High", color: "text-red-600 bg-red-50", icon: AlertTriangle, description: "Critical, needs immediate attention" },
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {editingGoal ? "Edit Goal" : "Create New Goal"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Goal Templates */}
          {showTemplates && !editingGoal && (
            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Star className="w-4 h-4 text-primary" />
                      Quick Start Templates
                    </Label>
                    <p className="text-sm text-muted-foreground">Choose a template to get started quickly</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplates(false)}
                  >
                    Skip
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {GOAL_TEMPLATES.map((template, index) => {
                    const category = GOAL_CATEGORIES.find(c => c.id === template.category)
                    const IconComponent = category?.icon || Target
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="p-4 rounded-lg border-2 border-muted hover:border-primary/50 text-left transition-all hover:shadow-md"
                      >
                        <div className={`p-2 rounded-lg w-fit mb-3 ${category?.color || "text-slate-600 bg-slate-50"}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {currencySymbol}{template.targetAmount.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {template.description}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowTemplates(false)}
                  >
                    Create Custom Goal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Basic Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Goal Name *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Emergency Fund, Vacation, New Car"
                    className={errors.title ? "border-red-500" : ""}
                  />
                  {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetAmount" className="flex items-center gap-2">
                    Target Amount ( {currencySymbol} ) *
                  </Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    placeholder="0.00"
                    className={errors.targetAmount ? "border-red-500" : ""}
                  />
                  {errors.targetAmount && <p className="text-sm text-red-500">{errors.targetAmount}</p>}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="targetDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Target Date *
                </Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  className={errors.targetDate ? "border-red-500" : ""}
                />
                {errors.targetDate && <p className="text-sm text-red-500">{errors.targetDate}</p>}
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Why is this goal important to you? What will achieving it mean?"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Category and Priority Selection */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-base font-semibold">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_CATEGORIES.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {typeof category.name === 'string' ? category.name : 'Category'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-base font-semibold">Priority Level</Label>
                  <Select value={formData.priority} onValueChange={(value: "low" | "medium" | "high") => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority level" />
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
              </div>
            </CardContent>
          </Card>

          {/* Auto Contribution Settings */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-base font-semibold">Auto-Contribute</Label>
                  <p className="text-sm text-muted-foreground">Automatically add money to this goal</p>
                </div>
                <button
                  title="Toggle Auto-Contribute"
                  type="button"
                  onClick={() => setFormData({ ...formData, autoContribute: !formData.autoContribute })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.autoContribute ? "bg-primary" : "bg-muted"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.autoContribute ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

              {formData.autoContribute && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="contributionAmount">Contribution Amount ({currencySymbol}) *</Label>
                    <Input
                      id="contributionAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.contributionAmount}
                      onChange={(e) => setFormData({ ...formData, contributionAmount: e.target.value })}
                      placeholder="0.00"
                      className={errors.contributionAmount ? "border-red-500" : ""}
                    />
                    {errors.contributionAmount && <p className="text-sm text-red-500">{errors.contributionAmount}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contributionFrequency">Frequency</Label>
                    <Select
                      value={formData.contributionFrequency}
                      onValueChange={(value: "daily" | "weekly" | "monthly") =>
                        setFormData({ ...formData, contributionFrequency: value })
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
                </div>
              )}
            </CardContent>
          </Card>

          {/* Goal Insights Preview */}
          {goalInsights && formData.targetAmount && formData.targetDate && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <Label className="text-base font-semibold">Goal Insights</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {goalInsights.monthsToGoal}
                    </div>
                    <div className="text-sm text-blue-600/70">Months to goal</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {currencySymbol}{goalInsights.monthlyContribution.toFixed(0)}
                    </div>
                    <div className="text-sm text-green-600/70">Monthly needed</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {currencySymbol}{goalInsights.weeklyContribution.toFixed(0)}
                    </div>
                    <div className="text-sm text-purple-600/70">Weekly needed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingGoal ? "Update Goal" : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
