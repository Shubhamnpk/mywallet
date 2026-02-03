"use client"

import { UpcomingIPO } from "@/types/wallet"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
    Calendar,
    Info,
    Clock,
    ExternalLink,
    X,
    Activity,
    LayoutGrid,
    Sparkles,
    CreditCard,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    BellRing,
    History
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface IPODetailModalProps {
    ipo: UpcomingIPO | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function IPODetailModal({ ipo, open, onOpenChange }: IPODetailModalProps) {
    // Determine status colors and labels
    const statusLabel = ipo?.status === 'open' ? 'Closing in' :
        ipo?.status === 'upcoming' ? 'Opening in' :
            'Closed';

    const statusColor = ipo?.status === 'open' ? 'text-green-600 bg-green-500/10 border-green-500/20' :
        ipo?.status === 'upcoming' ? 'text-blue-600 bg-blue-500/10 border-blue-500/20' :
            'text-muted-foreground bg-muted/20 border-muted/30';

    // Helper to get actionable advice based on status
    const getActionableAdvice = () => {
        if (!ipo) return null;
        switch (ipo.status) {
            case 'open':
                return {
                    title: "Application is Live!",
                    description: "You can apply for this IPO now through MeroShare. We recommend applying for 10 units as per current allotment trends.",
                    icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
                    bgColor: "bg-green-500/5",
                    borderColor: "border-green-500/20"
                };
            case 'upcoming':
                return {
                    title: "Ready to invest?",
                    description: `Opens on ${ipo.openingDay || 'the scheduled date'}. Keep रु 1,000 ready in your account.`,
                    icon: <BellRing className="w-5 h-5 text-blue-500 animate-bounce" />,
                    bgColor: "bg-blue-500/5",
                    borderColor: "border-blue-500/20"
                };
            default:
                return {
                    title: "Subscription Closed",
                    description: "The application period has ended. Stay tuned for the allotment results which usually take 7-10 days.",
                    icon: <History className="w-5 h-5 text-muted-foreground" />,
                    bgColor: "bg-muted/5",
                    borderColor: "border-muted/20"
                };
        }
    };

    const advice = getActionableAdvice();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {ipo && (
                <DialogContent className="max-w-md rounded-3xl border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden flex flex-col gap-0 max-h-[85vh] sm:max-h-[90vh]" showCloseButton={false}>
                    {/* Visual Decor */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                    <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent relative z-20 shrink-0 border-b border-primary/5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-4 h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-muted text-muted-foreground transition-all z-50 border border-muted-foreground/10"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center justify-between mb-3 pr-8">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] border-primary/30 text-primary bg-primary/5 px-2.5 py-1">
                                Investment Alert
                            </Badge>
                            {ipo.scraped_at && (
                                <div className="flex items-center gap-1.5 opacity-50">
                                    <Clock className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">
                                        Data Sync: {new Date(ipo.scraped_at).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>

                        <DialogTitle className="text-2xl font-black tracking-tight leading-tight pr-6 drop-shadow-sm text-left">
                            {ipo.company}
                        </DialogTitle>

                        <div className="flex items-center gap-2 mt-4">
                            {ipo.status && (
                                <Badge className={cn("text-[9px] font-black uppercase px-3 py-1 border shadow-sm", statusColor)}>
                                    {ipo.status === 'open' ? 'Currently Open' : ipo.status}
                                </Badge>
                            )}
                            {ipo.daysRemaining !== undefined && ipo.status !== 'closed' && (
                                <Badge variant="outline" className="text-[9px] font-black uppercase px-3 py-1 border-primary/20 text-primary bg-primary/10 backdrop-blur-sm">
                                    <Activity className={cn("w-3 h-3 mr-1.5", ipo.status === 'open' && "animate-pulse")} />
                                    {statusLabel} {ipo.daysRemaining} {ipo.daysRemaining === 1 ? 'day' : 'days'}
                                </Badge>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto show-scrollbars p-6 pt-2 space-y-5 relative z-10">
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

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-muted/20 border border-muted/50 flex flex-col gap-1.5 relative overflow-hidden group hover:border-primary/30 transition-colors text-left">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <LayoutGrid className="w-3 h-3 text-primary/60" /> Issue Size
                                </span>
                                <span className="text-lg font-black font-mono tracking-tight text-foreground truncate">
                                    {ipo.units.split(' ')[0]}
                                </span>
                                <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">Total Units</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col gap-1.5 relative overflow-hidden group hover:border-primary/30 transition-colors text-left">
                                <span className="text-[9px] font-black text-primary/70 uppercase tracking-widest flex items-center gap-1.5">
                                    <CreditCard className="w-3 h-3" /> Min Apply
                                </span>
                                <span className="text-lg font-black font-mono tracking-tight text-primary">
                                    रु 1,000
                                </span>
                                <span className="text-[8px] font-bold text-primary/60 uppercase">10 Units Min</span>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Timeline</h4>
                                <span className="text-[8px] font-black text-muted-foreground/30 uppercase">BS and AD Calendar</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col p-3.5 rounded-2xl border border-primary/20 bg-primary/5 relative overflow-hidden group hover:border-primary/40 transition-all text-left">
                                    <span className="text-[8px] font-black text-primary/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 leading-none">
                                        <Calendar className="w-3 h-3" /> Open Date
                                    </span>
                                    <span className="text-[14px] font-black text-foreground leading-tight truncate">
                                        {ipo.date_range.split(/ to | - |-|–|—/)[0]?.trim()}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-x-1.5 mt-1">
                                        {ipo.openingDay && (
                                            <span className="text-[10px] font-bold text-primary/60 uppercase">
                                                {ipo.openingDay}
                                            </span>
                                        )}
                                        {ipo.openingDate && (
                                            <span className="text-[9px] font-medium text-primary/40 uppercase bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10">
                                                {new Date(ipo.openingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col p-3.5 rounded-2xl border border-muted/50 bg-muted/10 hover:border-muted-foreground/30 transition-all text-left">
                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5 leading-none text-left">
                                        <Clock className="w-3 h-3" /> End Date
                                    </span>
                                    <span className="text-[14px] font-black text-foreground/80 leading-tight truncate text-left">
                                        {ipo.date_range.split(/ to | - |-|–|—/)[1]?.trim() || "N/A"}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-x-1.5 mt-1">
                                        {ipo.closingDay && (
                                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                                                Ends {ipo.closingDay}
                                            </span>
                                        )}
                                        {ipo.closingDate && (
                                            <span className="text-[9px] font-medium text-muted-foreground/40 uppercase bg-muted/20 px-1.5 py-0.5 rounded-md border border-muted/30">
                                                {new Date(ipo.closingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Investor Note */}
                        {ipo.full_text && (
                            <div className="p-4 rounded-2xl border border-muted/30 bg-muted/5 space-y-2 relative group overflow-hidden text-left">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-primary/60" /> Investor Insights
                                </span>
                                <p className="text-[11px] font-medium text-foreground/70 leading-relaxed italic border-l-2 border-primary/20 pl-3">
                                    "{ipo.full_text}"
                                </p>
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary/40 transition-colors" />
                            </div>
                        )}
                    </div>

                    {/* Sticky Footer */}
                    <div className="p-4 bg-muted/30 backdrop-blur-md border-t border-primary/5 shrink-0 relative z-20">
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="rounded-xl font-bold text-[10px] uppercase tracking-widest h-11 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all group"
                                onClick={() => window.open(ipo.url, '_blank')}
                            >
                                <ExternalLink className="w-3.5 h-3.5 mr-2 group-hover:scale-110 transition-transform" />
                                Source Details
                            </Button>
                            <Button
                                className="rounded-xl font-bold text-[10px] uppercase tracking-widest h-11 shadow-lg shadow-primary/20 bg-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                onClick={() => {
                                    if (ipo.status === 'open') {
                                        window.open('https://meroshare.cdsc.com.np/', '_blank');
                                    } else {
                                        onOpenChange(false);
                                    }
                                }}
                            >
                                {ipo.status === 'open' ? (
                                    <>Apply Now <ArrowRight className="w-3.5 h-3.5 animate-pulse" /></>
                                ) : 'Understood'}
                            </Button>
                        </div>

                        {ipo.announcement_date && (
                            <div className="flex items-center justify-center gap-2 mt-3 grayscale opacity-30">
                                <History className="w-2.5 h-2.5" />
                                <p className="text-[8px] font-bold uppercase tracking-[0.1em]">
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
