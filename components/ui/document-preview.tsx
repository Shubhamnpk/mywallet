"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { ZoomIn, ZoomOut, ExternalLink, Scan } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePreviewZoomPan } from "@/components/ui/document-preview-zoom"

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

/** Render the page at this multiple of the container width so zooming in stays crisp
 *  without re-rendering the canvas (the visual scale is a CSS transform). */
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
    const [pdfPageNumber, setPdfPageNumber] = useState(1)
    const [pdfTotalPages, setPdfTotalPages] = useState(0)
    const [docType, setDocType] = useState<"pdf" | "image" | null>(null)
    const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
    const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null)
    const [pdfAspect, setPdfAspect] = useState<number | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const aspectRef = useRef<number | null>(null)

    useEffect(() => {
        setPdfPageNumber(1)
        setPdfTotalPages(0)
        setDocType(isImageUrl(url) ? "image" : "pdf")
        setImgNatural(null)
        setPdfAspect(null)
        aspectRef.current = null
    }, [url])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const update = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight })
        update()
        const observer = new ResizeObserver(update)
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const renderW = containerSize.w > 0 ? containerSize.w * BASE_RENDER_SCALE : 0

    // Layout size of the (2x) rendered content, used for centering math.
    const contentSize = useMemo<{ w: number; h: number } | null>(() => {
        if (renderW <= 0) return null
        if (docType === "image" && imgNatural && imgNatural.w > 0) {
            return { w: renderW, h: renderW * (imgNatural.h / imgNatural.w) }
        }
        if (docType === "pdf" && pdfAspect) {
            return { w: renderW, h: renderW * pdfAspect }
        }
        return null
    }, [renderW, docType, imgNatural, pdfAspect])

    const zp = usePreviewZoomPan(containerRef, contentSize, BASE_RENDER_SCALE, !!url && !!contentSize)

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
    const transformStyle: React.CSSProperties = {
        position: "absolute",
        left: 0,
        top: 0,
        transformOrigin: "0 0",
        transform: `translate(${zp.panX}px, ${zp.panY}px) scale(${zp.zoom / BASE_RENDER_SCALE})`,
        willChange: "transform",
    }

    return (
        <div className="relative h-full w-full bg-muted/10">
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
                <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-muted/50 bg-card/90 backdrop-blur shadow-lg px-1.5 py-1">
                    <button
                        type="button"
                        onClick={() => zp.zoomCenter(zp.zoom - 0.25)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/40 active:scale-90"
                        title="Zoom out"
                        aria-label="Zoom out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="min-w-[3.25rem] text-center text-xs font-semibold tabular-nums text-foreground">
                        {Math.round(zp.zoom * 100)}%
                    </span>
                    <button
                        type="button"
                        onClick={() => zp.zoomCenter(zp.zoom + 0.25)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/40 active:scale-90"
                        title="Zoom in"
                        aria-label="Zoom in"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>
                    <div className="mx-0.5 h-5 w-px bg-muted/40" />
                    <button
                        type="button"
                        onClick={() => zp.fitToView()}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/40 active:scale-90"
                        title="Fit to view"
                        aria-label="Fit to view"
                    >
                        <Scan className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <div
                ref={containerRef}
                className="relative h-full w-full overflow-hidden select-none"
                style={{ cursor: "grab", touchAction: "none" }}
            >
                {isImage ? (
                    <div style={transformStyle}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={url}
                            alt="Document"
                            draggable={false}
                            onLoad={(e) => {
                                const nw = e.currentTarget.naturalWidth
                                const nh = e.currentTarget.naturalHeight
                                if (nw && nh) setImgNatural({ w: nw, h: nh })
                            }}
                            className="block max-w-none rounded-lg select-none"
                            style={{ width: renderW ? `${renderW}px` : "auto", height: "auto" }}
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
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                Loading document...
                            </div>
                        }
                        error={
                            <div className="py-10 flex flex-col items-center justify-center gap-3 p-8 text-center">
                                <p className="text-sm text-destructive font-medium">Failed to load document</p>
                                <Button variant="outline" size="sm" onClick={openInNewTab}>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open in new tab
                                </Button>
                            </div>
                        }
                    >
                        {pdfTotalPages > 0 && (
                            <div className="absolute top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-muted/20 bg-background/80 px-3 py-1.5 text-[10px] font-bold text-muted-foreground shadow-sm backdrop-blur-sm">
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
                        <div style={transformStyle}>
                            <Page
                                pageNumber={pdfPageNumber}
                                width={renderW || undefined}
                                onRenderSuccess={(page) => {
                                    if (aspectRef.current === null && page.originalWidth > 0) {
                                        aspectRef.current = page.originalHeight / page.originalWidth
                                        setPdfAspect(aspectRef.current)
                                    }
                                }}
                            />
                        </div>
                    </Document>
                )}
            </div>
        </div>
    )
}
