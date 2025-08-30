"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Lock } from "lucide-react"
import { UnifiedTransactionDialog } from "./transaction-dialog"
import { useAuthentication } from "@/hooks/use-authentication"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function FloatingAddButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)

  const { isAuthenticated, hasPin, lockApp } = useAuthentication()
  const isMobile = useIsMobile()

  // Debug logs for authentication state
  console.log("[DEBUG] FloatingAddButton - isAuthenticated:", isAuthenticated, "hasPin:", hasPin, "isMobile:", isMobile)
  console.log("[DEBUG] FloatingAddButton - showLockOption:", isAuthenticated && hasPin)

  const handleButtonClick = useCallback(() => {
    if (isLongPressRef.current) {
      // Long press was detected, don't open dialog
      isLongPressRef.current = false
      return
    }

    console.log("[v0] Floating button clicked, opening dialog")
    setIsDialogOpen(true)
  }, [])

  const handleDialogOpenChange = useCallback((open: boolean) => {
    console.log("[v0] Dialog open change:", open)
    setIsDialogOpen(open)
  }, [])

  const handleLockWallet = useCallback(() => {
    lockApp()
    setIsMenuOpen(false)
  }, [lockApp])

  // Desktop hover handlers
  const handleMouseEnter = useCallback(() => {
    console.log("[DEBUG] handleMouseEnter - isMobile:", isMobile, "isAuthenticated:", isAuthenticated, "hasPin:", hasPin)
    if (!isMobile && isAuthenticated && hasPin) {
      console.log("[DEBUG] Setting menu open to true")
      setIsMenuOpen(true)
    } else {
      console.log("[DEBUG] Menu not opened - conditions not met")
    }
  }, [isMobile, isAuthenticated, hasPin])

  const handleMouseLeave = useCallback(() => {
    console.log("[DEBUG] handleMouseLeave - isMobile:", isMobile)
    if (!isMobile) {
      console.log("[DEBUG] Setting menu open to false")
      setIsMenuOpen(false)
    }
  }, [isMobile])

  // Mobile long press handlers
  const handleTouchStart = useCallback(() => {
    if (isMobile && isAuthenticated && hasPin) {
      isLongPressRef.current = false
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true
        setIsMenuOpen(true)
      }, 500) // 500ms long press
    }
  }, [isMobile, isAuthenticated, hasPin])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const showLockOption = isAuthenticated && hasPin

  // Debug Popover state changes
  useEffect(() => {
    console.log("[DEBUG] isMenuOpen changed to:", isMenuOpen)
  }, [isMenuOpen])

  console.log("[DEBUG] Rendering Popover - showLockOption:", showLockOption, "isMenuOpen:", isMenuOpen)

  return (
    <>
      <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            onClick={handleButtonClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90 text-primary-foreground z-50"
            size="icon"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </PopoverTrigger>

        {showLockOption && (
          <PopoverContent
            className="w-48 p-2"
            align="end"
            side="top"
            sideOffset={8}
          >
            <button
              onClick={handleLockWallet}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Lock Wallet
            </button>
          </PopoverContent>
        )}
      </Popover>

      <UnifiedTransactionDialog isOpen={isDialogOpen} onOpenChange={handleDialogOpenChange} />
    </>
  )
}
