"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import {
  Upload, Shield, Check, Loader2,
  ArrowUpFromLine, X, Layers, ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchableCombobox } from "@/components/ui/searchable-combobox"
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,} from "@/components/ui/dialog"

import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  type Person,
  type StoredDocument,
  saveDocument,
  savePerson,
  generateThumbnail,
  generatePdfThumbnail,
  generateId,
  type SavePage,
} from "@/lib/document-storage"
import { ACCEPTED_TYPES, DOCUMENT_TYPES, detectDocumentType } from "./document-utils"

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|bmp|pdf)$/i

export function UploadDialog({ open, onOpenChange, persons, selectedPersonId, onUploaded }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  persons: Person[]
  selectedPersonId: string | null
  onUploaded: (personId: string) => void
}) {
  const [personId, setPersonId] = useState(selectedPersonId || persons[0]?.id || "")
  const [name, setName] = useState("")
  const [nameFocused, setNameFocused] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [personQuery, setPersonQuery] = useState("")

  const nameSuggestions = useMemo(() => {
    const q = name.trim().toLowerCase()
    if (!q) return []
    return DOCUMENT_TYPES.filter(
      (t) => t.label.toLowerCase().includes(q) && t.label.toLowerCase() !== q,
    )
  }, [name])

  const [typeKey, setTypeKey] = useState<string>("auto")
  const [tagsStr, setTagsStr] = useState("")
  const [notes, setNotes] = useState("")
  const [faceFiles, setFaceFiles] = useState<(File | null)[]>([null, null])
  const [faceUrls, setFaceUrls] = useState<(string | null)[]>([null, null])
  const [isUploading, setIsUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragSlot, setDragSlot] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      const initialPersonId = selectedPersonId || persons[0]?.id || ""
      setPersonId(initialPersonId)
      setPersonQuery(persons.find((p) => p.id === initialPersonId)?.name ?? "")
      setName("")
      setTypeKey("auto")
      setTagsStr("")
      setNotes("")
      setFaceFiles([null, null])
      setFaceUrls([null, null])
      setIsUploading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedPersonId, persons])

  const detected = detectDocumentType(name)
  const effectiveType =
    typeKey === "auto"
      ? (detected ?? DOCUMENT_TYPES.find((t) => t.key === "other")!)
      : (DOCUMENT_TYPES.find((t) => t.key === typeKey) ?? DOCUMENT_TYPES.find((t) => t.key === "other")!)
  const faces = effectiveType.faces
  const faceLabels: string[] = effectiveType.faceLabels ?? ["Document"]

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Only images and PDFs are supported")
      return false
    }
    if (!ALLOWED_EXTENSIONS.test(file.name)) {
      toast.error("File extension not supported")
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large (max 50MB)")
      return false
    }
    return true
  }

  const setFace = useCallback((i: number, file: File | null) => {
    setFaceFiles((prev) => {
      const next = [...prev]
      next[i] = file
      return next
    })
    setFaceUrls((prev) => {
      const next = [...prev]
      if (next[i]) URL.revokeObjectURL(next[i]!)
      next[i] = file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null
      return next
    })
    if (file && !name.trim()) setName(file.name.replace(/\.[^.]+$/, ""))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  const handleFiles = useCallback((files: FileList | null, startSlot: number) => {
    if (!files || files.length === 0) return
    let slot = startSlot
    for (let fi = 0; fi < files.length && slot < faces; fi++, slot++) {
      if (validateFile(files[fi])) setFace(slot, files[fi])
    }
  }, [faces, setFace])

  const getBlobAndDoc = useCallback((): { doc: StoredDocument } | null => {
    const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
    const provided = faceFiles.slice(0, faces).filter(Boolean).length
    if (provided === 0) return null
    const doc: StoredDocument = {
      id: generateId(),
      personId,
      name: name.trim(),
      type: effectiveType.key,
      mimeType: "application/octet-stream",
      size: 0,
      tags,
      createdAt: new Date().toISOString(),
      metadata: { notes: notes.trim() || undefined },
    }
    return { doc }
  }, [personId, name, tagsStr, notes, faceFiles, faces, effectiveType])

  const handleUpload = async () => {
    const payload = getBlobAndDoc()
    if (!payload) { toast.error("Fill in all required fields"); return }
    setIsUploading(true)
    try {
      let pid = personId
      if (!pid) {
        const existing = persons.find((p) => p.name.toLowerCase() === personQuery.trim().toLowerCase())
        if (existing) {
          pid = existing.id
        } else {
          const np: Person = {
            id: generateId(),
            name: personQuery.trim(),
            emoji: "🧑",
            createdAt: new Date().toISOString(),
          }
          await savePerson(np)
          pid = np.id
        }
      }
      const pages: SavePage[] = []
      for (let i = 0; i < faces; i++) {
        const file = faceFiles[i]
        if (!file) continue
        const isImg = file.type.startsWith("image/")
        const isPdf = file.type === "application/pdf"
        let thumbnail: Blob | undefined
        if (isImg) {
          try { thumbnail = await generateThumbnail(file) } catch { /* no thumb */ }
        } else if (isPdf) {
          try { thumbnail = await generatePdfThumbnail(file) } catch { /* no thumb */ }
        }
        pages.push({ blob: file, thumbnail, label: faceLabels[i] ?? `Page ${i + 1}` })
      }
      await saveDocument({ ...payload.doc, personId: pid }, pages)
      toast.success(`"${payload.doc.name}" saved`)
      onUploaded(pid)
    } catch {
      toast.error("Failed to save document")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <Upload className="h-4 w-4" />
            Upload Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto px-1">
          <div className="space-y-1 relative">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Document Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setTimeout(() => setNameFocused(false), 120)}
              placeholder="e.g. Citizenship"
              className="h-8 text-xs"
            />
            {nameFocused && nameSuggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-border/40 bg-popover shadow-md overflow-hidden">
                {nameSuggestions.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setName(t.label)
                      if (t.key !== "auto") setTypeKey(t.key)
                      setNameFocused(false)
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60"
                  >
                    <span className="font-bold">{t.label}</span>
                    <span className="text-[9px] text-muted-foreground">{t.faces === 2 ? "2 sides" : "1 side"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Person Name *</label>
            <SearchableCombobox
              value={personQuery}
              onChange={(v) => {
                setPersonQuery(v)
                const match = persons.find((p) => p.name.toLowerCase() === v.trim().toLowerCase())
                setPersonId(match ? match.id : "")
              }}
              options={persons.map((p) => p.name)}
              placeholder="Search or type eg Emily, John Doe"
              allowCreate
              createText={(v) => `Create "${v}"`}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {faces === 2 ? "Front & Back" : "File"}
            </label>
              {Array.from({ length: faces }).map((_, i) => (
                <div key={i}>
                  <input ref={i === 0 ? fileInputRef : undefined} type="file" accept={ACCEPTED_TYPES} className="hidden"
                    onChange={(e) => { handleFiles(e.target.files, i); e.target.value = "" }} />
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragSlot(i); setDragOver(true) }}
                    onDragLeave={() => { setDragSlot(null); setDragOver(false) }}
                    onDrop={(e) => {
                      e.preventDefault(); setDragOver(false); setDragSlot(null)
                      handleFiles(e.dataTransfer.files, i)
                    }}
                    onClick={() => {
                      const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
                      inputs[i]?.click()
                    }}
                    className={cn("flex items-center gap-3 rounded-xl border-2 border-dashed p-3 cursor-pointer transition-colors",
                      dragOver && dragSlot === i ? "border-primary bg-primary/5" : "border-border/40 hover:border-border/60")}>
                    <div className="shrink-0 h-14 w-14 rounded-lg bg-muted/20 flex items-center justify-center overflow-hidden">
                      {faceUrls[i] ? (
                        <img src={faceUrls[i]!} alt={faceLabels[i]} className="h-full w-full object-cover" />
                      ) : (
                        <ArrowUpFromLine className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold">{faceLabels[i] ?? `Page ${i + 1}`}</p>
                      <p className="text-[10px] text-muted-foreground/70 truncate">
                        {faceFiles[i] ? faceFiles[i]!.name : `Click or drop to add ${faceLabels[i] ?? `page ${i + 1}`}`}
                      </p>
                    </div>
                    {faceFiles[i] && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setFace(i, null) }}
                        className="ml-auto h-6 w-6 rounded-full bg-background/80 border border-border/30 flex items-center justify-center hover:bg-destructive/10"
                        aria-label="Remove"
                      >
                        <X className="h-3 w-3 text-destructive/70" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground/60">
                {faces === 2
                  ? "Add both sides — or just one if you don't have the other yet."
                  : "Tip: editing (rotate/crop) happens after upload in the viewer."}
              </p>
            </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tags (comma separated)</label>
            <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="e.g. identity, passport, important" className="h-8 text-xs" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this document..."
              rows={2}
              className="w-full rounded-lg border border-border/40 bg-background px-2.5 py-1.5 text-xs resize-none"
            />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-border/30 bg-muted/10 px-3 py-2"
            >
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAdvanced && "rotate-180")} />
                Advanced
              </span>
              <span className="text-[9px] font-bold text-muted-foreground/70 truncate max-w-[55%]">
                {persons.length > 0 && personQuery.trim() ? `${personQuery.trim()} · ` : ""}
                {typeKey === "auto" ? "Auto-detect" : (DOCUMENT_TYPES.find((t) => t.key === typeKey)?.label ?? typeKey)}
              </span>
            </button>
            {showAdvanced && (
              <div className="space-y-3 pl-1">
                {persons.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Person *</label>
                    <SearchableCombobox
                      value={personQuery}
                      onChange={(v) => {
                        setPersonQuery(v)
                        const match = persons.find((p) => p.name.toLowerCase() === v.trim().toLowerCase())
                        setPersonId(match ? match.id : "")
                      }}
                      options={persons.map((p) => p.name)}
                      placeholder="Search or type a new name"
                      allowCreate
                      createText={(v) => `Create "${v}"`}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Document Type</label>
                    <select
                      value={typeKey}
                      onChange={(e) => setTypeKey(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border/40 bg-background px-2 text-xs font-bold"
                    >
                      <option value="auto">
                        Auto-detect{name && detected ? ` — ${detected.label}${detected.faces === 2 ? " (2 sides)" : ""}` : ""}
                      </option>
                      {DOCUMENT_TYPES.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}{t.faces === 2 ? " (2 sides)" : ""}
                        </option>
                      ))}
                    </select>
                    {detected && typeKey === "auto" && (
                      <p className="text-[10px] text-primary/80 font-bold flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        Detected {detected.label} — {faces === 2 ? "add front & back" : "single page"}
                      </p>
                    )}
                  </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs"
            onClick={handleUpload}
            disabled={
              !personQuery.trim() ||
              !name.trim() ||
              isUploading ||
              faceFiles.slice(0, faces).filter(Boolean).length === 0
            }>
            {isUploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Shield className="h-3 w-3 mr-1" />}
            {isUploading ? "Encrypting..." : "Encrypt & Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
