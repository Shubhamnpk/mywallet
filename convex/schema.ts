import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // User accounts for Convex sync
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
    lastLoginAt: v.number(),
  }).index("by_email", ["email"]),

  // Encrypted wallet data storage
  walletData: defineTable({
    userId: v.id("users"),
    deviceId: v.string(),
    encryptedData: v.string(), // Encrypted wallet data
    dataHash: v.string(), // Hash for integrity checking
    lastModified: v.number(),
    version: v.string(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_device", ["userId", "deviceId"]),

  // Sync metadata for conflict resolution
  syncMetadata: defineTable({
    userId: v.id("users"),
    deviceId: v.string(),
    lastSyncAt: v.number(),
    syncVersion: v.string(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_device", ["userId", "deviceId"]),
})
