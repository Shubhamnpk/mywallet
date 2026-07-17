"use client"

import { useEffect, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { ZoomIn, ZoomOut, ExternalLink, Scan } from "lucide-react"
import { Button } from "@/components/ui/button"

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

/** Render the page at this multiple of the container width so zooming in stays crisp
 *  without re-rendering the canvas (zoom is applied via CSS). */
const BASE_RENDER_SCALE = 2

const isImageUrl = (url: string | null): boolean => {
    if (!url) return false
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*|#.*)?$/i.test(url)
}

type DocumentPreviewProps = {
    url: string | null
    sourceUrl?: string | null
}

export function DocumentPreview({ url, sourceUrl }: DocumentPreviewProps) {
    const [pdfZoom, setPdfZoom] = useState(1)
    const [pdfPageNumber, setPdfPageNumber] = useState(1)
    const [pdfTotalPages, setPdfTotalPages] = useState(0)
    const [docType, setDocType] = useState<"pdf" | "image" | null>(null)
    const [containerWidth, setContainerWidth] = useState(0)
    const containerRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        setPdfZoom(1)
        setPdfPageNumber(1)
        setPdfTotalPages(0)
        setDocType(isImageUrl(url) ? "image" : "pdf")
    }, [url])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const update = () => setContainerWidth(el.clientWidth)
        update()
        const observer = new ResizeObserver(update)
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    if (!url) {
        return (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No document selected.
            </div>
        )
    }

    const openInNewTab = () => {
        const target = sourceUrl || url
        if (target) {
            window.open(target, "_blank", "noopener,noreferrer")
        }
    }

    const isImage = docType === "image"
    const renderWidth = containerWidth > 0 ? containerWidth * BASE_RENDER_SCALE : undefined
    // CSS zoom: at pdfZoom=1 the page is fit to the container width (crisp, downscaled from 2x).
    const cssZoom = pdfZoom / BASE_RENDER_SCALE

    return (
        <div ref={containerRef} className="relative h-full w-full bg-muted/10">
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
                <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-muted/50 bg-card/90 backdrop-blur shadow-lg px-1.5 py-1">
                    <button
                        type="button"
                        onClick={() => setPdfZoom((z) => Number(Math.max(0.25, Number((z - 0.25).toFixed(2))).toFixed(2)))}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/40 active:scale-90"
                        title="Zoom out"
                        aria-label="Zoom out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="min-w-[3.25rem] text-center text-xs font-semibold tabular-nums text-foreground">
                        {Math.round(pdfZoom * 100)}%
                    </span>
                    <button
                        type="button"
                        onClick={() => setPdfZoom((z) => Number(Math.min(3, Number((z + 0.25).toFixed(2))).toFixed(2)))}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/40 active:scale-90"
                        title="Zoom in"
                        aria-label="Zoom in"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>
                    <div className="mx-0.5 h-5 w-px bg-muted/40" />
                    <button
                        type="button"
                        onClick={() => setPdfZoom(1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/40 active:scale-90"
                        title="Fit to width"
                        aria-label="Fit to width"
                    >
                        <Scan className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <div className="h-full w-full overflow-auto flex justify-center p-2">
                {isImage ? (
                    <div style={{ zoom: cssZoom }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={url}
                            alt="Document"
                            className="block max-w-none rounded-lg"
                            style={{ width: renderWidth ? `${renderWidth}px` : "auto" }}
                        />
                    </div>
                ) : (
                    <Document
                        file={url}
                        onLoadSuccess={({ numPages }) => {
                            setPdfTotalPages(numPages)
                            setPdfPageNumber(1)
                        }}
                        onLoadError={(err) => {
                            console.error("PDF load error:", err)
                        }}
                        loading={
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                Loading document...
                            </div>
                        }
                        error={
                            <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
                                <p className="text-sm text-destructive font-medium">Failed to load document</p>
                                <Button variant="outline" size="sm" onClick={openInNewTab}>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open in new tab
                                </Button>
                            </div>
                        }
                    >
                        {pdfTotalPages > 0 && (
                            <div className="sticky top-0 z-10 flex items-center justify-center gap-3 border-b border-muted/20 bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
                                <button
                                    type="button"
                                    onClick={() => setPdfPageNumber((p) => Math.max(1, p - 1))}
                                    disabled={pdfPageNumber <= 1}
                                    className="disabled:opacity-30 hover:text-foreground transition-colors"
                                >
                                    Prev
                                </button>
                                <span>
                                    Page {pdfPageNumber} of {pdfTotalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPdfPageNumber((p) => Math.min(pdfTotalPages, p + 1))}
                                    disabled={pdfPageNumber >= pdfTotalPages}
                                    className="disabled:opacity-30 hover:text-foreground transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                        <div style={{ zoom: cssZoom }}>
                            <Page
                                pageNumber={pdfPageNumber}
                                width={renderWidth}
                            />
                        </div>
                    </Document>
                )}
            </div>
        </div>
    )
}
