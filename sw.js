// Rende l'app utilizzabile senza connessione. Aumenta il numero quando pubblichi una nuova versione.
const VERSION = "agenda-laterra-v1";
const SHELL = ["./", "./index.html", "./app.js", "./config.js", "./dropbox.js", "./store.js", "./fatturato.js",
  "./vendor/jszip.min.js", "./vendor/pdf-lib.min.js", "./logo.jpg", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k); await self.clients.claim(); })()); });
const timeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!same && !fonts) return; // Dropbox passa sempre dalla rete
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    if (fonts) { const hit = await c.match(req); if (hit) return hit; try { const r = await fetch(req); if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; } catch (_) { return Response.error(); } }
    try { const r = await timeout(fetch(req), 4000); if (r.ok) c.put(req, r.clone()); return r; }
    catch (_) { return (await c.match(req, { ignoreSearch: true })) || (req.mode === "navigate" ? await c.match("./index.html") : null) || Response.error(); }
  })());
});
