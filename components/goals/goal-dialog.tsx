"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useWalletData } from "@/contexts/wallet-data-context"
import type { UserProfile, Goal } from "@/types/wallet"

import { formatCurrency } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currency"

interface GoalDialogProps {
  isOpen: boolean
  onClose: () => void
  userProfile: UserProfile
  editingGoal?: Goal | null
}

export function GoalDialog({ isOpen, onClose, userProfile, editingGoal }: GoalDialogProps) {
  const { addGoal, updateGoal } = useWalletData()
  const [formData, setFormData] = useState({
  title: "",
  targetAmount: "",
  targetDate: "",
  description: "",
  })

  const currencySymbol = useMemo(
    () => getCurrencySymbol(userProfile?.currency || "USD", (userProfile as any)?.customCurrency),
    [userProfile?.currency, (userProfile as any)?.customCurrency],
  )

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        title: editingGoal.title || editingGoal.name || "",
        targetAmount: editingGoal.targetAmount.toString(),
        targetDate: editingGoal.targetDate.split("T")[0], // Format date for input
        description: editingGoal.description || "",
      })
    } else {
      setFormData({ title: "", targetAmount: "", targetDate: "", description: "" })
    }
  }, [editingGoal, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

  if (!formData.title || !formData.targetAmount || !formData.targetDate) {
      return
    }

    if (editingGoal) {
      updateGoal(editingGoal.id, {
        title: formData.title,
        targetAmount: Number.parseFloat(formData.targetAmount),
        targetDate: formData.targetDate,
        description: formData.description,
      })
    } else {
      addGoal({
        title: formData.title,
        targetAmount: Number.parseFloat(formData.targetAmount),
        targetDate: formData.targetDate,
        description: formData.description,
        category: "General",
        priority: "medium",
        autoContribute: false,
        createdAt: new Date().toISOString(),
      } as any)
    }

  setFormData({ title: "", targetAmount: "", targetDate: "", description: "" })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Goal Name</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Emergency Fund, Vacation, New Car"
              required
            />
          </div>

          <div>
            <Label htmlFor="targetAmount">Target Amount ({currencySymbol})</Label>
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              min="0"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Why is this goal important to you?"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
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
