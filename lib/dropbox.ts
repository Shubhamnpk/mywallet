export const DROPBOX_TOKEN_KEY = "wallet_dropbox_access_token"
export const DROPBOX_TOKEN_EXPIRES_KEY = "wallet_dropbox_token_expires_at"

export function getDropboxAppKey(): string {
  return process.env.NEXT_PUBLIC_DROPBOX_APP_KEY ?? ""
}

export function buildDropboxAuthUrl(appKey: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: appKey,
    response_type: "token",
    redirect_uri: redirectUri,
  })
  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`
}

export function getDropboxToken(): string | null {
  if (typeof window === "undefined") return null
  const token = localStorage.getItem(DROPBOX_TOKEN_KEY)
  if (!token) return null

  const expiresAtRaw = localStorage.getItem(DROPBOX_TOKEN_EXPIRES_KEY)
  if (expiresAtRaw) {
    const expiresAt = Number(expiresAtRaw)
    if (Number.isFinite(expiresAt) && expiresAt > 0 && Date.now() > expiresAt) {
      clearDropboxToken()
      return null
    }
  }

  return token
}

export function storeDropboxToken(token: string, expiresInSeconds?: number): void {
  if (typeof window === "undefined") return
  localStorage.setItem(DROPBOX_TOKEN_KEY, token)
  if (typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
    const expiresAt = Date.now() + expiresInSeconds * 1000
    localStorage.setItem(DROPBOX_TOKEN_EXPIRES_KEY, String(expiresAt))
  } else {
    localStorage.removeItem(DROPBOX_TOKEN_EXPIRES_KEY)
  }
}

export function clearDropboxToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(DROPBOX_TOKEN_KEY)
  localStorage.removeItem(DROPBOX_TOKEN_EXPIRES_KEY)
}

export async function uploadToDropbox(
  content: string,
  filename: string,
  accessToken: string,
  options: { overwrite?: boolean } = {},
): Promise<void> {
  const { overwrite = false } = options
  const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path: `/${filename}`,
        mode: overwrite ? "overwrite" : "add",
        autorename: true,
        mute: false,
        strict_conflict: false,
      }),
    },
    body: content,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(errorText || "Failed to upload backup to Dropbox")
  }
}

export type DropboxFileEntry = {
  name: string
  path_lower: string
  server_modified: string
}

export async function getLatestDropboxBackup(accessToken: string): Promise<DropboxFileEntry | null> {
  const response = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: "" }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(errorText || "Failed to list Dropbox files")
  }

  const data = (await response.json()) as { entries?: DropboxFileEntry[] }
  const entries = Array.isArray(data.entries) ? data.entries : []
  const backups = entries.filter((entry) =>
    entry.name.endsWith(".json") && entry.name.startsWith("mywallet-"),
  )

  if (backups.length === 0) return null

  backups.sort((a, b) => new Date(b.server_modified).getTime() - new Date(a.server_modified).getTime())
  return backups[0] ?? null
}

export async function downloadDropboxFile(pathLower: string, accessToken: string): Promise<string> {
  const response = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path: pathLower }),
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(errorText || "Failed to download backup from Dropbox")
  }

  return await response.text()
}

export type DropboxAccount = {
  email: string
  name: {
    display_name: string
  }
}

export async function getDropboxAccount(accessToken: string): Promise<DropboxAccount> {
  const response = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(errorText || "Failed to fetch Dropbox account")
  }

  return (await response.json()) as DropboxAccount
}
