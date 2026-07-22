"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { PiggyBank, RefreshCw, Upload } from "lucide-react"
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
import { AppDateInput } from "@/components/ui/app-date-input"
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
import { SIP_DEFAULT_DPS_CHARGE, SIP_REMINDER_DAY_OPTIONS, calculateSipNetInvestment, formatSipDate, getSipDueDateAtIndex, getSipNextInstallmentDate, parseSipHistoryImportCsvRows, parseSipHistoryImportFileToCsv } from "@/lib/sip"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Settings2 } from "lucide-react"
import { useCalendarSystem } from "@/hooks/use-calendar-system"
import { toAdDateKey } from "@/lib/app-calendar"

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
  return toAdDateKey(date)
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
  const { saveSipPlan, deleteSipPlan, enrollMultipleShareTransactionsInSipPlan, userProfile, importSipPlanFromProvider, addShareTransaction, deleteMultipleShareTransactions, shareTransactions } = useWalletData()
    const calendarSystem = useCalendarSystem()
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
  const [isRefreshingFromProvider, setIsRefreshingFromProvider] = useState(false)
  const [isImportingFile, setIsImportingFile] = useState(false)
  const [importReview, setImportReview] = useState<{
    fileName: string
    totalRows: number
    matchedCount: number
    unmatchedRows: Record<string, string>[]
    existingToDelete: { id: string }[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const initialId = initialEnrollmentTransactionId || undefined
      const initialExists = initialId ? enrollableTransactions.some((tx) => tx.id === initialId) : false
      setSelectedEnrollmentId(
        initialExists && initialId ? initialId
          : enrollableTransactions.length > 0 ? enrollableTransactions[0].id
          : NO_ENROLLMENT_VALUE
      )
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
        installmentAmount: "",
        frequency: "monthly",
        startDate: enrollmentTx.date?.slice(0, 10) || getDefaultStartDate(),
        reminderDays: "3",
        mode: "manual",
        status: "active",
      })
      return
    }

    setForm({
      installmentAmount: "",
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
          ? `${assetLabel} is scheduled from ${formatSipDate(form.startDate, calendarSystem)} and ${historicalTransactionsToEnroll.length} history installment${historicalTransactionsToEnroll.length === 1 ? "" : "s"} were linked.`
          : `${assetLabel} is now scheduled from ${formatSipDate(form.startDate, calendarSystem)}.`,
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

  const handleImportFromProvider = async () => {
    if (!existingPlan) return

    setIsRefreshingFromProvider(true)
    try {
      await importSipPlanFromProvider(existingPlan.id)
      onPlanSaved?.("updated")
    } catch (error: any) {
      toast.error("Could not refresh SIP data", {
        description: error?.message || "Please try again.",
      })
    } finally {
      setIsRefreshingFromProvider(false)
    }
  }

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImportingFile(true)
    try {
      const csvContent = await parseSipHistoryImportFileToCsv(file)
      const rows = parseSipHistoryImportCsvRows(csvContent)
      if (rows.length === 0) {
        throw new Error("The selected file did not contain any transaction rows")
      }

      const header = Object.keys(rows[0] || {})
      const isTransactionHistory = header.some((column) => /date|type|scheme|units|nav|total amount/.test(column))
      if (!isTransactionHistory) {
        throw new Error("Please choose a transaction-history export instead of a price file")
      }

      const existingForSymbol = shareTransactions.filter(
        (tx) => tx.symbol === item?.symbol && tx.portfolioId === item?.portfolioId
      )

      const existingKeySet = new Set(
        existingForSymbol.map((tx) =>
          `${tx.date}|${tx.type}|${tx.description}|${Number(tx.quantity).toFixed(6)}|${Number(tx.price).toFixed(6)}`
        )
      )

      const unmatchedRows: Record<string, string>[] = []
      let matchedCount = 0

      for (const row of rows) {
        const units = Number(row.units || 0)
        const nav = Number(row.nav || row.price || 0)
        const rawDate = (row.date || "").toString().trim()
        if (!rawDate || !Number.isFinite(units) || units <= 0 || !Number.isFinite(nav) || nav <= 0) {
          unmatchedRows.push(row)
          continue
        }
        const parts = rawDate.split("-")
        const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : rawDate
        const typeVal = (row.type || "").toString().toUpperCase()
        const scheme = (row.scheme || "").toString().trim()
        const isFractional = typeVal.includes("FRACTIONAL")
        const isDirp = typeVal.includes("DIRP") || typeVal.includes("DRIP") || typeVal.includes("DIVIDEND REINVESTMENT")
        const isOneTime = typeVal.includes("ONE TIME")
        const txType = isFractional ? "reinvestment" : isDirp ? "bonus" : "buy"
        const desc = isFractional
          ? `Fractional Allotment - ${scheme}`
          : isDirp
            ? `DiRP - ${scheme}`
            : isOneTime
              ? `One Time Purchase - ${scheme}`
              : `SIP Installment - ${scheme}`

        const key = `${isoDate}|${txType}|${desc}|${units.toFixed(6)}|${nav.toFixed(6)}`
        if (existingKeySet.has(key)) {
          matchedCount++
        } else {
          unmatchedRows.push(row)
        }
      }

      const matchedIds = new Set<string>()
      for (const row of rows) {
        const units = Number(row.units || 0)
        const nav = Number(row.nav || row.price || 0)
        const rawDate = (row.date || "").toString().trim()
        if (!rawDate || !Number.isFinite(units) || units <= 0 || !Number.isFinite(nav) || nav <= 0) continue
        const parts = rawDate.split("-")
        const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : rawDate
        const typeVal = (row.type || "").toString().toUpperCase()
        const scheme = (row.scheme || "").toString().trim()
        const isFractional = typeVal.includes("FRACTIONAL")
        const isDirp = typeVal.includes("DIRP") || typeVal.includes("DRIP") || typeVal.includes("DIVIDEND REINVESTMENT")
        const isOneTime = typeVal.includes("ONE TIME")
        const txType = isFractional ? "reinvestment" : isDirp ? "bonus" : "buy"
        const desc = isFractional
          ? `Fractional Allotment - ${scheme}`
          : isDirp
            ? `DiRP - ${scheme}`
            : isOneTime
              ? `One Time Purchase - ${scheme}`
              : `SIP Installment - ${scheme}`
        const key = `${isoDate}|${txType}|${desc}|${units.toFixed(6)}|${nav.toFixed(6)}`
        if (existingKeySet.has(key)) {
          const match = existingForSymbol.find((tx) =>
            tx.date === isoDate && tx.type === txType && tx.description === desc &&
            Number(tx.quantity).toFixed(6) === units.toFixed(6) &&
            Number(tx.price).toFixed(6) === nav.toFixed(6)
          )
          if (match) matchedIds.add(match.id)
        }
      }

      const existingToDelete = existingForSymbol.filter((tx) => !matchedIds.has(tx.id))

      setImportReview({
        fileName: file.name,
        totalRows: rows.length,
        matchedCount,
        unmatchedRows,
        existingToDelete: existingToDelete.map((tx) => ({ id: tx.id })),
      })
    } catch (error: any) {
      toast.error("Could not import transaction history from the selected file", {
        description: error?.message || "Please try again.",
      })
    } finally {
      setIsImportingFile(false)
      if (event.target) event.target.value = ""
    }
  }

  const confirmImport = async () => {
    if (!importReview || !item) return

    setIsImportingFile(true)
    try {
      if (importReview.existingToDelete.length > 0) {
        await deleteMultipleShareTransactions(importReview.existingToDelete.map((tx) => tx.id))
      }

      let createdCount = 0
      const errors: string[] = []

      for (const row of importReview.unmatchedRows) {
        try {
          const units = Number(row.units || 0)
          const nav = Number(row.nav || row.price || 0)
          const rawDate = (row.date || "").toString().trim()
          const typeVal = (row.type || "").toString().toUpperCase()
          const scheme = (row.scheme || "").toString().trim()
          const totalWithNav = Number(row["total with nav"] || row.totalWithNav || row["nav amount"] || 0)
          const dpFee = Number(row["dp fee"] || row.dpFee || row.dpsCharge || 0)
          const sebonFee = Number(row["sebon fee"] || row.sebonFee || 0)
          const entryLoad = Number(row["entry load"] || row.entryLoad || 0)
          const exitLoad = Number(row["exit load"] || row.exitLoad || 0)
          const cgt = Number(row.cgt || 0)

          if (!rawDate || !Number.isFinite(units) || units <= 0 || !Number.isFinite(nav) || nav <= 0) continue

          const parts = rawDate.split("-")
          const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : rawDate

          const isFractional = typeVal.includes("FRACTIONAL")
          const isDirp = typeVal.includes("DIRP") || typeVal.includes("DRIP") || typeVal.includes("DIVIDEND REINVESTMENT")
          const isOneTime = typeVal.includes("ONE TIME")
          const txType = isFractional ? "reinvestment" as const : isDirp ? "bonus" as const : "buy" as const
          const desc = isFractional
            ? `Fractional Allotment - ${scheme}`
            : isDirp
              ? `DiRP - ${scheme}`
              : isOneTime
                ? `One Time Purchase - ${scheme}`
                : `SIP Installment - ${scheme}`

          await addShareTransaction({
            portfolioId: item.portfolioId,
            symbol: item.symbol,
            assetType: "stock",
            type: txType,
            quantity: units,
            price: nav,
            date: isoDate,
            description: desc,
            ...(txType === "buy" && !isOneTime && existingPlan ? {
              sipPlanId: existingPlan.id,
              sipDueDate: isoDate,
              sipGrossAmount: totalWithNav,
              sipDpsCharge: dpFee,
              sipNetAmount: totalWithNav + dpFee - sebonFee - entryLoad - exitLoad - cgt,
            } : {}),
          })
          createdCount++
        } catch (err: any) {
          errors.push(err?.message || "Unknown error")
        }
      }

      if (createdCount > 0 || importReview.existingToDelete.length > 0) {
        // Clear stale custom selections — the old transaction IDs may have been deleted
        setSelectedTransactionIds(new Set())
        if (createdCount > 0 && existingPlan) {
          await importSipPlanFromProvider(existingPlan.id, { notes: `Imported ${createdCount} transactions from ${importReview.fileName}` })
        }
        toast.success(
          createdCount > 0
            ? `${createdCount} transaction${createdCount > 1 ? "s" : ""} imported from ${importReview.fileName}`
            : `All ${importReview.matchedCount} transaction${importReview.matchedCount !== 1 ? "s" : ""} already up-to-date`,
          {
            description: `Removed ${importReview.existingToDelete.length} stale, kept ${importReview.matchedCount} up-to-date` +
              (errors.length > 0 ? `. ${errors.length} row${errors.length > 1 ? "s" : ""} failed` : ""),
          }
        )
        onPlanSaved?.("updated")
      } else {
        throw new Error(errors[0] || "No valid transaction rows could be imported")
      }
    } catch (error: any) {
      toast.error("Could not import transaction history from the selected file", {
        description: error?.message || "Please try again.",
      })
    } finally {
      setIsImportingFile(false)
      setImportReview(null)
    }
  }

  const cancelImport = () => {
    setImportReview(null)
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/45"
        className="sm:max-w-[500px] rounded-3xl border-primary/20 bg-card shadow-2xl sm:top-24 sm:translate-x-[-50%] sm:translate-y-0 sm:data-[state=open]:zoom-in-100 sm:data-[state=closed]:zoom-out-100"
        onCloseAutoFocus={(e) => e.preventDefault()}
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
        </DialogHeader>

        <div className="space-y-4">
          {!existingPlan && enrollableTransactions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Link existing buy as 1st installment</Label>
              <Select value={selectedEnrollmentId} onValueChange={(value) => {
                setSelectedEnrollmentId(value)
                setSelectedTransactionIds(new Set())
              }}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Skip for now" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ENROLLMENT_VALUE}>Skip past buys</SelectItem>
                  {enrollableTransactions.map((tx) => (
                    <SelectItem key={tx.id} value={tx.id}>
                      {formatSipDate(tx.date, calendarSystem)} • {Number.isFinite(tx.quantity) ? tx.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 }) : 0} units @ {Number.isFinite(tx.price) ? tx.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 0}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedEnrollmentId !== NO_ENROLLMENT_VALUE && (
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={openAdvancedSelect}>
                    <Settings2 className="w-3 h-3 mr-1" />
                    {selectedTransactionIds.size > 0 ? `${selectedTransactionIds.size} selected` : "Customize selection"}
                  </Button>
                  {selectedTransactionIds.size > 0 && (
                    <Button type="button" variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground" onClick={clearCustomSelection}>
                      Reset
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between py-2 border-y">
            <div>
              <p className="text-xs text-muted-foreground">Next: {nextInstallment ? formatSipDate(nextInstallment.toISOString(), calendarSystem) : "Pick a date"}</p>
              <p className="text-sm font-medium">~{computedUnits > 0 ? computedUnits.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "0"} units @ {referencePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Net per installment</p>
              <p className="text-sm font-semibold">{netInvestedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
            <div>
              <p className="text-xs font-medium">Import latest data</p>
              <p className="text-[11px] text-muted-foreground">Choose a provider export file to load the latest quote for this SIP.</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={triggerFileUpload} disabled={isImportingFile}>
                <Upload className="mr-2 h-3.5 w-3.5" />
                {isImportingFile ? "Importing..." : "Select file"}
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv,.json,.xlsx,.xls,.xlsm,.txt"
            onChange={handleFileSelection}
          />

          {importReview ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{importReview.fileName}</span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  <strong>{importReview.matchedCount}</strong> row{importReview.matchedCount !== 1 ? "s" : ""} already up-to-date - skipped.
                  {importReview.existingToDelete.length > 0 && (
                    <> <strong>{importReview.existingToDelete.length}</strong> existing will be removed.</>
                  )}
                  {importReview.unmatchedRows.length > 0 && (
                    <> <strong>{importReview.unmatchedRows.length}</strong> new will be created.</>
                  )}
                </p>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2 text-center">
                    <p className="text-lg font-bold text-green-600">{importReview.matchedCount}</p>
                    <p className="text-[10px] text-muted-foreground">up-to-date</p>
                  </div>
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-center">
                    <p className="text-lg font-bold text-destructive">{importReview.existingToDelete.length}</p>
                    <p className="text-[10px] text-muted-foreground">to delete</p>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-center">
                    <p className="text-lg font-bold text-primary">{importReview.unmatchedRows.length}</p>
                    <p className="text-[10px] text-muted-foreground">to create</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={cancelImport} disabled={isImportingFile}>
                  Cancel
                </Button>
                <Button type="button" variant="default" size="sm" className="flex-1" onClick={confirmImport} disabled={isImportingFile}>
                  {isImportingFile ? "Importing..." : "Confirm Replace"}
                </Button>
              </div>
            </div>
          ) : (<>
          <div className="space-y-2">
            <Label htmlFor="sip-amount" className="text-xs">Contribution amount</Label>
            <Input
              id="sip-amount"
              type="number"
              min="0"
              step="0.01"
              className="h-10"
              value={form.installmentAmount}
              onChange={(event) => setForm((current) => ({ ...current, installmentAmount: event.target.value }))}
            />
            <p className="text-[10px] text-muted-foreground">
              DP charge of {SIP_DEFAULT_DPS_CHARGE} per installment deducted from contribution
            </p>
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
              <AppDateInput
                id="sip-date"
                value={form.startDate}
                calendarSystem={calendarSystem}
                onChange={(date) => setForm((current) => ({ ...current, startDate: date }))}
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
          </>)}
        </div>

        {!importReview && (
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
        )}
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
              Transactions from {selectedEnrollmentTx ? formatSipDate(selectedEnrollmentTx?.date, calendarSystem) : "start date"}
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
                          <span className="font-medium">{formatSipDate(tx.date, calendarSystem)}</span>
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
