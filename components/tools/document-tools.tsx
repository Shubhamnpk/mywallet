"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import {
  FileText, Shield, Upload, Search, Plus, User, X, Camera, Image,
  Download, Trash2, ChevronLeft, ZoomIn, ZoomOut, Tag, Calendar,
  HardDrive, FileImage, File, AlertTriangle, MoreHorizontal,
  Check, Loader2, FileUp, ArrowUpFromLine, ExternalLink, Crop,
  MoreVertical, Pencil, Eye, RotateCw, Users, Layers,
} from "lucide-react"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { SearchableCombobox } from "@/components/ui/searchable-combobox"
import { cn } from "@/lib/utils"
import {
  type Person,
  type StoredDocument,
  getPersons,
  savePerson,
  deletePerson,
  getDocuments,
  saveDocument,
  getDocumentBlob,
  getDocumentThumbnail,
  deleteDocument,
  searchDocuments,
  generateThumbnail,
  formatFileSize,
  PERSON_EMOJIS,
  generateId,
  updateDocumentMeta,
  downloadDocument,
} from "@/lib/document-storage"
import { UploadDialog } from "./upload-dialog"
import { DocumentViewer } from "./document-viewer"
import { PersonDialog } from "./person-dialog"
import { FileIcon, DOCUMENT_TYPES } from "./document-utils"
import { useWalletData } from "@/contexts/wallet-data-context"

export function DocumentTools() {
  const { userProfile, updateUserProfile } = useWalletData()
  const [persons, setPersons] = useState<Person[]>([])
  const [currentPersonId, setCurrentPersonId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showPersonDialog, setShowPersonDialog] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [viewDocId, setViewDocId] = useState<string | null>(null)
  const [editingDoc, setEditingDoc] = useState<StoredDocument | null>(null)
  const [showEditDoc, setShowEditDoc] = useState(false)

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      const allPersons = await getPersons()
      if (allPersons.length === 0 && userProfile?.name?.trim()) {
        const autoPerson: Person = {
          id: generateId(),
          name: userProfile.name.trim(),
          emoji: PERSON_EMOJIS[0],
          createdAt: new Date().toISOString(),
        }
        await savePerson(autoPerson)
        setPersons([autoPerson])
        setCurrentPersonId(autoPerson.id)
      } else {
        setPersons(allPersons)
        if (allPersons.length === 1) {
          setCurrentPersonId(allPersons[0].id)
        }
      }
      setIsLoading(false)
    }
    init()
  }, [userProfile?.name])

  const reloadDocuments = useCallback(async (personId: string | null) => {
    const docs = await getDocuments(personId ?? undefined)
    setDocuments(docs)
  }, [])

  useEffect(() => {
    reloadDocuments(currentPersonId)
  }, [currentPersonId, reloadDocuments])

  const personNameById = useMemo(() => {
    const m = new Map<string, string>()
    persons.forEach((p) => m.set(p.id, p.name.toLowerCase()))
    return m
  }, [persons])

  const filteredDocs = useMemo(() => {
    const base = currentPersonId
      ? documents.filter((d) => d.personId === currentPersonId)
      : documents
    const q = searchQuery.trim().toLowerCase()
    if (!q) return base
    return base.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)) ||
        d.metadata?.notes?.toLowerCase().includes(q) ||
        (personNameById.get(d.personId)?.includes(q) ?? false),
    )
  }, [documents, currentPersonId, searchQuery, personNameById])

  const currentPerson = persons.find((p) => p.id === currentPersonId)
  const hasMultiplePersons = persons.length > 1

  const handlePersonCreated = useCallback(async () => {
    const allPersons = await getPersons()
    setPersons(allPersons)
    if (allPersons.length === 1) setCurrentPersonId(allPersons[0].id)
  }, [])

  const handleDeletePerson = useCallback(async (personId: string) => {
    const { deletedDocCount } = await deletePerson(personId)
    const remaining = await getPersons()
    setPersons(remaining)
    const nextId = currentPersonId === personId
      ? (remaining.length === 1 ? remaining[0].id : null)
      : currentPersonId
    setCurrentPersonId(nextId)
    const docs = await getDocuments(nextId ?? undefined)
    setDocuments(docs)
    toast(`${deletedDocCount} document${deletedDocCount !== 1 ? "s" : ""} deleted with person`)
  }, [currentPersonId])

  const handleDocUploaded = useCallback(async () => {
    setShowUploadDialog(false)
    const docs = await getDocuments(currentPersonId ?? undefined)
    setDocuments(docs)
  }, [currentPersonId])

  const handleDocUpdated = useCallback(async () => {
    const docs = await getDocuments(currentPersonId ?? undefined)
    setDocuments(docs)
  }, [currentPersonId])

  const handleEditDoc = useCallback((doc: StoredDocument) => {
    setEditingDoc(doc)
    setShowEditDoc(true)
  }, [])

  const handleDeleteDoc = useCallback(async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteDocument(docId)
    const docs = await getDocuments(currentPersonId ?? undefined)
    setDocuments(docs)
    if (viewDocId === docId) setViewDocId(null)
    toast("Document deleted")
  }, [currentPersonId, viewDocId])

  return (
    <>
      {!userProfile?.settings?.documentVaultEnabled ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="relative mb-6">
            <div className="absolute -inset-4 rounded-full bg-primary/5 blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/5">
              <FileText className="h-9 w-9 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-black uppercase tracking-widest mb-2">Document Vault <Badge variant="secondary" className="text-[10px] ml-1 align-middle">Beta</Badge></h3>
          <p className="text-sm text-muted-foreground max-w-md mb-2">
            Store, view, and manage important documents which are encrypted and secure.
          </p>
          <Button onClick={() => updateUserProfile({ settings: { ...(userProfile?.settings || {}), documentVaultEnabled: true } })}>
            <Shield className="h-4 w-4 mr-2" />
            Enable Document Vault
          </Button>
        </div>
      ) : isLoading ? (
        <CardContent className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading vault...
          </div>
        </CardContent>
      ) : persons.length === 0 ? (
        <CardContent className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="relative mb-6">
            <div className="absolute -inset-4 rounded-full bg-primary/5 blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/5">
              <FileText className="h-9 w-9 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-black uppercase tracking-widest mb-2">Welcome to Document Vault <Badge variant="secondary" className="text-[10px] ml-1 align-middle">Beta</Badge></h3>
          <p className="text-sm text-muted-foreground max-w-md mb-8">
            Store, view, and manage documents for yourself and others.
          </p>
          <Button onClick={() => { setEditingPerson(null); setShowPersonDialog(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Person
          </Button>
        </CardContent>
      ) : (
        <>
          <CardHeader className="pb-2 px-3 sm:px-4 pt-3 border-b border-border/10">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-wrap">
                <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Document Vault
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">Beta</Badge>
                </CardTitle>
                {currentPerson && (
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 gap-1 shrink-0">
                    {currentPerson.emoji} {currentPerson.name}
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] font-black uppercase tracking-wider shrink-0"
                onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </Button>
            </div>

            {hasMultiplePersons && (
              <div className="mt-2.5">
                <PersonSelector
                  persons={persons}
                  documents={documents}
                  currentPersonId={currentPersonId}
                  showSelector={hasMultiplePersons}
                  onSelect={(id) => setCurrentPersonId(id)}
                  onSelectAll={() => setCurrentPersonId(null)}
                  onEdit={(p) => { setEditingPerson(p); setShowPersonDialog(true) }}
                  onDelete={(id) => handleDeletePerson(id)}
                />
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <DocumentDashboard
              person={currentPerson ?? undefined}
              persons={persons}
              documents={filteredDocs}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onUpload={() => setShowUploadDialog(true)}
              onViewDoc={setViewDocId}
              onDeleteDoc={handleDeleteDoc}
              onEditDoc={handleEditDoc}
                onDownloadDoc={downloadDocument}
                onDownloadPageDoc={(doc, i) => downloadDocument(doc, [i])}
                onPersonClick={(id) => setCurrentPersonId(id)}
              />
          </CardContent>
        </>
      )}

      <UploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        persons={persons}
        selectedPersonId={currentPersonId}
        onUploaded={handleDocUploaded}
      />

      <DocumentViewer
        docId={viewDocId}
        onClose={() => setViewDocId(null)}
        persons={persons}
        onDocumentUpdated={handleDocUpdated}
      />

      <PersonDialog
        open={showPersonDialog}
        onOpenChange={setShowPersonDialog}
        editPerson={editingPerson}
        onSaved={handlePersonCreated}
      />

      <DocumentEditDialog
        doc={editingDoc}
        persons={persons}
        open={showEditDoc}
        onOpenChange={setShowEditDoc}
        onSaved={handleDocUpdated}
      />
    </>
  )
}

function PersonSelector({ persons, documents, currentPersonId, showSelector, onSelect, onSelectAll, onEdit, onDelete }: {
  persons: Person[]
  documents: StoredDocument[]
  currentPersonId: string | null
  showSelector: boolean
  onSelect: (id: string) => void
  onSelectAll: () => void
  onEdit: (person: Person) => void
  onDelete: (id: string) => void
}) {
  return (
    <section className="space-y-1.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 shrink-0" /> Person Selector
      </p>
      <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
        {showSelector && (
          <>
            <div className="relative shrink-0 snap-start">
              <button
                type="button"
                onClick={onSelectAll}
                title="View all documents"
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-2.5 py-2 w-32 text-left transition-all",
                  !currentPersonId ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30" : "border-border/30 bg-muted/5 hover:bg-muted/15 hover:border-primary/30"
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/30 bg-background text-primary shrink-0">
                  <Layers className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold leading-tight truncate">All Documents</p>
                  <p className="text-[9px] text-muted-foreground">{documents.length} total</p>
                </div>
              </button>
            </div>
            {persons.map((p) => {
              const count = documents.filter((d) => d.personId === p.id).length
              const active = currentPersonId === p.id
              return (
                <div key={p.id} className="group relative shrink-0 snap-start">
                  <button
                    type="button"
                    onClick={() => onSelect(p.id)}
                    title={`View ${p.name}'s documents`}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-2.5 py-2 w-36 text-left transition-all",
                      active ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30" : "border-border/30 bg-muted/5 hover:bg-muted/15 hover:border-primary/30"
                    )}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/30 bg-background text-lg shrink-0">
                      {p.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold leading-tight truncate">{p.name}</p>
                      <p className="text-[9px] text-muted-foreground">{count} doc{count !== 1 ? "s" : ""}</p>
                    </div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        title={`Options for ${p.name}`}
                        className="absolute top-1 right-1 h-5 w-5 rounded-md bg-background/80 border border-border/30 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-muted"
                        aria-label={`Options for ${p.name}`}
                      >
                        <MoreVertical className="h-3 w-3 text-foreground/70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(p) }}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(e) => { e.stopPropagation(); onDelete(p.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </>
        )}
      </div>
    </section>
  )
}

function DocumentDashboard({
  person,
  persons,
  documents,
  searchQuery,
  onSearchChange,
  onUpload,
  onViewDoc,
  onDeleteDoc,
  onEditDoc,
  onDownloadDoc,
  onDownloadPageDoc,
  onPersonClick,
}: {
  person?: Person
  persons: Person[]
  documents: StoredDocument[]
  searchQuery: string
  onSearchChange: (v: string) => void
  onUpload: () => void
  onViewDoc: (id: string) => void
  onDeleteDoc: (id: string, e: React.MouseEvent) => void
  onEditDoc: (doc: StoredDocument) => void
  onDownloadDoc: (doc: StoredDocument) => Promise<void>
  onDownloadPageDoc: (doc: StoredDocument, index: number) => void
  onPersonClick?: (id: string) => void
}) {
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            placeholder="Search documents, tags, or a person…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-9 pr-8 text-xs rounded-full bg-muted/40 border-border/30 focus-visible:bg-background focus-visible:border-primary/40 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-muted-foreground/15 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/25 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-muted-foreground">{documents.length} document{documents.length !== 1 ? "s" : ""}</span>
          {documents.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60">
              · {formatFileSize(documents.reduce((s, d) => s + d.size, 0))} total
            </span>
          )}
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-border/40 bg-muted/10 mb-4">
            <FileUp className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-bold text-muted-foreground mb-1">
            {searchQuery ? "No matching documents" : "No documents yet"}
          </p>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs">
            {searchQuery
              ? "Try a different search term"
              : person
                ? `Upload documents, images, or PDFs for ${person.name}`
                : "Upload documents, images, or PDFs for anyone"}
          </p>
          {!searchQuery && (
            <Button size="sm" className="h-8 text-xs" onClick={onUpload}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload Document
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              person={persons.find((p) => p.id === doc.personId)}
              onPersonClick={onPersonClick}
              onClick={() => onViewDoc(doc.id)}
              onDelete={(e) => onDeleteDoc(doc.id, e)}
              onEdit={() => onEditDoc(doc)}
              onDownload={() => onDownloadDoc(doc)}
              onDownloadPage={(i) => onDownloadPageDoc(doc, i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentCard({ doc, person, onPersonClick, onClick, onDelete, onEdit, onDownload, onDownloadPage }: {
  doc: StoredDocument
  person?: Person
  onPersonClick?: (id: string) => void
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
  onEdit: () => void
  onDownload: () => void
  onDownloadPage: (index: number) => void
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [backUrl, setBackUrl] = useState<string | null>(null)
  const [flipped, setFlipped] = useState(false)
  const isImage = doc.mimeType.startsWith("image/")
  const hasThumb = !!doc.metadata?.hasThumbnail
  const hasBack = !!(doc.pages && doc.pages.length > 1 && doc.pages[1]?.hasThumbnail)

  useEffect(() => {
    if (!hasThumb) {
      setThumbUrl(null)
      setBackUrl(null)
      return
    }
    let front: string | null = null
    let back: string | null = null
    let cancelled = false
    const load = async () => {
      const f = await getDocumentThumbnail(doc.id)
      if (cancelled) return
      if (f) { front = URL.createObjectURL(f); setThumbUrl(front) }
      if (hasBack) {
        const b = await getDocumentThumbnail(doc.id, doc.pages![1].id)
        if (cancelled) return
        if (b) { back = URL.createObjectURL(b); setBackUrl(back) }
      }
    }
    load().catch(() => {})
    return () => {
      cancelled = true
      if (front) URL.revokeObjectURL(front)
      if (back) URL.revokeObjectURL(back)
    }
  }, [doc, isImage, hasBack])

  const typeLabel = doc.mimeType.startsWith("image/") ? "Image"
    : doc.mimeType === "application/pdf" ? "PDF"
    : doc.mimeType === "text/plain" ? "Note"
    : "Document"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick() } }}
      onMouseEnter={() => hasBack && setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      className="group relative flex flex-col rounded-xl border border-border/30 bg-muted/5 hover:bg-muted/15 hover:border-primary/30 transition-all text-left overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <div className="absolute top-1.5 right-1.5 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm border border-border/30 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-muted"
              aria-label="More options"
            >
              <MoreVertical className="h-3.5 w-3.5 text-foreground/70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick() }}>
              <Eye className="h-3.5 w-3.5" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
              <Pencil className="h-3.5 w-3.5" /> Edit details
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2 text-xs cursor-pointer outline-none">
                <Download className="h-3.5 w-3.5" /> Download
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload() }}>
                  <Download className="h-3.5 w-3.5" /> Download all{doc.pages && doc.pages.length > 1 ? ` (${doc.pages.length})` : ""}
                </DropdownMenuItem>
                {doc.pages && doc.pages.length > 1 && doc.pages.map((p, i) => (
                  <DropdownMenuItem key={p.id} onClick={(e) => { e.stopPropagation(); onDownloadPage(i) }}>
                    <Download className="h-3.5 w-3.5" /> Download {p.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(e) }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-center h-32 bg-gradient-to-b from-muted/10 to-muted/5 overflow-hidden relative">
        {hasBack && thumbUrl && backUrl ? (
          <div className="relative w-full h-full [perspective:1200px]">
            <div
              className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]"
              style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
            >
              <div className="absolute inset-0 [backface-visibility:hidden]">
                <img src={thumbUrl} alt={doc.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/15 via-white/10 to-transparent shadow-[inset_0_0_24px_rgba(0,0,0,0.25)]" />
              </div>
              <div className="absolute inset-0 [backface-visibility:hidden]" style={{ transform: "rotateY(180deg)" }}>
                <img src={backUrl} alt={`${doc.name} back`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/15 via-white/10 to-transparent shadow-[inset_0_0_24px_rgba(0,0,0,0.25)]" />
              </div>
            </div>
          </div>
        ) : thumbUrl ? (
          <img src={thumbUrl} alt={doc.name} className="w-full h-full object-cover" />
        ) : (
          <FileIcon type={doc.mimeType} size={36} />
        )}
        {doc.pages && doc.pages.length > 1 && (
          <span className="absolute bottom-1.5 left-1.5 text-[8px] font-black uppercase tracking-wider bg-background/85 backdrop-blur-sm border border-border/30 rounded-md px-1.5 py-0.5 text-primary">
            {doc.pages.length} sides
          </span>
        )}
        {hasBack && (
          <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 text-[8px] font-black uppercase tracking-wider bg-background/85 backdrop-blur-sm border border-border/30 rounded-md px-1.5 py-0.5 text-muted-foreground">
            <RotateCw className="h-2.5 w-2.5" /> Flip
          </span>
        )}
      </div>

      <div className="p-2 space-y-1 flex-1 flex flex-col min-w-0">
        <p className="text-[11px] font-bold leading-tight truncate">{doc.name}</p>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground min-w-0">
          {person && onPersonClick && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPersonClick(person.id) }}
              title={`View all documents for ${person.name}`}
              className="flex items-center gap-1 shrink-0 max-w-[60%] rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.5 font-bold text-primary truncate hover:bg-primary/20 transition-colors"
            >
              <span className="truncate">{person.name}</span>
            </button>
          )}
          <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-bold uppercase shrink-0">
            {typeLabel}
          </Badge>
          <span className="shrink-0">{formatFileSize(doc.size)}</span>
          <span className="truncate">· {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
        {doc.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {doc.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[8px] text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
            {doc.tags.length > 3 && (
              <span className="text-[8px] text-muted-foreground/40">+{doc.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DocumentEditDialog({ doc, persons, open, onOpenChange, onSaved }: {
  doc: StoredDocument | null
  persons: Person[]
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [personId, setPersonId] = useState("")
  const [personQuery, setPersonQuery] = useState("")
  const [typeKey, setTypeKey] = useState("other")
  const [tagsStr, setTagsStr] = useState("")
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && doc) {
      setName(doc.name)
      setPersonId(doc.personId)
      setPersonQuery(persons.find((p) => p.id === doc.personId)?.name ?? "")
      setTypeKey(doc.type ?? "other")
      setTagsStr(doc.tags.join(", "))
      setNotes(doc.metadata?.notes ?? "")
    }
  }, [open, doc, persons])

  const handleSave = async () => {
    if (!doc) return
    setIsSaving(true)
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
      await updateDocumentMeta(doc.id, {
        name: name.trim() || doc.name,
        personId: pid,
        type: typeKey === "auto" ? doc.type : typeKey,
        tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
        notes: notes.trim() || undefined,
      })
      toast.success("Details updated")
      onSaved()
      onOpenChange(false)
    } catch {
      toast.error("Failed to update document")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <Pencil className="h-4 w-4" /> Edit Document
          </DialogTitle>
          <DialogDescription className="text-xs">Update document information.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Person</label>
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

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Document Type</label>
            <select
              value={typeKey}
              onChange={(e) => setTypeKey(e.target.value)}
              className="w-full h-8 rounded-lg border border-border/40 bg-background px-2 text-xs font-bold"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}{t.faces === 2 ? " (2 sides)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Document Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
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
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={!name.trim() || !personQuery.trim() || isSaving}>
            {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
