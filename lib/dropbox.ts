export const DROPBOX_TOKEN_KEY = "wallet_dropbox_access_token"
export const DROPBOX_TOKEN_EXPIRES_KEY = "wallet_dropbox_token_expires_at"
export const DROPBOX_REFRESH_TOKEN_KEY = "wallet_dropbox_refresh_token"
export const DROPBOX_TOKEN_SCOPE_KEY = "wallet_dropbox_token_scope"
export const DROPBOX_TOKEN_TYPE_KEY = "wallet_dropbox_token_type"
const DROPBOX_PKCE_STATE_KEY = "wallet_dropbox_pkce_state"
const DROPBOX_PKCE_VERIFIER_KEY = "wallet_dropbox_pkce_verifier"
const DROPBOX_STORAGE_PREFIX = "wallet_dropbox_"
export const DROPBOX_REQUIRED_SCOPES = [
  "account_info.read",
  "files.content.read",
  "files.content.write",
] as const

export type DropboxTokenResponse = {
  access_token: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  token_type?: string
}

export type DropboxAuthSession = {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
  scope: string | null
  tokenType: string | null
}

export function getDropboxAppKey(): string {
  return process.env.NEXT_PUBLIC_DROPBOX_APP_KEY ?? ""
}

export function buildDropboxAuthUrl(
  appKey: string,
  redirectUri: string,
  options: {
    responseType?: "token" | "code"
    state?: string
    codeChallenge?: string
    codeChallengeMethod?: "S256" | "plain"
    tokenAccessType?: "online" | "offline"
    scope?: string | readonly string[]
  } = {},
): string {
  const params = new URLSearchParams({
    client_id: appKey,
    response_type: options.responseType ?? "code",
    redirect_uri: redirectUri,
  })

  if (options.state) params.set("state", options.state)
  if (options.codeChallenge) params.set("code_challenge", options.codeChallenge)
  if (options.codeChallengeMethod) params.set("code_challenge_method", options.codeChallengeMethod)
  if (options.tokenAccessType) params.set("token_access_type", options.tokenAccessType)
  if (options.scope) {
    const scope = typeof options.scope === "string" ? options.scope : options.scope.join(" ")
    params.set("scope", scope)
  }

  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`
}

export function getMissingDropboxScopes(scope: string | null | undefined): string[] {
  if (!scope) return []
  const granted = new Set(scope.split(/\s+/).filter(Boolean))
  return DROPBOX_REQUIRED_SCOPES.filter((requiredScope) => !granted.has(requiredScope))
}

function getStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(key)
}

export function getDropboxAuthSession(): DropboxAuthSession | null {
  const accessToken = getStorageItem(DROPBOX_TOKEN_KEY)
  if (!accessToken) return null

  const expiresAtRaw = getStorageItem(DROPBOX_TOKEN_EXPIRES_KEY)
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : null

  return {
    accessToken,
    refreshToken: getStorageItem(DROPBOX_REFRESH_TOKEN_KEY),
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
    scope: getStorageItem(DROPBOX_TOKEN_SCOPE_KEY),
    tokenType: getStorageItem(DROPBOX_TOKEN_TYPE_KEY),
  }
}

export function isDropboxAccessTokenExpired(
  session: DropboxAuthSession | null,
  leewayMs: number = 0,
): boolean {
  if (!session?.accessToken) return true
  if (!session.expiresAt || !Number.isFinite(session.expiresAt)) return false
  return Date.now() + leewayMs >= session.expiresAt
}

export function getDropboxToken(): string | null {
  const session = getDropboxAuthSession()
  if (!session || isDropboxAccessTokenExpired(session)) return null
  return session.accessToken
}

export function storeDropboxAuthSession(
  tokenData: DropboxTokenResponse,
  options: { refreshToken?: string | null } = {},
): DropboxAuthSession {
  if (typeof window === "undefined") {
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? options.refreshToken ?? null,
      expiresAt: typeof tokenData.expires_in === "number" ? Date.now() + tokenData.expires_in * 1000 : null,
      scope: tokenData.scope ?? null,
      tokenType: tokenData.token_type ?? null,
    }
  }

  const expiresAt =
    typeof tokenData.expires_in === "number" && Number.isFinite(tokenData.expires_in) && tokenData.expires_in > 0
      ? Date.now() + tokenData.expires_in * 1000
      : null
  const refreshToken = tokenData.refresh_token ?? options.refreshToken ?? null

  localStorage.setItem(DROPBOX_TOKEN_KEY, tokenData.access_token)

  if (expiresAt) {
    localStorage.setItem(DROPBOX_TOKEN_EXPIRES_KEY, String(expiresAt))
  } else {
    localStorage.removeItem(DROPBOX_TOKEN_EXPIRES_KEY)
  }

  if (refreshToken) {
    localStorage.setItem(DROPBOX_REFRESH_TOKEN_KEY, refreshToken)
  } else {
    localStorage.removeItem(DROPBOX_REFRESH_TOKEN_KEY)
  }

  if (tokenData.scope) {
    localStorage.setItem(DROPBOX_TOKEN_SCOPE_KEY, tokenData.scope)
  } else {
    localStorage.removeItem(DROPBOX_TOKEN_SCOPE_KEY)
  }

  if (tokenData.token_type) {
    localStorage.setItem(DROPBOX_TOKEN_TYPE_KEY, tokenData.token_type)
  } else {
    localStorage.removeItem(DROPBOX_TOKEN_TYPE_KEY)
  }

  return {
    accessToken: tokenData.access_token,
    refreshToken,
    expiresAt,
    scope: tokenData.scope ?? null,
    tokenType: tokenData.token_type ?? null,
  }
}

export function storeDropboxToken(token: string, expiresInSeconds?: number): void {
  storeDropboxAuthSession({
    access_token: token,
    expires_in: expiresInSeconds,
  })
}

export function clearDropboxToken(): void {
  if (typeof window === "undefined") return

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(DROPBOX_STORAGE_PREFIX)) {
      localStorage.removeItem(key)
    }
  }
}

export async function revokeDropboxToken(accessToken: string): Promise<void> {
  const response = await fetch("https://api.dropboxapi.com/2/auth/token/revoke", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(await readDropboxError(response, "Failed to revoke Dropbox token"))
  }
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function createRandomString(length: number): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
  const random = new Uint8Array(length)
  crypto.getRandomValues(random)

  let value = ""
  random.forEach((byte) => {
    value += charset[byte % charset.length]
  })
  return value
}

async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier))
  return encodeBase64Url(new Uint8Array(digest))
}

export async function createDropboxAuthRequest(
  appKey: string,
  redirectUri: string,
): Promise<{ authUrl: string; state: string }> {
  if (typeof window === "undefined") {
    throw new Error("Dropbox authorization is only available in the browser")
  }

  const state = createRandomString(32)
  const codeVerifier = createRandomString(64)
  const codeChallenge = await createCodeChallenge(codeVerifier)

  localStorage.setItem(DROPBOX_PKCE_STATE_KEY, state)
  localStorage.setItem(DROPBOX_PKCE_VERIFIER_KEY, codeVerifier)

  return {
    authUrl: buildDropboxAuthUrl(appKey, redirectUri, {
      responseType: "code",
      state,
      codeChallenge,
      codeChallengeMethod: "S256",
      tokenAccessType: "offline",
      scope: DROPBOX_REQUIRED_SCOPES,
    }),
    state,
  }
}

function consumeDropboxCodeVerifier(expectedState: string): string {
  if (typeof window === "undefined") {
    throw new Error("Dropbox authorization can only be completed in the browser")
  }

  const storedState = localStorage.getItem(DROPBOX_PKCE_STATE_KEY)
  const codeVerifier = localStorage.getItem(DROPBOX_PKCE_VERIFIER_KEY)

  localStorage.removeItem(DROPBOX_PKCE_STATE_KEY)
  localStorage.removeItem(DROPBOX_PKCE_VERIFIER_KEY)

  if (!storedState || !codeVerifier) {
    throw new Error("Dropbox authorization session was lost. Please try again.")
  }

  if (storedState !== expectedState) {
    throw new Error("Dropbox authorization state mismatch. Please try again.")
  }

  return codeVerifier
}

async function postDropboxTokenRequest(
  body: Record<string, string>,
): Promise<DropboxTokenResponse> {
  const response = await fetch("/api/dropbox/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(errorText || "Dropbox token request failed")
  }

  return (await response.json()) as DropboxTokenResponse
}

export async function exchangeDropboxAuthCode(options: {
  code: string
  state: string
  redirectUri: string
}): Promise<DropboxTokenResponse> {
  const codeVerifier = consumeDropboxCodeVerifier(options.state)
  return await postDropboxTokenRequest({
    grantType: "authorization_code",
    code: options.code,
    redirectUri: options.redirectUri,
    codeVerifier,
  })
}

export async function refreshDropboxAccessToken(
  refreshToken: string,
): Promise<DropboxTokenResponse> {
  return await postDropboxTokenRequest({
    grantType: "refresh_token",
    refreshToken,
  })
}

async function readDropboxError(response: Response, fallback: string): Promise<string> {
  const errorText = await response.text().catch(() => "")
  if (!errorText) return fallback

  try {
    const data = JSON.parse(errorText) as {
      error?: unknown
      error_summary?: string
      user_message?: { text?: string } | string
    }
    const userMessage = typeof data.user_message === "string" ? data.user_message : data.user_message?.text
    const summary = data.error_summary || (typeof data.error === "string" ? data.error : "")
    const message = userMessage || summary
    if (message) return message
  } catch {
  }

  return errorText
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
    throw new Error(await readDropboxError(response, "Failed to upload backup to Dropbox"))
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
    throw new Error(await readDropboxError(response, "Failed to list Dropbox files"))
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
    throw new Error(await readDropboxError(response, "Failed to download backup from Dropbox"))
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
    throw new Error(await readDropboxError(response, "Failed to fetch Dropbox account"))
  }

  return (await response.json()) as DropboxAccount
}
