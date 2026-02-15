"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { toast } from "@/hooks/use-toast"

type ImportOptions = {
  userProfile: boolean
  transactions: boolean
  budgets: boolean
  goals: boolean
  debtAccounts: boolean
  creditAccounts: boolean
  debtCreditTransactions: boolean
  categories: boolean
  emergencyFund: boolean
  portfolio: boolean
  shareTransactions: boolean
  portfolios: boolean
  activePortfolioId: boolean
  showScrollbars: boolean
}

type ImportMode = "all" | "custom"

type ImportStep = "file" | "pin" | "review"

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
  onImportData: (data: any) => Promise<boolean>
}

const defaultOptions: ImportOptions = {
  userProfile: false,
  transactions: false,
  budgets: false,
  goals: false,
  debtAccounts: false,
  creditAccounts: false,
  debtCreditTransactions: false,
  categories: false,
  emergencyFund: false,
  portfolio: false,
  shareTransactions: false,
  portfolios: false,
  activePortfolioId: false,
  showScrollbars: false,
}

function getAvailableOptions(data: any): ImportOptions {
  return {
    userProfile: !!data?.userProfile,
    transactions: Array.isArray(data?.transactions),
    budgets: Array.isArray(data?.budgets),
    goals: Array.isArray(data?.goals),
    debtAccounts: Array.isArray(data?.debtAccounts),
    creditAccounts: Array.isArray(data?.creditAccounts),
    debtCreditTransactions: Array.isArray(data?.debtCreditTransactions),
    categories: Array.isArray(data?.categories),
    emergencyFund: typeof data?.emergencyFund === "number" || typeof data?.emergencyFund === "string",
    portfolio: Array.isArray(data?.portfolio),
    shareTransactions: Array.isArray(data?.shareTransactions),
    portfolios: Array.isArray(data?.portfolios),
    activePortfolioId: Object.prototype.hasOwnProperty.call(data ?? {}, "activePortfolioId"),
    showScrollbars: data?.settings?.showScrollbars !== undefined,
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
  if (options.debtAccounts && source.debtAccounts) selectiveData.debtAccounts = source.debtAccounts
  if (options.creditAccounts && source.creditAccounts) selectiveData.creditAccounts = source.creditAccounts
  if (options.debtCreditTransactions && Array.isArray(source.debtCreditTransactions)) {
    selectiveData.debtCreditTransactions = source.debtCreditTransactions
  }
  if (options.categories && source.categories) selectiveData.categories = source.categories
  if (options.emergencyFund && (typeof source.emergencyFund === "number" || typeof source.emergencyFund === "string")) {
    selectiveData.emergencyFund = source.emergencyFund
  }
  if (options.portfolio && Array.isArray(source.portfolio)) selectiveData.portfolio = source.portfolio
  if (options.shareTransactions && Array.isArray(source.shareTransactions)) {
    selectiveData.shareTransactions = source.shareTransactions
  }
  if (options.portfolios && Array.isArray(source.portfolios)) selectiveData.portfolios = source.portfolios
  if (options.activePortfolioId && Object.prototype.hasOwnProperty.call(source, "activePortfolioId")) {
    selectiveData.activePortfolioId = source.activePortfolioId
  }
  if (options.showScrollbars && source.settings?.showScrollbars !== undefined) {
    selectiveData.settings = {
      ...selectiveData.settings,
      showScrollbars: source.settings.showScrollbars,
    }
  }

  return selectiveData
}

export function ImportModal({ isOpen, onClose, onImportComplete, onImportData }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>("file")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [backupText, setBackupText] = useState("")
  const [importPin, setImportPin] = useState("")
  const [importError, setImportError] = useState("")
  const [isEncrypted, setIsEncrypted] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [availableImportData, setAvailableImportData] = useState<any>(null)
  const [importMode, setImportMode] = useState<ImportMode>("all")
  const [importOptions, setImportOptions] = useState<ImportOptions>(defaultOptions)

  const availableOptions = useMemo(() => getAvailableOptions(availableImportData), [availableImportData])

  useEffect(() => {
    if (!availableImportData) return
    setImportOptions(availableOptions)
    setImportMode("all")
  }, [availableImportData, availableOptions])

  const resetState = () => {
    setStep("file")
    setImportFile(null)
    setBackupText("")
    setImportPin("")
    setImportError("")
    setIsEncrypted(false)
    setIsBusy(false)
    setAvailableImportData(null)
    setImportMode("all")
    setImportOptions(defaultOptions)
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
      const success = await onImportData(payload)
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
      <div className="space-y-2">
        <Label htmlFor="import-backup-file">Backup File</Label>
        <Input
          id="import-backup-file"
          type="file"
          accept=".json"
          onChange={(e) => {
            setImportFile(e.target.files?.[0] || null)
            setImportError("")
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">Step 1 of 3: Select backup file to analyze.</p>
    </div>
  )

  const renderPinStep = () => (
    <div className="space-y-4">
      <div className="rounded-lg border bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
        This backup is encrypted. Enter your backup PIN to continue.
      </div>
      <div className="space-y-2">
        <Label htmlFor="import-pin">PIN</Label>
        <Input
          id="import-pin"
          type="password"
          placeholder="Enter backup PIN"
          value={importPin}
          onChange={(e) => {
            setImportPin(e.target.value)
            setImportError("")
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">Step 2 of 3: Decrypt backup.</p>
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Import Mode</p>
        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider">
          Schema v{availableImportData?.version || "1.0"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setImportMode("all")}
          className={`rounded-lg border p-3 text-left transition ${
            importMode === "all" ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <p className="text-sm font-semibold">Import All (Default)</p>
          <p className="text-xs text-muted-foreground">Restore every available section from this backup.</p>
        </button>
        <button
          type="button"
          onClick={() => setImportMode("custom")}
          className={`rounded-lg border p-3 text-left transition ${
            importMode === "custom" ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <p className="text-sm font-semibold">On-demand Import</p>
          <p className="text-xs text-muted-foreground">Pick specific sections to restore.</p>
        </button>
      </div>

      {importMode === "custom" && (
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-3">
          {[
            ["userProfile", "User Profile & Settings", availableImportData?.userProfile ? "Available" : "Not in backup"],
            ["transactions", "Transaction Data", Array.isArray(availableImportData?.transactions) ? `${availableImportData.transactions.length} items` : "Not in backup"],
            ["budgets", "Budget Data", Array.isArray(availableImportData?.budgets) ? `${availableImportData.budgets.length} items` : "Not in backup"],
            ["goals", "Goals & Savings", Array.isArray(availableImportData?.goals) ? `${availableImportData.goals.length} items` : "Not in backup"],
            ["debtAccounts", "Debt Accounts", Array.isArray(availableImportData?.debtAccounts) ? `${availableImportData.debtAccounts.length} items` : "Not in backup"],
            ["creditAccounts", "Credit Accounts", Array.isArray(availableImportData?.creditAccounts) ? `${availableImportData.creditAccounts.length} items` : "Not in backup"],
            ["debtCreditTransactions", "Debt/Credit History", Array.isArray(availableImportData?.debtCreditTransactions) ? `${availableImportData.debtCreditTransactions.length} items` : "Not in backup"],
            ["categories", "Categories", Array.isArray(availableImportData?.categories) ? `${availableImportData.categories.length} items` : "Not in backup"],
            ["emergencyFund", "Emergency Fund", (typeof availableImportData?.emergencyFund === "number" || typeof availableImportData?.emergencyFund === "string") ? String(availableImportData.emergencyFund) : "Not in backup"],
            ["portfolio", "Portfolio Holdings", Array.isArray(availableImportData?.portfolio) ? `${availableImportData.portfolio.length} items` : "Not in backup"],
            ["shareTransactions", "Share Transactions", Array.isArray(availableImportData?.shareTransactions) ? `${availableImportData.shareTransactions.length} items` : "Not in backup"],
            ["portfolios", "Portfolio Lists", Array.isArray(availableImportData?.portfolios) ? `${availableImportData.portfolios.length} items` : "Not in backup"],
            ["activePortfolioId", "Active Portfolio Selection", Object.prototype.hasOwnProperty.call(availableImportData ?? {}, "activePortfolioId") ? "Available" : "Not in backup"],
            ["showScrollbars", "Scrollbar Settings", availableImportData?.settings?.showScrollbars !== undefined ? "Available" : "Not in backup"],
          ].map(([key, label, description]) => {
            const typedKey = key as keyof ImportOptions
            return (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={`import-${key}`}
                  checked={importOptions[typedKey]}
                  onCheckedChange={(checked) => setImportOptions((prev) => ({ ...prev, [typedKey]: !!checked }))}
                  disabled={!availableOptions[typedKey]}
                />
                <Label htmlFor={`import-${key}`} className="text-sm">
                  {label} ({description})
                </Label>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">Step 3 of 3: Choose default import all or on-demand sections.</p>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Backup</DialogTitle>
          <DialogDescription>
            Upload backup file first. If encrypted, enter PIN. Then import all by default or choose on-demand sections.
          </DialogDescription>
        </DialogHeader>

        {step === "file" && renderFileStep()}
        {step === "pin" && renderPinStep()}
        {step === "review" && renderReviewStep()}

        {importError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {importError}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isBusy}>
            Cancel
          </Button>

          {step === "file" && (
            <Button onClick={parseOrRouteEncrypted} disabled={!importFile || isBusy}>
              {isBusy ? "Analyzing..." : "Continue"}
            </Button>
          )}

          {step === "pin" && (
            <>
              <Button variant="outline" onClick={() => setStep("file")} disabled={isBusy}>
                Back
              </Button>
              <Button onClick={decryptBackup} disabled={!importPin.trim() || isBusy}>
                {isBusy ? "Decrypting..." : "Decrypt & Continue"}
              </Button>
            </>
          )}

          {step === "review" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (isEncrypted) {
                    setStep("pin")
                    return
                  }
                  setStep("file")
                }}
                disabled={isBusy}
              >
                Back
              </Button>
              <Button onClick={handleImport} disabled={isBusy}>
                {isBusy ? "Importing..." : "Import Data"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
