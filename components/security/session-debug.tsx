"use client"

import { useState, useEffect } from "react"
import { SessionManager } from "@/lib/session-manager"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function SessionDebug() {
  const [sessionStatus, setSessionStatus] = useState<{
    isValid: boolean
    timeRemaining: number
    lastActivity: number
  } | null>(null)

  useEffect(() => {
    const updateStatus = () => {
      const status = SessionManager.getSessionStatus()
      setSessionStatus(status)
    }

    // Update immediately
    updateStatus()

    // Update every second
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!sessionStatus) {
    return (
      <Card className="fixed bottom-4 right-4 w-64 z-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Session Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-xs">Status:</span>
            <Badge variant="destructive">No Session</Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <Card className="fixed bottom-4 right-4 w-64 z-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Session Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs">Status:</span>
          <Badge variant={sessionStatus.isValid ? "default" : "destructive"}>
            {sessionStatus.isValid ? "Active" : "Expired"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs">Time Left:</span>
          <span className="text-xs font-mono">
            {formatTime(sessionStatus.timeRemaining)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs">Last Activity:</span>
          <span className="text-xs font-mono">
            {new Date(sessionStatus.lastActivity).toLocaleTimeString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}