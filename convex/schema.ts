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
    deviceName: v.optional(v.string()), // Device name (e.g., "Chrome on Windows", "Safari on iPhone")
    lastSyncAt: v.number(),
    syncVersion: v.string(),
    isActive: v.optional(v.boolean()), // Whether this device is actively syncing
  })
    .index("by_user_id", ["userId"])
    .index("by_user_device", ["userId", "deviceId"]),

  // Comprehensive versioned data management system
  dataVersions: defineTable({
    id: v.string(), // itemId_version (e.g., "txn_123_v2")
    itemId: v.string(), // The actual data item ID
    version: v.number(), // Incremental version number (0, 1, 2...)
    operation: v.string(), // 'CREATE', 'UPDATE', 'DELETE', 'RESTORE'
    deviceId: v.string(), // Device that made the change
    timestamp: v.number(),
    encryptedData: v.optional(v.string()), // Encrypted data payload
    dataHash: v.optional(v.string()), // Hash for integrity verification
    userId: v.id("users"),
    itemType: v.string(), // 'transaction', 'budget', 'goal', 'category'
    status: v.string(), // 'active', 'soft_deleted', 'permanently_deleted'
    syncStatus: v.string(), // 'local', 'syncing', 'synced', 'conflict'
  })
    .index("by_user_item", ["userId", "itemId"])
    .index("by_user_version", ["userId", "version"])
    .index("by_timestamp", ["timestamp"])
    .index("by_status", ["status"])
    .index("by_sync_status", ["syncStatus"]),

  // Recycle bin for soft-deleted items
  recycleBin: defineTable({
    id: v.string(), // Same as itemId
    userId: v.id("users"),
    itemType: v.string(),
    deletedAt: v.number(),
    deletedBy: v.string(),
    expiresAt: v.number(), // 7 days from deletion
    recoverable: v.boolean(),
    latestVersion: v.number(), // Reference to latest version
    displayName: v.optional(v.string()), // For UI display (e.g., transaction description, budget name)
    displayAmount: v.optional(v.number()), // For UI display (e.g., transaction amount)
    originalData: v.optional(v.string()), // Encrypted original data for restoration
  })
    .index("by_user_id", ["userId"])
    .index("by_expires_at", ["expiresAt"]),

  // Current state view (derived from versions)
  currentDataState: defineTable({
    id: v.string(), // itemId
    userId: v.id("users"),
    itemType: v.string(),
    latestVersion: v.number(),
    status: v.string(), // 'active', 'soft_deleted', 'permanently_deleted'
    lastModified: v.number(),
    encryptedData: v.optional(v.string()), // Encrypted data payload
    dataHash: v.optional(v.string()), // Hash for integrity verification
  })
    .index("by_user_id", ["userId"])
    .index("by_status", ["status"]),
})
