"use client"

import { Plus, PieChart as PieChartIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CreatePortfolioModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    newPortfolio: {
        name: string
        description: string
        color: string
    }
    setNewPortfolio: (portfolio: { name: string, description: string, color: string }) => void
    onCreate: () => Promise<void>
}

export function CreatePortfolioModal({
    open,
    onOpenChange,
    newPortfolio,
    setNewPortfolio,
    onCreate
}: CreatePortfolioModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-3xl border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <PieChartIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black">Create New Portfolio</DialogTitle>
                            <DialogDescription className="font-medium">
                                Set up a new portfolio to track your investments
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <div className="grid gap-6 py-6" onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPortfolio.name.trim()) {
                        onCreate()
                    }
                }}>
                    <div className="grid gap-3">
                        <Label htmlFor="portfolio-name" className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            Portfolio Name *
                        </Label>
                        <Input
                            id="portfolio-name"
                            className="rounded-xl border-muted-foreground/20 font-bold h-11 focus-visible:ring-primary/20"
                            value={newPortfolio.name}
                            onChange={(e) => setNewPortfolio({ ...newPortfolio, name: e.target.value })}
                            placeholder="e.g., Long Term Investments"
                            autoFocus
                        />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="portfolio-description" className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></span>
                            Description (Optional)
                        </Label>
                        <Input
                            id="portfolio-description"
                            className="rounded-xl border-muted-foreground/20 font-medium h-11 focus-visible:ring-primary/20"
                            value={newPortfolio.description}
                            onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                            placeholder="Brief description of this portfolio"
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button
                        variant="ghost"
                        className="rounded-xl font-bold"
                        onClick={() => {
                            onOpenChange(false)
                            setNewPortfolio({ name: "", description: "", color: "#3b82f6" })
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20"
                        onClick={onCreate}
                        disabled={!newPortfolio.name.trim()}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Portfolio
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
