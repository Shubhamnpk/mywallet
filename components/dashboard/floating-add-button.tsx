"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, PowerOff, Settings, User } from "lucide-react"
import { UnifiedTransactionDialog } from "./transaction-dialog"
import { useAuthentication } from "@/hooks/use-authentication"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface FloatingAddButtonProps {
  className?: string
  onAddTransaction?: () => void
  onLockWallet?: () => void
  showQuickActions?: boolean
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

export function FloatingAddButton({ 
  className,
  onAddTransaction,
  onLockWallet,
  showQuickActions = true,
  position = 'bottom-right'
}: FloatingAddButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [hapticFeedback, setHapticFeedback] = useState(false)
  
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)
  const touchStartTimeRef = useRef<number>(0)
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { isAuthenticated, hasPin, lockApp } = useAuthentication()
  const isMobile = useIsMobile()

  // Position classes mapping
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
      if (menuTimeoutRef.current) {
        clearTimeout(menuTimeoutRef.current)
      }
    }
  }, [])

  // Handle primary button action (add transaction)
  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    // Prevent click if it was a long press
    if (isLongPressRef.current) {
      isLongPressRef.current = false
      return
    }

    // Haptic feedback for mobile
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(50)
    }

    // Custom handler or default dialog
    if (onAddTransaction) {
      onAddTransaction()
    } else {
      setIsDialogOpen(true)
    }

    // Close menu if open
    setIsMenuOpen(false)
  }, [isMobile, onAddTransaction])

  // Handle dialog state changes
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open)
  }, [])

  // Handle lock wallet action
  const handleLockWallet = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Haptic feedback
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate([50, 50, 100])
    }

    if (onLockWallet) {
      onLockWallet()
    } else {
      lockApp()
    }
    
    setIsMenuOpen(false)
  }, [lockApp, onLockWallet, isMobile])

  // Desktop hover handlers with debouncing
  const handleMouseEnter = useCallback(() => {
    if (!isMobile && isAuthenticated && hasPin && showQuickActions) {
      // Clear any existing timeout
      if (menuTimeoutRef.current) {
        clearTimeout(menuTimeoutRef.current)
      }
      
      // Small delay to prevent accidental triggers
      menuTimeoutRef.current = setTimeout(() => {
        setIsMenuOpen(true)
      }, 100)
    }
  }, [isMobile, isAuthenticated, hasPin, showQuickActions])

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      // Clear the enter timeout
      if (menuTimeoutRef.current) {
        clearTimeout(menuTimeoutRef.current)
      }
      
      // Delay closing to allow moving to popover
      menuTimeoutRef.current = setTimeout(() => {
        setIsMenuOpen(false)
      }, 200)
    }
  }, [isMobile])

  // Popover mouse handlers to keep it open
  const handlePopoverMouseEnter = useCallback(() => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current)
    }
  }, [])

  const handlePopoverMouseLeave = useCallback(() => {
    if (!isMobile) {
      setIsMenuOpen(false)
    }
  }, [isMobile])

  // Enhanced mobile touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !isAuthenticated || !hasPin || !showQuickActions) return

    touchStartTimeRef.current = Date.now()
    isLongPressRef.current = false
    setIsPressed(true)

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      setIsMenuOpen(true)
      setHapticFeedback(true)
      
      // Strong haptic feedback for long press
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
      
      setTimeout(() => setHapticFeedback(false), 200)
    }, 500)
  }, [isMobile, isAuthenticated, hasPin, showQuickActions])

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false)
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // If it was a quick tap and menu is open, close it
    const touchDuration = Date.now() - touchStartTimeRef.current
    if (touchDuration < 500 && isMenuOpen) {
      setIsMenuOpen(false)
    }
  }, [isMenuOpen])

  const handleTouchMove = useCallback(() => {
    // Cancel long press on touch move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setIsPressed(false)
  }, [])

  // Keyboard accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleButtonClick(e as any)
    }
    
    // Open menu with context menu key or long press simulation
    if (e.key === 'ContextMenu' || (e.key === 'Enter' && e.shiftKey)) {
      e.preventDefault()
      if (isAuthenticated && hasPin && showQuickActions) {
        setIsMenuOpen(!isMenuOpen)
      }
    }
  }, [handleButtonClick, isAuthenticated, hasPin, showQuickActions, isMenuOpen])

  const showQuickActionsMenu = isAuthenticated && hasPin && showQuickActions

  return (
    <>
      <Popover 
        open={isMenuOpen} 
        onOpenChange={setIsMenuOpen}
      >
        <PopoverTrigger asChild>
          <Button
            onClick={handleButtonClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onKeyDown={handleKeyDown}
            className={cn(
              "fixed h-14 w-14 rounded-full shadow-lg transition-all duration-300 z-50",
              "bg-primary hover:bg-primary/90 text-primary-foreground",
              "hover:shadow-xl hover:scale-105 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "border-2 border-transparent hover:border-primary/20",
              // Enhanced mobile interactions
              isMobile && "active:shadow-2xl",
              // Pressed state for touch feedback
              isPressed && "scale-95 shadow-inner",
              // Haptic feedback visual
              hapticFeedback && "animate-pulse",
              // Position
              positionClasses[position],
              className
            )}
            size="icon"
            aria-label={isMenuOpen ? "Close quick actions menu" : "Add transaction or open quick actions (long press)"}
            aria-expanded={isMenuOpen}
            aria-haspopup={showQuickActionsMenu ? "true" : "false"}
            type="button"
          >
            <Plus 
              className={cn(
                "w-6 h-6 transition-transform duration-200",
                isMenuOpen && "rotate-45"
              )} 
            />
          </Button>
        </PopoverTrigger>

        {showQuickActionsMenu && (
          <PopoverContent
            className={cn(
              "w-48 p-2 bg-popover/95 backdrop-blur-sm border border-border/50",
              "shadow-lg rounded-lg animate-in fade-in-0 zoom-in-95",
              "duration-200"
            )}
            align="end"
            side={position.includes('top') ? 'bottom' : 'top'}
            sideOffset={8}
            onMouseEnter={handlePopoverMouseEnter}
            onMouseLeave={handlePopoverMouseLeave}
          >
            <div className="space-y-1">
              <button
                onClick={handleLockWallet}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  "cursor-pointer"
                )}
                type="button"
                aria-label="Lock wallet"
              >
                <PowerOff className="w-4 h-4 text-destructive" />
                <span>Lock Wallet</span>
              </button>
              
            </div>
          </PopoverContent>
        )}
      </Popover>

      <UnifiedTransactionDialog 
        isOpen={isDialogOpen} 
        onOpenChange={handleDialogOpenChange} 
      />
    </>
  )
}