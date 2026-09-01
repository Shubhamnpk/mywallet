import imageCompression, { type Options } from "browser-image-compression"

export type CompressionResult = {
  file: File
  originalSize: number
  compressedSize: number
  savedBytes: number
  savedPercent: number
  formatChanged: boolean
  originalType: string
  outputType: string
}

export type CompressionPreset = "document" | "photo" | "thumbnail"

const PRESETS: Record<CompressionPreset, Options> = {
  document: {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    initialQuality: 0.82,
    useWebWorker: true,
  },
  photo: {
    maxSizeMB: 0.45,
    maxWidthOrHeight: 1600,
    initialQuality: 0.8,
    useWebWorker: true,
  },
  thumbnail: {
    maxSizeMB: 0.05,
    maxWidthOrHeight: 300,
    initialQuality: 0.7,
    useWebWorker: true,
  },
}

function renameWithExtension(fileName: string, mimeType: string): string {
  const extMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  }
  const base = fileName.replace(/\.[^.]+$/, "")
  return base + (extMap[mimeType] ?? ".jpg")
}

/**
 * Every image goes through browser-image-compression. No format is exempt.
 * Set forceWebp to transcode the output to WebP regardless of input type;
 * otherwise the original format is kept and only size/quality are reduced.
 */
export async function compressImage(
  file: File,
  preset: CompressionPreset = "document",
  forceWebp = false,
): Promise<CompressionResult> {
  const originalSize = file.size

  if (!file.type.startsWith("image/")) {
    return passthrough(file)
  }

  const options: Options = { ...PRESETS[preset] }
  if (forceWebp) options.fileType = "image/webp"

  try {
    let compressed = await imageCompression(file, options)

    if (compressed.size >= originalSize) {
      compressed = file
    }

    const outputType = compressed.type || file.type
    const formatChanged = outputType !== file.type
    const savedBytes = Math.max(0, originalSize - compressed.size)

    if (formatChanged && compressed.name === file.name) {
      Object.defineProperty(compressed, "name", {
        value: renameWithExtension(file.name, outputType),
        configurable: true,
      })
    }

    return {
      file: compressed,
      originalSize,
      compressedSize: compressed.size,
      savedBytes,
      savedPercent: originalSize > 0 ? (savedBytes / originalSize) * 100 : 0,
      formatChanged,
      originalType: file.type || "unknown",
      outputType,
    }
  } catch {
    return passthrough(file)
  }
}

async function passthrough(file: File): Promise<CompressionResult> {
  return {
    file,
    originalSize: file.size,
    compressedSize: file.size,
    savedBytes: 0,
    savedPercent: 0,
    formatChanged: false,
    originalType: file.type || "unknown",
    outputType: file.type || "unknown",
  }
}

// --- Lightweight canvas compression (avatars, small images) ---

export type DataUrlCompressionOptions = {
  maxSize?: number
  maxBytes?: number
  mimeType?: string
  quality?: number
}

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
  options: DataUrlCompressionOptions = {},
): Promise<string> {
  const {
    maxSize = 256,
    maxBytes = 200 * 1024,
    mimeType = "image/jpeg",
    quality = 0.8,
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
    if (!blob) break
  }

  if (!blob) {
    throw new Error("Failed to compress image")
  }

  return await blobToDataUrl(blob)
}
