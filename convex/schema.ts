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
    encryptedData: v.string(), // Encrypted wallet data
    dataHash: v.string(), // Hash for integrity checking
    lastModified: v.number(),
    deviceId: v.optional(v.string()), // For backward compatibility
    version: v.optional(v.string()), // For backward compatibility
  }).index("by_user_id", ["userId"]),

  // Device tracking for security
  devices: defineTable({
    userId: v.id("users"),
    deviceId: v.string(),
    deviceName: v.string(),
    lastActive: v.number(),
    createdAt: v.number(),
    ipAddress: v.optional(v.string()), // For security monitoring
  })
    .index("by_user_id", ["userId"])
    .index("by_user_device", ["userId", "deviceId"]),
})
