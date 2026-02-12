"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Receipt, PiggyBank, Target, CreditCard, TrendingUp, FolderOpen, Briefcase } from "lucide-react"
import { TransactionsList } from "@/components/transactions/transactions-list"
import { BudgetsList } from "@/components/budgets/budgets-list"
import { EnhancedGoalsList } from "@/components/goals/goals-list"
import { DebtCreditManagement } from "@/components/debt-credit/debt-credit-management"
import { InsightsPanel } from "@/components/insights/insights-panel"
import { CategoriesManagement } from "@/components/categories/categories-management"
import { PortfolioList } from "@/components/portfolio/portfolio-list"
import { SessionManager } from "@/lib/session-manager"
import type { UserProfile, Transaction, Budget, Goal, Category } from "@/types/wallet"

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
  onAddCategory?: (category: Omit<Category, "id" | "createdAt" | "totalSpent" | "transactionCount">) => Category
  onUpdateCategory?: (id: string, updates: Partial<Category>) => void
  onDeleteCategory?: (id: string) => void
  onUpdateCategoryStats?: () => void
  debtAccounts?: any[]
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
  onUpdateCategoryStats,
  debtAccounts = [],
}: MainTabsProps) {
  const [activeTab, setActiveTab] = useState("transactions")

  // Calculate summary stats for badges
  const recentTransactions = transactions.slice(0, 5).length
  const activeBudgets = budgets.filter((b) => b.spent < b.limit).length
  const activeGoals = goals.filter((g) => g.currentAmount < g.targetAmount).length
  const customCategories = categories.filter((c) => !c.isDefault).length

  // Calculate insights badge (simplified check for activity)
  const hasInsights = transactions.length > 0

  // Validate session on component mount and tab changes
  useEffect(() => {
    const validateSession = () => {
      if (!SessionManager.isSessionValid()) {
        const event = new CustomEvent('wallet-session-expired')
        window.dispatchEvent(event)
      }
    }

    // Validate on mount
    validateSession()

    // Listen for tab changes (since this is our "navigation")
    const handleTabChange = () => {
      validateSession()
    }

    const handleClick = () => {
      // Small delay to allow tab state to update
      setTimeout(validateSession, 100)
    }

    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [])

  const tabs = [
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
  ]

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Desktop Tabs */}
        <div className="hidden lg:block">
          <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-muted/50">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                  {tab.badge && (
                    <Badge variant="secondary" className="text-xs h-5 px-1.5">
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground hidden xl:block">{tab.description}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="block lg:hidden">
          <TabsList className="fixed bottom-0 left-0 right-0 w-full bg-background/80 backdrop-blur-xl border-t border-zinc-200/80 dark:border-white/10 shadow-2xl z-50 flex justify-around items-end pb-2 pt-1.5 h-[70px] px-4 safe-area-bottom">
            {tabs.filter(t => ['transactions', 'budgets', 'goals'].includes(t.value)).map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex flex-col items-center justify-end p-0 h-14 w-16 gap-1.5 data-[state=active]:bg-transparent transition-all duration-300 ease-out flex-1 group"
                >
                  <div className={`relative p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary text-primary-foreground translate-y-[-2px] shadow-lg shadow-primary/25' : 'text-muted-foreground hover:bg-muted/50'}`}>
                    <tab.icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'scale-110' : 'group-active:scale-95'}`} />
                    {tab.badge && (
                      <Badge variant="secondary" className="text-xs h-4 w-4 p-0 flex items-center justify-center rounded-full absolute -top-1 -right-1 bg-destructive text-white border-2 border-background">
                        {/* Dot indicator */}
                      </Badge>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium transition-all duration-300 ${isActive ? 'text-primary translate-y-[-1px]' : 'text-muted-foreground/70'}`}>
                    {tab.label}
                  </span>
                </TabsTrigger>
              )
            })}

            {/* Tools Tab Trigger */}
            <TabsTrigger
              value="tools-menu"
              onClick={(e) => {
                e.preventDefault()
                setActiveTab("tools-menu")
              }}
              data-state={['tools-menu', 'debt-credit', 'categories', 'portfolio', 'insights'].includes(activeTab) ? 'active' : 'inactive'}
              className="flex flex-col items-center justify-end p-0 h-14 w-16 gap-1.5 data-[state=active]:bg-transparent transition-all duration-300 ease-out flex-1 group"
            >
              <div className={`relative p-2 rounded-2xl transition-all duration-300 ${['tools-menu', 'debt-credit', 'categories', 'portfolio', 'insights'].includes(activeTab) ? 'bg-primary text-primary-foreground translate-y-[-2px] shadow-lg shadow-primary/25' : 'text-muted-foreground hover:bg-muted/50'}`}>
                <Briefcase className={`w-6 h-6 transition-all duration-300 ${['tools-menu', 'debt-credit', 'categories', 'portfolio', 'insights'].includes(activeTab) ? 'scale-110' : 'group-active:scale-95'}`} />
              </div>
              <span className={`text-[10px] font-medium transition-all duration-300 ${['tools-menu', 'debt-credit', 'categories', 'portfolio', 'insights'].includes(activeTab) ? 'text-primary translate-y-[-1px]' : 'text-muted-foreground/70'}`}>
                Tools
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Contents */}
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
            <EnhancedGoalsList
              goals={goals}
              userProfile={userProfile}
            />
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <CategoriesManagement
              categories={categories}
              transactions={transactions}
              userProfile={userProfile}
              onAddCategory={onAddCategory}
              onUpdateCategory={onUpdateCategory}
              onDeleteCategory={onDeleteCategory}
              onUpdateCategoryStats={onUpdateCategoryStats}
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

          {/* Mobile Tools Menu */}
          <TabsContent value="tools-menu" className="space-y-6 lg:hidden animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              {tabs.filter(t => ['debt-credit', 'categories', 'portfolio', 'insights'].includes(t.value)).map((tool) => (
                <button
                  key={tool.value}
                  onClick={() => setActiveTab(tool.value)}
                  className="flex flex-col items-center justify-center p-6 bg-card border rounded-xl shadow-sm hover:bg-muted/50 transition-all active:scale-95"
                >
                  <div className="p-3 bg-primary/10 rounded-full mb-3 text-primary">
                    <tool.icon className="w-8 h-8" />
                  </div>
                  <span className="font-semibold text-lg">{tool.label}</span>
                  <span className="text-xs text-muted-foreground mt-1 text-center">{tool.description}</span>
                </button>
              ))}
            </div>

            <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-center">
              <p className="text-sm text-muted-foreground">Select a tool to open. Navigate back using the bottom menu.</p>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
