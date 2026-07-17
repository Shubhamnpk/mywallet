"use client"

import { FileText, Shield, Upload, Bell, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DocumentTools() {
    return (
        <Card className="bg-card/45 backdrop-blur-md border border-border/40 shadow-xl rounded-2xl">
            <CardHeader className="pb-2 px-4 pt-3 border-b border-border/10">
                <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" /> Document Vault
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="relative mb-6">
                        <div className="absolute -inset-4 rounded-full bg-primary/5 blur-xl" />
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/5">
                            <FileText className="h-9 w-9 text-primary" />
                        </div>
                    </div>

                    <h3 className="text-lg font-black uppercase tracking-widest text-foreground mb-2">
                        Coming Soon
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mb-8">
                        Your secure document vault is in development. Store, view, and manage passports, IDs, certificates, and all your important files in one place.
                    </p>

                    <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                        <div className="flex flex-col items-center gap-2 rounded-xl border border-border/30 bg-muted/10 p-4">
                            <Upload className="h-5 w-5 text-muted-foreground/60" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                                Upload
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-2 rounded-xl border border-border/30 bg-muted/10 p-4">
                            <Search className="h-5 w-5 text-muted-foreground/60" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                                Search
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-2 rounded-xl border border-border/30 bg-muted/10 p-4">
                            <Shield className="h-5 w-5 text-muted-foreground/60" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                                Encrypted
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-2 rounded-xl border border-border/30 bg-muted/10 p-4">
                            <Bell className="h-5 w-5 text-muted-foreground/60" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                                Expiry Alerts
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
