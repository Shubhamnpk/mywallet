"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TimeTooltip } from "@/components/ui/time-tooltip"
import { Clock, Search, TrendingUp, TrendingDown, Calendar, Filter, ArrowUpDown, RefreshCcw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TransactionDetailsModal } from "./transaction-details-modal"
import type { Transaction, UserProfile } from "@/types/wallet"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils"
import { getTimeEquivalentBreakdown } from "@/lib/wallet-utils"

interface TransactionsListProps {
  transactions: Transaction[]
  userProfile: UserProfile
  onDeleteTransaction?: (id: string) => void
  fetchTransactions?: () => Promise<Transaction[]> // for realtime refresh
}

export function TransactionsList({
  transactions: initialTransactions,
  userProfile,
  onDeleteTransaction,
  fetchTransactions,
}: TransactionsListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "amount">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  // Realtime polling (every 20s if fetchTransactions is provided)
  useEffect(() => {
    if (!fetchTransactions) return
    const load = async () => {
      setLoading(true)
      const data = await fetchTransactions()
      setTransactions(data)
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 20000)
    return () => clearInterval(interval)
  }, [fetchTransactions])

  // Keep internal transactions in sync when parent updates props (immediate UI update)
  useEffect(() => {
    setTransactions(initialTransactions)
  }, [initialTransactions])

  const refreshManually = async () => {
    if (!fetchTransactions) return
    setLoading(true)
    const data = await fetchTransactions()
    setTransactions(data)
    setLoading(false)
  }

  // Apply filters
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const categories = Array.from(new Set(transactions.map((t) => t.category)))

  const filteredTransactions = transactions
    .filter((t) => new Date(t.date) >= sevenDaysAgo)
    .filter((transaction) => {
      const matchesSearch =
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filter === "all" || transaction.type === filter
      const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter
      return matchesSearch && matchesFilter && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB
      } else {
        return sortOrder === "desc" ? b.amount - a.amount : a.amount - b.amount
      }
    })

  const getTimeEquivalentDisplay = (amount: number) => {
    const breakdown = getTimeEquivalentBreakdown(amount, userProfile)
    return breakdown ? breakdown.formatted.userFriendly : ""
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Transactions (Last 7 Days)
              <span className="text-muted-foreground text-sm">({filteredTransactions.length})</span>
            </CardTitle>
            {fetchTransactions && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Refresh transactions"
                onClick={refreshManually}
              >
                <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Select value={filter} onValueChange={(value: "all" | "income" | "expense") => setFilter(value)}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="flex items-center gap-1"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortBy === "date" ? "Date" : "Amount"}
                {sortOrder === "desc" ? " ↓" : " ↑"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Refreshing...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filter !== "all" || categoryFilter !== "all"
                ? "No transactions match your filters"
                : "No transactions in the last 7 days. Add your first transaction!"}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedTransaction(transaction)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        transaction.type === "income"
                          ? "bg-accent/10 text-accent dark:bg-accent/20"
                          : "bg-red-100 text-red-600 dark:bg-red-900/20"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {transaction.category}
                        </Badge>
                        <span>•</span>
                        <span>{new Date(transaction.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-semibold ${transaction.type === "income" ? "text-accent" : "text-red-600"}`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount, userProfile.currency, userProfile.customCurrency)}
                    </p>

                    {transaction.type === "expense" && (
                      <TimeTooltip amount={transaction.amount}>
                        <div className="flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400">
                          <Clock className="w-4 h-4" />
                          <span>{getTimeEquivalentDisplay(transaction.amount)} work</span>
                        </div>
                      </TimeTooltip>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          userProfile={userProfile}
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onDelete={onDeleteTransaction}
        />
      )}
    </div>
  )
}
