"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useWalletData } from "@/contexts/wallet-data-context"
import { Download, Upload, Trash2, Database, FileText, ShieldCheck, Workflow } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { DeleteDataDialog } from "./delete-data-dialog"
import { BackupModal } from "./data-settings/backup-modal"
import { ImportModal } from "./data-settings/import-modal"

export function DataSettings() {
  const {
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
    clearAllData,
    importData,
  } = useWalletData()

  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  const handleCreateBackup = () => {
    setShowBackupModal(true)
  }

  const handleBackupSuccess = async (data: any, pin: string) => {
    try {
      const { createEncryptedBackup } = await import("@/lib/backup")
      const backupJson = await createEncryptedBackup(data, pin)

      const blob = new Blob([backupJson], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `mywallet-selective-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Selective Backup Created",
        description: "Your selected wallet data has been encrypted and downloaded successfully.",
      })
    } catch (error) {
      console.error("Backup creation failed:", error)
      toast({
        title: "Backup Failed",
        description: "Failed to create encrypted backup. Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleClearAllData = () => {
    clearAllData()
    toast({
      title: "Data Cleared",
      description: "All your wallet data has been permanently deleted.",
      variant: "destructive",
    })
  }

  const getDataStats = () => {
    const totalTransactions = transactions.length
    const totalBudgets = budgets.length
    const totalGoals = goals.length
    const totalPortfolios = portfolios.length
    const dataSize = new Blob([JSON.stringify({ userProfile, transactions, budgets, goals })]).size

    return {
      totalTransactions,
      totalBudgets,
      totalGoals,
      totalPortfolios,
      dataSize: `${(dataSize / 1024).toFixed(2)} KB`,
    }
  }

  const stats = getDataStats()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Overview
          </CardTitle>
          <CardDescription>Current wallet data snapshot</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-lg border bg-muted p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalTransactions}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
            <div className="rounded-lg border bg-muted p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalBudgets}</p>
              <p className="text-xs text-muted-foreground">Budgets</p>
            </div>
            <div className="rounded-lg border bg-muted p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalGoals}</p>
              <p className="text-xs text-muted-foreground">Goals</p>
            </div>
            <div className="rounded-lg border bg-muted p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalPortfolios}</p>
              <p className="text-xs text-muted-foreground">Portfolios</p>
            </div>
            <div className="rounded-lg border bg-muted p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.dataSize}</p>
              <p className="text-xs text-muted-foreground">Approx Size</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Backup & Restore
          </CardTitle>
          <CardDescription>Export your data securely or restore it with guided import</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6">
              <div className="absolute -right-10 -top-10 h-20 w-20 rounded-full bg-primary/10" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Export Data</h3>
                    <p className="text-sm text-muted-foreground">Create secure backup</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Create an encrypted backup of your wallet data. You can choose all data or only selected sections.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <Badge variant="secondary" className="justify-center py-1">Selective</Badge>
                  <Badge variant="secondary" className="justify-center py-1">Encrypted</Badge>
                  <Badge variant="secondary" className="justify-center py-1">Wallet PIN</Badge>
                  <Badge variant="secondary" className="justify-center py-1">Portable File</Badge>
                </div>

                <div className="rounded-lg border bg-background/80 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Backup Flow
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Select sections, verify wallet PIN, and download your encrypted backup.
                  </p>
                </div>

                <Button
                  onClick={handleCreateBackup}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Create Selective Backup
                </Button>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 via-green-500/10 to-green-500/5 p-6">
              <div className="absolute -right-10 -top-10 h-20 w-20 rounded-full bg-green-500/10" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/10 p-2">
                    <Upload className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Import Data</h3>
                    <p className="text-sm text-muted-foreground">Restore from backup</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Import now uses a guided flow to avoid errors and keep recovery simple.
                </p>

                <div className="rounded-lg border bg-background/80 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Workflow className="h-4 w-4 text-green-600" />
                    Guided Import
                  </div>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    <li>1. Upload backup file</li>
                    <li>2. Enter PIN if encrypted</li>
                    <li>3. Import all by default or customize</li>
                  </ul>
                </div>

                <Button
                  onClick={() => setShowImportModal(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
                  size="lg"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Start Import
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>Manage or remove local wallet data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 rounded-lg border border-destructive p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-destructive">Clear All Data</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete all transactions, budgets, goals, portfolios, and settings.
              </p>
            </div>
            <DeleteDataDialog
              trigger={
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              }
              title="Clear All Data"
              description="This will permanently delete all your wallet data including transactions, budgets, goals, and settings. Your PIN and security data will also be completely removed."
              onConfirm={handleClearAllData}
              type="data"
            />
          </div>
        </CardContent>
      </Card>

      <BackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        onBackupComplete={() => {
          setShowBackupModal(false)
          toast({
            title: "Backup Created",
            description: "Your selective backup has been created successfully.",
          })
        }}
        onBackupSuccess={handleBackupSuccess}
        userProfile={userProfile}
        transactions={transactions}
        budgets={budgets}
        goals={goals}
        debtAccounts={debtAccounts}
        creditAccounts={creditAccounts}
        debtCreditTransactions={debtCreditTransactions}
        categories={categories}
        emergencyFund={emergencyFund}
        portfolio={portfolio}
        shareTransactions={shareTransactions}
        portfolios={portfolios}
        activePortfolioId={activePortfolioId}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          setShowImportModal(false)
          toast({
            title: "Data Imported",
            description: "Your selected wallet data has been restored successfully.",
          })
        }}
        onImportData={importData}
      />
    </div>
  )
}
