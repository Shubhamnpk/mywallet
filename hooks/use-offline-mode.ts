"use client"

import { useState, useEffect } from 'react'

interface OfflineModeState {
  isOnline: boolean
  isOfflineMode: boolean
  pendingSyncItems: number
  lastSyncTime: Date | null
}

export function useOfflineMode() {
  const [state, setState] = useState<OfflineModeState>({
    isOnline: true,
    isOfflineMode: false,
    pendingSyncItems: 0,
    lastSyncTime: null
  })

  useEffect(() => {
    // Check initial online status
    setState(prev => ({
      ...prev,
      isOnline: navigator.onLine
    }))

    // Listen for online/offline events
    const handleOnline = () => {
      setState(prev => ({
        ...prev,
        isOnline: true,
        isOfflineMode: false
      }))
      // Trigger sync when coming back online
      syncPendingData()
    }

    const handleOffline = () => {
      setState(prev => ({
        ...prev,
        isOnline: false,
        isOfflineMode: true
      }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check for pending sync items
    checkPendingSyncItems()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const checkPendingSyncItems = () => {
    const pendingTransactions = localStorage.getItem('wallet_pending_transactions')
    const pendingGoals = localStorage.getItem('wallet_pending_goals')
    const pendingBudgets = localStorage.getItem('wallet_pending_budgets')

    let count = 0
    if (pendingTransactions) count += JSON.parse(pendingTransactions).length
    if (pendingGoals) count += JSON.parse(pendingGoals).length
    if (pendingBudgets) count += JSON.parse(pendingBudgets).length

    setState(prev => ({
      ...prev,
      pendingSyncItems: count
    }))
  }

  const syncPendingData = async () => {
    try {
      // Get pending data from localStorage
      const pendingTransactions = localStorage.getItem('wallet_pending_transactions')
      const pendingGoals = localStorage.getItem('wallet_pending_goals')
      const pendingBudgets = localStorage.getItem('wallet_pending_budgets')

      // Sync transactions
      if (pendingTransactions) {
        const transactions = JSON.parse(pendingTransactions)
        // Here you would sync with your backend
        localStorage.removeItem('wallet_pending_transactions')
      }

      // Sync goals
      if (pendingGoals) {
        const goals = JSON.parse(pendingGoals)
        localStorage.removeItem('wallet_pending_goals')
      }

      // Sync budgets
      if (pendingBudgets) {
        const budgets = JSON.parse(pendingBudgets)
        localStorage.removeItem('wallet_pending_budgets')
      }

      // Update sync time
      setState(prev => ({
        ...prev,
        lastSyncTime: new Date(),
        pendingSyncItems: 0
      }))

    } catch (error) {
    }
  }

  const addPendingTransaction = (transaction: any) => {
    const pending = localStorage.getItem('wallet_pending_transactions') || '[]'
    const transactions = JSON.parse(pending)
    transactions.push({ ...transaction, offlineId: Date.now() })
    localStorage.setItem('wallet_pending_transactions', JSON.stringify(transactions))
    checkPendingSyncItems()
  }

  const addPendingGoal = (goal: any) => {
    const pending = localStorage.getItem('wallet_pending_goals') || '[]'
    const goals = JSON.parse(pending)
    goals.push({ ...goal, offlineId: Date.now() })
    localStorage.setItem('wallet_pending_goals', JSON.stringify(goals))
    checkPendingSyncItems()
  }

  const addPendingBudget = (budget: any) => {
    const pending = localStorage.getItem('wallet_pending_budgets') || '[]'
    const budgets = JSON.parse(pending)
    budgets.push({ ...budget, offlineId: Date.now() })
    localStorage.setItem('wallet_pending_budgets', JSON.stringify(budgets))
    checkPendingSyncItems()
  }

  return {
    ...state,
    syncPendingData,
    addPendingTransaction,
    addPendingGoal,
    addPendingBudget,
    checkPendingSyncItems
  }
}