"use client"

import React, { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TimeTooltip } from "@/components/ui/time-tooltip"
import { Clock, Search, TrendingUp, TrendingDown, Calendar as CalendarIcon, Filter, ArrowUpDown, RefreshCcw, Settings } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from "@/components/ui/pagination"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import type { DateRange } from "react-day-picker"
import { TransactionDetailsModal } from "./transaction-details-modal"
import type { Transaction, UserProfile } from "@/types/wallet"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils"
import { getTimeEquivalentBreakdown } from "@/lib/wallet-utils"
import { useIsMobile } from "@/hooks/use-mobile"

function BadgeRow({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [overflowing, setOverflowing] = useState(false)
  const isMobileLocal = useIsMobile()

  useEffect(() => {
    function check() {
      const el = containerRef.current
      if (!el) return
      setOverflowing(el.scrollWidth > el.clientWidth + 1)
    }
    if (!isMobileLocal) {
      check()
      window.addEventListener("resize", check)
      return () => window.removeEventListener("resize", check)
    }
    return
  }, [children, isMobileLocal])
  const childArray = React.Children.toArray(children)
  if (childArray.length === 0) return null
  if (isMobileLocal) {
    return (
      <div ref={containerRef} className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden">
        <div className="inline-block align-middle">{childArray[0]}</div>
        {childArray.length > 1 && (
          <Badge variant="outline" className="text-[10px]">+{childArray.length - 1}</Badge>
        )}
      </div>
    )
  }
  return (
    <div
      ref={containerRef}
      className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden whitespace-nowrap"
    >
      {overflowing ? (
        <>
          <div className="inline-block align-middle">{childArray[0]}</div>
          <div className="inline-block align-middle">...</div>
        </>
      ) : (
        childArray.map((c, i) => (
          <div key={i} className="inline-block align-middle">
            {c}
          </div>
        ))
      )}
    </div>
  )
}

interface TransactionsListProps {
  transactions: Transaction[]
  userProfile: UserProfile
  onDeleteTransaction?: (id: string) => void
  fetchTransactions?: () => Promise<Transaction[]>
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
  const [visibleCount, setVisibleCount] = useState(7)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const isMobile = useIsMobile()
  const [showFilters, setShowFilters] = useState(false)

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

  useEffect(() => {
    setTransactions(initialTransactions)
  }, [initialTransactions])

  useEffect(() => {
    setVisibleCount(7)
  }, [searchTerm, filter, categoryFilter, sortBy, sortOrder, dateRange])


  const refreshManually = async () => {
    if (!fetchTransactions) return
    setLoading(true)
    const data = await fetchTransactions()
    setTransactions(data)
    setLoading(false)
  }

  const categories = Array.from(new Set(transactions.map((t) => t.category)))
  const filteredTransactions = transactions
    .filter((t) => {
      const transactionDate = new Date(t.date)
      if (dateRange?.from && dateRange?.to) {
        return transactionDate >= dateRange.from && transactionDate <= dateRange.to
      } else if (dateRange?.from) {
        return transactionDate >= dateRange.from
      } else if (dateRange?.to) {
        return transactionDate <= dateRange.to
      } else {
        // No default date filter
        return true
      }
    })
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

  const visibleTransactions = filteredTransactions.slice(0, visibleCount)

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
              <CalendarIcon className="w-5 h-5" />
              Recent Transactions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {showFilters ? "Hide Details" : "View Details"}
              </Button>
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
          </div>

          {/* Filters */}
          {showFilters && (
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

            <div className="flex gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`${isMobile ? 'w-full' : 'w-[200px]'} justify-start text-left font-normal`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange?.to ? (
                        <>
                          {dateRange.from.toLocaleDateString()} -{" "}
                          {dateRange.to.toLocaleDateString()}
                        </>
                      ) : (
                        dateRange.from.toLocaleDateString()
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={`${isMobile ? 'w-full max-w-[300px]' : 'w-[300px]'} p-0`} align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => setDateRange(range)}
                    numberOfMonths={1}
                    className="rounded-md border-0 w-full"
                  />
                  <div className="p-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange(undefined)}
                      className="w-full"
                    >
                      Clear dates
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
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
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Refreshing...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filter !== "all" || categoryFilter !== "all" || dateRange?.from || dateRange?.to
                ? "No transactions match your filters"
                : "No transactions found. Add your first transaction!"}
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {visibleTransactions.map((transaction) => (
                  <li
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.type === "income"
                            ? "bg-primary/10 text-primary dark:bg-primary/20"
                            : "bg-red-100 text-red-600 dark:bg-red-900/20"
                        }`}
                      >
                        {transaction.type === "income" ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex flex-col max-h-20 overflow-hidden">
                        <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{transaction.description}</p>
                        <BadgeRow>
                          <Badge variant="secondary" className={isMobile ? "text-[10px]" : "text-xs"}>
                            {transaction.category}
                          </Badge>
                          {transaction.status === "debt" && (
                            <Badge variant="outline" className={`${isMobile ? "text-[10px]" : "text-xs"} border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400`}>
                              Debt
                            </Badge>
                          )}
                          {transaction.status === "repayment" && (
                            <Badge variant="outline" className={`${isMobile ? "text-[10px]" : "text-xs"} border-green-300 text-green-700 dark:border-green-600 dark:text-green-400`}>
                              Repayment
                            </Badge>
                          )}
                        </BadgeRow>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end self-start">
                      <div className="flex flex-col items-end gap-1">
                        <p
                          className={`font-semibold ${transaction.type === "income" ? "text-primary" : "text-red-600"}`}
                        >
                          {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.total ?? transaction.amount, userProfile.currency, userProfile.customCurrency)}
                        </p>
                      </div>
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>{new Date(transaction.date).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {(visibleCount < filteredTransactions.length || visibleCount > 7) && (
                <div className="mt-4 flex justify-center gap-2">
                  {visibleCount < filteredTransactions.length && (
                    <Button
                      variant="outline"
                      onClick={() => setVisibleCount(prev => prev + 7)}
                    >
                      Load More
                    </Button>
                  )}
                  {visibleCount > 7 && (
                    <Button
                      variant="outline"
                      onClick={() => setVisibleCount(7)}
                    >
                      Show Less
                    </Button>
                  )}
                </div>
              )}
            </>
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
