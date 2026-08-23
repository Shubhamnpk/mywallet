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
      // Never return something bigger than the input.
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
