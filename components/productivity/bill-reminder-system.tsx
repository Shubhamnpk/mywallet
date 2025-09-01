"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bell,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { UserProfile } from "@/types/wallet"

interface BillReminder {
  id: string
  name: string
  amount: number
  dueDate: string
  category: string
  isRecurring: boolean
  frequency?: 'monthly' | 'weekly' | 'yearly'
  isPaid: boolean
  reminderDays: number
}

interface BillReminderSystemProps {
  userProfile: UserProfile
}

export function BillReminderSystem({ userProfile }: BillReminderSystemProps) {
  const [bills, setBills] = useState<BillReminder[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newBill, setNewBill] = useState<Partial<BillReminder>>({
    name: '',
    amount: 0,
    dueDate: '',
    category: '',
    isRecurring: true,
    frequency: 'monthly',
    reminderDays: 3
  })

  // Load bills from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('wallet_bill_reminders')
    if (saved) {
      setBills(JSON.parse(saved))
    }
  }, [])

  // Save bills to localStorage
  useEffect(() => {
    localStorage.setItem('wallet_bill_reminders', JSON.stringify(bills))
  }, [bills])

  const upcomingBills = useMemo(() => {
    const today = new Date()
    return bills
      .filter(bill => !bill.isPaid)
      .map(bill => {
        const dueDate = new Date(bill.dueDate)
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return { ...bill, daysUntilDue }
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      .slice(0, 5) // Show next 5 upcoming bills
  }, [bills])

  const overdueBills = useMemo(() => {
    const today = new Date()
    return bills.filter(bill => {
      const dueDate = new Date(bill.dueDate)
      return !bill.isPaid && dueDate < today
    })
  }, [bills])

  const addBill = () => {
    if (!newBill.name || !newBill.amount || !newBill.dueDate) return

    const bill: BillReminder = {
      id: Date.now().toString(),
      name: newBill.name,
      amount: newBill.amount,
      dueDate: newBill.dueDate,
      category: newBill.category || 'Other',
      isRecurring: newBill.isRecurring || false,
      frequency: newBill.frequency,
      isPaid: false,
      reminderDays: newBill.reminderDays || 3
    }

    setBills([...bills, bill])
    setNewBill({
      name: '',
      amount: 0,
      dueDate: '',
      category: '',
      isRecurring: true,
      frequency: 'monthly',
      reminderDays: 3
    })
    setIsAddDialogOpen(false)
  }

  const markAsPaid = (billId: string) => {
    setBills(bills.map(bill =>
      bill.id === billId ? { ...bill, isPaid: true } : bill
    ))
  }

  const deleteBill = (billId: string) => {
    setBills(bills.filter(bill => bill.id !== billId))
  }

  const getBillStatus = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return { status: 'overdue', color: 'text-red-600 bg-red-50', icon: AlertTriangle }
    if (daysUntilDue <= 3) return { status: 'urgent', color: 'text-orange-600 bg-orange-50', icon: Clock }
    if (daysUntilDue <= 7) return { status: 'soon', color: 'text-yellow-600 bg-yellow-50', icon: Bell }
    return { status: 'upcoming', color: 'text-blue-600 bg-blue-50', icon: Calendar }
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Bill Reminders</h3>
          {overdueBills.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {overdueBills.length} overdue
            </Badge>
          )}
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Bill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bill Reminder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bill-name">Bill Name</Label>
                <Input
                  id="bill-name"
                  value={newBill.name}
                  onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                  placeholder="e.g., Rent, Electricity"
                />
              </div>
              <div>
                <Label htmlFor="bill-amount">Amount</Label>
                <Input
                  id="bill-amount"
                  type="number"
                  step="0.01"
                  value={newBill.amount}
                  onChange={(e) => setNewBill({ ...newBill, amount: Number(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="bill-date">Due Date</Label>
                <Input
                  id="bill-date"
                  type="date"
                  value={newBill.dueDate}
                  onChange={(e) => setNewBill({ ...newBill, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="bill-category">Category</Label>
                <Input
                  id="bill-category"
                  value={newBill.category}
                  onChange={(e) => setNewBill({ ...newBill, category: e.target.value })}
                  placeholder="e.g., Utilities, Rent"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addBill} className="flex-1">
                  Add Bill
                </Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming Bills */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upcoming Bills</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBills.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No upcoming bills</p>
              <p className="text-sm">Add bills to get reminders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBills.map((bill) => {
                const status = getBillStatus(bill.daysUntilDue)
                const StatusIcon = status.icon

                return (
                  <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${status.color}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium">{bill.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {bill.daysUntilDue < 0
                            ? `${Math.abs(bill.daysUntilDue)} days overdue`
                            : `${bill.daysUntilDue} days left`
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {formatCurrency(bill.amount, userProfile.currency, userProfile.customCurrency)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsPaid(bill.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteBill(bill.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}