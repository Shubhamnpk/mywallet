"use client"

import { useEffect, useMemo, useState } from "react"
import { PiggyBank } from "lucide-react"
import type { PortfolioItem, ShareTransaction, SIPPlan } from "@/types/wallet"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useWalletData } from "@/contexts/wallet-data-context"
import { SIP_DEFAULT_DPS_CHARGE, SIP_REMINDER_DAY_OPTIONS, calculateSipNetInvestment, formatSipDate, getSipDueDateAtIndex, getSipNextInstallmentDate } from "@/lib/sip"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Settings2 } from "lucide-react"

interface SIPSetupModalProps {
  item: PortfolioItem | null
  existingPlan?: SIPPlan | null
  enrollableTransactions?: ShareTransaction[]
  initialEnrollmentTransactionId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPlanSaved?: (action: "created" | "updated" | "deleted") => void
}

type SIPFormState = {
  installmentAmount: string
  frequency: SIPPlan["frequency"]
  startDate: string
  reminderDays: string
  mode: SIPPlan["mode"]
  status: SIPPlan["status"]
}

const NO_ENROLLMENT_VALUE = "__none__"

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getDefaultStartDate = () => {
  const today = new Date()
  today.setDate(today.getDate() + 1)
  return toDateInputValue(today)
}

export function SIPSetupModal({
  item,
  existingPlan,
  enrollableTransactions = [],
  initialEnrollmentTransactionId = null,
  open,
  onOpenChange,
  onPlanSaved,
}: SIPSetupModalProps) {
  const { saveSipPlan, deleteSipPlan, enrollMultipleShareTransactionsInSipPlan } = useWalletData()
  const [form, setForm] = useState<SIPFormState>({
    installmentAmount: "",
    frequency: "monthly",
    startDate: getDefaultStartDate(),
    reminderDays: "3",
    mode: "manual",
    status: "active",
  })
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(NO_ENROLLMENT_VALUE)
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set())
  const [isAdvancedSelectOpen, setIsAdvancedSelectOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const selectedEnrollmentTx = useMemo(
    () => selectedEnrollmentId === NO_ENROLLMENT_VALUE
      ? null
      : enrollableTransactions.find((tx) => tx.id === selectedEnrollmentId) || null,
    [enrollableTransactions, selectedEnrollmentId],
  )

  const historicalTransactionsToEnroll = useMemo(() => {
    if (!selectedEnrollmentTx) return []

    // If user has manually selected transactions via advanced mode, use those
    if (selectedTransactionIds.size > 0) {
      return enrollableTransactions
        .filter((tx) => selectedTransactionIds.has(tx.id))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    // Default mode: all transactions from the selected one onwards
    const selectedTime = new Date(selectedEnrollmentTx.date).getTime()
    return enrollableTransactions
      .filter((tx) => {
        const txTime = new Date(tx.date).getTime()
        return Number.isFinite(txTime) && txTime >= selectedTime
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [enrollableTransactions, selectedEnrollmentTx, selectedTransactionIds])

  const toggleTransactionSelection = (txId: string) => {
    setSelectedTransactionIds((prev) => {
      const next = new Set(prev)
      if (next.has(txId)) {
        next.delete(txId)
      } else {
        next.add(txId)
      }
      return next
    })
  }

  const openAdvancedSelect = () => {
    // Initialize with default selection (from selected tx onwards)
    if (selectedEnrollmentTx && selectedTransactionIds.size === 0) {
      const selectedTime = new Date(selectedEnrollmentTx.date).getTime()
      const defaultSelection = new Set(
        enrollableTransactions
          .filter((tx) => new Date(tx.date).getTime() >= selectedTime)
          .map((tx) => tx.id)
      )
      setSelectedTransactionIds(defaultSelection)
    }
    setIsAdvancedSelectOpen(true)
  }

  const clearCustomSelection = () => {
    setSelectedTransactionIds(new Set())
  }

  const referencePrice = useMemo(() => {
    if (!item) return 0
    return Number.isFinite(item.currentPrice) ? (item.currentPrice ?? 0) : item.buyPrice
  }, [item])

  useEffect(() => {
    if (!open) return

    if (!existingPlan) {
      setSelectedEnrollmentId(initialEnrollmentTransactionId || NO_ENROLLMENT_VALUE)
    }

    if (existingPlan) {
      setForm({
        installmentAmount: existingPlan.installmentAmount ? String(existingPlan.installmentAmount) : "",
        frequency: existingPlan.frequency,
        startDate: existingPlan.startDate?.slice(0, 10) || getDefaultStartDate(),
        reminderDays: String(existingPlan.reminderDays || 3),
        mode: existingPlan.mode,
        status: existingPlan.status,
      })
      return
    }

    const enrollmentTx = initialEnrollmentTransactionId
      ? enrollableTransactions.find((tx) => tx.id === initialEnrollmentTransactionId)
      : null
    if (enrollmentTx) {
      setForm({
        installmentAmount: "1000",
        frequency: "monthly",
        startDate: enrollmentTx.date?.slice(0, 10) || getDefaultStartDate(),
        reminderDays: "3",
        mode: "manual",
        status: "active",
      })
      return
    }

    const defaultAmount = 1000
    setForm({
      installmentAmount: String(Number(defaultAmount.toFixed(2))),
      frequency: "monthly",
      startDate: getDefaultStartDate(),
      reminderDays: "3",
      mode: "manual",
      status: "active",
    })
  }, [enrollableTransactions, existingPlan, initialEnrollmentTransactionId, open])

  useEffect(() => {
    if (!open || existingPlan || !selectedEnrollmentTx) return

    setForm((current) => ({
      ...current,
      startDate: selectedEnrollmentTx.date?.slice(0, 10) || current.startDate,
    }))
  }, [existingPlan, open, selectedEnrollmentTx])

  const amount = Number(form.installmentAmount)
  const computedUnits = referencePrice > 0 && Number.isFinite(amount) && amount > 0
    ? calculateSipNetInvestment(amount, SIP_DEFAULT_DPS_CHARGE) / referencePrice
    : 0
  const netInvestedAmount = calculateSipNetInvestment(amount, SIP_DEFAULT_DPS_CHARGE)

  const nextInstallment = useMemo(
    () => getSipNextInstallmentDate({ startDate: form.startDate, frequency: form.frequency }, new Date()),
    [form.frequency, form.startDate],
  )

  const assetLabel = item?.assetName || item?.symbol || "Selected asset"
  const priceLabel = item?.sector === "Mutual Fund" ? "Latest NAV" : "Current price"
  const unitsLabel = item?.sector === "Mutual Fund" ? "Approx units from NAV" : "Approx units from price"

  const handleSave = async () => {
    if (!item) return
    if (isSaving) return

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid installment amount")
      return
    }

    if (!form.startDate) {
      toast.error("Choose a start date")
      return
    }

    setIsSaving(true)
    try {
      const saved = saveSipPlan({
        id: existingPlan?.id,
        portfolioId: item.portfolioId,
        symbol: item.symbol.trim().toUpperCase(),
        assetType: "stock",
        assetName: item.assetName || item.symbol.trim().toUpperCase(),
        sector: item.sector,
        installmentAmount: amount,
        estimatedUnits: Number.isFinite(computedUnits) && computedUnits > 0 ? Number(computedUnits.toFixed(6)) : undefined,
        dpsCharge: SIP_DEFAULT_DPS_CHARGE,
        referencePrice: Number.isFinite(selectedEnrollmentTx?.price) && (selectedEnrollmentTx?.price ?? 0) > 0
          ? selectedEnrollmentTx?.price
          : (Number.isFinite(referencePrice) && referencePrice > 0 ? referencePrice : undefined),
        frequency: form.frequency,
        startDate: form.startDate,
        reminderDays: Number(form.reminderDays),
        mode: form.mode,
        status: form.status,
      })

      if (!saved) {
        toast.error("Could not save SIP plan")
        return
      }

      if (!existingPlan && selectedEnrollmentTx) {
        try {
          await enrollMultipleShareTransactionsInSipPlan(
            historicalTransactionsToEnroll.map((tx, index) => {
              const dueDate = getSipDueDateAtIndex(
                { startDate: form.startDate, frequency: form.frequency },
                index,
              )?.toISOString() || tx.date
              const txPrice = Number.isFinite(tx.price) ? tx.price : 0
              const txGrossAmount = index === 0
                ? amount
                : Number(((txPrice * (tx.quantity || 0)) + SIP_DEFAULT_DPS_CHARGE).toFixed(2))

              return {
                transactionId: tx.id,
                planId: saved.id,
                dueDate,
                grossAmount: txGrossAmount,
                dpsCharge: SIP_DEFAULT_DPS_CHARGE,
              }
            }),
          )
        } catch (error: any) {
          await deleteSipPlan(saved.id)
          toast.error("Could not link existing SIP history", {
            description: error?.message || "Please try again.",
          })
          return
        }
      }

      toast.success(existingPlan ? "SIP plan updated" : "SIP plan created", {
        description: selectedEnrollmentTx && !existingPlan
          ? `${assetLabel} is scheduled from ${formatSipDate(form.startDate)} and ${historicalTransactionsToEnroll.length} history installment${historicalTransactionsToEnroll.length === 1 ? "" : "s"} were linked.`
          : `${assetLabel} is now scheduled from ${formatSipDate(form.startDate)}.`,
      })
      onPlanSaved?.(existingPlan ? "updated" : "created")
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existingPlan) return
    try {
      await deleteSipPlan(existingPlan.id)
      toast.success("SIP plan removed", {
        description: `${assetLabel} is no longer scheduled for SIP reminders, and linked SIP history was cleared.`,
      })
      onPlanSaved?.("deleted")
      onOpenChange(false)
    } catch (error: any) {
      toast.error("Could not remove SIP plan", {
        description: error?.message || "Please try again.",
      })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/45"
        className="sm:max-w-[500px] rounded-3xl border-primary/20 bg-card shadow-2xl sm:top-24 sm:translate-x-[-50%] sm:translate-y-0 sm:data-[state=open]:zoom-in-100 sm:data-[state=closed]:zoom-out-100"
      >
        <DialogHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/25 bg-background text-primary shadow-sm">
              <PiggyBank className="mr-1 h-3 w-3" />
              {existingPlan ? "Manage SIP" : "Start SIP"}
            </Badge>
            <Badge variant="outline">{item?.sector || "Equity"}</Badge>
          </div>
          <DialogTitle>{assetLabel}</DialogTitle>
          <DialogDescription>
            Set a recurring investment plan from the amount you want to contribute each cycle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {!existingPlan && enrollableTransactions.length > 0 && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-primary">Already started SIP?</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  Pick an existing buy transaction and we will enroll it as installment 1.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Enroll existing buy</Label>
                <Select value={selectedEnrollmentId} onValueChange={(value) => {
                  setSelectedEnrollmentId(value)
                  // Clear custom selection when changing the base transaction
                  setSelectedTransactionIds(new Set())
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Skip for now" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ENROLLMENT_VALUE}>
                      Skip past buys
                    </SelectItem>
                    {enrollableTransactions.map((tx) => (
                      <SelectItem key={tx.id} value={tx.id}>
                        {formatSipDate(tx.date)} • {Number.isFinite(tx.quantity) ? tx.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 }) : 0} units @ {Number.isFinite(tx.price) ? tx.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 0}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Advanced selection button */}
                {selectedEnrollmentId !== NO_ENROLLMENT_VALUE && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={openAdvancedSelect}
                    >
                      <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                      {selectedTransactionIds.size > 0
                        ? `${selectedTransactionIds.size} transaction${selectedTransactionIds.size === 1 ? "" : "s"} selected`
                        : "Advanced: Select specific transactions"}
                    </Button>
                    {selectedTransactionIds.size > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 text-muted-foreground"
                        onClick={clearCustomSelection}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                )}

                {selectedEnrollmentTx && selectedTransactionIds.size === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    This buy and all subsequent buys will be linked as SIP history. Use "Advanced" to pick specific transactions only.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Plan preview</p>
                <p className="mt-1 text-base font-bold">{nextInstallment ? formatSipDate(nextInstallment.toISOString()) : "Pick a valid start date"}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{priceLabel}</p>
                <p className="mt-1 text-base font-bold">{referencePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-background/70 p-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{unitsLabel}</p>
                <p className="mt-1 font-semibold">{computedUnits > 0 ? computedUnits.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "0"}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Calculated from {priceLabel.toLowerCase()} after the {SIP_DEFAULT_DPS_CHARGE.toLocaleString(undefined, { maximumFractionDigits: 2 })} DP charge.
                </p>
              </div>
              <div className="rounded-xl bg-background/70 p-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Net invest</p>
                <p className="mt-1 font-semibold">{netInvestedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Example: {amount > 0 ? amount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} contribution becomes {netInvestedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} after DP.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="sip-amount">Contribution amount per installment</Label>
              <Input
                id="sip-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.installmentAmount}
                onChange={(event) => setForm((current) => ({ ...current, installmentAmount: event.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground">
                Units are calculated automatically from the current price or NAV. The fixed DP charge is {SIP_DEFAULT_DPS_CHARGE.toLocaleString(undefined, { maximumFractionDigits: 2 })} per installment.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={form.frequency}
                onValueChange={(value: SIPPlan["frequency"]) => setForm((current) => ({ ...current, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sip-date">Start date</Label>
              <Input
                id="sip-date"
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Reminder</Label>
              <Select
                value={form.reminderDays}
                onValueChange={(value) => setForm((current) => ({ ...current, reminderDays: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIP_REMINDER_DAY_OPTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} day{value === 1 ? "" : "s"} before
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select
                value={form.mode}
                onValueChange={(value: SIPPlan["mode"]) => setForm((current) => ({ ...current, mode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value: SIPPlan["status"]) => setForm((current) => ({ ...current, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {existingPlan ? (
            <Button type="button" variant="outline" onClick={handleDelete}>
              Remove SIP
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : existingPlan ? "Save Changes" : "Create SIP"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Advanced Transaction Selection Dialog */}
    {selectedEnrollmentId !== NO_ENROLLMENT_VALUE && (
      <Dialog open={isAdvancedSelectOpen} onOpenChange={setIsAdvancedSelectOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl border-primary/20 bg-card shadow-2xl p-0 gap-0">
          <DialogHeader className="p-5 pb-3 border-b border-primary/10">
            <DialogTitle className="text-lg font-bold">Select Transactions</DialogTitle>
            <DialogDescription className="text-sm">
              Choose which transactions to count as SIP installments
            </DialogDescription>
          </DialogHeader>

          <div className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Transactions from {selectedEnrollmentTx ? formatSipDate(selectedEnrollmentTx?.date) : "start date"}
            </p>

            <ScrollArea className="h-[300px] pr-2">
              <div className="space-y-1">
                {enrollableTransactions.map((tx) => {
                  const isSelected = selectedTransactionIds.has(tx.id)
                  const isBeforeStart = selectedEnrollmentTx
                    ? new Date(tx.date).getTime() < new Date(selectedEnrollmentTx.date).getTime()
                    : false

                  if (isBeforeStart) return null

                  const installNumber = Array.from(selectedTransactionIds)
                    .sort((a, b) => {
                      const txA = enrollableTransactions.find(t => t.id === a)
                      const txB = enrollableTransactions.find(t => t.id === b)
                      return new Date(txA?.date || 0).getTime() - new Date(txB?.date || 0).getTime()
                    })
                    .indexOf(tx.id) + 1

                  return (
                    <div
                      key={tx.id}
                      className={`flex items-center gap-3 p-3 rounded-xl text-sm transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted border border-transparent"
                      }`}
                      onClick={() => toggleTransactionSelection(tx.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggleTransactionSelection(tx.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatSipDate(tx.date)}</span>
                          {tx.type !== "buy" && (
                            <Badge variant="secondary" className="text-[9px] h-4 capitalize">
                              {tx.type}
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs mt-0.5">
                          {Number.isFinite(tx.quantity) ? tx.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 }) : 0} units
                          {Number.isFinite(tx.price) && tx.price > 0 && (
                            <span className="ml-1">@ {tx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Badge variant="outline" className="text-[11px] h-6 px-2 bg-primary/5 border-primary/20">
                          #{installNumber}
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <div className="mt-4 pt-3 border-t border-primary/10 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedTransactionIds.size}</span> transaction{selectedTransactionIds.size === 1 ? "" : "s"} selected
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsAdvancedSelectOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  )
}
