import { FileText, Image, File, CreditCard, BookOpen, FileBadge, Award, Baby, Fingerprint, Pen, Landmark, IdCard } from "lucide-react"
import { type Area } from "react-easy-crop"
import type { LucideIcon } from "lucide-react"

export const ACCEPTED_TYPES = "image/*,.pdf"

export interface DocumentType {
  key: string
  label: string
  faces: number
  faceLabels?: [string, string]
  icon: LucideIcon
  keywords: string[]
}

export const DOCUMENT_TYPES: DocumentType[] = [
  { key: "citizenship", label: "Citizenship", faces: 2, faceLabels: ["Front", "Back"], icon: BookOpen, keywords: ["citizenship", "nagrikta", "citizen"] },
  { key: "passport", label: "Passport", faces: 1, icon: FileBadge, keywords: ["passport", "travel"] },
  { key: "license", label: "Driver's License", faces: 2, faceLabels: ["Front", "Back"], icon: CreditCard, keywords: ["license", "driving", "driver", "sajilo"] },
  { key: "idcard", label: "ID Card", faces: 2, faceLabels: ["Front", "Back"], icon: CreditCard, keywords: ["id card", "idcard", "identity", "card"] },
  { key: "birth", label: "Birth Certificate", faces: 1, icon: Baby, keywords: ["birth", "janma", "certificate"] },
  { key: "certificate", label: "Certificate", faces: 1, icon: Award, keywords: ["certificate", "award", "diploma", "degree"] },
  { key: "ppsize", label: "PP Size Photo", faces: 1, icon: Image, keywords: ["pp size", "passport size", "photo", "pp"] },
  { key: "signature", label: "Signature", faces: 1, icon: Pen, keywords: ["signature", "sign", "autograph"] },
  { key: "thumbprint", label: "Thumbprint", faces: 1, icon: Fingerprint, keywords: ["thumbprint", "fingerprint", "thumb", "finger"] },
  { key: "voter", label: "Voter ID", faces: 2, faceLabels: ["Front", "Back"], icon: IdCard, keywords: ["voter", "voter id", "election", "matadata"] },
  { key: "pan", label: "PAN Card", faces: 1, icon: Landmark, keywords: ["pan", "tax", "pan card"] },
  { key: "other", label: "Other Document", faces: 1, icon: FileText, keywords: ["other", "document"] },
]

export function detectDocumentType(name: string): DocumentType | null {
  const n = name.toLowerCase()
  for (const t of DOCUMENT_TYPES) {
    if (t.keywords.some((k) => n.includes(k))) return t
  }
  return null
}

export function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img")
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function getCroppedBlob(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas context unavailable")

  const rad = (rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  const rotatedW = Math.round(pixelCrop.width * cos + pixelCrop.height * sin)
  const rotatedH = Math.round(pixelCrop.width * sin + pixelCrop.height * cos)

  canvas.width = rotatedW
  canvas.height = rotatedH

  ctx.translate(rotatedW / 2, rotatedH / 2)
  ctx.rotate(rad)
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    -pixelCrop.width / 2, -pixelCrop.height / 2, pixelCrop.width, pixelCrop.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Crop failed"))), "image/jpeg", 0.92)
  })
}

export function FileIcon({ type, size = 24 }: { type: string; size?: number }) {
  if (type === "application/pdf") return <FileText className="text-destructive/60" style={{ width: size, height: size }} />
  if (type.startsWith("image/")) return <Image className="text-primary/60" style={{ width: size, height: size }} />
  if (type === "text/plain") return <FileText className="text-blue-500/60" style={{ width: size, height: size }} />
  return <File className="text-muted-foreground/50" style={{ width: size, height: size }} />
}
