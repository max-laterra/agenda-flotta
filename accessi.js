// Utenti, dispositivi e registro (versione 1.8).
//
// - Ogni persona entra con il proprio nome e la propria password (impronta PBKDF2 in config/utenti.json).
// - Ruoli: "master" (gestisce utenti, dispositivi, registro e impostazioni) e "utente" (lavora sull'agenda).
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
  async function checkPw(u, pw) { return !!u && !!u.hash && (await pbkdf2(pw, u.salt, u.iter || ITER)) === u.hash; }
  // password facili da dettare: niente lettere che si confondono (l/1, O/0)
  function genPassword() {
    const A = "abcdefghjkmnpqrstuvwxyz", N = "23456789", r = crypto.getRandomValues(new Uint32Array(8));
    let s = ""; for (let i = 0; i < 6; i++) s += A[r[i] % A.length]; return s[0].toUpperCase() + s.slice(1) + N[r[6] % N.length] + N[r[7] % N.length];
  }

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
  if (!logQ || typeof logQ.days !== "object") logQ = { days: {} };
  let logTimer = null, logBusy = false;
  const dayPath = (date) => REG() + "/" + date.slice(0, 7) + "/" + date + "_" + device.id + ".json";
  // k: tipo (accesso, prenotazione, cliente, foglio, impostazioni, utenti, dispositivi), x: testo, d: dettagli
  function log(k, x, d, who) {
    const s = session(), now = new Date(), date = localDate(now);
    const e = { id: rid("e"), t: now.toISOString(), u: s ? s.uid : "", n: s ? s.name : (who || ""), dv: device.id, k, x: String(x || "") };
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
          if (f) { try { const j = JSON.parse(dec.decode(f.buf)); const have = new Set(day.ev.map((e) => e.id)); for (const e of (j.ev || [])) if (!have.has(e.id)) day.ev.push(e); day.ev.sort((a, b) => (a.t < b.t ? -1 : 1)); } catch (_) {} }
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
    const o = { dev: device.id, auto: device.auto, ua: navigator.userAgent, ver: window.AGENDA_VERSION || "", uid: s ? s.uid : "", user: s ? s.name : "", role: s ? s.role : "", loginAt: s ? s.at : "", last: new Date().toISOString(), state: state || (s ? "attivo" : "uscito") };
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
    return list.filter(Boolean);
  }
  // eventi tra due date (AAAA-MM-GG, comprese), dal più recente
  async function readLog(from, to) {
    const months = []; let m = from.slice(0, 7);
    while (m <= to.slice(0, 7) && months.length < 25) { months.push(m); const y = +m.slice(0, 4), mo = +m.slice(5, 7); m = mo === 12 ? (y + 1) + "-01" : y + "-" + String(mo + 1).padStart(2, "0"); }
    const files = [];
    for (const mo of months) {
      for (const e of await listAll(REG() + "/" + mo)) {
        const d = /(\d{4}-\d{2}-\d{2})_/.exec(e.name || ""); if (d && d[1] >= from && d[1] <= to) files.push(e);
      }
    }
    const docs = await pool(files, 6, async (e) => { const f = await DBX.download(e.path_lower); return f ? JSON.parse(dec.decode(f.buf)) : null; });
    const seen = new Set(), ev = [];
    for (const doc of docs) if (doc && Array.isArray(doc.ev)) for (const e of doc.ev) if (!seen.has(e.id)) { seen.add(e.id); ev.push(Object.assign({ auto: doc.auto || "" }, e)); }
    // eventi di questo dispositivo non ancora arrivati in Dropbox
    for (const date in logQ.days) if (date >= from && date <= to) for (const e of logQ.days[date].ev) if (!seen.has(e.id)) { seen.add(e.id); ev.push(Object.assign({ auto: device.auto, local: true }, e)); }
    ev.sort((a, b) => (a.t < b.t ? 1 : -1));
    return ev;
  }

  window.addEventListener("online", () => { flushLog(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushLog(); });

  window.ACC = {
    get device() { return device; }, devLabel, uaLabel, localDate,
    makeSecret, checkPw, genPassword, pbkdf2,
    session, setSession, sessionProblem, refreshSession, login, logout,
    failWait, failAdd, failReset,
    log, amend, flushLog, pendingLog, beat, startBeat, forgetDevice,
    devices, readLog, REG,
  };
})();
