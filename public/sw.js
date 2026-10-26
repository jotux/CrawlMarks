// Keeps the app working offline once it has been opened, so it still starts from the home screen
// at a range with no signal. Network first, so a new version shows as soon as there is a connection;
// the copy kept from the last visit covers offline. Only answers for this app's own files.
// The apps under barebow.us share one origin, and so one set of caches: each clears only its own.
const PREFIX = 'crawlmarks-';
const CACHE = `${PREFIX}v1`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add('./')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  // the page is cached once, whatever ?query or #hash it was opened with
  const key = event.request.mode === 'navigate' ? './' : event.request;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(key, copy));
        }
        return response;
      })
      .catch(() => caches.match(key).then((hit) => hit ?? Response.error())),
  );
});
