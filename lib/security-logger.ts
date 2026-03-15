// Utility for logging security-related events for auditing
// Stores limited history in localStorage

export interface SecurityEvent {
  type: 'pin_success' | 'pin_failed' | 'biometric_success' | 'biometric_failed' | 'emergency_pin_used' | 'pin_changed' | 'security_reset' | 'lockout'
  timestamp: string
  details?: string
}

export class SecurityLogger {
  private static readonly LOG_KEY = "wallet_security_logs"
  private static readonly MAX_LOGS = 10

  static logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    if (typeof window === "undefined") return

    try {
      const logs = this.getLogs()
      const newEvent: SecurityEvent = {
        ...event,
        timestamp: new Date().toISOString()
      }

      logs.unshift(newEvent)
      
      // Keep only recent logs
      const trimmedLogs = logs.slice(0, this.MAX_LOGS)
      localStorage.setItem(this.LOG_KEY, JSON.stringify(trimmedLogs))
    } catch (error) {
      console.error("Failed to log security event:", error)
    }
  }

  static getLogs(): SecurityEvent[] {
    if (typeof window === "undefined") return []

    try {
      const stored = localStorage.getItem(this.LOG_KEY)
      if (!stored) return []
      return JSON.parse(stored)
    } catch {
      return []
    }
  }

  static clearLogs(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(this.LOG_KEY)
  }
}
