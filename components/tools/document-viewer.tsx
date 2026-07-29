"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { SecurePinManager } from "@/lib/secure-pin-manager"
import { SecureKeyManager } from "@/lib/key-manager"
import {
  ZoomIn, ZoomOut, Tag, Calendar, HardDrive,
  Download, ExternalLink, Crop, X, Loader2,
  File, ChevronLeft, ChevronRight, Image as ImageIcon, Upload, Maximize, Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  type Person,
  type StoredDocument,
  type DocumentPage,
  getDocuments,
  getDocumentBlob,
  generateThumbnail,
  formatFileSize,
  updateDocumentBlob,
  downloadDocument,
  addDocumentPage,
  generateId,
} from "@/lib/document-storage"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { FileIcon, DOCUMENT_TYPES } from "./document-utils"
import { ImageEditor } from "./image-editor"

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

// ─── Unified zoom + pan hook ─────────────────────────────────────────────────
// Uses CSS transforms instead of scroll manipulation. The content is placed in
// an `overflow:hidden` container and moved via `translate(panX,panY) scale(zoom)`
// with `transform-origin: 0 0`. This guarantees the point under the cursor
// stays fixed during zoom (no jumping).

const MIN_ZOOM = 0.25
const MAX_ZOOM = 5
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface ZoomPanState {
  zoom: number
  panX: number
  panY: number
}

interface ContentSize {
  w: number
  h: number
}

function useZoomPan(
  containerRef: React.RefObject<HTMLDivElement | null>,
  contentSize: ContentSize | null,
  enabled: boolean,
) {
  const [state, setState] = useState<ZoomPanState>({ zoom: 1, panX: 0, panY: 0 })
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  const contentSizeRef = useRef(contentSize)
  useEffect(() => { contentSizeRef.current = contentSize }, [contentSize])

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const getContainerRect = useCallback(() => containerRef.current?.getBoundingClientRect() ?? null, [containerRef])

  /** Compute pan values that center the content in the container at a given zoom */
  const centerPan = useCallback((z: number, cs: ContentSize | null): { panX: number; panY: number } => {
    const rect = getContainerRect()
    if (!rect || !cs) return { panX: 0, panY: 0 }
    
    // Center horizontally if content fits, otherwise align left (with 16px padding)
    const panX = rect.width >= cs.w * z
      ? (rect.width - cs.w * z) / 2
      : 16

    // Center vertically if content fits, otherwise align to top (with 16px padding)
    const panY = rect.height >= cs.h * z
      ? (rect.height - cs.h * z) / 2
      : 16

    return { panX, panY }
  }, [getContainerRect])

  /** Reset to fit-in-view (zoom=1 means content at its fitted size, centered) */
  const fitToView = useCallback(() => {
    const cp = centerPan(1, contentSizeRef.current)
    setState({ zoom: 1, panX: cp.panX, panY: cp.panY })
  }, [centerPan])

  /** Zoom toward a specific point in container-relative coordinates */
  const zoomAt = useCallback((nextZoom: number, relX: number, relY: number) => {
    const s = stateRef.current
    const z = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
    // Content coordinate under the cursor at current zoom
    const contentX = (relX - s.panX) / s.zoom
    const contentY = (relY - s.panY) / s.zoom
    // Adjust pan so the same content point stays under the cursor
    setState({ zoom: z, panX: relX - contentX * z, panY: relY - contentY * z })
  }, [])

  /** Zoom toward the center of the container */
  const zoomCenter = useCallback((nextZoom: number) => {
    const rect = getContainerRect()
    if (!rect) return
    zoomAt(nextZoom, rect.width / 2, rect.height / 2)
  }, [getContainerRect, zoomAt])

  // ─── Center on initial content or when content size changes ────────────
  const contentSizeW = contentSize?.w
  const contentSizeH = contentSize?.h
  useEffect(() => {
    if (!contentSizeW || !contentSizeH || !enabled) return
    const cp = centerPan(1, { w: contentSizeW, h: contentSizeH })
    setState({ zoom: 1, panX: cp.panX, panY: cp.panY })
  }, [contentSizeW, contentSizeH, enabled, centerPan])

  // ─── Wheel Event: Zoom (Ctrl) or Pan (No Ctrl) ──────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el || !enabled) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        const relX = e.clientX - rect.left
        const relY = e.clientY - rect.top
        const factor = Math.exp(-e.deltaY * 0.002)
        zoomAt(stateRef.current.zoom * factor, relX, relY)
      } else {
        setState(s => ({
          ...s,
          panX: s.panX - e.deltaX,
          panY: s.panY - e.deltaY,
        }))
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [containerRef, enabled, zoomAt])

  // ─── Mouse Drag Pan ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el || !enabled) return
    let dragging = false
    let pointerId = -1
    let startX = 0
    let startY = 0
    let startPanX = 0
    let startPanY = 0

    const onDown = (e: PointerEvent) => {
      // Only left button, ignore if it's a touch (handled separately)
      if (e.button !== 0 || e.pointerType === "touch") return
      dragging = true
      pointerId = e.pointerId
      startX = e.clientX
      startY = e.clientY
      startPanX = stateRef.current.panX
      startPanY = stateRef.current.panY
      el.style.cursor = "grabbing"
      e.preventDefault()
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      setState(s => ({ ...s, panX: startPanX + dx, panY: startPanY + dy }))
    }
    const onUp = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return
      dragging = false
      pointerId = -1
      el.style.cursor = ""
    }
    el.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      el.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [containerRef, enabled])

  // ─── Touch: Pinch Zoom + Drag Pan ─────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el || !enabled) return

    let activeTouches: Touch[] = []
    let startDist = 0
    let startZoom = 1
    let lastMid = { x: 0, y: 0 }
    let lastPanX = 0
    let lastPanY = 0
    let isPanning = false

    const dist = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const mid = (a: Touch, b: Touch) => ({
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2,
    })

    const onStart = (e: TouchEvent) => {
      activeTouches = Array.from(e.touches)
      if (e.touches.length === 2) {
        e.preventDefault()
        startDist = dist(e.touches[0], e.touches[1])
        startZoom = stateRef.current.zoom
        lastMid = mid(e.touches[0], e.touches[1])
        lastPanX = stateRef.current.panX
        lastPanY = stateRef.current.panY
      } else if (e.touches.length === 1) {
        isPanning = true
        lastMid = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        lastPanX = stateRef.current.panX
        lastPanY = stateRef.current.panY
      }
    }
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const d = dist(e.touches[0], e.touches[1])
        const m = mid(e.touches[0], e.touches[1])
        const rect = el.getBoundingClientRect()
        const relX = m.x - rect.left
        const relY = m.y - rect.top
        const nextZoom = clamp(startZoom * (d / startDist), MIN_ZOOM, MAX_ZOOM)
        // Zoom toward the midpoint of the two fingers
        const contentX = (relX - lastPanX) / startZoom
        const contentY = (relY - lastPanY) / startZoom
        const dx = m.x - lastMid.x
        const dy = m.y - lastMid.y
        setState({
          zoom: nextZoom,
          panX: relX - contentX * nextZoom + dx,
          panY: relY - contentY * nextZoom + dy,
        })
        // Update tracking for continuous delta
        lastMid = m
        lastPanX = relX - contentX * nextZoom + dx
        lastPanY = relY - contentY * nextZoom + dy
        startZoom = nextZoom
        startDist = d
        isPanning = false
      } else if (e.touches.length === 1 && isPanning) {
        const dx = e.touches[0].clientX - lastMid.x
        const dy = e.touches[0].clientY - lastMid.y
        setState(s => ({ ...s, panX: lastPanX + dx, panY: lastPanY + dy }))
      }
    }
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        isPanning = false
        startDist = 0
      } else if (e.touches.length === 1) {
        // Transitioned from pinch to single finger - restart pan tracking
        isPanning = true
        lastMid = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        lastPanX = stateRef.current.panX
        lastPanY = stateRef.current.panY
      }
    }

    el.addEventListener("touchstart", onStart, { passive: false })
    el.addEventListener("touchmove", onMove, { passive: false })
    el.addEventListener("touchend", onEnd, { passive: true })
    el.addEventListener("touchcancel", onEnd, { passive: true })
    return () => {
      el.removeEventListener("touchstart", onStart)
      el.removeEventListener("touchmove", onMove)
      el.removeEventListener("touchend", onEnd)
      el.removeEventListener("touchcancel", onEnd)
    }
  }, [containerRef, enabled])

  // ─── Double-click / double-tap to toggle zoom ─────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el || !enabled) return
    const onDblClick = (e: MouseEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const relX = e.clientX - rect.left
      const relY = e.clientY - rect.top
      const s = stateRef.current
      // If zoomed in (>1.1), reset to fit; otherwise zoom to 2x at cursor
      if (s.zoom > 1.1) {
        const cp = centerPan(1, contentSizeRef.current)
        setState({ zoom: 1, panX: cp.panX, panY: cp.panY })
      } else {
        zoomAt(2, relX, relY)
      }
    }
    el.addEventListener("dblclick", onDblClick)
    return () => el.removeEventListener("dblclick", onDblClick)
  }, [containerRef, enabled, zoomAt, centerPan])

  return { ...state, zoomAt, zoomCenter, fitToView, setState }
}

// ─── Helper: compute "fit" dimensions ────────────────────────────────────────
// Given the natural size of content and the container dimensions, returns the
// pixel dimensions at which the content fits inside the container with some padding.
function computeFitSize(
  naturalW: number,
  naturalH: number,
  containerW: number,
  containerH: number,
  padding = 0.94,
): ContentSize {
  const fit = Math.min(
    (containerW * padding) / naturalW,
    (containerH * padding) / naturalH,
    1,
  )
  return { w: naturalW * fit, h: naturalH * fit }
}

const FALLBACK_PAGE = (doc: StoredDocument): DocumentPage => ({
  id: doc.id,
  label: "Document",
  mimeType: doc.mimeType,
  size: doc.size,
  hasThumbnail: !!doc.metadata?.hasThumbnail,
})

export function DocumentViewer({ docId, onClose, persons, onDocumentUpdated }: {
  docId: string | null
  onClose: () => void
  persons: Person[]
  onDocumentUpdated?: (id: string) => void
}) {
  const [doc, setDoc] = useState<StoredDocument | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [pageUrls, setPageUrls] = useState<Record<string, string>>({})
  const [pageBlobs, setPageBlobs] = useState<Record<string, Blob>>({})
  const [currentPageId, setCurrentPageId] = useState<string | null>(null)
  const [flip, setFlip] = useState(false)
  const [addingSide, setAddingSide] = useState(false)
  const missingInputRef = useRef<HTMLInputElement>(null)
  const [numPages, setNumPages] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const retryLoadRef = useRef(false)
  const [retryCount, setRetryCount] = useState(0)

  // ─── Image viewer state ────────────────────────────────────────────────────
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null)
  const [imgContainerSize, setImgContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const imgContainerRef = useRef<HTMLDivElement>(null)

  // ─── Flip viewer state ─────────────────────────────────────────────────────
  const flipContainerRef = useRef<HTMLDivElement>(null)
  const [face0Natural, setFace0Natural] = useState<{ w: number; h: number } | null>(null)
  const [face1Natural, setFace1Natural] = useState<{ w: number; h: number } | null>(null)
  const [flipContainerSize, setFlipContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  // ─── PDF viewer state ──────────────────────────────────────────────────────
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const [pdfPageSize, setPdfPageSize] = useState<{ w: number; h: number } | null>(null)
  const [pdfContainerSize, setPdfContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const pdfFitDoneRef = useRef(false)

  // ─── Observe container sizes ───────────────────────────────────────────────
  useEffect(() => {
    const el = imgContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setImgContainerSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setImgContainerSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [blobUrl, editMode])

  useEffect(() => {
    const el = flipContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setFlipContainerSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setFlipContainerSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [blobUrl, editMode])

  useEffect(() => {
    const el = pdfContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setPdfContainerSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setPdfContainerSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [blobUrl, editMode])

  // ─── Compute fit sizes ─────────────────────────────────────────────────────
  const imgFit = useMemo(() => {
    return imgNatural && imgContainerSize.w && imgContainerSize.h
      ? computeFitSize(imgNatural.w, imgNatural.h, imgContainerSize.w, imgContainerSize.h)
      : null
  }, [imgNatural, imgContainerSize.w, imgContainerSize.h])

  const flipFit = useMemo(() => {
    const nat = flip ? (face1Natural ?? face0Natural) : face0Natural
    return nat && flipContainerSize.w && flipContainerSize.h
      ? computeFitSize(nat.w, nat.h, flipContainerSize.w, flipContainerSize.h, 0.85)
      : null
  }, [flip, face0Natural, face1Natural, flipContainerSize.w, flipContainerSize.h])

  const pdfFitScale = pdfPageSize && pdfContainerSize.w
    ? Math.min((pdfContainerSize.w - 32) / pdfPageSize.w, 1)
    : null

  const pdfFit = useMemo(() => {
    return pdfPageSize && pdfFitScale && numPages
      ? {
          w: pdfPageSize.w * pdfFitScale,
          h: (pdfPageSize.h * pdfFitScale) * numPages + 16 * (numPages - 1),
        }
      : null
  }, [pdfPageSize, pdfFitScale, numPages])

  // ─── Derived state ─────────────────────────────────────────────────────────
  const pages = doc?.pages?.length ? doc.pages : (doc ? [FALLBACK_PAGE(doc)] : [])
  const currentIdx = Math.max(0, pages.findIndex((p) => p.id === currentPageId))
  const currentPage = pages[currentIdx]
  const currentMime = currentPage?.mimeType ?? doc?.mimeType ?? ""
  const isImage = currentMime.startsWith("image/")
  const isPdf = currentMime === "application/pdf"
  const isText = currentMime === "text/plain"
  const docType = doc ? DOCUMENT_TYPES.find((t) => t.key === doc.type) : undefined
  const expectedFaces = docType?.faces ?? (pages.length > 1 ? pages.length : 1)
  const isTwoSided = isImage && expectedFaces >= 2
  const face0 = pages[0] ?? null
  const face1 = pages[1] ?? null
  const missingLabel = docType?.faces === 2 ? "Back" : "Page 2"
  const pdfReady = isPdf && !!pageBlobs[currentPage?.id ?? ""]

  // ─── Zoom hooks ─────────────────────────────────────────────────────────────
  // PDF and images all share the unified useZoomPan (translate-based) renderer,
  // which supports pinch-zoom, drag-pan, wheel and double-tap on touch + mouse.
  const pdfZP = useZoomPan(pdfContainerRef, pdfFit, pdfReady)
  const imgZP = useZoomPan(imgContainerRef, imgFit, isImage && !editMode && !isTwoSided && !!blobUrl)
  const flipZP = useZoomPan(flipContainerRef, flipFit, isImage && !editMode && isTwoSided && !!blobUrl)
  const activeImgZP = isTwoSided ? flipZP : imgZP
  const resetImgZoom = () => activeImgZP.setState({ zoom: 1, panX: 0, panY: 0 })

  const [renderedZoom, setRenderedZoom] = useState(1)

  useEffect(() => {
    setRenderedZoom(1)
  }, [currentPageId])

  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderedZoom(pdfZP.zoom)
    }, 400) // 400ms debounce
    return () => clearTimeout(timer)
  }, [pdfZP.zoom])

  // ─── PDF scrolling & page synchronization ──────────────────────────────────
  const scrollToPdfPage = useCallback((targetPageNum: number) => {
    if (!pdfPageSize || !pdfFitScale || !pdfContainerRef.current) return
    const pageHeight = pdfPageSize.h * pdfFitScale * pdfZP.zoom
    const gap = 16 * pdfZP.zoom
    const targetPanY = -((targetPageNum - 1) * (pageHeight + gap)) + 16 // 16px padding at top
    pdfZP.setState(s => ({ ...s, panY: targetPanY }))
  }, [pdfPageSize, pdfFitScale, pdfZP.zoom, pdfZP.setState])

  useEffect(() => {
    if (!isPdf || !pdfPageSize || !pdfFitScale || !numPages || !pdfContainerRef.current) return
    const containerHeight = pdfContainerRef.current.clientHeight
    const pageHeight = pdfPageSize.h * pdfFitScale * pdfZP.zoom
    const gap = 16 * pdfZP.zoom
    const viewportTop = -pdfZP.panY
    const pageHeightWithGap = pageHeight + gap

    // Determine which page is in the middle of the viewport
    const midPoint = viewportTop + containerHeight / 2
    const current = Math.min(
      numPages,
      Math.max(1, Math.floor(midPoint / pageHeightWithGap) + 1)
    )
    setPageNum(current)
  }, [pdfZP.panY, pdfZP.zoom, pdfPageSize, pdfFitScale, numPages, isPdf])

  // ─── Display percentage for toolbar ─────────────────────────────────────────
  const displayPercent = (() => {
    if (isPdf && pdfFitScale) return Math.round(pdfFitScale * pdfZP.zoom * 100)
    if (isTwoSided && flipFit) {
      const nat = flip ? face1Natural : face0Natural
      if (nat) return Math.round((flipFit.w * flipZP.zoom / nat.w) * 100)
    }
    if (!isTwoSided && imgFit && imgNatural) return Math.round((imgFit.w * imgZP.zoom / imgNatural.w) * 100)
    return Math.round(activeImgZP.zoom * 100)
  })()

  // ─── Load document data ────────────────────────────────────────────────────
  const urlsRef = useRef<string[]>([])
  useEffect(() => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    urlsRef.current = []
    if (!docId) { setDoc(null); setBlobUrl(null); setTextContent(null); setPageUrls({}); setPageBlobs({}); setCurrentPageId(null); setFlip(false); return }
    setIsLoading(true)
    const load = async () => {
      const docs = await getDocuments()
      const found = docs.find((d) => d.id === docId)
      if (!found) { setIsLoading(false); return }
      setDoc(found)
      const pgs = found.pages?.length ? found.pages : [FALLBACK_PAGE(found)]
      let decryptionFailed = false
      const urls: Record<string, string> = {}
      const blobs: Record<string, Blob> = {}
      for (const p of pgs) {
        try {
          if (p.mimeType.startsWith("image/") || p.mimeType === "application/pdf") {
            const blob = await getDocumentBlob(docId, p.id)
            if (blob) {
              const u = URL.createObjectURL(blob)
              urls[p.id] = u
              blobs[p.id] = blob
              urlsRef.current.push(u)
            }
          } else if (p.mimeType === "text/plain") {
            const blob = await getDocumentBlob(docId, p.id)
            if (blob) setTextContent(await blob.text())
          }
        } catch {
          decryptionFailed = true
        }
      }
      if (decryptionFailed) {
        setShowPinDialog(true)
        return
      }
      setPageUrls(urls)
      setPageBlobs(blobs)
      pdfFitDoneRef.current = false
      setImgNatural(null)
      setFace0Natural(null)
      setFace1Natural(null)
      setPdfPageSize(null)
      resetImgZoom()
      pdfZP.setState({ zoom: 1, panX: 0, panY: 0 })
      setCurrentPageId(pgs[0]?.id ?? found.id)
      setBlobUrl(urls[pgs[0]?.id] ?? null)
      setIsLoading(false)
    }
    load()
    return () => { urlsRef.current.forEach((u) => URL.revokeObjectURL(u)); urlsRef.current = [] }
  }, [docId, retryCount])

  // goToPage resets dimensions explicitly; no effect on blobUrl because toggleFlip
  // changes blobUrl and we must not destroy face dimensions mid-flip.

  // ─── Page navigation ──────────────────────────────────────────────────────
  const goToPage = (id: string) => {
    setCurrentPageId(id)
    setBlobUrl(pageUrls[id] ?? null)
    setPageNum(1)
    setNumPages(0)
    setImgNatural(null)
    setFace0Natural(null)
    setFace1Natural(null)
    setPdfPageSize(null)
    pdfFitDoneRef.current = false
    setRenderedZoom(1)
    resetImgZoom()
    pdfZP.setState({ zoom: 1, panX: 0, panY: 0 })
    if (isTwoSided) setFlip(pages.findIndex((p) => p.id === id) === 1)
  }

  const toggleFlip = () => {
    if (!isTwoSided) return
    const next = !flip
    setFlip(next)
    const target = next ? (face1 ?? null) : face0
    if (target) {
      setCurrentPageId(target.id)
      setBlobUrl(pageUrls[target.id] ?? null)
    }
  }

  // Tap-to-flip detection. useZoomPan calls preventDefault() on pointerdown for
  // mouse, which cancels the synthesized `click`, so onClick={toggleFlip} never
  // fires. We detect a genuine tap (small movement, short duration) via pointer
  // events instead — these still fire even when pointerdown is canceled.
  const flipTapRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const handleFlipPointerDown = (e: React.PointerEvent) => {
    flipTapRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
  }
  const handleFlipPointerUp = (e: React.PointerEvent) => {
    const s = flipTapRef.current
    flipTapRef.current = null
    if (!s || !e.isPrimary) return
    const dist = Math.hypot(e.clientX - s.x, e.clientY - s.y)
    if (dist < 6 && Date.now() - s.t < 400) toggleFlip()
  }

  // ─── Add side (two-sided documents) ────────────────────────────────────────
  const handleAddSide = async (file: File | null) => {
    if (!file || !doc) return
    if (!file.type.startsWith("image/")) { toast.error("Only images can be added as a side"); return }
    setAddingSide(true)
    try {
      const thumb = await generateThumbnail(file).catch(() => undefined)
      const pageId = `p${Date.now()}`
      const page: DocumentPage = {
        id: pageId,
        label: missingLabel,
        mimeType: file.type,
        size: file.size,
        hasThumbnail: !!thumb,
      }
      await addDocumentPage(doc.id, page, file, thumb)
      const u = URL.createObjectURL(file)
      urlsRef.current.push(u)
      setPageUrls((prev) => ({ ...prev, [pageId]: u }))
      setPageBlobs((prev) => ({ ...prev, [pageId]: file }))
      setDoc((prev) => (prev ? { ...prev, pages: [...(prev.pages ?? []), page], size: prev.size + file.size } : prev))
      setFlip(true)
      onDocumentUpdated?.(doc.id)
      toast.success(`${missingLabel} added`)
    } catch {
      toast.error("Failed to add side")
    } finally {
      setAddingSide(false)
    }
  }

  // ─── Save edited image ─────────────────────────────────────────────────────
  const handleSaveEditedImage = async (cropped: Blob) => {
    if (!doc || !currentPage) return
    try {
      const thumb = await generateThumbnail(cropped)
      await updateDocumentBlob(doc.id, currentPage.id, cropped, thumb)
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      const newUrl = URL.createObjectURL(cropped)
      urlsRef.current.push(newUrl)
      setPageUrls((prev) => ({ ...prev, [currentPage.id]: newUrl }))
      setPageBlobs((prev) => ({ ...prev, [currentPage.id]: cropped }))
      setBlobUrl(newUrl)
      setImgNatural(null)
      setEditMode(false)
      onDocumentUpdated?.(doc.id)
      toast.success("Image saved")
    } catch {
      toast.error("Failed to save edited image")
    }
  }

  const person = doc ? persons.find((p) => p.id === doc.personId) : null

  if (!docId || !doc) return null

  const handlePinSubmit = async () => {
    setIsVerifying(true)
    setPinError(false)
    try {
      const result = await SecurePinManager.validatePin(pinInput)
      if (result.success) {
        if (!SecureKeyManager.hasMasterKey()) {
          await SecureKeyManager.createMasterKey(pinInput)
        }
        await SecureKeyManager.getMasterKey(pinInput)
        SecureKeyManager.cacheSessionPin(pinInput)
        setShowPinDialog(false)
        setPinInput("")
        retryLoadRef.current = true
        setRetryCount((c) => c + 1)
      } else {
        setPinError(true)
      }
    } catch {
      setPinError(true)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleClose = () => {
    onClose()
    setPageNum(1)
    setEditMode(false)
    setCurrentPageId(null)
    setFlip(false)
    resetImgZoom()
    pdfZP.setState({ zoom: 1, panX: 0, panY: 0 })
  }

  return (
    <Dialog open={!!docId} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="w-[95vw] sm:w-[52rem] sm:max-w-[52rem] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden [&>[data-slot=dialog-close]]:hidden">
        <DialogTitle className="sr-only">{doc?.name || "Document"}</DialogTitle>
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-border/10 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/10">
              <FileIcon type={currentMime} size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{doc.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {person && `${person.emoji} ${person.name} · `}
                {formatFileSize(doc.size)}
                {isTwoSided
                  ? ` · ${flip ? (face1 ? face1.label : missingLabel) : (face0?.label ?? "")}`
                  : pages.length > 1 && ` · ${currentPage?.label} (${currentIdx + 1}/${pages.length})`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {pages.length > 1 && !editMode && !isTwoSided && (
              <>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={currentIdx === 0} onClick={() => goToPage(pages[currentIdx - 1].id)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={currentIdx === pages.length - 1} onClick={() => goToPage(pages[currentIdx + 1].id)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {isImage && !editMode && (!flip || !!face1) && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit" onClick={() => setEditMode(true)}>
                <Crop className="h-3.5 w-3.5" />
              </Button>
            )}
            {blobUrl && !editMode && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Open in new tab"
                onClick={() => window.open(blobUrl, "_blank", "noopener,noreferrer")}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            {!editMode && pages.length === 1 ? (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Download"
                onClick={() => downloadDocument(doc)}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            ) : !editMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Download">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => downloadDocument(doc)}>
                    <Download className="h-3.5 w-3.5" /> Download all ({pages.length})
                  </DropdownMenuItem>
                  {pages.map((p, i) => (
                    <DropdownMenuItem key={p.id} onClick={() => downloadDocument(doc, [i])}>
                      <Download className="h-3.5 w-3.5" /> Download {p.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {editMode && isImage && blobUrl ? (
          <ImageEditor
            imageUrl={blobUrl}
            onCancel={() => setEditMode(false)}
            onSave={handleSaveEditedImage}
          />
        ) : (
          <div className="relative flex-1 min-h-0 overflow-hidden bg-muted/5">
          {isLoading ? (
            <div className="h-full flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading document...
            </div>
          ) : isImage && blobUrl && isTwoSided ? (
            /* ─── Two-sided / Flip Viewer (translate-based, unified zoom) ───── */
              <div
                ref={flipContainerRef}
                className="relative h-full w-full overflow-hidden select-none"
                style={{ cursor: "grab", touchAction: "none" }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transformOrigin: "0 0",
                    transform: `translate(${flipZP.panX}px, ${flipZP.panY}px)`,
                    willChange: "transform",
                  }}
                  className="[perspective:1000px]"
                  onPointerDown={handleFlipPointerDown}
                  onPointerUp={handleFlipPointerUp}
                >
                  <div
                    className="relative [transform-style:preserve-3d] transition-[transform,width,height] duration-500 [will-change:transform]"
                    style={{
                      transform: `rotateY(${flip ? 180 : 0}deg)`,
                      width: flipFit ? Math.min(flipFit.w * flipZP.zoom, face0Natural?.w ?? Infinity) : 0,
                      height: flipFit ? Math.min(flipFit.h * flipZP.zoom, face0Natural?.h ?? Infinity) : 0,
                    }}
                  >
                    <div className="[backface-visibility:hidden] flex items-center justify-center">
                      <img
                        src={pageUrls[face0!.id]}
                        alt={`${doc.name} - ${face0!.label}`}
                        draggable={false}
                        onLoad={(e) => setFace0Natural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                        className="select-none rounded-lg shadow-lg touch-none"
                        style={{ width: flipFit ? Math.min(flipFit.w * flipZP.zoom, face0Natural?.w ?? Infinity) : 0, height: flipFit ? Math.min(flipFit.h * flipZP.zoom, face0Natural?.h ?? Infinity) : 0, maxWidth: "none", visibility: flipFit ? "visible" : "hidden", display: "block" }}
                      />
                    </div>
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center">
                      {face1 && pageUrls[face1.id] ? (
                        <img
                          src={pageUrls[face1.id]}
                          alt={`${doc.name} - ${face1.label}`}
                          draggable={false}
                          onLoad={(e) => { if (!face1Natural) setFace1Natural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight }) }}
                          className="select-none rounded-lg shadow-lg touch-none"
                          style={{ width: flipFit ? Math.min(flipFit.w * flipZP.zoom, (face1Natural ?? face0Natural)?.w ?? Infinity) : 0, height: flipFit ? Math.min(flipFit.h * flipZP.zoom, (face1Natural ?? face0Natural)?.h ?? Infinity) : 0, maxWidth: "none", visibility: flipFit ? "visible" : "hidden", display: "block" }}
                        />
                      ) : (
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleFlip() }}
                        onPointerUp={(e) => e.stopPropagation()}
                        className="flex w-full h-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/50 bg-background/40 p-4 text-center transition-colors hover:border-primary hover:bg-primary/5"
                      >
                        {addingSide ? (
                          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/50" />
                        ) : (
                          <ImageIcon className="h-7 w-7 text-muted-foreground/40" />
                        )}
                        <div>
                          <p className="text-xs font-bold text-muted-foreground">{addingSide ? "Adding..." : "No image yet"}</p>
                          <p className="text-[10px] text-muted-foreground/60">{missingLabel} side not uploaded</p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 px-3 text-[11px] font-bold"
                          onClick={(e) => { e.stopPropagation(); missingInputRef.current?.click() }}
                          onPointerUp={(e) => e.stopPropagation()}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1" />
                          Upload
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Flip indicator dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); if (flip) toggleFlip() }}
                  onPointerUp={(e) => e.stopPropagation()}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${!flip ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                  aria-label={`Show ${face0?.label ?? "Front"}`}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); if (!flip) toggleFlip() }}
                  onPointerUp={(e) => e.stopPropagation()}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${flip ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                  aria-label={`Show ${face1?.label ?? missingLabel}`}
                />
              </div>
            </div>
          ) : isImage && blobUrl ? (
            /* ─── Single Image Viewer (translate-based, unified zoom) ──────── */
            <div
              ref={imgContainerRef}
              className="relative h-full w-full overflow-hidden select-none"
              style={{ cursor: "grab", touchAction: "none" }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transformOrigin: "0 0",
                  transform: `translate(${imgZP.panX}px, ${imgZP.panY}px)`,
                  willChange: "transform",
                }}
              >
                <img
                  src={blobUrl}
                  alt={doc.name}
                  draggable={false}
                  onLoad={(e) => setImgNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                  className="select-none rounded-lg shadow-lg touch-none"
                  style={{
                    width: imgFit ? Math.min(imgFit.w * imgZP.zoom, imgNatural?.w ?? Infinity) : 0,
                    height: imgFit ? Math.min(imgFit.h * imgZP.zoom, imgNatural?.h ?? Infinity) : 0,
                    maxWidth: "none",
                    display: "block",
                    visibility: imgFit ? "visible" : "hidden",
                  }}
                />
              </div>
              {!imgFit && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading image...
                </div>
              )}
            </div>
          ) : isText ? (
            <div className="h-full overflow-auto p-4">
              <pre className="w-full whitespace-pre-wrap text-xs leading-relaxed font-mono bg-background/50 rounded-xl p-4 border border-border/20">
                {textContent || "Loading..."}
              </pre>
            </div>
          ) : isPdf && pageBlobs[currentPage?.id ?? ""] ? (
            <div
              ref={pdfContainerRef}
              className="relative h-full w-full overflow-hidden select-none"
              style={{ cursor: "grab", touchAction: "none" }}
            >
              {/* PDF page nav bar */}
              {numPages > 0 && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 text-[10px] font-bold text-muted-foreground bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-border/10">
                  <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-[10px]" disabled={pageNum <= 1}
                    onClick={() => {
                      const next = Math.max(1, pageNum - 1)
                      setPageNum(next)
                      scrollToPdfPage(next)
                    }}>‹</Button>
                  <span>Page {pageNum} of {numPages}</span>
                  <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-[10px]" disabled={pageNum >= numPages}
                    onClick={() => {
                      const next = Math.min(numPages, pageNum + 1)
                      setPageNum(next)
                      scrollToPdfPage(next)
                    }}>›</Button>
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transformOrigin: "0 0",
                  transform: `translate(${pdfZP.panX}px, ${pdfZP.panY}px) scale(${pdfZP.zoom / renderedZoom})`,
                  willChange: "transform",
                }}
              >
                <Document
                  file={pageBlobs[currentPage?.id ?? ""]}
                  onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                  onLoadError={() => toast.error("Failed to load PDF")}
                  loading={<div className="text-xs text-muted-foreground py-10">Loading PDF...</div>}
                >
                  <div className="flex flex-col gap-4">
                    {Array.from(new Array(numPages), (el, index) => (
                      <Page
                        key={`page_${index + 1}`}
                        pageNumber={index + 1}
                        scale={(pdfFitScale ?? 1) * renderedZoom}
                        onRenderSuccess={(page) => {
                          if (index === 0) {
                            setPdfPageSize({ w: page.originalWidth, h: page.originalHeight })
                          }
                        }}
                      />
                    ))}
                  </div>
                </Document>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <File className="h-10 w-10 text-muted-foreground/30" />
              <p>Preview not available for this file type</p>
              <Button variant="outline" size="sm" className="h-8 text-xs mt-2" onClick={() => downloadDocument(doc)}>
                <Download className="h-3 w-3 mr-1" />
                Download to view
              </Button>
            </div>
          )}

          {(isImage || isPdf) && !editMode && (
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-sm border border-border/10">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                onClick={() => isPdf ? pdfZP.zoomCenter(pdfZP.zoom - 0.25) : activeImgZP.zoomCenter(activeImgZP.zoom - 0.25)}>
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-[10px] font-bold text-muted-foreground min-w-[3ch] text-center">{displayPercent}%</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                onClick={() => isPdf ? pdfZP.zoomCenter(pdfZP.zoom + 0.25) : activeImgZP.zoomCenter(activeImgZP.zoom + 0.25)}>
                <ZoomIn className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                onClick={() => isPdf ? pdfZP.fitToView() : activeImgZP.fitToView()}
                title="Fit to view">
                <Maximize className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        )}

        <div className="px-4 py-2.5 border-t border-border/10 flex items-center gap-4 text-[10px] text-muted-foreground shrink-0 flex-wrap">
          {pages.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap justify-end">
                <span className="text-[9px] font-black uppercase tracking-wider text-primary/80">
                  {isTwoSided ? expectedFaces : pages.length} sides
                </span>
              </div>
          )}
          {doc.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {doc.tags.map((t) => <Badge key={t} variant="secondary" className="text-[8px] h-4 px-1.5">{t}</Badge>)}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            {formatFileSize(doc.size)}
          </div>
          {doc.metadata?.notes && <span className="text-muted-foreground/60 truncate">· {doc.metadata.notes}</span>}
        </div>
        <input ref={missingInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { handleAddSide(e.target.files?.[0] ?? null); e.target.value = "" }} />

        {showPinDialog && (
          <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-card border rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Session Expired</h3>
                <p className="text-sm text-muted-foreground">
                  Your encryption session has expired. Please re-enter your PIN to decrypt documents.
                </p>
              </div>
              <div className="space-y-3">
                <InputOTP maxLength={6} value={pinInput} onChange={setPinInput}>
                  <InputOTPGroup className="w-full justify-center">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                {pinError && (
                  <p className="text-xs text-destructive text-center">Invalid PIN. Please try again.</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowPinDialog(false); setPinInput(""); handleClose() }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePinSubmit}
                  disabled={pinInput.length !== 6 || isVerifying}
                >
                  {isVerifying ? "Verifying..." : "Unlock"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
