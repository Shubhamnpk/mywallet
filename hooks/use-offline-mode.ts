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

      const syncResults = {
        transactions: { synced: 0, failed: 0 },
        goals: { synced: 0, failed: 0 },
        budgets: { synced: 0, failed: 0 }
      }

      // Sync transactions
      if (pendingTransactions) {
        const transactions = JSON.parse(pendingTransactions)
        for (const transaction of transactions) {
          try {
            const response = await fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(transaction)
            })

            if (response.ok) {
              syncResults.transactions.synced++
            } else {
              syncResults.transactions.failed++
              console.error('Failed to sync transaction:', response.status)
            }
          } catch (error) {
            syncResults.transactions.failed++
            console.error('Error syncing transaction:', error)
          }
        }

        if (syncResults.transactions.synced > 0) {
          localStorage.removeItem('wallet_pending_transactions')
        }
      }

      // Sync goals
      if (pendingGoals) {
        const goals = JSON.parse(pendingGoals)
        for (const goal of goals) {
          try {
            const response = await fetch('/api/goals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(goal)
            })

            if (response.ok) {
              syncResults.goals.synced++
            } else {
              syncResults.goals.failed++
              console.error('Failed to sync goal:', response.status)
            }
          } catch (error) {
            syncResults.goals.failed++
            console.error('Error syncing goal:', error)
          }
        }

        if (syncResults.goals.synced > 0) {
          localStorage.removeItem('wallet_pending_goals')
        }
      }

      // Sync budgets
      if (pendingBudgets) {
        const budgets = JSON.parse(pendingBudgets)
        for (const budget of budgets) {
          try {
            const response = await fetch('/api/budgets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(budget)
            })

            if (response.ok) {
              syncResults.budgets.synced++
            } else {
              syncResults.budgets.failed++
              console.error('Failed to sync budget:', response.status)
            }
          } catch (error) {
            syncResults.budgets.failed++
            console.error('Error syncing budget:', error)
          }
        }

        if (syncResults.budgets.synced > 0) {
          localStorage.removeItem('wallet_pending_budgets')
        }
      }

      console.log('Sync completed:', syncResults)

      // Update sync time and store in localStorage
      const syncTime = new Date()
      localStorage.setItem('wallet_last_sync', syncTime.toISOString())

      setState(prev => ({
        ...prev,
        lastSyncTime: syncTime,
        pendingSyncItems: 0
      }))

      // Trigger background sync registration if available
      if ('serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready
        await (registration as any).sync.register('sync-pending-data')
      }

    } catch (error) {
      console.error('Sync failed:', error)
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