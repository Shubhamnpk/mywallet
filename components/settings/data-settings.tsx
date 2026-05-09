"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { useWalletData } from "@/contexts/wallet-data-context"
import { Download, Upload, Trash2, Database, FileText, ShieldCheck, Workflow, Cloud, Loader2, RefreshCw, Info } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { DeleteDataDialog } from "./delete-data-dialog"
import { BackupModal } from "./data-settings/backup-modal"
import { ImportModal } from "./data-settings/import-modal"
import * as Dropbox from "@/lib/dropbox"
import type { DropboxAccount } from "@/lib/dropbox"
import { SecureKeyManager } from "@/lib/key-manager"
import { SecurePinManager } from "@/lib/secure-pin-manager"
import { loadFromLocalStorage, saveToLocalStorage } from "@/lib/storage"
import { DEFAULT_BACKUP_PIN } from "@/lib/backup"

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
  const [backupDestination, setBackupDestination] = useState<"download" | "dropbox">("download")
  const [dropboxAccount, setDropboxAccount] = useState<DropboxAccount | null>(null)
  const [dropboxError, setDropboxError] = useState<string | null>(null)
  const [hasDropboxToken, setHasDropboxToken] = useState(false)
  const [dropboxNeedsReconnect, setDropboxNeedsReconnect] = useState(false)
  const [isDropboxConnecting, setIsDropboxConnecting] = useState(false)
  const [isDropboxPushing, setIsDropboxPushing] = useState(false)
  const [isDropboxPulling, setIsDropboxPulling] = useState(false)
  const [isDropboxRefreshing, setIsDropboxRefreshing] = useState(false)
  const [showDropboxInfo, setShowDropboxInfo] = useState(false)
  const [showTombstoneInfo, setShowTombstoneInfo] = useState(false)
  const [isTombstoneLoading, setIsTombstoneLoading] = useState(false)
  const [tombstoneStats, setTombstoneStats] = useState<{ label: string; count: number }[]>([])
  const [showDropboxBackupPinPrompt, setShowDropboxBackupPinPrompt] = useState(false)
  const [showDropboxLocalPinPrompt, setShowDropboxLocalPinPrompt] = useState(false)
  const [dropboxBackupPin, setDropboxBackupPin] = useState("")
  const [dropboxLocalPin, setDropboxLocalPin] = useState("")
  const [dropboxBackupPinError, setDropboxBackupPinError] = useState<string | null>(null)
  const [dropboxLocalPinError, setDropboxLocalPinError] = useState<string | null>(null)
  const [backupSizeMode, setBackupSizeMode] = useState<"essential" | "full">("essential")
  const [pendingDropboxContent, setPendingDropboxContent] = useState<string | null>(null)
  const [pendingDecryptedBackup, setPendingDecryptedBackup] = useState<any | null>(null)
  const [dropboxBackupPinAction, setDropboxBackupPinAction] = useState<"pull">("pull")
  const [dropboxLocalPinAction, setDropboxLocalPinAction] = useState<"import" | "push">("import")
  const dropboxAppKey = Dropbox.getDropboxAppKey()
  const hasDropboxConfig = Boolean(dropboxAppKey)
  const backupSizeModeKey = "wallet_dropbox_backup_size_mode"
  const nonEssentialBackupKeys = [
    "qrScanHistory",
    "receiptScanHistory",
    "transaction-dialog-form",
    "wallet_pending_transactions",
    "wallet_pending_budgets",
    "wallet_pending_goals",
  ] as const

  type TombstoneRecord = { id: string; deletedAt: string }
  const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
  const TOMBSTONE_KEYS = [
    "deleted_transactions",
    "deleted_budgets",
    "deleted_goals",
    "deleted_debtAccounts",
    "deleted_creditAccounts",
    "deleted_debtCreditTransactions",
    "deleted_categories",
    "deleted_shareTransactions",
    "deleted_portfolios",
  ] as const
  const TOMBSTONE_LABELS: Record<(typeof TOMBSTONE_KEYS)[number], string> = {
    deleted_transactions: "Transactions",
    deleted_budgets: "Budgets",
    deleted_goals: "Goals",
    deleted_debtAccounts: "Debt Accounts",
    deleted_creditAccounts: "Credit Accounts",
    deleted_debtCreditTransactions: "Debt/Credit History",
    deleted_categories: "Categories",
    deleted_shareTransactions: "Share Transactions",
    deleted_portfolios: "Portfolios",
  }

  const getDropboxSession = () => {
    if (typeof Dropbox.getDropboxAuthSession === "function") {
      return Dropbox.getDropboxAuthSession()
    }

    if (typeof window === "undefined") return null

    const accessToken = localStorage.getItem(Dropbox.DROPBOX_TOKEN_KEY)
    if (!accessToken) return null

    const expiresAtRaw = localStorage.getItem(Dropbox.DROPBOX_TOKEN_EXPIRES_KEY)
    const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : null

    return {
      accessToken,
      refreshToken: localStorage.getItem(Dropbox.DROPBOX_REFRESH_TOKEN_KEY),
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
      scope: localStorage.getItem(Dropbox.DROPBOX_TOKEN_SCOPE_KEY),
      tokenType: localStorage.getItem(Dropbox.DROPBOX_TOKEN_TYPE_KEY),
    }
  }

  const markDropboxReconnectRequired = (message: string) => {
    Dropbox.clearDropboxToken()
    setDropboxAccount(null)
    setHasDropboxToken(false)
    setDropboxNeedsReconnect(true)
    setDropboxError(message)
  }

  const isDropboxAuthorizationError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    const normalized = message.toLowerCase()
    return (
      normalized.includes("expired") ||
      normalized.includes("invalid_access_token") ||
      normalized.includes("missing_scope") ||
      normalized.includes("invalid_grant") ||
      normalized.includes("401") ||
      normalized.includes("unauthorized") ||
      normalized.includes("authorization")
    )
  }

  const getDropboxReconnectMessage = (error: unknown, action: "upload" | "download") => {
    const message = error instanceof Error ? error.message : String(error)
    if (message.toLowerCase().includes("missing_scope")) {
      return `Dropbox needs file ${action === "upload" ? "write" : "read"} permission. Enable the Dropbox app permission, then reconnect Dropbox.`
    }
    return `Dropbox access is no longer valid. Reconnect to ${action} backups.`
  }

  const describeDropboxOperationError = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message
    if (typeof error === "string" && error.trim()) return error
    return fallback
  }

  const handleCreateBackup = (destination: "download" | "dropbox") => {
    if (destination === "dropbox" && !hasDropboxConfig) {
      toast({
        title: "Dropbox Not Configured",
        description: "Set NEXT_PUBLIC_DROPBOX_APP_KEY to enable Dropbox backups.",
        variant: "destructive",
      })
      return
    }
    setBackupDestination(destination)
    setShowBackupModal(true)
  }

  const ensureDropboxToken = async ({ interactive = true }: { interactive?: boolean } = {}) => {
    if (!dropboxAppKey) {
      throw new Error("Dropbox is not configured")
    }

    const existingSession = getDropboxSession()
    let canRefreshExistingSession = Boolean(existingSession?.refreshToken)
    if (existingSession && !Dropbox.isDropboxAccessTokenExpired(existingSession, 60_000)) {
      const missingScopes = Dropbox.getMissingDropboxScopes(existingSession.scope)
      if (missingScopes.length > 0) {
        canRefreshExistingSession = false
        markDropboxReconnectRequired(
          `Dropbox needs these permissions: ${missingScopes.join(", ")}. Reconnect Dropbox to continue.`,
        )
        if (!interactive) {
          throw new Error(`Dropbox is missing required permissions: ${missingScopes.join(", ")}`)
        }
      } else {
        setHasDropboxToken(true)
        setDropboxNeedsReconnect(false)
        setDropboxError(null)
        return existingSession.accessToken
      }
    }

    if (existingSession?.refreshToken && canRefreshExistingSession) {
      try {
        const refreshed = await Dropbox.refreshDropboxAccessToken(existingSession.refreshToken)
        const nextSession = Dropbox.storeDropboxAuthSession(refreshed, {
          refreshToken: existingSession.refreshToken,
        })
        const missingScopes = Dropbox.getMissingDropboxScopes(nextSession.scope)
        if (missingScopes.length > 0) {
          markDropboxReconnectRequired(
            `Dropbox needs these permissions: ${missingScopes.join(", ")}. Reconnect Dropbox to continue.`,
          )
          if (!interactive) {
            throw new Error(`Dropbox is missing required permissions: ${missingScopes.join(", ")}`)
          }
        } else {
          setHasDropboxToken(true)
          setDropboxNeedsReconnect(false)
          setDropboxError(null)
          return nextSession.accessToken
        }
      } catch (error) {
        markDropboxReconnectRequired("Dropbox session expired. Reconnect to continue backups.")

        const message = error instanceof Error ? error.message : "Dropbox session refresh failed"
        if (!message.toLowerCase().includes("expired")) {
          console.warn("Dropbox refresh failed:", error)
        }

        if (!interactive) {
          throw new Error("Dropbox session expired. Reconnect Dropbox to continue.")
        }
      }
    }

    if (!interactive) {
      throw new Error("Dropbox is not connected")
    }

    const redirectUri = `${window.location.origin}/dropbox-callback`
    const { authUrl } = await Dropbox.createDropboxAuthRequest(dropboxAppKey, redirectUri)
    const authWindow = window.open(authUrl, "dropbox-auth", "width=480,height=640")

    if (!authWindow) {
      throw new Error("Popup blocked. Please allow popups to connect Dropbox.")
    }

    return await new Promise<string>((resolve, reject) => {
      let resolved = false
      const cleanup = () => {
        window.removeEventListener("message", handleMessage)
        clearInterval(timer)
      }
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (event.data?.type !== "dropbox-auth") return
        resolved = true
        cleanup()
        const session = getDropboxSession()
        if (event.data?.success && session?.accessToken) {
          setHasDropboxToken(true)
          setDropboxNeedsReconnect(false)
          setDropboxError(null)
          resolve(session.accessToken)
        } else {
          reject(new Error(event.data?.error || "Dropbox authorization failed"))
        }
      }
      const timer = window.setInterval(() => {
        if (authWindow.closed && !resolved) {
          cleanup()
          reject(new Error("Dropbox authorization cancelled"))
        }
      }, 500)

      window.addEventListener("message", handleMessage)
    })
  }

  const refreshDropboxAccount = async (token: string) => {
    setIsDropboxRefreshing(true)
    try {
      const account = await Dropbox.getDropboxAccount(token)
      setDropboxAccount(account)
      setDropboxError(null)
      setDropboxNeedsReconnect(false)
      return account
    } catch (error) {
      if (isDropboxAuthorizationError(error)) {
        markDropboxReconnectRequired("Dropbox access is no longer valid. Reconnect to continue.")
      } else {
        setDropboxAccount(null)
        setDropboxError(error instanceof Error ? error.message : "Unable to load Dropbox account")
      }
      return null
    } finally {
      setIsDropboxRefreshing(false)
    }
  }

  useEffect(() => {
    const initializeDropbox = async () => {
      const session = getDropboxSession()
      if (!session) {
        setHasDropboxToken(false)
        setDropboxNeedsReconnect(false)
        return
      }

      try {
        const token = await ensureDropboxToken({ interactive: false })
        setHasDropboxToken(true)
        await refreshDropboxAccount(token)
      } catch (error) {
        setHasDropboxToken(false)
        setDropboxNeedsReconnect(true)
        setDropboxError(error instanceof Error ? error.message : "Dropbox needs to be reconnected")
      }
    }

    void initializeDropbox()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const storedMode = localStorage.getItem(backupSizeModeKey)
    if (storedMode === "full" || storedMode === "essential") {
      setBackupSizeMode(storedMode)
    }
  }, [])

  const handleDropboxConnect = async () => {
    if (!hasDropboxConfig) {
      toast({
        title: "Dropbox Not Configured",
        description: "Set NEXT_PUBLIC_DROPBOX_APP_KEY to enable Dropbox backups.",
        variant: "destructive",
      })
      return
    }
    setIsDropboxConnecting(true)
    try {
      const token = await ensureDropboxToken()
      setHasDropboxToken(true)
      setDropboxNeedsReconnect(false)
      const account = await refreshDropboxAccount(token)
      toast({
        title: "Dropbox Connected (Beta)",
        description: account?.email ? `Connected as ${account.email}` : "Dropbox connected.",
      })
      void handleDropboxDownload(undefined, { auto: true })
    } catch (error) {
      toast({
        title: "Dropbox Connection Failed",
        description: error instanceof Error ? error.message : "Unable to connect Dropbox.",
        variant: "destructive",
      })
    } finally {
      setIsDropboxConnecting(false)
    }
  }

  const handleDropboxDisconnect = async () => {
    const session = getDropboxSession()
    if (session?.accessToken) {
      try {
        await Dropbox.revokeDropboxToken(session.accessToken)
      } catch (error) {
        console.warn("Dropbox token revoke failed:", error)
      }
    }

    Dropbox.clearDropboxToken()
    setDropboxAccount(null)
    setDropboxError(null)
    setHasDropboxToken(false)
    setDropboxNeedsReconnect(false)
    setIsDropboxConnecting(false)
    setIsDropboxPushing(false)
    setIsDropboxPulling(false)
    setIsDropboxRefreshing(false)
    setShowDropboxBackupPinPrompt(false)
    setShowDropboxLocalPinPrompt(false)
    setDropboxBackupPin("")
    setDropboxLocalPin("")
    setDropboxBackupPinError(null)
    setDropboxLocalPinError(null)
    setBackupSizeMode("essential")
    setPendingDropboxContent(null)
    setPendingDecryptedBackup(null)
    setDropboxBackupPinAction("pull")
    setDropboxLocalPinAction("import")
    toast({
      title: "Dropbox Disconnected",
      description: "Dropbox access, keys, and backup preferences have been removed from this device.",
    })
  }

  const loadTombstones = async () => {
    const stored = await loadFromLocalStorage([...TOMBSTONE_KEYS])
    return TOMBSTONE_KEYS.reduce<Record<string, TombstoneRecord[]>>((acc, key) => {
      acc[key] = Array.isArray(stored[key]) ? stored[key] : []
      return acc
    }, {})
  }

  const refreshTombstoneStats = async () => {
    setIsTombstoneLoading(true)
    try {
      const stored = await loadFromLocalStorage([...TOMBSTONE_KEYS])
      const stats = TOMBSTONE_KEYS.map((key) => {
        const list = Array.isArray(stored[key]) ? stored[key] : []
        return { label: TOMBSTONE_LABELS[key], count: list.length }
      })
      setTombstoneStats(stats)
    } finally {
      setIsTombstoneLoading(false)
    }
  }

  const clearAllTombstones = async () => {
    setIsTombstoneLoading(true)
    try {
      for (const key of TOMBSTONE_KEYS) {
        await saveToLocalStorage(key, [], true)
      }
      await refreshTombstoneStats()
      toast({
        title: "Tombstones Cleared",
        description: "Deletion sync history has been cleared for this device.",
      })
    } finally {
      setIsTombstoneLoading(false)
    }
  }

  const mergeTombstoneLists = (localList: TombstoneRecord[], remoteList: TombstoneRecord[]) => {
    const map = new Map<string, TombstoneRecord>()
    const add = (entry: TombstoneRecord) => {
      const existing = map.get(entry.id)
      if (!existing) {
        map.set(entry.id, entry)
        return
      }
      const existingTime = Date.parse(existing.deletedAt || "")
      const entryTime = Date.parse(entry.deletedAt || "")
      if (!Number.isFinite(existingTime) || entryTime > existingTime) {
        map.set(entry.id, entry)
      }
    }
    localList.forEach(add)
    remoteList.forEach(add)
    const cutoff = Date.now() - TOMBSTONE_RETENTION_MS
    return Array.from(map.values()).filter((entry) => Date.parse(entry.deletedAt || "") >= cutoff)
  }

  const getItemTimestamp = (item: any) => {
    const candidate = item?.updatedAt || item?.lastUpdated || item?.createdAt || item?.date || item?.timestamp
    if (!candidate) return 0
    const time = Date.parse(candidate)
    return Number.isFinite(time) ? time : 0
  }

  const mergeById = <T extends { id?: string }>(localList: T[], remoteList: T[]) => {
    const map = new Map<string, T>()
    const extras: T[] = []
    remoteList.forEach((item) => {
      if (!item?.id) {
        extras.push(item)
        return
      }
      map.set(item.id, item)
    })
    localList.forEach((item) => {
      if (!item?.id) {
        extras.push(item)
        return
      }
      const existing = map.get(item.id)
      if (!existing) {
        map.set(item.id, item)
        return
      }
      const existingTime = getItemTimestamp(existing)
      const itemTime = getItemTimestamp(item)
      if (itemTime > existingTime) {
        map.set(item.id, item)
      }
    })
    return [...map.values(), ...extras]
  }

  const applyTombstones = <T extends { id?: string }>(items: T[], tombstones: TombstoneRecord[]) => {
    if (tombstones.length === 0) return items
    const tombstoneMap = new Map<string, number>()
    tombstones.forEach((entry) => {
      const time = Date.parse(entry.deletedAt || "")
      tombstoneMap.set(entry.id, Number.isFinite(time) ? time : 0)
    })
    return items.filter((item) => {
      if (!item?.id) return true
      const deletedAt = tombstoneMap.get(item.id)
      if (!deletedAt) return true
      const itemTime = getItemTimestamp(item)
      return itemTime > deletedAt
    })
  }

  const buildBackupData = async (mode: "essential" | "full") => {
    const customCategoriesOnly = categories.filter((category) => !category?.isDefault)
    const tombstones = await loadTombstones()
    const data: any = {
      exportDate: new Date().toISOString(),
      version: "2.0",
      backupOptions: {
        backupSize: mode,
        userProfile: true,
        transactions: true,
        budgets: true,
        goals: true,
        debtAccounts: true,
        creditAccounts: true,
        debtCreditTransactions: true,
        categories: true,
        emergencyFund: true,
        portfolio: true,
        shareTransactions: true,
        portfolios: true,
        activePortfolioId: true,
        shiftTracker: true,
      },
      userProfile,
      transactions,
      budgets,
      goals,
      debtAccounts,
      creditAccounts,
      debtCreditTransactions,
      categories: customCategoriesOnly,
      emergencyFund,
      portfolio,
      shareTransactions,
      portfolios,
      activePortfolioId,
      tombstones,
      shifts: JSON.parse(localStorage.getItem("mywallet_wt_shifts_v2") || "[]"),
      shiftPayments: JSON.parse(localStorage.getItem("mywallet_wt_pay_v1") || "[]"),
      shiftRate: Number(localStorage.getItem("mywallet_wt_rate_v1") || "0") || 12.20,
      shiftTimeFormat: localStorage.getItem("mywallet_wt_timefmt_v1") || "12h",
    }

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

    if (mode === "full") {
      const extras = await loadFromLocalStorage([...nonEssentialBackupKeys])
      nonEssentialBackupKeys.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(extras, key)) return
        const value = extras[key]
        if (value === null || typeof value === "undefined") return
        data[key] = value
      })
    }

    return data
  }

  const mergeDropboxData = async (remoteData: any) => {
    const localCustomCategories = categories.filter((category) => !category?.isDefault)
    const remoteCustomCategories = Array.isArray(remoteData?.categories)
      ? remoteData.categories.filter((category: any) => !category?.isDefault)
      : []
    const localTombstones = await loadTombstones()
    const remoteTombstones = typeof remoteData?.tombstones === "object" && remoteData.tombstones ? remoteData.tombstones : {}
    const mergedTombstones = TOMBSTONE_KEYS.reduce<Record<string, TombstoneRecord[]>>((acc, key) => {
      const localList = Array.isArray(localTombstones[key]) ? localTombstones[key] : []
      const remoteList = Array.isArray(remoteTombstones[key]) ? remoteTombstones[key] : []
      acc[key] = mergeTombstoneLists(localList, remoteList)
      return acc
    }, {})

    const mergedTransactions = applyTombstones(
      mergeById(transactions, Array.isArray(remoteData?.transactions) ? remoteData.transactions : []),
      mergedTombstones.deleted_transactions,
    )
    const mergedBudgets = applyTombstones(
      mergeById(budgets, Array.isArray(remoteData?.budgets) ? remoteData.budgets : []),
      mergedTombstones.deleted_budgets,
    )
    const mergedGoals = applyTombstones(
      mergeById(goals, Array.isArray(remoteData?.goals) ? remoteData.goals : []),
      mergedTombstones.deleted_goals,
    )
    const mergedDebtAccounts = applyTombstones(
      mergeById(debtAccounts, Array.isArray(remoteData?.debtAccounts) ? remoteData.debtAccounts : []),
      mergedTombstones.deleted_debtAccounts,
    )
    const mergedCreditAccounts = applyTombstones(
      mergeById(creditAccounts, Array.isArray(remoteData?.creditAccounts) ? remoteData.creditAccounts : []),
      mergedTombstones.deleted_creditAccounts,
    )
    const mergedDebtCreditTransactions = applyTombstones(
      mergeById(debtCreditTransactions, Array.isArray(remoteData?.debtCreditTransactions) ? remoteData.debtCreditTransactions : []),
      mergedTombstones.deleted_debtCreditTransactions,
    )
    const mergedCategories = applyTombstones(
      mergeById(localCustomCategories, remoteCustomCategories),
      mergedTombstones.deleted_categories,
    )
    const mergedShareTransactions = applyTombstones(
      mergeById(shareTransactions, Array.isArray(remoteData?.shareTransactions) ? remoteData.shareTransactions : []),
      mergedTombstones.deleted_shareTransactions,
    )
    const mergedPortfolios = applyTombstones(
      mergeById(portfolios, Array.isArray(remoteData?.portfolios) ? remoteData.portfolios : []),
      mergedTombstones.deleted_portfolios,
    )
    const mergedPortfolio = mergeById(portfolio, Array.isArray(remoteData?.portfolio) ? remoteData.portfolio : [])

    const mergedEmergencyFund = typeof remoteData?.emergencyFund !== "undefined"
      ? remoteData.emergencyFund
      : emergencyFund

    return {
      ...remoteData,
      userProfile: remoteData?.userProfile ?? userProfile,
      transactions: mergedTransactions,
      budgets: mergedBudgets,
      goals: mergedGoals,
      debtAccounts: mergedDebtAccounts,
      creditAccounts: mergedCreditAccounts,
      debtCreditTransactions: mergedDebtCreditTransactions,
      categories: mergedCategories,
      portfolio: mergedPortfolio,
      shareTransactions: mergedShareTransactions,
      portfolios: mergedPortfolios,
      activePortfolioId: activePortfolioId ?? remoteData?.activePortfolioId ?? null,
      emergencyFund: mergedEmergencyFund,
      tombstones: mergedTombstones,
    }
  }

  const persistTombstones = async (tombstones: Record<string, TombstoneRecord[]>) => {
    for (const key of TOMBSTONE_KEYS) {
      const list = Array.isArray(tombstones[key]) ? tombstones[key] : []
      await saveToLocalStorage(key, list, true)
    }
  }

  const persistOptionalBackupData = async (data: any) => {
    for (const key of nonEssentialBackupKeys) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue
      const value = data[key]
      if (value === null || typeof value === "undefined") continue
      await saveToLocalStorage(key, value, true)
    }
  }

  const runDropboxImport = async (decrypted: any, localPinOverride?: string) => {
    setIsDropboxPulling(true)
    try {
      const requiresUnlock = SecurePinManager.hasPin() && !SecureKeyManager.isKeyCacheValid()
      const cachedPin = SecureKeyManager.getCachedSessionPin() ?? undefined
      const localPin = localPinOverride ?? cachedPin
      if (requiresUnlock && !localPin) {
        setPendingDecryptedBackup(decrypted)
        setDropboxLocalPinAction("import")
        setDropboxLocalPinError(null)
        setShowDropboxLocalPinPrompt(true)
        return
      }
      if (requiresUnlock && localPin) {
        const validation = await SecurePinManager.validatePin(localPin)
        if (!validation.success) {
          setPendingDecryptedBackup(decrypted)
          setDropboxLocalPinAction("import")
          setDropboxLocalPin("")
          setDropboxLocalPinError("That PIN decrypted the backup, but it is not this wallet's current PIN. Enter your current wallet PIN to finish importing.")
          setShowDropboxLocalPinPrompt(true)
          return
        }
        SecureKeyManager.cacheSessionPin(localPin)
      }

      const merged = await mergeDropboxData(decrypted)
      await importData(merged, localPin)
      if (merged?.tombstones) {
        await persistTombstones(merged.tombstones)
      }
      await persistOptionalBackupData(decrypted)

      if (Array.isArray(decrypted.shifts)) localStorage.setItem("mywallet_wt_shifts_v2", JSON.stringify(decrypted.shifts))
      if (Array.isArray(decrypted.shiftPayments)) localStorage.setItem("mywallet_wt_pay_v1", JSON.stringify(decrypted.shiftPayments))
      if (typeof decrypted.shiftRate === "number") localStorage.setItem("mywallet_wt_rate_v1", String(decrypted.shiftRate))
      if (typeof decrypted.shiftTimeFormat === "string") localStorage.setItem("mywallet_wt_timefmt_v1", decrypted.shiftTimeFormat)

      toast({
        title: "Dropbox Backup Restored (Beta)",
        description: "Your wallet data has been imported successfully.",
      })
    } catch (error) {
      toast({
        title: "Dropbox Restore Failed",
        description: error instanceof Error ? error.message : "Failed to restore backup from Dropbox.",
        variant: "destructive",
      })
    } finally {
      setIsDropboxPulling(false)
    }
  }

  const handleBackupSuccess = async (data: any, pin: string) => {
    try {
      const { createEncryptedBackup } = await import("@/lib/backup")
      const backupJson = await createEncryptedBackup(data, pin)
      const filename = `mywallet-selective-backup-${new Date().toISOString().split("T")[0]}.json`

      if (backupDestination === "dropbox") {
        const token = await ensureDropboxToken()
        await Dropbox.uploadToDropbox(backupJson, filename, token)
        toast({
          title: "Backup Uploaded to Dropbox (Beta)",
          description: "Your encrypted backup has been saved to your Dropbox.",
        })
      } else {
        const blob = new Blob([backupJson], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "Selective Backup Created",
          description: "Your selected wallet data has been encrypted and downloaded successfully.",
        })
      }
    } catch (error) {
      const message = describeDropboxOperationError(error, "Failed to create encrypted backup. Please try again.")
      console.error("Backup creation failed:", error)
      toast({
        title: "Backup Failed",
        description: message,
        variant: "destructive",
      })
      throw error
    }
  }

  const handleDropboxPush = async (overridePin?: string) => {
    if (!hasDropboxConfig) {
      setDropboxError("Dropbox push failed: NEXT_PUBLIC_DROPBOX_APP_KEY is not configured.")
      toast({
        title: "Dropbox Not Configured",
        description: "Set NEXT_PUBLIC_DROPBOX_APP_KEY to enable Dropbox backups.",
        variant: "destructive",
      })
      return
    }

    const cachedPin = SecureKeyManager.getCachedSessionPin()
    const pinToUse = overridePin || cachedPin || (SecurePinManager.hasPin() ? "" : DEFAULT_BACKUP_PIN)
    if (!pinToUse) {
      setDropboxLocalPinAction("push")
      setDropboxLocalPinError(null)
      setShowDropboxLocalPinPrompt(true)
      return
    }

    try {
      setIsDropboxPushing(true)
      setDropboxError(null)
      const { createEncryptedBackup } = await import("@/lib/backup")
      const data = await buildBackupData(backupSizeMode)
      const backupJson = await createEncryptedBackup(data, pinToUse)
      const filename = "mywallet-backup.json"

      const token = await ensureDropboxToken()
      await Dropbox.uploadToDropbox(backupJson, filename, token, { overwrite: true })
      toast({
        title: "Backup Uploaded to Dropbox (Beta)",
        description: "Your encrypted backup has been saved to your Dropbox.",
      })
    } catch (error) {
      const message = describeDropboxOperationError(error, "Failed to upload backup to Dropbox.")
      if (isDropboxAuthorizationError(error)) {
        markDropboxReconnectRequired(getDropboxReconnectMessage(error, "upload"))
      } else {
        setDropboxError(`Push failed: ${message}`)
      }
      toast({
        title: "Dropbox Backup Failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsDropboxPushing(false)
    }
  }

  const handleDropboxDownload = async (overridePin?: string, options?: { auto?: boolean }) => {
    try {
      setIsDropboxPulling(true)
      const token = await ensureDropboxToken()
      const latest = await Dropbox.getLatestDropboxBackup(token)
      if (!latest) {
        if (!options?.auto) {
          toast({
            title: "No Dropbox Backup Found",
            description: "Upload a backup first to download it.",
            variant: "destructive",
          })
        }
        return
      }

      const content = await Dropbox.downloadDropboxFile(latest.path_lower, token)
      const cachedPin = SecureKeyManager.getCachedSessionPin()
      const pinToUse = overridePin || cachedPin
      if (!pinToUse) {
        try {
          const { restoreEncryptedBackup } = await import("@/lib/backup")
          const decrypted = await restoreEncryptedBackup(content, DEFAULT_BACKUP_PIN)
          setIsDropboxPulling(false)
          await runDropboxImport(decrypted, DEFAULT_BACKUP_PIN)
          return
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (message.toLowerCase().includes("decryption failed")) {
            setPendingDropboxContent(content)
            setDropboxBackupPinAction("pull")
            setDropboxBackupPinError(null)
            setIsDropboxPulling(false)
            setShowDropboxBackupPinPrompt(true)
            return
          }
          throw error
        }
      }

      const { restoreEncryptedBackup } = await import("@/lib/backup")
      let decrypted: any
      try {
        decrypted = await restoreEncryptedBackup(content, pinToUse)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.toLowerCase().includes("decryption failed")) {
          setPendingDropboxContent(content)
          setDropboxBackupPinAction("pull")
          setDropboxBackupPinError(null)
          setIsDropboxPulling(false)
          setShowDropboxBackupPinPrompt(true)
          return
        }
        throw error
      }

      setIsDropboxPulling(false)
      await runDropboxImport(decrypted, pinToUse)
    } catch (error) {
      if (isDropboxAuthorizationError(error)) {
        markDropboxReconnectRequired(getDropboxReconnectMessage(error, "download"))
      }
      toast({
        title: "Dropbox Restore Failed",
        description: error instanceof Error ? error.message : "Failed to restore backup from Dropbox.",
        variant: "destructive",
      })
    } finally {
      setIsDropboxPulling(false)
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-semibold">Export Data</h3>
                  <p className="text-sm text-muted-foreground">Create encrypted backup</p>
                </div>
              </div>
              <Button onClick={() => handleCreateBackup("download")}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-semibold">Import Data</h3>
                  <p className="text-sm text-muted-foreground">Restore from backup</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowImportModal(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Dropbox Backup
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider">
                Beta
              </Badge>
            </span>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => setShowDropboxInfo((prev) => !prev)}
                variant="ghost"
                size="icon"
                aria-label={showDropboxInfo ? "Hide Dropbox details" : "Show Dropbox details"}
              >
                <Info className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => {
                  void (async () => {
                    try {
                      const token = await ensureDropboxToken({ interactive: false })
                      await refreshDropboxAccount(token)
                    } catch (error) {
                      setDropboxError(error instanceof Error ? error.message : "Dropbox needs to be reconnected")
                    }
                  })()
                }}
                variant="ghost"
                size="icon"
                aria-label="Refresh Dropbox status"
                disabled={!hasDropboxToken}
              >
                <RefreshCw className={`h-4 w-4 ${isDropboxRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>Manual push/pull backups to your Dropbox.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showDropboxInfo && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-primary" />
                Dropbox backup details
              </div>
              <p className="text-xs text-muted-foreground">
                We store one encrypted file named <span className="font-mono">mywallet-backup.json</span> in your Dropbox App folder.
              </p>
              {!hasDropboxConfig && (
                <p className="text-xs text-muted-foreground">
                  Set <span className="font-mono">NEXT_PUBLIC_DROPBOX_APP_KEY</span> to enable Dropbox backups.
                </p>
              )}
              {hasDropboxToken && (
                <div className="rounded-md border bg-background/70 p-3">
                  <p className="text-xs font-medium text-foreground">Backup size mode</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Essential skips scan history, drafts, and offline queues.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Dropbox access now refreshes automatically when the local session is still authorized.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={backupSizeMode === "essential" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setBackupSizeMode("essential")
                        localStorage.setItem(backupSizeModeKey, "essential")
                      }}
                    >
                      Essential
                    </Button>
                    <Button
                      type="button"
                      variant={backupSizeMode === "full" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setBackupSizeMode("full")
                        localStorage.setItem(backupSizeModeKey, "full")
                      }}
                    >
                      Full
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {!hasDropboxToken ? (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {dropboxNeedsReconnect
                  ? "Your Dropbox session expired or was revoked. Reconnect to resume backups."
                  : "Connect your Dropbox account to enable manual backup uploads and downloads."}
              </p>
              {dropboxError && (
                <Alert variant="destructive">
                  <AlertTitle>Dropbox error</AlertTitle>
                  <AlertDescription className="break-words text-xs">{dropboxError}</AlertDescription>
                </Alert>
              )}
              <Button onClick={handleDropboxConnect} disabled={!hasDropboxConfig || isDropboxConnecting}>
                <Cloud className="mr-2 h-4 w-4" />
                {isDropboxConnecting ? "Connecting..." : dropboxNeedsReconnect ? "Reconnect Dropbox" : "Connect Dropbox"}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Connected Dropbox</p>
                  <p className="text-xs text-muted-foreground">{dropboxAccount?.email || "Account details unavailable"}</p>
                </div>
                <Badge variant="secondary">Connected</Badge>
              </div>
              {dropboxError && (
                <Alert variant="destructive">
                  <AlertTitle>Dropbox error</AlertTitle>
                  <AlertDescription className="break-words text-xs">{dropboxError}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button onClick={() => void handleDropboxPush()} variant="outline" disabled={isDropboxPushing || isDropboxPulling}>
                  {isDropboxPushing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Cloud className="mr-2 h-4 w-4" />
                  )}
                  {isDropboxPushing ? "Pushing..." : "Push Backup"}
                </Button>
                <Button onClick={() => void handleDropboxDownload()} variant="outline" disabled={isDropboxPulling || isDropboxPushing}>
                  {isDropboxPulling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {isDropboxPulling ? "Pulling..." : "Pull Backup"}
                </Button>
              </div>
              {showDropboxInfo && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Push overwrites <span className="font-mono">mywallet-backup.json</span>. Pull downloads it for Import.
                  </p>
                  <Button onClick={() => void handleDropboxDisconnect()} variant="ghost" size="sm" className="w-full">
                    Disconnect Dropbox
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDropboxBackupPinPrompt} onOpenChange={(open) => setShowDropboxBackupPinPrompt(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Dropbox Backup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dropbox-backup-pin">Backup PIN</Label>
              <p className="text-xs text-muted-foreground">
                Usually this is your wallet PIN from the device that created the backup.
              </p>
              <div className="flex justify-center py-1">
                <InputOTP
                  id="dropbox-backup-pin"
                  maxLength={6}
                  value={dropboxBackupPin}
                  onChange={(value) => {
                    setDropboxBackupPin(value)
                    setDropboxBackupPinError(null)
                  }}
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
              {dropboxBackupPinError && (
                <Alert variant="destructive">
                  <AlertTitle>PIN did not work</AlertTitle>
                  <AlertDescription className="break-words text-xs">{dropboxBackupPinError}</AlertDescription>
                </Alert>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowDropboxBackupPinPrompt(false)
                  setDropboxBackupPin("")
                  setDropboxBackupPinError(null)
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const pin = dropboxBackupPin.trim()
                  if (!pin) {
                    setDropboxBackupPinError("Please enter the backup PIN.")
                    toast({
                      title: "PIN Required",
                      description: "Please enter the backup PIN.",
                      variant: "destructive",
                    })
                    return
                  }
                  if (pin.length !== 6) {
                    setDropboxBackupPinError("PIN must be 6 digits.")
                    toast({
                      title: "Invalid PIN",
                      description: "PIN must be 6 digits.",
                      variant: "destructive",
                    })
                    return
                  }
                  const content = pendingDropboxContent
                  if (!content) {
                    setShowDropboxBackupPinPrompt(false)
                    setDropboxBackupPin("")
                    setDropboxBackupPinError(null)
                    toast({
                      title: "Backup Missing",
                      description: "Please try pulling again.",
                      variant: "destructive",
                    })
                    return
                  }
                  void (async () => {
                    setIsDropboxPulling(true)
                    try {
                      const { restoreEncryptedBackup } = await import("@/lib/backup")
                      const decrypted = await restoreEncryptedBackup(content, pin)
                      setPendingDropboxContent(null)
                      setShowDropboxBackupPinPrompt(false)
                      setDropboxBackupPin("")
                      setDropboxBackupPinError(null)
                      setIsDropboxPulling(false)
                      await runDropboxImport(decrypted, pin)
                    } catch (error) {
                      setIsDropboxPulling(false)
                      const message = error instanceof Error ? error.message : "Failed to decrypt backup."
                      setDropboxBackupPin("")
                      setDropboxBackupPinError(`${message} Please re-enter the backup PIN.`)
                      toast({
                        title: "Invalid Backup PIN",
                        description: message,
                        variant: "destructive",
                      })
                    }
                  })()
                }}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDropboxLocalPinPrompt} onOpenChange={(open) => setShowDropboxLocalPinPrompt(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dropboxLocalPinAction === "push" ? "Unlock Wallet to Push" : "Confirm Wallet PIN"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dropbox-local-pin">Wallet PIN</Label>
              <p className="text-xs text-muted-foreground">
                {dropboxLocalPinAction === "push"
                  ? "This encrypts the backup before uploading it to Dropbox."
                  : "Needed only if the backup PIN is different from this wallet's current PIN."}
              </p>
              <div className="flex justify-center py-1">
                <InputOTP
                  id="dropbox-local-pin"
                  maxLength={6}
                  value={dropboxLocalPin}
                  onChange={(value) => {
                    setDropboxLocalPin(value)
                    setDropboxLocalPinError(null)
                  }}
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
              {dropboxLocalPinError && (
                <Alert variant="destructive">
                  <AlertTitle>PIN did not work</AlertTitle>
                  <AlertDescription className="break-words text-xs">{dropboxLocalPinError}</AlertDescription>
                </Alert>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowDropboxLocalPinPrompt(false)
                  setDropboxLocalPin("")
                  setDropboxLocalPinError(null)
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const pin = dropboxLocalPin.trim()
                  if (!pin) {
                    setDropboxLocalPinError("Please enter your wallet PIN.")
                    toast({
                      title: "PIN Required",
                      description: "Please enter your wallet PIN.",
                      variant: "destructive",
                    })
                    return
                  }
                  if (pin.length !== 6) {
                    setDropboxLocalPinError("Wallet PIN must be 6 digits.")
                    toast({
                      title: "Invalid Wallet PIN",
                      description: "Wallet PIN must be 6 digits.",
                      variant: "destructive",
                    })
                    return
                  }
                  const decrypted = pendingDecryptedBackup
                  if (dropboxLocalPinAction === "push") {
                    void (async () => {
                      const validation = await SecurePinManager.validatePin(pin)
                      if (!validation.success) {
                        setDropboxLocalPin("")
                        setDropboxLocalPinError("That PIN is not correct. Please re-enter your current wallet PIN.")
                        toast({
                          title: "Invalid Wallet PIN",
                          description: "Please enter the correct PIN to continue.",
                          variant: "destructive",
                        })
                        return
                      }
                      SecureKeyManager.cacheSessionPin(pin)
                      setShowDropboxLocalPinPrompt(false)
                      setDropboxLocalPin("")
                      setDropboxLocalPinError(null)
                      void handleDropboxPush(pin)
                    })()
                    return
                  }
                  if (!decrypted) {
                    toast({
                      title: "Backup Missing",
                      description: "Please try pulling again.",
                      variant: "destructive",
                    })
                    return
                  }
                  setShowDropboxLocalPinPrompt(false)
                  setDropboxLocalPin("")
                  setDropboxLocalPinError(null)
                  setPendingDecryptedBackup(null)
                  void runDropboxImport(decrypted, pin)
                }}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Deletion Sync (Tombstones)
          </CardTitle>
          <CardDescription>Tracks deletions to keep devices in sync.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              const next = !showTombstoneInfo
              setShowTombstoneInfo(next)
              if (next) {
                void refreshTombstoneStats()
              }
            }}
          >
            {showTombstoneInfo ? "Hide details" : "Learn more"}
          </Button>
          {showTombstoneInfo && (
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>
                Tombstones are kept for 30 days to propagate deletions across devices.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={clearAllTombstones}
                disabled={isTombstoneLoading}
              >
                Clear Tombstones
              </Button>
              {isTombstoneLoading ? (
                <p>Loading tombstone stats...</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {tombstoneStats.map((stat) => (
                    <div key={stat.label} className="rounded-md border bg-background/70 p-2">
                      <p className="font-medium text-foreground">{stat.label}</p>
                      <p>{stat.count} records</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
        shifts={JSON.parse(localStorage.getItem("mywallet_wt_shifts_v2") || "[]")}
        shiftPayments={JSON.parse(localStorage.getItem("mywallet_wt_pay_v1") || "[]")}
        shiftRate={Number(localStorage.getItem("mywallet_wt_rate_v1") || "0") || 12.20}
        shiftTimeFormat={localStorage.getItem("mywallet_wt_timefmt_v1") || "12h"}
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
