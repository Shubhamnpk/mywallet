"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useWalletData } from "@/contexts/wallet-data-context"
import { generateDemoData } from "@/lib/demo-data"
import { toast } from "sonner"
import {
  Database,
  FlaskConical,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Download,
} from "lucide-react"
import { useDeveloperMode } from "@/hooks/use-developer-mode"

export function DeveloperSettings() {
  const {
    userProfile,
    transactions,
    budgets,
    goals,
    categories,
    debtAccounts,
    creditAccounts,
    emergencyFund,
    balance,
    portfolio,
    importData,
    clearAllData,
    exportData,
  } = useWalletData()
  const { isDeveloperMode } = useDeveloperMode()

  const [customCount, setCustomCount] = useState("50")
  const [customMonths, setCustomMonths] = useState("6")
  const [includeBudgets, setIncludeBudgets] = useState(true)
  const [includeGoals, setIncludeGoals] = useState(true)
  const [includeDebtCredit, setIncludeDebtCredit] = useState(true)
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedProgress, setSeedProgress] = useState("")
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [seedResult, setSeedResult] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const clearResult = () => setSeedResult(null)

  const doSeed = async (count: number, months: number) => {
    setIsSeeding(true)
    setSeedResult(null)
    setSeedProgress(`Generating ${count} demo transactions...`)
    try {
      const data = generateDemoData({
        transactionCount: count,
        monthsBack: months,
        includeBudgets,
        includeGoals,
        includeDebtCredit,
      })
      setSeedProgress("Importing data into wallet...")
      await importData(data)
      setSeedResult({
        type: "success",
        message: `Seeded ${data.transactions.length} transactions, ${data.budgets.length} budgets, ${data.goals.length} goals, ${data.categories.length} categories.`,
      })
    } catch (err) {
      setSeedResult({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to seed demo data",
      })
    } finally {
      setIsSeeding(false)
      setSeedProgress("")
    }
  }

  const quickSeeds = [
    { label: "10 Txns", count: 10, months: 3 },
    { label: "25 Txns", count: 25, months: 3 },
    { label: "50 Txns", count: 50, months: 6 },
    { label: "100 Txns", count: 100, months: 12 },
    { label: "Full Demo", count: 350, months: 12, desc: "Budgets + Goals + Debt" },
  ]

  const defaultCategories = categories.filter((c) => c.isDefault)
  const customCategories = categories.filter((c) => !c.isDefault)

  return (
    <div className="space-y-6">
      {!isDeveloperMode && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Developer mode is disabled. Press <kbd className="rounded border border-amber-300 px-1.5 py-0.5 text-xs font-mono">Ctrl+Shift+D</kbd> to enable it, or toggle it in the floating developer menu.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-purple-500" />
                Demo Data Seeder
              </CardTitle>
              <CardDescription>
                Generate realistic demo transactions, budgets, goals, and accounts for testing.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-3 block">
              Quick Seed
            </Label>
            <div className="flex flex-wrap gap-2">
              {quickSeeds.map((seed) => (
                <Button
                  key={seed.label}
                  variant="outline"
                  size="sm"
                  disabled={isSeeding}
                  onClick={() => doSeed(seed.count, seed.months)}
                >
                  {isSeeding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  {seed.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Click a button to generate and import demo data instantly.
            </p>
          </div>

          <Separator />

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-3 block">
              Custom Seed
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-1.5">
                <Label htmlFor="tx-count" className="text-xs">
                  Transaction Count
                </Label>
                <Input
                  id="tx-count"
                  type="number"
                  min={1}
                  max={5000}
                  value={customCount}
                  onChange={(e) => setCustomCount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tx-months" className="text-xs">
                  Date Range (months back)
                </Label>
                <Select value={customMonths} onValueChange={setCustomMonths}>
                  <SelectTrigger id="tx-months">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last 1 month</SelectItem>
                    <SelectItem value="3">Last 3 months</SelectItem>
                    <SelectItem value="6">Last 6 months</SelectItem>
                    <SelectItem value="12">Last 12 months</SelectItem>
                    <SelectItem value="24">Last 24 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Switch id="include-budgets" checked={includeBudgets} onCheckedChange={setIncludeBudgets} />
                <Label htmlFor="include-budgets" className="text-xs cursor-pointer">
                  Budgets
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="include-goals" checked={includeGoals} onCheckedChange={setIncludeGoals} />
                <Label htmlFor="include-goals" className="text-xs cursor-pointer">
                  Goals
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="include-debt" checked={includeDebtCredit} onCheckedChange={setIncludeDebtCredit} />
                <Label htmlFor="include-debt" className="text-xs cursor-pointer">
                  Debt & Credit
                </Label>
              </div>
            </div>

            <Button
              disabled={isSeeding || !customCount || Number(customCount) < 1}
              onClick={() => doSeed(Number(customCount), Number(customMonths))}
            >
              {isSeeding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {seedProgress}
                </>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Generate {customCount || "0"} Transactions
                </>
              )}
            </Button>
          </div>

          {seedResult && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                seedResult.type === "success"
                  ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                  : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
              }`}
            >
              {seedResult.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span className="flex-1">{seedResult.message}</span>
              <button
                type="button"
                onClick={clearResult}
                className="text-xs underline hover:no-underline opacity-70 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-5 w-5 text-blue-500" />
            Current Data Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Transactions</div>
              <div className="text-xl font-bold mt-0.5">{transactions.length.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Budgets</div>
              <div className="text-xl font-bold mt-0.5">{budgets.length}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Goals</div>
              <div className="text-xl font-bold mt-0.5">{goals.length}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Categories</div>
              <div className="text-xl font-bold mt-0.5">
                {defaultCategories.length}
                <span className="text-xs text-muted-foreground font-normal"> default</span>
                {customCategories.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    {" "}
                    + {customCategories.length} custom
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Debt Accounts</div>
              <div className="text-xl font-bold mt-0.5">{debtAccounts.length}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Credit Accounts</div>
              <div className="text-xl font-bold mt-0.5">{creditAccounts.length}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Holdings</div>
              <div className="text-xl font-bold mt-0.5">{portfolio.length}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Balance</div>
              <div className="text-xl font-bold mt-0.5">
                {balance.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-5 w-5 text-destructive" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions for testing. Use with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (showClearConfirm) {
                  clearAllData()
                  setShowClearConfirm(false)
                  toast.success("All data cleared")
                } else {
                  setShowClearConfirm(true)
                  setTimeout(() => setShowClearConfirm(false), 4000)
                }
              }}
            >
              {showClearConfirm ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Confirm Clear All Data
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Data
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export Current Data
            </Button>
          </div>
          {showClearConfirm && (
            <p className="text-xs text-destructive">
              Click again to confirm. This will permanently delete all wallet data including transactions, budgets, goals, and settings.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
