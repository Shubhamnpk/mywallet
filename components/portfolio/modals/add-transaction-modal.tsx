"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface AddTransactionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    newTx: {
        symbol: string
        quantity: number
        price: number
        type: string
        date: string
        description: string
    }
    setNewTx: (tx: any) => void
    onAdd: () => Promise<void>
}

export function AddTransactionModal({
    open,
    onOpenChange,
    newTx,
    setNewTx,
    onAdd
}: AddTransactionModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-10 rounded-xl px-4 font-bold shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4 mr-2" />
                    New Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Record Transaction</DialogTitle>
                    <DialogDescription className="font-medium">
                        Manage buys, sells, IPOs, or bonuses to keep your portfolio accurate.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6" onKeyDown={(e) => e.key === 'Enter' && onAdd()}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="type" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
                            <Select
                                value={newTx.type}
                                onValueChange={(v: any) => setNewTx({ ...newTx, type: v })}
                            >
                                <SelectTrigger className="rounded-xl border-muted-foreground/20">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="buy">Buy</SelectItem>
                                    <SelectItem value="sell">Sell</SelectItem>
                                    <SelectItem value="ipo">IPO</SelectItem>
                                    <SelectItem value="bonus">Bonus</SelectItem>
                                    <SelectItem value="merger_in">Merger In</SelectItem>
                                    <SelectItem value="merger_out">Merger Out</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="symbol" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Symbol</Label>
                            <Input
                                id="symbol"
                                className="rounded-xl border-muted-foreground/20 font-bold uppercase"
                                value={newTx.symbol}
                                onChange={(e) => setNewTx({ ...newTx, symbol: e.target.value.toUpperCase() })}
                                placeholder="e.g. NICA"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="units" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Units</Label>
                            <Input
                                id="units"
                                type="number"
                                className="rounded-xl border-muted-foreground/20 font-bold"
                                value={newTx.quantity}
                                onChange={(e) => setNewTx({ ...newTx, quantity: Number(e.target.value) })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="price" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Price</Label>
                            <Input
                                id="price"
                                type="number"
                                disabled={newTx.type === 'bonus'}
                                className="rounded-xl border-muted-foreground/20 font-bold"
                                value={newTx.price}
                                onChange={(e) => setNewTx({ ...newTx, price: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="date" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            className="rounded-xl border-muted-foreground/20 font-medium"
                            value={newTx.date}
                            onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" className="rounded-xl font-bold" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="rounded-xl font-bold px-8 shadow-md" onClick={onAdd}>Record</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
