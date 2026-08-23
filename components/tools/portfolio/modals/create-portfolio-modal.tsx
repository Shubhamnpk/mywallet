"use client"

import { useState, useEffect } from "react"
import { Plus, PieChart as PieChartIcon, Link2, PencilLine, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle,} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { MeroShareAccount } from "@/types/wallet"

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
    meroShareAccounts: MeroShareAccount[]
    connectAccountId: string
    onConnectAccountChange: (id: string) => void
    onAddMeroShareAccount: () => void
}

export function CreatePortfolioModal({
    open,
    onOpenChange,
    newPortfolio,
    setNewPortfolio,
    onCreate,
    meroShareAccounts,
    connectAccountId,
    onConnectAccountChange,
    onAddMeroShareAccount
}: CreatePortfolioModalProps) {
    const [mode, setMode] = useState<"manual" | "connect" | null>(null)

    useEffect(() => {
        if (!open) setMode(null)
    }, [open])

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
                                {mode === "connect"
                                    ? "Connect a MeroShare account - the portfolio is named after it and syncs automatically"
                                    : "Set up a new portfolio to track your investments"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {mode === null ? (
                    <div className="grid gap-3 py-6">
                        <button
                            type="button"
                            onClick={() => setMode("manual")}
                            className="group flex items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                        >
                            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <PencilLine className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold">Create Manually</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                    Name it yourself and add transactions later.
                                </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("connect")}
                            className="group flex items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                        >
                            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <Link2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold">Connect with MeroShare</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                    Named after your account, created, opened and synced in one go.
                                </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </button>
                    </div>
                ) : mode === "manual" ? (
                    <>
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
                                variant="secondary"
                                className="rounded-xl font-bold"
                                onClick={() => setMode(null)}
                            >
                                Back
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
                    </>
                ) : (
                    <>
                        <div className="grid gap-4 py-6">
                            <p className="text-[11px] text-muted-foreground leading-snug">
                                The portfolio will be named after the selected account, opened, and its transactions imported automatically.
                            </p>
                            <div className="grid gap-2">
                                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                                    MeroShare account
                                </Label>
                                <Select value={connectAccountId} onValueChange={onConnectAccountChange}>
                                    <SelectTrigger className="rounded-xl h-11 font-medium">
                                        <SelectValue placeholder="Choose a MeroShare account..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {meroShareAccounts.map((account) => (
                                            <SelectItem key={account.id} value={account.id}>
                                                {account.label}
                                                {account.username ? ` (${account.username})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-xl font-bold justify-center"
                                    onClick={onAddMeroShareAccount}
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                                    Add new account
                                </Button>
                                {meroShareAccounts.length === 0 && (
                                    <p className="text-[11px] text-muted-foreground">
                                        No saved accounts yet - add one above to create and connect in one step.
                                    </p>
                                )}
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button
                                variant="secondary"
                                className="rounded-xl font-bold"
                                onClick={() => setMode(null)}
                            >
                                <ArrowLeft className="w-4 h-4 mr-1.5" />
                                Back
                            </Button>
                            <Button
                                className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20"
                                onClick={onCreate}
                                disabled={!connectAccountId}
                            >
                                <Link2 className="w-4 h-4 mr-2" />
                                Create & Sync
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
