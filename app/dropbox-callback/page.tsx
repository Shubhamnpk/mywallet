"use client"

import { useEffect, useMemo } from "react"
import { storeDropboxToken } from "@/lib/dropbox"

export default function DropboxCallbackPage() {
  const authData = useMemo(() => {
    if (typeof window === "undefined") {
      return { status: "loading" as const, accessToken: null as string | null, expiresInSeconds: undefined as number | undefined }
    }
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash
    const params = new URLSearchParams(hash)
    const accessToken = params.get("access_token")
    const expiresIn = params.get("expires_in")
    const parsedExpiresIn = expiresIn ? Number(expiresIn) : undefined
    return {
      status: accessToken ? ("success" as const) : ("error" as const),
      accessToken,
      expiresInSeconds: Number.isFinite(parsedExpiresIn) ? parsedExpiresIn : undefined,
    }
  }, [])

  useEffect(() => {
    if (authData.status !== "success" || !authData.accessToken) return
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
