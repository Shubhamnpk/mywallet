"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { createEncryptedBackup } from "@/lib/backup"
import { SecurePinManager } from "@/lib/secure-pin-manager"
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
  categories: any[]
  emergencyFund: number
  onBackupSuccess: (data: any, pin: string) => Promise<void>
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
  categories,
  emergencyFund,
  onBackupSuccess,
}: BackupModalProps) {
  const [exportPin, setExportPin] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [backupOptions, setBackupOptions] = useState({
    userProfile: true,
    transactions: true,
    budgets: true,
    goals: true,
    debtAccounts: true,
    creditAccounts: true,
    categories: true,
    emergencyFund: true,
    showScrollbars: true,
  })

  const handleExportData = async () => {
    if (!exportPin) {
      toast({
        title: "PIN Required",
        description: "Please enter your PIN to create an encrypted backup.",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)
    try {
      // Validate PIN if security is enabled
      if (SecurePinManager.hasPin()) {
        const validation = await SecurePinManager.validatePin(exportPin)
        if (!validation.success) {
          toast({
            title: "Invalid PIN",
            description: "The PIN you entered is incorrect.",
            variant: "destructive",
          })
          return
        }
      }

      // Prepare selective data for backup
      const data: any = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        backupOptions: backupOptions,
      }

      if (backupOptions.userProfile) data.userProfile = userProfile
      if (backupOptions.transactions) data.transactions = transactions
      if (backupOptions.budgets) data.budgets = budgets
      if (backupOptions.goals) data.goals = goals
      if (backupOptions.debtAccounts) data.debtAccounts = debtAccounts
      if (backupOptions.creditAccounts) data.creditAccounts = creditAccounts
      if (backupOptions.categories) data.categories = categories
      if (backupOptions.emergencyFund) data.emergencyFund = emergencyFund

      // Include scrollbar setting if userProfile is being backed up
      if (backupOptions.userProfile) {
        const showScrollbars = localStorage.getItem("wallet_show_scrollbars") !== "false"
        data.settings = {
          ...data.settings,
          showScrollbars
        }
      }

      // Call the parent component to handle the backup creation
      await onBackupSuccess(data, exportPin)

      setExportPin("")
      onClose()
      onBackupComplete()
    } catch (error) {
      console.error("Backup creation failed:", error)
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
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold">Create Selective Backup</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Choose data categories for your encrypted backup
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="export-pin">Enter PIN for encryption</Label>
            <Input
              id="export-pin"
              type="password"
              placeholder="Enter your PIN"
              value={exportPin}
              onChange={(e) => setExportPin(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-userProfile"
                checked={backupOptions.userProfile}
                onCheckedChange={(checked) => setBackupOptions(prev => ({ ...prev, userProfile: !!checked }))}
              />
              <Label htmlFor="backup-userProfile" className="text-sm">
                User Profile & Settings ({userProfile ? "1 item" : "0 items"})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-transactions"
                checked={backupOptions.transactions}
                onCheckedChange={(checked) => setBackupOptions(prev => ({ ...prev, transactions: !!checked }))}
              />
              <Label htmlFor="backup-transactions" className="text-sm">
                Transaction Data ({transactions.length} items)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-budgets"
                checked={backupOptions.budgets}
                onCheckedChange={(checked) => setBackupOptions(prev => ({ ...prev, budgets: !!checked }))}
              />
              <Label htmlFor="backup-budgets" className="text-sm">
                Budget Data ({budgets.length} items)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-goals"
                checked={backupOptions.goals}
                onCheckedChange={(checked) => setBackupOptions(prev => ({ ...prev, goals: !!checked }))}
              />
              <Label htmlFor="backup-goals" className="text-sm">
                Goals & Savings ({goals.length} items)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-debtAccounts"
                checked={backupOptions.debtAccounts}
                onCheckedChange={(checked) => setBackupOptions(prev => ({ ...prev, debtAccounts: !!checked }))}
              />
              <Label htmlFor="backup-debtAccounts" className="text-sm">
                Debt Accounts ({debtAccounts.length} items)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-creditAccounts"
                checked={backupOptions.creditAccounts}
                onCheckedChange={(checked) => setBackupOptions(prev => ({ ...prev, creditAccounts: !!checked }))}
              />
              <Label htmlFor="backup-creditAccounts" className="text-sm">
                Credit Accounts ({creditAccounts.length} items)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-categories"
                checked={backupOptions.categories}
                onCheckedChange={(checked) => setBackupOptions(prev => ({ ...prev, categories: !!checked }))}
              />
              <Label htmlFor="backup-categories" className="text-sm">
                Categories ({categories.length} items)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-emergencyFund"
                checked={backupOptions.emergencyFund}
                onCheckedChange={(checked) => setBackupOptions(prev => ({ ...prev, emergencyFund: !!checked }))}
              />
              <Label htmlFor="backup-emergencyFund" className="text-sm">
                Emergency Fund (${emergencyFund.toFixed(2)})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="backup-showScrollbars"
                checked={backupOptions.showScrollbars}
                onCheckedChange={(checked) => setBackupOptions(prev => ({ ...prev, showScrollbars: !!checked }))}
              />
              <Label htmlFor="backup-showScrollbars" className="text-sm">
                Scrollbar Settings (Theme preference)
              </Label>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="gap-3 pt-6">
          <AlertDialogCancel
            onClick={onClose}
            className="flex-1 bg-muted hover:bg-muted/80"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleExportData}
            disabled={!exportPin || isExporting}
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
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}