import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { Doc, Id } from "./_generated/dataModel"

// Store encrypted wallet data
export const storeWalletData = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
    encryptedData: v.string(),
    dataHash: v.string(),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if data already exists for this user and device
      const existingData = await ctx.db
        .query("walletData")
        .withIndex("by_user_device", (q) =>
          q.eq("userId", args.userId).eq("deviceId", args.deviceId)
        )
        .first()

      const now = Date.now()

      if (existingData) {
        // Update existing data
        await ctx.db.patch(existingData._id, {
          encryptedData: args.encryptedData,
          dataHash: args.dataHash,
          lastModified: now,
          version: args.version,
        })
        return { success: true, action: "updated", timestamp: now }
      } else {
        // Create new data entry
        const newId = await ctx.db.insert("walletData", {
          userId: args.userId,
          deviceId: args.deviceId,
          encryptedData: args.encryptedData,
          dataHash: args.dataHash,
          lastModified: now,
          version: args.version,
        })
        return { success: true, action: "created", id: newId, timestamp: now }
      }
    } catch (error) {
      console.error("Failed to store wallet data:", error)
      return { success: false, error: "Failed to store data" }
    }
  },
})

// Get wallet data for a user
export const getWalletData = query({
  args: {
    userId: v.id("users"),
    deviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.deviceId) {
      // Get data for specific device
      const data = await ctx.db
        .query("walletData")
        .withIndex("by_user_device", (q) =>
          q.eq("userId", args.userId).eq("deviceId", args.deviceId!)
        )
        .first()

      return data ? {
        id: data._id,
        encryptedData: data.encryptedData,
        dataHash: data.dataHash,
        lastModified: data.lastModified,
        version: data.version,
        deviceId: data.deviceId,
      } : null
    } else {
      // Get all data for user (for cross-device sync)
      const allData = await ctx.db
        .query("walletData")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .collect()

      return allData.map(data => ({
        id: data._id,
        encryptedData: data.encryptedData,
        dataHash: data.dataHash,
        lastModified: data.lastModified,
        version: data.version,
        deviceId: data.deviceId,
      }))
    }
  },
})

// Get the latest wallet data across all devices
export const getLatestWalletData = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const allData = await ctx.db
        .query("walletData")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .collect()

      if (allData.length === 0) {
        console.log(`No wallet data found for user ${args.userId}`)
        return null
      }

      // Find the most recently modified data
      const latestData = allData.reduce((latest, current) =>
        current.lastModified > latest.lastModified ? current : latest
      )

      console.log(`Found latest wallet data for user ${args.userId}, last modified: ${new Date(latestData.lastModified).toISOString()}`)

      return {
        id: latestData._id,
        encryptedData: latestData.encryptedData,
        dataHash: latestData.dataHash,
        lastModified: latestData.lastModified,
        version: latestData.version,
        deviceId: latestData.deviceId,
      }
    } catch (error) {
      console.error(`Failed to get latest wallet data for user ${args.userId}:`, error)
      return null
    }
  },
})

// Delete wallet data for a specific device
export const deleteWalletData = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("walletData")
      .withIndex("by_user_device", (q) =>
        q.eq("userId", args.userId).eq("deviceId", args.deviceId)
      )
      .first()

    if (data) {
      await ctx.db.delete(data._id)
      return { success: true }
    }

    return { success: false, message: "Data not found" }
  },
})

// Update sync metadata
export const updateSyncMetadata = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
    deviceName: v.optional(v.string()),
    syncVersion: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if metadata exists
    const existingMetadata = await ctx.db
      .query("syncMetadata")
      .withIndex("by_user_device", (q) =>
        q.eq("userId", args.userId).eq("deviceId", args.deviceId)
      )
      .first()

    const now = Date.now()
    const deviceName = args.deviceName || `Device ${args.deviceId.slice(0, 8)}`

    if (existingMetadata) {
      await ctx.db.patch(existingMetadata._id, {
        deviceName,
        lastSyncAt: now,
        syncVersion: args.syncVersion,
        isActive: true, // Mark as active when syncing
      })
    } else {
      await ctx.db.insert("syncMetadata", {
        userId: args.userId,
        deviceId: args.deviceId,
        deviceName,
        lastSyncAt: now,
        syncVersion: args.syncVersion,
        isActive: true,
      })
    }

    return { success: true }
  },
})

// Get sync metadata
export const getSyncMetadata = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const metadata = await ctx.db
      .query("syncMetadata")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect()

    return metadata.map(meta => ({
      deviceId: meta.deviceId,
      deviceName: meta.deviceName,
      lastSyncAt: meta.lastSyncAt,
      syncVersion: meta.syncVersion,
      isActive: meta.isActive,
    }))
  },
})

// Get all connected devices for a user
export const getConnectedDevices = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const devices = await ctx.db
        .query("syncMetadata")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .collect()

      return devices.map(device => ({
        deviceId: device.deviceId,
        deviceName: device.deviceName || `Device ${device.deviceId.slice(0, 8)}`,
        lastSyncAt: device.lastSyncAt,
        syncVersion: device.syncVersion,
        isActive: device.isActive !== undefined ? device.isActive : true,
        isCurrentDevice: false, // Will be set by frontend
      })).sort((a, b) => b.lastSyncAt - a.lastSyncAt) // Sort by most recent sync first
    } catch (error) {
      console.error("Failed to get connected devices:", error)
      // Return empty array on error to prevent crashes
      return []
    }
  },
})

// Update device active status (pause/resume sync)
export const updateDeviceStatus = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("syncMetadata")
      .withIndex("by_user_device", (q) =>
        q.eq("userId", args.userId).eq("deviceId", args.deviceId)
      )
      .first()

    if (device) {
      await ctx.db.patch(device._id, {
        isActive: args.isActive,
        lastSyncAt: Date.now(), // Update last activity
      })
      return { success: true }
    }

    return { success: false, error: "Device not found" }
  },
})

// Delete device from sync metadata
export const deleteDevice = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Find the device metadata
      const device = await ctx.db
        .query("syncMetadata")
        .withIndex("by_user_device", (q) =>
          q.eq("userId", args.userId).eq("deviceId", args.deviceId)
        )
        .first()

      if (!device) {
        return { success: false, error: "Device not found" }
      }

      // Delete the device metadata
      await ctx.db.delete(device._id)

      // Also delete any wallet data for this device (optional - keep data for recovery)
      // const walletData = await ctx.db
      //   .query("walletData")
      //   .withIndex("by_user_device", (q) =>
      //     q.eq("userId", args.userId).eq("deviceId", args.deviceId)
      //   )
      //   .first()

      // if (walletData) {
      //   await ctx.db.delete(walletData._id)
      // }

      return { success: true, deviceName: device.deviceName }
    } catch (error) {
      console.error("Failed to delete device:", error)
      return { success: false, error: "Failed to delete device" }
    }
  },
})

// Get detailed device information
export const getDeviceDetails = query({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const device = await ctx.db
        .query("syncMetadata")
        .withIndex("by_user_device", (q) =>
          q.eq("userId", args.userId).eq("deviceId", args.deviceId)
        )
        .first()

      if (!device) {
        return null
      }

      // Get data size for this device
      const walletData = await ctx.db
        .query("walletData")
        .withIndex("by_user_device", (q) =>
          q.eq("userId", args.userId).eq("deviceId", args.deviceId)
        )
        .first()

      return {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        lastSyncAt: device.lastSyncAt,
        syncVersion: device.syncVersion,
        isActive: device.isActive,
        dataSize: walletData ? JSON.stringify(walletData.encryptedData).length : 0,
        createdAt: device._creationTime,
      }
    } catch (error) {
      console.error("Failed to get device details:", error)
      return null
    }
  },
})

// Rename device
export const renameDevice = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const device = await ctx.db
        .query("syncMetadata")
        .withIndex("by_user_device", (q) =>
          q.eq("userId", args.userId).eq("deviceId", args.deviceId)
        )
        .first()

      if (!device) {
        return { success: false, error: "Device not found" }
      }

      // Validate new name
      if (!args.newName.trim() || args.newName.length > 50) {
        return { success: false, error: "Invalid device name" }
      }

      await ctx.db.patch(device._id, {
        deviceName: args.newName.trim(),
        lastSyncAt: Date.now(),
      })

      return { success: true, oldName: device.deviceName, newName: args.newName.trim() }
    } catch (error) {
      console.error("Failed to rename device:", error)
      return { success: false, error: "Failed to rename device" }
    }
  },
})

// Check if user has existing wallet data
export const hasExistingWalletData = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existingData = await ctx.db
      .query("walletData")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first()

    return { hasData: !!existingData }
  },
})

// Create a new versioned operation for any wallet data type with cross-device sync
export const createVersionedOperation = mutation({
  args: {
    itemId: v.string(),
    operation: v.string(), // 'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'PERMANENT_DELETE'
    encryptedData: v.optional(v.string()), // Encrypted data instead of plain data
    dataHash: v.optional(v.string()), // Hash for integrity verification
    userId: v.id("users"),
    itemType: v.string(), // 'transaction', 'budget', 'goal', 'debtAccount', 'creditAccount', 'category'
    deviceId: v.string(),
    displayName: v.optional(v.string()), // Display name for recycle bin
    displayAmount: v.optional(v.number()), // Display amount for recycle bin
  },
  handler: async (ctx, args) => {
    // Get the latest version for this item
    const latestVersionQuery = await ctx.db
      .query("dataVersions")
      .withIndex("by_user_item", (q) =>
        q.eq("userId", args.userId).eq("itemId", args.itemId)
      )
      .order("desc")
      .first()

    const newVersion = latestVersionQuery ? latestVersionQuery.version + 1 : 0
    const versionId = `${args.itemId}_v${newVersion}`

    // Create the version record with encrypted data
    const versionRecord = await ctx.db.insert("dataVersions", {
      id: versionId,
      itemId: args.itemId,
      version: newVersion,
      operation: args.operation,
      deviceId: args.deviceId,
      timestamp: Date.now(),
      encryptedData: args.encryptedData, // Store encrypted data
      dataHash: args.dataHash, // Store hash for integrity
      userId: args.userId,
      itemType: args.itemType,
      status: args.operation === 'DELETE' ? 'soft_deleted' :
             args.operation === 'PERMANENT_DELETE' ? 'permanently_deleted' : 'active',
      syncStatus: 'local',
    })

    // Update or create current state with encrypted data
    const existingState = await ctx.db
      .query("currentDataState")
      .withIndex("by_user_id", (q) =>
        q.eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("id"), args.itemId))
      .first()

    if (existingState) {
      await ctx.db.patch(existingState._id, {
        latestVersion: newVersion,
        status: args.operation === 'DELETE' ? 'soft_deleted' :
               args.operation === 'PERMANENT_DELETE' ? 'permanently_deleted' : 'active',
        lastModified: Date.now(),
        encryptedData: args.encryptedData, // Store encrypted data
        dataHash: args.dataHash, // Store hash for integrity
      })
    } else {
      await ctx.db.insert("currentDataState", {
        id: args.itemId,
        userId: args.userId,
        itemType: args.itemType,
        latestVersion: newVersion,
        status: args.operation === 'DELETE' ? 'soft_deleted' :
               args.operation === 'PERMANENT_DELETE' ? 'permanently_deleted' : 'active',
        lastModified: Date.now(),
        encryptedData: args.encryptedData, // Store encrypted data
        dataHash: args.dataHash, // Store hash for integrity
      })
    }

    // BROADCAST CHANGES TO ALL DEVICES - Update sync metadata to force sync
    if (args.operation === 'DELETE' || args.operation === 'PERMANENT_DELETE') {
      const allDevices = await ctx.db
        .query("syncMetadata")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .collect()

      // Update last sync time for all devices to force them to pull the latest data
      for (const device of allDevices) {
        await ctx.db.patch(device._id, {
          lastSyncAt: Date.now(),
          syncVersion: `${args.operation}_${args.itemId}_${newVersion}`,
        })
      }
    }

    // If it's a delete operation, add to recycle bin
    if (args.operation === 'DELETE') {
      const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days

      // Use provided display information or fall back to generated names
      let displayName = args.displayName
      let displayAmount = args.displayAmount

      // Fallback to generated names if not provided
      if (!displayName) {
        const capitalizedType = args.itemType.charAt(0).toUpperCase() + args.itemType.slice(1)
        displayName = `${capitalizedType} ${args.itemId.slice(-8)}`
      }

      await ctx.db.insert("recycleBin", {
        id: args.itemId,
        userId: args.userId,
        itemType: args.itemType,
        deletedAt: Date.now(),
        deletedBy: args.deviceId,
        expiresAt,
        recoverable: true,
        latestVersion: newVersion,
        displayName,
        displayAmount,
        originalData: args.encryptedData, // Store encrypted data for restoration
      })
    }

    return { success: true, versionId, version: newVersion }
  },
})

// Restore a soft deleted item with cross-device conflict resolution
export const restoreItem = mutation({
  args: {
    userId: v.id("users"),
    itemId: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Remove from recycle bin
      const recycleBinItem = await ctx.db
        .query("recycleBin")
        .withIndex("by_user_id", (q) =>
          q.eq("userId", args.userId)
        )
        .filter((q) => q.eq(q.field("id"), args.itemId))
        .first()

      if (recycleBinItem) {
        await ctx.db.delete(recycleBinItem._id)
      }

      // Get all versions for this item (excluding permanently deleted)
      const allVersions = await ctx.db
        .query("dataVersions")
        .withIndex("by_user_item", (q) =>
          q.eq("userId", args.userId).eq("itemId", args.itemId)
        )
        .filter((q) => q.neq(q.field("operation"), "PERMANENT_DELETE"))
        .collect()

      if (allVersions.length === 0) {
        return { success: false, error: "No version history found for this item" }
      }

      // Sort versions by version number (highest first)
      const sortedVersions = allVersions.sort((a, b) => b.version - a.version)
      const latestVersion = sortedVersions[0]

      // Find the most recent operation that contains data
      let encryptedDataToRestore = null
      let dataHashToRestore = null
      let itemType = null

      // First, try to find the most recent DELETE operation (which should contain the original data)
      const deleteOperation = sortedVersions.find(v => v.operation === 'DELETE')
      if (deleteOperation && deleteOperation.encryptedData) {
        encryptedDataToRestore = deleteOperation.encryptedData
        dataHashToRestore = deleteOperation.dataHash
        itemType = deleteOperation.itemType
      }

      // If no DELETE operation with data, try UPDATE operations
      if (!encryptedDataToRestore) {
        const updateOperation = sortedVersions.find(v => v.operation === 'UPDATE' && v.encryptedData)
        if (updateOperation) {
          encryptedDataToRestore = updateOperation.encryptedData
          dataHashToRestore = updateOperation.dataHash
          itemType = updateOperation.itemType
        }
      }

      // If still no data, try CREATE operations
      if (!encryptedDataToRestore) {
        const createOperation = sortedVersions.find(v => v.operation === 'CREATE' && v.encryptedData)
        if (createOperation) {
          encryptedDataToRestore = createOperation.encryptedData
          dataHashToRestore = createOperation.dataHash
          itemType = createOperation.itemType
        }
      }

      // If still no data found, try any operation with data
      if (!encryptedDataToRestore) {
        const anyOperationWithData = sortedVersions.find(v => v.encryptedData)
        if (anyOperationWithData) {
          encryptedDataToRestore = anyOperationWithData.encryptedData
          dataHashToRestore = anyOperationWithData.dataHash
          itemType = anyOperationWithData.itemType
        }
      }

      if (!encryptedDataToRestore || !itemType) {
        return { success: false, error: "No valid data found to restore" }
      }

      const newVersion = latestVersion.version + 1
      const versionId = `${args.itemId}_v${newVersion}`

      // Create restore version with the found encrypted data
      await ctx.db.insert("dataVersions", {
        id: versionId,
        itemId: args.itemId,
        version: newVersion,
        operation: 'RESTORE',
        deviceId: args.deviceId,
        timestamp: Date.now(),
        encryptedData: encryptedDataToRestore || undefined,
        dataHash: dataHashToRestore || undefined,
        userId: args.userId,
        itemType: itemType,
        status: 'active',
        syncStatus: 'local',
      })

      // Update or create current state - FORCE ACTIVE STATUS FOR ALL DEVICES
      const existingState = await ctx.db
        .query("currentDataState")
        .withIndex("by_user_id", (q) =>
          q.eq("userId", args.userId)
        )
        .filter((q) => q.eq(q.field("id"), args.itemId))
        .first()

      if (existingState) {
        await ctx.db.patch(existingState._id, {
          latestVersion: newVersion,
          status: 'active', // FORCE ACTIVE - this resolves cross-device conflicts
          lastModified: Date.now(),
          encryptedData: encryptedDataToRestore || undefined,
          dataHash: dataHashToRestore || undefined,
        })
      } else {
        await ctx.db.insert("currentDataState", {
          id: args.itemId,
          userId: args.userId,
          itemType: itemType,
          latestVersion: newVersion,
          status: 'active', // FORCE ACTIVE - this resolves cross-device conflicts
          lastModified: Date.now(),
          encryptedData: encryptedDataToRestore || undefined,
          dataHash: dataHashToRestore || undefined,
        })
      }

      // BROADCAST RESTORE TO ALL DEVICES - Update sync metadata to force sync
      const allDevices = await ctx.db
        .query("syncMetadata")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .collect()

      // Update last sync time for all devices to force them to pull the latest data
      for (const device of allDevices) {
        await ctx.db.patch(device._id, {
          lastSyncAt: Date.now(),
          syncVersion: `restore_${args.itemId}_${newVersion}`,
        })
      }

      return { success: true, version: newVersion, itemType: itemType }
    } catch (error) {
      console.error("Failed to restore item:", error)
      return { success: false, error: "Failed to restore item" }
    }
  },
})

// Permanently delete an item
export const permanentDeleteItem = mutation({
  args: {
    userId: v.id("users"),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    // Remove from recycle bin
    const recycleBinItem = await ctx.db
      .query("recycleBin")
      .withIndex("by_user_id", (q) =>
        q.eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("id"), args.itemId))
      .first()

    if (recycleBinItem) {
      await ctx.db.delete(recycleBinItem._id)
    }

    // Mark all versions as permanently deleted
    const allVersions = await ctx.db
      .query("dataVersions")
      .withIndex("by_user_item", (q) =>
        q.eq("userId", args.userId).eq("itemId", args.itemId)
      )
      .collect()

    for (const version of allVersions) {
      await ctx.db.patch(version._id, {
        status: 'permanently_deleted',
        syncStatus: 'synced',
      })
    }

    // Update current state
    const currentState = await ctx.db
      .query("currentDataState")
      .withIndex("by_user_id", (q) =>
        q.eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("id"), args.itemId))
      .first()

    if (currentState) {
      await ctx.db.patch(currentState._id, {
        status: 'permanently_deleted',
        lastModified: Date.now(),
      })
    }

    return { success: true }
  },
})

// Cleanup expired recycle bin items (7 days) with cross-device sync
export const cleanupExpiredRecycleBin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now()

    const expiredItems = await ctx.db
      .query("recycleBin")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect()

    let deletedCount = 0
    const expiredItemIds: string[] = []

    for (const expiredItem of expiredItems) {
      // Remove from recycle bin
      await ctx.db.delete(expiredItem._id)
      expiredItemIds.push(expiredItem.id)

      // Mark all versions as permanently deleted
      const allVersions = await ctx.db
        .query("dataVersions")
        .withIndex("by_user_item", (q) =>
          q.eq("userId", args.userId).eq("itemId", expiredItem.id)
        )
        .collect()

      for (const version of allVersions) {
        await ctx.db.patch(version._id, {
          status: 'permanently_deleted',
          syncStatus: 'synced',
        })
      }

      // Update current state
      const currentState = await ctx.db
        .query("currentDataState")
        .withIndex("by_user_id", (q) =>
          q.eq("userId", args.userId)
        )
        .filter((q) => q.eq(q.field("id"), expiredItem.id))
        .first()

      if (currentState) {
        await ctx.db.patch(currentState._id, {
          status: 'permanently_deleted',
          lastModified: Date.now(),
        })
      }

      deletedCount++
    }

    // BROADCAST CLEANUP TO ALL DEVICES - Update sync metadata to force sync
    if (expiredItemIds.length > 0) {
      const allDevices = await ctx.db
        .query("syncMetadata")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .collect()

      // Update last sync time for all devices to force them to pull the latest data
      for (const device of allDevices) {
        await ctx.db.patch(device._id, {
          lastSyncAt: Date.now(),
          syncVersion: `cleanup_${Date.now()}_${deletedCount}`,
        })
      }
    }

    return { success: true, deletedCount, expiredItemIds }
  },
})

// Get recycle bin items for a user
export const getRecycleBinItems = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const recycleBinItems = await ctx.db
      .query("recycleBin")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect()

    return recycleBinItems.map(item => ({
      id: item.id,
      itemType: item.itemType,
      deletedAt: item.deletedAt,
      deletedBy: item.deletedBy,
      expiresAt: item.expiresAt,
      recoverable: item.recoverable,
      latestVersion: item.latestVersion,
      displayName: item.displayName,
      displayAmount: item.displayAmount,
      originalData: item.originalData,
    }))
  },
})

// Get current state of all items for a user
export const getCurrentDataState = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentStates = await ctx.db
      .query("currentDataState")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect()

    return currentStates.map(state => ({
      id: state.id,
      itemType: state.itemType,
      latestVersion: state.latestVersion,
      status: state.status,
      lastModified: state.lastModified,
      encryptedData: state.encryptedData,
      dataHash: state.dataHash,
    }))
  },
})

// Get version history for an item
export const getItemVersionHistory = query({
  args: {
    userId: v.id("users"),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("dataVersions")
      .withIndex("by_user_item", (q) =>
        q.eq("userId", args.userId).eq("itemId", args.itemId)
      )
      .collect()

    return versions.map(version => ({
      id: version.id,
      version: version.version,
      operation: version.operation,
      deviceId: version.deviceId,
      timestamp: version.timestamp,
      encryptedData: version.encryptedData,
      dataHash: version.dataHash,
      status: version.status,
      syncStatus: version.syncStatus,
    })).sort((a, b) => b.version - a.version)
  },
})

// Get all wallet data for a user (device-agnostic)
export const getAllUserData = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      // Get ALL wallet data for this user across all devices
      const allData = await ctx.db
        .query("walletData")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .collect()

      if (allData.length === 0) {
        console.log(`No wallet data found for user ${args.userId}`)
        return null
      }

      // Return the most recent data regardless of device
      const latestData = allData.reduce((latest, current) =>
        current.lastModified > latest.lastModified ? current : latest
      )

      console.log(`Found latest wallet data for user ${args.userId}, last modified: ${new Date(latestData.lastModified).toISOString()}`)

      return {
        id: latestData._id,
        encryptedData: latestData.encryptedData,
        dataHash: latestData.dataHash,
        lastModified: latestData.lastModified,
        version: latestData.version,
        deviceId: latestData.deviceId, // Keep for reference
      }
    } catch (error) {
      console.error(`Failed to get all user data for user ${args.userId}:`, error)
      return null
    }
  },
})
