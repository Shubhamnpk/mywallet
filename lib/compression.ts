"use client"

import { compressSync, decompressSync } from "fflate"

const GZIP_PREFIX = "gz:"

export async function compressBlob(blob: Blob): Promise<{ blob: Blob; originalType: string }> {
  const originalType = blob.type

  const arrayBuffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  const compressed = compressSync(bytes, { level: 9 })

  if (compressed.length >= bytes.length) {
    return { blob, originalType }
  }

  const prefixed = new Uint8Array(GZIP_PREFIX.length + compressed.length)
  prefixed.set(new TextEncoder().encode(GZIP_PREFIX))
  prefixed.set(compressed, GZIP_PREFIX.length)
  return { blob: new Blob([prefixed], { type: "application/octet-stream" }), originalType }
}

export async function decompressBlob(blob: Blob, originalType: string): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  const prefixStr = new TextDecoder().decode(bytes.slice(0, 3))
  if (prefixStr === GZIP_PREFIX) {
    const compressed = bytes.slice(GZIP_PREFIX.length)
    const decompressed = decompressSync(compressed)
    return new Blob([new Uint8Array(decompressed)], { type: originalType })
  }

  return blob
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result.split(",")[1] || reader.result)
      } else reject(new Error("Failed to read blob"))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
