"use client"

import { useState, useEffect } from 'react'
import { loadFromLocalStorage, saveToLocalStorage } from '@/lib/storage'

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
      void syncPendingData()
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
    void checkPendingSyncItems()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const checkPendingSyncItems = async () => {
    const stored = await loadFromLocalStorage([
      'wallet_pending_transactions',
      'wallet_pending_goals',
      'wallet_pending_budgets',
    ])

    const pendingTransactions = Array.isArray(stored.wallet_pending_transactions)
      ? stored.wallet_pending_transactions
      : []
    const pendingGoals = Array.isArray(stored.wallet_pending_goals)
      ? stored.wallet_pending_goals
      : []
    const pendingBudgets = Array.isArray(stored.wallet_pending_budgets)
      ? stored.wallet_pending_budgets
      : []

    const count = pendingTransactions.length + pendingGoals.length + pendingBudgets.length

    setState(prev => ({
      ...prev,
      pendingSyncItems: count
    }))
  }

  const syncPendingData = async () => {
    try {
      // Get pending data from localStorage
      const stored = await loadFromLocalStorage([
        'wallet_pending_transactions',
        'wallet_pending_goals',
        'wallet_pending_budgets',
      ])
      const pendingTransactions = Array.isArray(stored.wallet_pending_transactions)
        ? stored.wallet_pending_transactions
        : null
      const pendingGoals = Array.isArray(stored.wallet_pending_goals)
        ? stored.wallet_pending_goals
        : null
      const pendingBudgets = Array.isArray(stored.wallet_pending_budgets)
        ? stored.wallet_pending_budgets
        : null

      // Sync transactions
      if (pendingTransactions) {
        const transactions = pendingTransactions
        // Here you would sync with your backend
        localStorage.removeItem('wallet_pending_transactions')
      }

      // Sync goals
      if (pendingGoals) {
        const goals = pendingGoals
        localStorage.removeItem('wallet_pending_goals')
      }

      // Sync budgets
      if (pendingBudgets) {
        const budgets = pendingBudgets
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

  const addPendingTransaction = async (transaction: any) => {
    const stored = await loadFromLocalStorage(['wallet_pending_transactions'])
    const pending = Array.isArray(stored.wallet_pending_transactions)
      ? stored.wallet_pending_transactions
      : []
    const transactions = [...pending, { ...transaction, offlineId: Date.now() }]
    try {
      await saveToLocalStorage('wallet_pending_transactions', transactions, true)
    } catch {
    }
    void checkPendingSyncItems()
  }

  const addPendingGoal = async (goal: any) => {
    const stored = await loadFromLocalStorage(['wallet_pending_goals'])
    const pending = Array.isArray(stored.wallet_pending_goals)
      ? stored.wallet_pending_goals
      : []
    const goals = [...pending, { ...goal, offlineId: Date.now() }]
    try {
      await saveToLocalStorage('wallet_pending_goals', goals, true)
    } catch {
    }
    void checkPendingSyncItems()
  }

  const addPendingBudget = async (budget: any) => {
    const stored = await loadFromLocalStorage(['wallet_pending_budgets'])
    const pending = Array.isArray(stored.wallet_pending_budgets)
      ? stored.wallet_pending_budgets
      : []
    const budgets = [...pending, { ...budget, offlineId: Date.now() }]
    try {
      await saveToLocalStorage('wallet_pending_budgets', budgets, true)
    } catch {
    }
    void checkPendingSyncItems()
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
