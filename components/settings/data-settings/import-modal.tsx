"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { toast } from "@/hooks/use-toast"

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
  availableImportData: any
  onConfirmImport: (options: any) => Promise<void>
  isImporting: boolean
}

export function ImportModal({
  isOpen,
  onClose,
  onImportComplete,
  availableImportData,
  onConfirmImport,
  isImporting,
}: ImportModalProps) {
  const [importOptions, setImportOptions] = useState({
    userProfile: false,
    transactions: false,
    budgets: false,
    goals: false,
    debtAccounts: false,
    creditAccounts: false,
    categories: false,
    emergencyFund: false,
  })

  // Update import options when availableImportData changes
  React.useEffect(() => {
    if (availableImportData) {
      setImportOptions({
        userProfile: !!availableImportData.userProfile,
        transactions: Array.isArray(availableImportData.transactions),
        budgets: Array.isArray(availableImportData.budgets),
        goals: Array.isArray(availableImportData.goals),
        debtAccounts: Array.isArray(availableImportData.debtAccounts),
        creditAccounts: Array.isArray(availableImportData.creditAccounts),
        categories: Array.isArray(availableImportData.categories),
        emergencyFund: typeof availableImportData.emergencyFund === 'number',
      })
    }
  }, [availableImportData])

  const handleConfirmImport = async () => {
    try {
      await onConfirmImport(importOptions)
      onImportComplete()
    } catch (error) {
      // Error handling is done in the parent component
    }
  }

  const handleClose = () => {
    onClose()
    // Reset options when closing
    setImportOptions({
      userProfile: true,
      transactions: true,
      budgets: true,
      goals: true,
      debtAccounts: true,
      creditAccounts: true,
      categories: true,
      emergencyFund: true,
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Select Data to Import</AlertDialogTitle>
          <AlertDialogDescription>
            Choose which data categories you want to restore from the backup.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {availableImportData && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="import-userProfile"
                  checked={importOptions.userProfile}
                  onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, userProfile: !!checked }))}
                  disabled={!availableImportData.userProfile}
                />
                <Label htmlFor="import-userProfile" className="text-sm">
                  User Profile & Settings {availableImportData.userProfile ? "(Available)" : "(Not in backup)"}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="import-transactions"
                  checked={importOptions.transactions}
                  onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, transactions: !!checked }))}
                  disabled={!Array.isArray(availableImportData.transactions)}
                />
                <Label htmlFor="import-transactions" className="text-sm">
                  Transaction Data {Array.isArray(availableImportData.transactions) ? `(${availableImportData.transactions.length} items)` : "(Not in backup)"}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="import-budgets"
                  checked={importOptions.budgets}
                  onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, budgets: !!checked }))}
                  disabled={!Array.isArray(availableImportData.budgets)}
                />
                <Label htmlFor="import-budgets" className="text-sm">
                  Budget Data {Array.isArray(availableImportData.budgets) ? `(${availableImportData.budgets.length} items)` : "(Not in backup)"}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="import-goals"
                  checked={importOptions.goals}
                  onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, goals: !!checked }))}
                  disabled={!Array.isArray(availableImportData.goals)}
                />
                <Label htmlFor="import-goals" className="text-sm">
                  Goals & Savings {Array.isArray(availableImportData.goals) ? `(${availableImportData.goals.length} items)` : "(Not in backup)"}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="import-debtAccounts"
                  checked={importOptions.debtAccounts}
                  onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, debtAccounts: !!checked }))}
                  disabled={!Array.isArray(availableImportData.debtAccounts)}
                />
                <Label htmlFor="import-debtAccounts" className="text-sm">
                  Debt Accounts {Array.isArray(availableImportData.debtAccounts) ? `(${availableImportData.debtAccounts.length} items)` : "(Not in backup)"}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="import-creditAccounts"
                  checked={importOptions.creditAccounts}
                  onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, creditAccounts: !!checked }))}
                  disabled={!Array.isArray(availableImportData.creditAccounts)}
                />
                <Label htmlFor="import-creditAccounts" className="text-sm">
                  Credit Accounts {Array.isArray(availableImportData.creditAccounts) ? `(${availableImportData.creditAccounts.length} items)` : "(Not in backup)"}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="import-categories"
                  checked={importOptions.categories}
                  onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, categories: !!checked }))}
                  disabled={!Array.isArray(availableImportData.categories)}
                />
                <Label htmlFor="import-categories" className="text-sm">
                  Categories {Array.isArray(availableImportData.categories) ? `(${availableImportData.categories.length} items)` : "(Not in backup)"}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="import-emergencyFund"
                  checked={importOptions.emergencyFund}
                  onCheckedChange={(checked) => setImportOptions(prev => ({ ...prev, emergencyFund: !!checked }))}
                  disabled={typeof availableImportData.emergencyFund !== 'number'}
                />
                <Label htmlFor="import-emergencyFund" className="text-sm">
                  Emergency Fund {typeof availableImportData.emergencyFund === 'number' ? `($${availableImportData.emergencyFund.toFixed(2)})` : "(Not in backup)"}
                </Label>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmImport}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import Selected Data"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}