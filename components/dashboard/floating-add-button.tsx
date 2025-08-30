"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { UnifiedTransactionDialog } from "./transaction-dialog"

export function FloatingAddButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleButtonClick = () => {
    console.log("[v0] Floating button clicked, opening dialog")
    setIsDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    console.log("[v0] Dialog open change:", open)
    setIsDialogOpen(open)
  }

  return (
    <>
      <Button
        onClick={handleButtonClick}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90 text-primary-foreground z-50"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>

      <UnifiedTransactionDialog isOpen={isDialogOpen} onOpenChange={handleDialogOpenChange} />
    </>
  )
}
