export type ImageCompressionOptions = {
  maxSize?: number
  maxBytes?: number
  mimeType?: string
  quality?: number
}

const DEFAULT_MAX_SIZE = 256
const DEFAULT_MAX_BYTES = 200 * 1024
const DEFAULT_MIME_TYPE = "image/jpeg"
const DEFAULT_QUALITY = 0.8

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load image"))
    }
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Failed to read image data"))
    reader.readAsDataURL(blob)
  })
}

export async function compressImageToDataUrl(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<string> {
  const {
    maxSize = DEFAULT_MAX_SIZE,
    maxBytes = DEFAULT_MAX_BYTES,
    mimeType = DEFAULT_MIME_TYPE,
    quality = DEFAULT_QUALITY,
  } = options

  const img = await loadImageFromFile(file)
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Canvas not supported")
  }
  ctx.drawImage(img, 0, 0, width, height)

  let currentQuality = quality
  let blob = await canvasToBlob(canvas, mimeType, currentQuality)
  if (!blob) {
    throw new Error("Failed to compress image")
  }

  while (blob.size > maxBytes && currentQuality > 0.5) {
    currentQuality = Math.max(0.5, currentQuality - 0.1)
    blob = await canvasToBlob(canvas, mimeType, currentQuality)
    if (!blob) {
      break
    }
  }

  if (!blob) {
    throw new Error("Failed to compress image")
  }

  return await blobToDataUrl(blob)
}
