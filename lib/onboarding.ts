import type { UserProfile } from "@/types/wallet"
import { getCalendarSystem } from "@/lib/app-calendar"
import {
  getDefaultNotificationSettings,
  normalizeNotificationSettings,
} from "@/lib/notifications"
import { normalizeSipPlans } from "@/lib/sip"

/**
 * Standalone onboarding completion handler.
 * Saves the user profile to localStorage WITHOUT requiring WalletDataProvider.
 * The wallet store will read and re-normalize this data on next mount.
 */
export function completeOnboarding(profileData: UserProfile): void {
  const completeProfile: UserProfile = {
    ...profileData,
    securityEnabled: profileData.securityEnabled,
    calendarSystem: getCalendarSystem(profileData.calendarSystem),
    notificationSettings: normalizeNotificationSettings(
      profileData.notificationSettings ?? getDefaultNotificationSettings(),
    ),
    sipPlans: normalizeSipPlans(profileData.sipPlans),
    createdAt: new Date().toISOString(),
  }

  localStorage.setItem("userProfile", JSON.stringify(completeProfile))
}
