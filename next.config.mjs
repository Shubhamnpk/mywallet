import withPWA from 'next-pwa'

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
  register: true,
  skipWaiting: false,
  fallbacks: { document: '/offline.html', image: '/image.png' },
  // ensure the app shell (start URL) is precached so it can load offline
  additionalManifestEntries: [
  { url: '/', revision: null },
  { url: '/settings', revision: null },
  { url: '/settings/', revision: null },
  { url: '/offline.html', revision: null }
  ],
  // exclude server-only manifests that are not available under /_next at runtime
  buildExcludes: [/app-build-manifest.json$/],
  runtimeCaching
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
}

export default pwa(nextConfig)
