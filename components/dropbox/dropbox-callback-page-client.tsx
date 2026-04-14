"use client"

import { useEffect, useState } from "react"
import { storeDropboxToken } from "@/lib/dropbox"

type AuthData =
  | { status: "loading"; accessToken: null; expiresInSeconds: undefined }
  | { status: "success"; accessToken: string; expiresInSeconds: number | undefined }
  | { status: "error"; accessToken: null; expiresInSeconds: undefined }

export function DropboxCallbackPageClient() {
  const [authData, setAuthData] = useState<AuthData>({
    status: "loading",
    accessToken: null,
    expiresInSeconds: undefined,
  })

  // Hash and window are only available after mount; never use useMemo([]) for this —
  // SSR / hydration can leave a memo stuck on "loading".
  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash
    const params = new URLSearchParams(hash)
    const accessToken = params.get("access_token")
    const expiresIn = params.get("expires_in")
    const parsedExpiresIn = expiresIn ? Number(expiresIn) : undefined
    const expiresInSeconds = Number.isFinite(parsedExpiresIn) ? parsedExpiresIn : undefined

    if (!accessToken) {
      setAuthData({ status: "error", accessToken: null, expiresInSeconds: undefined })
      return
    }

    setAuthData({ status: "success", accessToken, expiresInSeconds })
  }, [])

  useEffect(() => {
    if (authData.status !== "success") return
    storeDropboxToken(authData.accessToken, authData.expiresInSeconds)

    if (window.opener) {
      window.opener.postMessage(
        {
          type: "dropbox-auth",
          token: authData.accessToken,
          expiresIn: authData.expiresInSeconds,
        },
        window.location.origin,
      )
    }

    setTimeout(() => {
      try {
        window.close()
      } catch {
      }
    }, 500)
  }, [authData])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border bg-card p-6 text-center space-y-3">
        <h1 className="text-lg font-semibold">Dropbox Authorization</h1>
        {authData.status === "loading" && (
          <p className="text-sm text-muted-foreground">Finishing authorization. You can close this window if it doesn&apos;t close automatically.</p>
        )}
        {authData.status === "success" && (
          <p className="text-sm text-muted-foreground">Dropbox connected. You can return to the app.</p>
        )}
        {authData.status === "error" && (
          <p className="text-sm text-destructive">Authorization failed. Please return to the app and try again.</p>
        )}
      </div>
    </div>
  )
}
