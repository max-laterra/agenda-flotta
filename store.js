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
  let queue = load(QK, { days: [], fat: {}, clients: [] });
  if (!Array.isArray(queue.clients)) queue.clients = [];
  function load(k, d) { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || "null") || {}); } catch (_) { return d; } }
  function persist() {
    try { localStorage.setItem(CK, JSON.stringify(cache)); } catch (_) {}
    try { localStorage.setItem(QK, JSON.stringify(queue)); } catch (_) {}
  }

  const hooks = { onChange() {}, onStatus() {}, onAccessChanged() {}, rowFor: null };
  const status = { online: navigator.onLine, syncing: false, error: null, lastSync: cache.lastSync || null };
  function emitStatus() { hooks.onStatus(Object.assign({ pending: queue.days.length, fatPending: Object.keys(queue.fat).length + queue.clients.filter((c) => !c.error).length, fat: cache.fat }, status)); }

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
        const pre = yymmdd(doc.date);
        if (op.assign || !b.foglio) {
          if (!op.renumber && prev && prev.foglio && String(prev.foglio).slice(0, 6) === pre) {
            b.foglio = prev.foglio; // già numerata (per esempio invio ripetuto dopo un errore di rete): non si rinumera
          } else {
            const used = Object.entries(doc.bookings).filter(([k, x]) => x && k !== op.id).map(([, x]) => String(x.foglio || ""));
            const ext = fileFogli(pre);
            const taken = new Set(used.concat(ext, op.renumber && prev ? [String(prev.foglio)] : []));
            const next = Math.max(doc.seq || 0, 0, ...used.map(nnOf), ...ext.map(nnOf)) + 1;
            let nn = nnOf(b.foglio);
            if (!b.foglio || String(b.foglio).slice(0, 6) !== pre || (strict && (nn < next || taken.has(String(b.foglio))))) { nn = next; b.foglio = pre + pad(nn); }
            doc.seq = Math.max(doc.seq || 0, nn);
          }
        }
        // se la prenotazione cambia numero, la riga vecchia si svuota; non quando il numero era di una riga scritta a mano
        if (prev && prev.foglio && prev.foglio !== b.foglio && !op.renumber) fat.push({ act: "clear", foglio: prev.foglio, b: Object.assign({ id: op.id }, prev) });
        doc.bookings[op.id] = b;
        fat.push({ act: "upsert", foglio: b.foglio, b: Object.assign({ id: op.id }, b) });
      } else if (op.t === "del") {
        const prev = doc.bookings[op.id];
        if (prev && prev.foglio) fat.push({ act: "clear", foglio: prev.foglio, b: Object.assign({ id: op.id }, prev, { start: prev.start || doc.date }) });
        delete doc.bookings[op.id];
      } else if (op.t === "extra") {
        doc.extra = op.v;
      }
    }
    return fat;
  }

  // n. foglio già presenti nel file fatturato per quella data (anche quelli scritti a mano)
  function fileFogli(pre) { return ((cache.lists && cache.lists.fogli) || []).map(String).filter((f) => f.slice(0, 6) === pre); }

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
  let enabled = false;
  async function flush() {
    if (!enabled || flushing || !navigator.onLine || !DBX.isLinked()) return;
    flushing = true; status.syncing = true; emitStatus();
    try {
      while (queue.days.length) {
        const item = queue.days[0];
        let done = false;
        for (let attempt = 0; attempt < 6 && !done; attempt++) {
          const path = dayPath(item.date);
          const cur = await DBX.download(path);
          if (cur && !cur.meta.rev) cur.meta = await DBX.metadata(path); // il browser non ha ricevuto la versione del file
          const doc = cur ? JSON.parse(dec.decode(cur.buf)) : emptyDay(item.date);
          const fat = applyOps(doc, item.ops, true);
          try {
            const meta = await DBX.upload(path, enc.encode(JSON.stringify(doc)), cur ? { update: cur.meta.rev } : "add");
            cache.days[item.date] = { doc, rev: meta.rev };
            for (const f of fat) queue.fat[f.foglio] = { act: f.act, b: f.b };
            done = true;
          } catch (e) {
            if (e.code !== "conflict") throw e; // un altro dispositivo ha scritto: si rilegge e si riprova
          }
        }
        if (!done) throw { code: "busy" };
        queue.days.shift(); persist(); changed();
      }
      status.error = null; retryN = 0;
    } catch (e) {
      status.error = e && e.code; status.errorDetail = e && (e.summary || e.status || "");
      if (e && e.code === "no_auth") hooks.onAuthLost && hooks.onAuthLost();
      if (e && (e.code === "busy" || e.code === "network" || e.code === "api")) retrySoon();
    } finally {
      flushing = false; status.syncing = false; emitStatus();
    }
    if (Object.keys(queue.fat).length || queue.clients.some((c) => !c.error)) syncFatturato();
  }

  // nuovi tentativi ravvicinati dopo un errore temporaneo: 3 s, 10 s, 30 s, poi ogni minuto
  let retryN = 0, retryTimer = null;
  function retrySoon() {
    if (retryTimer) return; // un nuovo tentativo è già in programma
    const d = [3000, 10000, 30000, 60000][Math.min(retryN++, 3)];
    retryTimer = setTimeout(async () => { retryTimer = null; await flush(); await pull(); }, d);
  }

  // ---------- lettura delle modifiche degli altri dispositivi ----------
  let pulling = false;
  async function pull() {
    if (!enabled || pulling || !navigator.onLine || !DBX.isLinked()) return;
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
        if (e[".tag"] === "file" && p === (P.cfg + "/righe-fatturato.json").toLowerCase()) { const f = await DBX.download(e.path_lower); if (f) { cache.fatShared = (JSON.parse(dec.decode(f.buf)) || {}).fogli || {}; } }
        if (e[".tag"] === "file" && p === (P.cfg + "/impostazioni.json").toLowerCase()) { const f = await DBX.download(e.path_lower); if (f) { cache.settings = JSON.parse(dec.decode(f.buf)); touched = true; } }
        if (e[".tag"] === "file" && p === (P.cfg + "/accesso.json").toLowerCase()) {
          const f = await DBX.download(e.path_lower);
          if (f) { const a = JSON.parse(dec.decode(f.buf)); const was = cache.access; cache.access = a; if (was && was.hash !== a.hash) hooks.onAccessChanged(); touched = true; }
        }
      }
      cache.lastSync = status.lastSync = Date.now(); status.error = null; status.errorDetail = ""; retryN = 0;
      persist();
    } catch (e) {
      status.error = e && e.code; status.errorDetail = e && (e.summary || e.status || "");
      console.error("Dropbox:", e);
      if (e && e.code === "no_auth") hooks.onAuthLost && hooks.onAuthLost();
      if (e && (e.code === "busy" || e.code === "network")) retrySoon();
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
  // Un file per anno: "fatturato 2026.xlsx" riceve i servizi del 2026, "fatturato 2027.xlsx" quelli del 2027.
  // Un file senza anno nel nome riceve i servizi degli anni che non hanno un file proprio.
  const yearOf = (n) => { const m = /(20\d\d)/.exec(n || ""); return m ? m[1] : null; };
  function fatFiles() {
    const s = cache.settings || {};
    const files = Object.assign({}, s.files || {});
    if (s.fatturato && !Object.values(files).some((f) => f.path.toLowerCase() === s.fatturato.toLowerCase())) {
      files[yearOf(s.fatturatoNome || s.fatturato) || "*"] = { path: s.fatturato, name: s.fatturatoNome || s.fatturato.split("/").pop() };
    }
    return files;
  }
  function clientYear(files) {
    const y = String(new Date().getFullYear()), ys = Object.keys(files).filter((k) => k !== "*").sort();
    return files[y] ? y : ys.length ? ys[ys.length - 1] : files["*"] ? "*" : null;
  }
  let fatRunning = false, fatAgain = false;
  // Scrive nei file fatturato le righe in attesa e rimette quelle mancanti. Legge anche clienti e regole.
  async function syncFatturato() {
    const files = fatFiles(), years = Object.keys(files).sort();
    if (!enabled || !years.length || !hooks.rowFor || !navigator.onLine || !DBX.isLinked()) return;
    if (fatRunning) { fatAgain = true; return; }
    fatRunning = true; fatAgain = false;
    const yOfFoglio = (fg) => "20" + String(fg).slice(0, 2);
    const fileFor = (y) => (files[y] ? y : files["*"] ? "*" : null);
    // modifiche di anni senza file: non c'è dove scriverle (verranno aggiunte quando colleghi quel file)
    for (const k of Object.keys(queue.fat)) if (!fileFor(yOfFoglio(k))) delete queue.fat[k];
    const pendingNow = Object.assign({}, queue.fat);
    // righe già scritte dall'agenda: le altre righe con lo stesso numero non vanno mai sovrascritte
    if (!cache.fatWritten) { cache.fatWritten = {}; for (const d in cache.days) for (const x of Object.values(cache.days[d].doc.bookings || {})) if (x && x.foglio) cache.fatWritten[x.foglio] = 1; }
    const all = [];
    for (const d in cache.days) { const bk = cache.days[d].doc.bookings || {}; for (const id in bk) { const b = bk[id]; if (b && b.foglio) all.push(Object.assign({ id }, b, { start: b.start || d })); } }
    const report = {}; let firstErr = null;
    try {
      for (const y of years) {
        const mine = (b) => fileFor(String(b.start || "").slice(0, 4)) === y;
        const pend = {};
        for (const [k, x] of Object.entries(pendingNow)) if (fileFor(yOfFoglio(k)) === y && (x.act === "clear" || mine(x.b))) pend[k] = x;
        try {
          const r = await syncOne(files[y].path, pend, all.filter(mine), y === clientYear(files) ? queue.clients.filter((c) => !c.error) : []);
          if (r && r.lists && r.lists.bustaMax != null) { cache.bustaMax = cache.bustaMax || {}; cache.bustaMax[y] = r.lists.bustaMax; }
          report[y] = r ? { ok: true, name: files[y].name, at: Date.now() } : { ok: false, error: "missing", name: files[y].name };
          if (!r && !firstErr) firstErr = "missing";
        } catch (e) {
          report[y] = { ok: false, error: (e && e.code) || "error", name: files[y].name };
          if (!firstErr) firstErr = report[y].error;
          if (e && e.message) console.error(e);
        }
      }
    } finally {
      cache.fat = { ok: !firstErr, error: firstErr, at: Date.now(), files: report };
      fatRunning = false; persist(); changed();
    }
    if (fatAgain) syncFatturato();
  }
  async function syncOne(path, pend, ensureList, newClients) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const f = await DBX.download(path);
      if (!f) return null;
      if (!f.meta.rev) f.meta = await DBX.metadata(path);
      const res = await FAT.apply(f.buf, {
        upserts: Object.values(pend).filter((x) => x.act === "upsert").map((x) => hooks.rowFor(x.b)),
        clears: Object.entries(pend).filter(([, x]) => x.act === "clear").map(([k, x]) => ({ foglio: k, row: x.b ? hooks.rowFor(x.b) : null })),
        ensure: ensureList.map(hooks.rowFor),
        known: Object.assign({}, cache.fatShared || {}, cache.fatWritten || {}),
        newClients: (newClients || []).map((x) => ({ tmp: x.tmp, vals: x.vals })),
      });
      if (res.collisions && res.collisions.length) renumberCollisions(res.collisions);
      if (res.lists) cache.lists = Object.assign({}, cache.lists || {}, res.lists, { fogli: Array.from(new Set(((cache.lists && cache.lists.fogli) || []).concat(res.lists.fogli || []))), at: Date.now() });
      if (!res.changed) { finishFat(pend, res); finishClients(res); return res; }
      try {
        await DBX.upload(path, res.buf, { update: f.meta.rev }); finishFat(pend, res); finishClients(res);
        await shareRows(res, Object.keys(pend).filter((k) => pend[k].act === "upsert" && !(res.collisions || []).includes(k)));
        return res;
      }
      catch (e) { if (e.code !== "conflict") throw e; if (attempt === 4) throw { code: "busy" }; }
    }
  }
  // Un n. foglio dell'agenda coincide con una riga scritta a mano nel fatturato: la prenotazione prende il numero libero successivo.
  function renumberCollisions(list) {
    for (const fg of list) {
      delete queue.fat[fg];
      for (const d in cache.days) {
        const bk = cache.days[d].doc.bookings || {};
        for (const id in bk) if (bk[id] && String(bk[id].foglio) === String(fg)) queue.days.push({ date: d, ops: [{ t: "put", id, b: clone(bk[id]), assign: true, renumber: true }], at: Date.now() });
      }
    }
    persist(); kick();
  }
  // Elenco condiviso (in Dropbox) dei n. foglio scritti dall'agenda nel fatturato, uguale su tutti i dispositivi
  async function shareRows(res, upserted) {
    const add = (res.addedFogli || []).concat(upserted || []), del = res.clearedFogli || [];
    const path = P.cfg + "/righe-fatturato.json";
    for (let i = 0; i < 4; i++) {
      try {
        const f = await DBX.download(path);
        const cur = f ? (JSON.parse(dec.decode(f.buf)) || {}).fogli || {} : {};
        const before = JSON.stringify(cur);
        for (const k of add) cur[k] = 1;
        for (const k of del) delete cur[k];
        cache.fatShared = cur;
        if (JSON.stringify(cur) === before) return;
        const meta = f && !f.meta.rev ? await DBX.metadata(path) : f && f.meta;
        await DBX.upload(path, enc.encode(JSON.stringify({ fogli: cur })), f ? { update: meta.rev } : "add");
        return;
      } catch (e) { if (e.code !== "conflict") return; }
    }
  }
  // clienti scritti nel foglio "clienti": escono dalla coda e l'app riceve il codice assegnato
  function finishClients(res) {
    const done = (res.newClients || []).filter((x) => !x.error);
    // non scritto (es. codice già usato): resta in elenco con l'errore finché non lo correggi o lo elimini
    for (const x of (res.newClients || []).filter((x) => x.error)) {
      const q = queue.clients.find((c) => c.tmp === x.tmp);
      if (q) { q.error = { code: x.error, num: x.code, by: x.by }; hooks.onClientError && hooks.onClientError(x.tmp, q); }
    }
    if (!done.length) { persist(); return; }
    cache.clientDone = cache.clientDone || {};
    for (const x of done) {
      const q = queue.clients.find((c) => c.tmp === x.tmp);
      cache.clientDone[x.tmp] = { code: x.code, existed: !!x.existed, name: q && q.name, at: Date.now() };
      queue.clients = queue.clients.filter((c) => c.tmp !== x.tmp);
      hooks.onClientAdded && hooks.onClientAdded(x.tmp, cache.clientDone[x.tmp]);
    }
    persist();
  }
  // nuovo cliente: va in coda e viene scritto nel file fatturato (subito se c'è la connessione)
  function dropClient(tmp) { queue.clients = queue.clients.filter((c) => c.tmp !== tmp); persist(); changed(); }
  function addClient(vals, name) {
    const tmp = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    queue.clients.push({ tmp, vals, name, at: Date.now() });
    persist(); changed(); syncFatturato();
    return tmp;
  }
  function finishFat(done, res) {
    for (const k in done) {
      if (res.collisions && res.collisions.includes(k)) continue;
      if (done[k].act === "upsert") cache.fatWritten[k] = 1; else delete cache.fatWritten[k];
    }
    for (const k in done) if (queue.fat[k] && JSON.stringify(queue.fat[k]) === JSON.stringify(done[k])) delete queue.fat[k];
    for (const k of res.addedFogli || []) cache.fatWritten[k] = 1;
  }

  // ---------- configurazione ----------
  async function putJSON(path, obj) { await DBX.upload(path, enc.encode(JSON.stringify(obj, null, 1)), "overwrite"); }
  async function setFleet(vehicles, changedIds) {
    cache.fleet = { vehicles };
    if (changedIds && changedIds.length) {
      for (const d in cache.days) for (const [id, b] of Object.entries(cache.days[d].doc.bookings || {}))
        if (b && b.foglio && changedIds.includes(b.vehicle)) queue.fat[b.foglio] = { act: "upsert", b: Object.assign({ id }, b, { start: b.start || d }) };
    }
    persist(); changed(); syncFatturato();
    try { await putJSON(P.cfg + "/flotta.json", cache.fleet); } catch (e) { status.error = e.code; emitStatus(); throw e; }
  }
  async function setSettings(s) { cache.settings = Object.assign({}, cache.settings || {}, s); await putJSON(P.cfg + "/impostazioni.json", cache.settings); persist(); changed(); }
  // collega un file fatturato: vale per l'anno scritto nel nome (o per tutti se non c'è un anno)
  async function linkFatturato(path, name) {
    const files = fatFiles(); files[yearOf(name) || "*"] = { path, name };
    await setSettings({ fatturato: path, fatturatoNome: name, files });
  }
  async function setAccess(a) { await putJSON(P.cfg + "/accesso.json", a); cache.access = a; persist(); }

  async function saveSheetFile(name, blob, year) {
    const folder = P.sheets + "/" + year;
    await DBX.createFolder(P.sheets).catch(() => {});
    await DBX.createFolder(folder).catch(() => {});
    return DBX.upload(folder + "/" + name, blob, "overwrite");
  }

  function reset() { cache = { days: {}, cursor: null, fleet: null, settings: null, access: null, lists: null, fat: null }; queue = { days: [], fat: {}, clients: [] }; persist(); }

  window.STORE = {
    BASE, P,
    configure(h) { Object.assign(hooks, h); },
    enable() { enabled = true; },
    disable() { enabled = false; },
    fileFogli,
    view, mutateDay, pull, flush, watch, setupFolders, syncFatturato,
    setFleet, setSettings, linkFatturato, fatFiles, setAccess, saveSheetFile, reset, addClient, dropClient,
    bustaMax: (y) => { const m = cache.bustaMax || {}; return m[y] != null ? m[y] : m["*"] || 0; },
    get pendingClients() { return queue.clients.slice(); },
    clientDone: (tmp) => (cache.clientDone || {})[tmp] || null,
    get fleet() { return cache.fleet && cache.fleet.vehicles; },
    get settings() { return cache.settings; },
    get access() { return cache.access; },
    get lists() { return cache.lists; },
    get fat() { return cache.fat; },
    get pending() { return queue.days.length + Object.keys(queue.fat).length + queue.clients.filter((c) => !c.error).length; },
    get hasData() { return !!cache.cursor; },
    status: () => Object.assign({ pending: queue.days.length, fatPending: Object.keys(queue.fat).length + queue.clients.filter((c) => !c.error).length, fat: cache.fat }, status),
  };
})();
