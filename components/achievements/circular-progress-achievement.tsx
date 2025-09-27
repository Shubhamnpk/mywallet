"use client"

import { ReactNode } from "react"

interface CircularProgressAchievementProps {
  progress: number
  maxProgress: number
  size?: number
  strokeWidth?: number
  children: ReactNode
  className?: string
  progressColor?: string
  backgroundColor?: string
  isUnlocked?: boolean
}

export function CircularProgressAchievement({
  progress,
  maxProgress,
  size = 80,
  strokeWidth = 4,
  children,
  className = "",
  progressColor = "hsl(var(--primary))",
  backgroundColor = "hsl(var(--muted))",
  isUnlocked = false
}: CircularProgressAchievementProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progressPercent = Math.min((progress / maxProgress) * 100, 100)
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      {/* Content in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isUnlocked ? (
          children
        ) : (
          <span className="text-xs font-bold text-foreground">
            {Math.round((progress / maxProgress) * 100)}%
          </span>
        )}
      </div>
    </div>
  )
}