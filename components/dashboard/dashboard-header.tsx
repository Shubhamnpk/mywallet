"use client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertTriangle, Bell, CheckCircle2, Clock, ExternalLink, PiggyBank, ReceiptText, Settings, Share, Target, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"
import type { UpcomingIPO, UserProfile } from "@/types/wallet"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useEffect, useMemo, useState } from "react"
import { ShareModal } from "@/components/dashboard/share-modal"
import { useWalletData } from "@/contexts/wallet-data-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BillReminderSystem } from "@/components/productivity/bill-reminder-system"
import { IPODetailModal } from "@/components/portfolio/modals/ipo-detail-modal"
import { loadFromLocalStorage } from "@/lib/storage"
import {
  clearNotificationHistory,
  NOTIFICATION_HISTORY_EVENT,
  readNotificationHistory,
  type NotificationHistoryItem,
} from "@/lib/notification-history"

const HEADER_NOTIFICATIONS_READ_KEY = "wallet_header_notifications_read_v1"
const LIVE_NOTIFICATION_WINDOW_MS = 24 * 60 * 60 * 1000

type HeaderNotification = {
  id: string
  title: string
  description: string
  type: "warning" | "info" | "success"
  category: "budget" | "goal" | "bill" | "ipo" | "delivered"
  actionLabel: string
  targetTab?: string
  opensBillDialog?: boolean
  ipo?: UpcomingIPO
  settingsUrl?: string
  sourceLabel?: string
  deliveredAt?: number
}

type HeaderBillRow = {
  id: string
  name: string
  amount: number
  dueDate: string
  isPaid: boolean
  reminderDays: number
}

interface DashboardHeaderProps {
  userProfile: UserProfile
}

export function DashboardHeader({ userProfile }: DashboardHeaderProps) {
  const router = useRouter()
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [readMap, setReadMap] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {}
    try {
      const raw = localStorage.getItem(HEADER_NOTIFICATIONS_READ_KEY)
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === "object" ? parsed : {}
    } catch {
      return {}
    }
  })
  const { budgets, goals, upcomingIPOs } = useWalletData()
  const isAutoIpoEnabled = Boolean(userProfile.meroShare?.isAutomatedEnabled)
  const [billRows, setBillRows] = useState<HeaderBillRow[]>([])
  const [billDialogOpen, setBillDialogOpen] = useState(false)
  const [selectedIPO, setSelectedIPO] = useState<UpcomingIPO | null>(null)
  const [ipoDialogOpen, setIpoDialogOpen] = useState(false)
  const [history, setHistory] = useState<NotificationHistoryItem[]>(() =>
    typeof window !== "undefined" ? readNotificationHistory() : [],
  )

  const reloadBills = () => {
    void (async () => {
      try {
        const stored = await loadFromLocalStorage(["wallet_bill_reminders"])
        const raw = stored.wallet_bill_reminders
        setBillRows(Array.isArray(raw) ? raw : [])
      } catch {
        setBillRows([])
      }
    })()
  }

  useEffect(() => {
    reloadBills()
  }, [])

  useEffect(() => {
    const sync = () => setHistory(readNotificationHistory())
    window.addEventListener(NOTIFICATION_HISTORY_EVENT, sync)
    return () => window.removeEventListener(NOTIFICATION_HISTORY_EVENT, sync)
  }, [])

  const notifications = useMemo<HeaderNotification[]>(() => {
    const items: HeaderNotification[] = []
    const now = new Date()
    const dayMs = 24 * 60 * 60 * 1000

    budgets
      .filter((b) => b.limit > 0)
      .forEach((b) => {
        const usage = (b.spent / b.limit) * 100
        if (usage >= 100) {
          items.push({
            id: `budget-over-${b.id}`,
            title: `${b.name || b.category} over budget`,
            description: `You spent ${usage.toFixed(0)}% of your limit.`,
            type: "warning",
            category: "budget",
            actionLabel: "Review Budget",
            targetTab: "budgets",
          })
        } else if (usage >= 80) {
          items.push({
            id: `budget-near-${b.id}`,
            title: `${b.name || b.category} near limit`,
            description: `${usage.toFixed(0)}% used.`,
            type: "info",
            category: "budget",
            actionLabel: "Review Budget",
            targetTab: "budgets",
          })
        }
      })

    goals
      .filter((g) => g.targetAmount > 0 && g.currentAmount < g.targetAmount)
      .forEach((g) => {
        const goalDate = new Date(g.targetDate)
        if (Number.isNaN(goalDate.getTime())) return
        const daysLeft = Math.ceil((goalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        if (daysLeft <= 7) {
          items.push({
            id: `goal-deadline-${g.id}`,
            title: `${g.title || g.name || "Goal"} deadline`,
            description: daysLeft < 0 ? "Target date passed." : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`,
            type: daysLeft <= 3 ? "warning" : "info",
            category: "goal",
            actionLabel: "Open Goals",
            targetTab: "goals",
          })
        }
      })

    billRows
      .filter((b) => !b.isPaid)
      .forEach((bill) => {
        const due = new Date(bill.dueDate)
        if (Number.isNaN(due.getTime())) return
        const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / dayMs)
        const name = bill.name?.trim() || "Bill"
        const lead = Math.max(1, Math.min(30, bill.reminderDays || 3))
        if (daysUntilDue < 0) {
          items.push({
            id: `bill-overdue-${bill.id}`,
            title: `Bill overdue: ${name}`,
            description: "Past due date — mark paid or reschedule.",
            type: "warning",
            category: "bill",
            actionLabel: "Manage Bill",
            opensBillDialog: true,
          })
        } else if (daysUntilDue === 0) {
          items.push({
            id: `bill-due-today-${bill.id}`,
            title: `Bill due today: ${name}`,
            description: "Due today.",
            type: "warning",
            category: "bill",
            actionLabel: "Manage Bill",
            opensBillDialog: true,
          })
        } else if (daysUntilDue > 0 && daysUntilDue <= lead) {
          items.push({
            id: `bill-soon-${bill.id}`,
            title: `Bill due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}: ${name}`,
            description: `Within your ${lead}-day reminder window.`,
            type: "info",
            category: "bill",
            actionLabel: "Manage Bill",
            opensBillDialog: true,
          })
        }
      })

    if (isAutoIpoEnabled) {
      upcomingIPOs.forEach((ipo, index) => {
        const ipoId = `${ipo.company || ipo.url || ipo.date_range || "ipo"}-${ipo.status || "unknown"}-${ipo.openingDate || ipo.announcement_date || ipo.date_range || index}-${index}`
        if (ipo.status === "open") {
          const isClosingSoon = typeof ipo.daysRemaining === "number" && ipo.daysRemaining <= 1
          items.push({
            id: isClosingSoon ? `ipo-close-${ipoId}` : `ipo-open-${ipoId}`,
            title: isClosingSoon ? `${ipo.company} closing soon` : `${ipo.company} open now`,
            description: isClosingSoon
              ? `Closing ${ipo.daysRemaining === 0 ? "today" : "tomorrow"}.`
              : "IPO is currently open for application.",
            type: isClosingSoon ? "warning" : "success",
            category: "ipo",
            actionLabel: "View IPO",
            ipo,
          })
        } else if (ipo.status === "upcoming" && typeof ipo.daysRemaining === "number" && ipo.daysRemaining <= 1) {
          items.push({
            id: `ipo-open-soon-${ipoId}`,
            title: `${ipo.company} opening soon`,
            description: `Starts ${ipo.daysRemaining === 0 ? "today" : "tomorrow"}.`,
            type: "info",
            category: "ipo",
            actionLabel: "View IPO",
            ipo,
          })
        }
      })
    }
    return items.slice(0, 15)
  }, [
    budgets,
    goals,
    upcomingIPOs,
    isAutoIpoEnabled,
    billRows,
  ])

  const { liveDeliveredNotifications, archivedDeliveredNotifications } = useMemo(() => {
    const cutoff = Date.now() - LIVE_NOTIFICATION_WINDOW_MS
    const live = history.filter((item) => item.at >= cutoff)
    const archived = history.filter((item) => item.at < cutoff)
    return {
      liveDeliveredNotifications: live,
      archivedDeliveredNotifications: archived,
    }
  }, [history])

  const deliveredLiveItems = useMemo<HeaderNotification[]>(() => {
    return liveDeliveredNotifications.map((item) => ({
      id: `delivered-${item.id}`,
      title: item.title,
      description: item.body,
      type:
        item.source === "budget" || item.source === "bill"
          ? "warning"
          : item.source === "ipo"
            ? "success"
            : "info",
      sourceLabel: `${item.source} · ${item.channel}`,
      deliveredAt: item.at,
      category: "delivered",
      actionLabel:
        item.source === "bill"
          ? "Manage Bill"
          : item.source === "budget"
            ? "Review Budget"
            : item.source === "ipo"
              ? "Open IPOs"
              : "Open Settings",
      opensBillDialog: item.source === "bill",
      targetTab: item.source === "budget" ? "budgets" : item.source === "ipo" ? "portfolio" : undefined,
      settingsUrl: item.source !== "bill" && item.source !== "budget" && item.source !== "ipo" ? "/settings?tab=notifications" : undefined,
    }))
  }, [liveDeliveredNotifications])

  const liveNotifications = useMemo<HeaderNotification[]>(
    () => [...deliveredLiveItems, ...notifications].slice(0, 40),
    [deliveredLiveItems, notifications],
  )

  const unreadCount = liveNotifications.filter((n) => !readMap[n.id]).length

  const persistReadMap = (next: Record<string, boolean>) => {
    setReadMap(next)
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(HEADER_NOTIFICATIONS_READ_KEY, JSON.stringify(next))
    } catch {
    }
  }

  const markAsRead = (id: string) => {
    if (readMap[id]) return
    persistReadMap({ ...readMap, [id]: true })
  }

  const markAllAsRead = () => {
    if (liveNotifications.length === 0) return
    const next = { ...readMap }
    liveNotifications.forEach((n) => {
      next[n.id] = true
    })
    persistReadMap(next)
  }

  const navigateToTab = (tab: string) => {
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", `/?tab=${tab}`)
      window.dispatchEvent(new CustomEvent("mywallet:navigate-tab", { detail: tab }))
    } else {
      router.push(`/?tab=${tab}`)
    }
  }

  const handleNotificationAction = (notification: HeaderNotification) => {
    markAsRead(notification.id)
    if (notification.opensBillDialog) {
      setBillDialogOpen(true)
      return
    }
    if (notification.ipo) {
      setSelectedIPO(notification.ipo)
      setIpoDialogOpen(true)
      return
    }
    if (notification.targetTab) {
      navigateToTab(notification.targetTab)
      return
    }
    if (notification.settingsUrl) {
      router.push(notification.settingsUrl)
    }
  }

  const getNotificationIcon = (notification: HeaderNotification) => {
    if (notification.category === "budget") return <PiggyBank className="w-4 h-4" />
    if (notification.category === "goal") return <Target className="w-4 h-4" />
    if (notification.category === "bill") return <ReceiptText className="w-4 h-4" />
    if (notification.category === "ipo") return <TrendingUp className="w-4 h-4" />
    if (notification.type === "warning") return <AlertTriangle className="w-4 h-4" />
    if (notification.type === "success") return <CheckCircle2 className="w-4 h-4" />
    return <Bell className="w-4 h-4" />
  }

  const getNotificationToneClass = (type: HeaderNotification["type"]) =>
    type === "warning"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
      : type === "success"
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
        : "border-blue-500/20 bg-blue-500/10 text-blue-600"

  const getInitials = () => {
    return userProfile.name
      ? userProfile.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "U"
  }

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <img src="/image.png" alt="MyWallet Logo" width={34} height={34} />
          </div>
          <div>
            <h1 className="text-xl font-bold">MyWallet</h1>
            <p className="text-sm text-muted-foreground">Hi, {userProfile.name}!</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative flex justify-center items-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg"
                aria-label="Open notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[380px] p-0 overflow-hidden">
              <div className="px-3 py-3 flex items-center justify-between border-b bg-muted/20">
                <div>
                  <DropdownMenuLabel className="p-0 text-sm font-black">Notifications</DropdownMenuLabel>
                  <p className="text-[11px] text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? "" : "s"}` : "All caught up"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs font-bold" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              </div>
              <Tabs defaultValue="live" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-none border-b h-9">
                  <TabsTrigger value="live" className="text-xs rounded-none">
                    Live
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs rounded-none">
                    History
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="live" className="mt-0 max-h-[340px] overflow-y-auto p-1.5">
                  {liveNotifications.length > 0 ? (
                    liveNotifications.map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        className={`group mb-1.5 cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-foreground focus:text-foreground dark:focus:text-white ${readMap[n.id] ? "bg-card/70 focus:bg-muted/50" : "border-primary/25 bg-primary/5 focus:bg-primary/10"}`}
                        onSelect={() => handleNotificationAction(n)}
                      >
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${getNotificationToneClass(n.type)}`}>
                          {getNotificationIcon(n)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-black leading-snug text-foreground group-focus:text-foreground dark:group-focus:text-white">{n.title}</p>
                            {!readMap[n.id] && <Badge variant="secondary" className="text-[10px] h-4 px-1">New</Badge>}
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 group-focus:text-muted-foreground">{n.description}</p>
                          {(n.sourceLabel || n.deliveredAt) && (
                            <p className="text-[9px] text-muted-foreground mt-1 inline-flex items-center gap-1 group-focus:text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {n.sourceLabel ? `${n.sourceLabel}${n.deliveredAt ? " · " : ""}` : ""}
                              {n.deliveredAt ? new Date(n.deliveredAt).toLocaleString() : ""}
                            </p>
                          )}
                          <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-primary group-focus:text-primary">
                            {n.actionLabel}
                            <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="px-3 py-8 text-center">
                      <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                      <p className="text-sm font-semibold">No alerts right now.</p>
                      <p className="text-xs text-muted-foreground">New reminders and IPO alerts will appear here.</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="history" className="mt-0 max-h-[320px] overflow-y-auto py-1 px-2 pb-2">
                  {archivedDeliveredNotifications.length > 0 ? (
                    <ul className="space-y-2">
                      {archivedDeliveredNotifications.slice(0, 40).map((h) => (
                        <li key={h.id} className="rounded-md border bg-muted/20 px-2 py-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{h.title}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {new Date(h.at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-muted-foreground line-clamp-2">{h.body}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {h.source} · {h.channel}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="py-6 text-center text-sm text-muted-foreground">No notifications in history yet.</div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 h-8 text-xs"
                    onClick={() => {
                      clearNotificationHistory()
                      setHistory(readNotificationHistory())
                    }}
                  >
                    Clear history
                  </Button>
                </TabsContent>
              </Tabs>
              <DropdownMenuSeparator />
              <div className="p-2 space-y-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setBillDialogOpen(true)
                  }}
                >
                  <ReceiptText className="mr-2 h-4 w-4" />
                  Bill reminders
                </Button>
                <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/settings?tab=notifications")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Notification settings
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

           <div className="hidden sm:flex">
             <ThemeToggle />
           </div>

          <button
            className="hidden sm:flex justify-center items-center w-10 h-10 rounded-full border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg"
            onClick={() => setIsShareModalOpen(true)}
            aria-label="Share app"
            title="Share MyWallet"
          >
            <Share className="w-5 h-5 text-primary transition-transform duration-200 hover:scale-110" />
          </button>

          <button
            className="hidden sm:flex w-10 h-10 rounded-full border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg"
            onClick={() => router.push("/settings")}
            aria-label="Open settings"
            title="Settings & Profile"
          >
            <Avatar className="w-full h-full">
              <AvatarImage
                src={userProfile.avatar || undefined}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-base">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </button>

          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggle />
            <button
              className="flex justify-center items-center w-9 h-9 rounded-full border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg"
              onClick={() => setIsShareModalOpen(true)}
              aria-label="Share app"
              title="Share MyWallet"
            >
              <Share className="w-4 h-4 text-primary transition-transform duration-200 hover:scale-110" />
            </button>
            <button
              className="w-9 h-9 rounded-full border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg"
              onClick={() => router.push("/settings")}
              aria-label="Open settings"
              title="Settings & Profile"
            >
              <Avatar className="w-full h-full">
                <AvatarImage
                  src={userProfile.avatar || undefined}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-sm">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </div>
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
      <Dialog
        open={billDialogOpen}
        onOpenChange={(open) => {
          setBillDialogOpen(open)
          if (!open) reloadBills()
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill reminders</DialogTitle>
          </DialogHeader>
          <BillReminderSystem userProfile={userProfile} />
        </DialogContent>
      </Dialog>
      <IPODetailModal
        ipo={selectedIPO}
        open={ipoDialogOpen}
        onOpenChange={(open) => {
          setIpoDialogOpen(open)
          if (!open) setSelectedIPO(null)
        }}
      />
    </header>
  )
}
