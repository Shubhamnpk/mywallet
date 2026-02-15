import { DataIntegrityManager } from "@/lib/data-integrity"
import { SecureWallet } from "@/lib/security"
import { SecureKeyManager } from "@/lib/key-manager"

const ALWAYS_ENCRYPT_KEYS = new Set([
  "userProfile",
  "transactions",
  "budgets",
  "goals",
  "debtAccounts",
  "creditAccounts",
  "debtCreditTransactions",
  "categories",
  "emergencyFund",
  "portfolio",
  "shareTransactions",
  "portfolios",
  "celebratedAchievements",
])

export function shouldEncryptStorageKey(key: string): boolean {
  return ALWAYS_ENCRYPT_KEYS.has(key)
}

export async function loadFromLocalStorage(keys: string[]) {
  if (typeof window === 'undefined') return {}

  const result: Record<string, any> = {}
  for (const key of keys) {
    const value = localStorage.getItem(key)
    if (value !== null) {
      if (value.startsWith("encrypted:")) {
        try {
          const encryptedData = value.substring(10) // Remove "encrypted:" prefix
          result[key] = await decryptData(encryptedData)
        } catch (decryptError) {
          const message = decryptError instanceof Error ? decryptError.message : String(decryptError)
          if (!message.includes("No master key available for decryption")) {
            console.error(`Failed to decrypt key ${key}`, decryptError)
          }
          result[key] = null
        }
      } else {
        try {
          result[key] = JSON.parse(value)
        } catch (jsonError) {
          // fallback to raw string for simple values
          result[key] = value
        }
      }
    } else {
      result[key] = null
    }
  }
  return result
}

export async function saveToLocalStorage(key: string, data: any, encrypt: boolean = false) {
  if (typeof window === 'undefined') return

  try {
    const shouldEncrypt = encrypt || shouldEncryptStorageKey(key)
    if (shouldEncrypt) {
      // Encrypt using active key:
      // - default key when no PIN exists
      // - master key when PIN is configured and authenticated
      const masterKey = await SecureKeyManager.getMasterKey("")
      if (masterKey) {
        const encryptedData = await SecureWallet.encryptData(JSON.stringify(data), masterKey)
        localStorage.setItem(key, `encrypted:${encryptedData}`)
        return
      }

      // Never fall back to plaintext for sensitive keys.
      throw new Error(`No encryption key available for sensitive key: ${key}`)
    }

    // Save unencrypted if encryption not available or not requested
    localStorage.setItem(key, typeof data === "string" ? data : JSON.stringify(data))
  } catch (error) {
    throw error
  }
}

export async function decryptData(encryptedData: string): Promise<any> {
  try {
    const masterKey = await SecureKeyManager.getMasterKey("")
    if (!masterKey) {
      throw new Error("No master key available for decryption")
    }

    const decryptedString = await SecureWallet.decryptData(encryptedData, masterKey)
    return JSON.parse(decryptedString)
  } catch (error) {
    throw error
  }
}

export function saveDataWithIntegrity(allData: any) {
  try {
    DataIntegrityManager.updateIntegrityRecord(allData)
    return true
  } catch (e) {
    return false
  }
}

// Secure batch operations
export async function saveSecureBatch(dataMap: Record<string, any>, encryptKeys: string[] = []) {
  try {
    for (const [key, data] of Object.entries(dataMap)) {
      const shouldEncrypt = encryptKeys.includes(key)
      await saveToLocalStorage(key, data, shouldEncrypt)
    }

    // Update integrity record
    const allData = await loadFromLocalStorage(Object.keys(dataMap))
    return saveDataWithIntegrity(allData)
  } catch (error) {
    return false
  }
}

export async function loadSecureBatch(keys: string[]): Promise<Record<string, any>> {
  try {
    const data = await loadFromLocalStorage(keys)

    // Verify integrity
    const integrityCheck = await DataIntegrityManager.verifyDataIntegrity(data)
    if (!integrityCheck.isValid) {
      // Could trigger recovery or alert user
    }

    return data
  } catch (error) {
    throw error
  }
}
