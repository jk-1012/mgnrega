const CACHE_NAME = 'mgnrega-cache-v1'
const urlsToCache = ['/', '/offline.html']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  event.respondWith(
    caches.match(req).then(cachedRes => {
      if (cachedRes) return cachedRes
      return fetch(req).then(networkRes => {
        // cache API responses optionally
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(req, networkRes.clone())
          return networkRes
        })
      }).catch(() => caches.match('/offline.html'))
    })
  )
})
