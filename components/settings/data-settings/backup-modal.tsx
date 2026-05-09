"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { SecurePinManager } from "@/lib/secure-pin-manager"
import { SecureKeyManager } from "@/lib/key-manager"
import { toast } from "@/hooks/use-toast"
import { Download } from "lucide-react"

interface BackupModalProps {
  isOpen: boolean
  onClose: () => void
  onBackupComplete: () => void
  userProfile: any
  transactions: any[]
  budgets: any[]
  goals: any[]
  debtAccounts: any[]
  creditAccounts: any[]
  debtCreditTransactions: any[]
  categories: any[]
  emergencyFund: number
  portfolio: any[]
  shareTransactions: any[]
  portfolios: any[]
  activePortfolioId: string | null
  onBackupSuccess: (data: any, pin: string) => Promise<void>
  shifts?: any[]
  shiftPayments?: any[]
  shiftRate?: number
  shiftTimeFormat?: string
}

type BackupOptions = {
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

export function BackupModal({
  isOpen,
  onClose,
  onBackupComplete,
  userProfile,
  transactions,
  budgets,
  goals,
  debtAccounts,
  creditAccounts,
  debtCreditTransactions,
  categories,
  emergencyFund,
  portfolio,
  shareTransactions,
  portfolios,
  activePortfolioId,
  onBackupSuccess,
  shifts,
  shiftPayments,
  shiftRate,
  shiftTimeFormat,
}: BackupModalProps) {
  const [exportPin, setExportPin] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [isCustomizeMode, setIsCustomizeMode] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    userProfile: true,
    transactions: true,
    budgets: true,
    goals: true,
    debtProfile: true,
    creditProfile: true,
    categories: true,
    emergencyFund: true,
    portfolioProfile: true,
    shiftTracker: true,
  })
  const customCategoriesOnly = categories.filter((category) => !category?.isDefault)
  const fullBackupOptions: BackupOptions = {
    userProfile: true,
    transactions: true,
    budgets: true,
    goals: true,
    debtProfile: true,
    creditProfile: true,
    categories: true,
    emergencyFund: true,
    portfolioProfile: true,
    shiftTracker: true,
  }
  const effectiveOptions = isCustomizeMode ? backupOptions : fullBackupOptions
  const getCount = (key: keyof BackupOptions) => {
    switch (key) {
      case "userProfile":
        return userProfile ? 1 : 0
      case "transactions":
        return transactions.length
      case "budgets":
        return budgets.length
      case "goals":
        return goals.length
      case "debtProfile":
        return debtAccounts.length + debtCreditTransactions.filter((item: any) => item?.accountType === "debt").length
      case "creditProfile":
        return creditAccounts.length + debtCreditTransactions.filter((item: any) => item?.accountType === "credit").length
      case "categories":
        return customCategoriesOnly.length
      case "emergencyFund":
        return 1
      case "portfolioProfile":
        return portfolio.length + shareTransactions.length + portfolios.length + (activePortfolioId ? 1 : 0)
      case "shiftTracker":
        return (shifts?.length || 0) + (shiftPayments?.length || 0)
      default:
        return 0
    }
  }
  const selectedKeys = Object.entries(backupOptions)
    .filter(([key, enabled]) => (isCustomizeMode ? enabled : fullBackupOptions[key as keyof BackupOptions]))
    .map(([key]) => key as keyof BackupOptions)
  const selectedRecords = selectedKeys.reduce((sum, key) => sum + getCount(key), 0)

  const setOption = (key: keyof BackupOptions, value: boolean) => {
    setBackupOptions((prev) => ({ ...prev, [key]: value }))
  }

  const applyPreset = (preset: "all" | "none" | "financial" | "portfolio") => {
    if (preset === "all") {
      setBackupOptions({
        userProfile: true,
        transactions: true,
        budgets: true,
        goals: true,
        debtProfile: true,
        creditProfile: true,
        categories: true,
        emergencyFund: true,
        portfolioProfile: true,
        shiftTracker: true,
      })
      return
    }
    if (preset === "none") {
      setBackupOptions({
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
      })
      return
    }
    if (preset === "financial") {
      setBackupOptions({
        userProfile: false,
        transactions: true,
        budgets: true,
        goals: true,
        debtProfile: true,
        creditProfile: true,
        categories: true,
        emergencyFund: true,
        portfolioProfile: true,
        shiftTracker: true,
      })
      return
    }
    setBackupOptions({
      userProfile: false,
      transactions: false,
      budgets: false,
      goals: false,
      debtProfile: false,
      creditProfile: false,
      categories: false,
      emergencyFund: false,
      portfolioProfile: true,
      shiftTracker: false,
    })
  }

  const handleExportData = async () => {
    const cachedPin = SecureKeyManager.getCachedSessionPin()
    const pinToUse = exportPin || cachedPin || ""
    setExportError(null)
    if (!pinToUse) {
      setExportError("Please enter your wallet PIN to create an encrypted backup.")
      toast({
        title: "PIN Required",
        description: "Please enter your wallet PIN to create an encrypted backup.",
        variant: "destructive",
      })
      return
    }
    if (pinToUse.length !== 6) {
      setExportError("PIN must be 6 digits.")
      toast({
        title: "Invalid PIN",
        description: "PIN must be 6 digits.",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)
    try {
      // Enforce wallet PIN: backups can only be encrypted with the active wallet PIN.
      if (!SecurePinManager.hasPin()) {
        setExportError("Set a wallet PIN in Security settings before creating encrypted backups.")
        toast({
          title: "Wallet PIN Required",
          description: "Set a wallet PIN in Security settings before creating encrypted backups.",
          variant: "destructive",
        })
        return
      }

      const validation = await SecurePinManager.validatePin(pinToUse)
      if (!validation.success) {
        setExportError("Backup blocked. Use your current wallet PIN.")
        toast({
          title: "Invalid Wallet PIN",
          description: "Backup blocked. Use your current wallet PIN.",
          variant: "destructive",
        })
        return
      }

      // Prepare selective data for backup
      const data: any = {
        exportDate: new Date().toISOString(),
        version: "2.0",
        backupOptions: effectiveOptions,
      }

      if (effectiveOptions.userProfile) data.userProfile = userProfile
      if (effectiveOptions.transactions) data.transactions = transactions
      if (effectiveOptions.budgets) data.budgets = budgets
      if (effectiveOptions.goals) data.goals = goals
      let accountHistory: any[] = []
      if (effectiveOptions.debtProfile) {
        data.debtAccounts = debtAccounts
        const debtIds = new Set(debtAccounts.map((item) => item.id))
        accountHistory = [
          ...accountHistory,
          ...debtCreditTransactions.filter((item) => debtIds.has(item?.accountId) || item?.accountType === "debt"),
        ]
      }
      if (effectiveOptions.creditProfile) {
        data.creditAccounts = creditAccounts
        const creditIds = new Set(creditAccounts.map((item) => item.id))
        accountHistory = [
          ...accountHistory,
          ...debtCreditTransactions.filter((item) => creditIds.has(item?.accountId) || item?.accountType === "credit"),
        ]
      }
      if (accountHistory.length > 0) {
        const unique = new Map<string, any>()
        accountHistory.forEach((item) => {
          if (item?.id) unique.set(item.id, item)
        })
        data.debtCreditTransactions = unique.size > 0 ? Array.from(unique.values()) : accountHistory
      }
      if (effectiveOptions.categories) data.categories = customCategoriesOnly
      if (effectiveOptions.emergencyFund) data.emergencyFund = emergencyFund
      if (effectiveOptions.portfolioProfile) {
        data.portfolio = portfolio
        data.shareTransactions = shareTransactions
        data.portfolios = portfolios
        data.activePortfolioId = activePortfolioId
      }
      if (effectiveOptions.shiftTracker) {
        data.shifts = shifts || []
        data.shiftPayments = shiftPayments || []
        data.shiftRate = shiftRate ?? 0
        data.shiftTimeFormat = shiftTimeFormat || "12h"
      }

      // Profile/settings include display + biometric security metadata.
      if (effectiveOptions.userProfile) {
        const showScrollbars = localStorage.getItem("wallet_show_scrollbars") !== "false"
        const biometricEnabled = localStorage.getItem("wallet_biometric_enabled") === "true"
        data.settings = {
          ...data.settings,
          showScrollbars,
          biometric: {
            enabled: biometricEnabled,
            credentialId: localStorage.getItem("wallet_biometric_credential_id"),
            userId: localStorage.getItem("wallet_biometric_user_id"),
            wrappedPin: localStorage.getItem("wallet_biometric_pin_wrapped"),
            prfSalt: localStorage.getItem("wallet_biometric_prf_salt"),
          },
        }
      }

      // Call the parent component to handle the backup creation
      await onBackupSuccess(data, pinToUse)

      setExportPin("")
      setIsCustomizeMode(false)
      onClose()
      onBackupComplete()
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Failed to create encrypted backup. Please try again."
      setExportError(message)
      toast({
        title: "Backup Failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Backup
          </AlertDialogTitle>
          <AlertDialogDescription>
            Select data to include and enter your PIN to encrypt.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {selectedKeys.length} sections · {selectedRecords} records
            </span>
            <Badge variant={isCustomizeMode ? "secondary" : "default"} className="text-xs">
              {isCustomizeMode ? "Custom" : "Full"}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label>Enter PIN</Label>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={exportPin} onChange={setExportPin}>
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
            {SecureKeyManager.getCachedSessionPin() && exportPin.length === 0 && (
              <p className="text-center text-xs text-muted-foreground">Using your unlocked wallet session.</p>
            )}
          </div>

          {exportError && (
            <Alert variant="destructive">
              <AlertTitle>Export failed</AlertTitle>
              <AlertDescription className="break-words text-xs">{exportError}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="backup-customize-mode"
              checked={isCustomizeMode}
              onCheckedChange={(checked) => setIsCustomizeMode(!!checked)}
            />
            <Label htmlFor="backup-customize-mode" className="text-sm">
              Customize selection
            </Label>
          </div>

          {isCustomizeMode && (
            <div className="rounded-lg border p-3 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["userProfile", "User Profile", userProfile ? "1" : "0"],
                  ["transactions", "Transactions", transactions.length],
                  ["budgets", "Budgets", budgets.length],
                  ["goals", "Goals", goals.length],
                  ["debtProfile", "Debt", debtAccounts.length],
                  ["creditProfile", "Credit", creditAccounts.length],
                  ["categories", "Categories", customCategoriesOnly.length],
                  ["emergencyFund", "Emergency", "1"],
                  ["portfolioProfile", "Portfolio", portfolio.length + shareTransactions.length],
                  ["shiftTracker", "Shift Tracker", (shifts?.length || 0) + (shiftPayments?.length || 0)],
                ].map(([key, label, count]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`backup-${key}`}
                      checked={backupOptions[key as keyof BackupOptions]}
                      onCheckedChange={(checked) => setOption(key as keyof BackupOptions, !!checked)}
                    />
                    <Label htmlFor={`backup-${key}`} className="text-sm flex items-center gap-1.5">
                      {label}
                      <span className="text-[10px] font-medium bg-muted rounded-full px-1.5 py-0">{count}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter className="gap-2">
          {isCustomizeMode && (
            <div className="flex gap-2 mr-auto">
              <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("all")}>All</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("none")}>None</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("financial")}>Finance</Button>
            </div>
          )}
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            onClick={() => void handleExportData()}
            disabled={(!SecureKeyManager.getCachedSessionPin() && exportPin.length !== 6) || isExporting}
          >
            {isExporting ? "Creating..." : "Export"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
