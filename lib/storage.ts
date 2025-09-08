import { DataIntegrityManager } from "@/lib/data-integrity"
import { SecureWallet } from "@/lib/security"
import { SecureKeyManager } from "@/lib/key-manager"

export async function loadFromLocalStorage(keys: string[]) {
  if (typeof window === 'undefined') return {}

  const result: Record<string, any> = {}
  for (const key of keys) {
    const value = localStorage.getItem(key)
    if (value !== null) {
      try {
        // Check if data is encrypted (starts with encrypted marker)
        if (value.startsWith("encrypted:")) {
          const encryptedData = value.substring(10) // Remove "encrypted:" prefix
          result[key] = await decryptData(encryptedData)
        } else {
          result[key] = JSON.parse(value)
        }
      } catch (e) {
        // fallback to raw string for numbers like emergencyFund
        result[key] = value
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
    if (encrypt && SecureKeyManager.hasMasterKey()) {
      // Encrypt sensitive data
      const masterKey = await SecureKeyManager.getMasterKey("")
      if (masterKey) {
        const encryptedData = await SecureWallet.encryptData(JSON.stringify(data), masterKey)
        localStorage.setItem(key, `encrypted:${encryptedData}`)
        return
      }
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
