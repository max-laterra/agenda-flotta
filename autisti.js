// Cartella «Autisti La Terra» (2.5): invio dei fogli di servizio agli autisti, stato dei fogli,
// spese della busta e telefoni collegati.
//
// La cartella degli autisti è una SECONDA app Dropbox, con una cartella tutta sua: dai telefoni degli
// autisti la cartella dell'Agenda (prenotazioni, prezzi, fatturato) non si raggiunge in nessun modo.
// L'Agenda ci scrive i fogli e ci legge quello che scrivono i telefoni:
//
//   /servizi/<anno>/<id>/foglio.json       dati del servizio (scrive l'Agenda; MAI prezzi né parte contabile)
//   /servizi/<anno>/<id>/foglio.pdf        il foglio per l'autista (scrive l'Agenda)
//   /servizi/<anno>/<id>/ufficio.json      busta riaperta dall'ufficio (scrive l'Agenda)
//   /servizi/<anno>/<id>/letto_<autista>.json   l'autista ha aperto il foglio (scrive il telefono)
//   /servizi/<anno>/<id>/spese.json        spese, km e note della busta (scrive il telefono)
//   /servizi/<anno>/<id>/scontrini/<nome>.jpg   foto degli scontrini (scrive il telefono)
//   /telefoni/<id telefono>.json           il telefono si è collegato (scrive il telefono)
//
// Tutto quello che arriva dai telefoni è controllato prima di essere usato (cleanSpese, cleanLetto…).
(function (root) {
  "use strict";
  const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
  const txt = (v, max) => (typeof v === "string" ? v : typeof v === "number" && isFinite(v) ? String(v) : "").slice(0, max || 2000);
  const when = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]{5,12}Z?$/.test(v) ? v : "");
  const validDate = (d) => /^(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(d || ""));
  const slug = (n) => String(n || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  const safeId = (id) => String(id || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "_").slice(0, 80) || "x";
  // numero scritto come numero, "12.50" oppure all'italiana "1.250,50"
  const num = (v) => { if (v === "" || v == null || typeof v === "boolean") return null; if (typeof v === "number") return isFinite(v) ? v : null; const t = String(v).trim().replace(/\s|€/g, ""); if (!/^-?[\d.,]+$/.test(t)) return null; const n = Number(t.indexOf(",") >= 0 ? t.replace(/\./g, "").replace(",", ".") : t); return isFinite(n) ? n : null; };

  // ---------- dati inviati all'autista ----------
  // Si copiano SOLO i campi elencati qui. Prezzo, parcheggi, pasti, saldo, codice cliente, note interne e
  // tutta la parte contabile non sono nell'elenco: non possono finire nel file nemmeno per sbaglio.
  // o: { cliente, mezzo: {nome, posti, targa}, autisti: [nomi], alias, noPlate }
  function payload(b, o) {
    o = o || {};
    const busta = String(b.envelope || "") === "SI"; // dalla 2.6 anche gite, notturni e transfer con la busta
    const drivers = (o.autisti || []).map((x) => txt(x, 80).trim()).filter(Boolean).slice(0, 4);
    const m = o.mezzo || {};
    const out = {
      v: 1,
      id: safeId(b.id),
      foglio: txt(b.foglio, 30),
      tipo: txt(b.type, 20),
      dal: validDate(b.start) ? b.start : "",
      al: validDate(b.end) && b.end >= b.start ? b.end : (validDate(b.start) ? b.start : ""),
      ora: txt(b.time, 10),
      oraRientro: txt(b.time2, 10),
      cliente: txt(o.cliente, 200),
      itinerario: txt(b.route, 600),
      evento: txt(b.event, 200),
      passeggeri: txt(b.pax, 12),
      mezzo: { nome: txt(m.nome, 80), posti: txt(m.posti, 8), targa: o.noPlate ? "" : txt(m.targa, 20) },
      autisti: drivers,
      autistiId: drivers.map(slug),
      // la busta: numero e anticipo in contanti consegnato all'autista (serve all'app per la rimanenza)
      busta: busta ? { n: txt(b.envno, 12), anticipo: num(b.advance) } : null,
    };
    return out;
  }
  // impronta dei dati inviati: se dopo l'invio la prenotazione cambia in uno di questi campi, il foglio è «da reinviare»
  function hash(o) {
    const s = JSON.stringify(o); let h1 = 0xdeadbeef ^ s.length, h2 = 0x41c6ce57 ^ s.length;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
  }
  // il foglio (PDF) dipende anche da campi che non stanno nei dati: referenti, hotel, guide, programma, note per l'autista
  function sheetHash(b, o) {
    const extra = {};
    for (const k of ["contactName", "contactRole", "contactNote", "contact", "refs", "guides", "hotels", "dnotes", "program", "escort", "npark", "ndriver", "n3h", "nextra", "saldo", "saldoAmt", "advance"]) if (b[k] != null && b[k] !== "" && !(Array.isArray(b[k]) && !b[k].length)) extra[k] = b[k];
    return hash([payload(b, o), extra]);
  }

  // ---------- controllo di quello che scrivono i telefoni ----------
  const CATS = { pasti: "Pasti", hotel: "Hotel", parcheggi: "Parcheggi", carburante: "Carburante", extra: "Spese extra" };
  const FOTO = /^scontrini\/[A-Za-z0-9_.-]{1,60}\.(jpg|jpeg|png|webp)$/;
  function cleanSpese(j) {
    if (!isObj(j)) return null;
    // i km sono numeri interi: in un testo i punti sono separatori delle migliaia ("120.500" = 120500)
    const km = (v) => { const n = typeof v === "string" ? (/^[\d.\s]+$/.test(v.trim()) && /\d/.test(v) ? Number(v.replace(/\D/g, "")) : null) : num(v); return n != null && n >= 0 && n < 10000000 ? Math.round(n) : null; };
    const rows = [], seen = new Set();
    for (const r of Array.isArray(j.righe) ? j.righe.slice(0, 400) : []) {
      if (!isObj(r)) continue;
      const imp = num(r.importo); if (imp == null || imp < 0 || imp > 100000) continue;
      let id = txt(r.id, 40).replace(/[^A-Za-z0-9_-]/g, ""); if (!id || seen.has(id)) id = "r" + rows.length; seen.add(id);
      const foto = txt(r.foto, 100);
      rows.push({ id, cat: Object.prototype.hasOwnProperty.call(CATS, r.cat) ? r.cat : "extra", importo: Math.round(imp * 100) / 100, data: validDate(r.data) ? r.data : "", luogo: txt(r.luogo, 120), pag: r.pag === "carta" ? "carta" : "contanti", nota: txt(r.nota, 300), foto: FOTO.test(foto) && foto.indexOf("..") < 0 ? foto : "" });
    }
    return { v: 1, righe: rows, kmPartenza: km(j.kmPartenza), kmRientro: km(j.kmRientro), note: txt(j.note, 2000), consegnata: j.consegnata === true, consegnataAt: when(j.consegnataAt), autista: txt(j.autista, 80), telefono: txt(j.telefono, 30).replace(/[^a-z0-9]/g, ""), updatedAt: when(j.updatedAt) };
  }
  // conti della busta: i contanti spesi si tolgono dall'anticipo; la carta aziendale resta fuori dal conto
  function totals(sp, anticipo) {
    const c2 = (n) => Math.round(n * 100) / 100;
    let cash = 0, card = 0; const cat = {};
    for (const r of (sp && sp.righe) || []) { if (r.pag === "carta") card += r.importo; else cash += r.importo; cat[r.cat] = c2((cat[r.cat] || 0) + r.importo); }
    const a = num(anticipo), k1 = sp ? sp.kmPartenza : null, k2 = sp ? sp.kmRientro : null;
    return { contanti: c2(cash), carta: c2(card), totale: c2(cash + card), cat, anticipo: a, rimanenza: a == null ? null : c2(a - cash), km: k1 != null && k2 != null && k2 >= k1 ? k2 - k1 : null, n: ((sp && sp.righe) || []).length };
  }
  function cleanLetto(j) { if (!isObj(j) || !when(j.at)) return null; const n = Number(j.n); return { at: j.at, n: Number.isInteger(n) && n > 0 && n < 100000 ? n : 0, autista: txt(j.autista, 80) }; }
  function cleanPhone(j) { if (!isObj(j)) return null; return { at: when(j.collegatoAt) || when(j.at), last: when(j.ultimoAccesso) || when(j.last), ua: txt(j.dispositivo || j.ua, 120), autista: txt(j.autista, 80) }; }
  // collegamento per il telefono: i dati stanno dopo il # (non arrivano mai al sito, restano sul telefono)
  function b64u(s) { const bytes = typeof TextEncoder !== "undefined" ? new TextEncoder().encode(s) : Buffer.from(s, "utf8"); let bin = ""; for (const x of bytes) bin += String.fromCharCode(x); return (typeof btoa !== "undefined" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function phoneLink(appUrl, key, refresh, driver, pid) {
    return String(appUrl || "").replace(/#.*$/, "") + "#c=" + b64u(JSON.stringify({ v: 1, k: key, r: refresh, a: driver, p: pid }));
  }
  // il file è davvero un'immagine? (si guarda l'inizio del file, non il nome)
  function imageType(buf) {
    const b = new Uint8Array(buf.slice ? buf.slice(0, 16) : buf);
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
    return "";
  }

  const PURE = { payload, hash, sheetHash, cleanSpese, totals, cleanLetto, cleanPhone, phoneLink, imageType, slug, safeId, CATS };
  if (!root.document) { if (typeof module !== "undefined") module.exports = PURE; return; }

  // =====================================================================================
  // Da qui in giù: solo nel browser (Dropbox, copia locale dello stato, codice QR)
  // =====================================================================================
  const enc = new TextEncoder(), dec = new TextDecoder();
  const CK = "agenda-autisti-v1", SSK = "dbxa-key", SSP = "dbxa-purpose";
  const hooks = { onChange() {} };
  function lsGet(k, d) { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return isObj(v) ? v : d; } catch (_) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  // copia locale: per ogni servizio inviato, chi l'ha aperto e il riassunto della busta
  let st = lsGet(CK, null);
  const badName = (k) => k === "__proto__" || k === "constructor" || k === "prototype";
  const flat = (src) => { const o = Object.create(null); if (isObj(src)) for (const k of Object.keys(src)) if (!badName(k)) o[k] = src[k]; return o; };
  function newItem(it) { it = isObj(it) ? it : {}; return { op: flat(it.op), sp: isObj(it.sp) ? it.sp : null, re: when(it.re), revs: flat(it.revs) }; }
  function okState(x) {
    // elenchi senza prototipo: un nome come "__proto__" o "constructor" scritto da un telefono resta un nome qualsiasi
    const o = { cursor: "", fp: "", items: Object.create(null), phones: Object.create(null), at: 0 };
    if (!isObj(x)) return o;
    o.cursor = txt(x.cursor, 2000); o.fp = txt(x.fp, 80); o.at = Number(x.at) || 0;
    if (isObj(x.items)) for (const k of Object.keys(x.items)) { const it = x.items[k]; if (!/^[a-z0-9_-]{1,80}$/.test(k) || badName(k) || !isObj(it)) continue; o.items[k] = newItem(it); }
    if (isObj(x.phones)) for (const k of Object.keys(x.phones)) if (/^[a-z0-9]{6,24}$/.test(k) && !badName(k) && isObj(x.phones[k])) o.phones[k] = x.phones[k];
    return o;
  }
  st = okState(st);

  // ---------- collegamento alla cartella degli autisti ----------
  const cfg = () => root.STORE.aut;
  let officeTok = null;
  let linkKey = ""; // App key del collegamento in corso (può essere diversa da quella salvata, se si cambia app)
  const keyNow = () => { if (linkKey) return linkKey; const a = cfg(); if (a && a.key) return a.key; try { return sessionStorage.getItem(SSK) || ""; } catch (_) { return ""; } };
  const cli = root.DBX.make({ key: keyNow, read: () => officeTok, save: (t) => { officeTok = t; }, ss: "dbxa" });
  function linked() { const a = cfg(); return !!(a && a.key && a.office && a.office.refresh); }
  function client() {
    if (!linked()) throw { code: "nolink" };
    const rt = cfg().office.refresh;
    if (cli.refreshToken() !== rt) cli.setToken({ refresh: rt, access: "", exp: 0 });
    return cli;
  }
  // primo collegamento (Super Master): l'ufficio autorizza l'app degli autisti; poi si torna qui
  function startLink(key, purpose) {
    linkKey = String(key || keyNow());
    try { sessionStorage.setItem(SSK, linkKey); sessionStorage.setItem(SSP, JSON.stringify(purpose || { t: "office" })); } catch (_) {}
    return cli.startLogin();
  }
  const redirectMine = () => cli.isMine();
  function purpose() { try { const p = JSON.parse(sessionStorage.getItem(SSP) || "null"); return isObj(p) ? p : null; } catch (_) { return null; } }
  async function takeRedirect() {
    try { linkKey = sessionStorage.getItem(SSK) || ""; } catch (_) { linkKey = ""; }
    const p = purpose(), key = keyNow();
    let tok = null, err = null;
    try { tok = await cli.takeCode(); } catch (e) { err = e; } finally { linkKey = ""; }
    try { sessionStorage.removeItem(SSP); sessionStorage.removeItem(SSK); } catch (_) {}
    return { purpose: p, key, tok, err };
  }
  // un collegamento a parte (quello di un telefono, o uno appena creato e non più voluto): si può revocare da solo
  function oneOff(refresh, key) { return root.DBX.make({ key: () => key || keyNow(), read: () => ({ refresh, access: "", exp: 0 }), save() {}, ss: "dbxr" }); }
  async function revoke(refresh, key) {
    if (!refresh) return true;
    try { await oneOff(refresh, key).revokeStrict(); return true; }
    catch (e) { if (e && e.code === "no_auth") return true; throw e; } // già revocato
  }
  // la cartella è raggiungibile con questo collegamento? (e si creano le due cartelle di base)
  // probeId: identificativo Dropbox di un file dell'Agenda. Un'app «App folder» non lo può vedere; un'app
  // «Full Dropbox» sì: in quel caso i telefoni vedrebbero tutto il Dropbox dell'azienda, e ci si ferma qui.
  async function prepare(refresh, key, probeId) {
    const c = oneOff(refresh, key);
    const top = new Set(); let res = await c.listFolder("", null);
    while (res) { for (const e of res.entries) { const seg = e[".tag"] === "deleted" ? "" : String(e.path_lower || "").split("/")[1] || ""; if (seg) top.add(seg); } res = res.has_more && top.size < 60 ? await c.listFolder("", res.cursor) : null; }
    for (const n of top) if (!["servizi", "telefoni", "leggimi.txt"].includes(n)) throw { code: "notappfolder" };
    if (probeId && /^id:[\w-]{4,80}$/.test(String(probeId))) { let seen = null; try { seen = await c.metadata(String(probeId)); } catch (_) {} if (seen) throw { code: "notappfolder" }; }
    for (const p of ["/servizi", "/telefoni"]) await c.createFolder(p);
    await c.upload("/LEGGIMI.txt", enc.encode("Cartella «Autisti La Terra».\r\nQui l'Agenda Flotta mette i fogli di servizio per gli autisti e l'app degli autisti scrive spese, km e note.\r\nNon spostare e non rinominare i file a mano: li gestiscono l'Agenda e l'app degli autisti.\r\n"), "overwrite");
    return true;
  }

  // ---------- invio e ritiro di un foglio ----------
  const dirOf = (b) => (b.sent && b.sent.dir) || ((validDate(b.start) ? b.start.slice(0, 4) : String(new Date().getFullYear())) + "/" + safeId(b.id));
  const baseOf = (b) => "/servizi/" + dirOf(b);
  async function send(b, blob, o) {
    const c = client(), base = baseOf(b), at = new Date().toISOString(), n = ((b.sent && b.sent.n) || 0) + 1;
    const data = payload(b, o);
    if (!data.autisti.length) throw { code: "nodriver" };
    const h = sheetHash(b, o);
    const buf = new Uint8Array(await blob.arrayBuffer());
    if (!(buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)) throw { code: "nopdf" };
    const m = await c.upload(base + "/foglio.pdf", buf, "overwrite");
    data.inviato = { at, da: txt(o.by, 80), n };
    data.pdf = { file: "foglio.pdf", rev: (m && m.rev) || "", size: buf.length };
    data.ritirato = null;
    await c.upload(base + "/foglio.json", enc.encode(JSON.stringify(data, null, 1)), "overwrite");
    return { at, by: txt(o.by, 80), n, to: data.autisti.slice(), dir: dirOf(b), h, alias: !!o.alias, noPlate: !!o.noPlate };
  }
  async function withdraw(b, by) {
    const c = client(), base = baseOf(b), at = new Date().toISOString();
    await c.upload(base + "/foglio.json", enc.encode(JSON.stringify({ v: 1, id: safeId(b.id), foglio: txt(b.foglio, 30), autisti: [], autistiId: [], ritirato: { at, da: txt(by, 80) } }, null, 1)), "overwrite");
    await c.remove(base + "/foglio.pdf");
    return { at, by: txt(by, 80) };
  }
  async function reopen(b, by) {
    const c = client(), at = new Date().toISOString();
    await c.upload(baseOf(b) + "/ufficio.json", enc.encode(JSON.stringify({ v: 1, riaperta: { at, da: txt(by, 80) } }, null, 1)), "overwrite");
    const it = st.items[safeId(b.id)] || (st.items[safeId(b.id)] = newItem());
    it.re = at; lsSet(CK, st); hooks.onChange();
    return at;
  }

  // ---------- lettura di quello che hanno scritto i telefoni ----------
  async function pool(items, n, fn) { let i = 0; const w = async () => { while (i < items.length) { const k = i++; try { await fn(items[k]); } catch (_) {} } }; await Promise.all(Array.from({ length: Math.min(n, items.length) }, w)); }
  const parse = (buf) => { try { return JSON.parse(dec.decode(buf)); } catch (_) { return null; } };
  const RE_SRV = /^\/servizi\/\d{4}\/([a-z0-9_-]{1,80})\/(letto_([a-z0-9-]{1,60})\.json|spese\.json|ufficio\.json)$/, RE_TEL = /^\/telefoni\/([a-z0-9]{6,24})\.json$/;
  let syncing = null, lastErr = "";
  function sync() { if (!syncing) syncing = syncOnce().finally(() => { syncing = null; }); return syncing; }
  async function syncOnce() {
    if (!linked() || !navigator.onLine) return false;
    let c; try { c = client(); } catch (_) { return false; }
    const fp = hash([cfg().key, cfg().office.refresh]);
    if (st.fp !== fp) st = Object.assign(okState(null), { fp }); // cartella diversa da prima: si riparte da capo
    try {
      let res;
      try { res = await c.listFolder("", st.cursor || null); }
      catch (e) { if (e && e.code === "reset") { st.cursor = ""; res = await c.listFolder("", null); } else throw e; }
      const seen = new Map(); let next = st.cursor;
      while (res) { for (const e of res.entries) seen.set(String(e.path_lower || "").toLowerCase(), e); next = res.cursor; res = res.has_more ? await c.listFolder("", res.cursor) : null; }
      const jobs = []; let touched = false;
      for (const [p, e] of seen) {
        try { // una voce guasta non deve fermare le altre (né il segnalibro della cartella)
          const m = RE_SRV.exec(p), t = m ? null : RE_TEL.exec(p);
          if (m) {
            if (badName(m[1]) || (m[3] && badName(m[3]))) continue;
            const it = st.items[m[1]] || (st.items[m[1]] = newItem()), f = m[2];
            if (e[".tag"] === "deleted") { if (m[3]) delete it.op[m[3]]; else if (f === "spese.json") it.sp = null; else it.re = ""; delete it.revs[f]; touched = true; continue; }
            if (e[".tag"] !== "file" || it.revs[f] === e.rev || (e.size || 0) > 2000000) continue;
            jobs.push({ p, e, it, f, who: m[3] || "" });
          } else if (t) {
            if (badName(t[1])) continue;
            if (e[".tag"] === "deleted") { delete st.phones[t[1]]; touched = true; continue; }
            if (e[".tag"] !== "file" || (st.phones[t[1]] && st.phones[t[1]].rev === e.rev) || (e.size || 0) > 20000) continue;
            jobs.push({ p, e, tel: t[1] });
          }
        } catch (_) {}
      }
      await pool(jobs, 5, async (jb) => {
        const f = await c.download(jb.e.path_lower || jb.p); if (!f) return;
        const j = parse(f.buf), rev = (f.meta && f.meta.rev) || jb.e.rev || "";
        if (jb.tel) { const ph = cleanPhone(j); if (ph) { st.phones[jb.tel] = Object.assign(ph, { rev }); touched = true; } return; }
        if (jb.who) { const l = cleanLetto(j); if (l) jb.it.op[jb.who] = l; else delete jb.it.op[jb.who]; }
        else if (jb.f === "spese.json") { const sp = cleanSpese(j); jb.it.sp = sp ? { n: sp.righe.length, contanti: totals(sp).contanti, carta: totals(sp).carta, km1: sp.kmPartenza, km2: sp.kmRientro, deliv: sp.consegnata, delivAt: sp.consegnataAt, upd: sp.updatedAt, by: sp.autista } : null; }
        else { jb.it.re = isObj(j) && isObj(j.riaperta) ? when(j.riaperta.at) : ""; }
        jb.it.revs[jb.f] = rev; touched = true;
      });
      st.cursor = next || ""; st.at = Date.now(); lastErr = "";
      lsSet(CK, st);
      if (touched) hooks.onChange();
      return true;
    } catch (e) { lastErr = (e && e.code) || "error"; return false; }
  }
  // stato di un foglio inviato: "ritirato" | "consegnata" | "aperto" | "inviato"
  function status(b) {
    const s = b && b.sent; if (!s || !s.at) return null;
    if (s.off && s.off.at) return { k: "ritirato", at: s.off.at, by: s.off.by };
    const it = st.items[safeId(b.id)] || {}, sp = it.sp || null;
    const busta = String(b.envelope || "") === "SI";
    const dAt = sp && sp.delivAt && Date.parse(sp.delivAt) <= Date.now() + 600000 ? sp.delivAt : "";
    const deliv = !!(busta && sp && sp.deliv && !(it.re && it.re > dAt));
    const ops = Object.values(it.op || {}).filter((x) => x && x.at), cur = ops.filter((x) => (x.n ? x.n >= s.n : x.at >= s.at)).sort((a, z) => (a.at < z.at ? -1 : 1));
    // opened / openedBy: quando e da chi è stata aperta la versione inviata per ultima
    const base = { at: s.at, by: s.by, n: s.n, to: s.to || [], sp, re: it.re || "", openedOld: !cur.length && ops.length > 0, opened: cur.length ? cur[0].at : "", openedBy: cur.map((x) => x.autista).filter(Boolean).join(" e ") };
    if (deliv) return Object.assign(base, { k: "consegnata", when: dAt || sp.upd || "", who: sp.by || "" });
    if (cur.length) return Object.assign(base, { k: "aperto", when: cur[0].at, who: base.openedBy });
    return Object.assign(base, { k: "inviato", when: s.at });
  }
  async function spese(b) {
    const f = await client().download(baseOf(b) + "/spese.json"); if (!f) return null;
    return cleanSpese(parse(f.buf));
  }
  async function photo(b, rel) {
    if (!FOTO.test(rel) || rel.indexOf("..") >= 0) throw { code: "badphoto" };
    const f = await client().download(baseOf(b) + "/" + rel); if (!f) throw { code: "nophoto" };
    const type = imageType(f.buf); if (!type || f.buf.byteLength > 20000000) throw { code: "badphoto" };
    return new Blob([f.buf], { type });
  }

  // ---------- codice QR (disegnato qui: il collegamento non esce mai dal dispositivo) ----------
  function qrSvg(text) {
    const q = root.QRGEN.make(String(text), "M"), n = q.size, z = 4; let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.dark(r, c)) d += "M" + (c + z) + " " + (r + z) + "h1v1h-1z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n + 2 * z) + " " + (n + 2 * z) + '" role="img" aria-label="Codice QR per collegare il telefono" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path fill="#000" d="' + d + '"/></svg>';
  }
  const newPhoneId = () => { const r = crypto.getRandomValues(new Uint8Array(8)); let s = "t"; for (const x of r) s += (x % 36).toString(36); return s; };

  (root.AGENDA_FILES = root.AGENDA_FILES || {}).autisti = "2.6";
  const API = Object.assign({}, PURE, {
    configure(h) { Object.assign(hooks, h); },
    linked, startLink, redirectMine, purpose, takeRedirect, revoke, prepare,
    send, withdraw, reopen, sync, status, spese, photo, qrSvg, newPhoneId, dirOf,
    phone: (pid) => st.phones[pid] || null,
    forget() { st = okState(null); lsSet(CK, st); officeTok = null; },
  });
  Object.defineProperty(API, "lastSync", { get: () => st.at, enumerable: true });
  Object.defineProperty(API, "lastError", { get: () => lastErr, enumerable: true });
  root.AUT = API;
})(typeof window !== "undefined" ? window : globalThis);
