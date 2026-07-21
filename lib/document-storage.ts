"use client"

import { pdfjs } from "react-pdf"
import { SecureWallet } from "./security"
import { SecureKeyManager } from "./key-manager"
import { loadFromLocalStorage, saveToLocalStorage } from "./storage"

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

export interface Person {
  id: string
  name: string
  emoji: string
  createdAt: string
}

export interface DocumentMetadata {
  hasThumbnail?: boolean
  notes?: string
  expiresAt?: string
}

export interface DocumentPage {
  id: string
  label: string
  mimeType: string
  size: number
  hasThumbnail: boolean
}

export interface StoredDocument {
  id: string
  personId: string
  name: string
  type?: string
  mimeType: string
  size: number
  tags: string[]
  createdAt: string
  metadata?: DocumentMetadata
  pages?: DocumentPage[]
}

export interface SavePage {
  blob: Blob
  thumbnail?: Blob
  label: string
}

export interface DocumentMetaUpdate {
  name?: string
  personId?: string
  type?: string
  tags?: string[]
  notes?: string
}

export async function updateDocumentMeta(docId: string, updates: DocumentMetaUpdate): Promise<void> {
  const manifest = await getManifest()
  const idx = manifest.findIndex((d) => d.id === docId)
  if (idx < 0) return
  const doc = manifest[idx]
  manifest[idx] = {
    ...doc,
    name: updates.name ?? doc.name,
    personId: updates.personId ?? doc.personId,
    type: updates.type ?? doc.type,
    tags: updates.tags ?? doc.tags,
    metadata: {
      ...doc.metadata,
      notes: updates.notes !== undefined ? updates.notes : doc.metadata?.notes,
    },
  }
  await saveManifest(manifest)
}

export async function downloadDocument(doc: StoredDocument, pageIndices?: number[]): Promise<void> {
  const all = doc.pages?.length
    ? doc.pages
    : [{ id: doc.id, label: "Document", mimeType: doc.mimeType, size: doc.size, hasThumbnail: false }]
  const indices = pageIndices && pageIndices.length ? pageIndices : all.map((_, i) => i)
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k]
    const p = all[i]
    if (!p) continue
    const blob = await getDocumentBlob(doc.id, p.id)
    if (!blob) continue
    const url = URL.createObjectURL(blob)
    setTimeout(() => {
      const a = document.createElement("a")
      a.href = url
      const ext = p.mimeType.includes("pdf") ? "pdf" : "jpg"
      a.download = `${doc.name}${all.length > 1 ? ` - ${p.label}` : ""}.${ext}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, k * 400)
  }
}

const PERSONS_KEY = "documents_persons"
const MANIFEST_KEY = "documents_manifest"

const DB_NAME = "wallet_documents"
const DB_VERSION = 1
const BLOB_STORE = "blobs"
const THUMB_STORE = "thumbnails"

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE)
      if (!db.objectStoreNames.contains(THUMB_STORE)) db.createObjectStore(THUMB_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getEncryptionKey(): Promise<CryptoKey | null> {
  try {
    const key = await SecureKeyManager.getMasterKey("")
    if (key) return key
    return await SecureKeyManager.getDefaultEncryptionKey()
  } catch {
    return null
  }
}

async function getStored<T>(key: string): Promise<T[]> {
  try {
    const data = await loadFromLocalStorage([key])
    return data[key] || []
  } catch {
    return []
  }
}

async function putStored<T>(key: string, data: T[]): Promise<void> {
  await saveToLocalStorage(key, data, true)
}

export async function getPersons(): Promise<Person[]> {
  return getStored<Person>(PERSONS_KEY)
}

export async function savePerson(person: Person): Promise<void> {
  const persons = await getPersons()
  const idx = persons.findIndex((p) => p.id === person.id)
  if (idx >= 0) persons[idx] = person
  else persons.push(person)
  await putStored(PERSONS_KEY, persons)
}

export async function deletePerson(personId: string): Promise<{ deletedDocCount: number }> {
  const persons = await getPersons()
  await putStored(PERSONS_KEY, persons.filter((p) => p.id !== personId))
  const manifest = await getManifest()
  const remaining = manifest.filter((d) => d.personId !== personId)
  const removed = manifest.filter((d) => d.personId === personId)
  await putStored(MANIFEST_KEY, remaining)
  const db = await openDB()
  const tx = db.transaction([BLOB_STORE, THUMB_STORE], "readwrite")
  for (const doc of removed) {
    tx.objectStore(BLOB_STORE).delete(doc.id)
    if (doc.metadata?.hasThumbnail) tx.objectStore(THUMB_STORE).delete(doc.id)
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return { deletedDocCount: removed.length }
}

async function getManifest(): Promise<StoredDocument[]> {
  return getStored<StoredDocument>(MANIFEST_KEY)
}

async function saveManifest(manifest: StoredDocument[]): Promise<void> {
  await putStored(MANIFEST_KEY, manifest)
}

export async function getDocuments(personId?: string): Promise<StoredDocument[]> {
  const manifest = await getManifest()
  const filtered = personId ? manifest.filter((d) => d.personId === personId) : manifest
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function readStore(storeName: string, key: string, mimeType: string): Promise<Blob | null> {
  const encKey = await getEncryptionKey()
  if (!encKey) return null

  const db = await openDB()
  const tx = db.transaction(storeName, "readonly")
  const request = tx.objectStore(storeName).get(key)
  const encrypted = await new Promise<string | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as string | undefined)
    request.onerror = () => reject(request.error)
  })
  if (!encrypted) return null

  const decrypted = await SecureWallet.decryptData(encrypted, encKey)
  const isThumb = storeName === THUMB_STORE
  return base64ToBlob(decrypted, isThumb ? "image/jpeg" : mimeType)
}

export async function saveDocument(doc: StoredDocument, pages: SavePage[]): Promise<void> {
  const key = await getEncryptionKey()
  if (!key) throw new Error("No encryption key available")

  const pagesMeta: DocumentPage[] = []
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    const pageId = `p${i}`
    const db = await openDB()

    const base64 = await blobToBase64(p.blob)
    const encrypted = await SecureWallet.encryptData(base64, key)
    const blobTx = db.transaction(BLOB_STORE, "readwrite")
    blobTx.objectStore(BLOB_STORE).put(encrypted, `${doc.id}::${pageId}`)
    await txDone(blobTx)

    let hasThumbnail = false
    if (p.thumbnail) {
      const thumbBase64 = await blobToBase64(p.thumbnail)
      const encryptedThumb = await SecureWallet.encryptData(thumbBase64, key)
      const thumbTx = db.transaction(THUMB_STORE, "readwrite")
      thumbTx.objectStore(THUMB_STORE).put(encryptedThumb, `${doc.id}::${pageId}`)
      await txDone(thumbTx)
      hasThumbnail = true
    }

    pagesMeta.push({
      id: pageId,
      label: p.label,
      mimeType: p.blob.type,
      size: p.blob.size,
      hasThumbnail,
    })
  }

  doc.pages = pagesMeta
  doc.mimeType = pagesMeta[0].mimeType
  doc.size = pagesMeta.reduce((s, p) => s + p.size, 0)

  const manifest = await getManifest()
  manifest.push({ ...doc, metadata: { ...doc.metadata, hasThumbnail: pagesMeta[0].hasThumbnail } })
  await saveManifest(manifest)
}

export function getDocumentBlob(docId: string, pageId?: string): Promise<Blob | null> {
  const resolve = async (): Promise<Blob | null> => {
    const manifest = await getManifest()
    const doc = manifest.find((d) => d.id === docId)
    if (!doc) return null
    const pages = doc.pages
    if (pages && pages.length) {
      const page = pageId ? pages.find((p) => p.id === pageId) ?? pages[0] : pages[0]
      return readStore(BLOB_STORE, `${docId}::${page.id}`, page.mimeType)
    }
    return readStore(BLOB_STORE, docId, doc.mimeType)
  }
  return resolve()
}

export function getDocumentThumbnail(docId: string, pageId?: string): Promise<Blob | null> {
  const resolve = async (): Promise<Blob | null> => {
    const manifest = await getManifest()
    const doc = manifest.find((d) => d.id === docId)
    if (!doc) return null
    const pages = doc.pages
    if (pages && pages.length) {
      const page = pageId ? pages.find((p) => p.id === pageId) ?? pages[0] : pages[0]
      return readStore(THUMB_STORE, `${docId}::${page.id}`, "image/jpeg")
    }
    return readStore(THUMB_STORE, docId, "image/jpeg")
  }
  return resolve()
}

export async function updateDocumentBlob(
  docId: string,
  pageId: string,
  newBlob: Blob,
  newThumbnail?: Blob,
): Promise<void> {
  const key = await getEncryptionKey()
  if (!key) throw new Error("No encryption key available")

  const base64 = await blobToBase64(newBlob)
  const encrypted = await SecureWallet.encryptData(base64, key)

  const db = await openDB()
  const blobTx = db.transaction(BLOB_STORE, "readwrite")
  blobTx.objectStore(BLOB_STORE).put(encrypted, `${docId}::${pageId}`)
  await txDone(blobTx)

  let hasThumbnail = false
  if (newThumbnail) {
    const thumbBase64 = await blobToBase64(newThumbnail)
    const encryptedThumb = await SecureWallet.encryptData(thumbBase64, key)
    const thumbTx = db.transaction(THUMB_STORE, "readwrite")
    thumbTx.objectStore(THUMB_STORE).put(encryptedThumb, `${docId}::${pageId}`)
    await txDone(thumbTx)
    hasThumbnail = true
  }

  const manifest = await getManifest()
  const idx = manifest.findIndex((d) => d.id === docId)
  if (idx >= 0) {
    const doc = manifest[idx]
    const existingPages =
      doc.pages && doc.pages.length
        ? doc.pages
        : [{ id: doc.id, label: "Document", mimeType: doc.mimeType, size: doc.size, hasThumbnail: !!doc.metadata?.hasThumbnail }]
    const pages = existingPages.map((p) =>
      p.id === pageId
        ? { ...p, mimeType: newBlob.type, size: newBlob.size, hasThumbnail }
        : p,
    )
    const firstHasThumb = pages[0].hasThumbnail
    manifest[idx] = {
      ...doc,
      size: pages.reduce((s, p) => s + p.size, 0),
      mimeType: pages.find((p) => p.id === pageId)?.mimeType ?? doc.mimeType,
      pages,
      metadata: { ...doc.metadata, hasThumbnail: firstHasThumb },
    }
    await saveManifest(manifest)
  }
}

export async function addDocumentPage(
  docId: string,
  page: DocumentPage,
  blob: Blob,
  thumbnail?: Blob,
): Promise<void> {
  const key = await getEncryptionKey()
  if (!key) throw new Error("No encryption key available")

  const base64 = await blobToBase64(blob)
  const encrypted = await SecureWallet.encryptData(base64, key)
  const db = await openDB()
  const blobTx = db.transaction(BLOB_STORE, "readwrite")
  blobTx.objectStore(BLOB_STORE).put(encrypted, `${docId}::${page.id}`)
  await txDone(blobTx)

  let hasThumbnail = false
  if (thumbnail) {
    const thumbBase64 = await blobToBase64(thumbnail)
    const encryptedThumb = await SecureWallet.encryptData(thumbBase64, key)
    const thumbTx = db.transaction(THUMB_STORE, "readwrite")
    thumbTx.objectStore(THUMB_STORE).put(encryptedThumb, `${docId}::${page.id}`)
    await txDone(thumbTx)
    hasThumbnail = true
  }

  const manifest = await getManifest()
  const idx = manifest.findIndex((d) => d.id === docId)
  if (idx < 0) return
  const doc = manifest[idx]

  let existingPages: DocumentPage[]
  if (doc.pages && doc.pages.length) {
    existingPages = doc.pages
  } else {
    existingPages = [
      { id: doc.id, label: "Front", mimeType: doc.mimeType, size: doc.size, hasThumbnail: !!doc.metadata?.hasThumbnail },
    ]
    const legacyBlob = await readStore(BLOB_STORE, docId, doc.mimeType)
    if (legacyBlob) {
      const b64 = await blobToBase64(legacyBlob)
      const enc = await SecureWallet.encryptData(b64, key)
      const t = db.transaction(BLOB_STORE, "readwrite")
      t.objectStore(BLOB_STORE).put(enc, `${docId}::${doc.id}`)
      await txDone(t)
    }
    if (doc.metadata?.hasThumbnail) {
      const legacyThumb = await readStore(THUMB_STORE, docId, "image/jpeg")
      if (legacyThumb) {
        const b64 = await blobToBase64(legacyThumb)
        const enc = await SecureWallet.encryptData(b64, key)
        const t = db.transaction(THUMB_STORE, "readwrite")
        t.objectStore(THUMB_STORE).put(enc, `${docId}::${doc.id}`)
        await txDone(t)
      }
    }
  }

  const pages = [...existingPages, page]
  manifest[idx] = {
    ...doc,
    size: pages.reduce((s, p) => s + p.size, 0),
    mimeType: pages[0].mimeType,
    pages,
    metadata: { ...doc.metadata, hasThumbnail: pages[0].hasThumbnail },
  }
  await saveManifest(manifest)
}

export async function deleteDocument(docId: string): Promise<void> {
  const manifest = await getManifest()
  const doc = manifest.find((d) => d.id === docId)
  await saveManifest(manifest.filter((d) => d.id !== docId))
  const db = await openDB()
  const tx = db.transaction([BLOB_STORE, THUMB_STORE], "readwrite")
  if (doc?.pages?.length) {
    for (const p of doc.pages) {
      tx.objectStore(BLOB_STORE).delete(`${docId}::${p.id}`)
      if (p.hasThumbnail) tx.objectStore(THUMB_STORE).delete(`${docId}::${p.id}`)
    }
  } else {
    tx.objectStore(BLOB_STORE).delete(docId)
    if (doc?.metadata?.hasThumbnail) tx.objectStore(THUMB_STORE).delete(docId)
  }
  await txDone(tx)
}

export async function searchDocuments(
  query: string,
  personId?: string,
): Promise<StoredDocument[]> {
  const docs = await getDocuments(personId)
  const lower = query.toLowerCase()
  return docs.filter(
    (d) =>
      d.name.toLowerCase().includes(lower) ||
      d.tags.some((t) => t.toLowerCase().includes(lower)) ||
      d.metadata?.notes?.toLowerCase().includes(lower),
  )
}

export async function generateThumbnail(blob: Blob, maxSize = 300): Promise<Blob> {
  if (!blob.type.startsWith("image/")) throw new Error("Thumbnails only for images")

  const img = await createImageBitmap(blob, { resizeWidth: maxSize, resizeQuality: "high" })
  const canvas = document.createElement("canvas")
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas context unavailable")
  ctx.drawImage(img, 0, 0)
  img.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Thumbnail generation failed"))), "image/jpeg", 0.7)
  })
}

/** Render a page of a PDF to a small JPEG thumbnail (used for document grid previews). */
export async function generatePdfThumbnail(blob: Blob, pageNumber = 1, maxSize = 300): Promise<Blob> {
  const data = await blob.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise
  try {
    const page = await pdf.getPage(pageNumber)
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(maxSize / base.width, maxSize / base.height, 2)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement("canvas")
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas context unavailable")
    await page.render({ canvas, viewport }).promise
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.7),
    )
    if (!out) throw new Error("PDF thumbnail generation failed")
    return out
  } finally {
    await pdf.destroy()
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const PERSON_EMOJIS = ["👤", "👩", "👨", "👧", "👦", "👶", "👴", "👵", "👨‍👩‍👧‍👦", "🧑"] as const

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        const base64 = reader.result.split(",")[1] || reader.result
        resolve(base64)
      } else reject(new Error("Failed to read blob"))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
