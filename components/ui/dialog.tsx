"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const DRAG_CLOSE_THRESHOLD = 100
const DRAG_FLICK_VELOCITY = 0.5
const DRAG_SPRING_TRANSITION = "transform 250ms cubic-bezier(0.32, 0.72, 0, 1)"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=open]:duration-300 data-[state=closed]:duration-200",
        className
      )}
      {...props}
    />
  )
})

function DialogContent({
  className,
  children,
  showCloseButton = true,
  overlayClassName,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  overlayClassName?: string
}) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const dragSurfaceRef = React.useRef<HTMLDivElement>(null)
  const closeButtonRef = React.useRef<HTMLButtonElement>(null)
  const dragStateRef = React.useRef<{
    startY: number
    dy: number
    active: boolean
    samples: Array<{ dy: number; t: number }>
  } | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const resetDragStyles = React.useCallback(() => {
    const content = contentRef.current
    if (!content) return
    content.style.transition = DRAG_SPRING_TRANSITION
    content.style.transform = "translateY(0px)"
    if (overlayRef.current) overlayRef.current.style.opacity = "1"
    const onEnd = () => {
      content.style.transition = ""
      content.style.transform = ""
      content.style.willChange = ""
    }
    content.addEventListener("transitionend", onEnd, { once: true })
  }, [])

  const handleDragStart = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || typeof window === "undefined" || window.innerWidth >= 640) return
    const content = contentRef.current
    if (!content) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStateRef.current = {
      startY: event.clientY,
      dy: 0,
      active: true,
      samples: [],
    }
    content.style.transition = "none"
    content.style.willChange = "transform"
    setIsDragging(true)
  }, [])

  const handleDragMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current
    const content = contentRef.current
    const overlay = overlayRef.current
    if (!state?.active || !content || !overlay) return
    const dy = Math.max(0, event.clientY - state.startY)
    state.dy = dy
    state.samples.push({ dy, t: performance.now() })
    while (state.samples.length > 0 && performance.now() - state.samples[0].t > 120) {
      state.samples.shift()
    }
    content.style.transform = `translateY(${dy}px)`
    overlay.style.opacity = String(1 - Math.min(1, dy / DRAG_CLOSE_THRESHOLD) * 0.6)
  }, [])

  const handleDragEnd = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current
      const content = contentRef.current
      if (!state?.active || !content) return
      state.active = false
      setIsDragging(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      const samples = state.samples
      const cutoff = performance.now() - 100
      const windowed = samples.filter((s) => s.t >= cutoff)
      const first = windowed[0]
      const last = windowed[windowed.length - 1]
      const velocity = first && last && last.t > first.t ? (last.dy - first.dy) / (last.t - first.t) : 0
      const shouldClose = state.dy >= DRAG_CLOSE_THRESHOLD || (state.dy > 20 && velocity > DRAG_FLICK_VELOCITY)

      if (shouldClose) {
        closeButtonRef.current?.click()
        window.setTimeout(() => {
          const fallbackContent = contentRef.current
          if (fallbackContent) resetDragStyles()
        }, 300)
        return
      }

      resetDragStyles()
    },
    [resetDragStyles]
  )

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay ref={overlayRef} className={overlayClassName} />
      <DialogPrimitive.Content
        ref={contentRef}
        data-slot="dialog-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 grid w-full gap-4 border border-b-0 border-x-0 p-6 shadow-lg",
          "max-h-[92dvh] rounded-t-3xl bg-background overflow-y-auto",
          "touch-pan-y",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=open]:duration-300 data-[state=closed]:duration-200",
          "ease-[cubic-bezier(0.16,1,0.3,1)]",
          "sm:inset-auto sm:top-[50%] sm:left-[50%] sm:max-h-[90vh] sm:max-w-[calc(100%-2rem)] sm:translate-x-[-50%] sm:translate-y-[-50%]",
          "sm:rounded-lg sm:border sm:bg-background",
          "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:duration-200 sm:max-w-lg",
          isDragging && "shadow-2xl",
          className
        )}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
        }}
        {...props}
      >
        <DialogPrimitive.Close asChild>
          <button
            ref={closeButtonRef}
            type="button"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />
        </DialogPrimitive.Close>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center sm:hidden">
          <div
            ref={dragSurfaceRef}
            className="pointer-events-auto flex touch-none select-none cursor-grab items-center justify-center rounded-full px-8 py-2.5 active:cursor-grabbing"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          >
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/35" />
          </div>
        </div>
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted/50 text-muted-foreground transition-all hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:pointer-events-none inline-flex items-center justify-center z-50 border border-muted-foreground/10"
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
