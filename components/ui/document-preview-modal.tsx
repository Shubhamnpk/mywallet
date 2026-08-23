"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ExternalLink, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DocumentPreview } from "@/components/ui/document-preview"

type DocumentPreviewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    url: string | null
    sourceUrl?: string | null
    title?: string
}

export function DocumentPreviewModal({
    open,
    onOpenChange,
    url,
    sourceUrl,
    title = "Document",
}: DocumentPreviewModalProps) {
    const openInNewTab = () => {
        const target = sourceUrl || url
        if (target) {
            window.open(target, "_blank", "noopener,noreferrer")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full sm:w-[95vw] sm:max-w-4xl! h-[88dvh] sm:h-[85vh] p-0 overflow-hidden bg-card/95 border-primary/20 shadow-2xl flex flex-col [&>button]:hidden">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-muted/20">
                    <div className="flex items-center justify-between gap-3">
                        <DialogTitle className="text-sm sm:text-base font-black uppercase tracking-widest">
                            {title}
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            {(sourceUrl || url) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-[10px] font-black uppercase tracking-wider"
                                    onClick={openInNewTab}
                                >
                                    <ExternalLink className="w-3 h-3 mr-2" />
                                    Open in New Tab
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[10px] font-black uppercase tracking-wider"
                                aria-label="Close preview"
                                title="Close preview"
                                onClick={() => onOpenChange(false)}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>
                <div className="relative flex-1 min-h-0 bg-muted/10">
                    <DocumentPreview key={url ?? "none"} url={url} sourceUrl={sourceUrl} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
