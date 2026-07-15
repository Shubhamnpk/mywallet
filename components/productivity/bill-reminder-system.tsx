"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Bell, Plus, Calendar, AlertTriangle, CheckCircle2, Clock, Trash2, RefreshCw } from "lucide-react"
import { AmountInput } from "@/components/ui/amount-input"
import { formatCurrency, getCurrencySymbol } from "@/lib/currency"
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/storage"
import type { UserProfile } from "@/types/wallet"

const COMMON_CATEGORIES = [
  "Rent",
  "Electricity",
  "Water",
  "Internet",
  "Phone",
  "Insurance",
  "Subscription",
  "Loan",
  "Credit Card",
  "Tax",
  "Other",
]

const REMINDER_OPTIONS = [
  { value: 0, label: "On due date" },
  { value: 1, label: "1 day before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "1 week before" },
  { value: 14, label: "2 weeks before" },
]

interface BillReminder {
  id: string
  name: string
  amount: number
  dueDate: string
  category: string
  isRecurring: boolean
  frequency?: "monthly" | "weekly" | "yearly"
  isPaid: boolean
  reminderDays: number
}

interface BillReminderSystemProps {
  userProfile: UserProfile
}

function getNextRecurringDate(currentDueDate: string, frequency: "monthly" | "weekly" | "yearly"): string {
  const date = new Date(currentDueDate)
  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7)
      break
    case "monthly":
      date.setMonth(date.getMonth() + 1)
      break
    case "yearly":
      date.setFullYear(date.getFullYear() + 1)
      break
  }
  return date.toISOString().split("T")[0]
}

export function BillReminderSystem({ userProfile }: BillReminderSystemProps) {
  const [bills, setBills] = useState<BillReminder[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newBill, setNewBill] = useState<Partial<BillReminder>>({
    name: "",
    amount: undefined,
    dueDate: "",
    category: "",
    isRecurring: true,
    frequency: "monthly",
    reminderDays: 3,
  })

  const emptyBillForm: Partial<BillReminder> = {
    name: "",
    amount: undefined,
    dueDate: "",
    category: "",
    isRecurring: true,
    frequency: "monthly",
    reminderDays: 3,
  }

  // Reset form when dialog opens
  useEffect(() => {
    if (isAddDialogOpen) {
      setNewBill(emptyBillForm)
    }
  }, [isAddDialogOpen])

  // Load bills from localStorage
  useEffect(() => {
    const loadBills = async () => {
      try {
        const stored = await loadFromLocalStorage(["wallet_bill_reminders"])
        const saved = stored.wallet_bill_reminders
        if (Array.isArray(saved)) {
          setBills(saved)
        }
      } catch {
      }
    }
    void loadBills()
  }, [])

  // Save bills to localStorage
  useEffect(() => {
    void (async () => {
      try {
        await saveToLocalStorage("wallet_bill_reminders", bills, true)
      } catch {
      }
    })()
  }, [bills])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const upcomingBills = useMemo(() => {
    return bills
      .filter((bill) => !bill.isPaid)
      .map((bill) => {
        const dueDate = new Date(bill.dueDate)
        const diffMs = dueDate.getTime() - today.getTime()
        const daysUntilDue = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        return { ...bill, daysUntilDue }
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
  }, [bills, today])

  const overdueBills = useMemo(() => {
    return bills.filter((bill) => {
      const dueDate = new Date(bill.dueDate)
      return !bill.isPaid && dueDate < today
    })
  }, [bills, today])

  const paidBills = useMemo(() => {
    return bills.filter((bill) => bill.isPaid)
  }, [bills])

  const addBill = useCallback(() => {
    if (!newBill.name || !newBill.dueDate) return

    const bill: BillReminder = {
      id: Date.now().toString(),
      name: newBill.name,
      amount: newBill.amount ?? 0,
      dueDate: newBill.dueDate,
      category: newBill.category || "Other",
      isRecurring: newBill.isRecurring ?? false,
      frequency: newBill.isRecurring ? (newBill.frequency ?? "monthly") : undefined,
      isPaid: false,
      reminderDays: newBill.reminderDays ?? 3,
    }

    setBills((prev) => [...prev, bill])
    setIsAddDialogOpen(false)
  }, [newBill])

  const markAsPaid = useCallback((billId: string) => {
    setBills((prev) =>
      prev.map((bill) => {
        if (bill.id !== billId) return bill
        if (bill.isRecurring && bill.frequency) {
          return {
            ...bill,
            dueDate: getNextRecurringDate(bill.dueDate, bill.frequency),
          }
        }
        return { ...bill, isPaid: true }
      }),
    )
  }, [])

  const deleteBill = useCallback((billId: string) => {
    setBills((prev) => prev.filter((bill) => bill.id !== billId))
  }, [])

  const getBillStatus = useCallback((daysUntilDue: number) => {
    if (daysUntilDue < 0) return { status: "overdue", color: "text-red-600 bg-red-50", icon: AlertTriangle }
    if (daysUntilDue <= 3) return { status: "urgent", color: "text-orange-600 bg-orange-50", icon: Clock }
    if (daysUntilDue <= 7) return { status: "soon", color: "text-yellow-600 bg-yellow-50", icon: Bell }
    return { status: "upcoming", color: "text-blue-600 bg-blue-50", icon: Calendar }
  }, [])

  const canSubmit = newBill.name?.trim() && newBill.dueDate

  // Virtual scroll state
  const billListRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const BILL_ITEM_HEIGHT = 76

  const visibleStart = Math.floor(scrollTop / BILL_ITEM_HEIGHT)
  const visibleCount = billListRef.current ? Math.ceil(billListRef.current.clientHeight / BILL_ITEM_HEIGHT) + 2 : 8
  const visibleBills = upcomingBills.slice(visibleStart, visibleStart + visibleCount)
  const totalHeight = upcomingBills.length * BILL_ITEM_HEIGHT

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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
          <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-primary/10 flex flex-col max-h-[85vh]">
            <div className="shrink-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-3">
              <DialogHeader>
                <DialogTitle className="text-xl font-black tracking-tight">New Bill Reminder</DialogTitle>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Bill Name */}
              <div className="space-y-1.5">
                <Label htmlFor="bill-name" className="text-sm font-semibold">Bill Name</Label>
                <Input
                  id="bill-name"
                  value={newBill.name}
                  onChange={(e) => setNewBill((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Rent, Electricity"
                  className="h-11 rounded-xl border-primary/20 focus:border-primary"
                />
              </div>

              {/* Amount + Due Date row */}
              <div className="grid grid-cols-2 gap-4">
                <AmountInput
                  id="bill-amount"
                  label="Amount"
                  value={newBill.amount ?? ""}
                  onChange={(val) => setNewBill((prev) => ({ ...prev, amount: val ? Number(val) : undefined }))}
                  currencySymbol={getCurrencySymbol(userProfile.currency, userProfile.customCurrency)}
                  className="h-11 rounded-xl border-primary/20 focus:border-primary"
                  placeholder="0.00"
                />
                <div className="space-y-1.5">
                  <Label htmlFor="bill-date" className="text-sm font-semibold">Due Date</Label>
                  <Input
                    id="bill-date"
                    type="date"
                    value={newBill.dueDate}
                    onChange={(e) => setNewBill((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="h-11 rounded-xl border-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Category with suggestions */}
              <div className="space-y-1.5">
                <Label htmlFor="bill-category" className="text-sm font-semibold">Category</Label>
                <Input
                  id="bill-category"
                  value={newBill.category}
                  onChange={(e) => setNewBill((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Select or type a category"
                  className="h-11 rounded-xl border-primary/20 focus:border-primary"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {COMMON_CATEGORIES.filter((c) => c !== newBill.category).slice(0, 6).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewBill((prev) => ({ ...prev, category: cat }))}
                      className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recurring toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <div>
                    <Label htmlFor="recurring-toggle" className="text-sm font-semibold cursor-pointer">
                      Recurring Bill
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      {newBill.isRecurring ? `Repeats ${newBill.frequency ?? "monthly"}` : "One-time bill"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="recurring-toggle"
                  checked={newBill.isRecurring ?? false}
                  onCheckedChange={(checked) =>
                    setNewBill((prev) => ({ ...prev, isRecurring: checked, frequency: checked ? (prev.frequency ?? "monthly") : undefined }))
                  }
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Frequency selector — only shown when recurring */}
              {newBill.isRecurring && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Frequency</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["monthly", "weekly", "yearly"] as const).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setNewBill((prev) => ({ ...prev, frequency: freq }))}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold capitalize transition-all border ${
                          newBill.frequency === freq
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary/30"
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reminder days */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Remind me</Label>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNewBill((prev) => ({ ...prev, reminderDays: opt.value }))}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                        newBill.reminderDays === opt.value
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 border-t border-primary/10 px-6 py-4 bg-white dark:bg-slate-950">
              <div className="flex gap-3">
                <Button onClick={addBill} disabled={!canSubmit} className="flex-1 h-12 rounded-xl font-bold">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Bill
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="flex-1 h-12 rounded-xl border-primary/20"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming Bills */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Upcoming Bills
            {upcomingBills.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">({upcomingBills.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBills.length === 0 && paidBills.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No bills yet</p>
              <p className="text-sm">Add a bill to start tracking</p>
            </div>
          ) : upcomingBills.length === 0 && paidBills.length > 0 ? (
            <div className="text-center text-muted-foreground py-6">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
              <p>All bills paid!</p>
              <p className="text-sm">You&apos;re all caught up</p>
            </div>
          ) : (
            <div
              ref={billListRef}
              className="overflow-y-auto scrollbar-thin [-ms-overflow-style:none] [scrollbar-width:thin]"
              style={{ maxHeight: 380 }}
              onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            >
              <div style={{ height: totalHeight, position: "relative" }}>
                {visibleBills.map((bill) => {
                  const status = getBillStatus(bill.daysUntilDue)
                  const StatusIcon = status.icon
                  const index = upcomingBills.indexOf(bill)

                  return (
                    <div
                      key={bill.id}
                      style={{
                        position: "absolute",
                        top: 0,
                        transform: `translateY(${index * BILL_ITEM_HEIGHT}px)`,
                        left: 0,
                        right: 0,
                        height: BILL_ITEM_HEIGHT - 8,
                      }}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary/20 transition-colors bg-white dark:bg-slate-950/50 mx-0.5"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-2 rounded-full shrink-0 ${status.color}`}>
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{bill.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {bill.daysUntilDue < 0
                                ? `${Math.abs(bill.daysUntilDue)}d overdue`
                                : bill.daysUntilDue === 0
                                  ? "Due today"
                                  : `${bill.daysUntilDue}d left`}
                            </span>
                            {bill.category && (
                              <>
                                <span>·</span>
                                <span>{bill.category}</span>
                              </>
                            )}
                            {bill.isRecurring && (
                              <>
                                <span>·</span>
                                <RefreshCw className="w-3 h-3" />
                                <span className="capitalize">{bill.frequency}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        <span className="font-semibold text-sm tabular-nums">
                          {formatCurrency(bill.amount, userProfile.currency, userProfile.customCurrency)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => markAsPaid(bill.id)}
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                          title={bill.isRecurring ? "Mark paid (next period)" : "Mark paid"}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteBill(bill.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paid Bills Summary */}
      {paidBills.length > 0 && (
        <div className="text-center">
          <button
            onClick={() => setBills((prev) => prev.filter((b) => !b.isPaid))}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Clear {paidBills.length} paid bill{paidBills.length > 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  )
}
