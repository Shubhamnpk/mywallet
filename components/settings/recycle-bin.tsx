"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Trash2, RotateCcw, AlertCircle, FileText, DollarSign, Target, Tag } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

interface RecycleBinItem {
  id: string
  itemType: string
  deletedAt: number
  deletedBy: string
  expiresAt: number
  recoverable: boolean
  latestVersion: number
  displayName?: string
  displayAmount?: number
  originalData?: string
}

interface RecycleBinProps {
  userId: string
  currentDeviceId: string | null
  onDataRefresh?: () => void
}

export function RecycleBin({ userId, currentDeviceId, onDataRefresh }: RecycleBinProps) {
  const [showRecoverDialog, setShowRecoverDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<RecycleBinItem | null>(null)

  // Queries
  const softDeletedItems = useQuery(
    api.walletData.getRecycleBinItems,
    userId ? { userId: userId as any } : "skip"
  )

  // Mutations
  const recoverItemMutation = useMutation(api.walletData.restoreItem)
  const permanentDeleteMutation = useMutation(api.walletData.permanentDeleteItem)
  const cleanupExpiredMutation = useMutation(api.walletData.cleanupExpiredRecycleBin)

  // Helper functions
  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'transaction':
        return <DollarSign className="w-4 h-4" />
      case 'budget':
        return <Target className="w-4 h-4" />
      case 'goal':
        return <Target className="w-4 h-4" />
      case 'category':
        return <Tag className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getItemDisplayName = (item: RecycleBinItem) => {
    if (item.displayName) {
      return item.displayName
    }

    // Fallback to generated name
    const capitalizedType = item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)
    return `${capitalizedType} ${item.id.slice(-8)}`
  }

  const getItemDetails = (item: RecycleBinItem) => {
    if (item.displayAmount) {
      return `$${item.displayAmount}`
    }

    // For items without display amount, show item type
    return null
  }

  const formatDeletedTime = (deletedAt: number) => {
    const now = Date.now()
    const diff = now - deletedAt
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    return `${days} days ago`
  }

  const formatTimeRemaining = (expiresAt: number) => {
    const now = Date.now()
    const diff = expiresAt - now
    if (diff <= 0) return "Expired"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  // Event handlers
  const handleRecoverItem = async () => {
    if (!selectedItem) return

    try {
      const result = await recoverItemMutation({
        userId: userId as any,
        itemId: selectedItem.id,
        deviceId: currentDeviceId || 'unknown',
      })

      if (result.success) {
        toast({
          title: "Item Recovered",
          description: `${getItemDisplayName(selectedItem)} has been restored successfully.`,
        })
        setShowRecoverDialog(false)
        setSelectedItem(null)

        // Try to update localStorage directly first (faster UX)
        try {
          if (result.itemType) {
            await recoverToStorage(selectedItem.id, result.itemType)

            // Refresh the data to update the UI immediately
            if (onDataRefresh) {
              onDataRefresh()
            }

            // Show success message without reloading
            setTimeout(() => {
              toast({
                title: "Item Restored",
                description: "The item has been restored to your wallet.",
              })
            }, 500)
          } else {
            throw new Error('Item type not available in result')
          }
        } catch (localStorageError) {
          // Still try to refresh data even if localStorage update failed
          if (onDataRefresh) {
            onDataRefresh()
          }

          // Show message that item was restored but UI may need refresh
          setTimeout(() => {
            toast({
              title: "Item Restored",
              description: "Item restored successfully. You may need to refresh to see changes.",
            })
          }, 500)
        }
      } else {
        toast({
          title: "Recovery Failed",
          description: result.error || "Failed to recover item. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to recover item. Please check your connection and try again.",
        variant: "destructive",
      })
    }
  }

  // Optimized recovery function - handles all item types with minimal code
  const recoverToStorage = async (itemId: string, itemType: string) => {
    try {
      const item = softDeletedItems?.find(i => i.id === itemId)
      if (!item?.originalData) return false

      // Parse the original data
      let recoveredItem
      try {
        recoveredItem = JSON.parse(item.originalData)
      } catch (e) {
        return false // Invalid original data
      }

      // Initialize encryption
      const { WalletDataEncryption } = await import("@/lib/encryption")
      if (!WalletDataEncryption.isInitialized()) {
        const initialized = await WalletDataEncryption.initializeWithStoredKey()
        if (!initialized) {
          return false
        }
      }

      const storageKeyMap: Record<string, string> = {
        transaction: 'transactions',
        budget: 'budgets',
        goal: 'goals',
        category: 'categories',
        debtAccount: 'debtAccounts',
        creditAccount: 'creditAccounts',
      }
      const storageKey = storageKeyMap[itemType] ?? `${itemType}s`
      const { saveToLocalStorage } = await import("@/lib/storage")

      // Parse existing data safely
      let existing: any[] = []
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        try {
          if (stored.startsWith("encrypted:")) {
            const { SecureKeyManager } = await import("@/lib/key-manager")
            const { SecureWallet } = await import("@/lib/security")
            const key = await SecureKeyManager.getMasterKey("")
            if (key) {
              const decrypted = await SecureWallet.decryptData(stored.substring(10), key)
              existing = JSON.parse(decrypted)
            }
          } else {
            existing = JSON.parse(stored)
          }
        } catch (e) {
          // Failed to parse existing data, will use empty array
        }
      }

      // Add the recovered item if it doesn't already exist
      const exists = existing.some((i: any) => i.id === recoveredItem.id)
      if (!exists) {
        existing.push(recoveredItem)
        await saveToLocalStorage(storageKey, existing)
      }

      return true
    } catch (error) {
      // Failed to recover item
      return false
    }
  }

const handlePermanentDelete = async () => {
    if (!selectedItem) return

    try {
      // Permanently delete the item from both recycle bin and all versions
      const result = await permanentDeleteMutation({
        userId: userId as any,
        itemId: selectedItem.id,
      })

      if (result.success) {
        toast({
          title: "Item Permanently Deleted",
          description: `${getItemDisplayName(selectedItem)} has been permanently removed and space freed up.`,
        })
        setShowDeleteDialog(false)
        setSelectedItem(null)
      } else {
        toast({
          title: "Permanent Delete Failed",
          description: "Failed to permanently delete item.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item permanently.",
        variant: "destructive",
      })
    }
  }

  const handleCleanupExpired = async () => {
    try {
      const result = await cleanupExpiredMutation({
        userId: userId as any,
      })

      if (result.success) {
        // Clean up expired items from local storage as well
        if (result.expiredItemIds && result.expiredItemIds.length > 0) {
          await cleanupExpiredItemsFromLocalStorage(result.expiredItemIds)
        }

        toast({
          title: "Cleanup Complete",
          description: `Removed ${result.deletedCount} expired items from recycle bin.`,
        })
      }
    } catch (error) {
      toast({
        title: "Cleanup Failed",
        description: "Failed to cleanup expired items.",
        variant: "destructive",
      })
    }
  }

  const handleRecoverAll = async () => {
    const candidates = (softDeletedItems ?? []).filter(i => i.recoverable && Date.now() <= i.expiresAt)
    if (candidates.length === 0) return

    toast({
      title: "Bulk Recovery",
      description: `Recovering ${candidates.length} items...`,
    })

    for (const i of candidates) {
      try {
        const result = await recoverItemMutation({
          userId: userId as any,
          itemId: i.id,
          deviceId: currentDeviceId || 'unknown',
        })
        if (result.success) {
          await recoverToStorage(i.id, i.itemType)
        }
      } catch (error) {
        // continue on error
      }
      // Small delay for throttling
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    onDataRefresh?.()

    toast({
      title: "Bulk Recovery Complete",
      description: `Successfully recovered ${candidates.length} items.`,
    })
  }

  const cleanupExpiredItemsFromLocalStorage = async (expiredItemIds: string[]) => {
    try {
      const { saveToLocalStorage } = await import("@/lib/storage")

      // Clean up from different localStorage arrays
      const storageKeys = ['transactions', 'budgets', 'goals', 'categories', 'debtAccounts', 'creditAccounts']

      for (const key of storageKeys) {
        const raw = localStorage.getItem(key)
        let arr: any[] = []
        if (raw) {
          try {
            if (raw.startsWith('encrypted:')) {
              const { SecureKeyManager } = await import("@/lib/key-manager")
              const { SecureWallet } = await import("@/lib/security")
              const keyMaterial = await SecureKeyManager.getMasterKey(/* userId? */ "")
              const decrypted = keyMaterial ? await SecureWallet.decryptData(raw.substring(10), keyMaterial) : '[]'
              arr = JSON.parse(decrypted)
            } else {
              arr = JSON.parse(raw)
            }
          } catch { /* ignore and treat as empty */ }
        }
        const filtered = arr.filter((it: any) => !expiredItemIds.includes(it.id))
        if (filtered.length !== arr.length) {
          await saveToLocalStorage(key, filtered)
        }
      }
    } catch (error) {
      // Failed to cleanup expired items
    }
  }

  const openRecoverDialog = (item: RecycleBinItem) => {
    setSelectedItem(item)
    setShowRecoverDialog(true)
  }

  const openDeleteDialog = (item: RecycleBinItem) => {
    setSelectedItem(item)
    setShowDeleteDialog(true)
  }

  if (!softDeletedItems || softDeletedItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Recycle Bin
          </CardTitle>
          <CardDescription>
            Deleted items are stored here for 30 days before permanent removal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Recycle bin is empty</p>
            <p className="text-xs">Deleted items will appear here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Recycle Bin ({softDeletedItems.length})
        </CardTitle>
        <CardDescription>
          Deleted items are stored here for 30 days before permanent removal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cleanup expired items */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Items are automatically deleted after 30 days
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanupExpired}
            className="text-xs"
          >
            Clean Up Expired
          </Button>
        </div>

        <Separator />

        {/* Recycle bin items */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {softDeletedItems.map((item) => {
            const isExpired = Date.now() > item.expiresAt
            const isRecoverable = item.recoverable && !isExpired

            return (
              <div
                key={item.id}
                className={`p-3 border rounded-lg transition-all duration-200 ${
                  isExpired ? 'border-destructive/30 bg-destructive/5' : 'hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Item info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-md ${
                      isExpired ? 'bg-destructive/10' : 'bg-muted'
                    }`}>
                      {getItemIcon(item.itemType)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {getItemDisplayName(item)}
                        </p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.itemType}
                        </Badge>
                        {isExpired && (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatDeletedTime(item.deletedAt)}</span>
                        <span>{formatTimeRemaining(item.expiresAt)}</span>
                        {getItemDetails(item) && (
                          <span className="font-medium text-foreground">
                            {getItemDetails(item)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isRecoverable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRecoverDialog(item)}
                        className="text-xs"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Recover
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(item)}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bulk actions */}
        {softDeletedItems.length > 1 && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecoverAll}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Recover All
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const expiredCount = softDeletedItems.filter(
                    item => Date.now() > item.expiresAt
                  ).length
                  if (expiredCount > 0) {
                    handleCleanupExpired()
                  }
                }}
                className="text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Empty Expired ({softDeletedItems.filter(item => Date.now() > item.expiresAt).length})
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {/* Recover Item Dialog */}
      <Dialog open={showRecoverDialog} onOpenChange={setShowRecoverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Recover Item
            </DialogTitle>
            <DialogDescription>
              Restore "{selectedItem ? getItemDisplayName(selectedItem) : ''}" to your wallet?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowRecoverDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleRecoverItem} className="flex-1">
              Recover Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Permanently Delete Item
            </DialogTitle>
            <DialogDescription>
              This will permanently remove "{selectedItem ? getItemDisplayName(selectedItem) : ''}"
              from your wallet. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handlePermanentDelete} className="flex-1">
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
