// Utenti, dispositivi e registro (versione 1.8).
//
// - Ogni persona entra con il proprio nome e la propria password (impronta PBKDF2 in config/utenti.json).
// - Ruoli: "master" (gestisce utenti, dispositivi, registro e impostazioni) e "utente" (lavora sull'agenda).
//   Dalla 2.5 anche "super" (Super Master: gestisce tutti gli account e i telefoni degli autisti; non
//   compare negli elenchi) e "invio" (solo anteprima e invio dei fogli agli autisti).
// - Registro: ogni dispositivo scrive i propri eventi (accessi, modifiche) in un file al giorno, in una
//   cartella accanto a quella dell'agenda che l'app degli utenti non mostra mai:
//     /Agenda Flotta La Terra - registro/AAAA-MM/AAAA-MM-GG_<dispositivo>.json
//     /Agenda Flotta La Terra - registro/dispositivi/<dispositivo>.json   (chi è collegato e quando)
//   Gli eventi restano sul dispositivo finché non sono arrivati in Dropbox (anche offline non si perdono).
(function () {
  "use strict";
  const DK = "agenda-device-v1", SK = "agenda-session-v1", LK = "agenda-log-v1", FK = "agenda-login-fails";
  const enc = new TextEncoder(), dec = new TextDecoder();
  const REG = () => STORE.BASE + " - registro";
  const ITER = 150000;

  function lsGet(k, d) { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (_) { return d; } }
  function lsSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  const rid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const localDate = (d) => { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

  // ---------- questo dispositivo ----------
  function uaLabel() {
    const u = navigator.userAgent || "";
    const ipad = /iPad/.test(u) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const dev = /iPhone/.test(u) ? "iPhone" : ipad ? "iPad" : /Android/.test(u) ? (/Mobile/.test(u) ? "Telefono Android" : "Tablet Android") : /Mac/.test(u) ? "Mac" : /Windows/.test(u) ? "PC Windows" : /Linux/.test(u) ? "PC Linux" : "Computer";
    const br = /Edg\//.test(u) ? "Edge" : /OPR\//.test(u) ? "Opera" : /Firefox\//.test(u) ? "Firefox" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : "browser";
    return dev + " · " + br;
  }
  let device = lsGet(DK, null);
  if (!device || !device.id) { device = { id: rid("d"), auto: uaLabel(), since: new Date().toISOString() }; lsSet(DK, device); }
  function devLabel(id, U) {
    U = U || STORE.users;
    const m = (U && U.devices) || {};
    if (m[id] && m[id].label) return m[id].label;
    return id === device.id ? device.auto : "";
  }

  // ---------- password ----------
  const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  async function pbkdf2(pw, salt, iter) {
    const k = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
    return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: iter }, k, 256));
  }
  async function makeSecret(pw) { const salt = hex(crypto.getRandomValues(new Uint8Array(16))); return { salt, iter: ITER, hash: await pbkdf2(pw, salt, ITER), pwAt: new Date().toISOString() }; }
  // Prima del calcolo si controlla che l'utente abbia la forma giusta: un numero di passaggi enorme
  // scritto apposta nel file bloccherebbe il pulsante «Entra» per ore.
  function secretOk(u) {
    if (!u || typeof u.hash !== "string" || typeof u.salt !== "string" || !/^[0-9a-f]{64}$/i.test(u.hash) || !/^[0-9a-f]{16,128}$/i.test(u.salt)) return 0;
    const it = u.iter == null ? ITER : Number(u.iter);
    return Number.isInteger(it) && it >= STORE.ITER_MIN && it <= STORE.ITER_MAX ? it : 0;
  }
  async function checkPw(u, pw) { const it = secretOk(u); return !!it && (await pbkdf2(String(pw == null ? "" : pw), u.salt, it)) === u.hash.toLowerCase(); }
  // password facili da dettare: niente lettere che si confondono (l/1, O/0)
  function genPassword() {
    const A = "abcdefghjkmnpqrstuvwxyz", N = "23456789", r = crypto.getRandomValues(new Uint32Array(8));
    let s = ""; for (let i = 0; i < 6; i++) s += A[r[i] % A.length]; return s[0].toUpperCase() + s.slice(1) + N[r[6] % N.length] + N[r[7] % N.length];
  }

  // codice di recupero del Super Master (da scrivere su carta): 12 caratteri in tre gruppi
  function genRecovery() {
    const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", r = crypto.getRandomValues(new Uint32Array(12));
    let s = ""; for (let i = 0; i < 12; i++) s += A[r[i] % A.length] + (i === 3 || i === 7 ? "-" : ""); return s;
  }
  const normRecovery = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  async function makeRecovery(code) { const salt = hex(crypto.getRandomValues(new Uint8Array(16))); return { salt, iter: ITER, hash: await pbkdf2(normRecovery(code), salt, ITER) }; }
  async function checkRecovery(u, code) { const r = u && u.rec; if (!r || !secretOk(r)) return false; return (await pbkdf2(normRecovery(code), r.salt, Number(r.iter))) === String(r.hash).toLowerCase(); }

  // ---------- sessione ----------
  function session() { return lsGet(SK, null); }
  function setSession(s) { lsSet(SK, s); }
  // perché la sessione non vale più (null = valida)
  function sessionProblem(s, U) {
    if (!s || !U || !U.users) return "none";
    const bl = (U.blocked || {})[device.id]; if (bl) return "blocked";
    const u = U.users[s.uid];
    if (!u) return "removed";
    if (u.active === false) return "disabled";
    if ((u.pwAt || "") !== (s.pwAt || "")) return "password";
    const k = (U.kicks || {})[device.id]; if (k && k > s.at) return "kicked";
    return null;
  }
  function refreshSession(U) {
    const s = session(); if (!s || !U || !U.users || !U.users[s.uid]) return s;
    const u = U.users[s.uid];
    if (u.name !== s.name || u.role !== s.role) { s.name = u.name; s.role = u.role; setSession(s); }
    return s;
  }
  function login(u, uid) { const s = { uid, name: u.name, role: u.role, pwAt: u.pwAt || "", at: new Date().toISOString(), dev: device.id }; setSession(s); return s; }
  function logout() { setSession(null); }

  // tentativi sbagliati: dopo 5 errori si aspetta 30 secondi
  function failWait() { const f = lsGet(FK, { n: 0, t: 0 }); if (f.n >= 5) { const w = 30000 - (Date.now() - f.t); if (w > 0) return Math.ceil(w / 1000); } return 0; }
  function failAdd() { const f = lsGet(FK, { n: 0, t: 0 }); lsSet(FK, { n: f.n >= 5 ? 1 : f.n + 1, t: Date.now() }); }
  function failReset() { lsSet(FK, null); }

  // ---------- registro ----------
  let logQ = lsGet(LK, { days: {} });
  // coda sul dispositivo: solo giorni veri con un elenco di eventi (oggetti con id e ora)
  function okQ(q) {
    if (!q || typeof q !== "object" || !q.days || typeof q.days !== "object" || Array.isArray(q.days)) return { days: {} };
    for (const d of Object.keys(q.days)) { const x = q.days[d]; if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !x || typeof x !== "object" || !Array.isArray(x.ev)) delete q.days[d]; else x.ev = x.ev.filter((e) => e && typeof e === "object" && typeof e.id === "string" && typeof e.t === "string"); }
    return q;
  }
  logQ = okQ(logQ);
  let logTimer = null, logBusy = false;
  const dayPath = (date) => REG() + "/" + date.slice(0, 7) + "/" + date + "_" + device.id + ".json";
  // k: tipo (accesso, prenotazione, cliente, foglio, impostazioni, utenti, dispositivi), x: testo, d: dettagli
  function log(k, x, d, who) {
    const s = session(), now = new Date(), date = localDate(now);
    const e = { id: rid("e"), t: now.toISOString(), u: s ? s.uid : "", n: s ? s.name : (who || ""), dv: device.id, k, x: String(x || "") };
    if (s && s.role === "super") e.s = "1"; // azioni del Super Master: nel registro le vede solo lui
    if (d) e.d = d;
    const day = logQ.days[date] || (logQ.days[date] = { ev: [], loaded: false });
    day.ev.push(e); day.dirty = true;
    lsSet(LK, logQ);
    clearTimeout(logTimer); logTimer = setTimeout(flushLog, 4000);
    return e;
  }
  async function flushLog() {
    clearTimeout(logTimer); logTimer = null;
    if (logBusy || !navigator.onLine || !window.DBX || !DBX.isLinked()) return;
    logBusy = true;
    try {
      const today = localDate();
      for (const date of Object.keys(logQ.days).sort()) {
        const day = logQ.days[date];
        if (!day.dirty) { if (date < today) delete logQ.days[date]; continue; }
        const path = dayPath(date);
        if (!day.loaded) {
          // il file del giorno può esistere già (per esempio dopo aver svuotato il browser): si uniscono gli eventi
          const f = await DBX.download(path);
          if (f) mergeEv(day, f.buf);
          day.loaded = true;
        }
        const n = day.ev.length;
        await DBX.upload(path, enc.encode(JSON.stringify({ dev: device.id, auto: device.auto, date, ev: day.ev })), "overwrite");
        if (day.ev.length === n) day.dirty = false;
        if (date < today && !day.dirty) delete logQ.days[date];
      }
      lsSet(LK, logQ);
    } catch (e) {
      clearTimeout(logTimer); logTimer = setTimeout(flushLog, 60000);
    } finally { logBusy = false; }
  }
  // aggiorna un evento già scritto (es. "Autisti extra": un evento solo mentre si scrive)
  function amend(e, patch) {
    if (!e) return false;
    for (const date in logQ.days) {
      const day = logQ.days[date];
      if (day.ev.includes(e)) { Object.assign(e, patch); day.dirty = true; lsSet(LK, logQ); clearTimeout(logTimer); logTimer = setTimeout(flushLog, 4000); return true; }
    }
    return false;
  }
  // dispositivo bloccato: da qui in poi è un dispositivo nuovo
  function forgetDevice() { device = { id: rid("d"), auto: uaLabel(), since: new Date().toISOString() }; lsSet(DK, device); logQ = { days: {} }; lsSet(LK, logQ); setSession(null); }
  function pendingLog() { let n = 0; for (const d in logQ.days) if (logQ.days[d].dirty) n += logQ.days[d].ev.length; return n; }

  // ---------- dispositivi: chi è collegato ----------
  let beatTimer = null;
  async function beat(state) {
    if (!navigator.onLine || !window.DBX || !DBX.isLinked()) return;
    const s = session();
    // il Super Master non compare tra i dispositivi collegati: il dispositivo risulta senza utente
    const hid = !!s && s.role === "super";
    const o = { dev: device.id, auto: device.auto, ua: navigator.userAgent, ver: window.AGENDA_VERSION || "", uid: s && !hid ? s.uid : "", user: s && !hid ? s.name : "", role: s && !hid ? s.role : "", loginAt: s && !hid ? s.at : "", last: new Date().toISOString(), state: state || (s && !hid ? "attivo" : "uscito") };
    try { await DBX.upload(REG() + "/dispositivi/" + device.id + ".json", enc.encode(JSON.stringify(o)), "overwrite"); } catch (_) {}
  }
  function startBeat() {
    clearInterval(beatTimer);
    beatTimer = setInterval(() => { if (document.visibilityState === "visible" && session()) beat(); }, 10 * 60 * 1000);
  }

  // ---------- letture per il Master ----------
  async function pool(items, n, fn) {
    let i = 0; const out = [];
    const worker = async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]); } catch (_) { out[k] = null; } } };
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
    return out;
  }
  async function listAll(path) {
    let r = await DBX.listFolder(path, null); const out = [];
    while (r) { out.push(...r.entries); r = r.has_more ? await DBX.listFolder(path, r.cursor) : null; }
    return out.filter((e) => e[".tag"] === "file");
  }
  async function devices() {
    const files = await listAll(REG() + "/dispositivi");
    const list = await pool(files, 6, async (e) => { const f = await DBX.download(e.path_lower); return f ? JSON.parse(dec.decode(f.buf)) : null; });
    // solo schede vere, con i campi di testo (un file scritto male non rompe l'elenco dei dispositivi)
    return list.filter((d) => d && typeof d === "object" && !Array.isArray(d) && typeof d.dev === "string" && d.dev).map((d) => { const o = {}; for (const k of ["dev", "auto", "ua", "ver", "uid", "user", "role", "loginAt", "last", "state"]) o[k] = str(d[k], 300); return o; });
  }
  // eventi già presenti nel file del giorno in Dropbox (stesso dispositivo): si uniscono solo quelli validi
  function mergeEv(day, buf) {
    try {
      const j = JSON.parse(dec.decode(buf)), have = new Set(day.ev.map((e) => e && e.id));
      for (const e0 of (j && Array.isArray(j.ev) ? j.ev : [])) { const e = cleanEv(e0); if (e && !have.has(e.id)) { have.add(e.id); day.ev.push(e); } }
      day.ev.sort((a, b) => (a.t < b.t ? -1 : 1));
    } catch (_) {}
  }
  // un evento letto da un file: solo oggetti, con testi dove servono testi
  const str = (v, max) => (typeof v === "string" ? v : typeof v === "number" && isFinite(v) ? String(v) : "").slice(0, max || 2000);
  function cleanEv(e) {
    if (!e || typeof e !== "object" || Array.isArray(e)) return null;
    const o = {};
    for (const k of ["id", "t", "u", "n", "dv", "k", "x", "l", "m", "v", "s"]) if (k in e) o[k] = str(e[k]);
    if (!o.id || !o.t) return null;
    if (typeof e.d === "string") o.d = e.d.slice(0, 2000);
    else if (e.d && typeof e.d === "object" && !Array.isArray(e.d)) {
      o.d = {};
      for (const k of Object.keys(e.d)) { const v = e.d[k]; if (k === "__proto__" || k === "ch") continue; if (typeof v === "string") o.d[k] = v.slice(0, 2000); else if (typeof v === "number" || typeof v === "boolean") o.d[k] = v; }
      if (Array.isArray(e.d.ch)) o.d.ch = e.d.ch.filter(Array.isArray).slice(0, 200).map((c) => [str(c[0]), str(c[1]), str(c[2])]);
    }
    return o;
  }
  // eventi tra due date (AAAA-MM-GG, comprese), dal più recente
  async function readLog(from, to) { return readDays(from, to, "", logQ); }
  async function readDays(from, to, sub, localQ) {
    const months = []; let m = from.slice(0, 7);
    while (m <= to.slice(0, 7) && months.length < 25) { months.push(m); const y = +m.slice(0, 4), mo = +m.slice(5, 7); m = mo === 12 ? (y + 1) + "-01" : y + "-" + String(mo + 1).padStart(2, "0"); }
    const files = [];
    for (const mo of months) {
      for (const e of await listAll(REG() + (sub ? "/" + sub : "") + "/" + mo)) {
        const d = /(\d{4}-\d{2}-\d{2})_/.exec(e.name || ""); if (d && d[1] >= from && d[1] <= to) files.push(e);
      }
    }
    const docs = await pool(files, 6, async (e) => { const f = await DBX.download(e.path_lower); return f ? JSON.parse(dec.decode(f.buf)) : null; });
    const seen = new Set(), ev = [];
    for (const doc of docs) if (doc && Array.isArray(doc.ev)) for (const e0 of doc.ev) { const e = cleanEv(e0); if (e && !seen.has(e.id)) { seen.add(e.id); ev.push(Object.assign({ auto: str(doc.auto, 80) }, e)); } }
    // eventi di questo dispositivo non ancora arrivati in Dropbox
    for (const date in localQ.days) if (date >= from && date <= to) for (const e0 of (localQ.days[date] && Array.isArray(localQ.days[date].ev) ? localQ.days[date].ev : [])) { const e = cleanEv(e0); if (e && !seen.has(e.id)) { seen.add(e.id); ev.push(Object.assign({ auto: device.auto, local: true }, e)); } }
    ev.sort((a, b) => (a.t < b.t ? 1 : -1));
    return ev;
  }

  // ---------- log tecnico (2.0) ----------
  // Errori e avvisi (Dropbox, fatturato, errori del programma) per capire cosa è successo su ogni
  // dispositivo. Il Master lo consulta e lo scarica dal Pannello Master › Log tecnico.
  //   /Agenda Flotta La Terra - registro/log-tecnico/AAAA-MM/AAAA-MM-GG_<dispositivo>.json
  const TK = "agenda-tlog-v1";
  let tq = lsGet(TK, { days: {} });
  tq = okQ(tq);
  let tTimer = null, tBusy = false, tLast = "", tLastAt = 0;
  const tPath = (date) => REG() + "/log-tecnico/" + date.slice(0, 7) + "/" + date + "_" + device.id + ".json";
  function tlog(level, msg, det) {
    msg = String(msg || "").replace(/\s+/g, " ").slice(0, 400);
    if (!msg || (msg === tLast && Date.now() - tLastAt < 60000)) return; // niente doppioni a raffica
    tLast = msg; tLastAt = Date.now();
    const s = session(), now = new Date(), date = localDate(now);
    const e = { id: rid("t"), t: now.toISOString(), l: level || "info", m: msg, n: s && s.role !== "super" ? s.name : "", dv: device.id, v: window.AGENDA_VERSION || "" };
    if (det != null && det !== "") e.d = typeof det === "string" ? det.slice(0, 1500) : JSON.stringify(det).slice(0, 1500);
    const day = tq.days[date] || (tq.days[date] = { ev: [], loaded: false });
    day.ev.push(e); if (day.ev.length > 800) day.ev.splice(0, day.ev.length - 800);
    day.dirty = true;
    for (const d of Object.keys(tq.days)) if (d < date && !tq.days[d].dirty) delete tq.days[d];
    lsSet(TK, tq);
    clearTimeout(tTimer); tTimer = setTimeout(flushT, 8000);
  }
  async function flushT() {
    clearTimeout(tTimer); tTimer = null;
    if (tBusy || !navigator.onLine || !window.DBX || !DBX.isLinked()) return;
    tBusy = true;
    try {
      const today = localDate();
      for (const date of Object.keys(tq.days).sort()) {
        const day = tq.days[date];
        if (!day.dirty) { if (date < today) delete tq.days[date]; continue; }
        const path = tPath(date);
        if (!day.loaded) {
          const f = await DBX.download(path);
          if (f) mergeEv(day, f.buf);
          day.loaded = true;
        }
        const n = day.ev.length;
        await DBX.upload(path, enc.encode(JSON.stringify({ dev: device.id, auto: device.auto, date, ev: day.ev })), "overwrite");
        if (day.ev.length === n) day.dirty = false;
        if (date < today && !day.dirty) delete tq.days[date];
      }
      lsSet(TK, tq);
    } catch (_) { clearTimeout(tTimer); tTimer = setTimeout(flushT, 120000); }
    finally { tBusy = false; }
  }
  async function readTlog(from, to) { await flushT().catch(() => {}); return readDays(from, to, "log-tecnico", tq); }

  window.addEventListener("online", () => { flushLog(); flushT(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { flushLog(); flushT(); } });
  // errori del programma: finiscono nel log tecnico
  window.addEventListener("error", (e) => { try { tlog("errore", "Errore del programma: " + (e.message || "sconosciuto"), (e.filename || "").split("/").pop() + ":" + (e.lineno || "") + ":" + (e.colno || "")); } catch (_) {} });
  window.addEventListener("unhandledrejection", (e) => { try { const r = e.reason || {}; tlog("errore", "Operazione non riuscita: " + (r.message || r.code || r.summary || String(r)).slice(0, 200), r.stack ? String(r.stack).slice(0, 600) : null); } catch (_) {} });

  (window.AGENDA_FILES = window.AGENDA_FILES || {}).accessi = "2.6";
  window.ACC = {
    get device() { return device; }, devLabel, uaLabel, localDate,
    makeSecret, checkPw, genPassword, pbkdf2, genRecovery, makeRecovery, checkRecovery,
    session, setSession, sessionProblem, refreshSession, login, logout,
    failWait, failAdd, failReset,
    log, amend, flushLog, pendingLog, beat, startBeat, forgetDevice,
    devices, readLog, REG, tlog, flushT, readTlog,
  };
})();
