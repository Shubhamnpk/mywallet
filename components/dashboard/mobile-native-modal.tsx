"use client"

import type React from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

interface MobileNativeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
  title: React.ReactNode
  children: React.ReactNode
  desktopClassName?: string
  mobileClassName?: string
}

export function MobileNativeModal({
  open,
  onOpenChange,
  isMobile,
  title,
  children,
  desktopClassName,
  mobileClassName,
}: MobileNativeModalProps) {
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
        <DrawerContent
          className={cn(
            "h-auto max-h-[92dvh] rounded-t-3xl border-t border-border/60 bg-background/96 p-0 backdrop-blur-xl touch-pan-y will-change-transform",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:duration-400 data-[state=closed]:duration-250",
            "ease-[cubic-bezier(0.16,1,0.3,1)]",
            mobileClassName,
          )}
        >
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/35 transition-all duration-300" />
          <div className="flex items-center justify-between border-b border-border/50 bg-gradient-to-b from-background to-background/80 px-4 py-3">
            <DrawerTitle className="text-base font-semibold">{title}</DrawerTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-lg max-h-[90vh] overflow-y-auto", desktopClassName)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
