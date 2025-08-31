export interface CategoryDefinition {
  name: string
  type: "income" | "expense"
  icon?: string
  color?: string
  description?: string
}

export const DEFAULT_EXPENSE_CATEGORIES: CategoryDefinition[] = [
  { name: "Food & Dining", type: "expense", icon: "🍽️", color: "#ef4444", description: "Restaurants, takeout, and dining expenses" },
  { name: "Transportation", type: "expense", icon: "🚗", color: "#3b82f6", description: "Gas, public transport, rideshare, and vehicle maintenance" },
  { name: "Shopping", type: "expense", icon: "🛍️", color: "#8b5cf6", description: "Clothing, electronics, and general shopping" },
  { name: "Entertainment", type: "expense", icon: "🎬", color: "#f59e0b", description: "Movies, games, concerts, and leisure activities" },
  { name: "Bills & Utilities", type: "expense", icon: "⚡", color: "#10b981", description: "Electricity, water, internet, and phone bills" },
  { name: "Healthcare", type: "expense", icon: "🏥", color: "#06b6d4", description: "Medical bills, insurance, and health expenses" },
  { name: "Education", type: "expense", icon: "📚", color: "#6366f1", description: "Tuition, books, courses, and educational materials" },
  { name: "Travel", type: "expense", icon: "✈️", color: "#84cc16", description: "Flights, hotels, and travel-related expenses" },
  { name: "Groceries", type: "expense", icon: "🛒", color: "#f97316", description: "Supermarket and grocery shopping" },
  { name: "Housing", type: "expense", icon: "🏠", color: "#ec4899", description: "Rent, mortgage, and home maintenance" },
  { name: "Insurance", type: "expense", icon: "🛡️", color: "#64748b", description: "Health, auto, home, and other insurance" },
  { name: "Other", type: "expense", icon: "📦", color: "#6b7280", description: "Miscellaneous expenses" },
]

export const DEFAULT_INCOME_CATEGORIES: CategoryDefinition[] = [
  { name: "Salary", type: "income", icon: "💼", color: "#10b981", description: "Regular employment income" },
  { name: "Freelance", type: "income", icon: "💻", color: "#3b82f6", description: "Freelance and contract work" },
  { name: "Business", type: "income", icon: "🏢", color: "#8b5cf6", description: "Business and entrepreneurial income" },
  { name: "Investment", type: "income", icon: "📈", color: "#f59e0b", description: "Dividends, interest, and investment returns" },
  { name: "Gift", type: "income", icon: "🎁", color: "#ef4444", description: "Gifts and monetary presents" },
  { name: "Bonus", type: "income", icon: "🎯", color: "#06b6d4", description: "Work bonuses and incentives" },
  { name: "Side Hustle", type: "income", icon: "🚀", color: "#6366f1", description: "Side jobs and additional income streams" },
  { name: "Rental Income", type: "income", icon: "🏠", color: "#84cc16", description: "Property rental and lease income" },
  { name: "Refund", type: "income", icon: "↩️", color: "#f97316", description: "Refunds and reimbursements" },
  { name: "Other", type: "income", icon: "💰", color: "#ec4899", description: "Miscellaneous income" },
]

export const ALL_DEFAULT_CATEGORIES = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES]

/**
 * Get default categories by type
 */
export function getDefaultCategories(type: "income" | "expense" | "all" = "all"): CategoryDefinition[] {
  switch (type) {
    case "income":
      return DEFAULT_INCOME_CATEGORIES
    case "expense":
      return DEFAULT_EXPENSE_CATEGORIES
    case "all":
    default:
      return ALL_DEFAULT_CATEGORIES
  }
}

/**
 * Get category names by type
 */
export function getDefaultCategoryNames(type: "income" | "expense" | "all" = "all"): string[] {
  return getDefaultCategories(type).map(cat => cat.name)
}

/**
 * Get category definition by name
 */
export function getCategoryByName(name: string): CategoryDefinition | undefined {
  return ALL_DEFAULT_CATEGORIES.find(cat => cat.name === name)
}

/**
 * Get category icon by name
 */
export function getCategoryIcon(name: string): string {
  const category = getCategoryByName(name)
  return category?.icon || "📦"
}

/**
 * Get category color by name
 */
export function getCategoryColor(name: string): string {
  const category = getCategoryByName(name)
  return category?.color || "#6b7280"
}

/**
 * Get category description by name
 */
export function getCategoryDescription(name: string): string {
  const category = getCategoryByName(name)
  return category?.description || ""
}

/**
 * Check if a category is a default category
 */
export function isDefaultCategory(name: string): boolean {
  return ALL_DEFAULT_CATEGORIES.some(cat => cat.name === name)
}

/**
 * Get categories for onboarding (simplified version)
 */
export const ONBOARDING_EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Bills & Utilities",
  "Entertainment",
  "Healthcare",
  "Education",
  "Other"
]

// Available icons for custom category creation
export const AVAILABLE_ICONS = [
  "🍽️", "🚗", "🛍️", "⚡", "🎬", "🏥", "📚", "✈️",
  "🛒", "🏠", "🛡️", "📦", "💼", "💻", "🏢", "📈",
  "🎁", "🎯", "🚀", "🏠", "↩️", "💰", "🎨", "🎵",
  "📱", "💡", "🔧", "🏃", "📖", "🎓", "💊", "🦷",
  "🏋️", "🎾", "🎭", "🎪", "🎨", "🎼", "📷", "🎥",
  "💻", "🖥️", "📱", "⌚", "🖨️", "🛠️", "🔌", "💡",
  "🚗", "🚌", "🚆", "✈️", "🚢", "🛵", "🚲", "🏍️",
  "🍕", "🍔", "🍟", "🌭", "🍿", "🍩", "🍪", "🧁",
  "🏠", "🏢", "🏬", "🏪", "🏫", "🏥", "⛪", "🕌",
  "💼", "📊", "💰", "💎", "🎯", "📈", "📉", "💹",
  "🎁", "🎂", "🎈", "🎉", "🎊", "🎆", "🎇", "✨",
  "🏆", "🥇", "🥈", "🥉", "🎖️", "🏅", "🎗️", "🏵️"
]

// Icon categories for better organization
export const ICON_CATEGORIES = {
  food: ["🍽️", "🍕", "🍔", "🍟", "🌭", "🍿", "🍩", "🍪", "🧁", "🥤", "☕", "🍵"],
  transport: ["🚗", "🚌", "🚆", "✈️", "🚢", "🛵", "🚲", "🏍️", "🚕", "🚙", "🛻"],
  shopping: ["🛍️", "🛒", "💼", "👛", "👜", "👝", "🎒", "💰", "💎"],
  entertainment: ["🎬", "🎵", "🎭", "🎪", "🎨", "🎼", "📷", "🎥", "🎮", "🎲"],
  health: ["🏥", "💊", "🦷", "🏋️", "🎾", "🏃", "🧘", "💆", "🛁", "🛀"],
  education: ["📚", "📖", "🎓", "✏️", "📝", "📓", "📚", "🔬", "🧮", "🌍"],
  work: ["💼", "💻", "🖥️", "📱", "⌚", "🖨️", "🛠️", "🔌", "📊", "📈"],
  home: ["🏠", "🏢", "🏬", "🏪", "🏫", "⛪", "🕌", "🏘️", "🏚️", "🏠"],
  finance: ["💰", "💎", "🎯", "📈", "📉", "💹", "💳", "🏦", "💵", "💴"],
  celebration: ["🎁", "🎂", "🎈", "🎉", "🎊", "🎆", "🎇", "✨", "🎊", "🎉"],
  awards: ["🏆", "🥇", "🥈", "🥉", "🎖️", "🏅", "🎗️", "🏵️", "🌟", "⭐"],
  other: ["📦", "🔧", "⚙️", "🛠️", "🔨", "📏", "📐", "📎", "📌", "✂️"]
}