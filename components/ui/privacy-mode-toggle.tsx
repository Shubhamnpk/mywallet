"use client"

import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import { usePrivacyMode } from "@/hooks/use-privacy-mode"

export function PrivacyModeToggle() {
  const { isPrivacyModeEnabled, togglePrivacyMode } = usePrivacyMode()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={togglePrivacyMode}
      className={`h-8 w-8 p-0 ${isPrivacyModeEnabled ? 'text-blue-600' : 'text-muted-foreground'}`}
      title={isPrivacyModeEnabled ? 'Disable Privacy Mode' : 'Enable Privacy Mode'}
    >
      {isPrivacyModeEnabled ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
    </Button>
  )
}