"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Undo2, Trash2, AlertCircle, CheckCircle2, X } from "lucide-react"
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
  const startTimeRef = useRef(Date.now())
  const pausedProgressRef = useRef(100)

  useEffect(() => {
    let rafId: number

    const updateProgress = () => {
      if (isHovered) {
        // Store current progress when paused
        pausedProgressRef.current = progress
        rafId = requestAnimationFrame(updateProgress)
        return
      }

      const now = Date.now()
      const elapsed = now - startTimeRef.current
      // Calculate progress based on remaining time from the paused point
      const totalDuration = (pausedProgressRef.current / 100) * duration
      const remaining = Math.max(0, totalDuration - elapsed)
      const newProgress = (remaining / duration) * 100
      const newTimeLeft = Math.ceil(remaining / 1000)

      setProgress(newProgress)
      setTimeLeft(newTimeLeft)

      if (remaining > 0) {
        rafId = requestAnimationFrame(updateProgress)
      }
    }

    rafId = requestAnimationFrame(updateProgress)
    return () => cancelAnimationFrame(rafId)
  }, [duration, isHovered, progress])

  const handleUndo = useCallback(() => {
    toast.dismiss(toastId)
    onUndo()
  }, [toastId, onUndo])

  const handleDismiss = useCallback(() => {
    toast.dismiss(toastId)
  }, [toastId])

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
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Progress bar background */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--muted)]">
        <div
          className={cn("h-full transition-all duration-75 ease-linear", config.bg)}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>

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
