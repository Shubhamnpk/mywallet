"use client"

import { useCallback, useEffect } from "react"
import { useWalletData } from "@/contexts/wallet-data-context"

type BridgeRequest =
  | {
      requestId: string
      action: "ping"
    }
  | {
      requestId: string
      action: "getSnapshot"
    }
  | {
      requestId: string
      action: "addTransaction"
      payload?: {
        type?: "income" | "expense"
        amount?: number
        description?: string
        category?: string
        date?: string
        subcategory?: string
      }
    }
  | {
      requestId: string
      action: "applyMeroShareIPO"
      payload?: {
        ipoName?: string
        kitta?: number
        showBrowser?: boolean
      }
    }
  | {
      requestId: string
      action: "checkIPOAllotment"
      payload?: {
        ipoName?: string
      }
    }
  | {
      requestId: string
      action: "getMeroShareAutomationContext"
      payload?: {
        ipoName?: string
        kitta?: number
      }
    }

type BridgeResponse = {
  source: "mywallet-app"
  type: "RESPONSE"
  requestId: string
  ok: boolean
  data?: unknown
  error?: string
}

const EXTENSION_SOURCE = "mywallet-extension"

const getMonthStart = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

export function MyWalletExtensionBridge() {
  const {
    isLoaded,
    userProfile,
    balance,
    transactions,
    budgets,
    goals,
    portfolio,
    upcomingIPOs,
    categories,
    addTransaction,
    applyMeroShareIPO,
    checkIPOAllotment,
  } = useWalletData()

  const hasMeroShareCredentials = Boolean(
    userProfile?.meroShare?.shareFeaturesEnabled &&
    userProfile?.meroShare?.isAutomatedEnabled &&
    userProfile?.meroShare?.dpId &&
    userProfile?.meroShare?.username &&
    userProfile?.meroShare?.password &&
    userProfile?.meroShare?.crn &&
    userProfile?.meroShare?.pin
  )

  const buildSnapshot = useCallback(() => {
    const monthStart = getMonthStart()
    const monthlyExpenseTotal = transactions.reduce((sum, tx) => {
      if (tx.type !== "expense") return sum
      const txTime = new Date(tx.date).getTime()
      if (Number.isNaN(txTime) || txTime < monthStart) return sum
      return sum + (tx.actual ?? tx.amount)
    }, 0)

    const portfolioValue = portfolio.reduce((sum, item) => {
      const currentPrice = Number(item.currentPrice ?? item.buyPrice ?? 0)
      const units = Number(item.units ?? 0)
      if (!Number.isFinite(currentPrice) || !Number.isFinite(units)) return sum
      return sum + currentPrice * units
    }, 0)

    const monthlyIncomeTotal = transactions.reduce((sum, tx) => {
      if (tx.type !== "income") return sum
      const txTime = new Date(tx.date).getTime()
      if (Number.isNaN(txTime) || txTime < monthStart) return sum
      return sum + (tx.actual ?? tx.amount)
    }, 0)

    const budgetHealth = budgets
      .map((budget) => {
        const limit = Number(budget.limit ?? 0)
        const spent = Number(budget.spent ?? 0)
        const progress = limit > 0 ? Math.round((spent / limit) * 100) : 0
        return {
          id: budget.id,
          name: budget.name,
          spent,
          limit,
          progress,
          status: progress >= 100 ? "over" : progress >= 80 ? "warning" : "healthy",
        }
      })
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 4)

    const goalProgress = goals
      .map((goal) => {
        const targetAmount = Number(goal.targetAmount ?? 0)
        const currentAmount = Number(goal.currentAmount ?? 0)
        const progress = targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0
        return {
          id: goal.id,
          title: goal.title || goal.name || "Untitled goal",
          currentAmount,
          targetAmount,
          progress,
          targetDate: goal.targetDate,
        }
      })
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 4)

    const ipoSummary = {
      openCount: upcomingIPOs.filter((ipo) => ipo.status === "open").length,
      upcomingCount: upcomingIPOs.filter((ipo) => ipo.status === "upcoming").length,
      nextOpen: upcomingIPOs.find((ipo) => ipo.status === "open")?.company
        || upcomingIPOs.find((ipo) => ipo.status === "upcoming")?.company
        || null,
    }

    return {
      appName: "MyWallet",
      connected: true,
      isLoaded,
      origin: window.location.origin,
      user: userProfile
        ? {
            name: userProfile.name,
            currency: userProfile.customCurrency?.symbol || userProfile.currency || "NPR",
          }
        : null,
      summary: {
        balance,
        monthlyExpenseTotal,
        monthlyIncomeTotal,
        monthlyNet: monthlyIncomeTotal - monthlyExpenseTotal,
        transactionCount: transactions.length,
        budgetCount: budgets.length,
        goalCount: goals.length,
        portfolioCount: portfolio.length,
        portfolioValue,
        ipoOpenCount: ipoSummary.openCount,
      },
      budgetHealth,
      goalProgress,
      ipoSummary,
      ipoAutomationTargets: upcomingIPOs
        .filter((ipo) => ipo.status === "open" || ipo.status === "closed")
        .slice(0, 12)
        .map((ipo) => ({
          company: ipo.company,
          status: ipo.status,
          daysRemaining: ipo.daysRemaining,
          openingDay: ipo.openingDay,
          closingDay: ipo.closingDay,
        })),
      recentTransactions: transactions
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.actual ?? tx.amount,
          description: tx.description,
          category: tx.category,
          date: tx.date,
        })),
      suggestedCategories: {
        expense: categories.filter((category) => category.type === "expense").slice(0, 20).map((category) => category.name),
        income: categories.filter((category) => category.type === "income").slice(0, 20).map((category) => category.name),
      },
      automation: {
        extensionReady: true,
        appBridgeReady: true,
        futureTargets: [
          "MeroShare login and issue navigation",
          "CDSC IPO result checks",
          "Guided browser automation from extension actions",
        ],
        meroshareConfigured: hasMeroShareCredentials,
      },
    }
  }, [
    balance,
    budgets,
    categories,
    goals,
    hasMeroShareCredentials,
    isLoaded,
    portfolio,
    transactions,
    upcomingIPOs,
    userProfile,
  ])

  useEffect(() => {
    const respond = (response: Omit<BridgeResponse, "source" | "type">) => {
      window.postMessage(
        {
          source: "mywallet-app",
          type: "RESPONSE",
          ...response,
        } satisfies BridgeResponse,
        window.location.origin
      )
    }

    const handleBridgeRequest = async (request: BridgeRequest) => {
      try {
        if (request.action === "ping" || request.action === "getSnapshot") {
          respond({
            requestId: request.requestId,
            ok: true,
            data: buildSnapshot(),
          })
          return
        }

        if (request.action === "addTransaction") {
          const amount = Number(request.payload?.amount)
          const type = request.payload?.type === "income" ? "income" : "expense"
          const category = request.payload?.category?.trim()
          const description = request.payload?.description?.trim()
          const date = request.payload?.date?.trim() || new Date().toISOString().slice(0, 10)

          if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Enter a valid amount greater than 0.")
          }

          if (!category) {
            throw new Error("Category is required.")
          }

          await addTransaction({
            type,
            amount,
            description: description || "Quick add from browser extension",
            category,
            date,
            subcategory: request.payload?.subcategory?.trim() || undefined,
          })

          respond({
            requestId: request.requestId,
            ok: true,
            data: buildSnapshot(),
          })
          return
        }

        if (request.action === "applyMeroShareIPO") {
          const ipoName = request.payload?.ipoName?.trim()
          const kitta = Number(request.payload?.kitta || 10)
          const credentials = userProfile?.meroShare

          if (!hasMeroShareCredentials || !credentials) {
            throw new Error("Complete and enable MeroShare automation in MyWallet settings first.")
          }

          if (!ipoName) {
            throw new Error("Choose an IPO to apply for.")
          }

          if (!Number.isFinite(kitta) || kitta <= 0) {
            throw new Error("Enter a valid kitta quantity.")
          }

          const result = await applyMeroShareIPO(
            credentials,
            ipoName,
            kitta,
            "live-apply",
            { showBrowser: Boolean(request.payload?.showBrowser) }
          )

          respond({
            requestId: request.requestId,
            ok: true,
            data: {
              result,
              snapshot: buildSnapshot(),
            },
          })
          return
        }

        if (request.action === "getMeroShareAutomationContext") {
          const ipoName = request.payload?.ipoName?.trim()
          const kitta = Number(request.payload?.kitta || 10)
          const credentials = userProfile?.meroShare

          if (!hasMeroShareCredentials || !credentials) {
            throw new Error("Complete and enable MeroShare automation in MyWallet settings first.")
          }

          if (!ipoName) {
            throw new Error("Choose an IPO first.")
          }

          if (!Number.isFinite(kitta) || kitta <= 0) {
            throw new Error("Enter a valid kitta quantity.")
          }

          respond({
            requestId: request.requestId,
            ok: true,
            data: {
              credentials: {
                dpId: credentials.dpId,
                username: credentials.username,
                password: credentials.password,
                crn: credentials.crn,
                pin: credentials.pin,
              },
              ipoName,
              kitta,
              snapshot: buildSnapshot(),
            },
          })
          return
        }

        if (request.action === "checkIPOAllotment") {
          const ipoName = request.payload?.ipoName?.trim()
          const credentials = userProfile?.meroShare

          if (!hasMeroShareCredentials || !credentials) {
            throw new Error("Complete and enable MeroShare automation in MyWallet settings first.")
          }

          if (!ipoName) {
            throw new Error("Choose an IPO to check.")
          }

          const result = await checkIPOAllotment(credentials, ipoName, "live-check")

          respond({
            requestId: request.requestId,
            ok: true,
            data: {
              result,
              snapshot: buildSnapshot(),
            },
          })
          return
        }

        throw new Error("Unsupported action.")
      } catch (error) {
        respond({
          requestId: request.requestId,
          ok: false,
          error: error instanceof Error ? error.message : "Unknown bridge error.",
        })
      }
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return
      const payload = event.data
      if (!payload || payload.source !== EXTENSION_SOURCE || payload.type !== "REQUEST") return

      void handleBridgeRequest(payload as BridgeRequest)
    }

    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [
    addTransaction,
    applyMeroShareIPO,
    buildSnapshot,
    checkIPOAllotment,
    hasMeroShareCredentials,
    userProfile,
  ])

  return null
}
