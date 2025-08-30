"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Target, DollarSign, Clock, Plus, X } from "lucide-react"
import type { UserProfile } from "@/types/wallet"

interface BudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userProfile: UserProfile
  onAddBudget: (budget: any) => void
}

const defaultCategories = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Home",
  "Other",
]
const periods = ["weekly", "monthly", "yearly"]

export function BudgetDialog({ open, onOpenChange, userProfile, onAddBudget }: BudgetDialogProps) {
  const [amount, setAmount] = useState("")
  const [budgetName, setBudgetName] = useState("")
  const [period, setPeriod] = useState("monthly")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [customCategory, setCustomCategory] = useState("")
  const [emergencyUses, setEmergencyUses] = useState("3")

  const timeEquivalent = amount ? Math.round(Number.parseFloat(amount) / (userProfile.hourlyRate / 60)) : 0
  const timeText =
    timeEquivalent >= 60 ? `${Math.floor(timeEquivalent / 60)}h ${timeEquivalent % 60}m` : `${timeEquivalent}m`

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const addCustomCategory = () => {
    if (customCategory.trim() && !selectedCategories.includes(customCategory.trim())) {
      setSelectedCategories((prev) => [...prev, customCategory.trim()])
      setCustomCategory("")
    }
  }

  const removeCategory = (category: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== category))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !budgetName || selectedCategories.length === 0) return

    const budgetData = {
      name: budgetName,
      limit: Number.parseFloat(amount), // Changed from 'amount' to 'limit'
      categories: selectedCategories,
      period,
      emergencyUses: Number.parseInt(emergencyUses),
      createdAt: new Date().toISOString(),
    }

    onAddBudget(budgetData)

    // Reset form
    setAmount("")
    setBudgetName("")
    setSelectedCategories([])
    setPeriod("monthly")
    setEmergencyUses("3")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            Create Smart Budget
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budget-name">Budget Name</Label>
            <Input
              id="budget-name"
              type="text"
              placeholder="e.g., Monthly Expenses, School Budget"
              value={budgetName}
              onChange={(e) => setBudgetName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-amount">Budget Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="budget-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            {amount && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                <Clock className="w-4 h-4" />
                <span>This budget represents {timeText} of work time</span>
              </div>
            )}
          </div>

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
            <Label>Emergency Uses Allowed</Label>
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

          <div className="space-y-3">
            <Label>Supported Categories</Label>
            <p className="text-sm text-muted-foreground">Select which expense categories this budget should cover</p>

            <div className="grid grid-cols-2 gap-2">
              {defaultCategories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={category}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={() => handleCategoryToggle(category)}
                  />
                  <Label htmlFor={category} className="text-sm font-normal">
                    {category}
                  </Label>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add custom category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomCategory())}
              />
              <Button type="button" size="sm" onClick={addCustomCategory}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {selectedCategories.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selected Categories:</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map((category) => (
                    <Badge key={category} variant="secondary" className="flex items-center gap-1">
                      {category}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeCategory(category)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!amount || !budgetName || selectedCategories.length === 0}
              className="flex-1"
            >
              Create Budget
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
