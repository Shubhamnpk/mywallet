"use client"

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react"
import {
  Paintbrush, Type, MousePointer, Sliders,
  Palette, Minus, Plus, RotateCcw, Eraser, Eye, EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Canvas, PencilBrush, IText, FabricImage, filters as FabricFilters } from "fabric"
import type { TPointerEventInfo, TPointerEvent } from "fabric"

type FilterPreset = "none" | "grayscale" | "sepia" | "vintage" | "blur" | "polaroid" | "kodachrome"

export interface FabricEditorHandle {
  exportBlob: () => Promise<Blob>
}

function buildFilterList(brightness: number, contrast: number, saturation: number, preset: FilterPreset) {
  const list: InstanceType<typeof FabricFilters.BaseFilter>[] = []
  if (brightness !== 0) list.push(new FabricFilters.Brightness({ brightness }))
  if (contrast !== 0) list.push(new FabricFilters.Contrast({ contrast }))
  if (saturation !== 0) list.push(new FabricFilters.Saturation({ saturation }))
  if (preset === "grayscale") list.push(new FabricFilters.Grayscale())
  else if (preset === "sepia") list.push(new FabricFilters.Sepia())
  else if (preset === "vintage") list.push(new FabricFilters.Vintage())
  else if (preset === "blur") list.push(new FabricFilters.Blur({ blur: 0.3 }))
  else if (preset === "polaroid") list.push(new FabricFilters.Polaroid())
  else if (preset === "kodachrome") list.push(new FabricFilters.Kodachrome())
  return list
}

export const ImageFabricEditor = forwardRef<FabricEditorHandle, { imageUrl: string; mode: "adjust" | "annotate" }>(
  function ImageFabricEditor({ imageUrl, mode }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasElRef = useRef<HTMLCanvasElement | null>(null)
    const fabricRef = useRef<Canvas | null>(null)
    const imgRef = useRef<FabricImage | null>(null)
    const [activeTool, setActiveTool] = useState<"select" | "draw" | "text">("select")

    const [brightness, setBrightness] = useState(0)
    const [contrast, setContrast] = useState(0)
    const [saturation, setSaturation] = useState(0)
    const [preset, setPreset] = useState<FilterPreset>("none")
    const [showOriginal, setShowOriginal] = useState(false)

    const [drawColor, setDrawColor] = useState("#e74c3c")
    const [drawSize, setDrawSize] = useState(3)

    const [imageReady, setImageReady] = useState(false)
    const naturalRef = useRef({ w: 0, h: 0 })
    const displayScaleRef = useRef(1)

    // ─── Filters ──────────────────────────────────────────────────────────────

    const applyFilters = useCallback(() => {
      const img = imgRef.current
      if (!img) return
      const filters = showOriginal ? [] : buildFilterList(brightness, contrast, saturation, preset)
      img.filters = filters
      img.applyFilters()
      fabricRef.current?.renderAll()
    }, [brightness, contrast, saturation, preset, showOriginal])

    useEffect(() => {
      if (imageReady) applyFilters()
    }, [applyFilters, imageReady])

    // ─── Canvas lifecycle ──────────────────────────────────────────────────────

    const getContainerSize = useCallback(() => {
      const c = containerRef.current
      if (!c) return { w: 800, h: 600 }
      const pad = 24
      return { w: Math.max(100, c.clientWidth - pad), h: Math.max(100, c.clientHeight - pad) }
    }, [])

    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      const abort = new AbortController()
      let disposed = false

      const canvasEl = document.createElement("canvas")
      canvasEl.className = "rounded-lg shadow-lg"
      canvasElRef.current = canvasEl
      container.appendChild(canvasEl)

      const fabric = new Canvas(canvasEl)

      FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous", signal: abort.signal })
        .then((img) => {
          if (disposed) return
          const naturalW = img.width!
          const naturalH = img.height!
          naturalRef.current = { w: naturalW, h: naturalH }

          const { w: availW, h: availH } = getContainerSize()
          const scale = Math.min(availW / naturalW, availH / naturalH, 2)
          displayScaleRef.current = scale

          const dispW = Math.round(naturalW * scale)
          const dispH = Math.round(naturalH * scale)

          fabric.setDimensions({ width: dispW, height: dispH })

          img.set({
            left: 0,
            top: 0,
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: false,
          })

          fabric.add(img)
          fabric.renderAll()

          imgRef.current = img
          fabricRef.current = fabric
          setImageReady(true)
        })
        .catch(() => { /* aborted on unmount */ })

      let resizeTimer: ReturnType<typeof setTimeout> | null = null
      const ro = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
          const fc = fabricRef.current
          if (!fc || disposed) return
          const { w: availW, h: availH } = getContainerSize()
          const n = naturalRef.current
          if (!n.w || !n.h) return
          const newScale = Math.min(availW / n.w, availH / n.h, 2)
          const oldScale = displayScaleRef.current
          if (Math.abs(newScale - oldScale) < 0.005) return
          displayScaleRef.current = newScale
          const newW = Math.round(n.w * newScale)
          const newH = Math.round(n.h * newScale)
          fc.setDimensions({ width: newW, height: newH })
          const img = imgRef.current
          if (img) {
            img.set({ scaleX: newScale, scaleY: newScale })
          }
          fc.renderAll()
        }, 150)
      })
      ro.observe(container)

      return () => {
        disposed = true
        abort.abort()
        ro.disconnect()
        if (resizeTimer) clearTimeout(resizeTimer)
        fabric.dispose()
        if (canvasElRef.current && container.contains(canvasElRef.current)) {
          container.removeChild(canvasElRef.current)
        }
        canvasElRef.current = null
        fabricRef.current = null
        imgRef.current = null
        setImageReady(false)
      }
    }, [imageUrl, getContainerSize])

    // ─── Tools ─────────────────────────────────────────────────────────────────

    const handleToolChange = (tool: "select" | "draw" | "text") => {
      const canvas = fabricRef.current
      if (!canvas) return
      setActiveTool(tool)

      canvas.isDrawingMode = tool === "draw"
      canvas.selection = tool === "select"

      if (tool === "draw") {
        const brush = new PencilBrush(canvas)
        brush.color = drawColor
        brush.width = drawSize
        canvas.freeDrawingBrush = brush
        canvas.defaultCursor = "crosshair"
      } else {
        canvas.defaultCursor = tool === "text" ? "text" : "default"
      }
    }

    useEffect(() => {
      if (activeTool !== "draw" || !fabricRef.current) return
      const brush = fabricRef.current.freeDrawingBrush
      if (brush) {
        brush.color = drawColor
        brush.width = drawSize
      }
    }, [drawColor, drawSize, activeTool])

    const handleTextAdd = useCallback((e: TPointerEventInfo<TPointerEvent>) => {
      if (activeTool !== "text") return
      const canvas = fabricRef.current
      if (!canvas) return

      const pointer = canvas.getScenePoint(e.e)
      const text = new IText("Text", {
        left: pointer.x,
        top: pointer.y,
        fontSize: 28,
        fontFamily: "Arial, sans-serif",
        fill: drawColor,
        padding: 8,
        backgroundColor: "rgba(255,255,255,0.7)",
      })
      canvas.add(text)
      canvas.setActiveObject(text)
      canvas.renderAll()
      handleToolChange("select")
    }, [activeTool, drawColor])

    useEffect(() => {
      const canvas = fabricRef.current
      if (!canvas || activeTool !== "text") return
      canvas.on("mouse:down", handleTextAdd as any)
      return () => {
        canvas.off("mouse:down", handleTextAdd as any)
      }
    }, [activeTool, handleTextAdd])

    // ─── Annotation helpers ────────────────────────────────────────────────────

    const handleUndoAnnotation = () => {
      const canvas = fabricRef.current
      if (!canvas) return
      const objects = canvas.getObjects()
      if (objects.length > 1) {
        canvas.remove(objects[objects.length - 1])
        canvas.renderAll()
      }
    }

    const handleClearDrawings = () => {
      const canvas = fabricRef.current
      const img = imgRef.current
      if (!canvas || !img) return
      canvas.remove(...canvas.getObjects().filter((o) => o !== img))
      canvas.renderAll()
    }

    const handleResetFilters = () => {
      setBrightness(0)
      setContrast(0)
      setSaturation(0)
      setPreset("none")
    }

    // ─── Export ────────────────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      exportBlob: async () => {
        const canvas = fabricRef.current
        const img = imgRef.current
        if (!canvas || !img) throw new Error("Canvas not ready")

        canvas.isDrawingMode = false
        canvas.selection = false
        canvas.defaultCursor = "default"

        const n = naturalRef.current
        const scale = displayScaleRef.current
        const multiplier = n.w / (canvas.width! / scale)

        const dataUrl = canvas.toDataURL({
          format: "jpeg",
          quality: 0.92,
          multiplier,
        })

        const res = await fetch(dataUrl)
        return res.blob()
      },
    }))

    // ─── Render ────────────────────────────────────────────────────────────────

    const presetList: FilterPreset[] = ["none", "grayscale", "sepia", "vintage", "blur", "polaroid", "kodachrome"]

    return (
      <>
        <div ref={containerRef} className="relative flex-1 min-h-0 overflow-hidden flex items-center justify-center bg-black/5 p-3" />

        {mode === "adjust" ? (
          <div className="flex flex-col gap-1.5 px-3 py-2 border-t border-border/10 shrink-0 bg-background">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold" onClick={handleResetFilters}>
                <RotateCcw className="h-2.5 w-2.5 mr-1" /> Reset
              </Button>
              <Button
                variant={showOriginal ? "default" : "outline"}
                size="sm"
                className="h-6 text-[9px] font-bold"
                onClick={() => setShowOriginal((v) => !v)}
                title="Toggle original image preview"
              >
                {showOriginal ? <EyeOff className="h-2.5 w-2.5 mr-1" /> : <Eye className="h-2.5 w-2.5 mr-1" />}
                {showOriginal ? "Edited" : "Original"}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground w-16 shrink-0">Brightness</span>
              <input type="range" min={-0.5} max={0.5} step={0.01} value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="flex-1 h-1 accent-primary" />
              <span className="text-[10px] text-muted-foreground w-8 text-right">
                {brightness > 0 ? "+" : ""}{Math.round(brightness * 100)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground w-16 shrink-0">Contrast</span>
              <input type="range" min={-0.5} max={0.5} step={0.01} value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="flex-1 h-1 accent-primary" />
              <span className="text-[10px] text-muted-foreground w-8 text-right">
                {contrast > 0 ? "+" : ""}{Math.round(contrast * 100)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground w-16 shrink-0">Saturate</span>
              <input type="range" min={-1} max={1} step={0.01} value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
                className="flex-1 h-1 accent-primary" />
              <span className="text-[10px] text-muted-foreground w-8 text-right">
                {saturation > 0 ? "+" : ""}{Math.round(saturation * 100)}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-bold text-muted-foreground mr-1">Preset:</span>
              {presetList.map((p) => (
                <Button key={p} variant={preset === p ? "default" : "outline"} size="sm"
                  className="h-6 text-[9px] font-bold px-2" onClick={() => setPreset(p)}>
                  {p === "none" ? "None" : p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border/10 shrink-0 bg-background flex-wrap">
            <div className="flex items-center gap-1">
              <Button variant={activeTool === "select" ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0"
                title="Select" onClick={() => handleToolChange("select")}>
                <MousePointer className="h-3.5 w-3.5" />
              </Button>
              <Button variant={activeTool === "draw" ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0"
                title="Draw" onClick={() => handleToolChange("draw")}>
                <Paintbrush className="h-3.5 w-3.5" />
              </Button>
              <Button variant={activeTool === "text" ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0"
                title="Add text" onClick={() => handleToolChange("text")}>
                <Type className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="w-px h-5 bg-border/20" />
            <div className="flex items-center gap-1.5">
              <Palette className="h-3 w-3 text-muted-foreground" />
              <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)}
                className="h-6 w-8 p-0 border-0 cursor-pointer" />
            </div>
            <div className="flex items-center gap-1">
              <Minus className="h-3 w-3 text-muted-foreground" />
              <input type="range" min={1} max={20} step={1} value={drawSize}
                onChange={(e) => setDrawSize(Number(e.target.value))} className="w-16 h-1 accent-primary" />
              <Plus className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground min-w-[2ch] text-center">{drawSize}</span>
            </div>
            <div className="w-px h-5 bg-border/20" />
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold" onClick={handleUndoAnnotation} title="Undo last">
              <RotateCcw className="h-3 w-3 mr-1" /> Undo
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-destructive" onClick={handleClearDrawings} title="Clear all">
              <Eraser className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
        )}
      </>
    )
  },
)
