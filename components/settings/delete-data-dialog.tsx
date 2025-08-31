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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useWalletData } from "@/contexts/wallet-data-context"
import { Download, Trash2, Shield, AlertTriangle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { createEncryptedBackup } from "@/lib/backup"
import { SecurePinManager } from "@/lib/secure-pin-manager"

interface DeleteDataDialogProps {
  trigger: React.ReactNode
  title: string
  description: string
  onConfirm: () => void
  type: "account" | "data"
}

export function DeleteDataDialog({ trigger, title, description, onConfirm, type }: DeleteDataDialogProps) {
  const { userProfile, transactions, budgets, goals, debtAccounts, creditAccounts, debtCreditTransactions, categories, emergencyFund } = useWalletData()
  const [showDialog, setShowDialog] = useState(false)
  const [backupDownloaded, setBackupDownloaded] = useState(false)
  const [pin, setPin] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<"warning" | "backup" | "confirm">("warning")

  const hasSecurityData = userProfile?.pin || SecurePinManager.hasPin()

  const handleDownloadBackup = async () => {
    if (!pin) {
      toast({
        title: "PIN Required",
        description: "Please enter your PIN to create a secure backup.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      // Validate PIN if security is enabled
      if (hasSecurityData) {
        const validation = await SecurePinManager.validatePin(pin)
        if (!validation.success) {
          toast({
            title: "Invalid PIN",
            description: "The PIN you entered is incorrect.",
            variant: "destructive",
          })
          return
        }
      }

      // Prepare data for backup
      const backupData = {
        userProfile,
        transactions,
        budgets,
        goals,
        debtAccounts,
        creditAccounts,
        debtCreditTransactions,
        categories,
        emergencyFund,
        exportDate: new Date().toISOString(),
        version: "1.0",
        type: "encrypted_backup"
      }

      // Create encrypted backup
      const backupJson = await createEncryptedBackup(backupData, pin)

      // Download the backup
      const blob = new Blob([backupJson], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `mywallet-encrypted-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setBackupDownloaded(true)
      setStep("confirm")
      toast({
        title: "Backup Downloaded",
        description: "Your encrypted backup has been downloaded successfully.",
      })
    } catch (error) {
      console.error("Backup creation failed:", error)
      toast({
        title: "Backup Failed",
        description: "Failed to create backup. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSkipBackup = () => {
    setStep("confirm")
  }

  const handleConfirmDelete = () => {
    onConfirm()
    setShowDialog(false)
    setStep("warning")
    setBackupDownloaded(false)
    setPin("")
  }

  const resetDialog = () => {
    setShowDialog(false)
    setStep("warning")
    setBackupDownloaded(false)
    setPin("")
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {step === "warning" && (
              <div className="space-y-2">
                <p>{description}</p>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-4">
                  <div className="flex items-center gap-2 text-destructive font-medium">
                    <Shield className="w-4 h-4" />
                    <span>Security Data Warning</span>
                  </div>
                  <p className="text-sm text-destructive/80 mt-1">
                    This will permanently delete all your data including PIN, encryption keys, and security settings.
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            )}
            {step === "backup" && (
              <div className="space-y-2">
                <p>Before proceeding, we recommend downloading a secure backup of your data.</p>
                <p className="text-sm text-muted-foreground">
                  Your backup will be encrypted with your PIN and can only be restored with the same PIN.
                </p>
              </div>
            )}
            {step === "confirm" && (
              <div className="space-y-2">
                <p>Are you absolutely sure you want to proceed?</p>
                <p className="text-sm text-muted-foreground">
                  {backupDownloaded
                    ? "Your backup has been downloaded. You can restore your data later if needed."
                    : "No backup was created. All your data will be permanently lost."
                  }
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {step === "warning" && (
            <div className="flex gap-2">
              <Button onClick={() => setStep("backup")} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Create Backup First
              </Button>
              <Button onClick={handleSkipBackup} variant="outline" className="flex-1">
                Skip Backup
              </Button>
            </div>
          )}

          {step === "backup" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="backup-pin">Enter your PIN to create encrypted backup</Label>
                <Input
                  id="backup-pin"
                  type="password"
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleDownloadBackup}
                  disabled={!pin || isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? "Creating..." : "Download Backup"}
                </Button>
                <Button onClick={handleSkipBackup} variant="outline">
                  Skip
                </Button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <AlertDialogFooter>
              <AlertDialogCancel onClick={resetDialog}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {type === "account" ? "Delete Account" : "Delete All Data"}
              </AlertDialogAction>
            </AlertDialogFooter>
          )}
        </div>

        {step !== "confirm" && (
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetDialog}>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}