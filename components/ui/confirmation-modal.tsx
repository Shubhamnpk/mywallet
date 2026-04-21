"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface ConfirmationModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    onConfirm: () => void
    confirmText?: string
    destructive?: boolean
}

export function ConfirmationModal({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    confirmText = "Confirm",
    destructive = false
}: ConfirmationModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-xl">
                <DialogHeader>
                    <DialogTitle className={cn("text-xl font-black", destructive && "text-red-600")}>
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-muted-foreground font-medium">
                        {description}
                    </p>
                </div>
                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        className="rounded-xl font-bold"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        className={cn(
                            "rounded-xl font-bold px-6",
                            destructive
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-primary hover:bg-primary/90"
                        )}
                        onClick={() => {
                            onConfirm()
                            onOpenChange(false)
                        }}
                    >
                        {confirmText}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
