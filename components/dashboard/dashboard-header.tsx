"use client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Wallet, Settings, Menu, Share, Share2 } from "lucide-react"
import { useRouter } from "next/navigation"
import type { UserProfile } from "@/types/wallet"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { OfflineBadge } from "@/components/ui/offline-badge"
import { useState } from "react"
import { ShareModal } from "@/components/dashboard/share-modal"

interface DashboardHeaderProps {
  userProfile: UserProfile
}

export function DashboardHeader({ userProfile }: DashboardHeaderProps) {
  const router = useRouter()
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

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
