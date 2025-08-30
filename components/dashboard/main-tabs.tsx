"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Receipt, PiggyBank, Target, CreditCard, TrendingUp, FolderOpen } from "lucide-react"
import { TransactionsList } from "@/components/transactions/transactions-list"
import { BudgetsList } from "@/components/budgets/budgets-list"
import { EnhancedGoalsList } from "@/components/goals/goals-list"
import { DebtCreditManagement } from "@/components/debt-credit/debt-credit-management"
import { InsightsPanel } from "@/components/insights/insights-panel"
import { CategoriesManagement } from "@/components/categories/categories-management"
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
  onAddCategory?: (category: Omit<Category, "id" | "createdAt" | "totalSpent" | "transactionCount">) => Category
  onUpdateCategory?: (id: string, updates: Partial<Category>) => void
  onDeleteCategory?: (id: string) => void
  onUpdateCategoryStats?: () => void
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
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateCategoryStats,
}: MainTabsProps) {
  // Calculate summary stats for badges
  const recentTransactions = transactions.slice(0, 5).length
  const activeBudgets = budgets.filter((b) => b.spent < b.limit).length
  const activeGoals = goals.filter((g) => g.currentAmount < g.targetAmount).length
  const customCategories = categories.filter((c) => !c.isDefault).length

  // Calculate insights badge (simplified check for activity)
  const hasInsights = transactions.length > 0

  const tabs = [
    {
      value: "transactions",
      label: "Transactions",
      icon: Receipt,
      badge: recentTransactions > 0 ? recentTransactions : null,
      description: "Track your income and expenses",
    },
    {
      value: "budgets",
      label: "Budgets",
      icon: PiggyBank,
      badge: activeBudgets > 0 ? activeBudgets : null,
      description: "Manage your spending limits",
    },
    {
      value: "goals",
      label: "Goals",
      icon: Target,
      badge: activeGoals > 0 ? activeGoals : null,
      description: "Save for your dreams",
    },
    {
      value: "categories",
      label: "Categories",
      icon: FolderOpen,
      badge: customCategories > 0 ? customCategories : null,
      description: "Organize your spending",
    },
    {
      value: "debt-credit",
      label: "Debt & Credit",
      icon: CreditCard,
      badge: null,
      description: "Manage debts and credit",
    },
    {
      value: "insights",
      label: "Insights",
      icon: TrendingUp,
      badge: hasInsights ? "NEW" : null,
      description: "Financial analytics",
    },
  ]

  return (
    <div className="space-y-6">
      <Tabs defaultValue="transactions" className="w-full">
        {/* Desktop Tabs */}
        <div className="hidden lg:block">
          <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-muted/50">
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
                      {tab.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground hidden xl:block">{tab.description}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Mobile/Tablet Tabs */}
        <div className="block lg:hidden">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-auto p-1 bg-muted/50 min-w-full">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{tab.label}</span>
                  {tab.badge && (
                    <Badge variant="secondary" className="text-xs h-4 px-1">
                      {tab.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Categories Management</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />
                  Organization
                </Badge>
                {customCategories > 0 && (
                  <Badge className="bg-blue-600 hover:bg-blue-700">{customCategories} Custom</Badge>
                )}
              </div>
            </div>
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Debt & Credit Management</h2>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                Management Tools
              </Badge>
            </div>
            <DebtCreditManagement userProfile={userProfile} />
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Financial Insights</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Analytics
                </Badge>
                {hasInsights && <Badge className="bg-accent hover:bg-accent/90 text-accent-foreground">Data Available</Badge>}
              </div>
            </div>
            <InsightsPanel
              transactions={transactions}
              userProfile={userProfile}
              onExportData={onExportData}
              calculateTimeEquivalent={calculateTimeEquivalent}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
