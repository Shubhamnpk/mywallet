import { cn } from "@/lib/utils"

interface FullPageSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-16 w-16",
  lg: "h-32 w-32",
}

export function FullPageSpinner({ className, size = "sm" }: FullPageSpinnerProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className={cn("animate-spin rounded-full border-b-2 border-primary", sizeMap[size], className)} />
    </div>
  )
}
