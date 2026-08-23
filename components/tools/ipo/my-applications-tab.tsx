"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshCw, Loader2, FileText, Landmark, CheckCircle2, Calendar, AlertCircle, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useWalletData } from "@/contexts/wallet-data-context"
import type { MeroShareAccount } from "@/types/wallet"

export interface MeroShareApplicationRow {
  companyShareId: number | null
  applicantFormId: number | null
  companyName: string
  scrip: string
  appliedKitta: number
  receivedKitta: number
  statusName: string
  stageName: string
  appliedDate: string
  shareTypeName: string
  shareGroupName: string
  subGroup: string
  meroshareRemark: string
  amount: number
}

function getAccounts(meroShare?: {
  accounts?: MeroShareAccount[]
  dpId?: string
  username?: string
  password?: string
  crn?: string
  pin?: string
}): MeroShareAccount[] {
  if (meroShare?.accounts?.length) return meroShare.accounts
  if (meroShare?.dpId || meroShare?.username) {
    return [{
      id: "legacy-primary",
      label: "Primary account",
      role: "primary" as const,
      dpId: meroShare.dpId || "",
      username: meroShare.username || "",
      password: meroShare.password || "",
      crn: meroShare.crn || "",
      pin: meroShare.pin || "",
    }]
  }
  return []
}

function statusTone(status: string) {
  const value = status.toLowerCase()
  if (value.includes("not allotted") || value.includes("rejected") || value.includes("cancelled") || value.includes("cancel"))
    return "text-muted-foreground bg-muted/20 border-muted/30"
  if (value.includes("allot")) return "text-success bg-success/10 border-success/25"
  if (value.includes("pending") || value.includes("process") || value.includes("submit")) return "text-info bg-info/10 border-info/25"
  return "text-muted-foreground bg-muted/20 border-muted/30"
}

function displayStatus(row: MeroShareApplicationRow) {
  const raw = row.statusName?.trim() ?? ""
  const rawUpper = raw.toUpperCase()
  if (row.receivedKitta > 0) return "ALLOTTED"
  if (rawUpper === "ALLOTTED" || rawUpper === "NOT ALLOTTED") return rawUpper
  if (row.stageName === "ALLOTMENT_RESULT_UPLOADED") return "NOT ALLOTTED"
  return raw || "-"
}

function formatDate(value?: string) {
  if (!value) return "-"
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return value.split("T")[0] || value
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(t)
}

function StatBox({ label, value, tone, icon: Icon }: { label: string; value: number | string; tone?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-border/30 bg-background/50 px-2 py-2.5 text-center backdrop-blur-sm">
      <Icon className={cn("mx-auto mb-1 h-3.5 w-3.5", tone ?? "text-muted-foreground")} />
      <p className={cn("text-lg font-black font-mono leading-none", tone ?? "text-foreground")}>{value}</p>
      <p className="mt-1 text-[8px] text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
    </div>
  )
}

export function MyApplicationsTab() {
  const { userProfile, logMeroShareApplication } = useWalletData()
  const accounts = useMemo(() => getAccounts(userProfile?.meroShare), [userProfile?.meroShare])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const selectedAccount = useMemo(
    () =>
      accounts.find((account) => account.id === selectedAccountId) ||
      accounts.find((account) => account.role === "primary") ||
      accounts[0],
    [accounts, selectedAccountId]
  )
  const [rows, setRows] = useState<MeroShareApplicationRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!selectedAccount?.dpId || !selectedAccount?.username || !selectedAccount?.password) {
      setError("Save your MeroShare credentials in Settings first.")
      setRows(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/meroshare/application-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentials: selectedAccount,
          options: { browserProvider: userProfile?.meroShare?.browserProvider || "rest" },
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        const message = data.error || "Failed to load applications"
        void logMeroShareApplication({
          action: "application-report",
          status: "failed",
          message,
          source: "ipo-center",
        })
        throw new Error(message)
      }
      const loaded = Array.isArray(data.rows) ? data.rows : []
      setRows(loaded)
      void logMeroShareApplication({
        action: "application-report",
        status: "success",
        message: `Loaded ${loaded.length} application${loaded.length === 1 ? "" : "s"} from ${selectedAccount.label || "MeroShare"}.`,
        source: "ipo-center",
      })
    } catch (err: any) {
      setError(err?.message || "Failed to load applications")
      setRows(null)
    } finally {
      setLoading(false)
    }
  }, [accounts, selectedAccount, userProfile?.meroShare?.browserProvider])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    const list = rows ?? []
    const totalApplied = list.reduce((sum, row) => sum + (row.appliedKitta || 0), 0)
    const totalReceived = list.reduce((sum, row) => sum + (row.receivedKitta || 0), 0)
    const allotted = list.filter((row) => row.receivedKitta > 0 || /^\s*allotted\s*$/i.test(row.statusName)).length
    return { total: list.length, totalApplied, totalReceived, allotted }
  }, [rows])

  return (
    <div className="space-y-3 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {rows !== null
            ? `My ASBA applications · ${rows.length} total`
            : "Your past IPO applications from MeroShare (My ASBA → Application Report)"}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-xl text-xs font-bold"
          onClick={load}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {accounts.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground shrink-0">Account</span>
          <Select value={selectedAccount?.id} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="h-8 flex-1 rounded-xl text-[11px] font-bold border-primary/20 bg-background/60">
              <SelectValue placeholder="Choose account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id} className="text-xs">
                  {account.label}
                  {account.username ? ` (${account.username})` : ""}
                  {account.role === "primary" ? " · primary" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <StatBox label="Applications" value={stats.total} icon={FileText} tone="text-primary" />
          <StatBox label="Applied (kitta)" value={stats.totalApplied} icon={TrendingUp} tone="text-info" />
          <StatBox label="Allotted (kitta)" value={stats.totalReceived} icon={CheckCircle2} tone="text-success" />
          <StatBox label="Allotted IPOs" value={stats.allotted} icon={Landmark} tone="text-success" />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-[92px] rounded-2xl bg-muted/20 animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-destructive/30 bg-card/40 py-16 px-6 text-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive/70" />
          <p className="text-sm text-destructive font-medium">{error}</p>
          <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs" onClick={load}>Retry</Button>
        </div>
      ) : rows === null ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/40 bg-card/40 py-16 px-6 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-sm font-black text-muted-foreground mb-1">No applications yet</p>
          <p className="text-xs text-muted-foreground/70">Refresh once you have applied to an IPO.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/40 bg-card/40 py-16 px-6 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-sm font-black text-muted-foreground mb-1">No applications yet</p>
          <p className="text-xs text-muted-foreground/70">Your MeroShare account has no ASBA applications.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const allotted = row.receivedKitta > 0
            const status = displayStatus(row)
            return (
              <div
                key={`${row.companyShareId ?? ""}-${row.applicantFormId ?? row.scrip}`}
                className="group flex items-center gap-3 rounded-2xl border border-border/30 bg-card/50 px-3.5 py-3 backdrop-blur-sm transition-colors hover:border-primary/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-black">{row.companyName || row.scrip || "Unknown company"}</p>
                    {row.scrip && (
                      <Badge variant="outline" className="shrink-0 text-[9px] h-5 px-1.5 font-mono font-bold text-muted-foreground">
                        {row.scrip}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {row.appliedDate ? `Applied ${formatDate(row.appliedDate)}` : ""}
                      {row.shareTypeName ? `${row.appliedDate ? " · " : ""}${row.shareTypeName}` : ""}
                    </span>
                  </p>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Applied</p>
                  <p className="text-sm font-black font-mono">{row.appliedKitta || 0}</p>
                </div>
                {allotted && (
                  <div className="hidden md:block text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Allotted</p>
                    <p className="text-sm font-black font-mono text-success">{row.receivedKitta}</p>
                  </div>
                )}
                <Badge className={cn("shrink-0 text-[10px] h-6 px-2.5 font-bold border", statusTone(status))}>
                  {status}
                </Badge>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
