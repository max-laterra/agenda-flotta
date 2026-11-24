// Agenda Flotta La Terra – bozze di fattura (dalla 2.4)
// Qui ci sono solo calcoli e testo: impostazioni contabili, righe della fattura a partire dai servizi,
// totali (scorporo dell'IVA dai prezzi IVA compresa, sconto, arrotondamento, scissione dei pagamenti)
// e il file XML nel formato della fattura elettronica (FatturaPA 1.2: FPR12 privati, FPA12 enti pubblici).
// Nessun accesso alla pagina o a Dropbox: lo usa app.js e si può provare da solo.
(function (root) {
  "use strict";
  const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
  const str = (v, max) => (typeof v === "string" ? v : typeof v === "number" && isFinite(v) ? String(v) : "").slice(0, max || 2000);
  // numeri: solo numeri veri o testi ("12,5", "1.250,50"); qualsiasi altra cosa (oggetti, vero/falso) vale il valore di riserva
  // 4.0.4: numeri all'italiana: «€ 12,50» → 12.5, «1.234,50» → 1234.5, «10.000» e «1.234» (punto e gruppi di 3 cifre) → migliaia
  const numOr = (v, d) => {
    if (typeof v === "number") return isFinite(v) ? v : d;
    if (typeof v !== "string") return d;
    let s = v.replace(/[€\s\u00A0]/g, "").replace(/^eur(o)?/i, "").replace(/eur(o)?$/i, "");
    if (!s) return d;
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    const n = Number(s); return isFinite(n) ? n : d;
  };
  // una voce è nell'elenco solo se c'è davvero (non "constructor", "toString" e simili)
  const has = (T, k) => typeof k === "string" && Object.prototype.hasOwnProperty.call(T, k);
  const BAD_ID = ["__proto__", "constructor", "prototype"];
  // centesimi interi: i conti si fanno qui, senza i resti dei numeri con la virgola
  const cents = (x) => { x = Number(x) || 0; return (x < 0 ? -1 : 1) * Math.round(Math.abs(x) * 100 + 1e-7); };
  const r2 = (x) => cents(x) / 100;
  const amt = (x) => (cents(x) / 100).toFixed(2);
  const dec = (x, min, max) => { let s = (Number(x) || 0).toFixed(max); s = s.replace(/0+$/, ""); const d = (s.split(".")[1] || "").length; return d < min ? (Number(x) || 0).toFixed(min) : s; };
  const DATE_RE = /^(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  const okDate = (d) => typeof d === "string" && DATE_RE.test(d);
  const addDays = (d, n) => { const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const MESI = ["GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO", "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE"];

  // ---------- tabelle della fattura elettronica ----------
  const REGIMI = { RF01: "Ordinario", RF02: "Contribuenti minimi", RF04: "Agricoltura e attività connesse e pesca", RF05: "Vendita sali e tabacchi", RF06: "Commercio fiammiferi", RF07: "Editoria", RF08: "Gestione servizi telefonia pubblica", RF09: "Rivendita documenti di trasporto pubblico e di sosta", RF10: "Intrattenimenti, giochi e altre attività", RF11: "Agenzie viaggi e turismo", RF12: "Agriturismo", RF13: "Vendite a domicilio", RF14: "Rivendita beni usati, oggetti d'arte, antiquariato", RF15: "Agenzie di vendite all'asta", RF16: "IVA per cassa P.A.", RF17: "IVA per cassa", RF18: "Altro", RF19: "Forfettario" };
  const NATURE = { "N1": "Escluse ex art. 15", "N2.1": "Non soggette (artt. da 7 a 7-septies)", "N2.2": "Non soggette – altri casi (fuori campo IVA)", "N3.1": "Non imponibili – esportazioni", "N3.2": "Non imponibili – cessioni intracomunitarie", "N3.3": "Non imponibili – cessioni verso San Marino", "N3.4": "Non imponibili – operazioni assimilate alle esportazioni", "N3.5": "Non imponibili – dichiarazioni d'intento", "N3.6": "Non imponibili – altre operazioni", "N4": "Esenti", "N5": "Regime del margine / IVA non esposta", "N6.1": "Inversione contabile – rottami", "N6.2": "Inversione contabile – oro e argento", "N6.3": "Inversione contabile – subappalto edilizia", "N6.4": "Inversione contabile – fabbricati", "N6.5": "Inversione contabile – telefoni cellulari", "N6.6": "Inversione contabile – prodotti elettronici", "N6.7": "Inversione contabile – comparto edile", "N6.8": "Inversione contabile – settore energetico", "N6.9": "Inversione contabile – altri casi", "N7": "IVA assolta in altro Stato UE" };
  const TIPI_DOC = { TD01: "Fattura", TD02: "Acconto / anticipo su fattura", TD04: "Nota di credito", TD24: "Fattura differita" };
  // dalla 2.6 nelle tendine ci sono solo Fattura e Nota di credito (una bozza vecchia di un altro tipo resta com'è)
  const TIPI_SCELTA = { TD01: "Fattura", TD04: "Nota di credito" };
  const MOD_PAG = { MP05: "Bonifico", MP01: "Contanti", MP02: "Assegno", MP08: "Carta di pagamento", MP12: "RIBA", MP19: "SEPA Direct Debit", MP23: "PagoPA" };
  const COND_PAG = { TP02: "Pagamento completo", TP01: "Pagamento a rate", TP03: "Anticipo" };
  // a cosa serve una causale: quando l'agenda prepara le righe sceglie quella con l'uso giusto
  const USI = { gita: "Gita (un servizio)", transfer: "Transfer (un servizio)", tour: "Tour", notturno: "Notturno", "riep-gita": "Riepilogo di più gite", "riep-transfer": "Riepilogo di più transfer", riep: "Riepilogo di servizi diversi", parcheggi: "Rimborso parcheggi", pasti: "Rimborso pasti", libera: "Da scegliere a mano" };
  const ARROT = { no: "Nessuno", "0.05": "Ai 5 centesimi", "0.10": "Ai 10 centesimi", "0.50": "Ai 50 centesimi", "1": "All'euro" };
  const VERSI = { vicino: "Al più vicino", giu: "Per difetto (a favore del cliente)", su: "Per eccesso" };

  // ---------- impostazioni della sezione Contabilità ----------
  // I dati che seguono sono quelli già stampati sul foglio di servizio. IBAN e banca NON sono scritti qui
  // (il programma sta su un sito pubblico): si inseriscono una volta nella sezione Contabilità e restano in Dropbox.
  function defaults() {
    return {
      v: 1,
      azienda: { nome: "LA TERRA S.R.L.", paese: "IT", piva: "00826460883", cf: "00826460883", regime: "RF01", indirizzo: "VIA ARCHIMEDE, 285/C", civico: "", cap: "97100", comune: "RAGUSA", prov: "RG", nazione: "IT", tel: "0932626240", email: "", pec: "laterrasrl@pec.it", sdi: "M5UXCR1", reaUfficio: "", reaNumero: "", capitale: "", socioUnico: "", liquidazione: "LN", iban: "", banca: "", abi: "", cab: "", bic: "", beneficiario: "" },
      aliquote: [
        { id: "iva10", nome: "IVA 10%", perc: 10, natura: "", rif: "" },
        { id: "iva22", nome: "IVA 22%", perc: 22, natura: "", rif: "" },
        { id: "n22", nome: "Fuori campo IVA (N2.2)", perc: 0, natura: "N2.2", rif: "Fuori campo IVA" },
        { id: "n1", nome: "Escluso art. 15 (N1)", perc: 0, natura: "N1", rif: "Escluso art. 15 DPR 633/72" },
      ],
      causali: [
        { id: "gita", nome: "Gita / escursione", uso: "gita", testo: "NOLEGGIO {MEZZO} IL {DATA} PER {ITINERARIO}", aliq: "iva10" },
        { id: "transfer", nome: "Transfer", uso: "transfer", testo: "NOLEGGIO {MEZZO} IL {DATA} PER TRASFERIMENTO {ITINERARIO}", aliq: "iva10" },
        { id: "tour", nome: "Tour", uso: "tour", testo: "NOLEGGIO {MEZZO} PER TOUR {PERIODO}. {ITINERARIO}", aliq: "iva10" },
        { id: "notturno", nome: "Notturno", uso: "notturno", testo: "NOLEGGIO {MEZZO} IL {DATA} PER {ITINERARIO}", aliq: "iva10" },
        { id: "rgite", nome: "Riepilogo del mese – escursioni", uso: "riep-gita", testo: "NOLEGGIO PULLMAN PER ESCURSIONI EFFETTUATE NEL MESE DI {MESE} COME DA PROSPETTO A VOI INVIATO E CONFERMATO.", aliq: "iva10" },
        { id: "rtransfer", nome: "Riepilogo del mese – trasferimenti", uso: "riep-transfer", testo: "NOLEGGIO PULLMAN PER TRASFERIMENTI EFFETTUATI NEL MESE DI {MESE} COME DA PROSPETTO A VOI INVIATO E CONFERMATO", aliq: "iva10" },
        { id: "rmisto", nome: "Riepilogo del mese – servizi diversi", uso: "riep", testo: "NOLEGGIO PULLMAN PER SERVIZI EFFETTUATI NEL MESE DI {MESE} COME DA PROSPETTO A VOI INVIATO E CONFERMATO", aliq: "iva10" },
        { id: "parcheggi", nome: "Rimborso parcheggi", uso: "parcheggi", testo: "RIMBORSO SPESE ANTICIPATE PER PARCHEGGI {PARCHEGGIO}", aliq: "" },
        { id: "pasti", nome: "Rimborso pasti autista", uso: "pasti", testo: "RIMBORSO SPESE ANTICIPATE PER PASTI LIBERI AUTISTA", aliq: "iva10" },
      ],
      mezzi: { bus: "PULLMAN DA {POSTI} POSTI", van: "MINIVAN DA {POSTI} POSTI", auto: "AUTO" },
      opzioni: { lordi: true, maiuscole: true, tipo: "TD01", mod: "MP05", cond: "TP02", giorni: 0, giorniPA: 30, splitPA: true, scontoPerc: 0, arrot: "no", arrotVerso: "vicino", bolloImporto: 2, ultimoNum: "", ultimoAnno: 0 },
    };
  }
  const ID_RE = /^[A-Za-z0-9_-]{1,24}$/;
  const up = (s) => String(s || "").toUpperCase();
  // Il file contabilita.json letto da Dropbox: si tiene solo quello che ha la forma giusta, il resto torna ai valori di partenza.
  const okIso = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);
  function cleanContab(j) {
    const D = defaults();
    if (!isObj(j)) return D;
    const o = { v: 1, updatedAt: str(j.updatedAt, 40), updBy: str(j.updBy, 80) };
    const a = isObj(j.azienda) ? j.azienda : {}, A = {};
    for (const k of Object.keys(D.azienda)) A[k] = k in a ? str(a[k], 200).trim() : D.azienda[k];
    A.paese = /^[A-Z]{2}$/.test(up(A.paese)) ? up(A.paese) : "IT"; A.nazione = /^[A-Z]{2}$/.test(up(A.nazione)) ? up(A.nazione) : "IT";
    A.regime = has(REGIMI, A.regime) ? A.regime : "RF01"; A.prov = up(A.prov).slice(0, 2); A.iban = up(A.iban).replace(/\s+/g, "").slice(0, 34);
    A.socioUnico = A.socioUnico === "SU" || A.socioUnico === "SM" ? A.socioUnico : ""; A.liquidazione = A.liquidazione === "LS" ? "LS" : "LN";
    o.azienda = A;
    const seen = new Set();
    let taken = new Set();
    const okId = (id) => { id = str(id, 40); return ID_RE.test(id) && !BAD_ID.includes(id) ? id : ""; };
    const reserve = (list) => { taken = new Set(list.filter(isObj).map((x) => okId(x.id)).filter(Boolean)); seen.clear(); };
    const uniq = (id, pre, i) => { id = okId(id); if (!id || seen.has(id)) { let n = i; do { id = pre + n++; } while (seen.has(id) || taken.has(id)); } seen.add(id); return id; };
    reserve(Array.isArray(j.aliquote) ? j.aliquote : D.aliquote);
    o.aliquote = (Array.isArray(j.aliquote) ? j.aliquote : D.aliquote).filter(isObj).slice(0, 40).map((x, i) => {
      let perc = numOr(x.perc, 0); perc = perc >= 0 && perc <= 100 ? Math.round(perc * 100) / 100 : 0;
      const natura = perc === 0 ? (has(NATURE, str(x.natura, 6)) ? str(x.natura, 6) : "N2.2") : "";
      return { id: uniq(x.id, "al", i), nome: str(x.nome, 80).trim() || (perc ? "IVA " + String(perc).replace(".", ",") + "%" : natura), perc, natura, rif: str(x.rif, 100).trim() };
    });
    if (!o.aliquote.length) o.aliquote = D.aliquote;
    const okAl = (id) => (o.aliquote.some((x) => x.id === id) ? id : "");
    reserve(Array.isArray(j.causali) ? j.causali : D.causali);
    o.causali = (Array.isArray(j.causali) ? j.causali : D.causali).filter(isObj).slice(0, 80).map((x, i) => ({ id: uniq(x.id, "c", i), nome: str(x.nome, 80).trim() || "Causale " + (i + 1), uso: has(USI, str(x.uso, 20)) ? str(x.uso, 20) : "libera", testo: str(x.testo, 900), aliq: okAl(str(x.aliq, 40)) }));
    const m = isObj(j.mezzi) ? j.mezzi : {}; o.mezzi = {};
    for (const k of Object.keys(D.mezzi)) o.mezzi[k] = typeof m[k] === "string" && m[k].trim() ? m[k].slice(0, 80) : D.mezzi[k];
    const p = isObj(j.opzioni) ? j.opzioni : {}, O = {};
    O.lordi = "lordi" in p ? p.lordi !== false : D.opzioni.lordi; O.maiuscole = "maiuscole" in p ? p.maiuscole !== false : true;
    O.tipo = has(TIPI_SCELTA, p.tipo) ? p.tipo : "TD01"; O.mod = has(MOD_PAG, p.mod) ? p.mod : "MP05"; O.cond = has(COND_PAG, p.cond) ? p.cond : "TP02";
    const days = (v, d) => { const n = Math.round(numOr(v, d)); return n >= 0 && n <= 365 ? n : d; };
    O.giorni = days(p.giorni, 0); O.giorniPA = days(p.giorniPA, 30); O.splitPA = "splitPA" in p ? p.splitPA !== false : true;
    const sp = numOr(p.scontoPerc, 0); O.scontoPerc = sp >= 0 && sp <= 100 ? Math.round(sp * 100) / 100 : 0;
    O.arrot = has(ARROT, str(p.arrot, 6)) ? str(p.arrot, 6) : "no"; O.arrotVerso = has(VERSI, p.arrotVerso) ? p.arrotVerso : "vicino";
    const bi = numOr(p.bolloImporto, 2); O.bolloImporto = bi >= 0 && bi <= 100 ? r2(bi) : 2;
    // 3.0.4: ultimo numero di fattura emesso fuori dall'agenda (programma di contabilità) e il suo anno: serve per proporre il numero
    O.ultimoNum = str(p.ultimoNum, 20).trim(); const ua = Math.round(numOr(p.ultimoAnno, 0)); O.ultimoAnno = ua >= 2000 && ua <= 2099 ? ua : 0;
    o.opzioni = O;
    // 4.0.6: e-mail al cliente con la copia di cortesia (testi e indirizzo del server postale della fase 2)
    const ml = isObj(j.mail) ? j.mail : {};
    o.mail = { oggetto: str(ml.oggetto, 300), testo: str(ml.testo, 6000), firma: str(ml.firma, 1000), mittente: str(ml.mittente, 120), rdOggetto: str(ml.rdOggetto, 300), rdTesto: str(ml.rdTesto, 6000), server: /^https:\/\/[A-Za-z0-9.-]+(:\d{2,5})?(\/[\w./-]*)?$/.test(str(ml.server, 300).trim()) ? str(ml.server, 300).trim() : "" };
    return o;
  }

  // ---------- bozza ----------
  const newId = (pre) => pre + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const CLI = ["code", "nome", "paese", "piva", "cf", "sdi", "pec", "indirizzo", "civico", "cap", "comune", "prov", "nazione"];
  function cleanCliente(c) {
    c = isObj(c) ? c : {}; const o = {};
    for (const k of CLI) o[k] = str(c[k], 200).trim();
    o.paese = /^[A-Z]{2}$/.test(up(o.paese)) ? up(o.paese) : "IT"; o.nazione = /^[A-Z]{2}$/.test(up(o.nazione)) ? up(o.nazione) : "IT";
    o.prov = up(o.prov).slice(0, 2); o.sdi = up(o.sdi).replace(/\s+/g, "").slice(0, 7); o.piva = up(o.piva).replace(/[\s.\-]+/g, "").slice(0, 28);
    // 3.0.4: cliente estero: al posto del codice fiscale un identificativo del suo paese (fino a 28 caratteri), CAP del suo paese
    if (/^[A-Z]{2}/i.test(o.piva) && up(o.piva).slice(0, 2) === o.paese) o.piva = o.piva.slice(2); // la sigla del paese scritta anche davanti al numero
    const est = o.nazione !== "IT"; o.cf = up(o.cf).replace(/\s+/g, "").slice(0, est ? 28 : 16); o.cap = o.cap.slice(0, 12); if (est) o.prov = "";
    o.pa = !!c.pa;
    return o;
  }
  function cleanDraft(j) {
    if (!isObj(j) || !ID_RE.test(str(j.id, 40)) || BAD_ID.includes(j.id)) return null;
    const o = { v: 1, id: str(j.id, 40), createdAt: str(j.createdAt, 40), createdBy: str(j.createdBy, 80), updatedAt: str(j.updatedAt, 40), updBy: str(j.updBy, 80), xmlAt: str(j.xmlAt, 40), xmlBy: str(j.xmlBy, 80), xmlName: str(j.xmlName, 160), xmlPath: str(j.xmlPath, 300), xmlProg: /^[A-Z0-9]{5}$/.test(str(j.xmlProg, 5)) ? str(j.xmlProg, 5) : "" };
    o.tipo = has(TIPI_DOC, j.tipo) ? j.tipo : "TD01"; o.numero = str(j.numero, 20).trim(); o.data = okDate(j.data) ? j.data : ""; o.causale = str(j.causale, 1000); o.causaleId = ID_RE.test(str(j.causaleId, 40)) && !BAD_ID.includes(j.causaleId) ? str(j.causaleId, 40) : "";
    o.cliente = cleanCliente(j.cliente);
    o.servizi = (Array.isArray(j.servizi) ? j.servizi : []).filter(isObj).slice(0, 400).map((s) => ({ id: str(s.id, 60), start: okDate(s.start) ? s.start : "", foglio: str(s.foglio, 20) })).filter((s) => s.id && s.start);
    o.modo = j.modo === "riepilogo" ? "riepilogo" : "singole";
    o.lordi = j.lordi !== false;
    const rids = new Set();
    o.righe = (Array.isArray(j.righe) ? j.righe : []).filter(isObj).slice(0, 300).map((r, i) => {
      const q = numOr(r.qta, 1), sc = numOr(r.sc, 0), tipo = ["noleggio", "parcheggi", "pasti", "sconto", "bollo", "libera"].includes(r.tipo) ? r.tipo : "libera";
      let id = ID_RE.test(str(r.id, 40)) && !BAD_ID.includes(r.id) ? str(r.id, 40) : "r" + i; for (let n = i; rids.has(id); n++) id = "r" + n + "_" + i; rids.add(id);
      let prezzo = Math.max(-1e9, Math.min(1e9, numOr(r.prezzo, 0))); if (tipo === "sconto") prezzo = -Math.abs(prezzo); // uno sconto in euro toglie sempre
      return { id, tipo, desc: str(r.desc, 1000), qta: q > 0 && q < 1e6 ? q : 1, prezzo, sc: sc >= 0 && sc <= 100 ? Math.round(sc * 100) / 100 : 0, aliq: str(r.aliq, 40), fogli: (Array.isArray(r.fogli) ? r.fogli : []).slice(0, 400).map((x) => str(x, 20)).filter(Boolean), ...(r.auto ? { auto: str(r.auto, 1000) } : {}) };
    });
    const sp = numOr(j.scontoPerc, 0); o.scontoPerc = sp >= 0 && sp <= 100 ? Math.round(sp * 100) / 100 : 0;
    // arrotondamento: automatico (regola della Contabilità), a un passo scelto sulla bozza (euro, 50 o 10 centesimi) oppure un importo fisso
    o.arrotAuto = j.arrotAuto !== false; o.arrot = Math.max(-1000, Math.min(1000, r2(numOr(j.arrot, 0))));
    o.arrotStep = [0.1, 0.5, 1].includes(j.arrotStep) ? j.arrotStep : 0; if (o.arrotStep) { o.arrotAuto = false; o.arrot = 0; }
    o.bollo = !!j.bollo; o.bolloAddebita = !!j.bolloAddebita;
    const p = isObj(j.pagamento) ? j.pagamento : {};
    o.pagamento = { mod: has(MOD_PAG, p.mod) ? p.mod : "MP05", cond: has(COND_PAG, p.cond) ? p.cond : "TP02", scad: okDate(p.scad) ? p.scad : "" };
    const pa = isObj(j.pa) ? j.pa : {};
    o.pa = { ordNum: str(pa.ordNum, 20).trim(), ordData: okDate(pa.ordData) ? pa.ordData : "", cig: up(str(pa.cig, 15)).trim(), cup: up(str(pa.cup, 15)).trim(), split: !!pa.split };
    o.note = str(j.note, 1000);
    // 3.0: fattura già emessa riaperta per correggerla (motivo) e storico dei file XML creati prima
    if (isObj(j.reopen) && str(j.reopen.at, 40)) o.reopen = { at: str(j.reopen.at, 40), by: str(j.reopen.by, 80), why: str(j.reopen.why, 300) };
    // 4.0.4: impostazioni della Contabilità usate all'emissione (aliquote, nature, riferimenti, arrotondamento, bollo) e
    // totali: le fatture emesse si mostrano e si rifanno con queste, anche se poi la Contabilità cambia
    if (isObj(j.snap) && Array.isArray(j.snap.aliquote)) {
      const S = j.snap, al = S.aliquote.filter(isObj).slice(0, 40).map((x) => { let perc = numOr(x.perc, 0); perc = perc >= 0 && perc <= 100 ? Math.round(perc * 100) / 100 : 0; return { id: str(x.id, 40), nome: str(x.nome, 80), perc, natura: perc === 0 && has(NATURE, str(x.natura, 6)) ? str(x.natura, 6) : "", rif: str(x.rif, 100) }; }).filter((x) => x.id);
      const bi = numOr(S.bolloImporto, 2);
      o.snap = { at: str(S.at, 40), aliquote: al, arrot: has(ARROT, str(S.arrot, 6)) ? str(S.arrot, 6) : "no", arrotVerso: has(VERSI, S.arrotVerso) ? S.arrotVerso : "vicino", bolloImporto: bi >= 0 && bi <= 100 ? r2(bi) : 2, totale: r2(numOr(S.totale, 0)), imponibile: r2(numOr(S.imponibile, 0)), imposta: r2(numOr(S.imposta, 0)) };
    }
    // 4.0.6: copia di cortesia inviata per e-mail (dal server dell'ufficio): a chi, quando, da chi
    if (isObj(j.mail) && okIso(j.mail.at)) o.mail = { at: str(j.mail.at, 40), to: str(j.mail.to, 256), by: str(j.mail.by, 80), subject: str(j.mail.subject, 300), id: str(j.mail.id, 200), xml: str(j.mail.xml, 120) };
    const hist = (Array.isArray(j.xmlHist) ? j.xmlHist : []).filter(isObj).slice(-50).map((h) => ({ name: str(h.name, 160), path: str(h.path, 300), at: str(h.at, 40), by: str(h.by, 80), why: str(h.why, 300), prog: str(h.prog, 10) })).filter((h) => h.at || h.name);
    if (hist.length) o.xmlHist = hist;
    return o;
  }

  // ---------- testi delle righe ----------
  const itShort = (d) => (okDate(d) ? d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(2, 4) : "");
  const itLong = (d) => (okDate(d) ? d.slice(8, 10) + "-" + d.slice(5, 7) + "-" + d.slice(0, 4) : "");
  function periodo(a, z) {
    if (!okDate(a)) return "";
    if (!okDate(z) || z <= a) return "IL " + itShort(a);
    const da = +a.slice(8, 10), dz = +z.slice(8, 10), ma = MESI[+a.slice(5, 7) - 1], mz = MESI[+z.slice(5, 7) - 1], ya = a.slice(0, 4), yz = z.slice(0, 4);
    if (ya !== yz) return "DAL " + da + " " + ma + " " + ya + " AL " + dz + " " + mz + " " + yz;
    return a.slice(5, 7) === z.slice(5, 7) ? "DAL " + da + " AL " + dz + " " + mz : "DAL " + da + " " + ma + " AL " + dz + " " + mz;
  }
  function mesi(list) {
    const seen = [], years = new Set(list.map((s) => String(s.start || "").slice(0, 4)));
    for (const s of list.slice().sort((a, b) => String(a.start).localeCompare(String(b.start)))) { if (!okDate(s.start)) continue; const k = MESI[+s.start.slice(5, 7) - 1] + (years.size > 1 ? " " + s.start.slice(0, 4) : ""); if (!seen.includes(k)) seen.push(k); }
    return seen.length > 1 ? seen.slice(0, -1).join(", ") + " E " + seen[seen.length - 1] : seen[0] || "";
  }
  function mezzo(v, C) {
    v = v || {}; const k = v.kind === "van" || v.kind === "auto" ? v.kind : "bus", t = (C.mezzi && C.mezzi[k]) || "";
    const seats = Number(v.seats) > 0 ? String(Math.round(Number(v.seats))) : "";
    return (seats ? t : t.replace(/\s*(DA|da|Da)?\s*\{POSTI\}\s*(POSTI|posti|Posti)?/, "")).replace(/\{POSTI\}/g, seats).trim();
  }
  // riempie una causale: i segnaposto senza valore spariscono insieme alla parolina che li introduce ("PER", "IL", ":")
  function fill(tpl, vals, C) {
    let t = String(tpl || "").replace(/\{([A-Z_]+)\}/g, (m, k) => (k in vals ? "\u0001" + String(vals[k] == null ? "" : vals[k]).trim() + "\u0002" : m));
    t = t.replace(/(?:\s+(?:PER|IL|DI|A|DEL|per|il|di|a|del))?\s*[:,.\-–]?\s*\u0001\u0002/g, "").replace(/[\u0001\u0002]/g, "");
    t = t.replace(/\s+/g, " ").replace(/\s+([.,;:])/g, "$1").replace(/\.{2,}/g, ".").replace(/^[\s.,;:\-]+|[\s,;:\-]+$/g, "").trim();
    return C && C.opzioni && C.opzioni.maiuscole === false ? t : t.toUpperCase();
  }
  const itin = (s) => String(s || "").replace(/\s*>\s*/g, " - ").replace(/\s*→\s*/g, " - ").replace(/\s+/g, " ").trim();
  const causaleFor = (C, uso) => C.causali.find((c) => c.uso === uso) || null;
  function lineFromService(s, C) {
    const uso = ["gita", "tour", "notturno", "transfer"].includes(s.type) ? s.type : "gita", c = causaleFor(C, uso) || { testo: "NOLEGGIO {MEZZO} {PERIODO} {ITINERARIO}", aliq: "" };
    const multi = okDate(s.end) && s.end > s.start;
    const vals = { MEZZO: mezzo(s.vehicle, C), DATA: itShort(s.start), DATA_FINE: itShort(s.end || s.start), PERIODO: periodo(s.start, s.end), MESE: mesi([s]), ITINERARIO: itin(s.itin), EVENTO: s.event || "", PAX: s.pax == null ? "" : String(s.pax), FOGLIO: s.foglio || "", TARGA: (s.vehicle && s.vehicle.plate) || "", CLIENTE: s.client || "", PARCHEGGIO: "" };
    let testo = c.testo; if (multi) testo = testo.replace(/IL \{DATA\}/, "{PERIODO}");
    return { id: newId("r"), tipo: "noleggio", desc: fill(testo, vals, C), qta: 1, prezzo: r2(numOr(s.price, 0)), sc: 0, aliq: c.aliq || "", fogli: [String(s.foglio || "")].filter(Boolean) };
  }
  // Le righe proposte per uno o più servizi. modo "singole": una riga di noleggio per servizio;
  // "riepilogo": una riga sola con la somma (come le vostre fatture del mese). Parcheggi e pasti sempre a parte.
  function linesFor(list, C, modo) {
    list = list.slice().sort((a, b) => String(a.start).localeCompare(String(b.start)) || String(a.foglio).localeCompare(String(b.foglio)));
    const out = [], fogli = list.map((s) => String(s.foglio || "")).filter(Boolean);
    const sum = (k) => r2(list.reduce((a, s) => a + numOr(s[k], 0), 0));
    if (modo === "riepilogo" && list.length > 1) {
      const types = new Set(list.map((s) => s.type)), uso = types.size === 1 && types.has("gita") ? "riep-gita" : types.size === 1 && types.has("transfer") ? "riep-transfer" : "riep";
      const c = causaleFor(C, uso) || causaleFor(C, "riep") || { testo: "NOLEGGIO PULLMAN PER SERVIZI EFFETTUATI NEL MESE DI {MESE}", aliq: "" };
      out.push({ id: newId("r"), tipo: "noleggio", desc: fill(c.testo, { MESE: mesi(list), PERIODO: periodo(list[0].start, list[list.length - 1].start), CLIENTE: list[0].client || "", N: String(list.length), PARCHEGGIO: "" }, C), qta: 1, prezzo: sum("price"), sc: 0, aliq: c.aliq || "", fogli });
    } else for (const s of list) out.push(lineFromService(s, C));
    const extra = (k, uso, tipo) => { const tot = sum(k); if (!(tot > 0)) return; const c = causaleFor(C, uso) || { testo: tipo === "parcheggi" ? "RIMBORSO SPESE ANTICIPATE PER PARCHEGGI" : "RIMBORSO SPESE ANTICIPATE PER PASTI", aliq: "" }; out.push({ id: newId("r"), tipo, desc: fill(c.testo, { MESE: mesi(list), PARCHEGGIO: "" }, C), qta: 1, prezzo: tot, sc: 0, aliq: c.aliq || "", fogli: list.filter((s) => numOr(s[k], 0) > 0).map((s) => String(s.foglio || "")).filter(Boolean) }); };
    parkLines(list, C, out); extra("meals", "pasti", "pasti"); extraLines(list, C, out);
    return out;
  }
  // Extra (2.8): ogni servizio può avere fino a 3 voci con la causale spese (es. "rimborso traghetto") e la cifra.
  // Una riga per causale, sommando i servizi; l'IVA proposta è quella del noleggio (si controlla nella bozza).
  function extraLines(list, C, out) {
    const groups = new Map();
    for (const s of list) for (const e of Array.isArray(s.extras) ? s.extras : []) {
      const a = r2(numOr(e && e.amt, 0)), t = String((e && e.c) || "").trim(); if (!(a > 0)) continue;
      const k = t.toLowerCase() || "extra";
      if (!groups.has(k)) groups.set(k, { testo: t || "extra", amt: 0, fogli: [], type: s.type });
      const g = groups.get(k); g.amt = r2(g.amt + a); if (s.foglio && !g.fogli.includes(String(s.foglio))) g.fogli.push(String(s.foglio));
    }
    for (const g of groups.values()) {
      const uso = ["gita", "tour", "notturno", "transfer"].includes(g.type) ? g.type : "gita", c = causaleFor(C, uso);
      const low = C && C.opzioni && C.opzioni.maiuscole === false, desc = low ? g.testo.charAt(0).toUpperCase() + g.testo.slice(1) : g.testo.toUpperCase();
      out.push({ id: newId("r"), tipo: "libera", desc, qta: 1, prezzo: g.amt, sc: 0, aliq: (c && c.aliq) || "", fogli: g.fogli });
    }
  }
  // Parcheggi (2.6): ogni servizio può avere più parcheggi dell'anagrafica, ognuno con la sua cifra (s.parks:
  // { key, testo: "A SIRACUSA", aliq, amt }). Una riga di rimborso per parcheggio, sommando i servizi, con l'IVA
  // della ricevuta di quel parcheggio; la parte di "€ Parcheggi" senza parcheggio scelto va in una riga come prima.
  function parkLines(list, C, out) {
    const c = causaleFor(C, "parcheggi") || { testo: "RIMBORSO SPESE ANTICIPATE PER PARCHEGGI", aliq: "" };
    const tpl = /\{PARCHEGGIO\}/.test(c.testo) ? c.testo : String(c.testo || "").trim() + " {PARCHEGGIO}";
    const groups = new Map(); let rest = 0; const restF = [];
    for (const s of list) {
      const tot = r2(numOr(s.park, 0)); if (!(tot > 0)) continue;
      let used = 0;
      for (const p of Array.isArray(s.parks) ? s.parks : []) {
        const a = r2(numOr(p && p.amt, 0)); if (!(a > 0) || !p.key) continue;
        const take = r2(Math.min(a, tot - used)); if (!(take > 0)) continue; used = r2(used + take);
        if (!groups.has(p.key)) groups.set(p.key, { testo: String(p.testo || ""), aliq: String(p.aliq || ""), amt: 0, fogli: [] });
        const g = groups.get(p.key); g.amt = r2(g.amt + take); if (s.foglio && !g.fogli.includes(String(s.foglio))) g.fogli.push(String(s.foglio));
      }
      const left = r2(tot - used); if (left > 0) { rest = r2(rest + left); if (s.foglio) restF.push(String(s.foglio)); }
    }
    for (const g of groups.values()) out.push({ id: newId("r"), tipo: "parcheggi", desc: fill(tpl, { MESE: mesi(list), PARCHEGGIO: g.testo }, C), qta: 1, prezzo: g.amt, sc: 0, aliq: (C.aliquote.some((x) => x.id === g.aliq) ? g.aliq : "") || c.aliq || "", fogli: g.fogli });
    if (rest > 0) out.push({ id: newId("r"), tipo: "parcheggi", desc: fill(tpl, { MESE: mesi(list), PARCHEGGIO: "" }, C), qta: 1, prezzo: rest, sc: 0, aliq: c.aliq || "", fogli: restF });
  }
  // la riga di cui la causale è la descrizione (2.6): la prima riga di noleggio, altrimenti la prima riga
  function causaleRow(d) { const r = (d && d.righe) || []; return r.find((x) => x.tipo === "noleggio") || r.find((x) => x.tipo === "libera") || null; }
  // la causale va nel file come voce a parte solo nelle bozze di prima della 2.6, dove è diversa da ogni descrizione
  function causaleApart(d) { const c = latin(d && d.causale); return !!c && !((d && d.righe) || []).some((r) => latin(r.desc) === c); }
  const isPA = (c) => /^[A-Z0-9]{6}$/.test(up(c && c.sdi));
  function newDraft(list, cliente, C, o) {
    o = o || {}; const today = okDate(o.today) ? o.today : new Date().toISOString().slice(0, 10);
    const cl = cleanCliente(cliente); cl.pa = isPA(cl);
    const modo = o.modo || (list.length > 1 ? "riepilogo" : "singole");
    const d = { v: 1, id: newId("f"), createdAt: new Date().toISOString(), createdBy: str(o.by, 80), updatedAt: "", updBy: "", xmlAt: "", xmlBy: "", xmlName: "", xmlPath: "", xmlProg: "", tipo: C.opzioni.tipo, numero: "", data: today, causale: "", causaleId: "", cliente: cl,
      servizi: list.map((s) => ({ id: String(s.id || ""), start: s.start, foglio: String(s.foglio || "") })), modo, lordi: C.opzioni.lordi, righe: linesFor(list, C, modo), scontoPerc: C.opzioni.scontoPerc, arrotAuto: true, arrot: 0, arrotStep: 0, bollo: false, bolloAddebita: false,
      pagamento: { mod: C.opzioni.mod, cond: C.opzioni.cond, scad: addDays(today, cl.pa ? C.opzioni.giorniPA : C.opzioni.giorni) }, pa: { ordNum: "", ordData: "", cig: "", cup: "", split: cl.pa && C.opzioni.splitPA }, note: "" };
    return d;
  }

  // ---------- conti ----------
  // Una riga: prezzo (IVA compresa se la bozza è "lordi") × quantità, meno lo sconto di riga e quello di fattura
  // (lo sconto di fattura vale per noleggi e righe libere, non per rimborsi spese, bollo e sconti in euro).
  // Con i prezzi IVA compresa lo scorporo si fa sul totale di ogni aliquota, così il totale della fattura è
  // esattamente la somma dei prezzi concordati (2.980,00 → 2.709,09 + 270,91; 3.350 + 60 → 3.100,00 + 310,00);
  // l'imponibile si divide poi tra le righe al centesimo (3.045,45 e 54,55, come nelle vostre fatture).
  // Tutti i conti sono in centesimi interi.
  const DOC_SC = ["noleggio", "libera"];
  // 4.0.4: le impostazioni da usare per una bozza: per una fattura emessa (non riaperta) quelle salvate all'emissione
  function contabOf(d, C) {
    const S = d && d.snap; if (!S || !d.xmlAt || d.reopen || !Array.isArray(S.aliquote)) return C;
    const ids = new Set(S.aliquote.map((x) => x.id));
    return Object.assign({}, C, { aliquote: S.aliquote.concat((C.aliquote || []).filter((x) => !ids.has(x.id))), opzioni: Object.assign({}, C.opzioni, { arrot: S.arrot, arrotVerso: S.arrotVerso, bolloImporto: S.bolloImporto }) });
  }
  function snapOf(d, C) {
    const used = new Set((d.righe || []).map((r) => r.aliq)), k = calc(Object.assign({}, d, { snap: null }), C);
    return { at: new Date().toISOString(), aliquote: (C.aliquote || []).filter((x) => used.has(x.id)).map((x) => ({ id: x.id, nome: x.nome, perc: x.perc, natura: x.natura, rif: x.rif })), arrot: C.opzioni.arrot, arrotVerso: C.opzioni.arrotVerso, bolloImporto: C.opzioni.bolloImporto, totale: k.totale, imponibile: k.imponibile, imposta: k.imposta };
  }
  function calc(d, C) {
    C = contabOf(d, C);
    const lordi = d.lordi !== false, docAll = Math.round(Math.min(100, Math.max(0, numOr(d.scontoPerc, 0))) * 100) / 100;
    const split = !!(d.pa && d.pa.split), groups = new Map(), lines = [];
    for (const r of d.righe || []) {
      const a = C.aliquote.find((x) => x.id === r.aliq) || null, perc = a ? a.perc : 0, q = numOr(r.qta, 1) > 0 ? numOr(r.qta, 1) : 1;
      const sc = Math.round(Math.min(100, Math.max(0, numOr(r.sc, 0))) * 100) / 100, docSc = DOC_SC.includes(r.tipo || "libera") ? docAll : 0;
      const f = (1 - sc / 100) * (1 - docSc / 100), price = numOr(r.prezzo, 0);
      const entered = cents(price * q * f); // quello che si è scritto, in centesimi (lordo o netto)
      // un riepilogo per aliquota (due voci dell'elenco con la stessa percentuale vanno insieme); con lo 0% per natura e riferimento
      const key = a ? (a.perc > 0 ? "p" + a.perc : "n" + a.natura + "|" + a.rif) : "?";
      if (!groups.has(key)) groups.set(key, { aliq: a, id: key, perc, natura: a ? a.natura : "", rif: a ? a.rif : "", lines: [], imponibile: 0, tax: 0 });
      const scorporo = lordi && perc > 0;
      const l = { id: r.id, n: lines.length + 1, desc: r.desc, qta: q, unit: price, sc, docSc, f, entered, tot: entered, perc, natura: a ? a.natura : "", aliqOk: !!a, lordo: scorporo ? entered / 100 : null, scorporo };
      groups.get(key).lines.push(l); lines.push(l);
    }
    let imp = 0, iva = 0, ivaSplit = 0;
    const riepilogo = [...groups.values()].map((g) => {
      const sc = g.lines.filter((l) => l.scorporo);
      if (sc.length) {
        // scorporo sul totale del gruppo; i centesimi che avanzano vanno alle righe con il resto più grande
        const k = 1 + g.perc / 100, G = sc.reduce((t, l) => t + l.entered, 0), N = Math.round(G / k);
        const raw = sc.map((l) => l.entered / k), fl = raw.map((x) => Math.floor(x + 1e-9));
        let left = N - fl.reduce((t, x) => t + x, 0);
        const order = raw.map((x, i) => [x - fl[i], i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
        for (let i = 0; left > 0 && i < order.length; i++, left--) fl[order[i][1]]++;
        // prezzo unitario: quello scorporato dal prezzo scritto; se per i centesimi distribuiti non tornasse
        // con il totale della riga (quantità × prezzo × sconti, entro mezzo centesimo) si ricava dal totale
        sc.forEach((l, i) => {
          l.tot = fl[i]; const den = l.qta * l.f, nat = Math.round((numOr(l.unit, 0) / k) * 1e6) / 1e6;
          l.unit = den === 1 ? fl[i] / 100 : den > 0 && Math.abs(nat * den * 100 - fl[i]) > 0.5 ? Math.round((fl[i] / 100 / den) * 1e8) / 1e8 : nat;
        });
        g.imponibile = N; g.tax = G - N;
      } else {
        g.imponibile = g.lines.reduce((t, l) => t + l.tot, 0);
        g.tax = g.perc > 0 ? cents((g.imponibile / 100) * g.perc / 100) : 0;
      }
      const es = g.perc > 0 ? (split ? "S" : "I") : "";
      imp += g.imponibile; iva += g.tax; if (es === "S") ivaSplit += g.tax;
      return { id: g.id, perc: g.perc, natura: g.natura, rif: g.rif, imponibile: g.imponibile / 100, imposta: g.tax / 100, esigibilita: es, ok: !!g.aliq };
    }).sort((a, b) => (a.natura ? 1 : 0) - (b.natura ? 1 : 0) || a.perc - b.perc);
    for (const l of lines) { l.tot = l.tot / 100; delete l.entered; delete l.f; delete l.scorporo; }
    const pre = imp + iva, near = (step) => Math.round(pre / step) * step - pre;
    let arrot = Math.max(-100000, Math.min(100000, cents(numOr(d.arrot, 0))));
    if (d.arrotStep > 0) arrot = near(Math.round(d.arrotStep * 100)); // passo scelto sulla bozza: si ricalcola se cambiano i prezzi
    else if (d.arrotAuto !== false) {
      const step = Math.round(numOr(C.opzioni.arrot, 0) * 100), v = C.opzioni.arrotVerso;
      arrot = step > 0 ? (v === "giu" ? Math.floor(pre / step) : v === "su" ? Math.ceil(pre / step) : Math.round(pre / step)) * step - pre : 0;
    }
    const totale = pre + arrot;
    return { lines, riepilogo, imponibile: imp / 100, imposta: iva / 100, arrot: arrot / 100, totale: totale / 100, daPagare: (totale - ivaSplit) / 100, ivaSplit: ivaSplit / 100, split, sconto: docAll, bollo: d.bollo ? r2(C.opzioni.bolloImporto) : 0 };
  }

  // ---------- controlli prima di creare il file ----------
  function validate(d, C) {
    C = contabOf(d, C); // 4.0.4
    const out = [], err = (m) => out.push({ lv: "err", msg: m }), warn = (m) => out.push({ lv: "warn", msg: m });
    const A = C.azienda, c = d.cliente || {};
    const two = (v) => typeof v === "string" && /^[A-Z]{2}$/.test(v);
    if (!latin(A.nome)) err("Contabilità › Dati societari: manca la denominazione.");
    if (!two(A.paese) || !two(A.nazione)) err("Contabilità › Dati societari: la nazione è la sigla di 2 lettere (IT).");
    if (A.reaUfficio && !two(up(A.reaUfficio).trim())) warn("Contabilità › Dati societari: per il REA serve la sigla della provincia (2 lettere); così com'è non viene scritto.");
    const telN = telDigits(A.tel); if (A.tel && (telN.length < 5 || telN.length > 12)) warn("Contabilità › Dati societari: il telefono deve avere da 5 a 12 cifre; così com'è non viene scritto.");
    if (A.paese === "IT" ? !/^\d{11}$/.test(A.piva) : !A.piva) err("Contabilità › Dati societari: la partita IVA deve avere 11 cifre.");
    if (!latin(A.indirizzo) || !latin(A.comune)) err("Contabilità › Dati societari: mancano indirizzo o comune.");
    if (A.nazione === "IT" && !/^\d{5}$/.test(A.cap)) err("Contabilità › Dati societari: il CAP deve avere 5 cifre.");
    if (A.nazione === "IT" && !/^[A-Z]{2}$/.test(A.prov)) err("Contabilità › Dati societari: la provincia è la sigla di 2 lettere.");
    if (d.pagamento && d.pagamento.mod === "MP05" && !A.iban) warn("Manca l'IBAN (Contabilità › Dati societari): la fattura esce senza coordinate bancarie.");
    else if (A.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(A.iban)) err("Contabilità › Dati societari: l'IBAN non ha la forma giusta.");
    if (!okDate(d.data)) err("Manca la data della fattura.");
    if (!String(d.numero || "").trim()) warn("Senza numero: nel file viene scritto «BOZZA» e il numero lo assegna la contabilità.");
    else if (!/\d/.test(d.numero)) err("Il numero della fattura deve contenere almeno una cifra.");
    if (!latin(c.nome)) err("Cliente: manca la denominazione (servono lettere dell'alfabeto latino).");
    if (!two(c.nazione)) err("Cliente: la nazione è la sigla di 2 lettere (IT per l'Italia).");
    const est = two(c.nazione) && c.nazione !== "IT";
    if (est) {
      // 3.0.4: cliente estero (FAQ dell'Agenzia delle Entrate n. 63 del 19/07/2019): codice destinatario XXXXXXX,
      // identificativo fiscale del paese estero (fino a 28 caratteri), CAP 00000, niente provincia
      if (c.piva && !two(c.paese)) err("Cliente estero: davanti alla partita IVA serve la sigla del paese (es. MT, DE, FR).");
      if (!c.piva && !c.cf) err("Cliente estero: scrivi la partita IVA del suo paese o un altro identificativo fiscale (fino a 28 caratteri).");
      if (c.piva && c.paese === "IT" && !/^\d{11}$/.test(c.piva)) err("Cliente: la partita IVA italiana ha 11 cifre.");
      if (c.cf && !/^[A-Z0-9]{1,28}$/.test(c.cf)) err("Cliente estero: l'identificativo fiscale ha solo lettere e numeri (fino a 28).");
    } else {
      if (c.piva && !two(c.paese)) err("Cliente: davanti alla partita IVA serve la sigla del paese (IT).");
      if (!c.piva && !c.cf) err("Cliente: serve la partita IVA o il codice fiscale.");
      if (c.piva && c.paese === "IT" && !/^\d{11}$/.test(c.piva)) err("Cliente: la partita IVA italiana ha 11 cifre.");
      if (c.cf && !/^[A-Z0-9]{11,16}$/.test(c.cf)) err("Cliente: il codice fiscale ha 11 cifre (enti e società) o 16 caratteri (persone).");
    }
    if (!latin(c.indirizzo)) err("Cliente: manca l'indirizzo."); if (!latin(c.comune)) err(est ? "Cliente estero: manca la città." : "Cliente: manca il comune.");
    if (c.nazione === "IT") { if (!c.cap) warn("Cliente: senza CAP nel file viene scritto 00000."); else if (!/^\d{5}$/.test(c.cap)) err("Cliente: il CAP ha 5 cifre."); if (!/^[A-Z]{2}$/.test(c.prov)) warn("Cliente: manca la provincia (sigla di 2 lettere)."); }
    if (c.pa) { if (est) err("Un cliente estero non può essere un ente pubblico italiano: togli la spunta «Ente pubblico»."); if (!/^[A-Z0-9]{6}$/.test(c.sdi)) err("Ente pubblico: il codice univoco ufficio ha 6 caratteri."); if (!d.pa.cig) warn("Ente pubblico: di solito serve il CIG."); }
    else if (c.sdi && !/^[A-Z0-9]{7}$/.test(c.sdi)) err("Cliente: il codice destinatario ha 7 caratteri (6 per gli enti pubblici).");
    else if (est && c.sdi && c.sdi !== "XXXXXXX") warn("Cliente estero con codice destinatario " + c.sdi + ": va bene solo se ha un codice italiano; di solito è XXXXXXX.");
    else if (c.nazione === "IT" && !c.sdi && !c.pec) warn("Cliente senza codice destinatario né PEC: nel file va 0000000 e la fattura gli arriva solo nell'area riservata dell'Agenzia delle Entrate.");
    if (c.pec && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.pec)) err("Cliente: la PEC non è un indirizzo valido.");
    if ((d.pa.ordNum || d.pa.cig || d.pa.cup) && !d.pa.ordNum) warn("Ordine / CIG: senza numero d'ordine nel file viene scritto il CIG al suo posto.");
    if (!d.righe || !d.righe.length) err("La fattura non ha righe.");
    (d.righe || []).forEach((r, i) => {
      const n = "Riga " + (i + 1) + ": ", a = C.aliquote.find((x) => x.id === r.aliq);
      if (!latin(r.desc)) err(n + "manca la descrizione.");
      const sc = numOr(r.sc, 0); if (sc < 0 || sc > 100) err(n + "lo sconto è una percentuale tra 0 e 100.");
      if (!a) err(n + "scegli l'aliquota IVA.");
      if (!(numOr(r.qta, 0) > 0) || numOr(r.qta, 0) >= 1e6) err(n + "la quantità deve essere maggiore di zero (e meno di un milione).");
      if (Math.abs(numOr(r.prezzo, 0)) > 1e9) err(n + "il prezzo è troppo grande.");
      if (numOr(r.prezzo, 0) === 0) warn(n + "il prezzo è zero.");
    });
    const sd = numOr(d.scontoPerc, 0); if (sd < 0 || sd > 100) err("Lo sconto sulla fattura è una percentuale tra 0 e 100.");
    if (Math.abs(numOr(d.arrot, 0)) > 1000) err("L'arrotondamento non può superare i 1.000 euro.");
    const k = calc(d, C);
    // 4.0.4: nota di credito con totale negativo (aumenterebbe il dovuto invece di stornarlo)
    if (d.tipo === "TD04" && k.totale < 0) err("Nota di credito: scrivi gli importi positivi (è il tipo «Nota di credito» a stornarli).");
    // 4.0.4: data nel futuro (lo SdI la scarta, codice 00403)
    { const n = new Date(), today = n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"); if (okDate(d.data) && d.data > today) err("La data della fattura è nel futuro: il Sistema di Interscambio la scarta (codice 00403)."); }
    // 4.0.4: lettere non ammesse nella fattura elettronica: si cambiano, ma si avvisa
    { const plain = (x) => latin0(x);
      const ch = [c.nome, c.indirizzo, c.comune, d.causale].concat((d.righe || []).map((r) => r.desc)).filter((x) => x && plain(x) !== latin(x));
      if (ch.length) warn("Alcune lettere non sono ammesse nella fattura elettronica e vengono cambiate: «" + plain(ch[0]).slice(0, 40) + "» diventa «" + latin(ch[0]).slice(0, 40) + "»" + (ch.length > 1 ? " (e in altri " + (ch.length - 1) + " campi)" : "") + "."); }
    if (d.tipo !== "TD04" && k.totale < 0) err("Il totale è negativo: per stornare usa il tipo «Nota di credito» con importi positivi.");
    // 4.0.4: imposta di bollo (2 €) sulle operazioni senza IVA oltre 77,47 €: DPR 642/1972, Tariffa All. A, parte I, art. 13
    // n. 1 e DM 17/06/2014 art. 6 (bollo virtuale). Di regola N1, N2.x, N3.5, N3.6, N4; non N3.1–N3.4 né N6.x.
    // Solo un avviso: la lista delle nature va confermata dal commercialista.
    if (!d.bollo) { const BN = /^(N1|N2(\.\d)?|N3\.5|N3\.6|N4)$/, nb = k.riepilogo.filter((r) => BN.test(r.natura || "")).reduce((t, r) => t + r.imponibile, 0);
      if (nb > 77.47) warn("Le righe senza IVA (" + k.riepilogo.filter((r) => BN.test(r.natura || "")).map((r) => r.natura).join(", ") + ") superano 77,47 €: di regola serve il bollo da 2 € (spunta «Bollo»). Controlla con il commercialista."); }
    if (k.split && k.riepilogo.some((r) => r.natura)) warn("Scissione dei pagamenti: vale solo per le righe con IVA; le altre restano senza imposta.");
    if (Math.abs(k.arrot) > 1) warn("L'arrotondamento è più di un euro: controlla.");
    return out;
  }

  // ---------- XML ----------
  // I campi della fattura elettronica accettano solo i caratteri latini di base (lettere accentate comprese):
  // virgolette curve, trattini lunghi e simili diventano i loro equivalenti semplici, il resto si toglie.
  const MAP = { "‘": "'", "’": "'", "‚": "'", "“": "\"", "”": "\"", "„": "\"", "–": "-", "—": "-", "−": "-", "…": "...", "€": "EUR", "•": "-", "→": ">", " ": " ", "Œ": "OE", "œ": "oe", "★": "*" };
  // 4.0.4: lettere che la decomposizione non riduce (prima sparivano: «Łódź» → «ódz»)
  const TRANS = { "Ł": "L", "ł": "l", "Đ": "D", "đ": "d", "Ħ": "H", "ħ": "h", "ı": "i", "ĸ": "k", "Ŋ": "N", "ŋ": "n", "Ŧ": "T", "ŧ": "t", "Ə": "E", "ə": "e", "Ŀ": "L", "ŀ": "l", "ſ": "s" };
  function latin0(s) { return String(s == null ? "" : s).replace(/[‘’‚“”„–—−…€•→ Œœ★]/g, (c) => MAP[c]).replace(/[\u0000-\u001F\u007F-\u009F]+/g, " ").replace(/\s+/g, " ").trim(); }
  function latin(s, max) {
    let t = String(s == null ? "" : s).replace(/[‘’‚“”„–—−…€•→ Œœ★]/g, (c) => MAP[c]).replace(/[ŁłĐđĦħıĸŊŋŦŧƏəĿŀſ]/g, (c) => TRANS[c]);
    try { t = t.replace(/[^\u0000-ÿ]/g, (c) => { const b = c.normalize("NFD").replace(/[̀-ͯ]/g, ""); return /^[ -ÿ]+$/.test(b) ? b : ""; }); } catch (_) { t = t.replace(/[^\u0000-ÿ]/g, ""); }
    t = t.replace(/[\u0000-\u001F\u007F-\u009F]+/g, " ").replace(/\s+/g, " ").trim();
    return max ? t.slice(0, max).trim() : t;
  }
  const xe = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const el = (name, v, max) => { const t = latin(v, max); return t === "" ? "" : "<" + name + ">" + xe(t) + "</" + name + ">"; };
  const grp = (name, inner) => (inner ? "<" + name + ">" + inner + "</" + name + ">" : "");
  const base36 = (n, len) => { let s = Math.abs(Math.floor(n)).toString(36).toUpperCase(); return s.length > len ? s.slice(-len) : s.padStart(len, "0"); };
  // progressivo di 5 caratteri: minuti passati dal 2026, quindi cresce nel tempo e non si ripete
  const progressivo = (when) => base36(((when || Date.now()) - Date.UTC(2026, 0, 1)) / 60000, 5);
  // il progressivo dopo (se in Dropbox c'è già un file con quel nome) e quello scritto nel nome di un file già creato
  const nextProg = (p) => base36(parseInt(String(p || "0"), 36) + 1, 5);
  const progOf = (name) => { const m = /^[A-Z]{2}[A-Za-z0-9]{1,28}_([A-Z0-9]{5})\.xml$/.exec(String(name || "")); return m ? m[1] : ""; };
  // codice destinatario scritto nel file: ente pubblico il suo codice ufficio; estero XXXXXXX (o il codice scritto,
  // se ha un codice italiano); Italia il codice scritto o 0000000 (con la PEC se c'è)
  const destOf = (c) => (c.pa ? c.sdi : c.nazione !== "IT" ? (/^[A-Z0-9]{7}$/.test(c.sdi) ? c.sdi : "XXXXXXX") : /^[A-Z0-9]{7}$/.test(c.sdi) ? c.sdi : "0000000");
  // 3.0.4: numero della fattura proposto. Il più alto dell'anno tra le fatture dell'agenda e l'ultimo numero emesso fuori
  // (Contabilità), più uno, con la stessa forma: «496/00» → «497/00», «0099» → «0100». Anno nuovo: da 1, stessa forma.
  // 4.0.4: il contatore è il primo gruppo di cifre che non è un anno (19xx/20xx): «2026/0015» → 0015, «FT-2026-15» → 15,
  // «496/00» → 496 (come prima); se ci sono solo anni, l'ultimo gruppo. L'anno scritto nel numero si tiene a parte (yr).
  function parseNumero(s) {
    s = String(s == null ? "" : s).trim();
    const g = []; const re = /\d+/g; let m; while ((m = re.exec(s))) g.push({ at: m.index, t: m[0] });
    if (!g.length) return null;
    const isY = (t) => /^(19|20)\d\d$/.test(t);
    const c = g.find((x) => !isY(x.t)) || g[g.length - 1], yr = g.find((x) => x !== c && isY(x.t));
    return { pre: s.slice(0, c.at), n: Number(c.t), w: c.t.length, suf: s.slice(c.at + c.t.length), yr: yr ? yr.t : "" };
  }
  function nextNumero(list, year, extra) {
    year = String(year || ""); let best = null, last = null;
    const look = (num, y, when) => {
      const p = parseNumero(num); if (!p || !isFinite(p.n)) return;
      if (String(y) === year && (!best || p.n > best.n)) best = p;
      if (!last || String(when || "") > last.when) last = { p, when: String(when || "") };
    };
    for (const x of Array.isArray(list) ? list : []) if (x && okDate(x.data)) look(x.numero, x.data.slice(0, 4), x.data);
    if (extra && extra.numero && extra.anno) look(extra.numero, extra.anno, String(extra.anno) + "-12-31");
    const shape = best || (last && last.p) || { pre: "", n: 0, w: 1, suf: "" }, n = best ? best.n + 1 : 1;
    // anno nuovo: l'anno scritto nel numero diventa quello nuovo («FT-2026-15» → «FT-2027-1»)
    let pre = shape.pre, suf = shape.suf;
    if (!best && shape.yr && /^\d{4}$/.test(year) && shape.yr !== year) { const rx = new RegExp("(^|\\D)" + shape.yr + "(?!\\d)"); pre = pre.replace(rx, "$1" + year); suf = suf.replace(rx, "$1" + year); }
    return (pre + String(n).padStart(best ? shape.w : 1, "0") + suf).slice(0, 20);
  }
  const numeroDoc = (d) => { const n = latin(d.numero, 20); if (n) return n; const f = (d.servizi && d.servizi[0] && d.servizi[0].foglio) || ""; return ("BOZZA " + (String(f).replace(/\D/g, "") || "0")).slice(0, 20); };
  // solo le cifre del telefono, senza il prefisso dell'Italia scritto come +39 o 0039
  const telDigits = (t) => String(t || "").trim().replace(/^(\+|00)39/, "").replace(/[^\d]/g, "");
  function sede(o) {
    const it = o.nazione === "IT";
    // 3.0.4: estero: CAP 00000 e il CAP del paese estero nell'indirizzo (FAQ AdE n. 63)
    if (!it && latin(o.cap) && !/^0+$/.test(o.cap)) o = Object.assign({}, o, { indirizzo: (latin(o.indirizzo) + " " + latin(o.cap)).trim() });
    return el("Indirizzo", o.indirizzo, 60) + el("NumeroCivico", o.civico, 8) + "<CAP>" + (it && /^\d{5}$/.test(o.cap) ? o.cap : "00000") + "</CAP>" + el("Comune", o.comune, 60) + (it && /^[A-Z]{2}$/.test(o.prov) ? "<Provincia>" + o.prov + "</Provincia>" : "") + "<Nazione>" + o.nazione + "</Nazione>";
  }
  function xml(d, C, o) {
    C = contabOf(d, C); // 4.0.4
    o = o || {}; const A = C.azienda, c = d.cliente, k = calc(d, C), pa = !!c.pa, fmt = pa ? "FPA12" : "FPR12";
    const foreign = c.nazione !== "IT";
    const dest = destOf(c);
    const prog = /^[A-Z0-9]{1,10}$/.test(o.prog || "") ? o.prog : progressivo(o.when);
    // telefono: da 5 a 12 cifre (senza il prefisso internazionale dell'Italia); altrimenti non si scrive
    let tel = telDigits(A.tel); if (tel.length < 5 || tel.length > 12) tel = "";
    let x = '<?xml version="1.0" encoding="UTF-8"?>\n<p:FatturaElettronica versione="' + fmt + '" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd">';
    // testata
    x += "<FatturaElettronicaHeader>";
    x += grp("DatiTrasmissione", grp("IdTrasmittente", el("IdPaese", A.paese) + el("IdCodice", A.piva, 28)) + el("ProgressivoInvio", prog, 10) + "<FormatoTrasmissione>" + fmt + "</FormatoTrasmissione><CodiceDestinatario>" + dest + "</CodiceDestinatario>" + (dest === "0000000" && c.pec ? el("PECDestinatario", c.pec, 256) : ""));
    x += grp("CedentePrestatore", grp("DatiAnagrafici", grp("IdFiscaleIVA", el("IdPaese", A.paese) + el("IdCodice", A.piva, 28)) + el("CodiceFiscale", A.cf, 16) + grp("Anagrafica", el("Denominazione", A.nome, 80)) + "<RegimeFiscale>" + A.regime + "</RegimeFiscale>") + grp("Sede", sede(A)) +
      (/^[A-Z]{2}$/.test(up(A.reaUfficio).trim()) && latin(A.reaNumero) ? grp("IscrizioneREA", "<Ufficio>" + up(A.reaUfficio).trim() + "</Ufficio>" + el("NumeroREA", A.reaNumero, 20) + (numOr(A.capitale, 0) > 0 ? "<CapitaleSociale>" + amt(numOr(A.capitale, 0)) + "</CapitaleSociale>" : "") + (A.socioUnico ? "<SocioUnico>" + A.socioUnico + "</SocioUnico>" : "") + "<StatoLiquidazione>" + A.liquidazione + "</StatoLiquidazione>") : "") +
      grp("Contatti", (tel ? "<Telefono>" + tel + "</Telefono>" : "") + (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(A.email) ? el("Email", A.email, 256) : "")));
    // 3.0.4: cliente estero senza partita IVA: l'identificativo del suo paese va in IdCodice (con la sigla della nazione)
    // e, per il consumatore finale, anche in CodiceFiscale se ne ha la forma (FAQ AdE n. 63)
    const fid = foreign && !c.piva && c.cf ? c.cf : "", fpa = foreign && (!c.piva || c.paese === "IT") ? c.nazione : c.paese;
    const idf = c.piva ? grp("IdFiscaleIVA", el("IdPaese", fpa) + el("IdCodice", c.piva, 28)) : fid ? grp("IdFiscaleIVA", el("IdPaese", c.nazione) + el("IdCodice", fid, 28)) : "";
    const cfx = foreign ? (/^[A-Z0-9]{11,16}$/.test(c.cf) ? el("CodiceFiscale", c.cf, 16) : "") : el("CodiceFiscale", c.cf, 16);
    x += grp("CessionarioCommittente", grp("DatiAnagrafici", idf + cfx + grp("Anagrafica", el("Denominazione", c.nome, 80))) + grp("Sede", sede(c)));
    x += "</FatturaElettronicaHeader><FatturaElettronicaBody>";
    // dati generali
    const ord = d.pa.ordNum || d.pa.cig || d.pa.cup ? grp("DatiOrdineAcquisto", el("IdDocumento", d.pa.ordNum || d.pa.cig || d.pa.cup, 20) + (okDate(d.pa.ordData) ? "<Data>" + d.pa.ordData + "</Data>" : "") + el("CodiceCUP", d.pa.cup, 15) + el("CodiceCIG", d.pa.cig, 15)) : "";
    const caus = causaleApart(d) ? latin(d.causale) : ""; let cs = ""; for (let i = 0; i < caus.length && i < 1000; i += 200) cs += el("Causale", caus.slice(i, i + 200));
    x += grp("DatiGenerali", grp("DatiGeneraliDocumento", "<TipoDocumento>" + d.tipo + "</TipoDocumento><Divisa>EUR</Divisa><Data>" + d.data + "</Data>" + el("Numero", numeroDoc(d), 20) +
      (d.bollo ? "<DatiBollo><BolloVirtuale>SI</BolloVirtuale><ImportoBollo>" + amt(k.bollo) + "</ImportoBollo></DatiBollo>" : "") +
      "<ImportoTotaleDocumento>" + amt(k.totale) + "</ImportoTotaleDocumento>" + (cents(k.arrot) ? "<Arrotondamento>" + amt(k.arrot) + "</Arrotondamento>" : "") + cs) + ord);
    // righe e riepilogo
    let righe = "";
    for (const l of k.lines) {
      righe += "<DettaglioLinee><NumeroLinea>" + l.n + "</NumeroLinea>" + el("Descrizione", l.desc || "-", 1000) + "<Quantita>" + dec(l.qta, 2, 8) + "</Quantita><PrezzoUnitario>" + dec(l.unit, 2, 8) + "</PrezzoUnitario>" +
        (l.sc ? "<ScontoMaggiorazione><Tipo>SC</Tipo><Percentuale>" + dec(l.sc, 2, 2) + "</Percentuale></ScontoMaggiorazione>" : "") + (l.docSc ? "<ScontoMaggiorazione><Tipo>SC</Tipo><Percentuale>" + dec(l.docSc, 2, 2) + "</Percentuale></ScontoMaggiorazione>" : "") +
        "<PrezzoTotale>" + amt(l.tot) + "</PrezzoTotale><AliquotaIVA>" + dec(l.perc, 2, 2) + "</AliquotaIVA>" + (l.perc === 0 && l.natura ? "<Natura>" + l.natura + "</Natura>" : "") + "</DettaglioLinee>";
    }
    let riep = "";
    for (const r of k.riepilogo) riep += "<DatiRiepilogo><AliquotaIVA>" + dec(r.perc, 2, 2) + "</AliquotaIVA>" + (r.perc === 0 && r.natura ? "<Natura>" + r.natura + "</Natura>" : "") + "<ImponibileImporto>" + amt(r.imponibile) + "</ImponibileImporto><Imposta>" + amt(r.imposta) + "</Imposta>" + (r.esigibilita ? "<EsigibilitaIVA>" + r.esigibilita + "</EsigibilitaIVA>" : "") + el("RiferimentoNormativo", r.rif, 100) + "</DatiRiepilogo>";
    x += grp("DatiBeniServizi", righe + riep);
    // pagamento
    const pg = d.pagamento || {};
    x += grp("DatiPagamento", "<CondizioniPagamento>" + (pg.cond || "TP02") + "</CondizioniPagamento>" + grp("DettaglioPagamento", el("Beneficiario", A.beneficiario, 200) + "<ModalitaPagamento>" + (pg.mod || "MP05") + "</ModalitaPagamento>" + (okDate(pg.scad) ? "<DataScadenzaPagamento>" + pg.scad + "</DataScadenzaPagamento>" : "") + "<ImportoPagamento>" + amt(k.daPagare) + "</ImportoPagamento>" +
      (pg.mod === "MP05" || !pg.mod ? el("IstitutoFinanziario", A.banca, 80) + (/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(A.iban) ? "<IBAN>" + A.iban + "</IBAN>" : "") + (/^\d{5}$/.test(A.abi) ? "<ABI>" + A.abi + "</ABI>" : "") + (/^\d{5}$/.test(A.cab) ? "<CAB>" + A.cab + "</CAB>" : "") + (/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(up(A.bic)) ? "<BIC>" + up(A.bic) + "</BIC>" : "") : "")));
    x += "</FatturaElettronicaBody></p:FatturaElettronica>\n";
    return { xml: x, name: A.paese + latin(A.piva, 28).replace(/[^A-Za-z0-9]/g, "") + "_" + prog + ".xml", prog, formato: fmt, calc: k };
  }

  // ---------- 4.0.6: dati di fatturazione mandati dal cliente per e-mail (richiesta dati) ----------
  // leggiDati: legge le righe «Etichetta: valore» della risposta (anche citate con «>»); verificaDati: controlli fiscali
  // (cifra di controllo di partita IVA e codice fiscale, codice destinatario, PEC) e anagrafici (codice fiscale e nome,
  // CAP e provincia, doppioni, ragione sociale registrata nel VIES). Nessun controllo cambia i dati: dice solo cosa non torna.
  const PROV = "AG AL AN AO AP AQ AR AT AV BA BG BI BL BN BO BR BS BT BZ CA CB CE CH CI CL CN CO CR CS CT CZ EN FC FE FG FI FM FR GE GO GR IM IS KR LC LE LI LO LT LU MB MC ME MI MN MO MS MT NA NO NU OG OR OT PA PC PD PE PG PI PN PO PR PT PU PV PZ RA RC RE RG RI RM RN RO SA SI SO SP SR SS SU SV TA TE TN TO TP TR TS TV UD VA VB VC VE VI VR VS VT VV".split(" ");
  // province per nome (chi scrive «Ragusa» invece di «RG»)
  const PROV_NOMI = { agrigento: "AG", alessandria: "AL", ancona: "AN", aosta: "AO", "valle d aosta": "AO", "ascoli piceno": "AP", "l aquila": "AQ", aquila: "AQ", arezzo: "AR", asti: "AT", avellino: "AV", bari: "BA", bergamo: "BG", biella: "BI", belluno: "BL", benevento: "BN", bologna: "BO", brindisi: "BR", brescia: "BS", "barletta andria trani": "BT", bat: "BT", bolzano: "BZ", cagliari: "CA", campobasso: "CB", caserta: "CE", chieti: "CH", caltanissetta: "CL", cuneo: "CN", como: "CO", cremona: "CR", cosenza: "CS", catania: "CT", catanzaro: "CZ", enna: "EN", "forli cesena": "FC", forli: "FC", ferrara: "FE", foggia: "FG", firenze: "FI", fermo: "FM", frosinone: "FR", genova: "GE", gorizia: "GO", grosseto: "GR", imperia: "IM", isernia: "IS", crotone: "KR", lecco: "LC", lecce: "LE", livorno: "LI", lodi: "LO", latina: "LT", lucca: "LU", "monza e brianza": "MB", "monza e della brianza": "MB", monza: "MB", macerata: "MC", messina: "ME", milano: "MI", mantova: "MN", modena: "MO", "massa carrara": "MS", massa: "MS", matera: "MT", napoli: "NA", novara: "NO", nuoro: "NU", oristano: "OR", palermo: "PA", piacenza: "PC", padova: "PD", pescara: "PE", perugia: "PG", pisa: "PI", pordenone: "PN", prato: "PO", parma: "PR", pistoia: "PT", "pesaro e urbino": "PU", "pesaro urbino": "PU", pesaro: "PU", pavia: "PV", potenza: "PZ", ravenna: "RA", "reggio calabria": "RC", "reggio di calabria": "RC", "reggio emilia": "RE", "reggio nell emilia": "RE", ragusa: "RG", rieti: "RI", roma: "RM", rimini: "RN", rovigo: "RO", salerno: "SA", siena: "SI", sondrio: "SO", "la spezia": "SP", spezia: "SP", siracusa: "SR", sassari: "SS", "sud sardegna": "SU", savona: "SV", taranto: "TA", teramo: "TE", trento: "TN", torino: "TO", trapani: "TP", terni: "TR", trieste: "TS", treviso: "TV", udine: "UD", varese: "VA", "verbano cusio ossola": "VB", verbania: "VB", vercelli: "VC", venezia: "VE", vicenza: "VI", verona: "VR", viterbo: "VT", "vibo valentia": "VV", vibo: "VV" };
  // prime due cifre del CAP → province (di solito è così; ci sono poche eccezioni, per questo è solo un avviso)
  const CAP_PROV = { "00": "RM", "01": "VT", "02": "RI", "03": "FR", "04": "LT", "05": "TR", "06": "PG", "07": "SS OT", "08": "NU OG", "09": "CA OR SU CI VS", 10: "TO", 11: "AO", 12: "CN", 13: "VC BI", 14: "AT", 15: "AL", 16: "GE", 17: "SV", 18: "IM", 19: "SP", 20: "MI MB", 21: "VA", 22: "CO", 23: "SO LC", 24: "BG", 25: "BS", 26: "CR LO", 27: "PV", 28: "NO VB", 29: "PC", 30: "VE", 31: "TV", 32: "BL UD", 33: "UD PN", 34: "TS GO", 35: "PD", 36: "VI", 37: "VR", 38: "TN", 39: "BZ", 40: "BO", 41: "MO", 42: "RE", 43: "PR", 44: "FE", 45: "RO", 46: "MN", 47: "FC RN", 48: "RA", 50: "FI", 51: "PT", 52: "AR", 53: "SI", 54: "MS", 55: "LU", 56: "PI", 57: "LI", 58: "GR", 59: "PO", 60: "AN", 61: "PU RN", 62: "MC", 63: "AP FM", 64: "TE", 65: "PE", 66: "CH", 67: "AQ", 70: "BA BT", 71: "FG BT", 72: "BR", 73: "LE", 74: "TA", 75: "MT", 76: "BT", 80: "NA", 81: "CE", 82: "BN", 83: "AV", 84: "SA", 85: "PZ", 86: "CB IS", 87: "CS", 88: "CZ KR VV", 89: "RC VV", 90: "PA", 91: "TP", 92: "AG", 93: "CL", 94: "EN", 95: "CT", 96: "SR", 97: "RG", 98: "ME" };
  const plain = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "");
  const keyOf = (s) => plain(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  // partita IVA italiana (e codice fiscale numerico di enti e società): 11 cifre con la cifra di controllo
  function pivaOk(p) {
    p = String(p || "").replace(/[\s.\-]/g, "").replace(/^IT/i, "");
    if (!/^\d{11}$/.test(p) || /^0+$/.test(p)) return false;
    let s = 0;
    for (let i = 0; i < 10; i++) { let n = +p[i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } s += n; }
    return (10 - (s % 10)) % 10 === +p[10];
  }
  const CF_RE = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;
  const CF_ODD = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];
  // codice fiscale delle persone (16 caratteri, anche con l'omocodia) con il carattere di controllo
  function cfOk(cf) {
    cf = up(cf).replace(/\s/g, "");
    if (/^\d{11}$/.test(cf)) return pivaOk(cf);
    if (!CF_RE.test(cf)) return false;
    let s = 0;
    for (let i = 0; i < 15; i++) {
      const c = cf.charCodeAt(i), v = c >= 48 && c <= 57 ? c - 48 : c - 65;
      s += i % 2 ? v : CF_ODD[v];
    }
    return String.fromCharCode(65 + (s % 26)) === cf[15];
  }
  const CONS = (s) => s.replace(/[^BCDFGHJKLMNPQRSTVWXYZ]/g, ""), VOC = (s) => s.replace(/[^AEIOU]/g, "");
  const cfCogn = (s) => { s = up(plain(s)).replace(/[^A-Z]/g, ""); return (CONS(s) + VOC(s) + "XXX").slice(0, 3); };
  const cfNome = (s) => { s = up(plain(s)).replace(/[^A-Z]/g, ""); const c = CONS(s); return c.length >= 4 ? c[0] + c[2] + c[3] : (c + VOC(s) + "XXX").slice(0, 3); };
  // il codice fiscale corrisponde a nome e cognome? (si provano «Rossi Mario» e «Mario Rossi», anche con più nomi)
  function cfNomeOk(cf, nome) {
    cf = up(cf); const w = plain(nome).replace(/[^A-Za-z' ]+/g, " ").replace(/'/g, "").split(/\s+/).filter(Boolean);
    if (!CF_RE.test(cf) || w.length < 2) return false;
    const t = cf.slice(0, 6);
    for (let k = 1; k < w.length; k++) {
      const a = w.slice(0, k).join(""), b = w.slice(k).join("");
      if (cfCogn(a) + cfNome(b) === t || cfCogn(b) + cfNome(a) === t) return true;
    }
    return false;
  }
  function provOf(v) {
    const s = String(v || "").trim(); if (!s) return "";
    const m = /^\(?([A-Za-z]{2})\)?\.?$/.exec(s); if (m) return up(m[1]);
    const k = keyOf(s).replace(/^provincia (di |del |della )?/, "");
    const pm = /\(([A-Za-z]{2})\)/.exec(s);
    return PROV_NOMI[k] || (pm ? up(pm[1]) : s);
  }
  const mailIn = (s) => { const m = /[^\s<>"'(),;:]+@[^\s<>"'(),;:]+\.[A-Za-z]{2,}/.exec(String(s || "")); return m ? m[0].replace(/^mailto:/i, "") : ""; };
  // etichette della risposta → campo (prima quelle più precise: «indirizzo PEC» non è l'indirizzo, «codice fiscale» non è il codice destinatario)
  const LAB = [
    ["pec", /^(indirizzo )?(pec|posta (elettronica )?certificata)\b/],
    ["mail", /^(indirizzo )?(e ?mail|email|mail|posta elettronica|indirizzo di posta)\b/],
    ["sdi", /^(codice (destinatario|univoco|sdi|ufficio|dest)|cod (destinatario|univoco|dest)|sdi\b|codice univoco ufficio|cuu\b)/],
    ["piva", /^(partita iva|p ?iva|piva|p i\b|vat|numero (di )?partita iva|n partita iva)/],
    ["cf", /^(codice fiscale|cod fisc|cod fiscale|c ?f\b)/],
    ["name", /^(ragione sociale|denominazione|nome e cognome|cognome e nome|intestatario|intestazione|nominativo|cliente|societa|ente|scuola|istituto|ditta)\b/],
    ["cap", /^(cap|c a p|codice postale)\b/],
    ["city", /^(comune|citta|localita)\b/],
    ["prov", /^(provincia|prov|sigla (della )?provincia)\b/],
    ["naz", /^(nazione|paese|stato)\b/],
    ["addr", /^(indirizzo|via|sede( legale)?|domicilio( fiscale)?|residenza)\b/],
    ["tel", /^(telefono|tel|cellulare|cell|recapito( telefonico)?|numero di telefono)\b/],
    ["ref", /^(referente|persona (di riferimento|da contattare)|contatto)\b/],
  ];
  const labOf = (l) => { const k = keyOf(String(l).replace(/\(.*?\)/g, " ")); if (!k || k.length > 60) return ""; for (const [f, re] of LAB) if (re.test(k)) return f; return ""; };
  // «Etichetta: valore»: i due punti dentro le parentesi dell'etichetta non contano
  function splitLab(l) {
    let dep = 0;
    for (let i = 0; i < l.length && i <= 160; i++) { const c = l[i]; if (c === "(") dep++; else if (c === ")") dep = Math.max(0, dep - 1); else if ((c === ":" || c === "=") && !dep) return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; }
    return null;
  }
  const empty = (v) => /^[\s_.\-–—…*xX?]*$/.test(v) || /^(da compilare|scrivere qui|\.\.\.)$/i.test(v);
  function leggiDati(text) {
    const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/^(\s*>)+\s?/, "").replace(/^\s*[-*•·]\s+/, "").replace(/\*\*/g, "").trim());
    const d = { name: "", piva: "", cf: "", addr: "", cap: "", city: "", prov: "", naz: "", sdi: "", pec: "", mail: "", tel: "", ref: "" }, src = {};
    for (let i = 0; i < lines.length && i < 4000; i++) {
      const m = splitLab(lines[i]); if (!m) continue;
      const f = labOf(m[0]); if (!f || d[f]) continue;
      let v = m[1].replace(/<mailto:[^>]*>/gi, "").trim();
      if (!v && i + 1 < lines.length && lines[i + 1] && !splitLab(lines[i + 1]) && !labOf(lines[i + 1])) v = lines[i + 1];
      if (empty(v)) continue;
      { const q = /^["'«](.*)["'»]$/.exec(v); if (q) v = q[1]; }
      v = v.trim().slice(0, 200);
      if (f === "pec" || f === "mail") { v = mailIn(v); if (!v) continue; }
      d[f] = v; src[f] = "riga";
    }
    // valori nel formato giusto
    d.piva = d.piva.replace(/[\s.\-]/g, "").toUpperCase().replace(/^IT(?=\d{11}$)/, "");
    d.cf = up(d.cf).replace(/[\s.\-]/g, "");
    d.sdi = up(d.sdi).replace(/\s/g, "");
    d.cap = d.cap.replace(/\s/g, "");
    d.prov = provOf(d.prov);
    d.city = d.city.replace(/\s*\(([A-Za-z]{2})\)\s*$/, (m, p) => { if (!d.prov) d.prov = up(p); return ""; }).trim();
    const nz = keyOf(d.naz); d.naz = !nz || /^(it|ita|italia|italy|italiana)$/.test(nz) ? "IT" : d.naz;
    // «Via Roma 1, 97100 Ragusa (RG)» tutto nell'indirizzo
    if (d.addr && (!d.cap || !d.city)) {
      const m = /^(.*?)[,\s–-]+(\d{5})\s+([^,(]+?)\s*(?:\(([A-Za-z]{2})\)|[,\s–-]+([A-Za-z]{2}))?\s*$/.exec(d.addr);
      if (m && m[1].trim()) { d.addr = m[1].trim(); if (!d.cap) d.cap = m[2]; if (!d.city) d.city = m[3].trim(); if (!d.prov && (m[4] || m[5])) d.prov = up(m[4] || m[5]); src.cap = src.cap || "indirizzo"; }
    }
    // non scritti con l'etichetta: si cercano nel testo (solo se la cifra di controllo torna)
    const all = lines.join("\n");
    if (!d.piva) { const re = /\b(?:IT)?(\d{11})\b/g; let m; while ((m = re.exec(all))) if (pivaOk(m[1]) && m[1] !== d.cf) { d.piva = m[1]; src.piva = "testo"; break; } }
    if (!d.cf) { const re = /\b([A-Za-z]{6}[0-9LMNPQRSTUVlmnpqrstuv]{2}[A-Za-z][0-9LMNPQRSTUVlmnpqrstuv]{2}[A-Za-z][0-9LMNPQRSTUVlmnpqrstuv]{3}[A-Za-z])\b/g; let m; while ((m = re.exec(all))) if (cfOk(m[1])) { d.cf = up(m[1]); src.cf = "testo"; break; } }
    if (!d.pec) { const re = /[^\s<>"'(),;:]+@[^\s<>"'(),;:]*pec[^\s<>"'(),;:]*\.[A-Za-z]{2,}/gi, m = re.exec(all); if (m) { d.pec = m[0]; src.pec = "testo"; } }
    if (!d.sdi) { const m = /\b(?:sdi|destinatario|univoco)\b[^A-Za-z0-9\n]{0,25}([A-Za-z0-9]{7}|[A-Za-z0-9]{6})\b/i.exec(all); if (m && /\d/.test(m[1])) { d.sdi = up(m[1]); src.sdi = "testo"; } }
    d.src = src;
    return d;
  }
  // nomi simili? (senza forma societaria, punteggiatura e parole di 1 lettera)
  const FORME = /\b(s ?r ?l ?s|s ?r ?l|s ?p ?a|s ?n ?c|s ?a ?s|s ?a ?p ?a|soc( coop)?|societa|cooperativa|coop|a ?r ?l|unipersonale|semplificata|di|de|del|della|e|ed|c|ltd|sas|snc|onlus|aps|asd|ssd)\b/g;
  function nomiSimili(a, b) {
    const t = (s) => keyOf(s).replace(FORME, " ").split(" ").filter((x) => x.length > 1);
    const A = t(a), B = t(b); if (!A.length || !B.length) return false;
    const hit = A.filter((x) => B.includes(x)).length;
    return hit / Math.min(A.length, B.length) >= 0.6;
  }
  // ctx: { dup: (piva, cf) => {code, name} | null, vies: {valid, name, address} | {error} | null, from: indirizzo che ha risposto }
  // Restituisce { checks: [{f, s: "ok"|"warn"|"err", t}], auto, estero, persona }: auto = tutto verde (il cliente può entrare da solo)
  function verificaDati(d, ctx) {
    ctx = ctx || {}; const C = [], ok = (f, t) => C.push({ f, s: "ok", t }), warn = (f, t) => C.push({ f, s: "warn", t }), err = (f, t) => C.push({ f, s: "err", t });
    const it = !d.naz || d.naz === "IT", persona = !d.piva && /^[A-Z0-9]{16}$/.test(d.cf || "");
    // valori che un foglio di calcolo potrebbe prendere per formule (=, +, -, @ all'inizio) o con caratteri di controllo: mai da soli
    for (const f of ["name", "piva", "cf", "addr", "cap", "city", "prov", "naz", "sdi", "pec", "mail", "tel", "ref"]) {
      const v = String(d[f] || "");
      if ((f === "tel" ? /^[=@]|^[+\-](?![\d\s(])/ : /^[=+\-@]/).test(v) || /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(v)) err(f, "Valore scritto in modo strano (inizia con un simbolo o ha caratteri nascosti): controllalo.");
    }
    if (!String(d.name || "").trim()) err("name", "Manca la ragione sociale (o nome e cognome).");
    if (!it) warn("naz", "Cliente estero (" + d.naz + "): i controlli italiani non valgono, controlla tu i dati.");
    if (it) {
      if (d.piva) { if (!/^\d{11}$/.test(d.piva)) err("piva", "La partita IVA deve avere 11 cifre."); else if (!pivaOk(d.piva)) err("piva", "Partita IVA sbagliata: la cifra di controllo non torna (forse un numero scritto male)."); else ok("piva", "Partita IVA scritta correttamente (cifra di controllo giusta)."); }
      if (d.cf) {
        if (/^\d{11}$/.test(d.cf)) { if (pivaOk(d.cf)) ok("cf", "Codice fiscale numerico corretto."); else err("cf", "Codice fiscale numerico sbagliato: la cifra di controllo non torna."); }
        else if (d.cf.length !== 16) err("cf", "Il codice fiscale ha 16 caratteri (persone) o 11 cifre (enti e società).");
        else if (!cfOk(d.cf)) err("cf", "Codice fiscale sbagliato: il carattere di controllo non torna (forse una lettera scritta male).");
        else if (persona) { if (cfNomeOk(d.cf, d.name)) ok("cf", "Codice fiscale corretto e corrispondente a nome e cognome."); else warn("cf", "Il codice fiscale è scritto bene ma non corrisponde al nome e cognome: controlla."); }
        else ok("cf", "Codice fiscale scritto correttamente.");
      }
      if (!d.piva && !d.cf) err("piva", "Mancano partita IVA e codice fiscale.");
      if (d.src && (d.src.piva === "testo" || d.src.cf === "testo")) warn(d.src.piva === "testo" ? "piva" : "cf", "Trovato nel testo della mail, non nella riga giusta: controlla che sia del cliente.");
      if (d.piva && pivaOk(d.piva)) {
        const v = ctx.vies;
        if (!v) warn("piva", "Verifica online della partita IVA non fatta (VIES): si fa con il server dell'ufficio.");
        else if (v.error) warn("piva", "Verifica online della partita IVA non riuscita (" + String(v.error).slice(0, 80) + "): riprova più tardi.");
        else if (v.valid === false) err("piva", "Partita IVA non attiva secondo il VIES (archivio europeo delle partite IVA).");
        else if (v.valid === true) {
          ok("piva", "Partita IVA attiva (verificata online nel VIES).");
          const vn = String(v.name || "").trim();
          if (vn && vn !== "---") { if (nomiSimili(vn, d.name)) ok("name", "Ragione sociale uguale a quella registrata: «" + vn + "»."); else warn("name", "La ragione sociale registrata è «" + vn + "»: controlla quella scritta dal cliente."); }
        }
      }
      if (!String(d.addr || "").trim()) err("addr", "Manca l'indirizzo."); else ok("addr", "Indirizzo presente.");
      if (!d.cap) err("cap", "Manca il CAP."); else if (!/^\d{5}$/.test(d.cap)) err("cap", "Il CAP ha 5 cifre."); 
      if (!String(d.city || "").trim()) err("city", "Manca il comune.");
      if (!d.prov) err("prov", "Manca la provincia.");
      else if (!/^[A-Z]{2}$/.test(d.prov) || !PROV.includes(d.prov)) warn("prov", "Non riconosco la provincia «" + d.prov + "»: serve la sigla di 2 lettere (es. RG).");
      if (/^\d{5}$/.test(d.cap) && PROV.includes(d.prov)) { const pp = CAP_PROV[d.cap.slice(0, 2)]; if (pp && !pp.split(" ").includes(d.prov)) warn("cap", "Il CAP " + d.cap + " di solito è della provincia di " + pp.split(" ").join(" o ") + ", non di " + d.prov + ": controlla."); else ok("cap", "CAP e provincia corrispondono."); }
      // fattura elettronica: codice destinatario o PEC
      const pa = /^[A-Z0-9]{6}$/.test(d.sdi || "");
      if (d.sdi) {
        if (pa) { if (/^\d{11}$/.test(d.cf || "") && !d.piva) ok("sdi", "Codice univoco ufficio di 6 caratteri (ente pubblico)."); else warn("sdi", "Codice di 6 caratteri: è quello degli enti pubblici. Se il cliente non è un ente pubblico serve il codice di 7 caratteri."); }
        else if (!/^[A-Z0-9]{7}$/.test(d.sdi)) err("sdi", "Il codice destinatario ha 7 caratteri (6 per gli enti pubblici).");
        else if (d.sdi === "0000000" && !d.pec && !persona) warn("sdi", "Codice 0000000 senza PEC: la fattura arriverebbe solo nell'area riservata del cliente sul sito dell'Agenzia delle Entrate.");
        else ok("sdi", "Codice destinatario scritto correttamente.");
      }
      if (d.pec) { if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.pec)) ok("pec", "PEC scritta correttamente."); else err("pec", "La PEC non è un indirizzo valido."); }
      if (!d.sdi && !d.pec) { if (persona) ok("sdi", "Privato: codice destinatario 0000000."); else warn("sdi", "Mancano codice destinatario e PEC: chiedili al cliente (servono per la fattura elettronica)."); }
    }
    if (d.mail) { if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.mail)) ok("mail", d.src && d.src.mail === "mittente" ? "E-mail: quella da cui il cliente ha risposto." : "E-mail scritta correttamente."); else warn("mail", "L'indirizzo e-mail non sembra valido."); }
    const dp = ctx.dup ? ctx.dup(d.piva, d.cf) : null;
    if (dp) err("dup", "È già in anagrafica: Cod. " + dp.code + " – " + dp.name + ".");
    const auto = !C.some((c) => c.s !== "ok") && C.length > 0;
    return { checks: C, auto, estero: !it, persona, dup: dp || null };
  }

  const API = { VERSION: "4.0.6", REGIMI, NATURE, TIPI_DOC, TIPI_SCELTA, causaleRow, causaleApart, parkLines, extraLines, MOD_PAG, COND_PAG, USI, ARROT, VERSI, defaults, cleanContab, cleanDraft, contabOf, snapOf, cleanCliente, newDraft, linesFor, lineFromService, fill, mezzo, periodo, mesi, calc, validate, xml, latin, isPA, okDate, addDays, itLong, itShort, newId, r2, amt, numOr, progressivo, nextProg, progOf, numeroDoc, destOf, parseNumero, nextNumero, PROV, pivaOk, cfOk, cfNomeOk, leggiDati, verificaDati, nomiSimili };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (root) { root.FATTURE = API; if (root.document) { (root.AGENDA_FILES = root.AGENDA_FILES || {}).fatture = "3.0"; (root.AGENDA_PATCH = root.AGENDA_PATCH || {}).fatture = "4.0.6"; } } // 3.0.4: clienti esteri, numero proposto; 4.0.4: numero (contatore e anno), bollo, impostazioni salvate all'emissione
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : null);
