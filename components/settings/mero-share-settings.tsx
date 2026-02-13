"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useWalletData } from "@/contexts/wallet-data-context"
import { Shield, Lock, User, Key, Building2, Save, Fingerprint, Eye, EyeOff, AlertCircle, Rocket, RefreshCw, Sparkles } from "lucide-react"
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
import { cn } from "@/lib/utils"

const MEROSHARE_DEV_MODE_KEY = "wallet_meroshare_dev_mode"

export function MeroShareSettings() {
    const { userProfile, updateUserProfile, upcomingIPOs, syncMeroSharePortfolio, portfolios, activePortfolioId, checkIPOAllotment, applyMeroShareIPO } = useWalletData()
    const [showPassword, setShowPassword] = useState(false)
    const [dps, setDps] = useState<{ id: string, name: string, code: string }[]>([])
    const [isLoadingDps, setIsLoadingDps] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [isApplying, setIsApplying] = useState(false)
    const [isCheckingResult, setIsCheckingResult] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [open, setOpen] = useState(false)
    const [selectedTestIpo, setSelectedTestIpo] = useState("")
    const [testMode, setTestMode] = useState<'apply' | 'result'>('apply')
    const [targetPortfolio, setTargetPortfolio] = useState(activePortfolioId || (portfolios.length > 0 ? portfolios[0].id : ""))
    const [customIpoName, setCustomIpoName] = useState("")
    const [isCustomMode, setIsCustomMode] = useState(false)
    const [showLiveBrowserForTest, setShowLiveBrowserForTest] = useState(false)
    const [isDevMode, setIsDevMode] = useState(false)

    const [formData, setFormData] = useState({
        dpId: userProfile?.meroShare?.dpId || "",
        username: userProfile?.meroShare?.username || "",
        password: userProfile?.meroShare?.password || "",
        crn: userProfile?.meroShare?.crn || "",
        pin: userProfile?.meroShare?.pin || "",
        shareFeaturesEnabled: userProfile?.meroShare?.shareFeaturesEnabled || false,
        shareNotificationsEnabled: userProfile?.meroShare?.shareNotificationsEnabled || false,
        preferredKitta: userProfile?.meroShare?.preferredKitta || 0,
        applyMode: userProfile?.meroShare?.applyMode || "on-demand",
        showLiveBrowser: userProfile?.meroShare?.showLiveBrowser || false,
        isAutomatedEnabled: userProfile?.meroShare?.isAutomatedEnabled || false
    })
    const openIpos = upcomingIPOs.filter(ipo => ipo.status === 'open')
    const recentApplicationLogs = (userProfile?.meroShare?.applicationLogs ?? []).slice(0, 10)
    const requiredFields: Array<keyof typeof formData> = ["dpId", "username", "password", "crn", "pin"]
    const missingRequiredFields = requiredFields.filter((key) => {
        const value = formData[key]
        return typeof value !== "string" || value.trim().length === 0
    })
    const isCredentialComplete = missingRequiredFields.length === 0
    const isAutomationReady = formData.isAutomatedEnabled && isCredentialComplete
    const savedMeroShare = userProfile?.meroShare
    const hasUnsavedChanges = JSON.stringify({
        dpId: formData.dpId,
        username: formData.username,
        password: formData.password,
        crn: formData.crn,
        pin: formData.pin,
        shareFeaturesEnabled: formData.shareFeaturesEnabled,
        shareNotificationsEnabled: formData.shareNotificationsEnabled,
        preferredKitta: formData.preferredKitta,
        applyMode: formData.applyMode,
        showLiveBrowser: formData.showLiveBrowser,
        isAutomatedEnabled: formData.isAutomatedEnabled,
    }) !== JSON.stringify({
        dpId: savedMeroShare?.dpId || "",
        username: savedMeroShare?.username || "",
        password: savedMeroShare?.password || "",
        crn: savedMeroShare?.crn || "",
        pin: savedMeroShare?.pin || "",
        shareFeaturesEnabled: savedMeroShare?.shareFeaturesEnabled || false,
        shareNotificationsEnabled: savedMeroShare?.shareNotificationsEnabled || false,
        preferredKitta: savedMeroShare?.preferredKitta || 0,
        applyMode: savedMeroShare?.applyMode || "on-demand",
        showLiveBrowser: savedMeroShare?.showLiveBrowser || false,
        isAutomatedEnabled: savedMeroShare?.isAutomatedEnabled || false,
    })

    useEffect(() => {
        // Fetch DP list
        const fetchDps = async () => {
            setIsLoadingDps(true)
            try {
                // In a real scenario, this would be an API call to Mero Share
                // For now, we'll provide a few common ones or fetch from our API
                const response = await fetch("/api/meroshare/dps")
                if (response.ok) {
                    const data = await response.json()
                    setDps(data)
                } else {
                    // Fallback to a few common ones if CORS fails
                    setDps([
                        { id: "13100", name: "NIC ASIA Bank Limited", code: "NIC" },
                        { id: "10200", name: "Nabil Bank Limited", code: "NABIL" },
                        { id: "11600", name: "Global IME Bank Limited", code: "GBIME" },
                    ])
                }
            } catch (error) {
                setDps([
                    { id: "13100", name: "NIC ASIA Bank Limited", code: "NIC" },
                    { id: "10200", name: "Nabil Bank Limited", code: "NABIL" },
                    { id: "11600", name: "Global IME Bank Limited", code: "GBIME" },
                ])
            } finally {
                setIsLoadingDps(false)
            }
        }
        fetchDps()
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return
        const stored = localStorage.getItem(MEROSHARE_DEV_MODE_KEY)
        setIsDevMode(stored === "true")

        const onKeyDown = (event: KeyboardEvent) => {
            const isToggle = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d"
            if (!isToggle) return

            event.preventDefault()
            setIsDevMode((prev) => {
                const next = !prev
                localStorage.setItem(MEROSHARE_DEV_MODE_KEY, String(next))
                toast(next ? "Developer mode enabled" : "Developer mode disabled", {
                    description: "Automation Tools visibility updated."
                })
                return next
            })
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [])

    useEffect(() => {
        setFormData({
            dpId: userProfile?.meroShare?.dpId || "",
            username: userProfile?.meroShare?.username || "",
            password: userProfile?.meroShare?.password || "",
            crn: userProfile?.meroShare?.crn || "",
            pin: userProfile?.meroShare?.pin || "",
            shareFeaturesEnabled: userProfile?.meroShare?.shareFeaturesEnabled || false,
            shareNotificationsEnabled: userProfile?.meroShare?.shareNotificationsEnabled || false,
            preferredKitta: userProfile?.meroShare?.preferredKitta || 0,
            applyMode: userProfile?.meroShare?.applyMode || "on-demand",
            showLiveBrowser: userProfile?.meroShare?.showLiveBrowser || false,
            isAutomatedEnabled: userProfile?.meroShare?.isAutomatedEnabled || false,
        })
    }, [userProfile?.meroShare])

    const handleSave = () => {
        updateUserProfile({
            meroShare: {
                ...(userProfile?.meroShare || {}),
                ...formData
            }
        })
        toast("Mero Share Settings Saved", {
            description: "Your credentials are stored securely in your local storage.",
        })
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
                options: { showBrowser: Boolean(formData.showLiveBrowser) }
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

    const updateField = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }))
    }

    const toggleShareFeatures = (enabled: boolean) => {
        setFormData(prev => ({
            ...prev,
            shareFeaturesEnabled: enabled,
            shareNotificationsEnabled: enabled,
            isAutomatedEnabled: enabled ? prev.isAutomatedEnabled : false,
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
            { showBrowser: showLiveBrowserForTest || Boolean(formData.showLiveBrowser) }
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
                            <CardDescription>Setup your credentials for automated IPO application</CardDescription>
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
                                Master switch for Portfolio section and share-related notifications.
                            </p>
                        </div>
                        <Switch
                            checked={formData.shareFeaturesEnabled}
                            onCheckedChange={toggleShareFeatures}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="space-y-1">
                            <Label className="text-sm font-bold flex items-center gap-2">
                                <Fingerprint className="w-4 h-4 text-primary" />
                                Automated IPO Application
                            </Label>
                            <p className="text-xs text-muted-foreground">When enabled, you'll be able to apply for IPOs with one click.</p>
                        </div>
                        <Switch
                            checked={formData.isAutomatedEnabled}
                            onCheckedChange={(checked) => updateField("isAutomatedEnabled", checked)}
                            disabled={!formData.shareFeaturesEnabled}
                        />
                    </div>
                    <div className="p-4 rounded-xl bg-background/60 border border-border space-y-2">
                        <Label className="text-sm font-bold">Apply Mode</Label>
                        <p className="text-xs text-muted-foreground">
                            Choose whether user-triggered applies run on demand only, or auto-run when opening an IPO modal.
                        </p>
                        <Select
                            value={formData.applyMode}
                            onValueChange={(value) => updateField("applyMode", value)}
                            disabled={!formData.shareFeaturesEnabled}
                        >
                            <SelectTrigger className="h-10 bg-background/80">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="on-demand">On Demand</SelectItem>
                                <SelectItem value="automatic">Automatic</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-background/60 border border-border">
                        <div className="space-y-1">
                            <Label className="text-sm font-bold">Show Browser While Automating</Label>
                            <p className="text-xs text-muted-foreground">On-demand visual mode. Useful for debugging or trust checks.</p>
                        </div>
                        <Switch
                            checked={Boolean(formData.showLiveBrowser)}
                            onCheckedChange={(checked) => updateField("showLiveBrowser", checked)}
                            disabled={!formData.shareFeaturesEnabled}
                        />
                    </div>
                    <div className={cn(
                        "p-4 rounded-xl border flex flex-col gap-2",
                        isAutomationReady ? "bg-success/5 border-success/20" : "bg-muted/40 border-muted"
                    )}>
                        <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold">Integration Status</div>
                            <Badge variant={isAutomationReady ? "default" : "secondary"}>
                                {isAutomationReady ? "Ready" : "Needs Setup"}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {!formData.shareFeaturesEnabled
                                ? "Share features are disabled. Turn on 'Enable Share Features' to use Portfolio and share notifications."
                                : formData.isAutomatedEnabled
                                ? isCredentialComplete
                                    ? "Automation is enabled and credentials are complete."
                                    : `Automation is enabled, but ${missingRequiredFields.length} required field(s) are missing.`
                                : "Automation is disabled. Enable it to apply/check directly from IPO cards."}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Open IPOs detected: <span className="font-semibold text-foreground">{openIpos.length}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                            {formData.dpId
                                                ? dps.find((dp) => dp.id === formData.dpId)?.name
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
                                                        value={`${dp.name} ${dp.id}`}
                                                        onSelect={() => {
                                                            updateField("dpId", dp.id)
                                                            setOpen(false)
                                                        }}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{dp.name}</span>
                                                            <span className="text-xs text-muted-foreground">{dp.id}</span>
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

                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">Security Note</h4>
                            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 leading-relaxed">
                                Your credentials are saved <strong>only on this device</strong>. They are never sent to our servers except when performing the automated application. We recommend using a PIN for the app itself under the "Security" tab.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={testConnection}
                            disabled={isTesting}
                            className="h-12 rounded-xl font-bold border-primary/20 hover:bg-primary/5 transition-all"
                        >
                            {isTesting ? "Testing..." : "Test Connection"}
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!hasUnsavedChanges}
                            className="h-12 rounded-xl font-bold bg-primary shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {hasUnsavedChanges ? "Save Settings" : "Saved"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-info/20 bg-info/5">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-info/20 rounded-lg flex items-center justify-center text-info">
                            <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
                        </div>
                        <div>
                            <CardTitle className="text-base">Portfolio Sync</CardTitle>
                            <CardDescription className="text-xs text-info/60">Automatically import your current holdings from Mero Share</CardDescription>
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
                                This will fetch your latest scrips and units.
                                Existing scrips will have their units updated, while new ones will be added to
                                <span className="font-bold text-info"> {portfolios.find(p => p.id === targetPortfolio)?.name || "your portfolio"}</span>.
                            </div>
                            <Button
                                onClick={handleSyncPortfolio}
                                disabled={isSyncing || !targetPortfolio}
                                className="bg-info hover:bg-info/90 text-white shadow-lg shadow-info/20 px-8 rounded-xl font-bold h-11 shrink-0 w-full sm:w-auto border-0"
                            >
                                {isSyncing ? "Syncing..." : "Sync Now"}
                            </Button>
                        </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground mt-2 italic flex items-center gap-1.5 opacity-60">
                        <AlertCircle className="w-3 h-3 text-warning" />
                        Cost price (Buy Price) won't be updated automatically. You may need to update them manually.
                    </p>
                </CardContent>
            </Card>

            {isDevMode && (
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
                        {testMode === "apply" && (
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
                                            {(testMode === 'apply' ? openIpos : upcomingIPOs.filter(i => i.status === 'closed')).map((ipo) => (
                                                <SelectItem key={ipo.company} value={ipo.company}>
                                                    {ipo.company}
                                                </SelectItem>
                                            ))}
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
                                        {new Date(log.createdAt).toLocaleString()} | Action: {log.action === "apply" ? "Apply" : "Report Check"}{typeof log.requestedKitta === "number" ? ` | Kitta: ${log.requestedKitta}` : ""} | Source: {log.source === "live-apply" ? "Live Apply" : log.source === "live-auto" ? "Live Auto" : log.source === "settings-test" ? "Settings Test" : log.source === "live-check" ? "Live Check" : "Settings Check"}
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
        </div>
    )
}
