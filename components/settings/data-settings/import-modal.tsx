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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
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
}

type ImportMode = "all" | "custom"

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
  const [importOptions, setImportOptions] = useState<ImportOptions>(defaultOptions)
  const [needsWalletPin, setNeedsWalletPin] = useState(false)

  const availableOptions = useMemo(() => getAvailableOptions(availableImportData), [availableImportData])

  useEffect(() => {
    if (!availableImportData) return
    setImportOptions(availableOptions)
    setImportMode("all")
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
        <div className="flex justify-center py-2">
          <InputOTP
            id="import-pin"
            maxLength={6}
            value={importPin}
            onChange={(value) => {
              setImportPin(value)
              setImportError("")
            }}
          >
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
        <Input
          type="password"
          placeholder="Backup PIN"
          value={importPin}
          onChange={(e) => {
            setImportPin(e.target.value)
            setImportError("")
          }}
          className="sr-only"
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
            ["debtProfile", "Debt Account + History", Array.isArray(availableImportData?.debtAccounts) ? `${availableImportData.debtAccounts.length} accounts` : "Not in backup"],
            ["creditProfile", "Credit Account + History", Array.isArray(availableImportData?.creditAccounts) ? `${availableImportData.creditAccounts.length} accounts` : "Not in backup"],
            ["categories", "Categories", Array.isArray(availableImportData?.categories) ? `${availableImportData.categories.length} items` : "Not in backup"],
            ["emergencyFund", "Emergency Fund", (typeof availableImportData?.emergencyFund === "number" || typeof availableImportData?.emergencyFund === "string") ? String(availableImportData.emergencyFund) : "Not in backup"],
            [
              "portfolioProfile",
              "Portfolio Profile",
              `Holdings ${
                Array.isArray(availableImportData?.portfolio) ? availableImportData.portfolio.length : 0
              }, Transactions ${
                Array.isArray(availableImportData?.shareTransactions) ? availableImportData.shareTransactions.length : 0
              }, Lists ${
                Array.isArray(availableImportData?.portfolios) ? availableImportData.portfolios.length : 0
              }`,
            ],
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

      {needsWalletPin && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <Label htmlFor="wallet-pin" className="text-sm font-medium">
            Wallet PIN (to save restored data)
          </Label>
          <div className="flex justify-center py-2">
            <InputOTP
              id="wallet-pin"
              maxLength={6}
              value={walletPin}
              onChange={(value) => {
                setWalletPin(value)
                setImportError("")
              }}
            >
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
          <Input
            type="password"
            placeholder="Current wallet PIN"
            value={walletPin}
            onChange={(e) => {
              setWalletPin(e.target.value)
              setImportError("")
            }}
            className="sr-only"
          />
          <p className="text-xs text-muted-foreground">
            This is required to re-encrypt your data on this device. If your backup PIN is the same, you can reuse it.
          </p>
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
              <Button onClick={decryptBackup} disabled={importPin.trim().length !== 6 || isBusy}>
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
