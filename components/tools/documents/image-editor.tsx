"use client"

import { useEffect, useRef, useState } from "react"
import { ZoomIn, ZoomOut, Check, Loader2, RotateCcw, RotateCw, Crop as CropIcon, Sliders, Paintbrush } from "lucide-react"
import { Button } from "@/components/ui/button"
import Cropper, { type Area, type Point } from "react-easy-crop"
import { getCroppedBlob, createImage } from "./document-utils"
import { ImageFabricEditor, type FabricEditorHandle } from "./image-fabric-editor"

type EditMode = "rotate" | "crop" | "adjust" | "annotate"

const MIN_ZOOM = 0.3

export function ImageEditor({ imageUrl, onCancel, onSave }: {
  imageUrl: string
  onCancel: () => void
  onSave: (cropped: Blob) => Promise<void>
}) {
  const [mode, setMode] = useState<EditMode>("rotate")
  const [rotation, setRotation] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // crop-mode state
  const [cropPos, setCropPos] = useState<Point>({ x: 0, y: 0 })
  const [cropPixels, setCropPixels] = useState<Area | null>(null)
  const [zoom, setZoom] = useState(1)
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [mediaSize, setMediaSize] = useState<{ w: number; h: number } | null>(null)

  // rotate-mode preview state
  const previewRef = useRef<HTMLDivElement>(null)
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  // fabric editor ref
  const fabricRef = useRef<FabricEditorHandle>(null)

  const isFabricMode = mode === "adjust" || mode === "annotate"

  useEffect(() => {
    const c = cropContainerRef.current
    if (c) {
      const ro = new ResizeObserver(() => setContainerSize({ w: c.clientWidth, h: c.clientHeight }))
      ro.observe(c)
      setContainerSize({ w: c.clientWidth, h: c.clientHeight })
    }
    const p = previewRef.current
    if (p) {
      const ro = new ResizeObserver(() => setPreviewSize({ w: p.clientWidth, h: p.clientHeight }))
      ro.observe(p)
      setPreviewSize({ w: p.clientWidth, h: p.clientHeight })
    }
  }, [])

  const fitFull = (rot: number) => {
    if (!mediaSize || !containerSize.w) return
    const r = (rot * Math.PI) / 180
    const sin = Math.abs(Math.sin(r))
    const cos = Math.abs(Math.cos(r))
    const s = Math.min(containerSize.w / mediaSize.w, containerSize.h / mediaSize.h)
    const dispW = mediaSize.w * s
    const dispH = mediaSize.h * s
    const bboxW = dispW * cos + dispH * sin
    const bboxH = dispW * sin + dispH * cos
    const f = Math.max(bboxW / containerSize.w, bboxH / containerSize.h)
    setZoom(f > 0 ? Math.max(MIN_ZOOM, 1 / f) : 1)
    setCropPos({ x: 0, y: 0 })
  }

  const rotate = (delta: number) => {
    setRotation((r) => {
      const nr = (r + delta) % 360
      if (mode === "crop") fitFull(nr)
      return nr
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (isFabricMode) {
        const blob = await fabricRef.current!.exportBlob()
        await onSave(blob)
      } else if (mode === "crop") {
        if (!cropPixels) return
        const cropped = await getCroppedBlob(imageUrl, cropPixels, rotation)
        await onSave(cropped)
      } else {
        const img = await createImage(imageUrl)
        const cropped = await getCroppedBlob(
          imageUrl,
          { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight },
          rotation,
        )
        await onSave(cropped)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const previewScale = (() => {
    if (!naturalSize || !previewSize.w) return 1
    const r = (rotation * Math.PI) / 180
    const sin = Math.abs(Math.sin(r))
    const cos = Math.abs(Math.cos(r))
    const s = Math.min(previewSize.w / naturalSize.w, previewSize.h / naturalSize.h)
    const dispW = naturalSize.w * s
    const dispH = naturalSize.h * s
    const bboxW = dispW * cos + dispH * sin
    const bboxH = dispW * sin + dispH * cos
    const f = Math.max(bboxW / previewSize.w, bboxH / previewSize.h)
    return f > 0 ? Math.min(1, 1 / f) : 1
  })()

  const modeTabs: { key: EditMode; label: string; icon: typeof CropIcon }[] = [
    { key: "rotate", label: "Rotate", icon: RotateCcw },
    { key: "crop", label: "Crop", icon: CropIcon },
    { key: "adjust", label: "Adjust", icon: Sliders },
    { key: "annotate", label: "Draw", icon: Paintbrush },
  ]

  return (
    <div className="flex-1 min-h-0 relative flex flex-col">
      {isFabricMode ? (
        <ImageFabricEditor ref={fabricRef} imageUrl={imageUrl} mode={mode as "adjust" | "annotate"} />
      ) : mode === "crop" ? (
        <div ref={cropContainerRef} className="relative flex-1 min-h-0 bg-black/5">
          <Cropper
            image={imageUrl}
            crop={cropPos}
            zoom={zoom}
            rotation={rotation}
            minZoom={MIN_ZOOM}
            maxZoom={3}
            restrictPosition={false}
            onCropChange={setCropPos}
            onCropComplete={(_, px) => setCropPixels(px)}
            onZoomChange={setZoom}
            onMediaLoaded={(m) => {
              setMediaSize({ w: m.naturalWidth, h: m.naturalHeight })
              fitFull(rotation)
            }}
          />
        </div>
      ) : (
        <div ref={previewRef} className="relative flex-1 min-h-0 overflow-hidden flex items-center justify-center p-2 sm:p-4 bg-black/5">
          <img
            src={imageUrl}
            alt="preview"
            draggable={false}
            onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg select-none"
            style={{ transform: `rotate(${rotation}deg) scale(${previewScale})` }}
          />
        </div>
      )}

      {mode === "crop" && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-border/10 shrink-0">
          <ZoomOut className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input type="range" min={MIN_ZOOM} max={3} step={0.05} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1 accent-primary" />
          <ZoomIn className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] font-bold text-muted-foreground min-w-[3.5ch] text-center">{Math.round(zoom * 100)}%</span>
        </div>
      )}

      {mode === "rotate" && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-border/10 shrink-0">
          <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold" onClick={() => rotate(-90)}>
            <RotateCcw className="h-3 w-3 mr-1" /> Rotate Left
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold" onClick={() => rotate(90)}>
            <RotateCw className="h-3 w-3 mr-1" /> Rotate Right
          </Button>
        </div>
      )}

      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border/10 shrink-0 bg-background overflow-x-auto">
        {modeTabs.map(({ key, label, icon: Icon }) => (
          <Button key={key} variant={mode === key ? "default" : "ghost"} size="sm"
            className="h-7 text-[10px] font-bold whitespace-nowrap" onClick={() => setMode(key)}>
            <Icon className="h-3 w-3 mr-1" /> {label}
          </Button>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-border/10 shrink-0 bg-background">
        <Button variant="ghost" size="sm" className="h-8 text-xs font-bold" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button size="sm" className="h-8 text-xs font-bold" onClick={handleSave}
          disabled={isSaving || (mode === "crop" && !cropPixels)}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          Save
        </Button>
      </div>
    </div>
  )
}
