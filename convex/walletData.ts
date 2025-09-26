import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Store encrypted wallet data
export const storeWalletData = mutation({
  args: {
    userId: v.id("users"),
    encryptedData: v.string(),
    dataHash: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if data already exists for this user
      const existingData = await ctx.db
        .query("walletData")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .first()

      const now = Date.now()

      if (existingData) {
        // Update existing data
        await ctx.db.patch(existingData._id, {
          encryptedData: args.encryptedData,
          dataHash: args.dataHash,
          lastModified: now,
        })
        return { success: true, action: "updated", timestamp: now }
      } else {
        // Create new data entry
        const newId = await ctx.db.insert("walletData", {
          userId: args.userId,
          encryptedData: args.encryptedData,
          dataHash: args.dataHash,
          lastModified: now,
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
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const data = await ctx.db
        .query("walletData")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .first()

      if (!data) {
        return null
      }

      return {
        id: data._id,
        encryptedData: data.encryptedData,
        dataHash: data.dataHash,
        lastModified: data.lastModified,
      }
    } catch (error) {
      console.error("Failed to get wallet data:", error)
      return null
    }
  },
})

// Delete wallet data for a user
export const deleteWalletData = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const data = await ctx.db
        .query("walletData")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .first()

      if (data) {
        await ctx.db.delete(data._id)
        return { success: true }
      }

      return { success: false, message: "Data not found" }
    } catch (error) {
      console.error("Failed to delete wallet data:", error)
      return { success: false, error: "Failed to delete data" }
    }
  },
})

// Register or update device
export const registerDevice = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
    deviceName: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const now = Date.now()

      // Check if device already exists
      const existingDevice = await ctx.db
        .query("devices")
        .withIndex("by_user_device", (q) =>
          q.eq("userId", args.userId).eq("deviceId", args.deviceId)
        )
        .first()

      if (existingDevice) {
        // Update last active time
        await ctx.db.patch(existingDevice._id, {
          lastActive: now,
          ipAddress: args.ipAddress,
        })
        return { success: true, action: "updated" }
      } else {
        // Register new device
        await ctx.db.insert("devices", {
          userId: args.userId,
          deviceId: args.deviceId,
          deviceName: args.deviceName,
          lastActive: now,
          createdAt: now,
          ipAddress: args.ipAddress,
        })
        return { success: true, action: "created" }
      }
    } catch (error) {
      console.error("Failed to register device:", error)
      return { success: false, error: "Failed to register device" }
    }
  },
})

// Get all devices for a user
export const getUserDevices = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const devices = await ctx.db
        .query("devices")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .collect()

      return devices.map(device => ({
        id: device._id,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        lastActive: device.lastActive,
        createdAt: device.createdAt,
        ipAddress: device.ipAddress,
      })).sort((a, b) => b.lastActive - a.lastActive)
    } catch (error) {
      console.error("Failed to get user devices:", error)
      return []
    }
  },
})

// Remove a device
export const removeDevice = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const device = await ctx.db
        .query("devices")
        .withIndex("by_user_device", (q) =>
          q.eq("userId", args.userId).eq("deviceId", args.deviceId)
        )
        .first()

      if (!device) {
        return { success: false, error: "Device not found" }
      }

      await ctx.db.delete(device._id)
      return { success: true, deviceName: device.deviceName }
    } catch (error) {
      console.error("Failed to remove device:", error)
      return { success: false, error: "Failed to remove device" }
    }
  },
})
