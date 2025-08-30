"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useWalletData } from "@/contexts/wallet-data-context"
import { Download, Upload, Trash2, Database, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export function DataSettings() {
  const { userProfile, transactions, budgets, goals, clearAllData, importData } = useWalletData()
  const [importFile, setImportFile] = useState<File | null>(null)

  const handleExportData = () => {
    const data = {
      userProfile,
      transactions,
      budgets,
      goals,
      exportDate: new Date().toISOString(),
      version: "1.0",
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `mywallet-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Data Exported",
      description: "Your wallet data has been downloaded successfully.",
    })
  }

  const handleImportData = async () => {
    if (!importFile) return

    try {
      const text = await importFile.text()
      const data = JSON.parse(text)

      // Validate data structure
      if (!data.userProfile || !Array.isArray(data.transactions)) {
        throw new Error("Invalid backup file format")
      }

      importData(data)
      setImportFile(null)

      toast({
        title: "Data Imported",
        description: "Your wallet data has been restored successfully.",
      })
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "The backup file is invalid or corrupted.",
        variant: "destructive",
      })
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
    const dataSize = new Blob([JSON.stringify({ userProfile, transactions, budgets, goals })]).size

    return {
      totalTransactions,
      totalBudgets,
      totalGoals,
      dataSize: (dataSize / 1024).toFixed(2) + " KB",
    }
  }

  const stats = getDataStats()

  return (
    <div className="space-y-6">
      {/* Data Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Overview
          </CardTitle>
          <CardDescription>Summary of your wallet data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.totalTransactions}</p>
              <p className="text-sm text-muted-foreground">Transactions</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.totalBudgets}</p>
              <p className="text-sm text-muted-foreground">Budgets</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.totalGoals}</p>
              <p className="text-sm text-muted-foreground">Goals</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.dataSize}</p>
              <p className="text-sm text-muted-foreground">Data Size</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Backup & Restore
          </CardTitle>
          <CardDescription>Export your data or restore from a backup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Export Data</p>
              <p className="text-sm text-muted-foreground">Download all your wallet data as a JSON file</p>
            </div>
            <Button onClick={handleExportData} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Import */}
          <div className="p-4 border rounded-lg space-y-3">
            <div>
              <p className="font-medium">Import Data</p>
              <p className="text-sm text-muted-foreground">Restore your wallet data from a backup file</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="backup-file">Select Backup File</Label>
              <Input
                id="backup-file"
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!importFile} className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Import Backup Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will replace all your current data with the data from the backup file. This action cannot be
                    undone. Make sure to export your current data first if needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleImportData}>Import Data</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Data Management
          </CardTitle>
          <CardDescription>Manage your stored data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
            <div>
              <p className="font-medium text-destructive">Clear All Data</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete all transactions, budgets, goals, and settings
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all your wallet data including
                    transactions, budgets, goals, and settings. Consider exporting your data first.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAllData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
