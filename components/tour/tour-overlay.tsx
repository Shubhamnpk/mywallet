"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface TourStep {
  targetSelector: string
  title: string
  description: string
  position: "top" | "bottom" | "left" | "right"
}

interface TourOverlayProps {
  steps: TourStep[]
  onComplete: () => void
}

const TOOLTIP_WIDTH = 320
const TOOLTIP_HEIGHT = 200
const GAP = 12
const PAD = 8
const RADIUS = 12
const VIEWPORT_MARGIN = 16

function getRoundedCutoutPath(x: number, y: number, w: number, h: number, r: number) {
  return [
    `M${x + r},${y}`,
    `L${x + w - r},${y}`,
    `A${r},${r} 0 0,1 ${x + w},${y + r}`,
    `L${x + w},${y + h - r}`,
    `A${r},${r} 0 0,1 ${x + w - r},${y + h}`,
    `L${x + r},${y + h}`,
    `A${r},${r} 0 0,1 ${x},${y + h - r}`,
    `L${x},${y + r}`,
    `A${r},${r} 0 0,1 ${x + r},${y}`,
    "Z",
  ].join(" ")
}

function computePosition(
  elRect: DOMRect,
  preferred: "top" | "bottom" | "left" | "right",
  vw: number,
  vh: number,
) {
  const positions: ("top" | "bottom" | "left" | "right")[] = [preferred]
  const opposites: Record<string, "top" | "bottom" | "left" | "right"> = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  }
  if (positions[0] !== opposites[preferred]) positions.push(opposites[preferred])

  for (const pos of positions) {
    let top = 0
    let left = 0
    let fits = true

    if (pos === "top") {
      top = elRect.top - GAP - TOOLTIP_HEIGHT
      left = elRect.left + elRect.width / 2 - TOOLTIP_WIDTH / 2
      if (top < VIEWPORT_MARGIN) { fits = false }
    } else if (pos === "bottom") {
      top = elRect.bottom + GAP
      left = elRect.left + elRect.width / 2 - TOOLTIP_WIDTH / 2
      if (top + TOOLTIP_HEIGHT > vh - VIEWPORT_MARGIN) { fits = false }
    } else if (pos === "left") {
      top = elRect.top + elRect.height / 2 - TOOLTIP_HEIGHT / 2
      left = elRect.left - GAP - TOOLTIP_WIDTH
      if (left < VIEWPORT_MARGIN) { fits = false }
    } else {
      top = elRect.top + elRect.height / 2 - TOOLTIP_HEIGHT / 2
      left = elRect.right + GAP
      if (left + TOOLTIP_WIDTH > vw - VIEWPORT_MARGIN) { fits = false }
    }

    if (fits) {
      top = Math.max(VIEWPORT_MARGIN, Math.min(vh - TOOLTIP_HEIGHT - VIEWPORT_MARGIN, top))
      left = Math.max(VIEWPORT_MARGIN, Math.min(vw - TOOLTIP_WIDTH - VIEWPORT_MARGIN, left))
      return { position: pos, top, left }
    }
  }

  const top = Math.max(VIEWPORT_MARGIN, Math.min(vh - TOOLTIP_HEIGHT - VIEWPORT_MARGIN, elRect.top - GAP - TOOLTIP_HEIGHT))
  const left = Math.max(VIEWPORT_MARGIN, Math.min(vw - TOOLTIP_WIDTH - VIEWPORT_MARGIN, elRect.left + elRect.width / 2 - TOOLTIP_WIDTH / 2))
  return { position: preferred, top, left }
}

export function TourOverlay({ steps, onComplete }: TourOverlayProps) {
  const [current, setCurrent] = useState(0)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({})
  const [svgPath, setSvgPath] = useState("")
  const [winSize, setWinSize] = useState({ w: 0, h: 0 })
  const [visible, setVisible] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const updatePosition = useCallback((step: TourStep) => {
    const all = Array.from(document.querySelectorAll(step.targetSelector)) as HTMLElement[]
    let el: HTMLElement | null = null
    for (const candidate of all) {
      if (candidate.offsetParent !== null || candidate.getBoundingClientRect().width > 0) {
        el = candidate
        break
      }
    }
    if (!el) el = all[0] || null
    if (!el) return

    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    setWinSize({ w: vw, h: vh })

    const outerRect = `M0,0 L${vw},0 L${vw},${vh} L0,${vh} Z`
    const cutout = getRoundedCutoutPath(
      rect.left - PAD,
      rect.top - PAD,
      rect.width + PAD * 2,
      rect.height + PAD * 2,
      RADIUS,
    )
    setSvgPath(`${outerRect} ${cutout}`)

    setHighlightStyle({
      position: "fixed",
      left: rect.left - 4,
      top: rect.top - 4,
      width: rect.width + 8,
      height: rect.height + 8,
      borderRadius: "14px",
      boxShadow: "0 0 0 3px hsl(var(--primary)), 0 0 0 7px hsl(var(--primary)/0.25), 0 0 24px hsl(var(--primary)/0.15)",
      zIndex: 60,
      transition: "all 0.3s ease",
      pointerEvents: "none",
    })

    const { top, left } = computePosition(rect, step.position, vw, vh)

    const styles: React.CSSProperties = {
      position: "fixed",
      zIndex: 70,
      width: TOOLTIP_WIDTH,
      top,
      left,
    }

    setTooltipStyle(styles)
  }, [])

  useEffect(() => {
    if (!visible) return
    const step = steps[current]
    updatePosition(step)

    const handleResize = () => updatePosition(step)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [current, steps, updatePosition, visible])

  const handleNext = () => {
    if (current < steps.length - 1) {
      setCurrent((c) => c + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    setVisible(false)
    onComplete()
  }

  if (!visible || !mounted) return null

  const step = steps[current]
  const isLast = current === steps.length - 1

  const overlay = (
    <div className="fixed inset-0 z-50">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${winSize.w} ${winSize.h}`}
        className="absolute inset-0"
        style={{ display: "block" }}
      >
        <path
          d={svgPath}
          fill="rgba(0,0,0,0.6)"
          fillRule="evenodd"
          onClick={handleComplete}
          className="cursor-pointer"
        />
      </svg>

      <div style={highlightStyle} />

      <div
        style={tooltipStyle}
        className="bg-background rounded-xl shadow-2xl border p-5 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleComplete}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="space-y-1.5 pr-6">
          <h3 className="font-semibold text-sm">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
        </div>
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            {current + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleComplete}>
              Skip
            </Button>
            <Button size="sm" onClick={handleNext}>
              {isLast ? "Got it" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
