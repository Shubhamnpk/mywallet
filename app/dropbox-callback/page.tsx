"use client"

import { useEffect, useState } from "react"
import { storeDropboxToken } from "@/lib/dropbox"

export default function DropboxCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    if (typeof window === "undefined") return

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash
    const params = new URLSearchParams(hash)
    const accessToken = params.get("access_token")
    const expiresIn = params.get("expires_in")

    if (!accessToken) {
      setStatus("error")
      return
    }

    const expiresInSeconds = expiresIn ? Number(expiresIn) : undefined
    storeDropboxToken(accessToken, Number.isFinite(expiresInSeconds) ? expiresInSeconds : undefined)
    setStatus("success")

    if (window.opener) {
      window.opener.postMessage(
        {
          type: "dropbox-auth",
          token: accessToken,
          expiresIn: Number.isFinite(expiresInSeconds) ? expiresInSeconds : undefined,
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
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border bg-card p-6 text-center space-y-3">
        <h1 className="text-lg font-semibold">Dropbox Authorization</h1>
        {status === "loading" && (
          <p className="text-sm text-muted-foreground">Finishing authorization. You can close this window if it doesn&apos;t close automatically.</p>
        )}
        {status === "success" && (
          <p className="text-sm text-muted-foreground">Dropbox connected. You can return to the app.</p>
        )}
        {status === "error" && (
          <p className="text-sm text-destructive">Authorization failed. Please return to the app and try again.</p>
        )}
      </div>
    </div>
  )
}
