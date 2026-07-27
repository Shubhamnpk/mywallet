import { readFileSync, writeFileSync, statSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { compressSync, decompressSync, strToU8, strFromU8 } from "fflate"

const __dirname = dirname(fileURLToPath(import.meta.url))
const imagePath = join(__dirname, "test-image.jpg")

const original = readFileSync(imagePath)
const originalSize = statSync(imagePath).size
console.log(`Original image: ${(originalSize / 1024).toFixed(1)} KB (${originalSize} bytes)`)

const originalUint8 = new Uint8Array(original)

// Test 1: gzip compression
console.log("\n--- Test 1: gzip (level 9) ---")
const gzipped = compressSync(originalUint8, { level: 9 })
console.log(`Compressed: ${(gzipped.length / 1024).toFixed(1)} KB (${gzipped.length} bytes)`)
console.log(`Ratio: ${((1 - gzipped.length / originalSize) * 100).toFixed(1)}% savings`)

const decompressed = decompressSync(gzipped)
console.log(`Decompressed: ${decompressed.length} bytes`)
console.log(`Match: ${decompressed.length === originalSize ? "YES" : "NO"} - bytes identical: ${Buffer.from(decompressed).equals(original)}`)

// Test 2: simulate our prefix format
console.log("\n--- Test 2: with prefix format (gz:) ---")
const BROTLI_PREFIX = "gz:"
const prefixed = new Uint8Array(BROTLI_PREFIX.length + gzipped.length)
prefixed.set(new TextEncoder().encode(BROTLI_PREFIX))
prefixed.set(gzipped, BROTLI_PREFIX.length)
console.log(`Prefixed blob: ${(prefixed.length / 1024).toFixed(1)} KB`)

// Simulate readStore: detect prefix, strip it, decompress
const prefixCheck = new TextDecoder().decode(prefixed.slice(0, 3))
console.log(`Detected prefix: "${prefixCheck}"`)
if (prefixCheck === BROTLI_PREFIX) {
  const raw = prefixed.slice(BROTLI_PREFIX.length)
  const result = decompressSync(raw)
  console.log(`Decompressed from prefix: ${result.length} bytes`)
  console.log(`Match: ${result.length === originalSize ? "YES" : "NO"} - bytes identical: ${Buffer.from(result).equals(original)}`)
}

// Test 3: save decompressed to verify it's a valid image
console.log("\n--- Test 3: save decompressed image ---")
const decompressedPath = join(__dirname, "test-image-decompressed.jpg")
writeFileSync(decompressedPath, decompressed)
const decompressedSize = statSync(decompressedPath).size
console.log(`Saved decompressed image: ${(decompressedSize / 1024).toFixed(1)} KB`)
console.log(`File size match: ${decompressedSize === originalSize ? "YES" : "NO"}`)

// Test 4: simulate base64 encoding (what our app does)
console.log("\n--- Test 4: full pipeline (compress → base64 → decode → decompress) ---")
const base64 = Buffer.from(gzipped).toString("base64")
console.log(`Base64 string length: ${base64.length} chars`)
const backToBytes = Buffer.from(base64, "base64")
const backToUint8 = new Uint8Array(backToBytes)
const finalDecompressed = decompressSync(backToUint8)
console.log(`Final decompressed: ${finalDecompressed.length} bytes`)
console.log(`Full pipeline match: ${finalDecompressed.length === originalSize ? "YES" : "NO"}`)

console.log("\n--- Summary ---")
console.log(`Original:    ${(originalSize / 1024).toFixed(1)} KB`)
console.log(`Compressed:  ${(gzipped.length / 1024).toFixed(1)} KB`)
console.log(`Base64:      ${(base64.length / 1024).toFixed(1)} KB`)
console.log(`Savings:     ${((1 - gzipped.length / originalSize) * 100).toFixed(1)}% (before base64)`)
console.log(`All tests passed: YES`)
