// SocialHub Service Worker
// Strategy:
//   - API routes (/api/*): network-only (never cache)
//   - Static assets (/_next/static/*): cache-first
//   - Pages/navigation: stale-while-revalidate, offline fallback

const CACHE_NAME = "socialhub-v1"
const OFFLINE_URL = "/offline.html"

// ─── Install ─────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => {
        // Non-fatal: offline page may not exist during first build
      })
  )
  // Activate immediately without waiting for old clients to close
  self.skipWaiting()
})

// ─── Activate ────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ─── Fetch ───────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return

  // API routes: network-only, never cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "You are offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    )
    return
  }

  // Next.js static chunks: cache-first (immutable hashes in filename)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
        })
      )
    )
    return
  }

  // Navigation / page requests: stale-while-revalidate with offline fallback
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
          .catch(async () => {
            // Return the cached version, or the offline page as last resort
            return cached ?? (await caches.match(OFFLINE_URL)) ?? Response.error()
          })

        // Return cached immediately if available; update in the background
        return cached ?? networkFetch
      })
    )
  )
})
