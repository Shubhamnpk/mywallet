"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Upload } from "lucide-react"
import { SecurePinManager } from "@/lib/secure-pin-manager"
import { SecureKeyManager } from "@/lib/key-manager"

type ImportOptions = {
  userProfile: boolean
  transactions: boolean
  budgets: boolean
  goals: boolean
  debtProfile: boolean
  creditProfile: boolean
  categories: boolean
  emergencyFund: boolean
  portfolioProfile: boolean
  shiftTracker: boolean
}

type ImportMode = "all" | "custom"
type ImportPreset = "all" | "finance" | "custom" | null

type ImportStep = "file" | "pin" | "review"

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
  onImportData: (data: any, unlockPin?: string) => Promise<boolean>
}

const defaultOptions: ImportOptions = {
  userProfile: false,
  transactions: false,
  budgets: false,
  goals: false,
  debtProfile: false,
  creditProfile: false,
  categories: false,
  emergencyFund: false,
  portfolioProfile: false,
  shiftTracker: false,
}

function getAvailableOptions(data: any): ImportOptions {
  const debtIds = new Set(Array.isArray(data?.debtAccounts) ? data.debtAccounts.map((item: any) => item.id) : [])
  const creditIds = new Set(Array.isArray(data?.creditAccounts) ? data.creditAccounts.map((item: any) => item.id) : [])
  const history = Array.isArray(data?.debtCreditTransactions) ? data.debtCreditTransactions : []
  return {
    userProfile: !!data?.userProfile,
    transactions: Array.isArray(data?.transactions),
    budgets: Array.isArray(data?.budgets),
    goals: Array.isArray(data?.goals),
    debtProfile:
      Array.isArray(data?.debtAccounts) ||
      history.some((item: any) => debtIds.has(item?.accountId) || item?.accountType === "debt"),
    creditProfile:
      Array.isArray(data?.creditAccounts) ||
      history.some((item: any) => creditIds.has(item?.accountId) || item?.accountType === "credit"),
    categories: Array.isArray(data?.categories),
    emergencyFund: typeof data?.emergencyFund === "number" || typeof data?.emergencyFund === "string",
    portfolioProfile:
      Array.isArray(data?.portfolio) ||
      Array.isArray(data?.shareTransactions) ||
      Array.isArray(data?.portfolios) ||
      Object.prototype.hasOwnProperty.call(data ?? {}, "activePortfolioId"),
    shiftTracker:
      Array.isArray(data?.shifts) ||
      Array.isArray(data?.shiftPayments) ||
      typeof data?.shiftRate === "number",
  }
}

function getImportCount(data: any, key: keyof ImportOptions): string {
  switch (key) {
    case "userProfile":
      return data?.userProfile ? "1" : "0"
    case "transactions":
      return Array.isArray(data?.transactions) ? String(data.transactions.length) : "0"
    case "budgets":
      return Array.isArray(data?.budgets) ? String(data.budgets.length) : "0"
    case "goals":
      return Array.isArray(data?.goals) ? String(data.goals.length) : "0"
    case "debtProfile":
      return Array.isArray(data?.debtAccounts) ? String(data.debtAccounts.length) : "0"
    case "creditProfile":
      return Array.isArray(data?.creditAccounts) ? String(data.creditAccounts.length) : "0"
    case "categories":
      return Array.isArray(data?.categories) ? String(data.categories.length) : "0"
    case "emergencyFund":
      return typeof data?.emergencyFund === "number" || typeof data?.emergencyFund === "string" ? "1" : "0"
    case "portfolioProfile": {
      const holdings = Array.isArray(data?.portfolio) ? data.portfolio.length : 0
      const txns = Array.isArray(data?.shareTransactions) ? data.shareTransactions.length : 0
      return String(holdings + txns)
    }
    case "shiftTracker": {
      const shifts = Array.isArray(data?.shifts) ? data.shifts.length : 0
      const payments = Array.isArray(data?.shiftPayments) ? data.shiftPayments.length : 0
      return String(shifts + payments)
    }
    default:
      return "0"
  }
}

function buildSelectiveData(source: any, options: ImportOptions) {
  const selectiveData: any = {
    exportDate: source.exportDate || new Date().toISOString(),
    version: source.version || "2.0",
  }

  if (options.userProfile && source.userProfile) selectiveData.userProfile = source.userProfile
  if (options.transactions && source.transactions) selectiveData.transactions = source.transactions
  if (options.budgets && source.budgets) selectiveData.budgets = source.budgets
  if (options.goals && source.goals) selectiveData.goals = source.goals
  let accountHistory: any[] = []
  if (options.debtProfile && Array.isArray(source.debtAccounts)) {
    selectiveData.debtAccounts = source.debtAccounts
    const debtIds = new Set(source.debtAccounts.map((item: any) => item.id))
    accountHistory = [
      ...accountHistory,
      ...((Array.isArray(source.debtCreditTransactions) ? source.debtCreditTransactions : []).filter(
        (item: any) => debtIds.has(item?.accountId) || item?.accountType === "debt",
      )),
    ]
  }
  if (options.creditProfile && Array.isArray(source.creditAccounts)) {
    selectiveData.creditAccounts = source.creditAccounts
    const creditIds = new Set(source.creditAccounts.map((item: any) => item.id))
    accountHistory = [
      ...accountHistory,
      ...((Array.isArray(source.debtCreditTransactions) ? source.debtCreditTransactions : []).filter(
        (item: any) => creditIds.has(item?.accountId) || item?.accountType === "credit",
      )),
    ]
  }
  if (accountHistory.length > 0) {
    const unique = new Map<string, any>()
    accountHistory.forEach((item: any) => {
      if (item?.id) unique.set(item.id, item)
    })
    selectiveData.debtCreditTransactions = unique.size > 0 ? Array.from(unique.values()) : accountHistory
  }
  if (options.categories && source.categories) selectiveData.categories = source.categories
  if (options.emergencyFund && (typeof source.emergencyFund === "number" || typeof source.emergencyFund === "string")) {
    selectiveData.emergencyFund = source.emergencyFund
  }
  if (options.portfolioProfile) {
    if (Array.isArray(source.portfolio)) selectiveData.portfolio = source.portfolio
    if (Array.isArray(source.shareTransactions)) selectiveData.shareTransactions = source.shareTransactions
    if (Array.isArray(source.portfolios)) selectiveData.portfolios = source.portfolios
    if (Object.prototype.hasOwnProperty.call(source, "activePortfolioId")) {
      selectiveData.activePortfolioId = source.activePortfolioId
    }
  }
  if (options.shiftTracker) {
    if (Array.isArray(source.shifts)) selectiveData.shifts = source.shifts
    if (Array.isArray(source.shiftPayments)) selectiveData.shiftPayments = source.shiftPayments
    if (typeof source.shiftRate === "number") selectiveData.shiftRate = source.shiftRate
    if (typeof source.shiftTimeFormat === "string") selectiveData.shiftTimeFormat = source.shiftTimeFormat
  }
  // Profile/settings metadata is imported with profile selection.
  if (options.userProfile) {
    if (source.settings?.showScrollbars !== undefined) {
      selectiveData.settings = {
        ...selectiveData.settings,
        showScrollbars: source.settings.showScrollbars,
      }
    }
    if (source.settings?.biometric && typeof source.settings.biometric === "object") {
      selectiveData.settings = {
        ...selectiveData.settings,
        biometric: source.settings.biometric,
      }
    }
  }

  return selectiveData
}

export function ImportModal({ isOpen, onClose, onImportComplete, onImportData }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>("file")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [backupText, setBackupText] = useState("")
  const [importPin, setImportPin] = useState("")
  const [walletPin, setWalletPin] = useState("")
  const [importError, setImportError] = useState("")
  const [isEncrypted, setIsEncrypted] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [availableImportData, setAvailableImportData] = useState<any>(null)
  const [importMode, setImportMode] = useState<ImportMode>("all")
  const [activePreset, setActivePreset] = useState<ImportPreset>("all")
  const [importOptions, setImportOptions] = useState<ImportOptions>(defaultOptions)
  const [needsWalletPin, setNeedsWalletPin] = useState(false)

  const availableOptions = useMemo(() => getAvailableOptions(availableImportData), [availableImportData])

  useEffect(() => {
    if (!availableImportData) return
    setImportOptions(availableOptions)
    setImportMode("all")
    setActivePreset("all")
  }, [availableImportData, availableOptions])

  const refreshNeedsWalletPin = () => {
    const requiresUnlock = SecurePinManager.hasPin() && !SecureKeyManager.isKeyCacheValid()
    setNeedsWalletPin(requiresUnlock)
    return requiresUnlock
  }

  useEffect(() => {
    if (!isOpen) return
    refreshNeedsWalletPin()
  }, [isOpen])

  const resetState = () => {
    setStep("file")
    setImportFile(null)
    setBackupText("")
    setImportPin("")
    setWalletPin("")
    setImportError("")
    setIsEncrypted(false)
    setIsBusy(false)
    setAvailableImportData(null)
    setImportMode("all")
    setActivePreset("all")
    setImportOptions(defaultOptions)
    setNeedsWalletPin(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const parseOrRouteEncrypted = async () => {
    if (!importFile) return

    setIsBusy(true)
    setImportError("")

    try {
      const text = await importFile.text()
      setBackupText(text)

      const parsedData = JSON.parse(text)
      const encrypted = !!(parsedData?.version && parsedData?.salt && parsedData?.payload)

      if (encrypted) {
        setIsEncrypted(true)
        setStep("pin")
      } else {
        if (!parsedData || (typeof parsedData === "object" && Object.keys(parsedData).length === 0)) {
          throw new Error("Backup file contains no data to import")
        }
        setAvailableImportData(parsedData)
        setStep("review")
        refreshNeedsWalletPin()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid backup file"
      const normalizedMessage = message.includes("JSON") ? "Invalid backup file format - not valid JSON" : message
      setImportError(normalizedMessage)
      toast({
        title: "Import Analysis Failed",
        description: normalizedMessage,
        variant: "destructive",
      })
    } finally {
      setIsBusy(false)
    }
  }

  const decryptBackup = async () => {
    if (!backupText || !importPin.trim()) {
      const message = "PIN is required to decrypt this backup"
      setImportError(message)
      toast({
        title: "PIN Required",
        description: message,
        variant: "destructive",
      })
      return
    }
    if (importPin.trim().length !== 6) {
      const message = "PIN must be 6 digits"
      setImportError(message)
      toast({
        title: "Invalid PIN",
        description: message,
        variant: "destructive",
      })
      return
    }

    setIsBusy(true)
    setImportError("")

    try {
      const { restoreEncryptedBackup } = await import("@/lib/backup")
      const decrypted = await restoreEncryptedBackup(backupText, importPin)

      if (!decrypted || (typeof decrypted === "object" && Object.keys(decrypted).length === 0)) {
        throw new Error("Backup file contains no data to import")
      }

      setAvailableImportData(decrypted)
      setStep("review")
      const requiresUnlock = refreshNeedsWalletPin()
      if (requiresUnlock && !walletPin.trim() && importPin.trim()) {
        setWalletPin(importPin)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to decrypt backup"
      setImportError(message)
      toast({
        title: "Decryption Failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsBusy(false)
    }
  }

  const handleImport = async () => {
    if (!availableImportData) return

    const finalOptions = importMode === "all" ? availableOptions : importOptions
    const payload = buildSelectiveData(availableImportData, finalOptions)

    setIsBusy(true)
    setImportError("")

    try {
      if (needsWalletPin && !walletPin.trim()) {
        throw new Error("Wallet PIN required to save restored data")
      }
      if (needsWalletPin && walletPin.trim().length !== 6) {
        throw new Error("Wallet PIN must be 6 digits")
      }
      const success = await onImportData(payload, walletPin.trim() || undefined)
      if (!success) {
        throw new Error("Import failed - data could not be processed")
      }
      onImportComplete()
      resetState()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed"
      setImportError(message)
      toast({
        title: "Import Failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsBusy(false)
    }
  }

  const renderFileStep = () => (
    <div className="space-y-4">
      <Input
        type="file"
        accept=".json"
        onChange={(e) => {
          setImportFile(e.target.files?.[0] || null)
          setImportError("")
        }}
      />
    </div>
  )

  const renderPinStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">This backup is encrypted. Enter PIN to decrypt.</p>
      <div className="flex justify-center">
        <InputOTP maxLength={6} value={importPin} onChange={(value) => { setImportPin(value); setImportError(""); }}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setImportMode("all")
            setActivePreset("all")
            setImportOptions(availableOptions)
          }}
          className={`flex-1 rounded-lg border p-2 text-sm font-medium transition ${
            activePreset === "all" ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => {
            setImportMode("custom")
            setActivePreset("finance")
            setImportOptions({
              userProfile: true,
              transactions: true,
              budgets: true,
              goals: true,
              debtProfile: true,
              creditProfile: true,
              categories: true,
              emergencyFund: true,
              portfolioProfile: false,
              shiftTracker: true,
            })
          }}
          className={`flex-1 rounded-lg border p-2 text-sm font-medium transition ${
            activePreset === "finance" ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          Finance
        </button>
        <button
          type="button"
          onClick={() => {
            setImportMode("custom")
            setActivePreset("custom")
          }}
          className={`flex-1 rounded-lg border p-2 text-sm font-medium transition ${
            activePreset === "custom" ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          Custom
        </button>
      </div>

      {importMode === "custom" && (
        <div className="max-h-48 overflow-y-auto rounded-lg border p-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["userProfile", "User Profile"],
              ["transactions", "Transactions"],
              ["budgets", "Budgets"],
              ["goals", "Goals"],
              ["debtProfile", "Debt"],
              ["creditProfile", "Credit"],
              ["categories", "Categories"],
              ["emergencyFund", "Emergency"],
              ["portfolioProfile", "Portfolio"],
              ["shiftTracker", "Shift Tracker"],
            ].map(([key, label]) => {
              const typedKey = key as keyof ImportOptions
              const available = availableOptions[typedKey]
              const count = availableImportData ? getImportCount(availableImportData, typedKey) : "0"
              return (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`import-${key}`}
                    checked={importOptions[typedKey]}
                    onCheckedChange={(checked) => {
                      setImportOptions((prev) => ({ ...prev, [typedKey]: !!checked }))
                      setActivePreset("custom")
                    }}
                    disabled={!available}
                  />
                  <Label htmlFor={`import-${key}`} className={`text-sm flex items-center gap-1.5 ${!available ? "text-muted-foreground" : ""}`}>
                    {label}
                    <span className="text-[10px] font-medium bg-muted rounded-full px-1.5 py-0">{count}</span>
                  </Label>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {needsWalletPin && (
        <div className="space-y-2">
          <Label className="text-sm">Wallet PIN</Label>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={walletPin} onChange={(v) => { setWalletPin(v); setImportError(""); }}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Backup
          </DialogTitle>
        </DialogHeader>

        {step === "file" && renderFileStep()}
        {step === "pin" && renderPinStep()}
        {step === "review" && renderReviewStep()}

        {importError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {importError}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step !== "file" && (
            <Button variant="outline" onClick={() => setStep(step === "pin" ? "file" : "pin")} disabled={isBusy}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} disabled={isBusy}>
            Cancel
          </Button>

          {step === "file" && (
            <Button onClick={parseOrRouteEncrypted} disabled={!importFile || isBusy}>
              {isBusy ? "Loading..." : "Continue"}
            </Button>
          )}

          {step === "pin" && (
            <Button onClick={decryptBackup} disabled={importPin.trim().length !== 6 || isBusy}>
              {isBusy ? "Decrypting..." : "Continue"}
            </Button>
          )}

          {step === "review" && (
            <Button onClick={handleImport} disabled={isBusy}>
              {isBusy ? "Importing..." : "Import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
