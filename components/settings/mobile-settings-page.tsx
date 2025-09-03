"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { UserProfileSettings } from "./user-settings"
import { SecuritySettings } from "./security-settings"
import { ThemeSettings } from "./theme-settings"
import { DataSettings } from "./data-settings"
import { AccessibilitySettings } from "./accessibility-settings"
import { AboutSettings } from "./about-settings"
import { useWalletData } from "@/contexts/wallet-data-context"
import { getCurrencySymbol } from "@/lib/currency"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Search,
  User,
  Shield,
  Palette,
  Database,
  Accessibility,
  Info,
  Wifi,
  Bluetooth,
  Volume2,
  Battery,
  Moon,
  Lock,
  Star,
  ChevronRight,
  Home
} from "lucide-react"

interface MobileSettingsPageProps {
  onClose: () => void
}

type SettingsView = "main" | "profile" | "security" | "theme" | "data" | "accessibility" | "about"

export function MobileSettingsPage({ onClose }: MobileSettingsPageProps) {
  const [currentView, setCurrentView] = useState<SettingsView>("main")
  const [searchQuery, setSearchQuery] = useState("")
  const { userProfile } = useWalletData()
  const router = useRouter()

  const getInitials = () => {
    return userProfile?.name
      ? userProfile.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "U"
  }

  const getCurrentCurrencySymbol = () => {
    return getCurrencySymbol(userProfile?.currency || "USD", userProfile?.customCurrency)
  }

  // Settings items data
  const allSettingsItems = [
    {
      id: "profile",
      icon: <User className="w-6 h-6" />,
      iconBg: "bg-blue-600",
      title: "Profile",
      subtitle: "Personal info • Currency",
      category: "account",
      keywords: ["profile", "account", "personal", "info", "currency", "name", "avatar"]
    },
    {
      id: "security",
      icon: <Shield className="w-6 h-6" />,
      iconBg: "bg-red-600",
      title: "Security",
      subtitle: "PIN • Biometric • Emergency access",
      category: "account",
      keywords: ["security", "pin", "biometric", "emergency", "access", "password", "lock"]
    },
    {
      id: "theme",
      icon: <Palette className="w-6 h-6" />,
      iconBg: "bg-pink-600",
      title: "Theme",
      subtitle: "Appearance • Colors • Accessibility",
      category: "personalization",
      keywords: ["theme", "appearance", "colors", "dark", "light", "accessibility", "visual"]
    },
    {
      id: "data",
      icon: <Database className="w-6 h-6" />,
      iconBg: "bg-teal-600",
      title: "Data",
      subtitle: "Backup • Import • Export",
      category: "system",
      keywords: ["data", "backup", "import", "export", "sync", "storage"]
    },
    {
      id: "accessibility",
      icon: <Accessibility className="w-6 h-6" />,
      iconBg: "bg-orange-600",
      title: "Accessibility",
      subtitle: "Audio • Visual • Motion",
      category: "system",
      keywords: ["accessibility", "audio", "visual", "motion", "screen reader", "keyboard"]
    },
    {
      id: "about",
      icon: <Info className="w-6 h-6" />,
      iconBg: "bg-gray-600",
      title: "About",
      subtitle: "Version • Support • Legal",
      category: "system",
      keywords: ["about", "version", "support", "legal", "help", "info"]
    },
   
  ]

  // Filter settings items based on search query
  const filteredSettingsItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return allSettingsItems
    }

    const query = searchQuery.toLowerCase()
    return allSettingsItems.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.subtitle.toLowerCase().includes(query) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(query))
    )
  }, [searchQuery])

  const renderMainView = () => (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center px-4 py-2 bg-background text-sm font-medium text-muted-foreground sticky top-0 z-10">
        <Button
          size="sm"
          onClick={onClose}
          className="mr-1 p-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl mr-1 p-1 mt-4 font-normal text-primary mb-4">Settings</h1>
      </div>

      {/* Header */}
      <div className="px-4 py-6 bg-background">
        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-card-500">
            <Search className="w-4 h-4" />
          </div>
          <Input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-12 py-3 rounded-full bg-card-100 dark:bg-gray-700 border-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {/* User Profile */}
        <div className="flex items-center p-4 mb-4 bg-card rounded-xl cursor-pointer hover:bg-muted transition-colors"
             onClick={() => setCurrentView("profile")}>
          <div className="flex-1">
            <div className="font-medium text-lg text-gray-900 dark:text-white mb-1">
              {userProfile?.name || "Unnamed User"}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {getCurrentCurrencySymbol()} • myWallet lovelyUser
            </div>
          </div>
          <Avatar className="w-12 h-12 mr-4">
            <AvatarImage src={userProfile?.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary font-bold text-2xl shadow-inner">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Backup Suggestion */}
        <div className="p-3 mb-1 bg-card rounded-xl shadow-sm">
          <div className="flex items-center">
            <div className="flex-1">
              <div className="font-small text-gray-900 dark:text-white mb-1">
                Protect your data with backups
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                1 more suggestion
              </div>
            </div>
            <div className="text-xl ml-4">✨</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className=" px-4 pb-4 bg-background overflow-y-auto scrollbar-hide">
        {/* Settings Items */}
        <div className="space-y-1">
          {filteredSettingsItems.length > 0 ? (
            filteredSettingsItems.map((item) => (
              <SettingsItem
                key={item.id}
                icon={item.icon}
                iconBg={item.iconBg}
                title={item.title}
                subtitle={item.subtitle}
                onClick={() => {
                  if (item.id === "profile" || item.id === "security" || item.id === "theme" ||
                      item.id === "data" || item.id === "accessibility" || item.id === "about") {
                    setCurrentView(item.id as SettingsView)
                  }
                  // For other items, you could add navigation or actions here
                }}
              />
            ))
          ) : searchQuery.trim() ? (
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-500 mb-2">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No settings found for "{searchQuery}"
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-primary"
              >
                Clear search
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )

  const renderDetailView = () => {
    const getTitle = () => {
      switch (currentView) {
        case "profile": return "Profile"
        case "security": return "Security"
        case "theme": return "Theme"
        case "data": return "Data"
        case "accessibility": return "Accessibility"
        case "about": return "About"
        default: return "Settings"
      }
    }

    const renderContent = () => {
      switch (currentView) {
        case "profile": return <UserProfileSettings />
        case "security": return <SecuritySettings />
        case "theme": return <ThemeSettings />
        case "data": return <DataSettings />
        case "accessibility": return <AccessibilitySettings />
        case "about": return <AboutSettings />
        default: return null
      }
    }

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center px-4 py-4 bg-card border-b border-border sticky top-0 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView("main")}
            className="mr-4 p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-medium text-gray-900 dark:text-white">{getTitle()}</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-muted scrollbar-hide">
          <div className="p-4">
            {renderContent()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-hidden">
      {currentView === "main" ? renderMainView() : renderDetailView()}
    </div>
  )
}

interface SettingsItemProps {
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
  hasToggle?: boolean
  toggleOff?: boolean
  onClick: () => void
}

function SettingsItem({ icon, iconBg, title, subtitle, hasToggle, toggleOff, onClick }: SettingsItemProps) {
  return (
    <div
      className="flex items-center p-4 bg-card rounded-xl cursor-pointer hover:bg-muted transition-colors"
      onClick={onClick}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mr-4 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900 dark:text-white">{title}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</div>
      </div>
      {hasToggle ? (
        <div className="mr-4" onClick={(e) => e.stopPropagation()}>
          <Switch checked={!toggleOff} />
        </div>
      ) : (
        <ChevronRight className="w-5 h-5 text-gray-400" />
      )}
    </div>
  )
}
