"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {Receipt,PiggyBank,Target,CreditCard,TrendingUp,FolderOpen,Briefcase,LayoutGrid,Clock,Trash2} from "lucide-react"
import { TransactionsList } from "@/components/transactions/transactions-list"
import { BudgetsList } from "@/components/budgets/budgets-list"
import { EnhancedGoalsList } from "@/components/goals/goals-list"
import { DebtCreditManagement } from "@/components/debt-credit/debt-credit-management"
import { InsightsPanel } from "@/components/insights/insights-panel"
import { CategoriesManagement } from "@/components/categories/categories-management"
import { PortfolioList } from "@/components/portfolio/portfolio-list"
import { ShiftTracker } from "@/components/tools/shift-tracker"
import { SessionManager } from "@/lib/session-manager"
import { cn } from "@/lib/utils"
import type {UserProfile,Transaction,Budget,Goal,Category} from "@/types/wallet"
interface MainTabsProps {
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
  categories: Category[]
  userProfile: UserProfile
  balance: number
  onExportData: () => void
  calculateTimeEquivalent: (amount: number) => number
  onDeleteTransaction?: (id: string) => void
  onAddBudget: (budget: Omit<Budget, "id">) => void
  onDeleteBudget: (id: string) => void
  onUpdateBudget?: (id: string, updates: Partial<Budget>) => void
  onAddGoal?: (goal: Omit<Goal, "id">) => void
  onAddCategory?: (category: Omit<Category, "id" | "createdAt" | "totalSpent" | "transactionCount">,) => Category
  onUpdateCategory?: (id: string, updates: Partial<Category>) => void
  onDeleteCategory?: (id: string) => void
  onAddTransaction: (transaction: Omit<Transaction, "id" | "createdAt">) => void | Promise<unknown>
  debtAccounts?: any[]
}

type TabDef = {
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  badge?: null
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
] as const

const DESKTOP_TOOLS_GROUP = [
  "tools",
  "categories",
  "insights",
  "shift-tracker",
] as const

// Custom hook for delayed tooltip
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

export function MainTabs({
  transactions,
  budgets,
  goals,
  categories,
  userProfile,
  balance,
  onExportData,
  calculateTimeEquivalent,
  onDeleteTransaction,
  onAddBudget,
  onDeleteBudget,
  onUpdateBudget,
  onAddGoal,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddTransaction,
  debtAccounts = [],
}: MainTabsProps) {
  const [activeTab, setActiveTab] = useState("transactions")
  const toolsContentRef = useRef<HTMLDivElement>(null)

  // Scroll to tools content when Tools tab is active (for mobile)
  useEffect(() => {
    if (activeTab === "tools" && toolsContentRef.current) {
      setTimeout(() => {
        // Scroll down a bit to show the second row of tool cards
        const element = toolsContentRef.current
        if (!element) return
        const rect = element.getBoundingClientRect()
        const scrollOffset = window.scrollY + rect.top - 100 // Offset to show second row
        window.scrollTo({ top: scrollOffset, behavior: "smooth" })
      }, 150)
    }
  }, [activeTab])

  useEffect(() => {
    const validateSession = () => {
      if (!SessionManager.isSessionValid()) {
        const event = new CustomEvent("wallet-session-expired")
        window.dispatchEvent(event)
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

  // Tab trigger component with delayed tooltip
  const TabTriggerWithTooltip = ({ tab }: { tab: TabDef }) => {
    const { showTooltip, handleMouseEnter, handleMouseLeave } = useDelayedTooltip(800)

    if (tab.value === "tools") {
      return (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
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
        className="flex flex-col items-center gap-1.5 p-2.5 sm:p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/30 relative rounded-lg transition-all"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center gap-2">
          <tab.icon className="w-4 h-4 shrink-0" />
          <span className="font-medium text-sm">{tab.label}</span>
          {tab.badge && (
            <Badge variant="secondary" className="text-xs h-5 px-1.5"></Badge>
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
  ]

  const mobileHubCards: TabDef[] = [
    pickTab(allTabs, "debt-credit"),
    pickTab(allTabs, "categories"),
    pickTab(allTabs, "portfolio"),
    pickTab(allTabs, "shift-tracker"),  // Second-to-last
    pickTab(allTabs, "insights"),        // Last
  ]

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Desktop: lighter primary bar + Tools hub */}
        <div className="hidden lg:block">
          <TabsList className="grid w-full grid-cols-6 gap-1 h-auto p-1.5 bg-muted/15 border border-border/50 rounded-xl">
            {desktopNavTabs.map((tab) => (
              <TabTriggerWithTooltip key={tab.value} tab={tab} />
            ))}
          </TabsList>
        </div>

        {/* Mobile Bottom Navigation */}
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

        <div className="mt-6">
          <TabsContent value="transactions" className="space-y-4">
            <TransactionsList
              transactions={transactions}
              userProfile={userProfile}
              onDeleteTransaction={onDeleteTransaction}
            />
          </TabsContent>

          <TabsContent value="budgets" className="space-y-4">
            <BudgetsList
              budgets={budgets}
              userProfile={userProfile}
              onAddBudget={onAddBudget}
              onUpdateBudget={onUpdateBudget}
              onDeleteBudget={onDeleteBudget}
            />
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <EnhancedGoalsList goals={goals} userProfile={userProfile} />
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <CategoriesManagement
              categories={categories}
              transactions={transactions}
              userProfile={userProfile}
              onAddCategory={onAddCategory}
              onUpdateCategory={onUpdateCategory}
              onDeleteCategory={onDeleteCategory}
            />
          </TabsContent>

          <TabsContent value="debt-credit" className="space-y-4">
            <DebtCreditManagement userProfile={userProfile} />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            <PortfolioList />
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <InsightsPanel
              transactions={transactions}
              userProfile={userProfile}
              budgets={budgets}
              goals={goals}
              debtAccounts={debtAccounts}
              balance={balance}
              onExportData={onExportData}
              calculateTimeEquivalent={calculateTimeEquivalent}
              onNavigate={setActiveTab}
              onAddGoal={onAddGoal}
              onAddBudget={onAddBudget}
            />
          </TabsContent>

          <TabsContent value="shift-tracker" className="space-y-4">
            <ShiftTracker onAddIncomeTransaction={onAddTransaction} />
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
                  onClick={() => setActiveTab(tool.value)}
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

            {/* Mobile: 4 compact tool cards in a row */}
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
    </div>
  )
}
