"use client"
import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AmountInput } from "@/components/ui/amount-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategoryMultiSelect } from "@/components/ui/category-multi-select"
import { Target, Clock } from "lucide-react"
import { useWalletData } from "@/contexts/wallet-data-context"
import { useCurrencySymbol } from "@/hooks/use-currency-symbol"
import { isTimeWalletEnabled, getTimeEquivalentBreakdown } from "@/lib/wallet-utils"
import type { UserProfile, Budget } from "@/types/wallet"

interface BudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userProfile: UserProfile
  onAddBudget: (budget: any) => void
  editingBudget?: Budget
  onUpdateBudget?: (id: string, updates: Partial<Budget>) => void
}

const periods = ["weekly", "monthly", "yearly"]

export function BudgetDialog({ open, onOpenChange, userProfile, onAddBudget, editingBudget, onUpdateBudget }: BudgetDialogProps) {
  const { categories, addCategory } = useWalletData()
  const [amount, setAmount] = useState("")
  const [budgetName, setBudgetName] = useState("")
  const [period, setPeriod] = useState("monthly")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [emergencyUses, setEmergencyUses] = useState("3")
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Populate form when editing
  useEffect(() => {
    if (editingBudget) {
      setAmount(editingBudget.limit.toString())
      setBudgetName(editingBudget.name)
      setPeriod(editingBudget.period)
      setSelectedCategories(editingBudget.categories || [])
      setEmergencyUses(editingBudget.emergencyUses?.toString() || "3")
      setErrors({})
    } else {
      // Reset form for new budget
      setAmount("")
      setBudgetName("")
      setSelectedCategories([])
      setPeriod("monthly")
      setEmergencyUses("3")
      setErrors({})
    }
  }, [editingBudget])

  // Get currency symbol
  const currencySymbol = useCurrencySymbol()

  const timeEquivalentBreakdown = useMemo(() => {
    if (!amount || !userProfile) return null
    return getTimeEquivalentBreakdown(Number.parseFloat(amount), userProfile)
  }, [amount, userProfile])

  const timeText = timeEquivalentBreakdown ? timeEquivalentBreakdown.formatted.userFriendly : "0m"

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!budgetName.trim()) {
      newErrors.budgetName = "Budget name is required"
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      newErrors.amount = "Please enter a valid positive amount"
    }

    if (selectedCategories.length === 0) {
      newErrors.categories = "Please select at least one category"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const budgetData = {
      name: budgetName.trim(),
      limit: Number.parseFloat(amount),
      categories: selectedCategories,
      period,
      emergencyUses: Number.parseInt(emergencyUses),
      ...(editingBudget ? {} : { createdAt: new Date().toISOString() }),
    }

    if (editingBudget && onUpdateBudget) {
      onUpdateBudget(editingBudget.id, budgetData as Partial<Budget>)
    } else {
      onAddBudget(budgetData)
    }

    // Reset form
    setAmount("")
    setBudgetName("")
    setSelectedCategories([])
    setPeriod("monthly")
    setEmergencyUses("3")
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {editingBudget ? "Edit Budget" : "Create Smart Budget"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6">
            <div className="space-y-2">
              <Label htmlFor="budget-name" className="flex items-center gap-2">
                Budget Name
              </Label>
              <Input
                id="budget-name"
                type="text"
                placeholder="e.g., Monthly Expenses, School Budget"
                value={budgetName}
                onChange={(e) => {
                  setBudgetName(e.target.value)
                  if (errors.budgetName) {
                    setErrors(prev => ({ ...prev, budgetName: "" }))
                  }
                }}
                className={errors.budgetName ? "border-destructive" : ""}
                required
              />
              {errors.budgetName && (
                <p className="text-sm text-destructive">{errors.budgetName}</p>
              )}
            </div>

            <div className="space-y-2">
              <AmountInput
                id="budget-amount"
                label="Budget Amount"
                value={amount}
                onChange={(value) => {
                  setAmount(value)
                  if (errors.amount) {
                    setErrors(prev => ({ ...prev, amount: "" }))
                  }
                }}
                currencySymbol={currencySymbol}
                required
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount}</p>
              )}

              {amount && isTimeWalletEnabled(userProfile) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border">
                  <Clock className="w-4 h-4" />
                  <span>This budget represents <strong>{timeText}</strong> of work time</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget-period">Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Emergency Uses Allowed
                </Label>
                <Select value={emergencyUses} onValueChange={setEmergencyUses}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 emergency use</SelectItem>
                    <SelectItem value="2">2 emergency uses</SelectItem>
                    <SelectItem value="3">3 emergency uses</SelectItem>
                    <SelectItem value="5">5 emergency uses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-1 border-t border-border/10">
              <p className="text-sm font-medium mb-2">Supported Categories</p>
              <p className="text-xs text-muted-foreground mb-3">Select which expense categories this budget should cover</p>
              <CategoryMultiSelect
                selected={selectedCategories}
                onChange={setSelectedCategories}
                categories={categories}
                onAddCategory={addCategory}
                error={errors.categories}
              />
            </div>

            <div className="flex flex-row gap-2 mb-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!amount || !budgetName || selectedCategories.length === 0}
                className="flex-1"
              >
                {editingBudget ? "Update Budget" : "Create Budget"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
