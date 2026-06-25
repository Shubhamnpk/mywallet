import { cn } from "@/lib/utils"

interface SpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
}

export function Spinner({ className, size = "sm" }: SpinnerProps) {
  return (
    <div
      className={cn(
        "border-2 border-white border-t-transparent rounded-full animate-spin",
        sizeMap[size],
        className,
      )}
    />
  )
}
