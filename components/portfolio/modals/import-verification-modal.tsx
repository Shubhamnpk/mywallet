"use client"

import { Info } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ImportVerificationModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    importQueue: Array<{
        symbol: string
        type: string
        defaultPrice: number
    }>
    importPrices: Record<string, string>
    setImportPrices: (prices: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
    onConfirm: () => Promise<void>
}

export function ImportVerificationModal({
    open,
    onOpenChange,
    importQueue,
    importPrices,
    setImportPrices,
    onConfirm
}: ImportVerificationModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black flex items-center gap-2">
                        <Info className="w-6 h-6 text-primary" />
                        Verify Cost Prices
                    </DialogTitle>
                    <DialogDescription className="font-medium text-muted-foreground">
                        We've identified items that need an initial cost price for accurate profit tracking.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[40vh] pr-4 mt-4" onKeyDown={(e) => e.key === 'Enter' && onConfirm()}>
                    <div className="space-y-4 py-2">
                        {importQueue.map((item) => (
                            <div key={item.symbol} className="flex flex-col gap-2 p-3 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-sm">{item.symbol}</span>
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider h-5 flex items-center justify-center border-primary/20 text-primary">
                                            {item.type}
                                        </Badge>
                                    </div>
                                    {item.type === 'IPO' && (
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                            Auto-detected Face Value
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <Label className="text-[11px] font-black text-muted-foreground uppercase w-20">Buy Price</Label>
                                    <Input
                                        type="number"
                                        value={importPrices[item.symbol] || ""}
                                        onChange={(e) => setImportPrices(prev => ({ ...prev, [item.symbol]: e.target.value }))}
                                        className="h-9 rounded-lg border-primary/10 bg-background font-mono font-bold focus:ring-primary/20"
                                        placeholder="Enter cost..."
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter className="mt-6 gap-2">
                    <Button variant="ghost" className="rounded-xl font-bold" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button className="rounded-xl font-black bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-8" onClick={onConfirm}>
                        Complete Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
