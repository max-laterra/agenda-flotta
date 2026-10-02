// Archivio dell'agenda su Dropbox, con copia sul dispositivo per lavorare anche offline.
//
// Cartella (uguale su tutti i dispositivi):
//   /Agenda Flotta La Terra/giorni/AAAA/AAAA-MM-GG.json   prenotazioni e autisti extra del giorno
//   /Agenda Flotta La Terra/config/flotta.json            mezzi, targhe
//   /Agenda Flotta La Terra/config/impostazioni.json      percorso del file fatturato
//   /Agenda Flotta La Terra/config/accesso.json           codice di accesso (fino alla 1.7.1)
//   /Agenda Flotta La Terra/config/utenti.json            utenti (1.8): nomi, ruoli, impronte delle password
//   /Agenda Flotta La Terra - registro/...                registro accessi e modifiche, dispositivi (vedi accessi.js)
//   /Agenda Flotta La Terra/Fogli di servizio/AAAA/...    PDF ed Excel dei fogli di servizio
//
// Copia sul dispositivo (1.7): le giornate stanno in IndexedDB (spazio ampio), la coda delle modifiche
// da inviare nel localStorage (piccola, salvata subito a ogni modifica).
(function () {
  "use strict";
  const C = window.AGENDA_CONFIG || {};
  const BASE = (C.folder || "/Agenda Flotta La Terra").replace(/\/+$/, "");
  const P = { days: BASE + "/giorni", cfg: BASE + "/config", sheets: BASE + "/Fogli di servizio" };
  const CK = "agenda-cache-v1", QK = "agenda-queue-v1";
  const enc = new TextEncoder(), dec = new TextDecoder();
  const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  const pad = (n) => String(n).padStart(2, "0");
  const DATE_RE = /^(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  const validDate = (d) => DATE_RE.test(String(d || ""));
  const emptyCache = () => ({ days: {}, cursor: null, fleet: null, settings: null, access: null, users: null, regs: null, lists: null, fat: null });

  let cache = emptyCache();
  let queue = loadLS(QK, { days: [], fat: {}, clients: [] });
  if (!Array.isArray(queue.days)) queue.days = [];
  if (!queue.fat || typeof queue.fat !== "object") queue.fat = {};
  if (!Array.isArray(queue.clients)) queue.clients = [];
  function loadLS(k, d) { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v && typeof v === "object" ? Object.assign(d || {}, v) : d; } catch (_) { return d; } }

  const hooks = { onChange() {}, onStatus() {}, onAccessChanged() {}, onUsersChanged() {}, onNotice() {}, rowFor: null };
  const status = { online: navigator.onLine, syncing: false, error: null, lastSync: null, storage: null };
  function counts() { return { pending: queue.days.length, fatPending: Object.keys(queue.fat).length + queue.clients.filter((c) => !c.failed).length }; }
  function emitStatus() { hooks.onStatus(Object.assign(counts(), { fat: cache.fat }, status)); }
  function notice(n) { try { hooks.onNotice(n); } catch (_) {} }

  // ---------- salvataggio sul dispositivo ----------
  let idb = null, writesBlocked = false, saveTimer = null, dirtyMeta = false, dirtyAll = false;
  const dirtyDays = new Set();
  function idbOpen() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error("noidb"));
      let r; try { r = indexedDB.open("agenda-laterra", 1); } catch (e) { return rej(e); }
      r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains("days")) db.createObjectStore("days"); if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta"); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error || new Error("idb"));
      r.onblocked = () => rej(new Error("blocked"));
    });
  }
  function idbReadAll() {
    return new Promise((res, rej) => {
      const t = idb.transaction(["days", "meta"], "readonly"), days = {}; let meta = null;
      t.objectStore("meta").get("cache").onsuccess = (e) => { meta = e.target.result || null; };
      t.objectStore("days").openCursor().onsuccess = (e) => { const c = e.target.result; if (c) { days[c.key] = c.value; c.continue(); } };
      t.oncomplete = () => res({ meta, days });
      t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  }
  let readyP = null;
  // da chiamare una volta all'avvio: carica la copia locale
  function ready() {
    return readyP || (readyP = (async () => {
      // la coda si rilegge adesso: un'altra finestra può averla cambiata dopo il caricamento della pagina
      queue = loadLS(QK, { days: [], fat: {}, clients: [] });
      if (!Array.isArray(queue.days)) queue.days = [];
      if (!queue.fat || typeof queue.fat !== "object") queue.fat = {};
      if (!Array.isArray(queue.clients)) queue.clients = [];
      try {
        idb = await idbOpen();
        const { meta, days } = await idbReadAll();
        if (meta) { cache = Object.assign(emptyCache(), meta, { days }); }
        else {
          // prima apertura con la 1.7: si riprende la copia della 1.6 (localStorage)
          const old = loadLS(CK, null);
          if (old) { cache = Object.assign(emptyCache(), old); cache.days = cache.days || {}; dirtyAll = true; dirtyMeta = true; await writeNow(); }
        }
        try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (_) {}
      } catch (e) {
        idb = null; status.storage = "noidb";
        const old = loadLS(CK, null); if (old) cache = Object.assign(emptyCache(), old);
      }
      try { cleanCache(); } catch (_) { cache = emptyCache(); }
      status.lastSync = cache.lastSync || null;
    })());
  }
  function saveQueue() {
    if (writesBlocked) return;
    try { localStorage.setItem(QK, JSON.stringify(queue)); if (status.storage === "queue") status.storage = null; }
    catch (_) { status.storage = "queue"; }
  }
  // dates: giornate cambiate ("all" = tutte). La coda si salva subito, la copia delle giornate poco dopo.
  function persist(dates) {
    saveQueue();
    if (writesBlocked) return;
    if (dates === "all") dirtyAll = true; else if (dates) for (const d of dates) dirtyDays.add(d);
    dirtyMeta = true;
    clearTimeout(saveTimer); saveTimer = setTimeout(writeNow, 250);
  }
  function metaObj() { const m = Object.assign({}, cache); delete m.days; return m; }
  async function writeNow() {
    clearTimeout(saveTimer); saveTimer = null;
    if (writesBlocked || (!dirtyMeta && !dirtyDays.size && !dirtyAll)) return;
    if (!idb) {
      try { localStorage.setItem(CK, JSON.stringify(cache)); if (status.storage === "full") status.storage = "noidb"; }
      catch (_) { status.storage = "full"; emitStatus(); }
      dirtyMeta = dirtyAll = false; dirtyDays.clear(); return;
    }
    const days = dirtyAll ? Object.keys(cache.days) : [...dirtyDays];
    const wasAll = dirtyAll;
    dirtyMeta = dirtyAll = false; dirtyDays.clear();
    await new Promise((res) => {
      let t;
      try {
        t = idb.transaction(["days", "meta"], "readwrite");
        const ds = t.objectStore("days");
        if (wasAll) ds.clear();
        for (const d of days) { if (cache.days[d]) ds.put(cache.days[d], d); else ds.delete(d); }
        t.objectStore("meta").put(metaObj(), "cache"); // giornate e punto di lettura nella stessa transazione
      } catch (e) { status.storage = "full"; emitStatus(); return res(); }
      t.oncomplete = () => { if (status.storage === "full") { status.storage = null; emitStatus(); } try { localStorage.removeItem(CK); } catch (_) {} res(); };
      t.onerror = t.onabort = () => { status.storage = "full"; for (const d of days) dirtyDays.add(d); dirtyMeta = true; emitStatus(); res(); };
    });
  }

  // ---------- giornate ----------
  const dayPath = (date) => P.days + "/" + date.slice(0, 4) + "/" + date + ".json";
  const emptyDay = (date) => ({ date, month: date.slice(0, 7), bookings: {}, extra: "", seq: 0 });
  const yymmdd = (d) => d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10);
  const nnOf = (f) => parseInt(String(f || "").slice(6), 10) || 0;
  const same = (a, b) => JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b);

  // unione di due testi a righe (autisti extra): tiene le righe aggiunte da entrambi
  function merge3(base, mine, theirs) {
    const L = (t) => String(t || "").split("\n");
    const B = L(base), M = L(mine), T = L(theirs);
    const removed = B.filter((x) => x.trim() && !M.includes(x)), added = M.filter((x) => x.trim() && !B.includes(x));
    const out = T.filter((x) => !removed.includes(x));
    for (const a of added) if (!out.includes(a)) out.push(a);
    while (out.length && !out[out.length - 1].trim()) out.pop();
    return out.join("\n");
  }

  // Applica le operazioni a una giornata. In remoto (strict) riassegna il n. foglio se un altro
  // dispositivo lo ha già usato e controlla le modifiche fatte nel frattempo da altri.
  // Restituisce le variazioni per il fatturato e gli avvisi per l'utente.
  function applyOps(doc, ops, strict) {
    const fat = [], notes = [], movesGone = [];
    doc.bookings = doc.bookings && typeof doc.bookings === "object" ? doc.bookings : {};
    for (const op of ops) {
      if (op.t === "put") {
        const prev = doc.bookings[op.id];
        // modifica di una prenotazione che qui non c'è più: eliminata o spostata da un altro dispositivo
        if (strict && op.edit && !op.move && !prev) { notes.push({ kind: "gone", id: op.id, client: op.b && op.b.client, date: doc.date }); continue; }
        let b = clone(op.b);
        if (strict && op.edit && prev && Array.isArray(op.patch) && (prev.updatedAt || null) !== (op.base || null)) {
          // qualcun altro l'ha modificata dopo che il modulo era stato aperto: si tengono le sue modifiche
          // e si applicano solo i campi cambiati qui
          const merged = clone(prev), clash = [];
          for (const k of op.patch) { merged[k] = clone(op.b[k]); }
          merged.updatedAt = op.b.updatedAt;
          if (op.assign && op.b.foglio) merged.foglio = op.b.foglio;
          b = merged;
          notes.push({ kind: "merged", id: op.id, client: b.client, date: doc.date, fields: op.patch.slice(), clash });
        }
        const pre = yymmdd(doc.date);
        // una modifica non cambia mai il n. foglio: resta quello già assegnato (magari rinumerato nel frattempo)
        if (op.edit && !op.assign && prev && prev.foglio) b.foglio = prev.foglio;
        if (op.assign || !b.foglio) {
          if (!op.renumber && prev && prev.foglio && String(prev.foglio).slice(0, 6) === pre) {
            b.foglio = prev.foglio; // già numerata (per esempio invio ripetuto dopo un errore di rete): non si rinumera
          } else {
            const used = Object.entries(doc.bookings).filter(([k, x]) => x && k !== op.id).map(([, x]) => String(x.foglio || ""));
            const ext = fileFogli(pre);
            const taken = new Set(used.concat(ext, op.renumber && prev ? [String(prev.foglio)] : []));
            const next = Math.max(doc.seq || 0, 0, ...used.map(nnOf), ...ext.map(nnOf)) + 1;
            let nn = nnOf(b.foglio);
            if (!b.foglio || String(b.foglio).slice(0, 6) !== pre || (strict && (nn < next || taken.has(String(b.foglio))))) {
              if (strict && b.foglio && String(b.foglio).slice(0, 6) === pre && op.b && op.b.foglio !== pre + pad(next)) notes.push({ kind: "renumbered", id: op.id, client: b.client, from: String(b.foglio), to: pre + pad(next), date: doc.date });
              nn = next; b.foglio = pre + pad(nn);
            }
            doc.seq = Math.max(doc.seq || 0, nn);
          }
        }
        // se la prenotazione cambia numero, la riga vecchia si svuota; non quando il numero era di una riga scritta a mano
        if (prev && prev.foglio && prev.foglio !== b.foglio && !op.renumber) fat.push({ act: "clear", foglio: prev.foglio, b: Object.assign({ id: op.id }, prev) });
        doc.bookings[op.id] = b;
        fat.push({ act: "upsert", foglio: b.foglio, b: Object.assign({ id: op.id }, b) });
      } else if (op.t === "del") {
        const prev = doc.bookings[op.id];
        if (!prev) {
          if (strict && op.move) movesGone.push(op.id);
          else if (strict && op.client != null) notes.push({ kind: "delGone", id: op.id, client: op.client, date: doc.date }); // spostata da altri: non eliminata
          continue;
        }
        if (prev.foglio) fat.push({ act: "clear", foglio: prev.foglio, moved: op.move || null, b: Object.assign({ id: op.id }, prev, { start: prev.start || doc.date }) });
        delete doc.bookings[op.id];
      } else if (op.t === "extra") {
        const cur = doc.extra || "";
        if (strict && op.base != null && cur !== op.base && cur !== op.v) { doc.extra = merge3(op.base, op.v, cur); notes.push({ kind: "extraMerged", date: doc.date }); }
        else doc.extra = op.v;
      }
    }
    return { fat, notes, movesGone };
  }

  // n. foglio già presenti nel file fatturato per quella data (anche quelli scritti a mano)
  function fileFogli(pre) { return ((cache.lists && cache.lists.fogli) || []).map(String).filter((f) => f.slice(0, 6) === pre); }

  // Vista corrente: dati di Dropbox + modifiche non ancora inviate.
  // Le giornate senza modifiche in coda sono condivise (da non modificare), le altre sono copie.
  function view() {
    const out = {};
    for (const d in cache.days) out[d] = cache.days[d].doc;
    const copied = new Set();
    for (const item of queue.days) {
      if (!copied.has(item.date)) { out[item.date] = out[item.date] ? clone(out[item.date]) : emptyDay(item.date); copied.add(item.date); }
      applyOps(out[item.date], item.ops, false);
    }
    return out;
  }
  function changed() { hooks.onChange(); emitStatus(); }

  function mutateDay(date, ops) {
    if (!validDate(date)) throw { code: "baddate" };
    queue.days.push({ qid: newQid(), date, ops: clone(ops), at: Date.now() });
    persist(); changed(); kick();
  }
  const newQid = () => "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  // la prenotazione ha ancora modifiche da inviare (quindi il n. foglio non è ancora confermato)
  function isPending(id) { return queue.days.some((it) => it.ops.some((op) => op.id === id)); }
  function whenSent(id, ms) {
    return new Promise((res) => { const t0 = Date.now(); (function loop() { if (!isPending(id)) return res(true); if (Date.now() - t0 > ms || !navigator.onLine) return res(false); setTimeout(loop, 150); })(); });
  }

  // ---------- invio delle modifiche ----------
  let flushing = false;
  let enabled = false;
  const transient = (e) => e && ["busy", "network", "no_auth", "scope"].includes(e.code);
  async function sendItem(item) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const path = dayPath(item.date);
      const cur = await DBX.download(path);
      if (cur && !cur.meta.rev) cur.meta = await DBX.metadata(path); // il browser non ha ricevuto la versione del file
      let doc = null;
      if (cur) {
        try { doc = cleanDoc(parseJSON(cur.buf), item.date); if (!doc) throw 0; }
        catch (_) {
          // file della giornata rovinato: se ne conserva una copia e si riparte dall'ultima versione buona
          await DBX.upload(P.cfg + "/file-rovinati/" + item.date + "-" + (cur.meta.rev || Date.now()) + ".json", new Uint8Array(cur.buf), "add").catch(() => {});
          doc = clone((cache.days[item.date] && cache.days[item.date].doc) || emptyDay(item.date));
          notice({ kind: "badfile", date: item.date });
        }
      }
      if (!doc) doc = emptyDay(item.date);
      doc.date = item.date; doc.month = item.date.slice(0, 7);
      // già applicata? (invio precedente arrivato a Dropbox ma risposta persa per la rete): non si ripete
      if (item.qid && Array.isArray(doc.applied) && doc.applied.includes(item.qid) && item.tried) {
        cache.days[item.date] = { doc, rev: cur.meta.rev };
        for (const f of item.tried.fat) queue.fat[f.foglio] = { act: f.act, b: f.b, moved: f.moved || null };
        return item.tried;
      }
      const r = applyOps(doc, item.ops, true);
      if (item.qid) { doc.applied = (Array.isArray(doc.applied) ? doc.applied : []).concat(item.qid).slice(-40); item.tried = r; saveQueue(); }
      try {
        const meta = await DBX.upload(path, enc.encode(JSON.stringify(doc)), cur ? { update: cur.meta.rev } : "add");
        cache.days[item.date] = { doc, rev: meta.rev };
        for (const f of r.fat) queue.fat[f.foglio] = { act: f.act, b: f.b, moved: f.moved || null };
        return r;
      } catch (e) {
        if (e.code !== "conflict") throw e; // un altro dispositivo ha scritto: si rilegge e si riprova
      }
    }
    throw { code: "busy" };
  }
  async function flush() {
    if (!enabled || flushing || !navigator.onLine || !DBX.isLinked()) return;
    flushing = true; status.syncing = true; emitStatus();
    const skip = new Set(); let failed = null;
    try {
      let i = 0;
      while (i < queue.days.length) {
        const item = queue.days[i];
        if (skip.has(item.date)) { i++; continue; }
        let r;
        try { r = await sendItem(item); }
        catch (e) {
          if (transient(e)) throw e;
          // errore che non passa riprovando: si lascia in coda questa giornata e si continua con le altre
          item.fails = (item.fails || 0) + 1; skip.add(item.date); i++;
          failed = { date: item.date, detail: (e && (e.summary || e.message || e.code)) || String(e) };
          saveQueue(); continue;
        }
        const idx = queue.days.indexOf(item); if (idx >= 0) queue.days.splice(idx, 1);
        // spostamento non riuscito: la prenotazione non c'era più sul giorno di partenza
        for (const id of r.movesGone) {
          for (const it of queue.days) it.ops = it.ops.filter((op) => !(op.id === id && op.t === "put" && op.move));
          r.notes.push({ kind: "gone", id, date: item.date });
        }
        queue.days = queue.days.filter((it) => it.ops.length);
        persist([item.date]); changed();
        for (const n of r.notes) notice(n);
      }
      status.error = failed ? "day" : null; status.errorDetail = failed ? failed.date + ": " + String(failed.detail).slice(0, 200) : ""; retryN = 0;
      if (failed) retrySoon();
    } catch (e) {
      status.error = (e && e.code) || "error"; status.errorDetail = e && (e.summary || e.status || e.message || "");
      if (e && e.code === "no_auth") hooks.onAuthLost && hooks.onAuthLost();
      if (e && (e.code === "busy" || e.code === "network" || e.code === "api")) retrySoon();
    } finally {
      flushing = false; status.syncing = false; emitStatus();
    }
    if (Object.keys(queue.fat).length || queue.clients.some((c) => !c.failed)) syncFatturato();
  }

  // nuovi tentativi ravvicinati dopo un errore temporaneo: 3 s, 10 s, 30 s, poi ogni minuto
  let retryN = 0, retryTimer = null;
  function retrySoon() {
    if (retryTimer) return; // un nuovo tentativo è già in programma
    const d = [3000, 10000, 30000, 60000][Math.min(retryN++, 3)];
    retryTimer = setTimeout(async () => { retryTimer = null; await flush(); await pull(); }, d);
  }

  // esegue fn su tutti gli elementi, al massimo n alla volta; al primo errore smette e lo rilancia
  async function pool(items, n, fn) {
    let i = 0, err = null;
    const worker = async () => { while (!err && i < items.length) { const x = items[i++]; try { await fn(x); } catch (e) { err = err || e; } } };
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
    if (err) throw err;
  }
  // (le chiavi "__proto__" di un file scritto apposta vengono scartate: non devono cambiare il comportamento degli oggetti)
  function parseJSON(buf) { try { const j = JSON.parse(dec.decode(buf), (k, v) => (k === "__proto__" ? undefined : v)); return j && typeof j === "object" ? j : null; } catch (_) { return null; } }

  // ---------- controllo dei dati letti da Dropbox o dal dispositivo (2.1) ----------
  // Un file scritto male (a mano, da un altro programma o apposta) non deve mai bloccare l'app né farle
  // eseguire codice: di ogni file si tiene solo quello che ha la forma giusta, il resto si scarta.
  const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
  const badKey = (k) => k === "__proto__" || k === "constructor" || k === "prototype";
  const txt = (v, max) => (typeof v === "string" ? v : typeof v === "number" && isFinite(v) ? String(v) : "").slice(0, max || 20000);
  // flotta: solo mezzi veri, con un id semplice (lettere, numeri, - _ .) e i campi del tipo giusto
  function cleanFleet(list) {
    if (!Array.isArray(list)) return null;
    const out = [], seen = new Set();
    for (const v of list) {
      if (!isObj(v)) continue;
      const id = txt(v.id, 60);
      if (!/^[A-Za-z0-9_.-]{1,40}$/.test(id) || seen.has(id)) continue;
      seen.add(id);
      const n = Number(v.seats);
      const o = Object.assign({}, v, { id, name: txt(v.name, 60), plate: txt(v.plate, 20), kind: v.kind === "van" || v.kind === "auto" ? v.kind : "bus", seats: isFinite(n) && n > 0 && n < 1000 ? Math.round(n) : 0, h: !!v.h });
      if ("xcat" in v) o.xcat = txt(v.xcat, 60);
      if ("num" in v) o.num = txt(v.num, 20);
      if ("ord" in v) { const r = Number(v.ord); if (isFinite(r)) o.ord = r; else delete o.ord; }
      out.push(o);
    }
    return out;
  }
  let fleetRaw = null, fleetOk = null;
  function fleetView() {
    const raw = cache.fleet && cache.fleet.vehicles;
    if (raw !== fleetRaw) { fleetRaw = raw; fleetOk = cleanFleet(raw); }
    return fleetOk && fleetOk.length ? fleetOk : null;
  }
  // utenti: solo quelli completi (nome, impronta della password della forma giusta, numero di passaggi ragionevole)
  const ITER_MIN = 10000, ITER_MAX = 2000000;
  function cleanUsers(j) {
    if (!isObj(j) || !isObj(j.users)) return null;
    // Se anche un solo utente non ha la forma giusta l'elenco intero non vale (resta l'ultimo buono e non
    // si riscrive niente): scartare in silenzio l'utente guasto vorrebbe dire eliminarlo al primo salvataggio.
    const users = {}, when = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]{5,12}Z?$/.test(v) ? v : "");
    for (const id of Object.keys(j.users)) {
      const u = j.users[id];
      if (badKey(id) || !/^[\w.-]{1,60}$/.test(id) || !isObj(u)) return null;
      const name = txt(u.name, 80).trim(), it = u.iter == null ? 150000 : Number(u.iter);
      if (!name || !/^[0-9a-f]{16,128}$/i.test(txt(u.salt, 200)) || !/^[0-9a-f]{64}$/i.test(txt(u.hash, 200)) || !Number.isInteger(it) || it < ITER_MIN || it > ITER_MAX) return null;
      users[id] = Object.assign({}, u, { name, role: u.role === "master" ? "master" : "utente", active: u.active !== false, iter: it, pwAt: when(u.pwAt), created: when(u.created), createdBy: txt(u.createdBy, 80) });
    }
    if (!Object.values(users).some((u) => u.role === "master" && u.active)) return null; // un elenco senza Master attivo non è mai scritto dall'app
    const map = (m, f) => { const o = {}; if (isObj(m)) for (const k of Object.keys(m)) { if (badKey(k) || k.length > 80) continue; const v = f(m[k]); if (v != null) o[k] = v; } return o; };
    return Object.assign({}, j, {
      users,
      kicks: map(j.kicks, (v) => (typeof v === "string" ? v.slice(0, 40) : null)),
      blocked: map(j.blocked, (v) => (isObj(v) ? { at: txt(v.at, 40), by: txt(v.by, 80) } : v ? { at: "", by: "" } : null)),
      devices: map(j.devices, (v) => (isObj(v) ? { label: txt(v.label, 40) } : null)),
    });
  }
  // impostazioni: file fatturato collegati (percorso dentro la cartella dell'app), permessi, uscita automatica
  function cleanSettings(j) {
    if (!isObj(j)) return null;
    const o = Object.assign({}, j), files = {};
    const okPath = (p) => typeof p === "string" && p.startsWith("/") && p.length < 400 && !/(^|\/)\.\.(\/|$)/.test(p);
    if (isObj(j.files)) for (const y of Object.keys(j.files)) { const f = j.files[y]; if (/^(\*|\d{4})$/.test(y) && isObj(f) && okPath(f.path)) files[y] = Object.assign({}, f, { path: f.path, name: txt(f.name, 200) || f.path.split("/").pop() }); }
    o.files = files;
    o.fatturato = okPath(j.fatturato) ? j.fatturato : "";
    o.fatturatoNome = txt(j.fatturatoNome, 200);
    o.perms = isObj(j.perms) ? j.perms : {};
    const al = Number(j.autoLock); o.autoLock = isFinite(al) && al >= 0 && al <= 1440 ? al : 0;
    o.googleKey = txt(j.googleKey, 200);
    return o;
  }
  const mastersIn = (J) => Object.values((J && J.users) || {}).filter((u) => u && u.role === "master" && u.active !== false).length;
  // giornate: ogni prenotazione deve essere un oggetto, con testi, numeri ed elenchi del tipo giusto
  const B_TXT = ["type", "vehicle", "start", "end", "time", "time2", "client", "route", "event", "escort", "driver", "driver2", "contact", "contactName", "contactRole", "contactNote", "status", "notes", "saldo", "npark", "ndriver", "n3h", "nextra", "envelope", "envno", "updatedAt", "by", "byAt", "updBy"];
  const B_VAL = ["pax", "price", "park", "meals", "advance", "saldoAmt", "clientCode", "foglio"]; // numero o testo
  const B_ROWS = ["refs", "guides", "hotels", "dnotes"];
  function cleanBooking(b, date) {
    if (!isObj(b)) return null;
    for (const k of B_TXT) if (k in b && typeof b[k] !== "string") b[k] = txt(b[k]);
    for (const k of B_VAL) if (k in b && typeof b[k] !== "string" && !(typeof b[k] === "number" && isFinite(b[k]))) b[k] = "";
    for (const k of B_ROWS) if (k in b) b[k] = Array.isArray(b[k]) ? b[k].filter(isObj).map((r) => { for (const f of Object.keys(r)) if (typeof r[f] !== "string") r[f] = txt(r[f]); return r; }) : [];
    if ("program" in b && typeof b.program !== "string") b.program = Array.isArray(b.program) ? b.program.map((x) => txt(x)) : [];
    if ("start" in b && !validDate(b.start) && validDate(date)) b.start = date;
    if (b.end && !validDate(b.end)) b.end = "";
    return b;
  }
  function cleanDoc(doc, date) {
    if (!isObj(doc)) return null;
    const bk = {};
    if (isObj(doc.bookings)) for (const id of Object.keys(doc.bookings)) { if (badKey(id) || id.length > 80) continue; const b = cleanBooking(doc.bookings[id], date); if (b) bk[id] = b; }
    doc.bookings = bk;
    if (validDate(date)) { doc.date = date; doc.month = date.slice(0, 7); } // la data è quella del nome del file
    if ("extra" in doc && typeof doc.extra !== "string") doc.extra = txt(doc.extra);
    doc.seq = typeof doc.seq === "number" && isFinite(doc.seq) && doc.seq >= 0 ? Math.floor(doc.seq) : 0;
    if ("applied" in doc) doc.applied = Array.isArray(doc.applied) ? doc.applied.filter((x) => typeof x === "string") : [];
    return doc;
  }
  // anagrafiche: solo le righe che sono oggetti, con testi; tendine: solo elenchi di testi
  function cleanReg(kind, j) {
    if (!isObj(j)) return null;
    if (kind === "tendine") { const o = Object.assign({}, j); for (const k of Object.keys(TENDINE)) if (k in o) o[k] = Array.isArray(o[k]) ? [...new Set(o[k].filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim().slice(0, 200)))] : TENDINE[k].slice(); return o; }
    const rows = Array.isArray(j.rows) ? j.rows.filter(isObj).map((r) => { for (const f of Object.keys(r)) if (typeof r[f] !== "string") r[f] = txt(r[f], 500); return r; }) : [];
    rows.forEach((r, i) => { if (!r.id) r.id = "x" + i; }); // righe scritte a mano senza id
    return Object.assign({}, j, { rows });
  }
  // copia sul dispositivo: stesse regole (può venire da una versione precedente o essere stata toccata a mano)
  function cleanCache() {
    if (!isObj(cache.days)) cache.days = {};
    for (const d of Object.keys(cache.days)) { const e = cache.days[d], doc = validDate(d) && isObj(e) ? cleanDoc(e.doc, d) : null; if (doc) e.doc = doc; else delete cache.days[d]; }
    if (cache.users) cache.users = cleanUsers(cache.users);
    if (cache.fleet && !isObj(cache.fleet)) cache.fleet = null;
    if (cache.settings) cache.settings = cleanSettings(cache.settings);
    if (cache.fatShared && !isObj(cache.fatShared)) cache.fatShared = {};
    if (cache.fatGone && !isObj(cache.fatGone)) cache.fatGone = {};
    if (cache.fatWritten && !isObj(cache.fatWritten)) cache.fatWritten = null;
    if (cache.lists && !isObj(cache.lists)) cache.lists = null;
    if (cache.regs) { const g = {}; if (isObj(cache.regs)) for (const k of Object.keys(REGF)) { const c = cache.regs[k] ? cleanReg(k, cache.regs[k]) : null; if (c) g[k] = c; } cache.regs = Object.keys(g).length ? g : null; }
    queue.days = queue.days.filter((it) => isObj(it) && validDate(it.date) && Array.isArray(it.ops)).map((it) => { it.ops = it.ops.filter((op) => isObj(op) && (op.t === "extra" || (typeof op.id === "string" && !badKey(op.id) && (op.t === "del" || (op.t === "put" && isObj(op.b)))))); return it; });
    queue.clients = queue.clients.filter(isObj);
  }

  // ---------- lettura delle modifiche degli altri dispositivi ----------
  // pull() restituisce true se la lettura è riuscita (se ce n'è già una in corso, aspetta quella)
  let pulling = false, pullP = null, lastPullOk = 0;
  function pull() {
    if (pullP) return pullP;
    pullP = pullOnce().finally(() => { pullP = null; });
    return pullP;
  }
  async function pullOnce() {
    if (!enabled || !navigator.onLine || !DBX.isLinked()) return false;
    pulling = true;
    let touched = false, ok = false;
    const changedDays = [];
    try {
      let res, from = cache.cursor;
      try { res = await DBX.listFolder(BASE, from); }
      catch (e) { if (e.code === "reset") { from = null; res = await DBX.listFolder(BASE, null); } else throw e; }
      if (res === null) { await setupFolders(); res = await DBX.listFolder(BASE, null); }
      const seen = new Map(); let next = null;
      while (res) {
        for (const e of res.entries) seen.set((e.path_lower || "").toLowerCase(), e);
        next = res.cursor;
        res = res.has_more ? await DBX.listFolder(BASE, res.cursor) : null;
      }
      const jobs = [];
      for (const [p, e] of seen) {
        const m = /\/giorni\/\d{4}\/(\d{4}-\d{2}-\d{2})\.json$/.exec(p);
        if (m) {
          const date = m[1];
          if (!validDate(date)) continue; // nome di file che non è una data vera (es. 9999-99-99.json)
          if (e[".tag"] === "deleted") { if (cache.days[date]) { delete cache.days[date]; changedDays.push(date); touched = true; } continue; }
          if (e[".tag"] !== "file" || (cache.days[date] && cache.days[date].rev === e.rev)) continue;
          jobs.push({ date, e });
        }
      }
      // giornate: 4 download alla volta
      await pool(jobs, 4, async ({ date, e }) => {
        const f = await DBX.download(e.path_lower);
        if (!f) return;
        const doc = cleanDoc(parseJSON(f.buf), date);
        if (!doc) { cache.bad = Object.assign({}, cache.bad, { [date]: e.rev }); notice({ kind: "badfile", date }); return; } // si tiene l'ultima versione buona
        if (cache.bad && cache.bad[date]) { delete cache.bad[date]; }
        cache.days[date] = { doc, rev: f.meta.rev || e.rev }; changedDays.push(date); touched = true;
      });
      for (const [p, e] of seen) {
        if (e[".tag"] !== "file") continue;
        const isCfg = (n) => p === (P.cfg + "/" + n).toLowerCase();
        const regKind = Object.keys(REGF).find((k) => isCfg(REGF[k]));
        if (!(regKind || isCfg("flotta.json") || isCfg("righe-fatturato.json") || isCfg("impostazioni.json") || isCfg("accesso.json") || isCfg("utenti.json"))) continue;
        const f = await DBX.download(e.path_lower); if (!f) continue;
        const j = parseJSON(f.buf); if (!j) { notice({ kind: "badcfg", path: e.path_display || p }); continue; }
        if (isCfg("flotta.json")) { if (isObj(j)) { cache.fleet = j; touched = true; } else notice({ kind: "badcfg", path: e.path_display || p }); }
        else if (isCfg("righe-fatturato.json")) { cache.fatShared = isObj(j.fogli) ? j.fogli : {}; cache.fatGone = isObj(j.tolti) ? j.tolti : {}; }
        else if (isCfg("impostazioni.json")) { const cs = cleanSettings(j); if (cs) { cache.settings = cs; touched = true; } else notice({ kind: "badcfg", path: e.path_display || p }); }
        else if (isCfg("accesso.json")) { if (!isObj(j)) continue; const was = cache.access; cache.access = j; if (was && was.hash !== j.hash) hooks.onAccessChanged(); touched = true; }
        else if (regKind) { const c = cleanReg(regKind, j); if (c) { cache.regs = Object.assign({}, cache.regs || {}, { [regKind]: c }); touched = true; } else notice({ kind: "badcfg", path: e.path_display || p }); }
        else if (isCfg("utenti.json")) { const cu = cleanUsers(j); if (cu) { cache.users = cu; usersSeen = true; try { hooks.onUsersChanged(cu); } catch (_) {} touched = true; } else notice({ kind: "badcfg", path: e.path_display || p }); } // elenco non valido: resta l'ultimo buono
      }
      cache.cursor = next; // solo adesso: tutte le voci sono state lette davvero
      cache.lastSync = status.lastSync = Date.now(); status.error = null; status.errorDetail = ""; retryN = 0;
      persist(changedDays); ok = true; lastPullOk = Date.now();
    } catch (e) {
      lastPullOk = 0;
      status.error = (e && e.code) || "error"; status.errorDetail = e && (e.summary || e.status || e.message || "");
      console.error("Dropbox:", e);
      if (e && e.code === "no_auth") hooks.onAuthLost && hooks.onAuthLost();
      if (e && (e.code === "busy" || e.code === "network")) retrySoon();
      if (changedDays.length) persist(changedDays);
    } finally {
      pulling = false;
    }
    if (touched) changed(); else emitStatus();
    return ok;
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
      if (!enabled || !navigator.onLine || !DBX.isLinked() || !cache.cursor) { await sleep(15000); continue; }
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
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { pull(); flush(); } else writeNow(); });
  window.addEventListener("pagehide", () => { writeNow(); });
  setInterval(() => { if (!document.hidden) { pull(); flush(); } }, 60000);
  setInterval(() => { if (!document.hidden) syncFatturato(); }, 5 * 60000);

  // ---------- fatturato ----------
  // Un file per anno: "fatturato 2026.xlsx" riceve i servizi del 2026, "fatturato 2027.xlsx" quelli del 2027.
  // Un file senza anno nel nome riceve i servizi degli anni che non hanno un file proprio.
  const yearOf = (n) => { const m = /(20\d\d)/.exec(n || ""); return m ? m[1] : null; };
  function fatFiles() {
    const s = cache.settings || {};
    const files = Object.assign({}, s.files || {});
    if (typeof s.fatturato === "string" && s.fatturato && !Object.values(files).some((f) => f && typeof f.path === "string" && f.path.toLowerCase() === s.fatturato.toLowerCase())) {
      files[yearOf(s.fatturatoNome || s.fatturato) || "*"] = { path: s.fatturato, name: s.fatturatoNome || s.fatturato.split("/").pop() };
    }
    return files;
  }
  function clientYear(files) {
    const y = String(new Date().getFullYear()), ys = Object.keys(files).filter((k) => k !== "*").sort();
    return files[y] ? y : ys.length ? ys[ys.length - 1] : files["*"] ? "*" : null;
  }
  // n. foglio valido: AAMMGG + progressivo, con data vera
  const validFoglio = (fg) => /^\d{8,9}$/.test(String(fg || "")) && validDate("20" + String(fg).slice(0, 2) + "-" + String(fg).slice(2, 4) + "-" + String(fg).slice(4, 6));
  let fatRun = null, fatAgain = false;
  // Scrive nei file fatturato le righe in attesa e rimette quelle mancanti. Legge anche clienti e regole.
  // Restituisce una promessa che si risolve quando l'aggiornamento (compreso un eventuale secondo giro) è finito.
  function syncFatturato() {
    if (fatRun) { fatAgain = true; return fatRun; }
    fatRun = (async () => { do { fatAgain = false; await syncFatturatoOnce(); } while (fatAgain); })().finally(() => { fatRun = null; });
    return fatRun;
  }
  async function syncFatturatoOnce() {
    const files = fatFiles(), years = Object.keys(files).sort();
    if (!enabled || !years.length || !hooks.rowFor || !navigator.onLine || !DBX.isLinked()) return;
    // prima si leggono le novità degli altri dispositivi: con dati vecchi non si rimettono righe né si fa pulizia
    // (si rischierebbe di riscrivere servizi appena spostati o eliminati da un altro operatore)
    const fresh = (await pull()) && queue.days.length === 0;
    const yOfFoglio = (fg) => "20" + String(fg).slice(0, 2);
    const fileFor = (y) => (files[y] ? y : files["*"] ? "*" : null);
    // righe non valide (data sbagliata) o di anni senza file: non c'è dove scriverle
    // (quelle degli anni senza file verranno aggiunte quando colleghi quel file)
    for (const k of Object.keys(queue.fat)) {
      const x = queue.fat[k];
      if (!validFoglio(k) || !fileFor(yOfFoglio(k)) || (x.act === "upsert" && (!x.b || !validDate(x.b.start) || fileFor(String(x.b.start).slice(0, 4)) !== fileFor(yOfFoglio(k))))) delete queue.fat[k];
    }
    // righe in attesa superate: la prenotazione nel frattempo ha cambiato numero, giorno o è stata eliminata
    const current = {};
    for (const d in cache.days) for (const [id, b] of Object.entries(cache.days[d].doc.bookings || {})) if (b && b.foglio) current[String(b.foglio)] = id;
    for (const k of Object.keys(queue.fat)) { const x = queue.fat[k]; if (x.act === "upsert" && current[k] !== (x.b && x.b.id)) queue.fat[k] = { act: "clear", b: x.b, moved: null }; }
    const pendingNow = Object.assign({}, queue.fat);
    // righe già scritte dall'agenda: le altre righe con lo stesso numero non vanno mai sovrascritte
    if (!cache.fatWritten) { cache.fatWritten = {}; for (const d in cache.days) for (const x of Object.values(cache.days[d].doc.bookings || {})) if (x && x.foglio) cache.fatWritten[x.foglio] = 1; }
    const all = [];
    for (const d in cache.days) { const bk = cache.days[d].doc.bookings || {}; for (const id in bk) { const b = bk[id]; if (b && validFoglio(b.foglio) && validDate(b.start || d)) all.push(Object.assign({ id }, b, { start: b.start || d })); } }
    const report = {}; let firstErr = null;
    try {
      for (const y of years) {
        const mine = (b) => fileFor(String(b.start || "").slice(0, 4)) === y;
        const pend = {};
        for (const [k, x] of Object.entries(pendingNow)) if (fileFor(yOfFoglio(k)) === y && (x.act === "clear" || mine(x.b))) pend[k] = x;
        // pulizia: righe scritte dall'agenda (elenco condiviso) di servizi che non esistono più, per esempio
        // rimesse da un file Excel salvato con dati vecchi. Solo con dati appena aggiornati.
        const gone = fresh && cache.cursor ? Object.keys(Object.assign({}, cache.fatShared || {}, cache.fatGone || {})).filter((k) => !current[k] && !pend[k] && validFoglio(k) && fileFor(yOfFoglio(k)) === y)
          .map((k) => ({ foglio: k, sig: cache.fatGone && cache.fatGone[k] && typeof cache.fatGone[k] === "object" ? cache.fatGone[k] : null })) : [];
        try {
          const r = await syncOne(files[y].path, pend, fresh ? all.filter(mine) : [], y === clientYear(files) ? queue.clients.filter((c) => !c.failed) : [], gone);
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
      persist(); changed();
    }
  }
  async function syncOne(path, pend, ensureList, newClients, gone) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const f = await DBX.download(path);
      if (!f) return null;
      if (!f.meta.rev) f.meta = await DBX.metadata(path);
      const res = await FAT.apply(f.buf, {
        upserts: Object.values(pend).filter((x) => x.act === "upsert").map((x) => hooks.rowFor(x.b)),
        clears: Object.entries(pend).filter(([, x]) => x.act === "clear").map(([k, x]) => ({ foglio: k, row: x.b ? hooks.rowFor(x.b) : null, moved: x.moved || null })),
        gone: gone || [],
        ensure: ensureList.map(hooks.rowFor),
        known: Object.assign({}, cache.fatShared || {}, cache.fatWritten || {}),
        newClients: (newClients || []).filter((x) => x.kind !== "edit").map((x) => ({ tmp: x.tmp, vals: x.vals })),
        editClients: (newClients || []).filter((x) => x.kind === "edit").map((x) => ({ tmp: x.tmp, code: x.code, vals: x.vals, base: x.base })),
      });
      if (res.skipped && res.skipped.some((x) => x.why === "non riconosciuta")) console.warn("Fatturato: righe non svuotate", JSON.stringify(res.skipped));
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
        for (const id in bk) if (bk[id] && String(bk[id].foglio) === String(fg)) queue.days.push({ qid: newQid(), date: d, ops: [{ t: "put", id, b: clone(bk[id]), assign: true, renumber: true, edit: true, base: bk[id].updatedAt || null, patch: [] }], at: Date.now() });
      }
    }
    persist(); kick();
  }
  // Elenco condiviso (in Dropbox) dei n. foglio scritti dall'agenda nel fatturato, uguale su tutti i dispositivi
  // "fogli": righe scritte dall'agenda; "tolti": numeri di servizi eliminati o spostati (un numero non torna mai),
  // così una riga rimessa da un Excel salvato con dati vecchi viene riconosciuta e tolta di nuovo
  async function shareRows(res, upserted) {
    const add = (res.addedFogli || []).concat(upserted || []), del = res.clearedFogli || [];
    const path = P.cfg + "/righe-fatturato.json";
    for (let i = 0; i < 4; i++) {
      try {
        const f = await DBX.download(path);
        const j = f ? (parseJSON(f.buf) || {}) : {}, cur = isObj(j.fogli) ? j.fogli : {}, gone = isObj(j.tolti) ? j.tolti : {};
        const before = JSON.stringify([cur, gone]);
        for (const k of add) { cur[k] = 1; }
        for (const k of del) { delete cur[k]; gone[k] = (res.clearedSig && res.clearedSig[k]) || 1; }
        cache.fatShared = cur; cache.fatGone = gone;
        if (JSON.stringify([cur, gone]) === before) return;
        const meta = f && !f.meta.rev ? await DBX.metadata(path) : f && f.meta;
        await DBX.upload(path, enc.encode(JSON.stringify({ fogli: cur, tolti: gone })), f ? { update: meta.rev } : "add");
        return;
      } catch (e) { if (e.code !== "conflict") return; }
    }
  }
  // clienti scritti nel foglio "clienti": escono dalla coda e l'app riceve il codice assegnato.
  // Un cliente che non si può scrivere (manca il foglio, manca il nome) resta in elenco come "non scritto":
  // non viene riprovato all'infinito e si può annullare.
  function finishClients(res) {
    // modifiche a clienti esistenti
    for (const x of res.editClients || []) {
      const q = queue.clients.find((c) => c.tmp === x.tmp);
      if (!q) continue;
      if (x.error) { if (!q.failed) { q.failed = x.error; hooks.onClientError && hooks.onClientError(x.error, q); } continue; }
      queue.clients = queue.clients.filter((c) => c.tmp !== x.tmp);
      hooks.onClientEdited && hooks.onClientEdited(q, x);
    }
    if ((res.editClients || []).length) persist();
    const results = res.newClients || [];
    if (!results.length) return;
    cache.clientDone = cache.clientDone || {};
    for (const x of results) {
      const q = queue.clients.find((c) => c.tmp === x.tmp);
      if (!q) continue;
      if (x.error) {
        // codice Multi già usato nel file: si ricorda di chi è, per la correzione
        if (x.error === "codeexists") q.failInfo = { num: x.code, by: x.by || "" };
        if (!q.failed) { q.failed = x.error; hooks.onClientError && hooks.onClientError(x.error, q); }
        continue;
      }
      cache.clientDone[x.tmp] = { code: x.code, existed: !!x.existed, name: q.name, at: Date.now() };
      queue.clients = queue.clients.filter((c) => c.tmp !== x.tmp);
      hooks.onClientAdded && hooks.onClientAdded(x.tmp, cache.clientDone[x.tmp]);
    }
    persist();
  }
  // nuovo cliente: va in coda e viene scritto nel file fatturato (subito se c'è la connessione)
  function addClient(vals, name) {
    const tmp = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    queue.clients.push({ tmp, vals, name, at: Date.now() });
    persist(); changed(); syncFatturato();
    return tmp;
  }
  // cliente esistente modificato nell'app: solo i campi cambiati (vals) e i loro valori di partenza (base)
  function editClient(code, vals, base, name) {
    const tmp = "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    queue.clients.push({ tmp, kind: "edit", code, vals, base, name, at: Date.now() });
    persist(); changed(); syncFatturato();
    return tmp;
  }
  function cancelClient(tmp) { queue.clients = queue.clients.filter((c) => c.tmp !== tmp); persist(); changed(); }
  function retryClient(tmp) { const c = queue.clients.find((x) => x.tmp === tmp); if (c) delete c.failed; persist(); changed(); syncFatturato(); }
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
  // Flotta: si applicano solo i campi cambiati (per id del mezzo) sull'ultima versione in Dropbox.
  // patches: {idMezzo: {name, seats, plate, xcat}} ; base: flotta da usare se in Dropbox non c'è ancora.
  async function patchFleet(patches, base) {
    if (!navigator.onLine) throw { code: "offline" };
    const path = P.cfg + "/flotta.json";
    for (let i = 0; i < 5; i++) {
      const f = await DBX.download(path);
      if (f && !f.meta.rev) f.meta = await DBX.metadata(path);
      const cur = f ? parseJSON(f.buf) : null;
      const ok = cur ? cleanFleet(cur.vehicles) : null; // dal file si tengono solo i mezzi validi
      const vehicles = ok && ok.length ? ok : clone(base);
      const changedIds = [];
      for (const id in patches) {
        const v = vehicles.find((x) => x.id === id); if (!v) continue;
        for (const k in patches[id]) { if (!same(v[k], patches[id][k])) { v[k] = patches[id][k]; if (["plate", "xcat", "seats"].includes(k) && !changedIds.includes(id)) changedIds.push(id); } }
      }
      try {
        await DBX.upload(path, enc.encode(JSON.stringify({ vehicles }, null, 1)), f ? { update: f.meta.rev } : "add");
      } catch (e) { if (e.code === "conflict") continue; throw e; }
      cache.fleet = { vehicles };
      if (changedIds.length) {
        for (const d in cache.days) for (const [id, b] of Object.entries(cache.days[d].doc.bookings || {}))
          if (b && b.foglio && changedIds.includes(b.vehicle)) queue.fat[b.foglio] = { act: "upsert", b: Object.assign({ id }, b, { start: b.start || d }) };
      }
      persist(); changed(); syncFatturato();
      return vehicles;
    }
    throw { code: "busy" };
  }
  async function setSettings(s) { cache.settings = Object.assign({}, cache.settings || {}, s); await putJSON(P.cfg + "/impostazioni.json", cache.settings); persist(); changed(); }
  // collega un file fatturato: vale per l'anno scritto nel nome (o per tutti se non c'è un anno)
  async function linkFatturato(path, name) {
    const files = fatFiles(); files[yearOf(name) || "*"] = { path, name };
    await setSettings({ fatturato: path, fatturatoNome: name, files });
  }
  // codice di accesso
  const ACC = () => P.cfg + "/accesso.json";
  async function fetchAccess() { const f = await DBX.download(ACC()); if (!f) return null; const a = parseJSON(f.buf); if (!isObj(a)) return null; if (a.hash) { cache.access = a; persist(); } return a; }
  // primo codice: non sovrascrive mai un codice già esistente
  async function createAccess(a) {
    try { await DBX.upload(ACC(), enc.encode(JSON.stringify(a, null, 1)), "add"); }
    catch (e) { if (e.code === "conflict") { await fetchAccess(); throw { code: "exists" }; } throw e; }
    cache.access = a; persist();
  }
  async function setAccess(a) { await putJSON(ACC(), a); cache.access = a; persist(); }

  // ---------- utenti (1.8) ----------
  // Un solo file per tutti: lo scrive solo il Master (o l'utente che cambia la propria password).
  // Ogni scrittura parte dall'ultima versione in Dropbox e non sovrascrive modifiche fatte nel frattempo.
  const USR = () => P.cfg + "/utenti.json";
  let usersSeen = false;
  async function readUsersFile() {
    const f = await DBX.download(USR());
    if (!f) return null;
    if (!f.meta.rev) f.meta = await DBX.metadata(USR());
    const j = cleanUsers(parseJSON(f.buf));
    if (!j) throw { code: "badusers" };
    return { j, rev: f.meta.rev };
  }
  async function fetchUsers() {
    const r = await readUsersFile();
    usersSeen = true;
    if (!r) return null;
    cache.users = r.j; persist(); return r.j;
  }
  // primo Master: non sovrascrive mai un elenco utenti già esistente
  async function createUsers(u) {
    const r = await readUsersFile();
    if (r) { cache.users = r.j; persist(); throw { code: "exists" }; }
    u = cleanUsers(u); if (!u || !mastersIn(u)) throw { code: "badusers" };
    await DBX.upload(USR(), enc.encode(JSON.stringify(u, null, 1)), "add");
    cache.users = u; usersSeen = true; persist(); changed();
    return u;
  }
  async function updateUsers(fn) {
    if (!navigator.onLine) throw { code: "offline" };
    for (let i = 0; i < 6; i++) {
      const r = await readUsersFile();
      if (!r) throw { code: "nousers" };
      const made = fn(clone(r.j));
      if (!made) return r.j;
      if (isObj(made) && isObj(made.users) && mastersIn(made) === 0) { cache.users = r.j; persist(); changed(); throw { code: "lastmaster" }; }
      const next = cleanUsers(made);
      if (!next) throw { code: "badusers" };
      // Deve restare sempre almeno un Master attivo. Il controllo è qui, sull'ultima versione letta da
      // Dropbox (anche quando si riprova dopo una modifica contemporanea): due Master che si tolgono
      // il ruolo a vicenda nello stesso momento non possono lasciare l'agenda senza Master.
      if (mastersIn(next) === 0) { cache.users = r.j; persist(); changed(); throw { code: "lastmaster" }; } // (l'elenco sullo schermo si aggiorna)
      next.updatedAt = new Date().toISOString();
      try {
        await DBX.upload(USR(), enc.encode(JSON.stringify(next, null, 1)), { update: r.rev });
        cache.users = next; persist(); changed();
        try { hooks.onUsersChanged(next); } catch (_) {}
        return next;
      } catch (e) { if (e.code !== "conflict") throw e; }
    }
    throw { code: "busy" };
  }

  // fogli di servizio in cartelle Anno / Mese / Giorno del servizio (es. 2026 / 10 - Ottobre / 01)
  const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  function sheetFolder(date) {
    const d = validDate(date) ? date : new Date().toISOString().slice(0, 10);
    return P.sheets + "/" + d.slice(0, 4) + "/" + d.slice(5, 7) + " - " + MESI[+d.slice(5, 7) - 1] + "/" + d.slice(8, 10);
  }
  // nome di file sicuro: niente / \ : * ? " < > | né ".." (un n. foglio scritto apposta non fa uscire il file dalla sua cartella)
  const safeFileName = (n) => String(n || "").replace(/[\u0000-\u001f\/\\:*?"<>|]+/g, "_").replace(/\.{2,}/g, "_").replace(/^[\s._]+/, "").slice(0, 150) || "foglio";
  async function saveSheetFile(name, blob, date) {
    name = safeFileName(name);
    const folder = sheetFolder(String(date || ""));
    let p = "";
    for (const part of folder.split("/").filter(Boolean)) { p += "/" + part; await DBX.createFolder(p).catch(() => {}); }
    return DBX.upload(folder + "/" + name, blob, "overwrite");
  }

  // ---------- anagrafiche (2.0): referenti, guide, hotel e tendine (note, ruolo) ----------
  // Un file per anagrafica in config/. Ogni scrittura parte dall'ultima versione in Dropbox (niente
  // modifiche perse se due persone lavorano insieme); se il file non c'è ancora si crea.
  const REGF = { referenti: "anagrafica-referenti.json", guide: "anagrafica-guide.json", hotel: "anagrafica-hotel.json", tendine: "tendine.json" };
  const TENDINE = { note: ["parcheggi", "autista", "3 ore", "extra 1", "extra 2"], ruolo: ["contabile", "ufficio", "operativo", "sul bus"] };
  function defaultReg(kind) { return kind === "tendine" ? clone(TENDINE) : { rows: [] }; }
  function reg(kind) { const r = (cache.regs || {})[kind]; return isObj(r) ? r : defaultReg(kind); }
  function regLoaded(kind) { return !!(cache.regs && cache.regs[kind]); }
  async function updateReg(kind, fn) {
    if (!REGF[kind]) throw { code: "kind" };
    if (!navigator.onLine) throw { code: "offline" };
    const path = P.cfg + "/" + REGF[kind];
    for (let i = 0; i < 6; i++) {
      const f = await DBX.download(path);
      if (f && !f.meta.rev) f.meta = await DBX.metadata(path);
      const cur = f ? cleanReg(kind, parseJSON(f.buf)) : null;
      const next = fn(clone(cur || defaultReg(kind)));
      if (!next) { if (cur) { cache.regs = Object.assign({}, cache.regs || {}, { [kind]: cur }); persist(); } return cur || defaultReg(kind); }
      next.updatedAt = new Date().toISOString();
      try {
        await DBX.upload(path, enc.encode(JSON.stringify(next, null, 1)), f ? { update: f.meta.rev } : "add");
        cache.regs = Object.assign({}, cache.regs || {}, { [kind]: next }); persist(); changed();
        return next;
      } catch (e) { if (e.code !== "conflict") throw e; }
    }
    throw { code: "busy" };
  }

  // Anagrafiche che questo dispositivo non ha ancora (per esempio create mentre aveva la versione 1.9,
  // che le saltava): si scaricano una volta. Non scrive niente.
  async function loadRegs() {
    if (!navigator.onLine) return false;
    let got = false;
    for (const kind of Object.keys(REGF)) {
      if (cache.regs && cache.regs[kind]) continue;
      try {
        const f = await DBX.download(P.cfg + "/" + REGF[kind]);
        const j = f ? cleanReg(kind, parseJSON(f.buf)) : null;
        if (j) { cache.regs = Object.assign({}, cache.regs || {}, { [kind]: j }); got = true; }
      } catch (_) {}
    }
    if (got) { persist(); changed(); }
    return got;
  }

  // Scollega: cancella tutto (anche le modifiche non inviate). Usato solo da "Scollega questo dispositivo".
  async function reset() {
    cache = emptyCache(); queue = { days: [], fat: {}, clients: [] };
    try { localStorage.setItem(QK, JSON.stringify(queue)); localStorage.removeItem(CK); } catch (_) {}
    if (idb) await new Promise((res) => { try { const t = idb.transaction(["days", "meta"], "readwrite"); t.objectStore("days").clear(); t.objectStore("meta").clear(); t.oncomplete = t.onerror = t.onabort = () => res(); } catch (_) { res(); } });
  }

  (window.AGENDA_FILES = window.AGENDA_FILES || {}).store = "2.1";
  window.STORE = {
    BASE, P,
    configure(h) { Object.assign(hooks, h); },
    ready,
    enable() { enabled = true; writesBlocked = false; },
    // un'altra finestra ha preso il controllo: questa non scrive più niente, né in Dropbox né sul dispositivo
    disable() { enabled = false; writesBlocked = true; clearTimeout(saveTimer); },
    fileFogli, validDate,
    view, mutateDay, pull, flush, watch, setupFolders, syncFatturato, isPending, whenSent, saveNow: writeNow,
    patchFleet, setSettings, linkFatturato, fatFiles, fetchAccess, createAccess, setAccess, fetchUsers, createUsers, updateUsers, saveSheetFile, sheetFolder, safeFileName, ITER_MIN, ITER_MAX, reg, regLoaded, updateReg, loadRegs, REGF, reset, addClient, editClient, cancelClient, retryClient, dropClient: cancelClient,
    bustaMax: (y) => { const m = cache.bustaMax || {}; return m[y] != null ? m[y] : m["*"] || 0; },
    get pendingClients() { return queue.clients.slice(); },
    clientDone: (tmp) => (cache.clientDone || {})[tmp] || null,
    get fleet() { return fleetView(); },
    get settings() { return cache.settings; },
    get access() { return cache.access; },
    get users() { return cache.users; },
    get usersSeen() { return usersSeen; },
    get lists() { return cache.lists; },
    get fat() { return cache.fat; },
    get pending() { return queue.days.length + Object.keys(queue.fat).length + queue.clients.filter((c) => !c.failed).length; },
    get pendingDays() { return queue.days.length; },
    get hasData() { return !!cache.cursor; },
    status: () => Object.assign(counts(), { fat: cache.fat }, status),
    _merge3: merge3,
  };
})();
