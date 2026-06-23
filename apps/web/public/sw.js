const CACHE = 'payesh-v1'
const OFFLINE_SHELL = ['/citizen', '/inspector', '/offline.html']

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE_SHELL).catch(() => {})))
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  // Never cache API calls or auth
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/offline.html'))
    )
    return
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  )
})
