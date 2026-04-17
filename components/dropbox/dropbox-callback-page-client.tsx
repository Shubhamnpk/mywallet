"use client"

import { useEffect, useState } from "react"
import * as Dropbox from "@/lib/dropbox"

type DropboxCallbackWindow = Window & {
  __dropboxAuthInFlight?: boolean
  __dropboxAuthHandled?: boolean
}

type AuthData =
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

export function DropboxCallbackPageClient() {
  const [authData, setAuthData] = useState<AuthData>({
    status: "loading",
    message: "Finishing authorization. You can close this window if it doesn't close automatically.",
  })

  useEffect(() => {
    const callbackWindow = window as DropboxCallbackWindow
    if (callbackWindow.__dropboxAuthHandled || callbackWindow.__dropboxAuthInFlight) {
      return
    }

    callbackWindow.__dropboxAuthInFlight = true

    const completeAuthorization = async () => {
      const params = new URLSearchParams(window.location.search)
      const error = params.get("error")
      const errorDescription = params.get("error_description")

      if (error) {
        const message = errorDescription || "Dropbox authorization failed. Please try again."
        callbackWindow.__dropboxAuthInFlight = false
        setAuthData({ status: "error", message })
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "dropbox-auth",
              success: false,
              error: message,
            },
            window.location.origin,
          )
        }
        return
      }

      const code = params.get("code")
      const state = params.get("state")
      if (!code || !state) {
        const message = "Dropbox authorization did not return a valid code. Please try again."
        callbackWindow.__dropboxAuthInFlight = false
        setAuthData({ status: "error", message })
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "dropbox-auth",
              success: false,
              error: message,
            },
            window.location.origin,
          )
        }
        return
      }

      try {
        const redirectUri = `${window.location.origin}/dropbox-callback`
        if (typeof Dropbox.exchangeDropboxAuthCode !== "function" || typeof Dropbox.storeDropboxAuthSession !== "function") {
          throw new Error("Dropbox authorization helpers are unavailable. Refresh the app and try again.")
        }

        const tokenData = await Dropbox.exchangeDropboxAuthCode({ code, state, redirectUri })
        Dropbox.storeDropboxAuthSession(tokenData)
        callbackWindow.__dropboxAuthHandled = true
        callbackWindow.__dropboxAuthInFlight = false

        setAuthData({
          status: "success",
          message: "Dropbox connected. Automatic refresh is now enabled for this device.",
        })

        if (window.opener) {
          window.opener.postMessage(
            {
              type: "dropbox-auth",
              success: true,
            },
            window.location.origin,
          )
        }

        window.setTimeout(() => {
          try {
            window.close()
          } catch {
          }
        }, 500)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Dropbox authorization failed. Please try again."
        callbackWindow.__dropboxAuthInFlight = false
        setAuthData({ status: "error", message })
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "dropbox-auth",
              success: false,
              error: message,
            },
            window.location.origin,
          )
        }
      }
    }

    void completeAuthorization()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border bg-card p-6 text-center space-y-3">
        <h1 className="text-lg font-semibold">Dropbox Authorization</h1>
        {authData.status === "loading" && (
          <p className="text-sm text-muted-foreground">
            Finishing authorization. You can close this window if it doesn&apos;t close automatically.
          </p>
        )}
        {authData.status === "success" && (
          <p className="text-sm text-muted-foreground">{authData.message}</p>
        )}
        {authData.status === "error" && (
          <p className="text-sm text-destructive">{authData.message}</p>
        )}
      </div>
    </div>
  )
}
