"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWalletData } from "@/contexts/wallet-data-context"
import { Download, Upload, Trash2, Database, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { DeleteDataDialog } from "./delete-data-dialog"
import { BackupModal } from "./data-settings/backup-modal"
import { ImportModal } from "./data-settings/import-modal"

export function DataSettings() {
   const { userProfile, transactions, budgets, goals, debtAccounts, creditAccounts, debtCreditTransactions, categories, emergencyFund, clearAllData, importData } = useWalletData()
   const [importFile, setImportFile] = useState<File | null>(null)
   const [importPin, setImportPin] = useState("")
   const [isImporting, setIsImporting] = useState(false)

   // Modal state
   const [showBackupModal, setShowBackupModal] = useState(false)
   const [showImportModal, setShowImportModal] = useState(false)
   const [availableImportData, setAvailableImportData] = useState<any>(null)
   const [backupFileContent, setBackupFileContent] = useState("")

  const handleCreateBackup = () => {
    setShowBackupModal(true)
  }

  const handleBackupSuccess = async (data: any, pin: string) => {
    try {
      const { createEncryptedBackup } = await import("@/lib/backup")

      // Create encrypted backup
      const backupJson = await createEncryptedBackup(data, pin)

      // Download the backup
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


  const handleImportData = async () => {
    if (!importFile) return

    setIsImporting(true)
    try {
      const text = await importFile.text()
      setBackupFileContent(text)

      let dataToImport
      try {
        const parsedData = JSON.parse(text)

        // Check if this is an encrypted backup
        if (parsedData.version && parsedData.salt && parsedData.payload) {
          if (importPin) {
            try {
              const { restoreEncryptedBackup } = await import("@/lib/backup")
              dataToImport = await restoreEncryptedBackup(text, importPin)
              console.log("[v0] Successfully decrypted encrypted backup")
            } catch (decryptError) {
              const errorMsg = decryptError instanceof Error ? decryptError.message : "Unknown decryption error"
              toast({
                title: "Decryption Failed",
                description: errorMsg,
                variant: "destructive",
              })
              setIsImporting(false)
              return
            }
          } else {
            toast({
              title: "PIN Required",
              description: "This is an encrypted backup. Please enter your PIN to decrypt it.",
              variant: "destructive",
            })
            setIsImporting(false)
            return
          }
        } else {
          // Plain JSON backup
          dataToImport = parsedData
          console.log("[v0] Detected plain JSON backup")
        }
      } catch (parseError) {
        throw new Error("Invalid backup file format - not valid JSON")
      }

      // Validate that we have some data to import
      if (!dataToImport || (typeof dataToImport === 'object' && Object.keys(dataToImport).length === 0)) {
        throw new Error("Backup file contains no data to import")
      }

      // Store the data (decrypted or plain) for the modal
      setAvailableImportData(dataToImport)
      setShowImportModal(true)
      setIsImporting(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "The backup file is invalid or corrupted."
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      })
      setIsImporting(false)
    }
  }

  const handleConfirmImport = async (importOptions: any) => {
    if (!availableImportData) return

    setIsImporting(true)
    try {
      const selectiveData: any = {
        exportDate: availableImportData.exportDate || new Date().toISOString(),
        version: availableImportData.version || "1.0",
      }
      if (importOptions.userProfile && availableImportData.userProfile) {
        selectiveData.userProfile = availableImportData.userProfile
      }
      if (importOptions.transactions && availableImportData.transactions) {
        selectiveData.transactions = availableImportData.transactions
      }
      if (importOptions.budgets && availableImportData.budgets) {
        selectiveData.budgets = availableImportData.budgets
      }
      if (importOptions.goals && availableImportData.goals) {
        selectiveData.goals = availableImportData.goals
      }
      if (importOptions.debtAccounts && availableImportData.debtAccounts) {
        selectiveData.debtAccounts = availableImportData.debtAccounts
      }
      if (importOptions.creditAccounts && availableImportData.creditAccounts) {
        selectiveData.creditAccounts = availableImportData.creditAccounts
      }
      if (importOptions.categories && availableImportData.categories) {
        selectiveData.categories = availableImportData.categories
      }
      if (importOptions.emergencyFund && availableImportData.emergencyFund) {
        selectiveData.emergencyFund = availableImportData.emergencyFund
      }
      if (importOptions.userProfile && availableImportData.settings?.showScrollbars !== undefined) {
        selectiveData.settings = {
          ...selectiveData.settings,
          showScrollbars: availableImportData.settings.showScrollbars
        }
      }
      const success = await importData(selectiveData)

      if (success) {
        setImportFile(null)
        setImportPin("")
        setShowImportModal(false)
        setAvailableImportData(null)
        setBackupFileContent("")
      } else {
        throw new Error("Import failed - data could not be processed")
      }
    } catch (error) {
      throw error 
    } finally {
      setIsImporting(false)
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
        <CardContent className="p-6">
          {/* Responsive Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Export Section */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 p-6 hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Download className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Export Data</h3>
                    <p className="text-sm text-muted-foreground">Create secure backup</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Create a selective encrypted backup of your wallet data with advanced security features.
                </p>

                <Button
                  onClick={handleCreateBackup}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                  size="lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Create Selective Backup
                </Button>
                
              </div>
              <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-muted">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-blue-500/10 rounded">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">Backup Features</h4>
                  <ul className="text-xs text-muted-foreground leading-relaxed">
                    <li>• Selective data export with encryption</li>
                    <li>• Automatic backup type detection</li>
                    <li>• PIN-protected security</li>
                    <li>• Cross-device compatibility</li>
                  </ul>
              </div>
            </div>
          </div>
            </div>

            {/* Import Section */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/5 via-green-500/10 to-green-500/5 border border-green-500/20 p-6 hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Upload className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Import Data</h3>
                    <p className="text-sm text-muted-foreground">Restore from backup</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Restore your wallet data from an encrypted backup file with automatic detection.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="backup-file" className="text-sm font-medium">Backup File</Label>
                    <Input
                      id="backup-file"
                      type="file"
                      accept=".json"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="import-pin" className="text-sm font-medium">Enter PIN for decryption (if encrypted)</Label>
                    <Input
                      id="import-pin"
                      type="password"
                      placeholder="Enter PIN if backup is encrypted"
                      value={importPin}
                      onChange={(e) => setImportPin(e.target.value)}
                      className="border-amber-300 focus:border-amber-500"
                    />
                  </div>

                  <Button
                    onClick={handleImportData}
                    disabled={!importFile || isImporting}
                    className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg hover:shadow-xl transition-all duration-300"
                    size="lg"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isImporting ? "Analyzing..." : "Analyze & Import"}
                  </Button>
                </div>
              </div>
            </div>
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
            <DeleteDataDialog
              trigger={
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
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

      {/* Backup Modal Component */}
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
        categories={categories}
        emergencyFund={emergencyFund}
      />

      {/* Import Modal Component */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false)
          setAvailableImportData(null)
          setImportFile(null)
          setImportPin("")
          setBackupFileContent("")
        }}
        onImportComplete={() => {
          setShowImportModal(false)
          setAvailableImportData(null)
          setImportFile(null)
          setImportPin("")
          setBackupFileContent("")
          toast({
            title: "Data Imported",
            description: "Your selected wallet data has been restored successfully.",
          })
        }}
        availableImportData={availableImportData}
        onConfirmImport={handleConfirmImport}
        isImporting={isImporting}
      />
    </div>
  )
}
