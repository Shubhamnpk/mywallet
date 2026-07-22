import type { LucideIcon } from "lucide-react"
import {
  Target,
  PiggyBank,
  Home,
  Car,
  GraduationCap,
  Heart,
  Plane,
  ShoppingBag,
  Briefcase,
  AlertTriangle,
  Gem,
  Baby,
  Gift,
  BookOpen,
  Landmark,
  Utensils,
  Dumbbell,
  Music,
  Palmtree,
  Camera,
} from "lucide-react"

export interface GoalIconOption {
  id: string
  icon: LucideIcon
  label: string
}

export const GOAL_ICONS: GoalIconOption[] = [
  { id: "piggy-bank", icon: PiggyBank, label: "Savings" },
  { id: "target", icon: Target, label: "Target" },
  { id: "home", icon: Home, label: "Home" },
  { id: "car", icon: Car, label: "Car" },
  { id: "education", icon: GraduationCap, label: "Education" },
  { id: "health", icon: Heart, label: "Health" },
  { id: "travel", icon: Plane, label: "Travel" },
  { id: "shopping", icon: ShoppingBag, label: "Shopping" },
  { id: "business", icon: Briefcase, label: "Business" },
  { id: "emergency", icon: AlertTriangle, label: "Emergency" },
  { id: "wedding", icon: Gem, label: "Wedding" },
  { id: "baby", icon: Baby, label: "Baby" },
  { id: "gift", icon: Gift, label: "Gift" },
  { id: "book", icon: BookOpen, label: "Book" },
  { id: "retirement", icon: Landmark, label: "Retirement" },
  { id: "food", icon: Utensils, label: "Food" },
  { id: "fitness", icon: Dumbbell, label: "Fitness" },
  { id: "music", icon: Music, label: "Music" },
  { id: "vacation", icon: Palmtree, label: "Vacation" },
  { id: "photo", icon: Camera, label: "Photography" },
]

const ICON_MAP: Record<string, LucideIcon> = {}
for (const opt of GOAL_ICONS) {
  ICON_MAP[opt.id] = opt.icon
}

const KEYWORD_MAP: [RegExp, string][] = [
  [/saving|savings|fund|emergency\s*fund|reserve|general/i, "piggy-bank"],
  [/wedding|marriage|honeymoon|engagement/i, "wedding"],
  [/trip|travel|vacation|holiday|tour|journey/i, "travel"],
  [/home|house|flat|apartment|property|rent/i, "home"],
  [/car|bike|vehicle|scooter|automobile/i, "car"],
  [/education|school|college|university|course|study|learn/i, "education"],
  [/health|medical|hospital|doctor|medicine|fitness|gym|workout|sport/i, "health"],
  [/shop|shopping|buy|purchase|gadget|gadgets/i, "shopping"],
  [/business|startup|entrepreneur|venture|company/i, "business"],
  [/emergency|urgent|crisis|unexpected/i, "piggy-bank"],
  [/baby|child|children|kid|kids|family|parent/i, "baby"],
  [/gift|birthday|anniversary|celebration|festival|festive/i, "gift"],
  [/book|read|reading|library|knowledge/i, "book"],
  [/retire|retirement|pension|old\s*age|future/i, "retirement"],
  [/food|eat|dining|restaurant|cook|meal|grocery/i, "food"],
  [/music|instrument|concert|band|song/i, "music"],
  [/photo|camera|photography|picture|album/i, "photo"],
  [/vacation|beach|resort|island|getaway/i, "vacation"],
]

export function getIconById(id?: string): LucideIcon {
  if (id && ICON_MAP[id]) return ICON_MAP[id]
  return Target
}

export function detectIconFromTitle(title?: string): string | undefined {
  if (!title) return undefined
  for (const [regex, iconId] of KEYWORD_MAP) {
    if (regex.test(title)) return iconId
  }
  return undefined
}

export function getGoalIcon(goal: { icon?: string; title?: string; name?: string; category?: string }): LucideIcon {
  if (goal.icon && ICON_MAP[goal.icon]) return ICON_MAP[goal.icon]
  const title = goal.title || goal.name || ""
  const detected = detectIconFromTitle(title)
  if (detected) return ICON_MAP[detected]
  if (goal.category && ICON_MAP[goal.category]) return ICON_MAP[goal.category]
  return Target
}
