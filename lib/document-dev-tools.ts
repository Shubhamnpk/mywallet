"use client"

// Dev-only helpers to seed test documents into the encrypted vault.
// Used by Settings > Developer > Document Vault Lab.

import {
  generateId,
  getPersons,
  saveDocument,
  savePerson,
  generateThumbnail,
  type Person,
  type StoredDocument,
} from "./document-storage"

const DEV_PERSON_NAME = "Dev Test Person"

function makeCanvasImage(label: string, hue: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    canvas.width = 640
    canvas.height = 400
    const ctx = canvas.getContext("2d")
    if (!ctx) return reject(new Error("Canvas unavailable"))
    const g = ctx.createLinearGradient(0, 0, 640, 400)
    g.addColorStop(0, `hsl(${hue}, 70%, 55%)`)
    g.addColorStop(1, `hsl(${hue + 60}, 70%, 40%)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 640, 400)
    ctx.fillStyle = "rgba(255,255,255,0.92)"
    ctx.font = "bold 52px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(label, 320, 215)
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.9)
  })
}

/** Minimal single-page PDF with a valid xref table so pdf.js renders it. */
function makeTestPdf(lines: string[]): Blob {
  const stream =
    "BT /F1 20 Tf 40 170 Td 24 TL " +
    lines.map((l) => `(${l.replace(/[()\\]/g, "")}) Tj T*`).join(" ") +
    " ET"
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 460 260] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]
  let body = "%PDF-1.4\n"
  const offsets: number[] = []
  objs.forEach((o, i) => {
    offsets.push(body.length)
    body += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xrefPos = body.length
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) xref += `${String(off).padStart(10, "0")} 00000 n \n`
  body += `${xref}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  return new Blob([body], { type: "application/pdf" })
}

/** Creates one shared test person + three documents: two-sided image, PDF, text note.
 *  Idempotent: reuses the existing dev person, adds new docs each call. */
export async function seedTestDocuments(): Promise<number> {
  let person: Person | undefined = (await getPersons()).find((p) => p.name === DEV_PERSON_NAME)
  if (!person) {
    person = {
      id: generateId(),
      name: DEV_PERSON_NAME,
      emoji: "🧑‍💻",
      createdAt: new Date().toISOString(),
    }
    await savePerson(person)
  }
  const personId = person.id
  const mkDoc = (name: string, type: string): StoredDocument => ({
    id: generateId(),
    personId,
    name,
    type,
    mimeType: "",
    size: 0,
    tags: ["dev-test"],
    createdAt: new Date().toISOString(),
  })

  const front = await makeCanvasImage("FRONT", 210)
  const back = await makeCanvasImage("BACK", 265)
  await saveDocument(mkDoc("Dev Test ID Card", "id"), [
    { blob: front, thumbnail: await generateThumbnail(front), label: "Front" },
    { blob: back, thumbnail: await generateThumbnail(back), label: "Back" },
  ])

  const pdf = makeTestPdf([
    "MyWallet Dev Test PDF",
    "If you can read this, the full",
    "gzip -> base64 -> AES-GCM",
    "encrypt/decrypt roundtrip works.",
  ])
  await saveDocument(mkDoc("Dev Test Document", "other"), [{ blob: pdf, label: "Page 1" }])

  const note = new Blob(
    [`MyWallet vault test note.\nCreated: ${new Date().toISOString()}\n\nStored as text/plain, encrypted at rest.`],
    { type: "text/plain" },
  )
  await saveDocument(mkDoc("Dev Test Note", "other"), [{ blob: note, label: "Note" }])

  return 3
}
