// Scrittura diretta nel file "fatturato" (foglio "agenda") senza toccare formule, tabella ed elenchi.
// Ogni servizio è una riga identificata dal n. foglio (colonna A).
(function () {
  "use strict";
  const COLS = (() => { const a = []; for (let i = 1; i <= 45; i++) { let n = i, s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } a.push(s); } return a; })();
  const colIdx = (c) => { let n = 0; for (const ch of c) n = n * 26 + ch.charCodeAt(0) - 64; return n; };
  // caratteri non ammessi in un file Excel (XML): caratteri di controllo (es. l'a capo di Word, \u000B),
  // \uFFFE/\uFFFF e metà di caratteri emoji spezzati. Una sola cella con uno di questi rende illeggibile il file.
  const xmlSafe = (t) => String(t).replace(/\u000B|\u000C/g, "\n").replace(/[\u0000-\u0008\u000E-\u001F\uFFFE\uFFFF]/g, "").replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g, (m) => (m.length === 2 ? m : ""));
  const xEsc = (t) => xmlSafe(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const XL_MAX = 32767; // caratteri massimi in una cella di Excel
  const cut = (t) => { t = xmlSafe(t); return t.length > XL_MAX ? t.slice(0, XL_MAX - 1) + "…" : t; };
  const xUn = (t) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, "&");
  const attr = (tag, name) => { const m = new RegExp("\\s" + name + '="([^"]*)"').exec(tag); return m ? m[1] : null; };

  // ---------- limiti di lettura (2.1) ----------
  // Un file .xlsx è un archivio compresso: uno costruito apposta può "esplodere" in gigabyte e bloccare
  // l'app (bomba zip), oppure arrivare a metà. Si legge solo fino a un limite ragionevole e si controlla
  // che il foglio sia intero prima di riscriverlo: nel dubbio il file non si tocca.
  const MAX_FILE = 25 * 1024 * 1024;   // file .xlsx scaricato (quello vero è meno di 1 MB)
  const MAX_PART = 20 * 1024 * 1024;   // una parte (foglio, testi) una volta aperta (quella vera: 2–3 MB)
  const MAX_TOTAL = 120 * 1024 * 1024; // tutte le parti lette in un aggiornamento
  const MAX_ENTRIES = 5000;
  async function openZip(buf) {
    const size = buf ? (buf.byteLength != null ? buf.byteLength : buf.length || 0) : 0;
    if (!size) throw { code: "badxlsx" };
    if (size > MAX_FILE) throw { code: "toobig" };
    // numero di parti scritto in fondo all'archivio: se è enorme non lo si apre nemmeno
    try {
      const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf), from = Math.max(0, u8.length - 66000);
      for (let i = u8.length - 22; i >= from; i--) if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 5 && u8[i + 3] === 6) { const cnt = u8[i + 10] | (u8[i + 11] << 8); if (cnt > MAX_ENTRIES) throw { code: "toobig" }; break; }
    } catch (e) { if (e && e.code) throw e; }
    let zip;
    try { zip = await JSZip.loadAsync(buf); } catch (_) { throw { code: "badxlsx" }; }
    const names = Object.keys(zip.files);
    if (names.length > MAX_ENTRIES) throw { code: "toobig" };
    // dimensione dichiarata delle parti (un archivio onesto la dichiara giusta; quella vera si controlla leggendo)
    let tot = 0;
    for (const n of names) { const d = zip.files[n] && zip.files[n]._data, u = d && d.uncompressedSize; if (typeof u === "number") { if (u > MAX_PART) throw { code: "toobig" }; tot += u; } }
    if (tot > MAX_TOTAL * 2) throw { code: "toobig" };
    zip._agendaRead = 0;
    return zip;
  }
  // testo di una parte dell'archivio, letto a pezzi: ci si ferma appena supera il limite
  function readText(zip, path) {
    const f = zip.file(path);
    if (!f) return Promise.reject({ code: "badxlsx" });
    if (zip._agendaTooBig) return Promise.reject({ code: "toobig" });
    return new Promise((res, rej) => {
      const parts = []; let n = 0, done = false, st;
      const fail = (e) => { if (done) return; done = true; try { st.pause(); } catch (_) {} rej(e); };
      try { st = f.internalStream("uint8array"); } catch (_) { return rej({ code: "badxlsx" }); }
      st.on("data", (chunk) => {
        if (done) return;
        n += chunk.length; zip._agendaRead = (zip._agendaRead || 0) + chunk.length;
        if (n > MAX_PART || zip._agendaRead > MAX_TOTAL) { zip._agendaTooBig = true; return fail({ code: "toobig" }); }
        parts.push(chunk);
      });
      st.on("error", () => fail({ code: "badxlsx" }));
      st.on("end", () => {
        if (done) return; done = true;
        let text;
        try { const all = new Uint8Array(n); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; } text = new TextDecoder("utf-8").decode(all); }
        catch (_) { return rej({ code: "toobig" }); }
        // ogni parte deve essere XML con i tag aperti e chiusi in ordine: così le ricerche sul testo
        // restano veloci anche su un file costruito apposta (migliaia di tag lasciati aperti)
        if (/\.(xml|rels)$/i.test(path) && !balanced(text)) return rej({ code: "badxlsx" });
        res(text);
      });
      st.resume();
    });
  }
  // Controllo veloce (una sola passata) che i tag siano aperti e chiusi in ordine.
  function balanced(xml) {
    const st = []; let i = 0;
    for (;;) {
      i = xml.indexOf("<", i); if (i < 0) break;
      const c = xml.charCodeAt(i + 1);
      if (c === 63) { const j = xml.indexOf("?>", i + 2); if (j < 0) return false; i = j + 2; continue; }          // <?xml … ?>
      if (c === 33) {                                                                                               // <!-- … --> e <![CDATA[ … ]]>
        if (xml.startsWith("<!--", i)) { const j = xml.indexOf("-->", i + 4); if (j < 0) return false; i = j + 3; continue; }
        if (xml.startsWith("<![CDATA[", i)) { const j = xml.indexOf("]]>", i + 9); if (j < 0) return false; i = j + 3; continue; }
        return false;
      }
      const j = xml.indexOf(">", i + 1); if (j < 0) return false;
      if (c === 47) { if (!st.length || st.pop() !== xml.slice(i + 2, j).trim()) return false; }                    // </nome>
      else if (xml.charCodeAt(j - 1) !== 47) {                                                                      // <nome …> (non <nome …/>)
        let k = i + 1; while (k < j) { const ch = xml.charCodeAt(k); if (ch === 32 || ch === 9 || ch === 10 || ch === 13) break; k++; }
        if (k === i + 1) return false;
        st.push(xml.slice(i + 1, k)); if (st.length > 100) return false;
      }
      i = j + 1;
    }
    return st.length === 0;
  }
  // il foglio è intero? (un file arrivato a metà o rovinato non va riscritto: si peggiorerebbe)
  function wholeSheet(xml) {
    if (typeof xml !== "string" || !/<worksheet[\s>]/.test(xml.slice(0, 2000)) || !/<\/worksheet>\s*$/.test(xml.slice(-200))) return false;
    const a = xml.indexOf("<sheetData");
    if (a < 0) return false;
    const end = xml.indexOf(">", a);
    if (end < 0) return false;
    if (xml[end - 1] === "/") return true; // <sheetData/>: foglio vuoto ma intero
    const b = xml.indexOf("</sheetData>"); if (b < 0 || b !== xml.lastIndexOf("</sheetData>")) return false;
    const body = xml.slice(end + 1, b);
    const all = (body.match(/<row\b[^>]*>/g) || []).length, selfClosed = (body.match(/<row\b[^>]*\/>/g) || []).length;
    return all - selfClosed === (body.match(/<\/row>/g) || []).length;
  }

  function parseSST(xml) {
    const out = [], re = /<si>([\s\S]*?)<\/si>|<si\/>/g; let m;
    while ((m = re.exec(xml))) { const body = (m[1] || "").replace(/<rPh[\s\S]*?<\/rPh>/g, ""); let t = ""; const r2 = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g; let k; while ((k = r2.exec(body))) t += k[1]; out.push(xUn(t)); }
    return out;
  }
  function cellValue(attrs, inner, sst) {
    if (!inner) return "";
    const t = attr(attrs, "t"), v = /<v>([\s\S]*?)<\/v>/.exec(inner);
    if (t === "s") return v ? (sst[+v[1]] || "") : "";
    if (t === "inlineStr") { let s = ""; const r = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g; let k; while ((k = r.exec(inner))) s += k[1]; return xUn(s); }
    return v ? xUn(v[1]) : "";
  }
  // foglio per nome: prima il nome esatto, poi senza badare a maiuscole e spazi, poi un nome che inizia così
  // (es. "Clienti 2026" per "clienti")
  async function sheetFile(zip, name) {
    const wb = await readText(zip, "xl/workbook.xml");
    const rels = await readText(zip, "xl/_rels/workbook.xml.rels");
    const sheets = wb.match(/<sheet\b[^>]*>/g) || [], nm = (t) => xUn(attr(t, "name") || "");
    const low = name.toLowerCase();
    const sh = sheets.find((t) => nm(t) === name) || sheets.find((t) => nm(t).trim().toLowerCase() === low) || sheets.find((t) => new RegExp("^\\s*" + low + "\\b", "i").test(nm(t)));
    if (!sh) return null;
    const rid = attr(sh, "r:id");
    const rel = (rels.match(/<Relationship\b[^>]*>/g) || []).find((t) => attr(t, "Id") === rid);
    if (!rel) return null;
    const tg = attr(rel, "Target");
    return tg.startsWith("/") ? tg.slice(1) : "xl/" + tg.replace(/^\.\//, "");
  }
  async function readGrid(zip, name, cols, sst) {
    const path = await sheetFile(zip, name); if (!path || !zip.file(path)) return null;
    const xml = await readText(zip, path), grid = {};
    const re = new RegExp('<c r="(' + cols.join("|") + ')(\\d+)"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)', "g"); let m;
    while ((m = re.exec(xml))) { const v = cellValue(m[3], m[4], sst); if (v !== "") (grid[m[2]] || (grid[m[2]] = {}))[m[1]] = v.trim(); }
    return grid;
  }
  function makeCell(ref, s, val) {
    const st = s != null ? ' s="' + s + '"' : "";
    if (val == null) return '<c r="' + ref + '"' + st + "/>";
    if (val.f != null) return '<c r="' + ref + '"' + st + (val.str ? ' t="str"' : "") + "><f>" + xEsc(val.f) + "</f></c>";
    if (val.n != null) return isFinite(val.n) ? '<c r="' + ref + '"' + st + "><v>" + val.n + "</v></c>" : '<c r="' + ref + '"' + st + "/>";
    if (val.t != null && val.t !== "") { const t = cut(val.t); return t ? '<c r="' + ref + '"' + st + ' t="inlineStr"><is><t xml:space="preserve">' + xEsc(t) + "</t></is></c>" : '<c r="' + ref + '"' + st + "/>"; }
    return '<c r="' + ref + '"' + st + "/>";
  }
  function formulas(n) {
    return {
      D: { f: 'IFERROR(INDEX(clienti!$B:$B,MATCH(agenda!$C' + n + ',clienti!$A:$A,0)),"")', str: 1 },
      E: { f: 'IFERROR(INDEX(clienti!$C:$C,MATCH(agenda!$C' + n + ',clienti!$A:$A,0)),"")', str: 1 },
      F: { f: 'IFERROR(INDEX(clienti!$L:$L,MATCH(agenda!$C' + n + ',clienti!$A:$A,0)),"")', str: 1 },
      K: { f: "agenda!$J" + n + "-agenda!$I" + n + "+1" },
      Y: { f: "agenda!$P" + n + "+agenda!$Q" + n + "+agenda!$R" + n + "+agenda!$S" + n + "+agenda!$U" + n + "+agenda!$W" + n },
      AQ: { f: "agenda!$AH" + n + "-agenda!$AK" + n + "-agenda!$AL" + n + "-agenda!$AM" + n + "-agenda!$AN" + n + "-agenda!$AO" + n + "-agenda!$AP" + n },
    };
  }
  const serial = (d) => { if (!/^20\d\d-\d\d-\d\d$/.test(String(d || ""))) return NaN; return Math.round((Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5); };
  const num = (x) => (x === "" || x == null || !isFinite(Number(x)) ? null : { n: Number(x) });
  const validFoglio = (f) => /^\d{8,9}$/.test(String(f == null ? "" : f));
  const pad2 = (n) => String(n).padStart(2, "0");
  const txt = (x) => (x === "" || x == null ? null : { t: String(x) });
  // Colonne gestite dall'agenda. null = svuota la cella; colonna assente = non toccare.
  function valuesFor(r) {
    const v = {
      A: { n: Number(r.foglio) }, B: txt(r.B), G: txt(r.G), H: txt(r.H),
      I: r.I && isFinite(serial(r.I)) ? { n: serial(r.I) } : null, J: r.J && isFinite(serial(r.J)) ? { n: serial(r.J) } : null,
      M: txt(r.M), O: txt(r.O), P: num(r.P), Q: num(r.Q), R: num(r.R), Z: txt(r.Z), AA: txt(r.AA),
    };
    if (r.C !== "" && r.C != null) { v.C = isFinite(Number(r.C)) ? { n: Number(r.C) } : { t: String(r.C) }; v.D = "formula"; }
    else { v.C = null; v.D = r.D ? { t: r.D } : "formula"; }
    if (r.tour) { v.AH = num(r.AH); v.AI = txt(r.AI); v.AJ = txt(r.AJ); }
    return v;
  }
  const OWN = ["A", "B", "C", "D", "G", "H", "I", "J", "M", "O", "P", "Q", "R", "Z", "AA", "AH", "AI", "AJ"];

  // sposta i riferimenti relativi di una formula (A1, $A1, A$1) di dr righe e dc colonne, come quando Excel
  // copia una formula; le parti tra virgolette e i nomi di funzione (es. LOG10) non si toccano
  function shiftFormula(f, dr, dc) {
    return f.replace(/"(?:[^"]|"")*"|(\$?)([A-Z]{1,3})(\$?)(\d+)/g, (m, c1, col, r1, row, off, s) => {
      if (m[0] === '"') return m;
      const prev = off > 0 ? s[off - 1] : "", next = s[off + m.length] || "";
      if (/[A-Za-z0-9_.]/.test(prev) || /[A-Za-z0-9_(]/.test(next)) return m;
      let c = col, r = +row;
      if (!c1 && dc) { let n = colIdx(col) + dc; if (n < 1) return m; c = ""; while (n > 0) { const k = (n - 1) % 26; c = String.fromCharCode(65 + k) + c; n = Math.floor((n - 1) / 26); } }
      if (!r1 && dr) r += dr;
      return c1 + c + r1 + r;
    });
  }
  function rowCells(rowXml) {
    const cells = {}, re = /<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let m;
    while ((m = re.exec(rowXml))) cells[m[1]] = { xml: m[0], s: attr(m[2], "s"), inner: m[3] || "" };
    return cells;
  }

  // apply(buf, {upserts:[row], clears:[foglio], ensure:[row]}) → {changed, buf, added, updated, cleared, lists}
  async function apply(buf, job) {
    const zip = await openZip(buf);
    const path = await sheetFile(zip, "agenda");
    if (!path || !zip.file(path)) throw { code: "nosheet" };
    const sstF = zip.file("xl/sharedStrings.xml");
    const sst = sstF ? parseSST(await readText(zip, "xl/sharedStrings.xml")) : [];
    const lists = await readLists(zip, sst);
    if (zip._agendaTooBig) throw { code: "toobig" };
    let xml = await readText(zip, path);
    const a = xml.indexOf("<sheetData"), b = xml.indexOf("</sheetData>");
    if (a < 0) throw { code: "nosheet" };
    if (!wholeSheet(xml)) throw { code: "badxlsx" }; // foglio «agenda» incompleto o rovinato: il file non si tocca
    const openEnd = xml.indexOf(">", a) + 1, selfClosed = xml[openEnd - 2] === "/";
    const head = xml.slice(0, selfClosed ? a : openEnd), tail = selfClosed ? xml.slice(openEnd) : xml.slice(b + "</sheetData>".length);
    const body = selfClosed ? "" : xml.slice(openEnd, b);
    const rowRe = /<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g, rows = [], byNum = {}; let m;
    while ((m = rowRe.exec(body))) { const n = +attr(m[0].slice(0, m[0].indexOf(">") + 1), "r"); byNum[n] = rows.length; rows.push({ n, xml: m[0] }); }
    // righe usate e n. foglio presenti. Una riga è usata se ha almeno una cella scritta (non una formula):
    // così una riga dove l'ufficio ha scritto qualcosa (fattura, spese…) non viene mai riusata per un altro servizio.
    const where = {}; let lastUsed = 1;
    const scan = /<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    while ((m = scan.exec(body))) {
      const r = +m[2]; if (r < 2 || !m[4] || /<f[\s>\/]/.test(m[4])) continue;
      const v = cellValue(m[3], m[4], sst); if (String(v).trim() === "") continue;
      if (r > lastUsed) lastUsed = r;
      if (m[1] === "A") where[String(v).trim().replace(/\.0+$/, "")] = r;
    }
    const tplRow = rows.find((x) => x.n === 2) || rows.find((x) => x.n > 1);
    const tpl = tplRow ? rowCells(tplRow.xml) : {};
    let maxRow = rows.length ? rows[rows.length - 1].n : 1;
    let added = 0, updated = 0, cleared = 0;

    // Formula condivisa di Excel (scritta una volta nella cella "madre" e ripresa dalle righe sotto con
    // <f t="shared" si="N"/>): prima di sovrascrivere la madre, le righe che la usano ricevono la formula per esteso.
    function unshare(masterRef, fxml) {
      const si = attr(fxml, "si"), text = xUn((/>([\s\S]*?)<\/f>/.exec(fxml) || [])[1] || "");
      if (si == null || !text) return;
      const mm = /^([A-Z]+)(\d+)$/.exec(masterRef); if (!mm) return;
      const childRe = new RegExp('<f\\b[^>]*\\bt="shared"[^>]*\\bsi="' + si + '"[^>]*/>|<f\\b[^>]*\\bsi="' + si + '"[^>]*\\bt="shared"[^>]*/>');
      for (const row of rows) {
        if (!childRe.test(row.xml)) continue;
        row.xml = row.xml.replace(/<c r="([A-Z]+)(\d+)"([^>]*?)>([\s\S]*?)<\/c>/g, (all, col, rn, at, inner) => {
          const fm = childRe.exec(inner); if (!fm) return all;
          const f = shiftFormula(text, +rn - +mm[2], colIdx(col) - colIdx(mm[1]));
          return '<c r="' + col + rn + '"' + at + ">" + inner.replace(fm[0], "<f>" + xEsc(f) + "</f>") + "</c>";
        });
      }
    }
    function writeRow(r, vals, clearing) {
      let cells, open;
      if (byNum[r] != null) {
        cells = rowCells(rows[byNum[r]].xml);
        for (const c of Object.keys(vals)) {
          const cur = cells[c], fm = cur && /<f\b[^>]*\bt="shared"[^>]*>[\s\S]*?<\/f>/.exec(cur.inner);
          if (fm && /\bref="/.test(fm[0]) && vals[c] !== "formula") unshare(c + r, fm[0]);
        }
        const old = rows[byNum[r]].xml; open = old.slice(0, old.indexOf(">") + 1).replace(/\/>$/, ">"); cells = rowCells(old);
      }
      else { open = '<row r="' + r + '" spans="1:45">'; cells = {}; for (const c of COLS) cells[c] = { xml: makeCell(c + r, tpl[c] && tpl[c].s, null), s: tpl[c] && tpl[c].s, inner: "" }; }
      const before = open + Object.keys(cells).sort((x, y) => colIdx(x) - colIdx(y)).map((k) => cells[k].xml).join("") + "</row>";
      const fx = formulas(r);
      const styleOf = (c) => (cells[c] ? cells[c].s : tpl[c] && tpl[c].s);
      for (const c of Object.keys(fx)) {
        const cur = cells[c];
        const wantFormula = !(c in vals) || vals[c] === "formula";
        if (wantFormula && (!cur || !/<f[\s>]/.test(cur.inner))) cells[c] = { xml: makeCell(c + r, styleOf(c), fx[c]), s: styleOf(c), inner: "<f>" };
      }
      for (const c of Object.keys(vals)) {
        if (vals[c] === "formula") continue;
        cells[c] = { xml: makeCell(c + r, styleOf(c), vals[c]), s: styleOf(c), inner: "" };
      }
      const x = open + Object.keys(cells).sort((p, q) => colIdx(p) - colIdx(q)).map((k) => cells[k].xml).join("") + "</row>";
      if (byNum[r] != null) rows[byNum[r]].xml = x; else { byNum[r] = rows.length; rows.push({ n: r, xml: x }); }
      if (r > maxRow) maxRow = r;
      return x !== before;
    }

    const upKeys = new Set(), collisions = [], addedFogli = [], clearedFogli = [], invalid = [];
    // la riga contiene dati scritti dall'ufficio (colonne che l'agenda non gestisce)?
    const FX = ["D", "E", "F", "K", "Y", "AQ"];
    function officeData(r) {
      if (byNum[r] == null) return false;
      const cells = rowCells(rows[byNum[r]].xml);
      for (const c in cells) {
        if (OWN.includes(c) || FX.includes(c)) continue;
        const x = cells[c]; if (!x.inner || /<f[\s>\/]/.test(x.inner)) continue;
        const am = /<c r="[A-Z]+\d+"([^>]*?)(?:\/>|>)/.exec(x.xml);
        if (String(cellValue(am ? am[1] : "", x.inner, sst)).trim() !== "") return true;
      }
      return false;
    }
    const okRow = (row) => row && validFoglio(row.foglio) && isFinite(serial(row.I));
    const known = job.known || null;
    // valori attuali di una riga (tipo, codice cliente, cliente) per riconoscere le righe dell'agenda
    function rowNow(r) {
      if (byNum[r] == null) return {};
      const cells = rowCells(rows[byNum[r]].xml), o = {};
      for (const c of ["B", "C", "D"]) { const x = cells[c]; if (!x) continue; const am = /<c r="[A-Z]+\d+"([^>]*?)(?:\/>|>)/.exec(x.xml); o[c] = /<f[\s>]/.test(x.inner) ? null : cellValue(am ? am[1] : "", x.inner, sst); }
      return o;
    }
    const norm = (t) => String(t == null ? "" : t).trim().toLowerCase();
    // tipi scritti fino alla versione 1.5: valgono come la categoria nuova corrispondente
    const OLD_B = { "gita la terra": "gita", "gita scuole": "gita", "escursione villaggi": "gita", "tour la terra": "tour", "tour scuole": "tour", "evento la terra": "notturno", "navetta": "transfer", "transfer villaggi": "transfer", "immigrati": "transfer" };
    const tipo = (t) => { const k = norm(t); return OLD_B[k] || k; };
    function matches(r, row) {
      const o = rowNow(r);
      if (tipo(o.B) !== tipo(row.B)) return false;
      if (row.C !== "" && row.C != null) return norm(o.C) === norm(row.C);
      return o.D != null && norm(o.D) === norm(row.D);
    }
    // una riga con lo stesso n. foglio non scritta dall'agenda (es. inserita a mano) non si tocca mai
    const foreign = (key, row) => known && where[key] && !known[key] && !(row && matches(where[key], row));
    for (const row of job.upserts || []) {
      if (!okRow(row)) { invalid.push(row && row.foglio); continue; }
      const key = String(row.foglio); upKeys.add(key);
      if (foreign(key, row)) { collisions.push(key); continue; }
      const vals = valuesFor(row);
      if (where[key]) { if (writeRow(where[key], vals)) updated++; }
      else { const r = ++lastUsed; writeRow(r, vals); where[key] = r; added++; addedFogli.push(key); }
    }
    for (const row of job.ensure || []) {
      if (!okRow(row)) continue;
      const key = String(row.foglio);
      if (upKeys.has(key)) continue;
      if (where[key]) { if (foreign(key, row) && !collisions.includes(key)) collisions.push(key); continue; }
      const r = ++lastUsed; writeRow(r, valuesFor(row)); where[key] = r; added++; addedFogli.push(key);
    }
    const skipped = [];
    const it = (d) => (d ? d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4) : "");
    const annulled = (r) => { const o = rowCells(rows[byNum[r]].xml).O; return !!(o && /ANNULLATO|SPOSTATO/.test(cellValue((/<c r="[A-Z]+\d+"([^>]*?)(?:\/>|>)/.exec(o.xml) || [])[1] || "", o.inner, sst))); };
    // svuota la riga di un servizio eliminato o spostato
    const clearedSig = {};
    function clearRow(key, c) {
      const r = where[key], vals = {};
      const sig = rowNow(r); clearedSig[key] = { B: sig.B || "", C: sig.C || "", D: sig.D == null ? null : sig.D };
      if (officeData(r)) {
        // l'ufficio ha già scritto qualcosa (fattura, spese…): la riga resta con il suo n. foglio e una nota,
        // così non viene riusata e si capisce a cosa si riferivano quei dati
        for (const col of OWN) if (col !== "A") vals[col] = col === "D" ? "formula" : null;
        const now = new Date(), today = pad2(now.getDate()) + "/" + pad2(now.getMonth() + 1) + "/" + now.getFullYear();
        const cur = rowNow(r), was = c && c.row ? [c.row.D, it(c.row.I)].filter(Boolean).join(", ") : String(cur.D || "");
        vals.O = { t: (c && c.moved ? "SPOSTATO in agenda il " + today + " al " + it(c.moved) + " (nuovo n. foglio)" : "ANNULLATO in agenda il " + today) + (was ? " – era: " + was : "") };
        vals.K = null;
      } else {
        // riga senza dati dell'ufficio: si svuota del tutto, formule comprese (niente "1 giorno" su righe vuote)
        for (const col of OWN) vals[col] = null;
        for (const col of FX) vals[col] = null;
      }
      writeRow(r, vals); delete where[key]; cleared++; clearedFogli.push(key);
      if (vals.O) where[key] = r; // resta tra i numeri presenti nel file: nessun servizio nuovo lo riprenderà
    }
    for (const c of job.clears || []) {
      const key = String(c && c.foglio != null ? c.foglio : c);
      if (upKeys.has(key)) { skipped.push({ foglio: key, why: "aggiornata" }); continue; }
      if (!where[key]) { skipped.push({ foglio: key, why: "assente" }); continue; }
      // si svuota solo una riga scritta dall'agenda (mai una riga inserita a mano con lo stesso numero)
      if (known && !known[key] && !(c && c.row && matches(where[key], c.row))) { if (!annulled(where[key])) skipped.push({ foglio: key, why: "non riconosciuta", now: rowNow(where[key]), want: c.row && { B: c.row.B, C: c.row.C, D: c.row.D } }); continue; }
      if (annulled(where[key])) continue;
      clearRow(key, c);
    }
    // pulizia: righe dell'agenda ricomparse o rimaste per servizi che non esistono più (al massimo 50 per volta)
    let healed = 0;
    for (const g of job.gone || []) {
      if (healed >= 50) break;
      const key = String(g.foglio);
      if (upKeys.has(key) || !where[key] || annulled(where[key])) continue;
      // numero già tolto: si toglie di nuovo solo se la riga è proprio quella del servizio eliminato
      // (una riga scritta a mano dall'ufficio con quel numero, per un altro cliente, non si tocca)
      if (g.sig && !matches(where[key], g.sig)) continue;
      clearRow(key, null); healed++;
    }
    lists.fogli = Object.keys(where);
    const agendaChanged = added + updated + cleared > 0;
    // clienti nuovi dal pulsante "Nuovo cliente": righe in fondo al foglio "clienti"
    const cli = job.newClients && job.newClients.length ? await addClients(zip, sst, job.newClients, lists) : null;
    const newClients = cli ? cli.results : [];
    if (cli && cli.added) { zip.file(cli.path, cli.xml); await growTables(zip, cli.path, cli.maxRow); }
    // clienti modificati (1.8): solo i campi cambiati, nella riga del cliente
    const ed = job.editClients && job.editClients.length ? await editClients(zip, job.editClients, lists) : null;
    const editClientsRes = ed ? ed.results : [];
    if (ed && ed.changed) zip.file(ed.path, ed.xml);
    const changed = agendaChanged || !!(cli && cli.added) || !!(ed && ed.changed);
    if (!changed) return { changed: false, added, updated, cleared, lists, collisions, addedFogli, clearedFogli, clearedSig, newClients, editClients: editClientsRes, invalid, skipped };

    if (agendaChanged) {
      rows.sort((x, y) => x.n - y.n);
      xml = head + (selfClosed ? "<sheetData>" : "") + rows.map((x) => x.xml).join("") + "</sheetData>" + tail;
      xml = xml.replace(/(<dimension ref="[A-Z]+\d+:)([A-Z]+)(\d+)/, (all, pre, col, n) => (+n < maxRow ? pre + col + maxRow : all));
      zip.file(path, xml);
      await growTables(zip, path, maxRow);
    }
    let wb = await readText(zip, "xl/workbook.xml");
    wb = wb.replace(/(<definedName name="_xlnm\._FilterDatabase"[^>]*>agenda!\$[A-Z]+\$\d+:\$)([A-Z]+)\$(\d+)/, (all, pre, col, n) => (+n < maxRow ? pre + col + "$" + maxRow : all));
    wb = /<calcPr\b[^>]*fullCalcOnLoad/.test(wb) ? wb : wb.replace(/<calcPr\b([^>]*?)\/>/, '<calcPr$1 fullCalcOnLoad="1"/>');
    zip.file("xl/workbook.xml", wb);
    if (zip.file("xl/calcChain.xml")) {
      zip.remove("xl/calcChain.xml");
      const ct = await readText(zip, "[Content_Types].xml");
      zip.file("[Content_Types].xml", ct.replace(/<Override\b[^>]*calcChain[^>]*\/>/g, ""));
      const wr = await readText(zip, "xl/_rels/workbook.xml.rels");
      zip.file("xl/_rels/workbook.xml.rels", wr.replace(/<Relationship\b[^>]*calcChain[^>]*\/>/g, ""));
    }
    const out = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
    return { changed: true, buf: out, added, updated, cleared, lists, collisions, addedFogli, clearedFogli, clearedSig, newClients, editClients: editClientsRes, invalid, skipped };
  }

  // la tabella (e il suo filtro) si allarga se servono righe nuove
  async function growTables(zip, path, maxRow) {
    const relsPath = path.replace(/([^/]+)$/, "_rels/$1.rels");
    if (!zip.file(relsPath)) return;
    const rels = await readText(zip, relsPath);
    for (const t of rels.match(/<Relationship\b[^>]*>/g) || []) {
      if (!/\/table$/.test(attr(t, "Type") || "")) continue;
      const tg = attr(t, "Target") || "";
      const tp = tg.startsWith("/") ? tg.slice(1) : ("xl/worksheets/" + tg).replace(/[^/]+\/\.\.\//g, "");
      if (!zip.file(tp)) continue;
      let tx = await readText(zip, tp);
      tx = tx.replace(/(\sref="[A-Z]+\d+:)([A-Z]+)(\d+)/g, (all, pre, col, n) => (+n < maxRow ? pre + col + maxRow : all));
      zip.file(tp, tx);
    }
  }
  async function addTableColumn(zip, path, rows, byNum, col, name) {
    // testo dell'intestazione nei testi condivisi, come le altre intestazioni
    let idx = null;
    const sf = zip.file("xl/sharedStrings.xml");
    if (sf) {
      let sx = await readText(zip, "xl/sharedStrings.xml");
      idx = +(attr(sx.slice(0, sx.indexOf(">", sx.indexOf("<sst")) + 1), "uniqueCount") || (sx.match(/<si>/g) || []).length);
      sx = sx.replace("</sst>", "<si><t>" + xEsc(name) + "</t></si></sst>")
        .replace(/(<sst\b[^>]*\suniqueCount=")(\d+)/, (a, p, n) => p + (+n + 1)).replace(/(<sst\b[^>]*\scount=")(\d+)/, (a, p, n) => p + (+n + 1));
      zip.file("xl/sharedStrings.xml", sx);
    }
    const h = byNum[1] != null ? rows[byNum[1]] : null;
    if (h) {
      const cells = rowCells(h.xml), last = Object.keys(cells).sort((a, b) => colIdx(a) - colIdx(b)).pop();
      const s = last && cells[last].s != null ? ' s="' + cells[last].s + '"' : "";
      const cx = idx != null ? '<c r="' + col + '1"' + s + ' t="s"><v>' + idx + "</v></c>" : '<c r="' + col + '1"' + s + ' t="inlineStr"><is><t>' + xEsc(name) + "</t></is></c>";
      h.xml = h.xml.replace(/<\/row>$/, cx + "</row>");
    }
    const relsPath = path.replace(/([^/]+)$/, "_rels/$1.rels");
    if (!zip.file(relsPath)) return;
    const rels = await readText(zip, relsPath);
    for (const t of rels.match(/<Relationship\b[^>]*>/g) || []) {
      if (!/\/table$/.test(attr(t, "Type") || "")) continue;
      const tg = attr(t, "Target") || "";
      const tp = tg.startsWith("/") ? tg.slice(1) : ("xl/worksheets/" + tg).replace(/[^/]+\/\.\.\//g, "");
      if (!zip.file(tp)) continue;
      let tx = await readText(zip, tp);
      const m = /\sref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/.exec(tx);
      if (!m || m[1] !== "A" || colIdx(m[3]) + 1 !== colIdx(col)) continue; // solo la tabella dei clienti, se finisce proprio prima
      tx = tx.replace(/(\sref="[A-Z]+\d+:)([A-Z]+)(\d+)/g, (a, p, c, n) => p + col + n);
      const ids = (tx.match(/<tableColumn\b[^>]*\sid="(\d+)"/g) || []).map((x) => +/id="(\d+)"/.exec(x)[1]);
      tx = tx.replace(/<\/tableColumns>/, '<tableColumn id="' + (Math.max(0, ...ids) + 1) + '" name="' + xEsc(name) + '"/></tableColumns>')
        .replace(/(<tableColumns\b[^>]*\scount=")(\d+)/, (a, p, n) => p + (+n + 1));
      zip.file(tp, tx);
    }
  }
  const normName = (t) => String(t == null ? "" : t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const normId = (t) => String(t == null ? "" : t).toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^IT(?=\d{11}$)/, "");
  // Aggiunge i clienti nuovi al foglio "clienti": codice = il più alto + 1, stessi stili della riga sopra.
  // Se esiste già un cliente con la stessa partita IVA / codice fiscale (o, senza questi, lo stesso nome) non lo duplica.
  // nc: [{tmp, vals:{B:{t}|{n}, C:…}}] → results: [{tmp, code, existed, row}]
  async function addClients(zip, sst, list, lists) {
    const path = await sheetFile(zip, "clienti");
    if (!path || !zip.file(path)) return { added: 0, results: list.map((x) => ({ tmp: x.tmp, error: "noclienti" })) };
    let xml = await readText(zip, path);
    if (!wholeSheet(xml)) throw { code: "badxlsx" };
    const a = xml.indexOf("<sheetData"), b = xml.indexOf("</sheetData>");
    if (a < 0 || b < 0) return { added: 0, results: list.map((x) => ({ tmp: x.tmp, error: "noclienti" })) };
    const openEnd = xml.indexOf(">", a) + 1, head = xml.slice(0, openEnd), tail = xml.slice(b), body = xml.slice(openEnd, b);
    const rowRe = /<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g, rows = [], byNum = {}; let m;
    while ((m = rowRe.exec(body))) { const n = +attr(m[0].slice(0, m[0].indexOf(">") + 1), "r"); byNum[n] = rows.length; rows.push({ n, xml: m[0] }); }
    // intestazioni e dati esistenti
    const hdr = {}, recs = {};
    for (const r of rows) {
      const cells = rowCells(r.xml);
      for (const c in cells) {
        const am = /<c r="[A-Z]+\d+"([^>]*?)(?:\/>|>)/.exec(cells[c].xml);
        const v = cellValue(am ? am[1] : "", cells[c].inner, sst);
        if (v === "") continue;
        if (r.n === 1) hdr[c] = v.trim(); else (recs[r.n] || (recs[r.n] = {}))[c] = String(v).trim();
      }
    }
    const cols = Object.keys(hdr).sort((x, y) => colIdx(x) - colIdx(y));
    const colOf = (re) => cols.find((c) => re.test(hdr[c])) || null;
    const cPiva = colOf(/partita\s*iva(?!.*estera)/i), cCf = colOf(/codice\s*fiscale/i), cName = "B";
    let cSdi = colOf(/univoco|\bsdi\b/i), newSdiCol = null;
    let lastData = 1, maxCode = 0;
    const byPiva = {}, byCf = {}, byName = {}, byCode = {};
    for (const n in recs) {
      const x = recs[n]; if (!x.A && !x.B) continue;
      if (+n > lastData) lastData = +n;
      const code = /^\d+(\.0+)?$/.test(x.A || "") ? Number(x.A) : null;
      if (code != null && code > maxCode) maxCode = code;
      if (x.A) byCode[String(code != null ? code : x.A)] = x.B || "";
      const key = code != null ? code : x.A;
      if (cPiva && x[cPiva]) byPiva[normId(x[cPiva])] = key;
      if (cCf && x[cCf]) byCf[normId(x[cCf])] = key;
      if (x[cName]) byName[normName(x[cName])] = key;
    }
    const results = []; let added = 0, maxRow = 0;
    const prevCells = () => { for (let n = lastData; n >= 2; n--) if (byNum[n] != null) return rowCells(rows[byNum[n]].xml); return {}; };
    for (const nc of list) {
      const v = nc.vals || {}, tv = (c) => (v[c] ? String(v[c].t != null ? v[c].t : v[c].n) : "");
      const piva = cPiva ? normId(tv(cPiva)) : "", cf = cCf ? normId(tv(cCf)) : "", nm = normName(tv(cName));
      let existing = null;
      if (piva && byPiva[piva] != null) existing = byPiva[piva];
      else if (cf && (byCf[cf] != null || byPiva[cf] != null)) existing = byCf[cf] != null ? byCf[cf] : byPiva[cf];
      else if (!piva && !cf && nm && byName[nm] != null) existing = byName[nm];
      if (existing != null) { results.push({ tmp: nc.tmp, code: existing, existed: true }); continue; }
      if (!nm) { results.push({ tmp: nc.tmp, error: "noname" }); continue; }
      // codice Multi scelto nell'app: deve essere libero
      let code;
      if (v.A && v.A.n != null) {
        code = Number(v.A.n);
        if (byCode[String(code)] != null) { results.push({ tmp: nc.tmp, error: "codeexists", code, by: byCode[String(code)] }); continue; }
        if (code > maxCode) maxCode = code;
      } else code = ++maxCode;
      // codice univoco (SDI): se nel foglio manca la colonna, la aggiunge in fondo alla tabella
      if (v._SDI && !cSdi) { cSdi = COLS[colIdx(cols[cols.length - 1])]; newSdiCol = cSdi; hdr[cSdi] = "Codice univoco"; cols.push(cSdi); }
      if (v._SDI) { v[cSdi] = v._SDI; }
      const r = ++lastData, prev = prevCells();
      let cells, open;
      if (byNum[r] != null) { const old = rows[byNum[r]].xml; open = old.slice(0, old.indexOf(">") + 1).replace(/\/>$/, ">"); cells = rowCells(old); }
      else { open = '<row r="' + r + '">'; cells = {}; }
      const styleOf = (c) => (cells[c] && cells[c].s != null ? cells[c].s : prev[c] && prev[c].s);
      const put = (c, val) => { cells[c] = { xml: makeCell(c + r, styleOf(c), val), s: styleOf(c), inner: "" }; };
      for (const c of cols) { if (c === "A") continue; if (!cells[c] && prev[c]) put(c, null); }
      put("A", { n: code });
      for (const c of Object.keys(v)) if (c !== "A" && c !== "_SDI" && hdr[c]) put(c, v[c]);
      const x = open + Object.keys(cells).sort((p, q) => colIdx(p) - colIdx(q)).map((k) => cells[k].xml).join("") + "</row>";
      if (byNum[r] != null) rows[byNum[r]].xml = x; else { byNum[r] = rows.length; rows.push({ n: r, xml: x }); }
      if (r > maxRow) maxRow = r;
      if (piva) byPiva[piva] = code; if (cf) byCf[cf] = code; byName[nm] = code; byCode[String(code)] = tv("B");
      added++; results.push({ tmp: nc.tmp, code, existed: false, row: r });
      // subito nell'elenco dell'app
      if (lists && lists.clients) {
        const g = (re) => { const c = colOf(re); return c ? tv(c) : ""; };
        lists.clients.push([code, tv("B"), tv("C"), g(/citt/i), g(/^telefono/i), cPiva ? tv(cPiva) : "", g(/referente.*nome/i), g(/referente.*tel/i), cols.map((c) => (c === "A" ? String(code) : tv(c)))]);
      }
    }
    if (!added) return { added: 0, results };
    if (newSdiCol) await addTableColumn(zip, path, rows, byNum, newSdiCol, "Codice univoco");
    rows.sort((x, y) => x.n - y.n);
    xml = head + rows.map((x) => x.xml).join("") + tail;
    xml = xml.replace(/(<dimension ref="[A-Z]+\d+:)([A-Z]+)(\d+)/, (all, pre, col, n) => (+n < maxRow ? pre + col + maxRow : all));
    if (newSdiCol) {
      xml = xml.replace(/(<dimension ref="[A-Z]+\d+:)([A-Z]+)(\d+)/, (all, pre, col, n) => (colIdx(col) < colIdx(newSdiCol) ? pre + newSdiCol + n : all));
      if (/<cols>/.test(xml) && !new RegExp('<col [^>]*min="' + colIdx(newSdiCol) + '"').test(xml)) xml = xml.replace("</cols>", '<col min="' + colIdx(newSdiCol) + '" max="' + colIdx(newSdiCol) + '" width="16" customWidth="1"/></cols>');
    }
    return { added, results, xml, path, maxRow };
  }

  // Modifica di clienti esistenti (riga trovata col codice Multi, colonna A). Si scrivono solo i campi cambiati
  // nell'app; se nel frattempo lo stesso campo è stato cambiato nel file (Excel), resta quello del file.
  // list: [{tmp, code, vals:{col:{t}|{n}|null, _SDI}, base:{col:"valore di partenza"}}] → results [{tmp, code, applied, conflicts, error}]
  async function editClients(zip, list, lists) {
    const path = await sheetFile(zip, "clienti");
    if (!path || !zip.file(path)) return { changed: 0, results: list.map((x) => ({ tmp: x.tmp, error: "noclienti" })) };
    const sf = zip.file("xl/sharedStrings.xml"), sst = sf ? parseSST(await readText(zip, "xl/sharedStrings.xml")) : [];
    let xml = await readText(zip, path);
    if (!wholeSheet(xml)) throw { code: "badxlsx" };
    const a = xml.indexOf("<sheetData"), b = xml.indexOf("</sheetData>");
    if (a < 0 || b < 0) return { changed: 0, results: list.map((x) => ({ tmp: x.tmp, error: "noclienti" })) };
    const openEnd = xml.indexOf(">", a) + 1, head = xml.slice(0, openEnd), tail = xml.slice(b), body = xml.slice(openEnd, b);
    const rowRe = /<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g, rows = [], byNum = {}; let m;
    while ((m = rowRe.exec(body))) { const n = +attr(m[0].slice(0, m[0].indexOf(">") + 1), "r"); byNum[n] = rows.length; rows.push({ n, xml: m[0] }); }
    const val = (cells, c) => { const x = cells[c]; if (!x) return ""; const am = /<c r="[A-Z]+\d+"([^>]*?)(?:\/>|>)/.exec(x.xml); return String(cellValue(am ? am[1] : "", x.inner, sst)).trim(); };
    const hdr = {}, rowOfCode = {};
    for (const r of rows) {
      const cells = rowCells(r.xml);
      if (r.n === 1) { for (const c in cells) { const v = val(cells, c); if (v) hdr[c] = v; } continue; }
      const code = val(cells, "A"); if (!code) continue;
      const k = /^\d+(\.0+)?$/.test(code) ? String(Number(code)) : code;
      if (rowOfCode[k] == null) rowOfCode[k] = r.n;
    }
    const cols = Object.keys(hdr).sort((x, y) => colIdx(x) - colIdx(y));
    const colOf = (re) => cols.find((c) => re.test(hdr[c])) || null;
    let cSdi = colOf(/univoco|\bsdi\b/i), newSdiCol = null;
    const same = (x, y) => String(x == null ? "" : x).trim().replace(/\s+/g, " ") === String(y == null ? "" : y).trim().replace(/\s+/g, " ");
    const num = (x) => (x != null && x !== "" && isFinite(Number(x)) ? Number(x) : null);
    const eq = (x, y) => same(x, y) || (num(x) != null && num(x) === num(y));
    const results = []; let changed = 0;
    for (const ed of list) {
      const k = /^\d+(\.0+)?$/.test(String(ed.code)) ? String(Number(ed.code)) : String(ed.code);
      const rn = rowOfCode[k];
      if (rn == null) { results.push({ tmp: ed.tmp, code: ed.code, error: "nocode" }); continue; }
      const v = Object.assign({}, ed.vals || {}), base = Object.assign({}, ed.base || {});
      if ("_SDI" in v) {
        if (!cSdi && v._SDI) { cSdi = COLS[colIdx(cols[cols.length - 1])]; newSdiCol = cSdi; hdr[cSdi] = "Codice univoco"; cols.push(cSdi); }
        if (cSdi) { v[cSdi] = v._SDI; if (!(cSdi in base)) base[cSdi] = base._SDI || ""; }
        delete v._SDI;
      }
      const row = rows[byNum[rn]], cells = rowCells(row.xml), open = row.xml.slice(0, row.xml.indexOf(">") + 1).replace(/\/>$/, ">");
      const prevRow = (() => { for (let n = rn - 1; n >= 2; n--) if (byNum[n] != null) return rowCells(rows[byNum[n]].xml); return {}; })();
      const conflicts = []; let applied = 0;
      for (const c of Object.keys(v)) {
        if (c === "A" || !hdr[c]) continue;
        const want = v[c], wantS = want == null ? "" : String(want.t != null ? want.t : want.n);
        const now = val(cells, c);
        if (eq(now, wantS)) continue; // già così
        if (!eq(now, base[c])) { conflicts.push(hdr[c]); continue; } // cambiato anche nel file: resta quello del file
        const st = cells[c] && cells[c].s != null ? cells[c].s : prevRow[c] && prevRow[c].s;
        cells[c] = { xml: makeCell(c + rn, st, wantS === "" ? null : want), s: st, inner: "" };
        applied++;
      }
      if (applied) {
        row.xml = open + Object.keys(cells).sort((p, q) => colIdx(p) - colIdx(q)).map((x) => cells[x].xml).join("") + "</row>";
        changed++;
        // subito nell'elenco dell'app
        if (lists && lists.clients) {
          const now = rowCells(row.xml), tv = (c) => { if (!c) return ""; if (v[c] !== undefined && !conflicts.includes(hdr[c])) { const w = v[c]; return w == null ? "" : String(w.t != null ? w.t : w.n); } return val(now, c); };
          const g = (re) => tv(colOf(re)), cPiva = colOf(/partita\s*iva(?!.*estera)/i);
          const i = lists.clients.findIndex((x) => String(x[0]) === k);
          const code = /^\d+$/.test(k) ? Number(k) : k;
          const rec = [code, tv("B"), tv("C"), g(/citt/i), g(/^telefono/i), cPiva ? tv(cPiva) : "", g(/referente.*nome/i), g(/referente.*tel/i), cols.map((c) => (c === "A" ? String(code) : tv(c)))];
          if (i >= 0) lists.clients[i] = rec;
        }
      }
      results.push({ tmp: ed.tmp, code: ed.code, applied, conflicts });
    }
    if (!changed) return { changed: 0, results };
    if (newSdiCol) {
      await addTableColumn(zip, path, rows, byNum, newSdiCol, "Codice univoco");
      if (lists) lists.clientCols = cols.map((c) => ({ c, h: hdr[c] }));
    }
    xml = head + rows.map((x) => x.xml).join("") + tail;
    if (newSdiCol) {
      xml = xml.replace(/(<dimension ref="[A-Z]+\d+:)([A-Z]+)(\d+)/, (all, pre, col, n) => (colIdx(col) < colIdx(newSdiCol) ? pre + newSdiCol + n : all));
      if (/<cols>/.test(xml) && !new RegExp('<col [^>]*min="' + colIdx(newSdiCol) + '"').test(xml)) xml = xml.replace("</cols>", '<col min="' + colIdx(newSdiCol) + '" max="' + colIdx(newSdiCol) + '" width="16" customWidth="1"/></cols>');
    }
    return { changed, results, xml, path };
  }

  // Clienti (foglio "clienti") e autisti/targhe (foglio "regole")
  async function readLists(zip, sst) {
    const out = {};
    try {
      const g = await readGrid(zip, "agenda", ["AJ"], sst);
      if (g) { let mx = 0; for (const r in g) { if (+r < 2) continue; const n = parseInt(String(g[r].AJ).replace(/\D/g, ""), 10); if (n > mx && n < 1e7) mx = n; } out.bustaMax = mx; }
    } catch (_) {}
    try {
      const g = await readGrid(zip, "clienti", COLS.slice(0, 26), sst);
      if (g) {
        const hdr = g[1] || {}, cols = Object.keys(hdr).filter((c) => hdr[c]).sort((a, b) => colIdx(a) - colIdx(b));
        const colOf = (re) => cols.find((c) => re.test(hdr[c])) || null;
        const cCity = colOf(/citt/i) || "F", cTel = colOf(/^telefono/i) || "L", cPiva = colOf(/partita\s*iva(?!.*estera)/i) || "H", cCf = colOf(/codice\s*fiscale/i) || "I";
        const cRef = colOf(/referente.*nome/i) || "O", cRefT = colOf(/referente.*tel/i) || "P";
        const list = [];
        for (const r of Object.keys(g).map(Number).sort((a, b) => a - b)) {
          if (r < 2) continue; const x = g[r]; if (!x.A || !x.B) continue;
          const code = /^\d+(\.0+)?$/.test(x.A) ? Number(x.A) : x.A;
          list.push([code, x.B, x.C || "", x[cCity] || "", x[cTel] || "", x[cPiva] || "", x[cRef] || "", x[cRefT] || "", cols.map((c) => (c === "A" ? String(code) : x[c] || ""))]);
        }
        if (list.length) out.clients = list;
        if (cols.length) out.clientCols = cols.map((c) => ({ c, h: hdr[c] }));
      }
    } catch (_) {}
    try {
      const g = await readGrid(zip, "regole", ["A", "E", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S"], sst);
      if (g) {
        const rowsN = Object.keys(g).map(Number).filter((n) => n >= 2).sort((a, b) => a - b);
        const hdr = g[1] || {}, targhe = {}, numeri = {};
        for (const c of ["I", "J", "K", "L", "M", "N", "O", "P", "Q"]) { let name = (hdr[c] || "").trim(); if (!name) continue; if (name === "da_64_posti") name = "_64_posti"; targhe[name] = rowsN.map((n) => g[n][c]).filter(Boolean); }
        for (const n of rowsN) if (g[n].R) numeri[g[n].R] = g[n].S || "";
        out.regole = { autisti: rowsN.map((n) => g[n].E).filter(Boolean), tipi: rowsN.map((n) => g[n].A).filter(Boolean), targhe, numeri };
      }
    } catch (_) {}
    return out;
  }

  // Legge solo gli elenchi, senza modificare il file
  async function lists(buf) { const zip = await openZip(buf); const sstF = zip.file("xl/sharedStrings.xml"); const sst = sstF ? parseSST(await readText(zip, "xl/sharedStrings.xml")) : []; const out = await readLists(zip, sst); if (zip._agendaTooBig) throw { code: "toobig" }; return out; }

  (window.AGENDA_FILES = window.AGENDA_FILES || {}).fatturato = "2.4";
  window.FAT = { apply, lists, COLS, colIdx, xEsc, openZip, readText, wholeSheet, balanced };
})();
