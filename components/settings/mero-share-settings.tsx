"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useWalletData } from "@/contexts/wallet-data-context"
import { Shield, Lock, User, Key, Building2, Fingerprint, Eye, EyeOff, AlertCircle, Rocket, RefreshCw, Sparkles, Trash2, Loader2, Download, Banknote, History, CircleCheck, CircleX, ChevronLeft, ChevronRight, SlidersHorizontal, ListFilter, HeartPulse, CreditCard, MapPin, Hash, CalendarClock, Phone, FileText, ShieldCheck, Pencil } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { Check, ChevronDown, ChevronsUpDown, Plus } from "lucide-react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import { cn } from "@/lib/utils"
import { useCalendarSystem } from "@/hooks/use-calendar-system"
import { formatAppDateTime } from "@/lib/app-calendar"
import type { MeroShareAccount } from "@/types/wallet"
import { useDeveloperMode } from "@/hooks/use-developer-mode"
import { ImportVerificationModal } from "@/components/tools/portfolio/modals/import-verification-modal"

const emptyAccountForm: MeroShareAccount = {
    id: "",
    label: "",
    role: "primary",
    dpId: "",
    username: "",
    password: "",
    crn: "",
    pin: "",
    preferredKitta: 0,
    portfolioId: "",
}

const actionMeta: Record<string, { label: string; icon: LucideIcon }> = {
    apply: { label: "IPO Apply", icon: Banknote },
    "report-check": { label: "Allotment Check", icon: RefreshCw },
    login: { label: "Login Test", icon: Key },
    "sync-portfolio": { label: "Portfolio Sync", icon: Sparkles },
    "sync-history": { label: "History Sync", icon: Download },
    "application-report": { label: "Report Fetch", icon: History },
    "account-health": { label: "Account Health", icon: HeartPulse },
}

const sourceLabel = (source: string) => {
    switch (source) {
        case "live-apply": return "Live Apply"
        case "live-auto": return "Live Auto"
        case "settings-test": return "Settings Test"
        case "live-check": return "Live Check"
        case "settings-check": return "Settings Check"
        case "settings": return "Settings"
        case "ipo-center": return "IPO Center"
        case "portfolio-list": return "Portfolio List"
        default: return source
    }
}

const LOG_PAGE_SIZE = 5

const logTypeOptions: Array<{ value: string; label: string }> = [
    { value: "all", label: "All Types" },
    { value: "apply", label: "IPO Apply" },
    { value: "report-check", label: "Allotment Check" },
    { value: "login", label: "Login Test" },
    { value: "sync-portfolio", label: "Portfolio Sync" },
    { value: "sync-history", label: "History Sync" },
    { value: "application-report", label: "Report Fetch" },
    { value: "account-health", label: "Account Health" },
]

const logTimeOptions: Array<{ value: "all" | "today" | "7d" | "30d"; label: string }> = [
    { value: "all", label: "All" },
    { value: "today", label: "Today" },
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
]

const getMeroShareAccounts = (meroShare?: {
    accounts?: MeroShareAccount[]
    dpId?: string
    username?: string
    password?: string
    crn?: string
    pin?: string
}) => {
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

const getPrimaryAccount = (accounts: MeroShareAccount[]) =>
    accounts.find((account) => account.role === "primary") || accounts[0]

type PriceReviewQueueItem = {
    id?: string
    symbol: string
    type: string
    defaultPrice: number
    date?: string
    quantity?: number
    description?: string
    priceOptional?: boolean
}

export function MeroShareSettings() {
    const { userProfile, updateUserProfile, upcomingIPOs, syncMeroSharePortfolio, syncMeroShareTransactionHistory, portfolios, activePortfolioId, checkIPOAllotment, applyMeroShareIPO, deletePortfolio, portfolio, shareTransactions, addPortfolio, logMeroShareApplication, clearMeroShareApplicationLogs } = useWalletData()
    const calendarSystem = useCalendarSystem()
    const [showPassword, setShowPassword] = useState(false)
    const [dps, setDps] = useState<{ id: string, name: string, code: string }[]>([])
    const [isLoadingDps, setIsLoadingDps] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [isApplying, setIsApplying] = useState(false)
    const [isCheckingResult, setIsCheckingResult] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [isSyncingHistory, setIsSyncingHistory] = useState(false)
    const [isPriceReviewOpen, setIsPriceReviewOpen] = useState(false)
    const [priceReviewQueue, setPriceReviewQueue] = useState<PriceReviewQueueItem[]>([])
    const [reviewPrices, setReviewPrices] = useState<Record<string, string>>({})
    const [reviewTransactionPrices, setReviewTransactionPrices] = useState<Record<string, string>>({})
    const [priceReviewStats, setPriceReviewStats] = useState<{ fetchedCount: number; mergedCount: number; existingCount: number; needsPriceCount: number } | null>(null)
    const [isCreatingPortfolio, setIsCreatingPortfolio] = useState(false)
    const [isDpListOpen, setIsDpListOpen] = useState(false)
    const [selectedTestIpo, setSelectedTestIpo] = useState("")
    const [testMode, setTestMode] = useState<'apply' | 'result'>('apply')
    const [targetPortfolio, setTargetPortfolio] = useState(activePortfolioId || (portfolios.length > 0 ? portfolios[0].id : ""))
    const [customIpoName, setCustomIpoName] = useState("")
    const [isCustomMode, setIsCustomMode] = useState(false)
    const [showLiveBrowserForTest, setShowLiveBrowserForTest] = useState(false)
    const { isDeveloperMode } = useDeveloperMode()
    const [accounts, setAccounts] = useState<MeroShareAccount[]>(() => getMeroShareAccounts(userProfile?.meroShare))
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
    const [accountToDelete, setAccountToDelete] = useState<MeroShareAccount | null>(null)
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
    const [accountForm, setAccountForm] = useState<MeroShareAccount>(emptyAccountForm)
    const [showAdvancedFields, setShowAdvancedFields] = useState(false)
    const [showDisableDialog, setShowDisableDialog] = useState(false)
    const [isDisablingShare, setIsDisablingShare] = useState(false)
    const [confirmClearLogs, setConfirmClearLogs] = useState(false)
    const [isClearingLogs, setIsClearingLogs] = useState(false)

    const [formData, setFormData] = useState({
        dpId: getPrimaryAccount(getMeroShareAccounts(userProfile?.meroShare))?.dpId || "",
        username: getPrimaryAccount(getMeroShareAccounts(userProfile?.meroShare))?.username || "",
        password: getPrimaryAccount(getMeroShareAccounts(userProfile?.meroShare))?.password || "",
        crn: getPrimaryAccount(getMeroShareAccounts(userProfile?.meroShare))?.crn || "",
        pin: getPrimaryAccount(getMeroShareAccounts(userProfile?.meroShare))?.pin || "",
        shareFeaturesEnabled: userProfile?.meroShare?.shareFeaturesEnabled || false,
        shareNotificationsEnabled: userProfile?.meroShare?.shareNotificationsEnabled || false,
        shareCurrencyMode: userProfile?.meroShare?.shareCurrencyMode || "npr",
        applyMode: "on-demand",
        showLiveBrowser: false,
        browserProvider: userProfile?.meroShare?.browserProvider || "rest",
        isAutomatedEnabled: true
    })
    const openIpos = upcomingIPOs.filter(ipo => ipo.status === 'open')
    const allApplicationLogs = userProfile?.meroShare?.applicationLogs ?? []
    const [logTimeFilter, setLogTimeFilter] = useState<"all" | "today" | "7d" | "30d">("all")
    const [logTypeFilter, setLogTypeFilter] = useState("all")
    const [logPage, setLogPage] = useState(1)

    const filteredLogs = useMemo(() => {
        let list = allApplicationLogs
        if (logTimeFilter !== "all") {
            const now = Date.now()
            const cutoff = logTimeFilter === "today"
                ? new Date().setHours(0, 0, 0, 0)
                : now - (logTimeFilter === "7d" ? 7 : 30) * 86_400_000
            list = list.filter((log) => new Date(log.createdAt).getTime() >= cutoff)
        }
        if (logTypeFilter !== "all") {
            list = list.filter((log) => log.action === logTypeFilter)
        }
        return list
    }, [allApplicationLogs, logTimeFilter, logTypeFilter])

    const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / LOG_PAGE_SIZE))
    const logPageStart = (logPage - 1) * LOG_PAGE_SIZE
    const loadedLogs = filteredLogs.slice(logPageStart, logPageStart + LOG_PAGE_SIZE)

    useEffect(() => {
        setLogPage(1)
    }, [logTimeFilter, logTypeFilter])

    const goToLogPage = (page: number) => {
        if (page < 1 || page > totalLogPages) return
        setLogPage(page)
    }

    const logPageNumbers = useMemo(() => {
        const pages: Array<number | "ellipsis"> = []
        if (totalLogPages <= 7) {
            for (let i = 1; i <= totalLogPages; i++) pages.push(i)
            return pages
        }
        pages.push(1)
        if (logPage > 3) pages.push("ellipsis")
        const start = Math.max(2, logPage - 1)
        const end = Math.min(totalLogPages - 1, logPage + 1)
        for (let i = start; i <= end; i++) pages.push(i)
        if (logPage < totalLogPages - 2) pages.push("ellipsis")
        pages.push(totalLogPages)
        return pages
    }, [totalLogPages, logPage])

    const formatRelativeTime = (iso: string) => {
        const diff = Date.now() - new Date(iso).getTime()
        if (diff < 60_000) return "just now"
        if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
        if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
        if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`
        return formatAppDateTime(iso, calendarSystem)
    }

    const [accountHealth, setAccountHealth] = useState<Record<string, any> | null>(null)
    const [healthError, setHealthError] = useState<string | null>(null)
    const [isHealthLoading, setIsHealthLoading] = useState(false)
    const [showHealthModal, setShowHealthModal] = useState(false)
    const [healthAccount, setHealthAccount] = useState<MeroShareAccount | null>(null)

    const loadAccountHealth = async (account?: MeroShareAccount) => {
        const source = account || null
        const credentials = source
            ? { dpId: source.dpId, username: source.username, password: source.password }
            : { dpId: formData.dpId, username: formData.username, password: formData.password }
        if (!credentials.dpId || !credentials.username || !credentials.password) {
            setHealthError("Save your MeroShare credentials to check account health.")
            return
        }
        setIsHealthLoading(true)
        setHealthError(null)
        try {
            const response = await fetch("/api/meroshare/account-health", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    credentials,
                    options: { browserProvider: formData.browserProvider },
                }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || "Failed to load account health")
            setAccountHealth(data.health)
            void logMeroShareApplication({
                action: "account-health",
                status: "success",
                message: `Account health refreshed for ${source?.label || source?.username || "the primary account"}.`,
                source: "settings",
            })
        } catch (err: any) {
            setHealthError(err?.message || "Failed to load account health")
            void logMeroShareApplication({
                action: "account-health",
                status: "failed",
                message: err?.message || "Failed to load account health.",
                source: "settings",
            })
        } finally {
            setIsHealthLoading(false)
        }
    }

    const openHealthModal = (account?: MeroShareAccount) => {
        const target = account || null
        const credentials = target
            ? { dpId: target.dpId, username: target.username, password: target.password }
            : { dpId: formData.dpId, username: formData.username, password: formData.password }
        if (!credentials.dpId || !credentials.username || !credentials.password) {
            toast.error("MeroShare credentials missing", {
                description: "Save DP, username and password above first.",
            })
            return
        }
        setHealthAccount(target)
        setAccountHealth(null)
        setHealthError(null)
        setShowHealthModal(true)
        void loadAccountHealth(target || undefined)
    }

    const parseMeroShareDate = (value: string) => new Date(String(value).replace(" ", "T"))
    const daysUntil = (value?: string) => {
        if (!value) return null
        const time = parseMeroShareDate(value).getTime()
        if (!Number.isFinite(time)) return null
        return Math.ceil((time - Date.now()) / 86_400_000)
    }
    const formatHealthDate = (value?: string) => {
        if (!value) return ""
        const date = parseMeroShareDate(value)
        return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : String(value).slice(0, 10)
    }

    const dematDays = daysUntil(accountHealth?.dematExpiryDate)
    const passwordDays = daysUntil(accountHealth?.passwordExpiryDate)
    const isAccountSuspended = Number(accountHealth?.suspensionFlag) === 1

    const healthAlerts: Array<{ tone: "danger" | "warning"; text: string }> = []
    if (isAccountSuspended) healthAlerts.push({ tone: "danger", text: "Your MeroShare account is suspended. Contact your broker to resolve it." })
    if (dematDays !== null && dematDays < 0) healthAlerts.push({ tone: "danger", text: `Your demat expired on ${formatHealthDate(accountHealth?.dematExpiryDate)}. Renew it at MeroShare.` })
    else if (dematDays !== null && dematDays <= 30) healthAlerts.push({ tone: "warning", text: `Your demat expires in ${dematDays} day${dematDays === 1 ? "" : "s"}.` })
    if (passwordDays !== null && passwordDays < 0) healthAlerts.push({ tone: "danger", text: "Your MeroShare password has expired. Change it at MeroShare." })
    else if (passwordDays !== null && passwordDays <= 15) healthAlerts.push({ tone: "warning", text: `Your MeroShare password expires in ${passwordDays} day${passwordDays === 1 ? "" : "s"}.` })
    const loginRequiredFields: Array<keyof typeof formData> = ["dpId", "username", "password"]
    const applyRequiredFields: Array<keyof typeof formData> = ["crn", "pin"]
    const missingLoginFields = loginRequiredFields.filter((key) => {
        const value = formData[key]
        return typeof value !== "string" || value.trim().length === 0
    })
    const missingApplyFields = applyRequiredFields.filter((key) => {
        const value = formData[key]
        return typeof value !== "string" || value.trim().length === 0
    })
    const isLoginReady = missingLoginFields.length === 0
    const isApplyReady = isLoginReady && missingApplyFields.length === 0
    const isAutomationReady = formData.shareFeaturesEnabled && isLoginReady
    const savedMeroShare = userProfile?.meroShare
    const selectedDp = dps.find((dp) => dp.id === accountForm.dpId || dp.code === accountForm.dpId)
    useEffect(() => {
        const fetchDps = async () => {
            setIsLoadingDps(true)
            try {
                const response = await fetch("/data/dps.json")
                if (response.ok) {
                    const data = await response.json()
                    setDps(data)
                }
            } catch {
                console.warn("Failed to load DPS list")
            } finally {
                setIsLoadingDps(false)
            }
        }
        fetchDps()
    }, [])

    useEffect(() => {
        const nextAccounts = getMeroShareAccounts(userProfile?.meroShare)
        const primaryAccount = getPrimaryAccount(nextAccounts)
        setAccounts(nextAccounts)
        setFormData({
            dpId: primaryAccount?.dpId || "",
            username: primaryAccount?.username || "",
            password: primaryAccount?.password || "",
            crn: primaryAccount?.crn || "",
            pin: primaryAccount?.pin || "",
            shareFeaturesEnabled: userProfile?.meroShare?.shareFeaturesEnabled || false,
            shareNotificationsEnabled: userProfile?.meroShare?.shareNotificationsEnabled || false,
            shareCurrencyMode: userProfile?.meroShare?.shareCurrencyMode || "npr",
            applyMode: "on-demand",
            showLiveBrowser: false,
            browserProvider: userProfile?.meroShare?.browserProvider || "rest",
            isAutomatedEnabled: true,
        })
    }, [userProfile?.meroShare])

    const applyPrimaryAccountToForm = (nextAccounts: MeroShareAccount[]) => {
        const primaryAccount = getPrimaryAccount(nextAccounts)
        setFormData(prev => ({
            ...prev,
            dpId: primaryAccount?.dpId || "",
            username: primaryAccount?.username || "",
            password: primaryAccount?.password || "",
            crn: primaryAccount?.crn || "",
            pin: primaryAccount?.pin || "",
        }))
    }

    const persistMeroShareSettings = (nextForm: typeof formData, nextAccounts: MeroShareAccount[]) => {
        const primaryAccount = getPrimaryAccount(nextAccounts)
        updateUserProfile({
            meroShare: {
                ...(userProfile?.meroShare || {}),
                ...nextForm,
                shareFeaturesEnabled: nextForm.shareFeaturesEnabled,
                applyMode: "on-demand",
                showLiveBrowser: false,
                browserProvider: nextForm.browserProvider,
                isAutomatedEnabled: true,
                dpId: primaryAccount?.dpId || "",
                username: primaryAccount?.username || "",
                password: primaryAccount?.password || "",
                crn: primaryAccount?.crn || "",
                pin: primaryAccount?.pin || "",
                accounts: nextAccounts,
            }
        })
    }

    const updateAccounts = (nextAccounts: MeroShareAccount[]) => {
        const primaryIndex = nextAccounts.findIndex(account => account.role === "primary")
        const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0
        const accountsWithPrimary = nextAccounts.map((account, index) => ({
            ...account,
            role: index === resolvedPrimaryIndex ? "primary" as const : "secondary" as const,
        }))

        setAccounts(accountsWithPrimary)
        applyPrimaryAccountToForm(accountsWithPrimary)
        const primaryAccount = getPrimaryAccount(accountsWithPrimary)
        persistMeroShareSettings({
            ...formData,
            dpId: primaryAccount?.dpId || "",
            username: primaryAccount?.username || "",
            password: primaryAccount?.password || "",
            crn: primaryAccount?.crn || "",
            pin: primaryAccount?.pin || "",
        }, accountsWithPrimary)
    }

    const openAddAccountDialog = () => {
        setEditingAccountId(null)
        setIsDpListOpen(false)
        setAccountForm({
            ...emptyAccountForm,
            id: `mero_${Date.now()}`,
            role: accounts.length === 0 ? "primary" : "secondary",
        })
        setIsAccountDialogOpen(true)
    }

    const openEditAccountDialog = (account: MeroShareAccount) => {
        setEditingAccountId(account.id)
        setIsDpListOpen(false)
        setAccountForm({ ...account })
        setIsAccountDialogOpen(true)
    }

    const saveAccount = () => {
        if (!accountForm.dpId || !accountForm.username || !accountForm.password) {
            toast.error("Incomplete account", {
                description: "Fill DP, username, and password before saving this account."
            })
            return
        }

        const nextAccount = {
            ...accountForm,
            label: accountForm.label.trim() || (accountForm.role === "primary" ? "Primary account" : "Secondary account"),
            pin: (accountForm.pin || "").replace(/\D/g, "").slice(0, 4),
        }

        let nextAccounts = editingAccountId
            ? accounts.map(account => account.id === editingAccountId ? nextAccount : account)
            : [...accounts, nextAccount]

        if (nextAccount.role === "primary") {
            nextAccounts = nextAccounts.map(account => ({
                ...account,
                role: account.id === nextAccount.id ? "primary" : "secondary",
            }))
        }

        updateAccounts(nextAccounts)
        setIsAccountDialogOpen(false)
    }

    const deleteAccount = (accountId: string) => {
        const nextAccounts = accounts.filter(account => account.id !== accountId)
        updateAccounts(nextAccounts)
    }

    const setAccountRole = (accountId: string, role: "primary" | "secondary") => {
        const nextAccounts = role === "primary"
            ? accounts.map(account => ({
                ...account,
                role: account.id === accountId ? "primary" as const : "secondary" as const,
            }))
            : accounts.map((account) => {
                if (account.id === accountId) return { ...account, role: "secondary" as const }
                if (account.role !== "primary") return { ...account, role: "primary" as const }
                return account
            })
        updateAccounts(nextAccounts)
    }

    const testConnection = async () => {
        if (!formData.dpId || !formData.username || !formData.password) {
            toast.error("Incomplete Credentials", {
                description: "Please enter DP, Username and Password to test."
            })
            return
        }

        setIsTesting(true)
        const promise = fetch('/api/meroshare/test-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                credentials: formData,
                options: { showBrowser: false, browserProvider: formData.browserProvider }
            })
        }).then(async (res) => {
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Login Failed")
            return data
        })

        toast.promise(promise, {
            loading: "Testing login credentials...",
            success: (data: any) => {
                setIsTesting(false)
                void logMeroShareApplication({
                    action: "login",
                    status: "success",
                    message: data.message || "Login test passed.",
                    source: "settings-test",
                })
                return data.message || "Connection Success!"
            },
            error: (err: any) => {
                setIsTesting(false)
                void logMeroShareApplication({
                    action: "login",
                    status: "failed",
                    message: err.message || "Login test failed.",
                    source: "settings-test",
                })
                return err.message
            }
        })
    }

    const toggleShareFeatures = (enabled: boolean) => {
        if (enabled) {
            const nextForm = {
                ...formData,
                shareFeaturesEnabled: true,
                shareNotificationsEnabled: true,
                isAutomatedEnabled: true,
            }
            setFormData(nextForm)
            persistMeroShareSettings(nextForm, accounts)
            toast.success("Share features enabled", { description: "MeroShare options are now available." })
        } else {
            setShowDisableDialog(true)
        }
    }

    const updateShareCurrencyMode = (mode: "npr" | "auto") => {
        const nextForm = {
            ...formData,
            shareCurrencyMode: mode,
        }
        setFormData(nextForm)
        persistMeroShareSettings(nextForm, accounts)
    }

    const updateBrowserProvider = (value: "api" | "rest" | "auto" | "browserless" | "local") => {
        const nextForm = {
            ...formData,
            browserProvider: value,
        }
        setFormData(nextForm)
        persistMeroShareSettings(nextForm, accounts)
    }

    const updateField = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [key]: value,
        }))
    }

    const testApplication = async () => {
        const ipoToTest = isCustomMode ? customIpoName : selectedTestIpo
        if (!ipoToTest) {
            toast.error("Select or enter an IPO", { description: "Please provide an IPO name to test the automation." })
            return
        }

        if (testMode === 'result') {
            setIsCheckingResult(true)
            const promise = checkIPOAllotment(formData, ipoToTest, "settings-check")
            toast.promise(promise, {
                loading: `Testing allotment check for ${ipoToTest}...`,
                success: (data) => {
                    setIsCheckingResult(false)
                    return data.isAllotted ? `Allotted ${data.allottedQuantity} units!` : `Not Allotted: ${data.status}`
                },
                error: (err) => {
                    setIsCheckingResult(false)
                    return err.message
                }
            })
            return
        }

        setIsApplying(true)
        const promise = applyMeroShareIPO(
            formData,
            ipoToTest,
            getPrimaryAccount(accounts)?.preferredKitta || 0,
            "settings-test",
            { showBrowser: false, browserProvider: formData.browserProvider as "api" | "rest" | "auto" | "browserless" | "local" }
        )

        toast.promise(promise, {
            loading: `Testing automation for ${ipoToTest}...`,
            success: (data: any) => {
                setIsApplying(false)
                if (data?.alreadyApplied) {
                    return data.message || "Already applied earlier. No new apply action was submitted."
                }
                return data.message || "Automation Success!"
            },
            error: (err: any) => {
                setIsApplying(false)
                return err.message
            }
        })
    }

    const resolveSyncPortfolioId = () => getPrimaryAccount(accounts)?.portfolioId || targetPortfolio

    const handleSyncPortfolio = async () => {
        if (!formData.dpId || !formData.username || !formData.password) {
            toast.error("Credentials missing", { description: "Save your credentials first to sync." })
            return
        }

        setIsSyncing(true)
        const promise = syncMeroSharePortfolio(formData, resolveSyncPortfolioId())

        toast.promise(promise, {
            loading: "Logging into Mero Share and fetching portfolio...",
            success: (data: { updatedCount: number; skippedCount: number }) => {
                setIsSyncing(false)
                return `Prices updated for ${data.updatedCount} holding${data.updatedCount === 1 ? "" : "s"}; ${data.skippedCount} scrip${data.skippedCount === 1 ? "" : "s"} skipped (no transaction history).`
            },
            error: (err) => {
                setIsSyncing(false)
                return err.message || "Failed to sync portfolio."
            }
        })
    }

    const clearPriceReview = () => {
        setIsPriceReviewOpen(false)
        setPriceReviewQueue([])
        setReviewPrices({})
        setReviewTransactionPrices({})
        setPriceReviewStats(null)
    }

    const handleSyncTransactionHistory = async () => {
        if (!formData.dpId || !formData.username || !formData.password) {
            toast.error("Credentials missing", { description: "Save your credentials first to sync transaction history." })
            return
        }

        setIsSyncingHistory(true)
        const loadingToast = toast.loading("Fetching MeroShare transaction history...")
        try {
            const result = await syncMeroShareTransactionHistory(formData, resolveSyncPortfolioId())

            if (result.requiresReview) {
                const queue: PriceReviewQueueItem[] = []
                const initialPrices: Record<string, string> = {}
                const initialTransactionPrices: Record<string, string> = {}
                const queuedSymbols = new Set<string>()

                for (const tx of result.newTransactions) {
                    const isIpo = tx.type === "ipo"
                    const isSell = tx.type === "sell"
                    if (!isIpo && !isSell && tx.type !== "buy") continue

                    if (!queuedSymbols.has(tx.symbol)) {
                        queuedSymbols.add(tx.symbol)
                        queue.push({
                            id: tx.symbol,
                            symbol: tx.symbol,
                            defaultPrice: isIpo ? tx.price : 0,
                            type: isIpo ? "IPO" : isSell ? "Sell" : "Buy",
                        })
                        initialPrices[tx.symbol] = isIpo && tx.price > 0 ? String(tx.price) : ""
                    }
                    queue.push({
                        id: tx.rowKey,
                        symbol: tx.symbol,
                        defaultPrice: isIpo ? tx.price : 0,
                        type: isIpo ? "IPO" : isSell ? "Sell" : "Buy",
                        priceOptional: !isIpo,
                        date: tx.date,
                        quantity: tx.quantity,
                        description: tx.description,
                    })
                    initialTransactionPrices[tx.rowKey] = isIpo && tx.price > 0 ? String(tx.price) : ""
                }

                setPriceReviewQueue(queue)
                setReviewPrices(initialPrices)
                setReviewTransactionPrices(initialTransactionPrices)
                setPriceReviewStats({
                    fetchedCount: result.fetchedCount,
                    mergedCount: result.mergedCount,
                    existingCount: result.existingCount,
                    needsPriceCount: result.needsPriceCount,
                })
                setIsPriceReviewOpen(true)
                toast.success(`Found ${result.newTransactions.length} new transaction${result.newTransactions.length === 1 ? "" : "s"} to verify`, {
                    description: result.mergedCount > 0
                        ? `${result.mergedCount} duplicate row${result.mergedCount === 1 ? "" : "s"} merged, ${result.existingCount} already exist. Each buy/sell has its own price input — IPO buys are pre-filled with face value.`
                        : "Each buy/sell has its own price input — IPO buys are pre-filled with face value.",
                })
            } else if (result.importedCount > 0) {
                toast.success(`History synced. Imported ${result.importedCount}, skipped ${result.skippedCount} duplicate${result.skippedCount === 1 ? "" : "s"}.`)
            } else {
                toast.success(`History synced. No new transactions (${result.skippedCount} duplicate${result.skippedCount === 1 ? "" : "s"}).`)
            }
        } catch (err: any) {
            toast.error(err?.message || "Failed to sync transaction history.")
        } finally {
            toast.dismiss(loadingToast)
            setIsSyncingHistory(false)
        }
    }

    const confirmPriceReview = async () => {
        setIsSyncingHistory(true)
        const loadingToast = toast.loading("Saving transactions with cost prices...")
        try {
            const resolved: Record<string, number> = {}
            Object.entries(reviewPrices).forEach(([symbol, price]) => {
                resolved[symbol] = parseFloat(price) || 0
            })
            Object.entries(reviewTransactionPrices).forEach(([id, price]) => {
                const parsed = parseFloat(price)
                if (Number.isFinite(parsed) && parsed > 0) {
                    resolved[id] = parsed
                }
            })

            const result = await syncMeroShareTransactionHistory(formData, resolveSyncPortfolioId(), resolved)
            clearPriceReview()
            toast.success(`Imported ${result.importedCount} transaction${result.importedCount === 1 ? "" : "s"} with cost prices.`)
        } catch (err: any) {
            toast.error(err?.message || "Failed to import transactions with prices.")
        } finally {
            toast.dismiss(loadingToast)
            setIsSyncingHistory(false)
        }
    }

    const handleCreatePortfolio = async () => {
        setIsCreatingPortfolio(true)
        try {
            const primaryAccount = getPrimaryAccount(accounts)
            const newPortfolio = await addPortfolio(
                primaryAccount?.label || "My MeroShare Portfolio",
                "Auto-created for MeroShare sync",
            )
            setTargetPortfolio(newPortfolio.id)
            if (primaryAccount) {
                updateAccounts(accounts.map(account =>
                    account.id === primaryAccount.id ? { ...account, portfolioId: newPortfolio.id } : account
                ))
            }
            toast.success("Portfolio created", {
                description: `${newPortfolio.name} is now linked to your ${primaryAccount?.label || "primary"} account.`
            })
        } catch {
            toast.error("Failed to create portfolio")
        } finally {
            setIsCreatingPortfolio(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="space-y-1">
                            <Label className="text-sm font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                Enable Share Features
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Keep this off if you do not use portfolio shares or IPO tools.
                            </p>
                        </div>
                        <Switch
                            checked={formData.shareFeaturesEnabled}
                            onCheckedChange={toggleShareFeatures}
                        />
                    </div>

                    {/* legacy inline credential fields removed; accounts are edited in the modal
                    <div className="hidden">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Building2 className="w-3 h-3" /> Depository Participant (DP)
                            </Label>
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={open}
                                        className="w-full h-11 justify-between bg-background/50 font-normal border-input"
                                    >
                                        <span className="truncate">
                                            {selectedDp
                                                ? `${selectedDp.name} (${selectedDp.code})`
                                                : formData.dpId
                                                ? `Selected DP: ${formData.dpId}`
                                                : "Select your DP..."}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command className="w-full">
                                        <CommandInput placeholder="Search bank or DP..." className="h-9" />
                                        <CommandList className="max-h-[300px]">
                                            <CommandEmpty>No DP found.</CommandEmpty>
                                            <CommandGroup>
                                                {dps.map((dp) => (
                                                    <CommandItem
                                                        key={dp.id}
                                                        value={`${dp.name} ${dp.id} ${dp.code}`}
                                                        onSelect={() => {
                                                            updateField("dpId", dp.id)
                                                            setOpen(false)
                                                        }}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{dp.name}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                MeroShare code: {dp.id}
                                                                {dp.code && dp.code !== dp.id ? ` · Ref: ${dp.code}` : ""}
                                                            </span>
                                                        </div>
                                                        <Check
                                                            className={cn(
                                                                "h-4 w-4",
                                                                formData.dpId === dp.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <User className="w-3 h-3" /> Username
                            </Label>
                            <Input
                                placeholder="Enter Mero Share username"
                                value={formData.username}
                                onChange={(e) => updateField("username", e.target.value)}
                                className="h-11 bg-background/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Lock className="w-3 h-3" /> Password
                            </Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter password"
                                    value={formData.password}
                                    onChange={(e) => updateField("password", e.target.value)}
                                    className="h-11 pr-10 bg-background/50"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1 h-9 w-9 text-muted-foreground"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2 border-l-2 border-primary/20 pl-4 md:col-start-1">
                            <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Key className="w-3 h-3" /> CRN Number
                            </Label>
                            <Input
                                placeholder="Enter CRN number"
                                value={formData.crn}
                                onChange={(e) => updateField("crn", e.target.value)}
                                className="h-11 border-primary/20 bg-primary/5"
                            />
                        </div>

                        <div className="space-y-2 border-l-2 border-primary/20 pl-4">
                            <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Transaction PIN
                            </Label>
                            <Input
                                type="password"
                                maxLength={4}
                                placeholder="4-digit PIN"
                                value={formData.pin}
                                onChange={(e) => updateField("pin", e.target.value.replace(/\D/g, ''))}
                                className="h-11 border-primary/20 bg-primary/5"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Rocket className="w-3 h-3" /> Preferred Kitta (Optional)
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                placeholder="0 = Auto-detect minimum"
                                value={formData.preferredKitta || ""}
                                onChange={(e) => updateField("preferredKitta", parseInt(e.target.value) || 0)}
                                className="h-11 bg-background/50"
                            />
                            <p className="text-[10px] text-muted-foreground italic">
                                Leave at 0 to automatically use the minimum quantity from each IPO. Set a specific number (e.g., 20, 50) to always apply for that amount.
                            </p>
                        </div>
                    </div>
                    */}
            </div>

            {formData.shareFeaturesEnabled && (
                <Card className="border-primary/20">
                    <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-0.5">
                                <CardTitle className="text-base">MeroShare Accounts</CardTitle>
                                <CardDescription className="text-xs">Manage DP, username and password for each linked account</CardDescription>
                            </div>
                            <div className="flex w-full flex-row gap-2 sm:w-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={testConnection}
                                    disabled={isTesting || !isLoginReady}
                                    className="flex-1 sm:flex-none border-primary/20 hover:bg-primary/5"
                                >
                                    {isTesting ? "Testing..." : "Test Connection"}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={openAddAccountDialog}
                                    className="flex-1 sm:flex-none gap-1.5"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Account
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {accounts.length === 0 ? (
                            <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-center">
                                <p className="text-sm font-semibold">No MeroShare account added</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Add an account to enable login testing, portfolio sync, and IPO apply actions.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {accounts.map((account) => {
                                    const dp = dps.find(item => item.id === account.dpId || item.code === account.dpId)
                                    const isPrimary = account.role === "primary"

                                    return (
                                        <div key={account.id} className="rounded-xl border bg-background/60 p-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-semibold">{account.label || account.username}</p>
                                                        <Badge variant={isPrimary ? "default" : "secondary"}>
                                                            {isPrimary ? "Primary" : "Secondary"}
                                                        </Badge>
                                                    </div>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {dp?.name || `DP ${account.dpId}`} | {account.username}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {account.crn && account.pin
                                                            ? "Ready for IPO apply and result checks"
                                                            : "Ready for result checks; add CRN and PIN to apply"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {account.portfolioId
                                                            ? `Linked portfolio: ${portfolios.find(p => p.id === account.portfolioId)?.name || "—"}`
                                                            : "No linked portfolio — data syncs into the selected portfolio"}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {!isPrimary && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setAccountRole(account.id, "primary")}
                                                        >
                                                            Make Primary
                                                        </Button>
                                                    )}
                                                    {isPrimary && accounts.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setAccountRole(account.id, "secondary")}
                                                        >
                                                            Make Secondary
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5"
                                                        onClick={() => openHealthModal(account)}
                                                    >
                                                        <HeartPulse className="w-3.5 h-3.5 text-primary" />
                                                        Check Health
                                                    </Button>
                                                    <Button type="button" variant="outline" size="icon" title="Edit" onClick={() => openEditAccountDialog(account)}>
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button type="button" variant="destructive" size="icon" title="Remove" onClick={() => setAccountToDelete(account)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {formData.shareFeaturesEnabled && (
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1 space-y-0.5">
                            <Label className="text-sm font-bold flex items-center gap-2">
                                Share Currency
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {(formData.shareCurrencyMode || "npr") === "auto"
                                    ? userProfile?.currency && userProfile.currency !== "NPR"
                                        ? `Portfolio amounts display in ${userProfile.currency}.`
                                        : "Set a non-NPR profile currency to see converted amounts."
                                    : "Shows all share amounts in NPR."}
                            </p>
                        </div>
                        <Select
                            value={formData.shareCurrencyMode || "npr"}
                            onValueChange={(value) => updateShareCurrencyMode(value as "npr" | "auto")}
                        >
                            <SelectTrigger className="w-[170px] h-9 bg-background/50">
                                <SelectValue placeholder="Select display currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="npr">NPR (Default)</SelectItem>
                                <SelectItem value="auto">
                                    {userProfile?.currency && userProfile.currency !== "NPR"
                                        ? `Auto (${userProfile.currency})`
                                        : "Auto"}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            <AlertDialog open={accountToDelete !== null} onOpenChange={(open) => { if (!open) setAccountToDelete(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove MeroShare account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {accountToDelete
                                ? `"${accountToDelete.label || accountToDelete.username}" will be removed from your linked accounts. You can add it again later.`
                                : ""}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (accountToDelete) deleteAccount(accountToDelete.id)
                                setAccountToDelete(null)
                            }}
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-left">{editingAccountId ? "Edit MeroShare Account" : "Add MeroShare Account"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="mero-account-label">Account Label</Label>
                            <Input
                                id="mero-account-label"
                                placeholder="Primary account"
                                value={accountForm.label}
                                onChange={(e) => setAccountForm(prev => ({ ...prev, label: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Building2 className="w-3 h-3" /> Depository Participant (DP)
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={isDpListOpen}
                                className="w-full justify-between font-normal"
                                onClick={() => setIsDpListOpen((prev) => !prev)}
                            >
                                <span className="truncate">
                                    {selectedDp
                                        ? `${selectedDp.name} (${selectedDp.code})`
                                        : accountForm.dpId
                                            ? `Selected DP: ${accountForm.dpId}`
                                            : "Select your DP..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            {isDpListOpen && (
                                <div className="rounded-md border bg-background">
                                    <Command className="w-full">
                                        <CommandInput placeholder="Search bank or DP..." className="h-9" />
                                        <CommandList className="max-h-[240px] overflow-y-auto">
                                            <CommandEmpty>No DP found.</CommandEmpty>
                                            <CommandGroup>
                                                {dps.map((dp) => (
                                                    <CommandItem
                                                        key={dp.id}
                                                        value={`${dp.name} ${dp.id} ${dp.code}`}
                                                        onSelect={() => {
                                                            setAccountForm(prev => ({ ...prev, dpId: dp.code }))
                                                            setIsDpListOpen(false)
                                                        }}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{dp.name}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                Code: {dp.code}
                                                            </span>
                                                        </div>
                                                        <Check
                                                            className={cn(
                                                                "h-4 w-4",
                                                                accountForm.dpId === dp.code ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="mero-account-username" className="flex items-center gap-2">
                                    <User className="w-3 h-3" /> Username
                                </Label>
                                <Input
                                    id="mero-account-username"
                                    value={accountForm.username}
                                    onChange={(e) => setAccountForm(prev => ({ ...prev, username: e.target.value }))}
                                    autoComplete="username"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mero-account-password" className="flex items-center gap-2">
                                    <Lock className="w-3 h-3" /> Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="mero-account-password"
                                        type={showPassword ? "text" : "password"}
                                        value={accountForm.password || ""}
                                        onChange={(e) => setAccountForm(prev => ({ ...prev, password: e.target.value }))}
                                        className="pr-10"
                                        autoComplete="current-password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1 h-8 w-8 text-muted-foreground"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mero-account-crn" className="flex items-center gap-2">
                                    <Key className="w-3 h-3" /> CRN Number <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                                </Label>
                                <Input
                                    id="mero-account-crn"
                                    value={accountForm.crn || ""}
                                    onChange={(e) => setAccountForm(prev => ({ ...prev, crn: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mero-account-pin" className="flex items-center gap-2">
                                    <Shield className="w-3 h-3" /> Transaction PIN <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                                </Label>
                                <Input
                                    id="mero-account-pin"
                                    type="password"
                                    maxLength={4}
                                    value={accountForm.pin || ""}
                                    onChange={(e) => setAccountForm(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, "") }))}
                                    inputMode="numeric"
                                />
                            </div>
                        </div>

                        <Collapsible open={showAdvancedFields} onOpenChange={setShowAdvancedFields}>
                            <div className="rounded-lg border overflow-hidden">
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                                        <span className="text-sm font-semibold flex items-center gap-2">
                                            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                                            Advanced Fields
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showAdvancedFields ? "rotate-180" : ""}`} />
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="px-4 pb-4 space-y-4">
                                        <div className="space-y-2">
                                            <Label>Account Type</Label>
                                            <Select
                                                value={accountForm.role}
                                                onValueChange={(value) => setAccountForm(prev => ({ ...prev, role: value as "primary" | "secondary" }))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="primary">Primary</SelectItem>
                                                    <SelectItem value="secondary">Secondary</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="mero-account-kitta" className="flex items-center gap-2">
                                                <Rocket className="w-3 h-3" /> Preferred Kitta <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                                            </Label>
                                            <Input
                                                id="mero-account-kitta"
                                                type="number"
                                                min="0"
                                                placeholder="0 = Auto-detect minimum"
                                                value={accountForm.preferredKitta || ""}
                                                onChange={(e) => setAccountForm(prev => ({ ...prev, preferredKitta: parseInt(e.target.value) || 0 }))}
                                            />
                                            <p className="text-[10px] text-muted-foreground italic">
                                                Leave at 0 to automatically use the minimum quantity from each IPO. Set a specific number (e.g., 20, 50) to always apply for that amount from this account.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="mero-account-portfolio" className="flex items-center gap-2">
                                                <Sparkles className="w-3 h-3" /> Linked Portfolio <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                                            </Label>
                                            <Select
                                                value={accountForm.portfolioId || "__none__"}
                                                onValueChange={(value) => setAccountForm(prev => ({ ...prev, portfolioId: value === "__none__" ? "" : value }))}
                                            >
                                                <SelectTrigger id="mero-account-portfolio" className="w-full">
                                                    <SelectValue placeholder="Not linked — pick during sync" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">Not linked</SelectItem>
                                                    {portfolios.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[10px] text-muted-foreground italic">
                                                MeroShare holdings and history for this account will sync into this portfolio.
                                            </p>
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </div>
                        </Collapsible>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAccountDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={saveAccount}>
                            Save Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {formData.shareFeaturesEnabled && (
            <>
            <Card className="border-info/20 bg-info/5">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-info/20 rounded-lg flex items-center justify-center text-info">
                                <RefreshCw className={cn("w-4 h-4", isSyncingHistory && "animate-spin")} />
                            </div>
                            <div className="space-y-0.5">
                                <CardTitle className="text-base">MeroShare Sync</CardTitle>
                                <CardDescription className="text-xs text-info/60">Import transaction history from MeroShare</CardDescription>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {portfolios.length === 0 ? (
                                <Button
                                    onClick={handleCreatePortfolio}
                                    disabled={isCreatingPortfolio}
                                    className="bg-info hover:bg-info/90 text-white rounded-xl font-bold h-9 shrink-0 border-0"
                                >
                                    {isCreatingPortfolio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {isCreatingPortfolio ? "Creating..." : "Create Portfolio"}
                                </Button>
                            ) : (
                                <>
                                    {!getPrimaryAccount(accounts)?.portfolioId && portfolios.length > 1 && (
                                        <Select value={targetPortfolio} onValueChange={setTargetPortfolio}>
                                            <SelectTrigger className="h-9 bg-background/50 border-info/20">
                                                <SelectValue placeholder="Select Portfolio" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {portfolios.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <Button
                                        variant="outline"
                                        onClick={handleSyncTransactionHistory}
                                        disabled={isSyncingHistory || !resolveSyncPortfolioId()}
                                        className="border-info/20 rounded-xl font-bold h-9 shrink-0"
                                    >
                                        <RefreshCw className={cn("w-4 h-4", isSyncingHistory && "animate-spin")} />
                                        {isSyncingHistory ? "Syncing..." : "Sync History"}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5 opacity-70">
                        <AlertCircle className="w-3 h-3 text-info" />
                        {portfolios.length === 0
                            ? "Create a portfolio first — MeroShare data will be imported into it."
                            : getPrimaryAccount(accounts)?.portfolioId
                                ? `Syncing into ${portfolios.find(p => p.id === resolveSyncPortfolioId())?.name || "linked portfolio"} (${getPrimaryAccount(accounts)?.label || "primary account"}).`
                                : portfolios.length === 1
                                    ? `Syncing into ${portfolios[0].name}.`
                                    : "Pick a portfolio to sync into, or link one to your account in the account dialog."}
                    </p>
                </CardHeader>
            </Card>

            {isDeveloperMode && (
            <Card className={formData.browserProvider === "rest" ? "border-primary/40" : "border-dashed border-primary/30 bg-primary/5"}>
                <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${formData.browserProvider === "rest" ? "bg-green-500/20 text-green-500" : "bg-primary/20 text-primary"}`}>
                                <Fingerprint className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                                <CardTitle className="text-base">Automation Runtime</CardTitle>
                                <CardDescription className="text-xs">How MeroShare actions run on your account</CardDescription>
                            </div>
                        </div>
                        <div className="w-full sm:w-auto">
                            <Select
                                value={formData.browserProvider}
                                onValueChange={(value) => updateBrowserProvider(value as "api" | "rest" | "auto" | "browserless" | "local")}
                            >
                                <SelectTrigger className="w-full sm:w-[210px] h-9 bg-background/70">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="rest">Direct REST</SelectItem>
                                    <SelectItem value="api">Self Hosted API</SelectItem>
                                    <SelectItem value="auto">Auto (Browserless → Local)</SelectItem>
                                    <SelectItem value="browserless">Browserless API</SelectItem>
                                    <SelectItem value="local">Local Chrome</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
            </Card>
            )}

            <Dialog open={showHealthModal} onOpenChange={setShowHealthModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                            <HeartPulse className="h-4 w-4 text-primary" /> Account Health
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Demat, password and bank details straight from MeroShare
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        {isHealthLoading && !accountHealth ? (
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground py-6 justify-center">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Checking your MeroShare account...
                            </div>
                        ) : healthError && !accountHealth ? (
                            <div className="rounded-xl border border-dashed border-red-500/30 bg-red-500/5 p-4 space-y-3 text-center">
                                <AlertCircle className="w-6 h-6 mx-auto text-red-500" />
                                <p className="text-xs text-red-600">{healthError}</p>
                                <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => void loadAccountHealth(healthAccount || undefined)}>
                                    Try again
                                </Button>
                            </div>
                        ) : accountHealth ? (
                            <>
                                <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold truncate">
                                                {accountHealth.name || healthAccount?.label || healthAccount?.username || formData.username}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground font-mono truncate">
                                                {accountHealth.demat || healthAccount?.dpId || formData.dpId} · {healthAccount?.username || formData.username}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={isAccountSuspended ? "destructive" : "default"}
                                            className="ml-auto shrink-0"
                                        >
                                            <ShieldCheck className="w-3 h-3 mr-1" />
                                            {isAccountSuspended ? "Suspended" : accountHealth.accountStatusName || "Active"}
                                        </Badge>
                                    </div>
                                </div>

                                {healthAlerts.length > 0 && (
                                    <div className="space-y-1.5">
                                        {healthAlerts.map((alert, index) => (
                                            <div
                                                key={index}
                                                className={cn(
                                                    "rounded-xl border p-2.5 text-xs flex items-start gap-2",
                                                    alert.tone === "danger"
                                                        ? "border-red-500/30 bg-red-500/10 text-red-600"
                                                        : "border-amber-500/30 bg-amber-500/10 text-amber-700",
                                                )}
                                            >
                                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                {alert.text}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    {[
                                        { icon: Hash, value: accountHealth.clientCode, title: "Client code" },
                                        { icon: Fingerprint, value: accountHealth.boid, title: "BOID" },
                                        { icon: Building2, value: accountHealth.bankName, title: "Bank" },
                                        { icon: CreditCard, value: accountHealth.accountNumber, title: "Account number" },
                                        { icon: MapPin, value: accountHealth.branchName || accountHealth.branchCode, title: "Branch" },
                                        { icon: FileText, value: accountHealth.crnNumber, title: "CRN number" },
                                        { icon: CalendarClock, value: formatHealthDate(accountHealth.dematExpiryDate), title: "Demat expiry" },
                                        { icon: CalendarClock, value: formatHealthDate(accountHealth.passwordExpiryDate), title: "Password expiry" },
                                        { icon: Phone, value: accountHealth.contact || accountHealth.email, title: "Contact" },
                                        { icon: CalendarClock, value: formatHealthDate(accountHealth.accountOpenDate), title: "Account opened" },
                                    ].map(({ icon: Icon, value, title }) =>
                                        value ? (
                                            <div key={title} className="flex items-start gap-2 min-w-0">
                                                <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                                <div className="min-w-0">
                                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</div>
                                                    <div className="text-xs font-semibold truncate">{value}</div>
                                                </div>
                                            </div>
                                        ) : null
                                    )}
                                </div>
                            </>
                        ) : null}

                        {accountHealth && (
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1.5"
                                    disabled={isHealthLoading}
                                    onClick={() => void loadAccountHealth(healthAccount || undefined)}
                                >
                                    {isHealthLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                    {isHealthLoading ? "Checking..." : "Refresh"}
                                </Button>
                            </DialogFooter>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            {isDeveloperMode && (
                <Card className="border-dashed border-primary/40 bg-primary/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                                <Rocket className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Automation Tools</CardTitle>
                                <CardDescription className="text-xs text-primary/60">Developer-only tools for sync and IPO testing</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-dashed border-primary/20 bg-background/50 p-3">
                            <div>
                                <Label className="text-sm font-bold flex items-center gap-2">
                                    <RefreshCw className={cn("w-4 h-4 text-primary", isSyncing && "animate-spin")} />
                                    Sync Holdings
                                </Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Refresh live prices for holdings backed by transaction history. No new stocks are
                                    created — transactions are the single source of truth.
                                </p>
                            </div>
                            <Button
                                onClick={handleSyncPortfolio}
                                disabled={isSyncing || !resolveSyncPortfolioId()}
                                className="bg-info hover:bg-info/90 text-white rounded-xl font-bold h-10 shrink-0 border-0"
                            >
                                <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                                {isSyncing ? "Syncing..." : "Sync Holdings"}
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex p-1 bg-muted rounded-xl gap-1">
                                <Button
                                    size="sm"
                                    variant={testMode === 'apply' ? 'secondary' : 'ghost'}
                                    onClick={() => setTestMode('apply')}
                                    className="text-[10px] font-black uppercase tracking-widest h-8"
                                >
                                    Apply Test
                                </Button>
                                <Button
                                    size="sm"
                                    variant={testMode === 'result' ? 'secondary' : 'ghost'}
                                    onClick={() => setTestMode('result')}
                                    className="text-[10px] font-black uppercase tracking-widest h-8"
                                >
                                    Result Test
                                </Button>
                            </div>
                            <div className="flex items-center gap-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Force Manual</Label>
                                <Switch
                                    checked={isCustomMode}
                                    onCheckedChange={setIsCustomMode}
                                />
                            </div>
                        </div>
                        {false && testMode === "apply" && (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-background/70 border">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Watch Browser For This Test</Label>
                                <Switch
                                    checked={showLiveBrowserForTest}
                                    onCheckedChange={setShowLiveBrowserForTest}
                                />
                            </div>
                        )}

                        <div className="space-y-4 pt-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                {isCustomMode ? "Enter Custom IPO Name" : "Select IPO to Test"}
                            </Label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                {isCustomMode ? (
                                    <Input
                                        placeholder="Enter exact name as in MeroShare"
                                        value={customIpoName}
                                        onChange={(e) => setCustomIpoName(e.target.value)}
                                        className="bg-background/80 h-11"
                                    />
                                ) : (
                                    <Select
                                        value={selectedTestIpo}
                                        onValueChange={setSelectedTestIpo}
                                    >
                                        <SelectTrigger className="bg-background/80 h-11 flex-1">
                                            <SelectValue placeholder={testMode === 'apply' ? (openIpos.length > 0 ? "Select an open IPO" : "No open IPOs found") : "Select a closed IPO"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(testMode === 'apply' ? openIpos : upcomingIPOs.filter(i => i.status === 'closed')).map((ipo, index) => {
                                                const ipoKey = [ipo.company, ipo.url, ipo.date_range, ipo.scraped_at, String(index)]
                                                    .filter(Boolean)
                                                    .join("|")
                                                return (
                                                    <SelectItem key={ipoKey} value={ipo.company}>
                                                        {ipo.company}
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                )}
                                <Button
                                    onClick={testApplication}
                                    disabled={isApplying || isCheckingResult || (isCustomMode ? !customIpoName : !selectedTestIpo)}
                                    className={cn(
                                        "h-11 px-8 gap-2 shrink-0 font-bold shadow-lg transition-all",
                                        testMode === 'apply' ? "bg-primary hover:bg-primary/90 shadow-primary/20" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 text-white"
                                    )}
                                >
                                    {testMode === 'apply' ? <Rocket className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                    {testMode === 'apply' ? (isApplying ? "Running..." : "Run Apply Test") : (isCheckingResult ? "Checking..." : "Check Result")}
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2 italic flex items-center gap-1.5">
                                <AlertCircle className="w-3 h-3" />
                                {isCustomMode
                                    ? `Careful: Enter the EXACT name as shown in MeroShare ${testMode === 'apply' ? "'Apply'" : "'Report'"} list.`
                                    : `This runs automation in the background and attempts to ${testMode === 'apply' ? "apply for the share" : "check allotment results"}.`}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="border-muted bg-muted/20">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <CardTitle className="text-base">Application Logs</CardTitle>
                            <CardDescription className="text-xs">Every MeroShare API action, kept for 30 days</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary">{filteredLogs.length}</Badge>
                            {allApplicationLogs.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[11px] gap-1.5 text-muted-foreground"
                                    disabled={isClearingLogs}
                                    onClick={async () => {
                                        if (!confirmClearLogs) {
                                            setConfirmClearLogs(true)
                                            setTimeout(() => setConfirmClearLogs(false), 3000)
                                            return
                                        }
                                        setIsClearingLogs(true)
                                        await clearMeroShareApplicationLogs()
                                        setConfirmClearLogs(false)
                                        setIsClearingLogs(false)
                                        toast.success("Application logs cleared.")
                                    }}
                                >
                                    {isClearingLogs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                    {confirmClearLogs ? "Confirm clear?" : "Clear"}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {allApplicationLogs.length === 0 ? (
                        <div className="rounded-xl border border-dashed bg-background/50 p-6 text-center space-y-1">
                            <History className="w-6 h-6 mx-auto text-muted-foreground/60" />
                            <p className="text-xs font-medium text-muted-foreground">No MeroShare activity yet</p>
                            <p className="text-[11px] text-muted-foreground/70">
                                Test your login, sync data or apply for an IPO and it will show up here.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                <Select value={logTypeFilter} onValueChange={(value) => setLogTypeFilter(value)}>
                                    <SelectTrigger className="flex-1 min-w-0 h-8 text-xs bg-background/70 sm:flex-none sm:w-[170px]">
                                        <ListFilter className="w-3.5 h-3.5 text-muted-foreground mr-1.5 shrink-0" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {logTypeOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="flex flex-1 min-w-0 rounded-lg border bg-background/70 overflow-hidden sm:flex-none">
                                    {logTimeOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setLogTimeFilter(option.value)}
                                            className={cn(
                                                "flex-1 sm:flex-none px-1.5 sm:px-2.5 h-8 text-xs font-medium transition-colors whitespace-nowrap",
                                                logTimeFilter === option.value
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground hover:bg-muted",
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <SlidersHorizontal className="w-3 h-3" />
                                    {loadedLogs.length} of {filteredLogs.length} on this page
                                </div>
                            </div>

                            {filteredLogs.length === 0 ? (
                                <div className="rounded-xl border border-dashed bg-background/50 p-6 text-center space-y-1">
                                    <ListFilter className="w-6 h-6 mx-auto text-muted-foreground/60" />
                                    <p className="text-xs font-medium text-muted-foreground">No logs match your filters</p>
                                    <p className="text-[11px] text-muted-foreground/70">
                                        Try a wider time range or a different type.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {loadedLogs.map((log) => {
                                        const meta = actionMeta[log.action] ?? { label: log.action, icon: History }
                                        return (
                                            <div key={log.id} className="rounded-xl border bg-background/70 p-3 space-y-2">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${log.status === "success" ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-500"}`}>
                                                            {log.status === "success"
                                                                ? <CircleCheck className="w-4 h-4" />
                                                                : <CircleX className="w-4 h-4" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold truncate">
                                                                {log.action === "apply" && log.ipoName ? log.ipoName : meta.label}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground">
                                                                {formatRelativeTime(log.createdAt)} · {sourceLabel(log.source) ?? log.source}
                                                                {typeof log.requestedKitta === "number" ? ` · ${log.requestedKitta} kitta` : ""}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Badge variant={log.status === "success" ? "default" : "destructive"} className="shrink-0">
                                                        {log.status === "success" ? "Success" : "Failed"}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground pl-10">{log.message}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {totalLogPages > 1 && (
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-[11px] text-muted-foreground">
                                        Page {logPage} of {totalLogPages} · {filteredLogs.length} logs
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-7 w-7"
                                            disabled={logPage <= 1}
                                            onClick={() => goToLogPage(logPage - 1)}
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </Button>
                                        <Select
                                            value={String(logPage)}
                                            onValueChange={(value) => goToLogPage(parseInt(value, 10))}
                                        >
                                            <SelectTrigger className="h-7 w-auto px-2 gap-1 text-xs sm:hidden" aria-label="Go to page">
                                                <SelectValue placeholder={`Page ${logPage}`} />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-56">
                                                {Array.from({ length: totalLogPages }, (_, i) => i + 1).map((page) => (
                                                    <SelectItem key={page} value={String(page)}>Page {page}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="hidden sm:flex items-center gap-1">
                                            {logPageNumbers.map((item, index) =>
                                                item === "ellipsis" ? (
                                                    <span key={`ellipsis-${index}`} className="px-1 text-xs text-muted-foreground">…</span>
                                                ) : (
                                                    <button
                                                        key={item}
                                                        type="button"
                                                        onClick={() => goToLogPage(item)}
                                                        className={cn(
                                                            "min-w-7 h-7 px-1.5 rounded-md text-xs font-medium transition-colors",
                                                            item === logPage
                                                                ? "bg-primary text-primary-foreground"
                                                                : "text-muted-foreground hover:bg-muted",
                                                        )}
                                                    >
                                                        {item}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-7 w-7"
                                            disabled={logPage >= totalLogPages}
                                            onClick={() => goToLogPage(logPage + 1)}
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
            <Dialog open={showDisableDialog} onOpenChange={(v) => { if (!v && !isDisablingShare) setShowDisableDialog(false) }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                            <AlertCircle className="h-4 w-4 text-destructive" /> Disable Share Features?
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            What would you like to do with your portfolio data?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 py-2">
                        <Button variant="outline" className="h-9 text-xs justify-start gap-2 font-bold"
                            disabled={isDisablingShare}
                            onClick={async () => {
                                setIsDisablingShare(true)
                                try {
                                    const data = {
                                        exportedAt: new Date().toISOString(),
                                        portfolio,
                                        shareTransactions,
                                        sipPlans: userProfile?.sipPlans || [],
                                    }
                                    const json = JSON.stringify(data, null, 2)
                                    const blob = new Blob([json], { type: "application/json" })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement("a")
                                    a.href = url
                                    a.download = `mero-share-data-${new Date().toISOString().slice(0, 10)}.json`
                                    a.click()
                                    URL.revokeObjectURL(url)
                                    for (const p of portfolios) {
                                        await deletePortfolio(p.id)
                                    }
                                    updateUserProfile({
                                        meroShare: undefined,
                                        sipPlans: [],
                                    })
                                    setFormData((prev) => ({ ...prev, shareFeaturesEnabled: false, shareNotificationsEnabled: false }))
                                    toast.success("Data exported. Share features disabled.")
                                } catch {
                                    toast.error("Failed to export data")
                                }
                                setShowDisableDialog(false)
                                setIsDisablingShare(false)
                            }}>
                            <Download className="h-4 w-4" />
                            {isDisablingShare ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            Export data & disable
                        </Button>
                        <Button variant="destructive" className="h-9 text-xs justify-start gap-2 font-bold"
                            disabled={isDisablingShare}
                            onClick={async () => {
                                setIsDisablingShare(true)
                                try {
                                    for (const p of portfolios) {
                                        await deletePortfolio(p.id)
                                    }
                                    updateUserProfile({
                                        meroShare: undefined,
                                        sipPlans: [],
                                    })
                                    setFormData((prev) => ({ ...prev, shareFeaturesEnabled: false, shareNotificationsEnabled: false }))
                                    toast.success("Share features disabled. All related data removed.")
                                } catch {
                                    toast.error("Failed to disable share features")
                                }
                                setShowDisableDialog(false)
                                setIsDisablingShare(false)
                            }}>
                            <Trash2 className="h-4 w-4" />
                            {isDisablingShare ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            Delete all data & disable
                        </Button>
                    </div>
                    <div className="flex justify-end">
                        <Button variant="ghost" size="sm" className="h-8 text-xs" disabled={isDisablingShare}
                            onClick={() => setShowDisableDialog(false)}>
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <ImportVerificationModal
                open={isPriceReviewOpen}
                onOpenChange={(open) => {
                    if (!open) clearPriceReview()
                    else setIsPriceReviewOpen(true)
                }}
                importQueue={priceReviewQueue}
                importPrices={reviewPrices}
                setImportPrices={setReviewPrices}
                importTransactionPrices={reviewTransactionPrices}
                setImportTransactionPrices={setReviewTransactionPrices}
                stats={priceReviewStats}
                onConfirm={confirmPriceReview}
            />
            </>
            )}
        </div>
    )
}
