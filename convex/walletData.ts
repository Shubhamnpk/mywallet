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

    if (existingMetadata) {
      await ctx.db.patch(existingMetadata._id, {
        lastSyncAt: now,
        syncVersion: args.syncVersion,
      })
    } else {
      await ctx.db.insert("syncMetadata", {
        userId: args.userId,
        deviceId: args.deviceId,
        lastSyncAt: now,
        syncVersion: args.syncVersion,
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
      lastSyncAt: meta.lastSyncAt,
      syncVersion: meta.syncVersion,
    }))
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
