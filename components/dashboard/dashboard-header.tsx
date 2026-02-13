"use client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Share } from "lucide-react"
import { useRouter } from "next/navigation"
import type { UserProfile } from "@/types/wallet"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { OfflineBadge } from "@/components/ui/offline-badge"
import { useEffect, useMemo, useState } from "react"
import { ShareModal } from "@/components/dashboard/share-modal"
import { useWalletData } from "@/contexts/wallet-data-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

const HEADER_NOTIFICATIONS_READ_KEY = "wallet_header_notifications_read_v1"

type HeaderNotification = {
  id: string
  title: string
  description: string
  type: "warning" | "info" | "success"
}

interface DashboardHeaderProps {
  userProfile: UserProfile
}

export function DashboardHeader({ userProfile }: DashboardHeaderProps) {
  const router = useRouter()
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [readMap, setReadMap] = useState<Record<string, boolean>>({})
  const { budgets, goals, upcomingIPOs } = useWalletData()

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(HEADER_NOTIFICATIONS_READ_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === "object") {
          setReadMap(parsed)
        }
      }
    } catch {
    }
  }, [])

  const notifications = useMemo<HeaderNotification[]>(() => {
    const items: HeaderNotification[] = []
    const now = new Date()

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
          })
        } else if (usage >= 80) {
          items.push({
            id: `budget-near-${b.id}`,
            title: `${b.name || b.category} near limit`,
            description: `${usage.toFixed(0)}% used.`,
            type: "info",
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
          })
        }
      })

    if (userProfile.meroShare?.shareFeaturesEnabled && userProfile.meroShare?.shareNotificationsEnabled) {
      upcomingIPOs.forEach((ipo) => {
        const ipoId = ipo.company || ipo.url || ipo.date_range
        if (ipo.status === "open") {
          const isClosingSoon = typeof ipo.daysRemaining === "number" && ipo.daysRemaining <= 1
          items.push({
            id: isClosingSoon ? `ipo-close-${ipoId}` : `ipo-open-${ipoId}`,
            title: isClosingSoon ? `${ipo.company} closing soon` : `${ipo.company} open now`,
            description: isClosingSoon
              ? `Closing ${ipo.daysRemaining === 0 ? "today" : "tomorrow"}.`
              : "IPO is currently open for application.",
            type: isClosingSoon ? "warning" : "success",
          })
        } else if (ipo.status === "upcoming" && typeof ipo.daysRemaining === "number" && ipo.daysRemaining <= 1) {
          items.push({
            id: `ipo-open-soon-${ipoId}`,
            title: `${ipo.company} opening soon`,
            description: `Starts ${ipo.daysRemaining === 0 ? "today" : "tomorrow"}.`,
            type: "info",
          })
        }
      })
    }

    return items.slice(0, 15)
  }, [budgets, goals, upcomingIPOs, userProfile.meroShare?.shareFeaturesEnabled, userProfile.meroShare?.shareNotificationsEnabled])

  const unreadCount = notifications.filter((n) => !readMap[n.id]).length

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
    if (notifications.length === 0) return
    const next = { ...readMap }
    notifications.forEach((n) => {
      next[n.id] = true
    })
    persistReadMap(next)
  }

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
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
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
            <DropdownMenuContent align="end" className="w-[320px] p-0">
              <div className="px-3 py-2 flex items-center justify-between border-b">
                <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              </div>
              <div className="max-h-[320px] overflow-y-auto py-1">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="items-start gap-2 py-2"
                      onSelect={() => markAsRead(n.id)}
                    >
                      <span
                        className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                          n.type === "warning" ? "bg-amber-500" : n.type === "success" ? "bg-emerald-500" : "bg-blue-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          {!readMap[n.id] && <Badge variant="secondary" className="text-[10px] h-4 px-1">New</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{n.description}</p>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications right now.</div>
                )}
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/settings?tab=notifications")}>
                  Notification Settings
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

           <div className="hidden sm:flex">
             <OfflineBadge />
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
            <OfflineBadge />
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
    </header>
  )
}
