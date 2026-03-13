const CACHE_NAME = "album-v2"

const urlsToCache = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/album.html",
  "/trash.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
]

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  )
  self.skipWaiting()
})

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url)
  
  if (url.origin.includes("supabase") || url.origin.includes("firebase")) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      }).catch(() => caches.match(event.request))
    )
  } else {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) return response
        return fetch(event.request).then(fetchRes => {
          if (fetchRes.ok && event.request.method === "GET") {
            const clone = fetchRes.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          }
          return fetchRes
        })
      })
    )
  }
})
