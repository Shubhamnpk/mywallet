"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Undo2, Trash2, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UndoToastProps {
  message: string
  description?: string
  onUndo: () => void
  duration?: number
  type?: "delete" | "update" | "warning"
}

export function showUndoToast({
  message,
  description,
  onUndo,
  duration = 5000,
  type = "delete",
}: UndoToastProps) {
  const toastId = toast.custom(
    (t) => (
      <UndoToastContent
        toastId={t}
        message={message}
        description={description}
        onUndo={onUndo}
        duration={duration}
        type={type}
      />
    ),
    { duration }
  )
  return toastId
}

interface UndoToastContentProps {
  toastId: string | number
  message: string
  description?: string
  onUndo: () => void
  duration: number
  type: "delete" | "update" | "warning"
}

function UndoToastContent({
  toastId,
  message,
  description,
  onUndo,
  duration,
  type,
}: UndoToastContentProps) {
  const [progress, setProgress] = useState(100)
  const [isHovered, setIsHovered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(duration / 1000)
  const progressRef = useRef(100)
  const startTimeRef = useRef(Date.now())
  const pausedProgressRef = useRef(100)

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isHovered) {
        pausedProgressRef.current = progressRef.current
        return
      }

      const now = Date.now()
      const elapsed = now - startTimeRef.current
      const totalDuration = (pausedProgressRef.current / 100) * duration
      const remaining = Math.max(0, totalDuration - elapsed)
      const newProgress = (remaining / duration) * 100

      if (newProgress !== progressRef.current) {
        progressRef.current = newProgress
        setProgress(newProgress)
        setTimeLeft(Math.ceil(remaining / 1000))
      }

      if (remaining <= 0) clearInterval(intervalId)
    }, 100)

    return () => clearInterval(intervalId)
  }, [duration, isHovered])

  const handleUndo = useCallback(() => {
    toast.dismiss(toastId)
    onUndo()
  }, [toastId, onUndo])

  const iconConfig = {
    delete: { icon: Trash2, color: "text-[var(--error)]", bg: "bg-[var(--error)]", border: "border-[var(--error)]/20", bgLight: "bg-[var(--error)]/10" },
    update: { icon: CheckCircle2, color: "text-[var(--success)]", bg: "bg-[var(--success)]", border: "border-[var(--success)]/20", bgLight: "bg-[var(--success)]/10" },
    warning: { icon: AlertCircle, color: "text-[var(--warning)]", bg: "bg-[var(--warning)]", border: "border-[var(--warning)]/20", bgLight: "bg-[var(--warning)]/10" },
  }

  const config = iconConfig[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "relative w-full max-w-sm overflow-hidden rounded-lg border shadow-lg",
        "transform transition-all duration-200 ease-out",
        "bg-[var(--card)] border-[var(--border)]",
        config.border
      )}
      onMouseEnter={() => {
        setIsHovered(true)
        // Reset start time to account for pause
        startTimeRef.current = Date.now()
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        startTimeRef.current = Date.now()
      }}
    >
      {/* Progress bar background */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--muted)]">
        <div
          className={cn("h-full transition-all duration-75 ease-linear", config.bg)}
          style={{ width: `${progress}%` }}
        />
      </div>

<div className="p-4 pt-5 pr-8">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn("flex-shrink-0 p-2 rounded-full", config.bgLight, config.bg.replace("bg-", "bg-opacity-20"))}>
            <Icon className={cn("w-5 h-5", config.color)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--card-foreground)]">
              {message}
            </p>
            {description && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {description}
              </p>
            )}

            {/* Countdown text with pulse when running */}
            <p className={cn(
              "mt-2 text-xs font-medium transition-colors",
              isHovered ? "text-[var(--muted-foreground)]" : "text-[var(--muted-foreground)]/70",
              isHovered && "italic"
            )}>
              {isHovered ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] animate-pulse" />
                  Paused - {timeLeft}s remaining
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)]/50" />
                  Undo available for {timeLeft}s
                </span>
              )}
            </p>
          </div>

          {/* Undo Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            className={cn(
              "flex-shrink-0 h-8 px-3 text-xs font-medium",
              "border-2 transition-all duration-200",
              "hover:scale-105 active:scale-95",
              "border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)]"
            )}
          >
            <Undo2 className="w-3 h-3 mr-1" />
            Undo
          </Button>
        </div>
      </div>

      {/* Hover overlay - pauses the timer */}
      {isHovered && (
        <div className={cn("absolute inset-0 rounded-lg opacity-5 pointer-events-none", config.bg)} />
      )}
    </div>
  )
}
