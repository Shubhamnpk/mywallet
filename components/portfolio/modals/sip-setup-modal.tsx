"use client"

import { useEffect, useMemo, useState } from "react"
import { BellRing, CalendarDays, PiggyBank, TrendingUp } from "lucide-react"
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

interface SIPSetupModalProps {
  item: PortfolioItem | null
  existingPlan?: SIPPlan | null
  enrollableTransactions?: ShareTransaction[]
  initialEnrollmentTransactionId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SIPFormState = {
  installmentAmount: string
  estimatedUnits: string
  frequency: SIPPlan["frequency"]
  startDate: string
  reminderDays: string
  mode: SIPPlan["mode"]
  status: SIPPlan["status"]
}

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
}: SIPSetupModalProps) {
  const { saveSipPlan, deleteSipPlan, enrollShareTransactionInSipPlan } = useWalletData()
  const [form, setForm] = useState<SIPFormState>({
    installmentAmount: "",
    estimatedUnits: "",
    frequency: "monthly",
    startDate: getDefaultStartDate(),
    reminderDays: "3",
    mode: "manual",
    status: "active",
  })
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("")

  const selectedEnrollmentTx = useMemo(
    () => enrollableTransactions.find((tx) => tx.id === selectedEnrollmentId) || null,
    [enrollableTransactions, selectedEnrollmentId],
  )

  const historicalTransactionsToEnroll = useMemo(() => {
    if (!selectedEnrollmentTx) return []
    const selectedTime = new Date(selectedEnrollmentTx.date).getTime()
    return enrollableTransactions
      .filter((tx) => {
        const txTime = new Date(tx.date).getTime()
        return Number.isFinite(txTime) && txTime >= selectedTime
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [enrollableTransactions, selectedEnrollmentTx])

  const referencePrice = useMemo(() => {
    if (!item) return 0
    return Number.isFinite(item.currentPrice) ? (item.currentPrice ?? 0) : item.buyPrice
  }, [item])

  useEffect(() => {
    if (!open) return

    if (!existingPlan) {
      setSelectedEnrollmentId(initialEnrollmentTransactionId || enrollableTransactions[0]?.id || "")
    }

    if (existingPlan) {
      setForm({
        installmentAmount: existingPlan.installmentAmount ? String(existingPlan.installmentAmount) : "",
        estimatedUnits: existingPlan.estimatedUnits ? String(existingPlan.estimatedUnits) : "",
        frequency: existingPlan.frequency,
        startDate: existingPlan.startDate?.slice(0, 10) || getDefaultStartDate(),
        reminderDays: String(existingPlan.reminderDays || 3),
        mode: existingPlan.mode,
        status: existingPlan.status,
      })
      return
    }

    const enrollmentTx = enrollableTransactions.find((tx) => tx.id === (initialEnrollmentTransactionId || enrollableTransactions[0]?.id))
    if (enrollmentTx) {
      const txPrice = Number.isFinite(enrollmentTx.price) ? enrollmentTx.price : referencePrice
      const txUnits = Number.isFinite(enrollmentTx.quantity) ? enrollmentTx.quantity : 0
      const estimatedGross = Number(((txPrice * txUnits) + SIP_DEFAULT_DPS_CHARGE).toFixed(2))
      setForm({
        installmentAmount: estimatedGross > 0 ? String(estimatedGross) : "",
        estimatedUnits: txUnits > 0 ? String(Number(txUnits.toFixed(6))) : "",
        frequency: "monthly",
        startDate: enrollmentTx.date?.slice(0, 10) || getDefaultStartDate(),
        reminderDays: "3",
        mode: "manual",
        status: "active",
      })
      return
    }

    const defaultAmount = referencePrice > 0 ? Math.max(referencePrice, 1000) : 1000
    const estimatedUnits = referencePrice > 0 ? (defaultAmount / referencePrice).toFixed(4) : ""
    setForm({
      installmentAmount: String(Number(defaultAmount.toFixed(2))),
      estimatedUnits,
      frequency: "monthly",
      startDate: getDefaultStartDate(),
      reminderDays: "3",
      mode: "manual",
      status: "active",
    })
  }, [enrollableTransactions, existingPlan, initialEnrollmentTransactionId, open, referencePrice])

  useEffect(() => {
    if (!open || existingPlan || !selectedEnrollmentTx) return

    const txPrice = Number.isFinite(selectedEnrollmentTx.price) ? selectedEnrollmentTx.price : referencePrice
    const txUnits = Number.isFinite(selectedEnrollmentTx.quantity) ? selectedEnrollmentTx.quantity : 0
    const estimatedGross = Number(((txPrice * txUnits) + SIP_DEFAULT_DPS_CHARGE).toFixed(2))

    setForm((current) => ({
      ...current,
      installmentAmount: estimatedGross > 0 ? String(estimatedGross) : current.installmentAmount,
      estimatedUnits: txUnits > 0 ? String(Number(txUnits.toFixed(6))) : current.estimatedUnits,
      startDate: selectedEnrollmentTx.date?.slice(0, 10) || current.startDate,
    }))
  }, [existingPlan, open, referencePrice, selectedEnrollmentTx])

  const amount = Number(form.installmentAmount)
  const units = Number(form.estimatedUnits)
  const computedUnits = Number.isFinite(units) && units > 0
    ? units
    : (referencePrice > 0 && Number.isFinite(amount) && amount > 0 ? calculateSipNetInvestment(amount, SIP_DEFAULT_DPS_CHARGE) / referencePrice : 0)
  const netInvestedAmount = calculateSipNetInvestment(amount, SIP_DEFAULT_DPS_CHARGE)

  const nextInstallment = useMemo(
    () => getSipNextInstallmentDate({ startDate: form.startDate, frequency: form.frequency }, new Date()),
    [form.frequency, form.startDate],
  )

  const assetLabel = item?.assetName || item?.symbol || "Selected asset"
  const priceLabel = item?.sector === "Mutual Fund" ? "Latest NAV" : "Current price"

  const handleSave = async () => {
    if (!item) return

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid installment amount")
      return
    }

    if (!form.startDate) {
      toast.error("Choose a start date")
      return
    }

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
        for (const [index, tx] of historicalTransactionsToEnroll.entries()) {
          const dueDate = getSipDueDateAtIndex(
            { startDate: form.startDate, frequency: form.frequency },
            index,
          )?.toISOString() || tx.date
          const txPrice = Number.isFinite(tx.price) ? tx.price : 0
          const txGrossAmount = index === 0
            ? amount
            : Number(((txPrice * (tx.quantity || 0)) + SIP_DEFAULT_DPS_CHARGE).toFixed(2))

          await enrollShareTransactionInSipPlan(tx.id, saved.id, {
            dueDate,
            grossAmount: txGrossAmount,
            dpsCharge: SIP_DEFAULT_DPS_CHARGE,
          })
        }
      } catch (error: any) {
        toast.error("SIP created, but history installments could not be linked", {
          description: error?.message || "You can enroll the transaction later.",
        })
        onOpenChange(false)
        return
      }
    }

    toast.success(existingPlan ? "SIP plan updated" : "SIP plan created", {
      description: selectedEnrollmentTx && !existingPlan
        ? `${assetLabel} is scheduled from ${formatSipDate(form.startDate)} and ${historicalTransactionsToEnroll.length} history installment${historicalTransactionsToEnroll.length === 1 ? "" : "s"} were linked.`
        : `${assetLabel} is now scheduled from ${formatSipDate(form.startDate)}.`,
    })
    onOpenChange(false)
  }

  const handleDelete = async () => {
    if (!existingPlan) return
    try {
      await deleteSipPlan(existingPlan.id)
      toast.success("SIP plan removed", {
        description: `${assetLabel} is no longer scheduled for SIP reminders, and linked SIP history was cleared.`,
      })
      onOpenChange(false)
    } catch (error: any) {
      toast.error("Could not remove SIP plan", {
        description: error?.message || "Please try again.",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/45 backdrop-blur-0"
        className="sm:max-w-[500px] rounded-3xl border-primary/20 bg-card shadow-2xl backdrop-blur-0 will-change-auto sm:top-24 sm:translate-x-[-50%] sm:translate-y-0 sm:data-[state=open]:zoom-in-100 sm:data-[state=closed]:zoom-out-100"
      >
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary/25 bg-background text-primary shadow-sm">
                  <PiggyBank className="mr-1 h-3 w-3" />
                  {existingPlan ? "Manage SIP" : "Start SIP"}
                </Badge>
                <Badge variant="outline">{item?.sector || "Equity"}</Badge>
              </div>
              <DialogTitle>{assetLabel}</DialogTitle>
            </div>
          </div>
          <DialogDescription>
            Set a recurring investment plan with reminders and a clear next installment date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {!existingPlan && enrollableTransactions.length > 0 && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-primary">Already started SIP?</p>
                <p className="mt-1 text-sm font-medium text-foreground">Pick an existing buy transaction and we will enroll it as installment 1.</p>
              </div>
              <div className="space-y-2">
                <Label>Enroll existing buy</Label>
                <Select value={selectedEnrollmentId} onValueChange={setSelectedEnrollmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Skip for now" />
                  </SelectTrigger>
                  <SelectContent>
                    {enrollableTransactions.map((tx) => (
                      <SelectItem key={tx.id} value={tx.id}>
                        {formatSipDate(tx.date)} • {Number.isFinite(tx.quantity) ? tx.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 }) : 0} units @ {Number.isFinite(tx.price) ? tx.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 0}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEnrollmentTx && (
                  <p className="text-[11px] text-muted-foreground">
                    This buy will be linked after the SIP plan is created.
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
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Approx units</p>
                <p className="mt-1 font-semibold">{computedUnits > 0 ? computedUnits.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "0"}</p>
              </div>
              <div className="rounded-xl bg-background/70 p-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Net invest</p>
                <p className="mt-1 font-semibold">{netInvestedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sip-amount">Installment amount</Label>
              <Input
                id="sip-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.installmentAmount}
                onChange={(event) => setForm((current) => ({ ...current, installmentAmount: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sip-units">Estimated units</Label>
              <Input
                id="sip-units"
                type="number"
                min="0"
                step="0.0001"
                value={form.estimatedUnits}
                onChange={(event) => setForm((current) => ({ ...current, estimatedUnits: event.target.value }))}
              />
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
            <Button type="button" onClick={handleSave}>
              {existingPlan ? "Save Changes" : "Create SIP"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
