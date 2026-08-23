"use client"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { CombinedBalanceCard } from "@/components/dashboard/balance-card"
import { FloatingAddButton } from "@/components/dashboard/floating-add-button"
import { MainTabs } from "@/components/dashboard/main-tabs"
import { BiometricCrossDevicePrompt } from "@/components/security/biometric-cross-device-prompt"
import { useWalletData } from "@/contexts/wallet-data-context"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FullPageSpinner } from "@/components/ui/full-page-spinner"
import { TourOverlay, type TourStep } from "@/components/tour/tour-overlay"

const TOUR_DONE_KEY = "wallet_tour_done"

function getTourSteps(isDesktop: boolean): TourStep[] {
  if (isDesktop) {
    return [
      {
        targetSelector: '[data-tour="header-greeting"]',
        title: "Welcome to MyWallet",
        description:
          "Your personal finance dashboard. Manage transactions, track budgets, set goals, and explore powerful tools - all in one place.",
        position: "bottom",
      },
      {
        targetSelector: '[data-tour="current-balance"]',
        title: "Current Balance",
        description:
          "This is your total balance. Use the eye icon to toggle visibility. The card color changes based on your balance status.",
        position: "bottom",
      },
      {
        targetSelector: '[data-tour="income-card"]',
        title: "Income",
        description:
          "Track your total income for the current period. The green card shows how much money has come in.",
        position: "bottom",
      },
      {
        targetSelector: '[data-tour="expenses-card"]',
        title: "Expenses",
        description:
          "Keep an eye on your total expenses. The red card shows how much has been spent.",
        position: "bottom",
      },
      {
        targetSelector: '[data-tour="period-filter"]',
        title: "Monthly or All Time",
        description:
          "Switch between Monthly and All Time views to see your income and expenses for the current month or your entire history.",
        position: "bottom",
      },
      {
        targetSelector: '[data-tour="fab"]',
        title: "Quick Actions",
        description:
          "Tap to add transactions, scan receipts, use the calculator, and more. Hover to see all options.",
        position: "left",
      },
      {
        targetSelector: '[data-tour="tab-transactions"]',
        title: "Transactions",
        description: "View and manage all your income and expenses. Add, edit, or filter transactions anytime.",
        position: "bottom",
      },
      {
        targetSelector: '[data-tour="tab-budgets"]',
        title: "Budgets",
        description: "Set spending limits for different categories and track your progress with visual indicators.",
        position: "bottom",
      },
      {
        targetSelector: '[data-tour="tab-goals"]',
        title: "Goals",
        description: "Plan your financial goals, track savings progress, and stay motivated with deadline reminders.",
        position: "bottom",
      },
      {
        targetSelector: '[data-tour="tab-tools"]',
        title: "Tools Hub",
        description:
          "Access calculators, scanner, document vault, games, and more from the tools hub.",
        position: "bottom",
      },
    ]
  }

  return [
    {
      targetSelector: '[data-tour="current-balance"]',
      title: "Current Balance",
      description:
        "This is your total balance. Tap the eye icon to show or hide your balance.",
      position: "bottom",
    },
    {
      targetSelector: '[data-tour="income-card"]',
      title: "Income",
      description:
        "Your total income for the period - money coming in, shown in the green card.",
      position: "bottom",
    },
    {
      targetSelector: '[data-tour="expenses-card"]',
      title: "Expenses",
      description:
        "Your total expenses - money going out, shown in the red card.",
      position: "bottom",
    },
    {
      targetSelector: '[data-tour="period-filter"]',
      title: "Monthly or All Time",
      description:
        "Switch between Monthly and All Time to see income and expenses for this month or your full history.",
      position: "bottom",
    },
    {
      targetSelector: '[data-tour="fab"]',
      title: "Quick Actions",
      description:
        "Tap to add transactions, scan receipts, use the calculator, and more. Long-press to see all options.",
      position: "left",
    },
    {
      targetSelector: '[data-tour="tab-transactions"]',
      title: "Transactions",
      description: "View and manage all your income and expenses. Add, edit, or filter transactions anytime.",
      position: "top",
    },
    {
      targetSelector: '[data-tour="tab-budgets"]',
      title: "Budgets",
      description: "Set spending limits for different categories and track your progress with visual indicators.",
      position: "top",
    },
    {
      targetSelector: '[data-tour="tab-goals"]',
      title: "Goals",
      description: "Plan your financial goals, track savings progress, and stay motivated with deadline reminders.",
      position: "top",
    },
    {
      targetSelector: '[data-tour="tab-tools"]',
      title: "Tools Hub",
      description:
        "Access calculators, scanner, document vault, games, and more from the tools hub.",
      position: "top",
    },
  ]
}

export function MyWalletPageClient() {
  const router = useRouter()
  const walletData = useWalletData()
  const { userProfile, showOnboarding } = walletData
  const [mobileFullscreenTab, setMobileFullscreenTab] = useState<string | null>(null)
  const [showTour, setShowTour] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (!userProfile && showOnboarding) {
      router.replace("/welcome")
    }
  }, [userProfile, showOnboarding, router])

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    if (userProfile && typeof window !== "undefined") {
      const done = localStorage.getItem(TOUR_DONE_KEY)
      if (done !== "true") {
        const timer = setTimeout(() => setShowTour(true), 800)
        return () => clearTimeout(timer)
      }
    }
  }, [userProfile])

  const handleTourComplete = () => {
    localStorage.setItem(TOUR_DONE_KEY, "true")
    setShowTour(false)
  }

  if (!userProfile) {
    return <FullPageSpinner />
  }

  const isFullscreen = !!mobileFullscreenTab

  return (
    <div className="min-h-screen bg-background">
      {!isFullscreen && <DashboardHeader />}

      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${isFullscreen ? "" : "py-6 space-y-6"}`}>
        {!isFullscreen && <CombinedBalanceCard />}
        {!isFullscreen && <FloatingAddButton />}
        <MainTabs
          mobileFullscreenTab={mobileFullscreenTab}
          onMobileFullscreenChange={setMobileFullscreenTab}
        />
      </div>

      {showTour && <TourOverlay steps={getTourSteps(isDesktop)} onComplete={handleTourComplete} />}

      <BiometricCrossDevicePrompt
        userProfile={userProfile}
        onUpdateProfile={(updates) => {
          if (userProfile) {
            void walletData.updateUserProfile({ ...userProfile, ...updates })
          }
        }}
        onEnableBiometric={() => {
          router.push("/settings?tab=security&biometric=true")
        }}
      />
    </div>
  )
}
