// Archivio dell'agenda su Dropbox, con copia sul dispositivo per lavorare anche offline.
//
// Cartella (uguale su tutti i dispositivi):
//   /Agenda Flotta La Terra/giorni/AAAA/AAAA-MM-GG.json   prenotazioni e autisti extra del giorno
//   /Agenda Flotta La Terra/config/flotta.json            mezzi, targhe
//   /Agenda Flotta La Terra/config/impostazioni.json      percorso del file fatturato
//   /Agenda Flotta La Terra/config/accesso.json           codice di accesso (solo impronta cifrata)
//   /Agenda Flotta La Terra/Fogli di servizio/AAAA/...    PDF ed Excel dei fogli di servizio
(function () {
  "use strict";
  const C = window.AGENDA_CONFIG || {};
  const BASE = (C.folder || "/Agenda Flotta La Terra").replace(/\/+$/, "");
  const P = { days: BASE + "/giorni", cfg: BASE + "/config", sheets: BASE + "/Fogli di servizio" };
  const CK = "agenda-cache-v1", QK = "agenda-queue-v1";
  const enc = new TextEncoder(), dec = new TextDecoder();
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const pad = (n) => String(n).padStart(2, "0");

  let cache = load(CK, { days: {}, cursor: null, fleet: null, settings: null, access: null, lists: null, fat: null });
  let queue = load(QK, { days: [], fat: {} });
  function load(k, d) { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || "null") || {}); } catch (_) { return d; } }
  function persist() {
    try { localStorage.setItem(CK, JSON.stringify(cache)); } catch (_) {}
    try { localStorage.setItem(QK, JSON.stringify(queue)); } catch (_) {}
  }

  const hooks = { onChange() {}, onStatus() {}, onAccessChanged() {}, rowFor: null };
  const status = { online: navigator.onLine, syncing: false, error: null, lastSync: cache.lastSync || null };
  function emitStatus() { hooks.onStatus(Object.assign({ pending: queue.days.length, fatPending: Object.keys(queue.fat).length, fat: cache.fat }, status)); }

  // ---------- giornate ----------
  const dayPath = (date) => P.days + "/" + date.slice(0, 4) + "/" + date + ".json";
  const emptyDay = (date) => ({ date, month: date.slice(0, 7), bookings: {}, extra: "", seq: 0 });
  const yymmdd = (d) => d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10);
  const nnOf = (f) => parseInt(String(f || "").slice(6), 10) || 0;

  // Applica le operazioni a una giornata. In remoto (strict) riassegna il n. foglio se un altro
  // dispositivo lo ha già usato. Restituisce le variazioni per il fatturato.
  function applyOps(doc, ops, strict) {
    const fat = [];
    doc.bookings = doc.bookings || {};
    for (const op of ops) {
      if (op.t === "put") {
        const b = clone(op.b);
        const prev = doc.bookings[op.id];
        if (op.assign || !b.foglio) {
          const used = Object.entries(doc.bookings).filter(([k, x]) => x && k !== op.id).map(([, x]) => x.foglio);
          const next = Math.max(doc.seq || 0, 0, ...used.map(nnOf)) + 1;
          let nn = nnOf(b.foglio);
          if (!b.foglio || (strict && (nn < next || used.includes(b.foglio)))) { nn = next; b.foglio = yymmdd(doc.date) + pad(nn); }
          doc.seq = Math.max(doc.seq || 0, nn);
        }
        if (prev && prev.foglio && prev.foglio !== b.foglio) fat.push({ act: "clear", foglio: prev.foglio });
        doc.bookings[op.id] = b;
        fat.push({ act: "upsert", foglio: b.foglio, b: Object.assign({ id: op.id }, b) });
      } else if (op.t === "del") {
        const prev = doc.bookings[op.id];
        if (prev && prev.foglio) fat.push({ act: "clear", foglio: prev.foglio });
        delete doc.bookings[op.id];
      } else if (op.t === "extra") {
        doc.extra = op.v;
      }
    }
    return fat;
  }

  // Vista corrente: dati di Dropbox + modifiche non ancora inviate.
  function view() {
    const out = {};
    for (const d in cache.days) out[d] = clone(cache.days[d].doc);
    for (const item of queue.days) {
      const doc = out[item.date] || (out[item.date] = emptyDay(item.date));
      applyOps(doc, item.ops, false);
    }
    return out;
  }
  function changed() { hooks.onChange(); emitStatus(); }

  function mutateDay(date, ops) {
    queue.days.push({ date, ops: clone(ops), at: Date.now() });
    persist(); changed(); kick();
  }

  // ---------- invio delle modifiche ----------
  let flushing = false;
  async function flush() {
    if (flushing || !navigator.onLine || !DBX.isLinked()) return;
    flushing = true; status.syncing = true; emitStatus();
    try {
      while (queue.days.length) {
        const item = queue.days[0];
        let done = false;
        for (let attempt = 0; attempt < 6 && !done; attempt++) {
          const path = dayPath(item.date);
          const cur = await DBX.download(path);
          const doc = cur ? JSON.parse(dec.decode(cur.buf)) : emptyDay(item.date);
          const fat = applyOps(doc, item.ops, true);
          try {
            const meta = await DBX.upload(path, enc.encode(JSON.stringify(doc)), cur ? { update: cur.meta.rev } : "add");
            cache.days[item.date] = { doc, rev: meta.rev };
            for (const f of fat) queue.fat[f.foglio] = f.act === "clear" ? { act: "clear" } : { act: "upsert", b: f.b };
            done = true;
          } catch (e) {
            if (e.code !== "conflict") throw e; // un altro dispositivo ha scritto: si rilegge e si riprova
          }
        }
        if (!done) throw { code: "busy" };
        queue.days.shift(); persist(); changed();
      }
      status.error = null;
    } catch (e) {
      status.error = e && e.code;
      if (e && e.code === "no_auth") hooks.onAuthLost && hooks.onAuthLost();
    } finally {
      flushing = false; status.syncing = false; emitStatus();
    }
    if (Object.keys(queue.fat).length) syncFatturato();
  }

  // ---------- lettura delle modifiche degli altri dispositivi ----------
  let pulling = false;
  async function pull() {
    if (pulling || !navigator.onLine || !DBX.isLinked()) return;
    pulling = true;
    let touched = false;
    try {
      let res;
      try { res = await DBX.listFolder(BASE, cache.cursor); }
      catch (e) { if (e.code === "reset") { cache.cursor = null; res = await DBX.listFolder(BASE, null); } else throw e; }
      if (res === null) { await setupFolders(); res = await DBX.listFolder(BASE, null); }
      const seen = [];
      while (res) {
        seen.push(...res.entries);
        cache.cursor = res.cursor;
        res = res.has_more ? await DBX.listFolder(BASE, res.cursor) : null;
      }
      for (const e of seen) {
        const p = (e.path_lower || "").toLowerCase();
        const m = /\/giorni\/\d{4}\/(\d{4}-\d{2}-\d{2})\.json$/.exec(p);
        if (m) {
          const date = m[1];
          if (e[".tag"] === "deleted") { delete cache.days[date]; touched = true; continue; }
          if (e[".tag"] !== "file" || (cache.days[date] && cache.days[date].rev === e.rev)) continue;
          const f = await DBX.download(e.path_lower);
          if (f) { cache.days[date] = { doc: JSON.parse(dec.decode(f.buf)), rev: f.meta.rev || e.rev }; touched = true; }
          continue;
        }
        if (e[".tag"] === "file" && p === (P.cfg + "/flotta.json").toLowerCase()) { const f = await DBX.download(e.path_lower); if (f) { cache.fleet = JSON.parse(dec.decode(f.buf)); touched = true; } }
        if (e[".tag"] === "file" && p === (P.cfg + "/impostazioni.json").toLowerCase()) { const f = await DBX.download(e.path_lower); if (f) { cache.settings = JSON.parse(dec.decode(f.buf)); touched = true; } }
        if (e[".tag"] === "file" && p === (P.cfg + "/accesso.json").toLowerCase()) {
          const f = await DBX.download(e.path_lower);
          if (f) { const a = JSON.parse(dec.decode(f.buf)); const was = cache.access; cache.access = a; if (was && was.hash !== a.hash) hooks.onAccessChanged(); touched = true; }
        }
      }
      cache.lastSync = status.lastSync = Date.now(); status.error = null;
      persist();
    } catch (e) {
      status.error = e && e.code; status.errorDetail = e && (e.summary || e.status || "");
      console.error("Dropbox:", e);
      if (e && e.code === "no_auth") hooks.onAuthLost && hooks.onAuthLost();
    } finally {
      pulling = false;
    }
    if (touched) changed(); else emitStatus();
    return touched;
  }

  async function setupFolders() {
    for (const p of [BASE, P.days, P.cfg, P.sheets]) await DBX.createFolder(p);
  }

  // Aggiornamenti in tempo reale: attesa lunga su Dropbox, con controllo periodico di riserva.
  let watching = false;
  async function watch() {
    if (watching) return; watching = true;
    let failures = 0;
    while (watching) {
      if (!navigator.onLine || !DBX.isLinked() || !cache.cursor) { await sleep(15000); continue; }
      try {
        const r = await DBX.longpoll(cache.cursor, 60);
        failures = 0;
        if (r.changes) await pull();
        if (r.backoff) await sleep(r.backoff * 1000);
      } catch (_) {
        failures++;
        await sleep(Math.min(60000, 5000 * failures));
        await pull();
      }
    }
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let kickTimer = null;
  function kick() { clearTimeout(kickTimer); kickTimer = setTimeout(() => { flush(); }, 50); }
  window.addEventListener("online", () => { status.online = true; emitStatus(); flush().then(pull); });
  window.addEventListener("offline", () => { status.online = false; emitStatus(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { pull(); flush(); } });
  setInterval(() => { if (!document.hidden) { pull(); flush(); } }, 60000);
  setInterval(() => { if (!document.hidden) syncFatturato(); }, 5 * 60000);

  // ---------- fatturato ----------
  let fatRunning = false, fatAgain = false;
  // Scrive nel file fatturato le righe in attesa e rimette quelle mancanti. Legge anche clienti e regole.
  async function syncFatturato() {
    const path = cache.settings && cache.settings.fatturato;
    if (!path || !hooks.rowFor || !navigator.onLine || !DBX.isLinked()) return;
    if (fatRunning) { fatAgain = true; return; }
    fatRunning = true; fatAgain = false;
    const pendingNow = Object.assign({}, queue.fat);
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const f = await DBX.download(path);
        if (!f) { cache.fat = { ok: false, error: "missing", at: Date.now() }; break; }
        // tutte le prenotazioni note: quelle mancanti nel file vengono aggiunte
        const all = [];
        for (const d in cache.days) { const bk = cache.days[d].doc.bookings || {}; for (const id in bk) { const b = bk[id]; if (b && b.foglio) all.push(Object.assign({ id }, b, { start: b.start || d })); } }
        const res = await FAT.apply(f.buf, {
          upserts: Object.entries(pendingNow).filter(([, x]) => x.act === "upsert").map(([, x]) => hooks.rowFor(x.b)),
          clears: Object.entries(pendingNow).filter(([, x]) => x.act === "clear").map(([k]) => k),
          ensure: all.map(hooks.rowFor),
        });
        if (res.lists) cache.lists = Object.assign({}, cache.lists || {}, res.lists, { at: Date.now() });
        if (!res.changed) { finishFat(pendingNow, res, f.meta.rev); break; }
        try {
          const meta = await DBX.upload(path, res.buf, { update: f.meta.rev });
          finishFat(pendingNow, res, meta.rev);
          break;
        } catch (e) {
          if (e.code !== "conflict") throw e;
          if (attempt === 4) throw { code: "busy" };
        }
      }
    } catch (e) {
      cache.fat = Object.assign({}, cache.fat || {}, { ok: false, error: (e && e.code) || "error", at: Date.now() });
      if (e && e.message) console.error(e);
    } finally {
      fatRunning = false; persist(); changed();
    }
    if (fatAgain) syncFatturato();
  }
  function finishFat(done, res, rev) {
    for (const k in done) if (queue.fat[k] && JSON.stringify(queue.fat[k]) === JSON.stringify(done[k])) delete queue.fat[k];
    cache.fat = { ok: true, at: Date.now(), added: res.added, updated: res.updated, cleared: res.cleared, rev };
  }

  // ---------- configurazione ----------
  async function putJSON(path, obj) { await DBX.upload(path, enc.encode(JSON.stringify(obj, null, 1)), "overwrite"); }
  async function setFleet(vehicles) {
    cache.fleet = { vehicles }; persist(); changed();
    try { await putJSON(P.cfg + "/flotta.json", cache.fleet); } catch (e) { status.error = e.code; emitStatus(); throw e; }
  }
  async function setSettings(s) { cache.settings = Object.assign({}, cache.settings || {}, s); await putJSON(P.cfg + "/impostazioni.json", cache.settings); persist(); changed(); }
  async function setAccess(a) { await putJSON(P.cfg + "/accesso.json", a); cache.access = a; persist(); }

  async function saveSheetFile(name, blob, year) {
    const folder = P.sheets + "/" + year;
    await DBX.createFolder(P.sheets).catch(() => {});
    await DBX.createFolder(folder).catch(() => {});
    return DBX.upload(folder + "/" + name, blob, "overwrite");
  }

  function reset() { cache = { days: {}, cursor: null, fleet: null, settings: null, access: null, lists: null, fat: null }; queue = { days: [], fat: {} }; persist(); }

  window.STORE = {
    BASE, P,
    configure(h) { Object.assign(hooks, h); },
    view, mutateDay, pull, flush, watch, setupFolders, syncFatturato,
    setFleet, setSettings, setAccess, saveSheetFile, reset,
    get fleet() { return cache.fleet && cache.fleet.vehicles; },
    get settings() { return cache.settings; },
    get access() { return cache.access; },
    get lists() { return cache.lists; },
    get fat() { return cache.fat; },
    get pending() { return queue.days.length + Object.keys(queue.fat).length; },
    get hasData() { return !!cache.cursor; },
    status: () => Object.assign({ pending: queue.days.length, fatPending: Object.keys(queue.fat).length, fat: cache.fat }, status),
  };
})();
