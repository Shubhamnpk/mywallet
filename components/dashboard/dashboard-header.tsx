"use client"
import { Button } from "@/components/ui/button"
import { Wallet, Settings, Menu } from "lucide-react"
import { useRouter } from "next/navigation"
import type { UserProfile } from "@/types/wallet"
import { ThemeToggle } from "@/components/ui/theme-toggle"

interface DashboardHeaderProps {
  userProfile: UserProfile
}

export function DashboardHeader({ userProfile }: DashboardHeaderProps) {
  const router = useRouter()

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">MyWallet</h1>
            <p className="text-sm text-muted-foreground">Hi, {userProfile.name}!</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex">
            <ThemeToggle />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex"
            onClick={() => router.push("/settings")}
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="icon" className="sm:hidden">
            <Menu className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
