/* ParkPunkt service worker — conservative offline shell for static assets only. */
const CACHE = "parkpunkt-static-v2";
const PRECACHE = ["/favicon.ico", "/parkpunkt-icon.svg", "/manifest.webmanifest", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API, auth or server-function traffic.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_serverFn/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }
  if (!PRECACHE.includes(url.pathname) && !url.pathname.startsWith("/assets/")) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
