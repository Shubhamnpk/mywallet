"use client"

import { UpcomingIPO } from "@/types/wallet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, ExternalLink, X, Activity, Sparkles, ArrowRight, CheckCircle2, AlertCircle, BellRing, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useWalletData } from "@/contexts/wallet-data-context"
import { toast } from "sonner"
import { useCallback, useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { MeroShareAccount } from "@/types/wallet"
import { useRouter } from "next/navigation"


interface IPODetailModalProps {
    ipo: UpcomingIPO | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function IPODetailModal({ ipo, open, onOpenChange }: IPODetailModalProps) {
    const router = useRouter()
    const { userProfile, checkIPOAllotment, applyMeroShareIPO } = useWalletData()
    const [isApplying, setIsApplying] = useState(false)
    const [isCheckingResult, setIsCheckingResult] = useState(false)
    const [hasAppliedInSession, setHasAppliedInSession] = useState(false)
    const meroShareAccounts = useMemo<MeroShareAccount[]>(() => {
        if (userProfile?.meroShare?.accounts?.length) return userProfile.meroShare.accounts
        if (userProfile?.meroShare?.dpId || userProfile?.meroShare?.username) {
            return [{
                id: "legacy-primary",
                label: "Primary account",
                role: "primary" as const,
                dpId: userProfile.meroShare.dpId || "",
                username: userProfile.meroShare.username || "",
                password: userProfile.meroShare.password || "",
                crn: userProfile.meroShare.crn || "",
                pin: userProfile.meroShare.pin || "",
            }]
        }
        return []
    }, [userProfile?.meroShare])
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const selectedAccount = useMemo(
        () =>
            meroShareAccounts.find(account => account.id === selectedAccountId) ||
            meroShareAccounts.find(account => account.role === "primary") ||
            meroShareAccounts[0],
        [meroShareAccounts, selectedAccountId]
    )
    const hasMeroShareLoginCredentials = Boolean(
        selectedAccount?.dpId &&
        selectedAccount?.username &&
        selectedAccount?.password
    )
    const hasMeroShareApplyCredentials = Boolean(
        hasMeroShareLoginCredentials &&
        selectedAccount?.crn &&
        selectedAccount?.pin
    )
    const canUseMeroShare = Boolean(userProfile?.meroShare?.shareFeaturesEnabled && hasMeroShareLoginCredentials)
    const canApplyFromCard = Boolean(userProfile?.meroShare?.shareFeaturesEnabled && hasMeroShareApplyCredentials)
    const normalizeIpoName = (value?: string) =>
        (value || "")
            .toLowerCase()
            .replace(/\b(limited|ltd|public|private|pvt|co|company|inc)\b/g, "")
            .replace(/[().,-]/g, "")
            .replace(/\s+/g, " ")
            .trim()
    const hasAppliedLog = Boolean(
        userProfile?.meroShare?.applicationLogs?.some(
            (log) =>
                log.action === "apply" &&
                log.status === "success" &&
                normalizeIpoName(log.ipoName) === normalizeIpoName(ipo?.company)
        )
    )
    const isAppliedForIpo = hasAppliedInSession || hasAppliedLog
    const openMeroShareSettings = () => {
        onOpenChange(false)
        router.push("/settings?tab=meroshare")
    }
    const handleApplyFromCard = useCallback(async (
        source: "live-apply" = "live-apply",
        closeOnSuccess = true
    ) => {
        const credentials = selectedAccount
        if (!userProfile?.meroShare?.shareFeaturesEnabled) {
            toast.error("Share features are disabled.", {
                description: "Open Settings > MeroShare and enable Share Features first."
            })
            return
        }
        if (!canApplyFromCard) {
            toast.error("MeroShare setup is incomplete.", {
                description: `Add CRN and transaction PIN for ${credentials?.label || "this account"} in Settings > MeroShare to apply.`
            })
            return
        }
        if (!credentials?.dpId || !credentials.username || !credentials.password || !credentials.crn || !credentials.pin) {
            toast.error("Missing Mero Share credentials. Please complete your setup in Settings.")
            return
        }

        setIsApplying(true)
        const promise = applyMeroShareIPO(
            credentials,
            ipo?.company || "",
            credentials.preferredKitta || 0,
            source,
            { showBrowser: false }
        )

        toast.promise(promise, {
            loading: `Applying for ${ipo?.company}... This may take a few seconds.`,
            success: (data) => {
                setIsApplying(false)
                setHasAppliedInSession(true)
                if (closeOnSuccess) onOpenChange(false)
                if (data?.alreadyApplied) {
                    return data.message || "Already applied earlier. No new apply action was submitted."
                }
                return data.message || "Applied successfully!"
            },
            error: (err) => {
                setIsApplying(false)
                return err.message
            }
        })
    }, [applyMeroShareIPO, canApplyFromCard, ipo?.company, onOpenChange, selectedAccount, userProfile?.meroShare?.shareFeaturesEnabled])

    const handleCheckAllotment = async () => {
        const credentials = selectedAccount
        if (!canUseMeroShare) {
            toast.error("Mero Share setup required", { description: "Please setup your credentials in Settings to check allotment." })
            return
        }
        if (!credentials) {
            toast.error("Missing Mero Share credentials. Please complete your setup in Settings.")
            return
        }

        setIsCheckingResult(true)
        const promise = checkIPOAllotment(credentials, ipo?.company || "", "live-check")

        toast.promise(promise, {
            loading: `Checking allotment for ${ipo?.company}...`,
            success: (data) => {
                setIsCheckingResult(false)
                if (data.isAllotted) {
                    return `Congratulations! You were allotted ${data.allottedQuantity} units.`
                } else {
                    return `Not Allotted: ${data.status}`
                }
            },
            error: (err) => {
                setIsCheckingResult(false)
                return err.message
            }
        })
    }

    // Determine status colors and labels
    const statusLabel = ipo?.status === 'open' ? 'Closing in' :
        ipo?.status === 'upcoming' ? 'Opening in' :
            'Closed';

    const statusColor = ipo?.status === 'open' ? 'text-success bg-success/10 border-success/20' :
        ipo?.status === 'upcoming' ? 'text-info bg-info/10 border-info/20' :
            'text-muted-foreground bg-muted/20 border-muted/30';

    // Helper to get actionable advice based on status
    const getActionableAdvice = () => {
        if (!ipo) return null;
        switch (ipo.status) {
            case 'open':
                if (isAppliedForIpo) {
                    return {
                        title: "Already Applied",
                        description: "This IPO is already applied from your account. You can check result/status now.",
                        icon: <CheckCircle2 className="w-5 h-5 text-success" />,
                        bgColor: "bg-success/5",
                        borderColor: "border-success/20"
                    };
                }
                return {
                    title: "Application is Live!",
                    description: canApplyFromCard
                        ? `You can apply now for 10 units of ${ipo.company}.`
                        : canUseMeroShare
                        ? "Add CRN and transaction PIN in MeroShare settings to apply."
                        : "Enable Share Features and set up MeroShare once, then apply from this screen.",
                    icon: <CheckCircle2 className="w-5 h-5 text-success" />,
                    bgColor: "bg-success/5",
                    borderColor: "border-success/20"
                };
            case 'upcoming':
                return {
                    title: "Ready to invest?",
                    description: `Opens on ${ipo.openingDay || 'the scheduled date'}. Keep NPR 1,000 ready in your account.`,
                    icon: <BellRing className="w-5 h-5 text-info animate-bounce" />,
                    bgColor: "bg-info/5",
                    borderColor: "border-info/20"
                };
            case 'closed':
            default:
                return {
                    title: "Check Results",
                    description: "The subscription has ended. You can check whether you've been allotted any units.",
                    icon: <History className="w-5 h-5 text-indigo-500" />,
                    bgColor: "bg-indigo-500/5",
                    borderColor: "border-indigo-500/20"
                };
        }
    };

    const advice = getActionableAdvice();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {ipo && (
                <DialogContent className="max-w-md rounded-3xl border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden flex flex-col gap-0 max-h-[85vh] sm:max-h-[90vh]" showCloseButton={false}>
                    {/* Visual Decor */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />

                    <DialogHeader className="p-4 pb-3 sm:p-6 sm:pb-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent relative z-20 shrink-0 border-b border-primary/5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-4 h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-muted/80 hover:text-muted-foreground text-muted-foreground transition-all z-50 border border-muted-foreground/10"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center justify-between mb-2 sm:mb-3 pr-8">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] border-primary/30 text-primary bg-primary/5 px-2.5 py-1">
                                Investment Alert
                            </Badge>
                            <Badge className={cn("text-[10px] font-black uppercase px-3 py-1 border shadow-sm hidden sm:inline-flex", statusColor)}>
                                {ipo.status === 'open' ? 'Currently Open' : ipo.status}
                            </Badge>
                        </div>

                        <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight leading-tight pr-6 drop-shadow-sm text-left">
                            {ipo.company}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto show-scrollbars p-4 pt-2 sm:p-6 sm:pt-2 space-y-4 sm:space-y-5 relative z-10">
                        {/* Status Badges */}
                        <div className="flex items-center flex-wrap gap-2">
                            {(ipo.is_reserved_share || Boolean(ipo.reserved_for)) && ipo.reserved_for && (
                                <Badge
                                    variant="outline"
                                    title={ipo.reserved_for}
                                    className="text-[10px] font-bold normal-case px-3 py-1 border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200 max-w-[220px] truncate"
                                >
                                    {ipo.reserved_for}
                                </Badge>
                            )}
                            {ipo.daysRemaining !== undefined && ipo.status !== 'closed' && (
                                <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 border-primary/20 text-primary bg-primary/10 backdrop-blur-sm">
                                    <Activity className={cn("w-3 h-3 mr-1.5", ipo.status === 'open' && "animate-pulse")} />
                                    {statusLabel} {ipo.daysRemaining} {ipo.daysRemaining === 1 ? 'day' : 'days'}
                                </Badge>
                            )}
                        </div>

                        {/* Advice Card */}
                        {advice && (
                            <div className={cn("p-4 rounded-2xl border transition-all duration-300 flex gap-4 items-start shadow-sm", advice.bgColor, advice.borderColor)}>
                                <div className="shrink-0 mt-0.5">
                                    {advice.icon}
                                </div>
                                <div className="space-y-1">
                                    <h5 className="text-[11px] font-black uppercase tracking-wider text-foreground">
                                        {advice.title}
                                    </h5>
                                    <p className="text-xs font-medium text-muted-foreground leading-relaxed text-left">
                                        {advice.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Key Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl border border-muted/50 bg-muted/20 flex flex-col gap-2">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                    Issue Size
                                </span>
                                <span className="text-xl font-black font-mono tracking-tight text-foreground">
                                    {ipo.units.split(' ')[0]}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Total Units</span>
                            </div>
                            <div className="p-4 rounded-2xl border border-primary/10 bg-primary/5 flex flex-col gap-2">
                                <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest">
                                    Min Apply
                                </span>
                                <span className="text-xl font-black font-mono tracking-tight text-primary">
                                    NPR 1,000
                                </span>
                                <span className="text-[10px] font-bold text-primary/60 uppercase">10 Units Minimum</span>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Timeline</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5 p-4 rounded-2xl border border-primary/20 bg-primary/5">
                                    <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3" /> Open
                                    </span>
                                    <span className="text-sm font-black text-foreground">
                                        {ipo.date_range.split(/ to | - |-|–|-/)[0]?.trim()}
                                    </span>
                                    {ipo.openingDay && (
                                        <span className="text-[10px] font-bold text-primary/60 uppercase">
                                            {ipo.openingDay}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5 p-4 rounded-2xl border border-muted/50 bg-muted/10">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" /> Close
                                    </span>
                                    <span className="text-sm font-black text-foreground/80">
                                        {ipo.date_range.split(/ to | - |-|–|-/)[1]?.trim() || "N/A"}
                                    </span>
                                    {ipo.closingDay && (
                                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                                            Ends {ipo.closingDay}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Investor Insights */}
                        {ipo.full_text && (
                            <div className="p-4 rounded-2xl border border-muted/30 bg-muted/5 space-y-2 relative overflow-hidden">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-primary/60" /> Investor Insights
                                </span>
                                <p className="text-xs font-medium text-foreground/70 leading-relaxed italic border-l-2 border-primary/20 pl-3">
                                    "{ipo.full_text}"
                                </p>
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                            </div>
                        )}
                    </div>

                    {/* Sticky Footer */}
                    <div className="p-3 sm:p-4 bg-muted/15 backdrop-blur-0 border-t border-primary/5 shrink-0 relative z-20">
                        {meroShareAccounts.length > 1 && (
                            <div className="mb-2.5 flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground shrink-0">Apply with</span>
                                <Select value={selectedAccount?.id} onValueChange={setSelectedAccountId}>
                                    <SelectTrigger className="h-8 flex-1 rounded-xl text-[11px] font-bold border-primary/20 bg-background/60">
                                        <SelectValue placeholder="Choose account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {meroShareAccounts.map((account) => (
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
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            <Button
                                variant="outline"
                                className="rounded-xl font-bold text-[11px] uppercase tracking-widest h-10 sm:h-11 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all group"
                                onClick={() => window.open(ipo.url, '_blank')}
                                disabled={!ipo.url}
                            >
                                <ExternalLink className="w-3.5 h-3.5 mr-2 group-hover:scale-110 transition-transform" />
                                Source Details
                            </Button>
                            <Button
                                className="rounded-xl font-bold text-[11px] uppercase tracking-widest h-10 sm:h-11 shadow-lg shadow-primary/20 bg-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                disabled={isApplying || isCheckingResult}
                                onClick={() => {
                                    if (ipo.status === 'open') {
                                        if (canApplyFromCard && isAppliedForIpo) {
                                            handleCheckAllotment();
                                        } else if (canApplyFromCard) {
                                            handleApplyFromCard();
                                        } else {
                                            openMeroShareSettings();
                                        }
                                    } else if (ipo.status === 'closed' && canUseMeroShare) {
                                        handleCheckAllotment();
                                    } else {
                                        openMeroShareSettings();
                                    }
                                }}
                            >
                                {ipo.status === 'open' ? (
                                    <>
                                        {canApplyFromCard
                                            ? (isAppliedForIpo ? "Check Result" : "Apply Now")
                                            : 'Apply Now'}
                                        <ArrowRight className={cn("w-3.5 h-3.5", !isApplying && "animate-pulse")} />
                                    </>
                                ) : (
                                    <>
                                        {canUseMeroShare ? 'Check Allotment' : 'Setup'}
                                        <Sparkles className={cn("w-3.5 h-3.5", !isCheckingResult && "animate-pulse")} />
                                    </>
                                )}
                            </Button>
                        </div>
                        {ipo.announcement_date && (
                            <div className="flex items-center justify-center gap-2 mt-3 grayscale opacity-30">
                                <History className="w-2.5 h-2.5" />
                                <p className="text-[10px] font-bold uppercase tracking-[0.1em]">
                                    Announced: {ipo.announcement_date}
                                </p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            )}
        </Dialog>
    )
}

