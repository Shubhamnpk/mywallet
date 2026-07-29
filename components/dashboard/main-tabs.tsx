"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {Receipt,PiggyBank,Target,CreditCard,TrendingUp,FolderOpen,Briefcase,LayoutGrid,Clock,Trash2,Landmark,Scan,ArrowLeft,Calculator,ArrowLeftRight,Gamepad2,FileText} from "lucide-react"
import { TransactionsList } from "@/components/transactions/transactions-list"
import { BudgetsList } from "@/components/budgets/budgets-list"
import { EnhancedGoalsList } from "@/components/goals/goals-list"
import { DebtCreditManagement } from "@/components/debt-credit/debt-credit-management"
import { InsightsPanel } from "@/components/insights/insights-panel"
import { CategoriesManagement } from "@/components/categories/categories-management"
import { PortfolioList } from "@/components/portfolio/portfolio-list"
import { ShiftTracker } from "@/components/tools/shift-tracker"
import { BrokerLeaderboard } from "@/components/tools/broker-leaderboard"
import { ScannerTool } from "@/components/tools/scanner/scan-tool"
import { CalculatorTool } from "@/components/tools/calculator-tool"
import { CurrencyConverterTool } from "@/components/tools/currency-converter-tool"
import { GamesTool } from "@/components/tools/games-tool"
import { DocumentTools } from "@/components/tools/document-tools"
import ReceiptScanner from "@/components/tools/scanner/receipt-dialog"
import { CurrencyConverterDialog } from "@/components/dashboard/currency-converter-dialog"
import { SessionManager } from "@/lib/session-manager"
import { cn } from "@/lib/utils"

type TabDef = {
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  badge?: string | null
}

function pickTab(defs: TabDef[], value: string): TabDef {
  const t = defs.find((x) => x.value === value)
  if (!t) throw new Error(`Unknown tab: ${value}`)
  return t
}

const MOBILE_TOOLS_GROUP = [
  "tools",
  "debt-credit",
  "categories",
  "portfolio",
  "insights",
  "shift-tracker",
  "broker-training",
  "scanner",
  "calculator",
  "currency-converter",
  "games",
  "document-tools",
] as const

const DESKTOP_TOOLS_GROUP = [
  "tools",
  "categories",
  "insights",
  "shift-tracker",
  "broker-training",
  "scanner",
  "calculator",
  "currency-converter",
  "games",
  "document-tools",
] as const

const KNOWN_TAB_VALUES = new Set(["transactions", "budgets", "goals", "categories", "debt-credit", "portfolio", "insights", "shift-tracker", "broker-training", "scanner", "tools", "calculator", "currency-converter", "games", "document-tools"])

function useDelayedTooltip(delay: number = 3000) {
  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
    }, delay)
  }, [delay])

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setShowTooltip(false)
  }, [])

  return { showTooltip, handleMouseEnter, handleMouseLeave }
}

interface MainTabsProps {
  mobileFullscreenTab?: string | null
  onMobileFullscreenChange?: (tab: string | null) => void
}

function getTabLabel(value: string): string {
  const labels: Record<string, string> = {
    transactions: "Transactions",
    budgets: "Budgets",
    goals: "Goals",
    "debt-credit": "Debt & Credit",
    categories: "Categories",
    portfolio: "Portfolio",
    insights: "Insights",
    "shift-tracker": "Shift Tracker",
    "broker-training": "Broker leaderboard",
    scanner: "Scanner",
  }
  return labels[value] ?? value
}

export function MainTabs({ mobileFullscreenTab, onMobileFullscreenChange }: MainTabsProps = {}) {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "transactions"
    const requestedTab = new URLSearchParams(window.location.search).get("tab")
    return requestedTab && KNOWN_TAB_VALUES.has(requestedTab) ? requestedTab : "transactions"
  })
  const toolsContentRef = useRef<HTMLDivElement>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isConverterOpen, setIsConverterOpen] = useState(false)
  const DESKTOP_DIALOG_TOOLS = new Set(["scanner", "calculator", "currency-converter"])

  useEffect(() => {
    const syncFromLocation = () => {
      const requestedTab = new URLSearchParams(window.location.search).get("tab")
      if (requestedTab && KNOWN_TAB_VALUES.has(requestedTab)) {
        setActiveTab(requestedTab)
      }
    }
    const syncFromEvent = (event: Event) => {
      const tab = (event as CustomEvent<string>).detail
      if (tab && KNOWN_TAB_VALUES.has(tab)) setActiveTab(tab)
    }
    window.addEventListener("popstate", syncFromLocation)
    window.addEventListener("mywallet:navigate-tab", syncFromEvent)
    return () => {
      window.removeEventListener("popstate", syncFromLocation)
      window.removeEventListener("mywallet:navigate-tab", syncFromEvent)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "tools" && toolsContentRef.current) {
      setTimeout(() => {
        const element = toolsContentRef.current
        if (!element) return
        const rect = element.getBoundingClientRect()
        const scrollOffset = window.scrollY + rect.top - 100
        window.scrollTo({ top: scrollOffset, behavior: "smooth" })
      }, 150)
    }
  }, [activeTab])

  useEffect(() => {
    if (!onMobileFullscreenChange) return
    const isMobile = window.innerWidth < 1024
    if (isMobile && MOBILE_TOOLS_GROUP.includes(activeTab as any) && activeTab !== "tools") {
      onMobileFullscreenChange(activeTab)
    } else {
      onMobileFullscreenChange(null)
    }
  }, [activeTab, onMobileFullscreenChange])

  useEffect(() => {
    const validateSession = () => {
      if (!SessionManager.isSessionValid()) {
        window.dispatchEvent(new CustomEvent("wallet-session-expired"))
      }
    }
    validateSession()
    const handleClick = () => {
      setTimeout(validateSession, 100)
    }
    document.addEventListener("click", handleClick)
    return () => {
      document.removeEventListener("click", handleClick)
    }
  }, [])

  const allTabs: TabDef[] = [
    {
      value: "transactions",
      label: "Transactions",
      icon: Receipt,
      description: "Track your income and expenses",
    },
    {
      value: "budgets",
      label: "Budgets",
      icon: PiggyBank,
      description: "Manage your spending limits",
    },
    {
      value: "goals",
      label: "Goals",
      icon: Target,
      description: "Save for your dreams",
    },
    {
      value: "debt-credit",
      label: "Debt & Credit",
      icon: CreditCard,
      badge: null,
      description: "Manage debts and credit",
    },
    {
      value: "categories",
      label: "Categories",
      icon: FolderOpen,
      description: "Organize your spending",
    },
    {
      value: "portfolio",
      label: "Portfolio",
      icon: Briefcase,
      description: "Track your Mero Share",
    },
    {
      value: "insights",
      label: "Insights",
      icon: TrendingUp,
      badge: null,
      description: "Financial analytics",
    },
    {
      value: "shift-tracker",
      label: "Shift tracker",
      icon: Clock,
      description: "Log hours and pay from shifts",
    },
    {
      value: "broker-training",
      label: "Broker leaderboard",
      icon: Landmark,
      description: "Browse NEPSE brokers by sector & activity",
    },
    {
      value: "scanner",
      label: "Scanner",
      icon: Scan,
      description: "Scan receipts and QR codes",
    },
    {
      value: "calculator",
      label: "Calculator",
      icon: Calculator,
      description: "Perform quick financial calculations",
    },
    {
      value: "currency-converter",
      label: "Converter",
      icon: ArrowLeftRight,
      description: "Convert between currencies with live rates",
    },
    {
      value: "games",
      label: "Games",
      icon: Gamepad2,
      description: "Play Ping Pong & Tic Tac Toe",
    },
    {
      value: "document-tools",
      label: "Documents",
      icon: FileText,
      description: "Store and manage important documents",
      badge: "Beta",
    },
  ]

  const toolsHubTab: TabDef = {
    value: "tools",
    label: "Tools",
    icon: LayoutGrid,
    description: "Categories, insights, shift work, and more",
  }

  const desktopNavTabs: TabDef[] = [
    pickTab(allTabs, "transactions"),
    pickTab(allTabs, "budgets"),
    pickTab(allTabs, "goals"),
    pickTab(allTabs, "debt-credit"),
    pickTab(allTabs, "portfolio"),
    toolsHubTab,
  ]

  const isDesktopToolsActive = DESKTOP_TOOLS_GROUP.includes(
    activeTab as (typeof DESKTOP_TOOLS_GROUP)[number],
  )
  const isMobileToolsActive = MOBILE_TOOLS_GROUP.includes(
    activeTab as (typeof MOBILE_TOOLS_GROUP)[number],
  )

  const TabTriggerWithTooltip = ({ tab }: { tab: TabDef }) => {
    const { showTooltip, handleMouseEnter, handleMouseLeave } = useDelayedTooltip(800)

    if (tab.value === "tools") {
      return (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          data-tour={`tab-${tab.value}`}
          className={cn(
            "flex flex-col items-center gap-1.5 p-2.5 sm:p-3 relative rounded-lg transition-all",
            isDesktopToolsActive
              ? "!bg-background !text-foreground shadow-sm ring-1 ring-border/40"
              : "text-muted-foreground hover:bg-muted/40",
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-2">
            <tab.icon className="w-4 h-4 shrink-0" />
            <span className="font-medium text-sm">{tab.label}</span>
          </div>
          {showTooltip && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 px-3 py-1.5 text-xs bg-popover text-popover-foreground border rounded-md shadow-md animate-in fade-in-0 zoom-in-95 duration-200 whitespace-nowrap">
              {tab.description}
            </div>
          )}
        </TabsTrigger>
      )
    }

    return (
      <TabsTrigger
        key={tab.value}
        value={tab.value}
        data-tour={`tab-${tab.value}`}
        className="flex flex-col items-center gap-1.5 p-2.5 sm:p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/30 relative rounded-lg transition-all"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center gap-2">
          <tab.icon className="w-4 h-4 shrink-0" />
          <span className="font-medium text-sm">{tab.label}</span>
          {tab.badge && (
            <Badge variant="secondary" className="text-xs h-5 px-1.5">{tab.badge}</Badge>
          )}
        </div>
        {showTooltip && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 px-3 py-1.5 text-xs bg-popover text-popover-foreground border rounded-md shadow-md animate-in fade-in-0 zoom-in-95 duration-200 whitespace-nowrap">
            {tab.description}
          </div>
        )}
      </TabsTrigger>
    )
  }

  const desktopHubCards: TabDef[] = [
    pickTab(allTabs, "categories"),
    pickTab(allTabs, "insights"),
    pickTab(allTabs, "shift-tracker"),
    pickTab(allTabs, "broker-training"),
    pickTab(allTabs, "scanner"),
    pickTab(allTabs, "calculator"),
    pickTab(allTabs, "currency-converter"),
    pickTab(allTabs, "games"),
    pickTab(allTabs, "document-tools"),
  ]

  const mobileHubCards: TabDef[] = [
    pickTab(allTabs, "debt-credit"),
    pickTab(allTabs, "categories"),
    pickTab(allTabs, "portfolio"),
    pickTab(allTabs, "shift-tracker"),
    pickTab(allTabs, "broker-training"),
    pickTab(allTabs, "scanner"),
    pickTab(allTabs, "insights"),
    pickTab(allTabs, "calculator"),
    pickTab(allTabs, "currency-converter"),
    pickTab(allTabs, "games"),
    pickTab(allTabs, "document-tools"),
  ]

  const isFullscreen = !!mobileFullscreenTab

  return (
    <div className={(isFullscreen ? "" : "space-y-6 ") + "pb-28 lg:pb-6"}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="hidden lg:block">
          <TabsList className="grid w-full grid-cols-6 gap-1 h-auto p-1.5 bg-muted/15 border border-border/50 rounded-xl">
            {desktopNavTabs.map((tab) => (
              <TabTriggerWithTooltip key={tab.value} tab={tab} />
            ))}
          </TabsList>
        </div>

        <div className="block lg:hidden">
          <TabsList className="fixed bottom-0 left-0 right-0 w-full bg-background/80 backdrop-blur-xl border-t border-zinc-200/80 dark:border-white/10 shadow-2xl z-50 flex justify-around items-end pb-2 pt-1.5 h-[70px] px-4 safe-area-bottom">
            {desktopNavTabs
              .filter((t) => ["transactions", "budgets", "goals"].includes(t.value))
              .map((tab) => {
                const isActive = activeTab === tab.value
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    data-tour={`tab-${tab.value}`}
                    className="flex flex-col items-center justify-end p-0 h-14 w-16 gap-1.5 data-[state=active]:bg-transparent transition-all duration-300 ease-out flex-1 group"
                  >
                    <div
                      className={`relative p-2 rounded-2xl transition-all duration-300 ${isActive ? "bg-primary text-primary-foreground translate-y-[-2px] shadow-lg shadow-primary/25" : "text-muted-foreground hover:bg-muted/50"}`}
                    >
                      <tab.icon
                        className={`w-6 h-6 transition-all duration-300 ${isActive ? "scale-110" : "group-active:scale-95"}`}
                      />
                      {tab.badge && (
                        <Badge
                          variant="secondary"
                          className="text-xs h-4 w-4 p-0 flex items-center justify-center rounded-full absolute -top-1 -right-1 bg-destructive text-white border-2 border-background"
                        ></Badge>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium transition-all duration-300 ${isActive ? "text-primary translate-y-[-1px]" : "text-muted-foreground/70"}`}
                    >
                      {tab.label}
                    </span>
                  </TabsTrigger>
                )
              })}

            <TabsTrigger
              value="tools"
              data-tour="tab-tools"
              className="flex flex-col items-center justify-end p-0 h-14 w-16 gap-1.5 data-[state=active]:bg-transparent transition-all duration-300 ease-out flex-1 group"
            >
              <div
                className={`relative p-2 rounded-2xl transition-all duration-300 ${isMobileToolsActive ? "bg-primary text-primary-foreground translate-y-[-2px] shadow-lg shadow-primary/25" : "text-muted-foreground hover:bg-muted/50"}`}
              >
                <LayoutGrid
                  className={`w-6 h-6 transition-all duration-300 ${isMobileToolsActive ? "scale-110" : "group-active:scale-95"}`}
                />
              </div>
              <span
                className={`text-[10px] font-medium transition-all duration-300 ${isMobileToolsActive ? "text-primary translate-y-[-1px]" : "text-muted-foreground/70"}`}
              >
                Tools
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className={isFullscreen ? "" : "mt-6"}>
          {isFullscreen && (
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-2 py-2 mb-4">
              <button
                onClick={() => setActiveTab("tools")}
                className="inline-flex items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            </div>
          )}
          <TabsContent value="transactions" className="space-y-4">
            <TransactionsList />
          </TabsContent>

          <TabsContent value="budgets" className="space-y-4">
            <BudgetsList />
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <EnhancedGoalsList />
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <CategoriesManagement />
          </TabsContent>

          <TabsContent value="debt-credit" className="space-y-4">
            <DebtCreditManagement />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            <PortfolioList />
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <InsightsPanel onNavigate={setActiveTab} />
          </TabsContent>

          <TabsContent value="shift-tracker" className="space-y-4">
            <ShiftTracker />
          </TabsContent>

          <TabsContent value="broker-training" className="space-y-4">
            <BrokerLeaderboard />
          </TabsContent>

          <TabsContent value="scanner" className="space-y-4">
            <ScannerTool />
          </TabsContent>

          <TabsContent value="calculator" className="space-y-4">
            <CalculatorTool />
          </TabsContent>

          <TabsContent value="currency-converter" className="space-y-4">
            <CurrencyConverterTool />
          </TabsContent>

          <TabsContent value="games" className="space-y-4">
            <GamesTool />
          </TabsContent>

          <TabsContent value="document-tools" className="space-y-4 px-3 sm:px-0">
            <DocumentTools />
          </TabsContent>

          <TabsContent
            ref={toolsContentRef}
            value="tools"
            className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300"
          >
            <div className="hidden lg:grid lg:grid-cols-3 gap-4">
              {desktopHubCards.map((tool) => (
                <button
                  key={tool.value}
                  type="button"
                  onClick={() => {
                    if (DESKTOP_DIALOG_TOOLS.has(tool.value)) {
                      if (tool.value === "scanner") setIsScannerOpen(true)
                      else if (tool.value === "calculator") window.dispatchEvent(new CustomEvent("open-calculator-panel"))
                      else if (tool.value === "currency-converter") setIsConverterOpen(true)
                    } else {
                      setActiveTab(tool.value)
                    }
                  }}
                  className="flex flex-col items-center justify-center p-6 bg-card/80 border border-border/60 rounded-xl shadow-sm hover:bg-muted/30 transition-all active:scale-[0.99] text-center"
                >
                  <div className="p-3 bg-primary/10 rounded-full mb-3 text-primary">
                    <tool.icon className="w-8 h-8" />
                  </div>
                  <span className="font-semibold text-lg">{tool.label}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {tool.description}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2 lg:hidden">
              {mobileHubCards.map((tool) => (
                <button
                  key={tool.value}
                  type="button"
                  onClick={() => setActiveTab(tool.value)}
                  className="flex flex-col items-center justify-center p-2 bg-card border rounded-xl shadow-sm hover:bg-muted/50 transition-all active:scale-95"
                >
                  <div className="p-1.5 bg-primary/10 rounded-full mb-1.5 text-primary">
                    <tool.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-[11px] leading-tight text-center">{tool.label}</span>
                </button>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <ReceiptScanner
        isOpen={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onTransactionData={(data) => {
          setIsScannerOpen(false)
        }}
      />

      <CurrencyConverterDialog isOpen={isConverterOpen} onOpenChange={setIsConverterOpen} />
    </div>  
  )
}
