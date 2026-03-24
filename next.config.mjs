import withPWA from 'next-pwa'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const emptyCanvasPath = join(__dirname, 'lib', 'empty-canvas.js')

const runtimeCaching = [
  // Ensure the start URL is network-first so users get the latest app shell when online
  {
    urlPattern: /^\/$/,
    handler: 'NetworkFirst',
    options: { cacheName: 'start-url', networkTimeoutSeconds: 10 }
  },
  {
    urlPattern: /^https?:.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
    handler: 'StaleWhileRevalidate',
    options: { cacheName: 'images', expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 } }
  },
  {
    urlPattern: /^https?:.*\.(?:js|css|map)$/i,
    handler: 'StaleWhileRevalidate',
    options: { cacheName: 'static-resources' }
  },
  {
  urlPattern: /^\/_next\/static\/.*$/i,
    handler: 'StaleWhileRevalidate',
    options: { cacheName: 'next-static' }
  },
  {
    urlPattern: /^https?:.*\/(api)\//i,
    handler: 'NetworkFirst',
    options: { cacheName: 'api-responses', networkTimeoutSeconds: 10 }
  }
]

const pwa = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  customWorkerDir: 'worker',
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  fallbacks: { document: '/offline.html', image: '/image.png' },
  // ensure the app shell (start URL) is precached so it can load offline
  additionalManifestEntries: [
    { url: '/', revision: null },
    { url: '/?source=pwa', revision: null },
    { url: '/settings', revision: null },
    { url: '/settings/', revision: null },
    { url: '/offline.html', revision: null }
  ],
  runtimeCaching
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  turbopack: {
    resolveAlias: {
      canvas: emptyCanvasPath,
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: emptyCanvasPath,
    }
    return config
  },
}

export default pwa(nextConfig)
