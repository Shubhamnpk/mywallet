// Service Worker for MyWallet PWA
const CACHE_VERSION = 'v2'
const STATIC_CACHE = `mywallet-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `mywallet-dynamic-${CACHE_VERSION}`
const API_CACHE = `mywallet-api-${CACHE_VERSION}`

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/image.png',
  '/mywallet.png',
  // Add Next.js critical assets
  '/_next/static/css/',
  '/_next/static/js/',
  // Cache all app routes for offline access
  '/settings',
  '/dashboard',
  '/transactions',
  '/goals',
  '/budgets',
  '/categories'
]

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/transactions',
  '/api/goals',
  '/api/budgets',
  '/api/categories',
  '/api/user',
  '/api/dashboard'
]

// Routes that should work offline
const OFFLINE_ROUTES = [
  '/',
  '/offline',
  '/settings',
  '/dashboard',
  '/transactions',
  '/goals',
  '/budgets',
  '/categories'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('Service Worker: Caching static assets')
          return cache.addAll(STATIC_ASSETS)
        }),

      // Cache critical routes for offline access
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          console.log('Service Worker: Pre-caching critical routes')
          // We'll cache these when they're first visited, but we can try to cache them here
          return Promise.all(
            OFFLINE_ROUTES.map(route => {
              return fetch(route)
                .then(response => {
                  if (response.ok) {
                    return cache.put(route, response)
                  }
                })
                .catch(error => {
                  console.log('Failed to pre-cache route:', route, error)
                })
            })
          )
        })
    ])
    .then(() => {
      console.log('Service Worker: Installation complete')
      return self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== API_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      console.log('Service Worker: Claiming clients')
      return self.clients.claim()
    })
  )
})

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return

  // Handle API requests with better caching strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached response and update in background
            fetch(request)
              .then((response) => {
                if (response.status === 200) {
                  const responseClone = response.clone()
                  caches.open(API_CACHE)
                    .then((cache) => cache.put(request, responseClone))
                }
              })
              .catch((error) => {
                console.error('Background fetch failed:', error)
              })
            return cachedResponse
          }
  
          // No cache, fetch from network
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone()
                caches.open(API_CACHE)
                  .then((cache) => cache.put(request, responseClone))
              }
              return response
            })
            .catch((error) => {
              console.error('API fetch failed:', error)
              // Return offline fallback for critical endpoints
              if (API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
                return new Response(JSON.stringify({ error: 'Offline', message: 'Data will sync when online' }), {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                })
              }
            })
        })
    )
    return
  }

  // Handle Next.js assets (JS, CSS)
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }

          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone()
                caches.open(STATIC_CACHE)
                  .then((cache) => cache.put(request, responseClone))
              }
              return response
            })
        })
    )
    return
  }

  // Handle navigation requests (SPA routes)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }

          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone()
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => cache.put(request, responseClone))
              }
              return response
            })
            .catch(() => {
              // Return cached offline page for navigation requests when offline
              console.log('Offline navigation: redirecting to offline page')
              return caches.match('/offline') || caches.match('/') || new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta http-equiv="refresh" content="0; url=/offline">
                  <title>Redirecting to Offline Page...</title>
                </head>
                <body>
                  <p>Redirecting to offline page...</p>
                </body>
                </html>
              `, {
                headers: { 'Content-Type': 'text/html' }
              })
            })
        })
    )
    return
  }

  // Handle other static assets and pages
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // Cache the response
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, responseClone))

            return response
          })
          .catch((error) => {
            console.log('Fetch failed for:', request.url, error)
            // For HTML pages, return cached version or offline page
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('/') || new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>MyWallet - Offline</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .offline-message { max-width: 400px; margin: 0 auto; }
                  </style>
                </head>
                <body>
                  <div class="offline-message">
                    <h1>You're Offline</h1>
                    <p>This page isn't cached yet. Please check your internet connection and try again.</p>
                    <button onclick="window.location.reload()">Retry</button>
                  </div>
                </body>
                </html>
              `, {
                headers: { 'Content-Type': 'text/html' }
              })
            }
          })
      })
  )
})

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {

  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData())
  }
})

async function syncPendingData() {
  try {
    console.log('Service Worker: Starting background sync...')

    // Get all pending data from localStorage
    const pendingTransactions = localStorage.getItem('wallet_pending_transactions')
    const pendingGoals = localStorage.getItem('wallet_pending_goals')
    const pendingBudgets = localStorage.getItem('wallet_pending_budgets')

    const syncResults = {
      transactions: { synced: 0, failed: 0 },
      goals: { synced: 0, failed: 0 },
      budgets: { synced: 0, failed: 0 }
    }

    // Sync transactions
    if (pendingTransactions) {
      const transactions = JSON.parse(pendingTransactions)
      for (const transaction of transactions) {
        try {
          const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
          })

          if (response.ok) {
            syncResults.transactions.synced++
          } else {
            syncResults.transactions.failed++
            console.error('Failed to sync transaction:', transaction.id)
          }
        } catch (error) {
          syncResults.transactions.failed++
          console.error('Error syncing transaction:', error)
        }
      }

      if (syncResults.transactions.synced > 0) {
        localStorage.removeItem('wallet_pending_transactions')
      }
    }

    // Sync goals
    if (pendingGoals) {
      const goals = JSON.parse(pendingGoals)
      for (const goal of goals) {
        try {
          const response = await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(goal)
          })

          if (response.ok) {
            syncResults.goals.synced++
          } else {
            syncResults.goals.failed++
            console.error('Failed to sync goal:', goal.id)
          }
        } catch (error) {
          syncResults.goals.failed++
          console.error('Error syncing goal:', error)
        }
      }

      if (syncResults.goals.synced > 0) {
        localStorage.removeItem('wallet_pending_goals')
      }
    }

    // Sync budgets
    if (pendingBudgets) {
      const budgets = JSON.parse(pendingBudgets)
      for (const budget of budgets) {
        try {
          const response = await fetch('/api/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(budget)
          })

          if (response.ok) {
            syncResults.budgets.synced++
          } else {
            syncResults.budgets.failed++
            console.error('Failed to sync budget:', budget.id)
          }
        } catch (error) {
          syncResults.budgets.failed++
          console.error('Error syncing budget:', error)
        }
      }

      if (syncResults.budgets.synced > 0) {
        localStorage.removeItem('wallet_pending_budgets')
      }
    }

    console.log('Service Worker: Sync completed', syncResults)

    // Notify clients that sync is complete
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          timestamp: Date.now(),
          results: syncResults
        })
      })
    })

  } catch (error) {
    console.error('Service Worker: Sync failed:', error)
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})