"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import {
  AlertDialog,
  AlertDialogAction,
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
}: BackupModalProps) {
  const [exportPin, setExportPin] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [isCustomizeMode, setIsCustomizeMode] = useState(false)
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
      })
      return
    }
    if (preset === "financial") {
      setBackupOptions({
        userProfile: true,
        transactions: true,
        budgets: true,
        goals: true,
        debtProfile: true,
        creditProfile: true,
        categories: true,
        emergencyFund: true,
        portfolioProfile: false,
      })
      return
    }
    setBackupOptions({
      userProfile: true,
      transactions: false,
      budgets: false,
      goals: false,
      debtProfile: false,
      creditProfile: false,
      categories: false,
      emergencyFund: false,
      portfolioProfile: true,
    })
  }

  const handleExportData = async () => {
    const cachedPin = SecureKeyManager.getCachedSessionPin()
    const pinToUse = exportPin || cachedPin || ""
    if (!pinToUse) {
      toast({
        title: "PIN Required",
        description: "Please enter your wallet PIN to create an encrypted backup.",
        variant: "destructive",
      })
      return
    }
    if (pinToUse.length !== 6) {
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
        toast({
          title: "Wallet PIN Required",
          description: "Set a wallet PIN in Security settings before creating encrypted backups.",
          variant: "destructive",
        })
        return
      }

      const validation = await SecurePinManager.validatePin(pinToUse)
      if (!validation.success) {
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
      toast({
        title: "Backup Failed",
        description: "Failed to create encrypted backup. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
                Create Selective Backup
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider">
                  Schema v2.0
                </Badge>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Choose exactly what to include. Default categories are excluded automatically.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              Selected sections: <span className="font-semibold text-foreground">{selectedKeys.length}</span> | Estimated records: <span className="font-semibold text-foreground">{selectedRecords}</span>
            </div>
            <Badge variant={isCustomizeMode ? "secondary" : "default"}>{isCustomizeMode ? "Custom Mode" : "Full Backup Mode"}</Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-pin">Enter PIN for encryption</Label>
            <div className="flex justify-center py-2">
              <InputOTP
                maxLength={6}
                value={exportPin}
                onChange={setExportPin}
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
              id="export-pin"
              type="password"
              placeholder="Or paste PIN"
              value={exportPin}
              onChange={(e) => setExportPin(e.target.value)}
              className="sr-only"
            />
            <p className="text-xs text-muted-foreground">
              Must match your wallet PIN. Any other PIN will be rejected.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="backup-customize-mode"
              checked={isCustomizeMode}
              onCheckedChange={(checked) => setIsCustomizeMode(!!checked)}
            />
            <Label htmlFor="backup-customize-mode" className="text-sm">
              Customize data selection (on demand)
            </Label>
          </div>

          {isCustomizeMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Profile and Finance</p>
              <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-userProfile"
                checked={backupOptions.userProfile}
                onCheckedChange={(checked) => setOption("userProfile", !!checked)}
              />
              <Label htmlFor="backup-userProfile" className="text-sm">
                User Profile & Settings ({userProfile ? "1 item" : "0 items"})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-transactions"
                checked={backupOptions.transactions}
                onCheckedChange={(checked) => setOption("transactions", !!checked)}
              />
              <Label htmlFor="backup-transactions" className="text-sm">
                Transaction Data ({transactions.length} items)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-budgets"
                checked={backupOptions.budgets}
                onCheckedChange={(checked) => setOption("budgets", !!checked)}
              />
              <Label htmlFor="backup-budgets" className="text-sm">
                Budget Data ({budgets.length} items)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-goals"
                checked={backupOptions.goals}
                onCheckedChange={(checked) => setOption("goals", !!checked)}
              />
              <Label htmlFor="backup-goals" className="text-sm">
                Goals & Savings ({goals.length} items)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-debtProfile"
                checked={backupOptions.debtProfile}
                onCheckedChange={(checked) => setOption("debtProfile", !!checked)}
              />
              <Label htmlFor="backup-debtProfile" className="text-sm">
                Debt Account + History ({debtAccounts.length} accounts)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-creditProfile"
                checked={backupOptions.creditProfile}
                onCheckedChange={(checked) => setOption("creditProfile", !!checked)}
              />
              <Label htmlFor="backup-creditProfile" className="text-sm">
                Credit Account + History ({creditAccounts.length} accounts)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-categories"
                checked={backupOptions.categories}
                onCheckedChange={(checked) => setOption("categories", !!checked)}
              />
              <Label htmlFor="backup-categories" className="text-sm">
                Categories ({customCategoriesOnly.length} custom items)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-emergencyFund"
                checked={backupOptions.emergencyFund}
                onCheckedChange={(checked) => setOption("emergencyFund", !!checked)}
              />
              <Label htmlFor="backup-emergencyFund" className="text-sm">
                Emergency Fund (${emergencyFund.toFixed(2)})
              </Label>
            </div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Portfolio and Display</p>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-portfolioProfile"
                checked={backupOptions.portfolioProfile}
                onCheckedChange={(checked) => setOption("portfolioProfile", !!checked)}
              />
              <Label htmlFor="backup-portfolioProfile" className="text-sm">
                Portfolio Profile (Holdings {portfolio.length}, Transactions {shareTransactions.length}, Lists {portfolios.length})
              </Label>
            </div>

            </div>
            </div>
          )}
        </div>

        <AlertDialogFooter className="gap-3 pt-6">
          <div className="w-full space-y-3">
            {isCustomizeMode && (
              <div className="flex flex-wrap gap-2 justify-end">
                <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("all")}>All</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("none")}>None</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("financial")}>Finance Core</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("portfolio")}>Portfolio Only</Button>
              </div>
            )}
            <div className="flex gap-3">
              <AlertDialogCancel
                onClick={onClose}
                className="flex-1 bg-muted hover:bg-muted/80"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleExportData}
                disabled={exportPin.length !== 6 || isExporting}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isExporting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Create Backup
                  </div>
                )}
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
