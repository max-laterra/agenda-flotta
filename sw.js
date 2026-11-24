// Rende l'app utilizzabile senza connessione. Aumenta il numero quando pubblichi una nuova versione.
const VERSION = "agenda-laterra-4.0.6";
const SHELL = ["./", "./index.html", "./skin40.css", "./app.js", "./config.js", "./dropbox.js", "./store.js", "./accessi.js", "./autisti.js", "./fatturato.js", "./fatture.js",
  "./vendor/jszip.min.js", "./vendor/pdf-lib.min.js", "./vendor/font-pdf.js", "./vendor/qrcode.js", "./logo.jpg", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-64.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k); await self.clients.claim(); })()); });
const timeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!same && !fonts) return; // Dropbox passa sempre dalla rete
  if (same && url.searchParams.has("vcheck")) return; // 4.0.4: il controllo degli aggiornamenti va sempre al sito e non tocca la copia offline
  // 4.0.4: i file della versione nuova scaricati dalla finestra «Aggiornamento»: sempre dal sito, senza limite di tempo
  // (anche con la rete lenta), e vanno subito anche nella copia offline
  if (same && req.headers.get("x-agenda-upd") === "1") {
    e.respondWith((async () => { const r = await fetch(req, { cache: "no-cache" }); if (r.ok) { try { (await caches.open(VERSION)).put(req, r.clone()); } catch (_) {} } return r; })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    if (fonts) { const hit = await c.match(req); if (hit) return hit; try { const r = await fetch(req); if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; } catch (_) { return Response.error(); } }
    // "no-cache": chiede sempre al sito se il file è cambiato, così un aggiornamento su GitHub arriva subito
    try { const r = await timeout(fetch(req, { cache: "no-cache" }), 4000); if (r.ok) c.put(req, r.clone()); return r; }
    catch (_) { return (await c.match(req, { ignoreSearch: true })) || (req.mode === "navigate" ? await c.match("./index.html") : null) || Response.error(); }
  })());
});
