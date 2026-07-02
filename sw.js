// sw.js — service worker mínimo de Semester Draft.
// Estrategia: red primero, caché como respaldo (la app siempre está fresca
// online y sigue abriendo sin conexión con lo último que viste).
// Solo GET del mismo origen; nada de Supabase/CDN (eso queda siempre en vivo).

const CACHE = "semester-draft-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const res = await fetch(e.request);
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      } catch (err) {
        const guardada = await cache.match(e.request);
        if (guardada) return guardada;
        // Navegación sin red ni caché: al menos el index (app shell).
        if (e.request.mode === "navigate") {
          const shell = await cache.match("./index.html") ?? await cache.match("./");
          if (shell) return shell;
        }
        throw err;
      }
    })
  );
});
