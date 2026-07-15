"use client"

import { useState } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = () => {
    setIsResetting(true)
    reset()
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="group relative w-full max-w-sm">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-destructive/30 via-destructive/10 to-transparent opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative flex flex-col items-center gap-6 rounded-xl border bg-background/80 p-8 text-center shadow-sm backdrop-blur-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20 transition-all duration-300 group-hover:scale-105 group-hover:bg-destructive/15">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold tracking-tight">Something went wrong</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {error.message || "An unexpected error occurred. Please try again."}
            </p>
          </div>

          <button
            onClick={handleReset}
            disabled={isResetting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.97] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isResetting ? "animate-spin" : ""}`} />
            {isResetting ? "Retrying..." : "Try again"}
          </button>
        </div>
      </div>
    </div>
  )
}
