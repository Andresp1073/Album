const CACHE_NAME = "couple-album-v3"

const urlsToCache = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/album.html",
  "/trash.html",
  "/css/style.css"
]

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  )
})

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})