"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useWalletData } from "@/contexts/wallet-data-context"
import { Shield, Lock, User, Key, Building2, Fingerprint, Eye, EyeOff, AlertCircle, Rocket, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Check, ChevronsUpDown } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { formatAppDateTime, getCalendarSystem } from "@/lib/app-calendar"
import type { MeroShareAccount } from "@/types/wallet"
import { useDeveloperMode } from "@/hooks/use-developer-mode"

const emptyAccountForm: MeroShareAccount = {
    id: "",
    label: "",
    role: "primary",
    dpId: "",
    username: "",
    password: "",
    crn: "",
    pin: "",
}

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

export function MeroShareSettings() {
    const { userProfile, updateUserProfile, upcomingIPOs, syncMeroSharePortfolio, syncMeroShareTransactionHistory, portfolios, activePortfolioId, checkIPOAllotment, applyMeroShareIPO } = useWalletData()
    const calendarSystem = getCalendarSystem(userProfile?.calendarSystem)
    const [showPassword, setShowPassword] = useState(false)
    const [dps, setDps] = useState<{ id: string, name: string, code: string }[]>([])
    const [isLoadingDps, setIsLoadingDps] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [isApplying, setIsApplying] = useState(false)
    const [isCheckingResult, setIsCheckingResult] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [isSyncingHistory, setIsSyncingHistory] = useState(false)
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
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
    const [accountForm, setAccountForm] = useState<MeroShareAccount>(emptyAccountForm)

    const [formData, setFormData] = useState({
        dpId: getPrimaryAccount(getMeroShareAccounts(userProfile?.meroShare))?.dpId || "",
        username: getPrimaryAccount(getMeroShareAccounts(userProfile?.meroShare))?.username || "",
        password: getPrimaryAccount(getMeroShareAccounts(userProfile?.meroShare))?.password || "",
        crn: getPrimaryAccount(getMeroShareAccounts(userProfile?.meroShare))?.crn || "",
        pin: getPrimaryAccount(getMeroShareAccounts(userProfile?.meroShare))?.pin || "",
        shareFeaturesEnabled: userProfile?.meroShare?.shareFeaturesEnabled || false,
        shareNotificationsEnabled: userProfile?.meroShare?.shareNotificationsEnabled || false,
        preferredKitta: userProfile?.meroShare?.preferredKitta || 0,
        applyMode: "on-demand",
        showLiveBrowser: false,
        browserProvider: userProfile?.meroShare?.browserProvider || "auto",
        isAutomatedEnabled: true
    })
    const openIpos = upcomingIPOs.filter(ipo => ipo.status === 'open')
    const recentApplicationLogs = (userProfile?.meroShare?.applicationLogs ?? []).slice(0, 10)
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
            preferredKitta: userProfile?.meroShare?.preferredKitta || 0,
            applyMode: "on-demand",
            showLiveBrowser: false,
            browserProvider: userProfile?.meroShare?.browserProvider || "auto",
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
                return data.message || "Connection Success!"
            },
            error: (err: any) => {
                setIsTesting(false)
                return err.message
            }
        })
    }

    const toggleShareFeatures = (enabled: boolean) => {
        const nextForm = {
            ...formData,
            shareFeaturesEnabled: enabled,
            shareNotificationsEnabled: enabled,
            isAutomatedEnabled: true,
        }
        setFormData(nextForm)
        persistMeroShareSettings(nextForm, accounts)
        toast(enabled ? "Share features enabled" : "Share features disabled", {
            description: enabled ? "MeroShare options are now available." : "MeroShare options are hidden.",
        })
    }

    const updatePreferredKitta = (value: number) => {
        const nextForm = {
            ...formData,
            preferredKitta: value,
        }
        setFormData(nextForm)
        persistMeroShareSettings(nextForm, accounts)
    }

    const updateBrowserProvider = (value: "auto" | "browserless" | "local") => {
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
            formData.preferredKitta || 0,
            "settings-test",
            { showBrowser: false, browserProvider: formData.browserProvider }
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

    const handleSyncPortfolio = async () => {
        if (!formData.dpId || !formData.username || !formData.password) {
            toast.error("Credentials missing", { description: "Save your credentials first to sync." })
            return
        }

        setIsSyncing(true)
        const promise = syncMeroSharePortfolio(formData, targetPortfolio)

        toast.promise(promise, {
            loading: "Logging into Mero Share and fetching portfolio...",
            success: (data) => {
                setIsSyncing(false)
                return `Successfully synced! Updated ${data.updatedCount} and added ${data.addedCount} holdings.`
            },
            error: (err) => {
                setIsSyncing(false)
                return err.message || "Failed to sync portfolio."
            }
        })
    }

    const handleSyncTransactionHistory = async () => {
        if (!formData.dpId || !formData.username || !formData.password) {
            toast.error("Credentials missing", { description: "Save your credentials first to sync transaction history." })
            return
        }

        setIsSyncingHistory(true)
        const promise = syncMeroShareTransactionHistory(formData, targetPortfolio)

        toast.promise(promise, {
            loading: "Fetching MeroShare transaction history...",
            success: (data) => {
                setIsSyncingHistory(false)
                return `History synced. Imported ${data.importedCount}, skipped ${data.skippedCount} duplicate${data.skippedCount === 1 ? "" : "s"}.`
            },
            error: (err) => {
                setIsSyncingHistory(false)
                return err.message || "Failed to sync transaction history."
            }
        })
    }

    return (
        <div className="space-y-6">
            <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle>Mero Share Credentials</CardTitle>
                            <CardDescription>Set up your account to apply from open IPO cards</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
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
                    {formData.shareFeaturesEnabled && (
                    <>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <Label className="text-sm font-bold">MeroShare Accounts</Label>
                                <p className="text-xs text-muted-foreground">
                                    Credentials stay hidden until you add or edit an account.
                                </p>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={testConnection}
                                    disabled={isTesting || !isLoginReady}
                                    className="border-primary/20 hover:bg-primary/5"
                                >
                                    {isTesting ? "Testing..." : "Test Connection"}
                                </Button>
                                <Button type="button" onClick={openAddAccountDialog}>
                                    Add Account
                                </Button>
                            </div>
                        </div>

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
                                                    <Button type="button" variant="outline" size="sm" onClick={() => openEditAccountDialog(account)}>
                                                        Edit
                                                    </Button>
                                                    <Button type="button" variant="destructive" size="sm" onClick={() => deleteAccount(account.id)}>
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Rocket className="w-3 h-3" /> Preferred Kitta (Optional)
                        </Label>
                        <Input
                            type="number"
                            min="0"
                            placeholder="0 = Auto-detect minimum"
                            value={formData.preferredKitta || ""}
                            onChange={(e) => updatePreferredKitta(parseInt(e.target.value) || 0)}
                            className="h-11 bg-background/50"
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            Leave at 0 to automatically use the minimum quantity from each IPO. Set a specific number (e.g., 20, 50) to always apply for that amount.
                        </p>
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
                                                ? `${selectedDp.name} (${selectedDp.id})`
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
                            <p className="text-[11px] text-muted-foreground">
                                {isLoadingDps ? "Loading DPS list..." : `${dps.length} DPS entries available from bundled data.`}
                            </p>
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
                    </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingAccountId ? "Edit MeroShare Account" : "Add MeroShare Account"}</DialogTitle>
                        <DialogDescription>
                            DP, username, and password are enough for result checks. CRN and PIN are only needed when applying.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
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
                                        ? `${selectedDp.name} (${selectedDp.id})`
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
                            <p className="text-[11px] text-muted-foreground">
                                {isLoadingDps ? "Loading DPS list..." : `${dps.length} DPS entries available from bundled data.`}
                            </p>
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
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-info/20 rounded-lg flex items-center justify-center text-info">
                            <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
                        </div>
                        <div>
                            <CardTitle className="text-base">MeroShare Sync</CardTitle>
                            <CardDescription className="text-xs text-info/60">Import current holdings and transaction history from MeroShare</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col gap-4">
                        {portfolios.length > 1 && (
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Target Portfolio</Label>
                                <Select value={targetPortfolio} onValueChange={setTargetPortfolio}>
                                    <SelectTrigger className="w-full sm:w-[240px] h-10 rounded-xl bg-background/50 border-info/20">
                                        <SelectValue placeholder="Select Portfolio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {portfolios.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
                            <div className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                                Holdings sync fetches your latest scrips and units.
                                Existing scrips will have their units updated, while new ones will be added to
                                <span className="font-bold text-info"> {portfolios.find(p => p.id === targetPortfolio)?.name || "your portfolio"}</span>.
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                <Button
                                    onClick={handleSyncPortfolio}
                                    disabled={isSyncing || isSyncingHistory || !targetPortfolio}
                                    className="bg-info hover:bg-info/90 text-white shadow-lg shadow-info/20 px-8 rounded-xl font-bold h-11 shrink-0 w-full sm:w-auto border-0"
                                >
                                    {isSyncing ? "Syncing..." : "Sync Holdings"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleSyncTransactionHistory}
                                    disabled={isSyncing || isSyncingHistory || !targetPortfolio}
                                    className="border-info/20 px-8 rounded-xl font-bold h-11 shrink-0 w-full sm:w-auto"
                                >
                                    {isSyncingHistory ? "Syncing..." : "Sync History"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground mt-2 italic flex items-center gap-1.5 opacity-60">
                        <AlertCircle className="w-3 h-3 text-warning" />
                        Transaction history uses face value for IPO/merger credits and 0 for unknown secondary-market prices.
                    </p>
                </CardContent>
            </Card>

            {isDeveloperMode && (
                <Card className="border-dashed border-primary/30 bg-primary/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                                <Fingerprint className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Developer Browser Runtime</CardTitle>
                                <CardDescription className="text-xs text-primary/60">Choose how MeroShare Puppeteer sessions launch on this machine</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-[1fr_220px] sm:items-center">
                            <div className="text-xs text-muted-foreground leading-relaxed">
                                Auto uses Browserless when configured, then falls back to local Chrome in development. Local Chrome is only for your own dev machine.
                            </div>
                            <Select
                                value={formData.browserProvider}
                                onValueChange={(value) => updateBrowserProvider(value as "auto" | "browserless" | "local")}
                            >
                                <SelectTrigger className="h-10 bg-background/70">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">Auto</SelectItem>
                                    <SelectItem value="browserless">Browserless API</SelectItem>
                                    <SelectItem value="local">Local Chrome</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            )}

            {false && isDeveloperMode && (
                <Card className="border-dashed border-primary/40 bg-primary/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                                <Rocket className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Automation Tools</CardTitle>
                                <CardDescription className="text-xs text-primary/60">Run a safe test before using live IPO actions</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base">Application Logs</CardTitle>
                            <CardDescription className="text-xs">Latest IPO apply and report-check attempts</CardDescription>
                        </div>
                        <Badge variant="secondary">{recentApplicationLogs.length}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {recentApplicationLogs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No application attempts logged yet.</p>
                    ) : (
                        recentApplicationLogs.map((log) => (
                            <div key={log.id} className="rounded-xl border bg-background/70 p-3 flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="text-sm font-semibold">{log.ipoName}</div>
                                    <div className="text-[11px] text-muted-foreground">
                                        {formatAppDateTime(log.createdAt, calendarSystem)} | Action: {log.action === "apply" ? "Apply" : "Report Check"}{typeof log.requestedKitta === "number" ? ` | Kitta: ${log.requestedKitta}` : ""} | Source: {log.source === "live-apply" ? "Live Apply" : log.source === "live-auto" ? "Live Auto" : log.source === "settings-test" ? "Settings Test" : log.source === "live-check" ? "Live Check" : "Settings Check"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{log.message}</div>
                                </div>
                                <Badge variant={log.status === "success" ? "default" : "destructive"} className="shrink-0">
                                    {log.status === "success" ? "Success" : "Failed"}
                                </Badge>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
            </>
            )}
        </div>
    )
}
