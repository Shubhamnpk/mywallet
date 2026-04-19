"use client"

import { Pencil, FolderOpen, Eye, EyeOff, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Portfolio } from "@/types/wallet"
import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

interface EditPortfolioModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    portfolio: Portfolio | null
    onSave: (id: string, updates: Partial<Portfolio>) => Promise<void>
}

export function EditPortfolioModal({
    open,
    onOpenChange,
    portfolio,
    onSave
}: EditPortfolioModalProps) {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [includeInTotals, setIncludeInTotals] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (portfolio) {
            setName(portfolio.name)
            setDescription(portfolio.description || "")
            setIncludeInTotals(portfolio.includeInTotals !== false)
        }
    }, [portfolio, open])

    const handleSave = useCallback(async () => {
        if (!portfolio || !name.trim()) return
        
        const updates: Partial<Portfolio> = {}
        if (name.trim() !== portfolio.name) updates.name = name.trim()
        if (description.trim() !== (portfolio.description || "")) updates.description = description.trim() || undefined
        if (includeInTotals !== (portfolio.includeInTotals !== false)) updates.includeInTotals = includeInTotals
        
        if (Object.keys(updates).length === 0) {
            onOpenChange(false)
            return
        }

        setIsSaving(true)
        try {
            await onSave(portfolio.id, updates)
            onOpenChange(false)
        } finally {
            setIsSaving(false)
        }
    }, [portfolio, name, description, includeInTotals, onSave, onOpenChange])

    const hasChanges = portfolio && (
        name.trim() !== portfolio.name ||
        description.trim() !== (portfolio.description || "") ||
        includeInTotals !== (portfolio.includeInTotals !== false)
    )

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSave()
        }
        if (e.key === 'Escape') {
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden border-0 shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5 border-b border-border/50">
                    <DialogHeader className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                                <Pencil className="w-4 h-4 text-primary" />
                            </div>
                            <DialogTitle className="text-lg font-bold tracking-tight">Edit Portfolio</DialogTitle>
                        </div>
                    </DialogHeader>
                </div>

                {/* Form */}
                <div className="px-6 py-5 space-y-5" onKeyDown={handleKeyDown}>
                    {/* Name Field */}
                    <div className="space-y-2">
                        <Label htmlFor="portfolio-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Name
                        </Label>
                        <div className="relative">
                            <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                            <Input
                                id="portfolio-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Portfolio name"
                                className="pl-10 h-11 rounded-xl border-border/60 focus-visible:ring-primary/20 font-medium"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Description Field */}
                    <div className="space-y-2">
                        <Label htmlFor="portfolio-desc" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Description
                        </Label>
                        <Input
                            id="portfolio-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description (optional)"
                            className="h-11 rounded-xl border-border/60 focus-visible:ring-primary/20 font-medium"
                        />
                    </div>

                    {/* Include Toggle - Compact */}
                    <button
                        type="button"
                        onClick={() => setIncludeInTotals(!includeInTotals)}
                        className={cn(
                            "w-full flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200",
                            includeInTotals 
                                ? "bg-primary/5 border-primary/20 hover:bg-primary/10" 
                                : "bg-muted/30 border-border/50 hover:bg-muted/50"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                includeInTotals ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                                {includeInTotals ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-semibold">{includeInTotals ? "Included" : "Excluded"}</p>
                                <p className="text-xs text-muted-foreground">
                                    {includeInTotals ? "In total portfolio value" : "From total calculations"}
                                </p>
                            </div>
                        </div>
                        <div className={cn(
                            "w-11 h-6 rounded-full relative transition-colors duration-200",
                            includeInTotals ? "bg-primary" : "bg-muted-foreground/30"
                        )}>
                            <div className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                                includeInTotals ? "left-6" : "left-1"
                            )} />
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-muted/30 border-t border-border/50 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4 mr-1.5" />
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!name.trim() || isSaving}
                        className={cn(
                            "font-semibold transition-all duration-200",
                            hasChanges ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "bg-primary/80"
                        )}
                    >
                        <Save className="w-4 h-4 mr-1.5" />
                        {isSaving ? "Saving..." : hasChanges ? "Save Changes" : "Done"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
