"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <Skeleton className={cn("bg-muted/70", className)} style={style} />
}

export { SkeletonBlock }

export function SkeletonText({ className, width }: { className?: string; width?: string }) {
  return <SkeletonBlock className={cn("h-3 rounded", className)} style={{ width }} />
}

export function SkeletonIcon({ className }: { className?: string }) {
  return <SkeletonBlock className={cn("h-8 w-8 shrink-0 rounded-xl", className)} />
}

export function SkeletonBadge({ className }: { className?: string }) {
  return <SkeletonBlock className={cn("h-4 w-16 rounded-full", className)} />
}

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/30 bg-muted/5 px-3 py-2.5", className)}>
      <SkeletonText width="60%" className="h-2" />
      <SkeletonText width="75%" className="h-4 mt-2.5" />
    </div>
  )
}

export function SkeletonStatGrid({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  )
}

export function SkeletonSectionTitle({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 px-1 mb-2", className)}>
      <SkeletonBlock className="h-3.5 w-3.5 rounded" />
      <SkeletonText width="96px" className="h-2.5" />
    </div>
  )
}

export function SkeletonListRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 rounded-xl border border-border/30 bg-muted/5 px-3 py-2.5", className)}>
      <SkeletonBlock className="h-8 w-8 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <SkeletonText width="66%" className="h-3" />
        <SkeletonText width="40%" className="h-2" />
      </div>
      <SkeletonText width="64px" className="h-4 shrink-0" />
    </div>
  )
}

export function SkeletonList({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListRow key={i} />
      ))}
    </div>
  )
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-[clamp(220px,32vh,300px)] rounded-xl border border-muted/30 bg-muted/10 overflow-hidden", className)}>
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-center justify-between">
          <SkeletonText width="56px" className="h-2" />
          <SkeletonText width="40px" className="h-2" />
        </div>
        <div className="flex-1 flex items-end gap-2 px-1 pb-1 pt-4">
          {[45, 70, 50, 85, 60, 95, 65, 80, 55].map((h, i) => (
            <SkeletonBlock key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="flex items-center justify-between pt-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonText key={i} width="32px" className="h-2" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SkeletonDonut({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center", className)}>
      <div className="flex justify-center sm:justify-start">
        <SkeletonBlock className="h-[150px] w-[150px] rounded-full sm:h-[170px] sm:w-[170px]" />
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <SkeletonBlock className="h-2.5 w-2.5 rounded-sm" />
            <SkeletonText width="96px" className="h-2.5" />
            <SkeletonText width="40px" className="h-2.5 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
