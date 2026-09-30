// Scrittura diretta nel file "fatturato" (foglio "agenda") senza toccare formule, tabella ed elenchi.
// Ogni servizio è una riga identificata dal n. foglio (colonna A).
(function () {
  "use strict";
  const COLS = (() => { const a = []; for (let i = 1; i <= 45; i++) { let n = i, s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } a.push(s); } return a; })();
  const colIdx = (c) => { let n = 0; for (const ch of c) n = n * 26 + ch.charCodeAt(0) - 64; return n; };
  const xEsc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const xUn = (t) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, "&");
  const attr = (tag, name) => { const m = new RegExp("\\s" + name + '="([^"]*)"').exec(tag); return m ? m[1] : null; };

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
  async function sheetFile(zip, name) {
    const wb = await zip.file("xl/workbook.xml").async("string");
    const rels = await zip.file("xl/_rels/workbook.xml.rels").async("string");
    const sh = (wb.match(/<sheet\b[^>]*>/g) || []).find((t) => (attr(t, "name") || "").toLowerCase() === name.toLowerCase());
    if (!sh) return null;
    const rid = attr(sh, "r:id");
    const rel = (rels.match(/<Relationship\b[^>]*>/g) || []).find((t) => attr(t, "Id") === rid);
    if (!rel) return null;
    const tg = attr(rel, "Target");
    return tg.startsWith("/") ? tg.slice(1) : "xl/" + tg.replace(/^\.\//, "");
  }
  async function readGrid(zip, name, cols, sst) {
    const path = await sheetFile(zip, name); if (!path || !zip.file(path)) return null;
    const xml = await zip.file(path).async("string"), grid = {};
    const re = new RegExp('<c r="(' + cols.join("|") + ')(\\d+)"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)', "g"); let m;
    while ((m = re.exec(xml))) { const v = cellValue(m[3], m[4], sst); if (v !== "") (grid[m[2]] || (grid[m[2]] = {}))[m[1]] = v.trim(); }
    return grid;
  }
  function makeCell(ref, s, val) {
    const st = s != null ? ' s="' + s + '"' : "";
    if (val == null) return '<c r="' + ref + '"' + st + "/>";
    if (val.f != null) return '<c r="' + ref + '"' + st + (val.str ? ' t="str"' : "") + "><f>" + xEsc(val.f) + "</f></c>";
    if (val.n != null) return '<c r="' + ref + '"' + st + "><v>" + val.n + "</v></c>";
    if (val.t != null && val.t !== "") return '<c r="' + ref + '"' + st + ' t="inlineStr"><is><t xml:space="preserve">' + xEsc(val.t) + "</t></is></c>";
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
  const serial = (d) => Math.round((Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5);
  const num = (x) => (x === "" || x == null ? null : { n: Number(x) });
  const txt = (x) => (x === "" || x == null ? null : { t: String(x) });
  // Colonne gestite dall'agenda. null = svuota la cella; colonna assente = non toccare.
  function valuesFor(r) {
    const v = {
      A: { n: Number(r.foglio) }, B: txt(r.B), G: txt(r.G), H: txt(r.H),
      I: r.I ? { n: serial(r.I) } : null, J: r.J ? { n: serial(r.J) } : null,
      M: txt(r.M), O: txt(r.O), P: num(r.P), Q: num(r.Q), R: num(r.R), Z: txt(r.Z), AA: txt(r.AA),
    };
    if (r.C !== "" && r.C != null) { v.C = isFinite(Number(r.C)) ? { n: Number(r.C) } : { t: String(r.C) }; v.D = "formula"; }
    else { v.C = null; v.D = r.D ? { t: r.D } : "formula"; }
    if (r.tour) { v.AH = num(r.AH); v.AI = txt(r.AI); v.AJ = txt(r.AJ); }
    return v;
  }
  const OWN = ["A", "B", "C", "D", "G", "H", "I", "J", "M", "O", "P", "Q", "R", "Z", "AA", "AH", "AI", "AJ"];

  function rowCells(rowXml) {
    const cells = {}, re = /<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let m;
    while ((m = re.exec(rowXml))) cells[m[1]] = { xml: m[0], s: attr(m[2], "s"), inner: m[3] || "" };
    return cells;
  }

  // apply(buf, {upserts:[row], clears:[foglio], ensure:[row]}) → {changed, buf, added, updated, cleared, lists}
  async function apply(buf, job) {
    const zip = await JSZip.loadAsync(buf);
    const path = await sheetFile(zip, "agenda");
    if (!path || !zip.file(path)) throw { code: "nosheet" };
    const sstF = zip.file("xl/sharedStrings.xml");
    const sst = sstF ? parseSST(await sstF.async("string")) : [];
    const lists = await readLists(zip, sst);
    let xml = await zip.file(path).async("string");
    const a = xml.indexOf("<sheetData"), b = xml.indexOf("</sheetData>");
    if (a < 0) throw { code: "nosheet" };
    const openEnd = xml.indexOf(">", a) + 1, selfClosed = xml[openEnd - 2] === "/";
    const head = xml.slice(0, selfClosed ? a : openEnd), tail = selfClosed ? xml.slice(openEnd) : xml.slice(b + "</sheetData>".length);
    const body = selfClosed ? "" : xml.slice(openEnd, b);
    const rowRe = /<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g, rows = [], byNum = {}; let m;
    while ((m = rowRe.exec(body))) { const n = +attr(m[0].slice(0, m[0].indexOf(">") + 1), "r"); byNum[n] = rows.length; rows.push({ n, xml: m[0] }); }
    // righe usate e n. foglio presenti
    const where = {}; let lastUsed = 1;
    const scan = /<c r="(A|B|C|I)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    while ((m = scan.exec(body))) { const r = +m[2]; if (r < 2) continue; const v = cellValue(m[3], m[4], sst); if (v === "") continue; if (r > lastUsed) lastUsed = r; if (m[1] === "A") where[String(v).trim().replace(/\.0+$/, "")] = r; }
    const tplRow = rows.find((x) => x.n === 2) || rows.find((x) => x.n > 1);
    const tpl = tplRow ? rowCells(tplRow.xml) : {};
    let maxRow = rows.length ? rows[rows.length - 1].n : 1;
    let added = 0, updated = 0, cleared = 0;

    function writeRow(r, vals, clearing) {
      let cells, open;
      if (byNum[r] != null) { const old = rows[byNum[r]].xml; open = old.slice(0, old.indexOf(">") + 1).replace(/\/>$/, ">"); cells = rowCells(old); }
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

    const upKeys = new Set(), collisions = [], addedFogli = [], clearedFogli = [];
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
      const key = String(row.foglio); upKeys.add(key);
      if (foreign(key, row)) { collisions.push(key); continue; }
      const vals = valuesFor(row);
      if (where[key]) { if (writeRow(where[key], vals)) updated++; }
      else { const r = ++lastUsed; writeRow(r, vals); where[key] = r; added++; addedFogli.push(key); }
    }
    for (const row of job.ensure || []) {
      const key = String(row.foglio);
      if (upKeys.has(key)) continue;
      if (where[key]) { if (foreign(key, row) && !collisions.includes(key)) collisions.push(key); continue; }
      const r = ++lastUsed; writeRow(r, valuesFor(row)); where[key] = r; added++; addedFogli.push(key);
    }
    for (const c of job.clears || []) {
      const key = String(c && c.foglio != null ? c.foglio : c);
      if (upKeys.has(key) || !where[key]) continue;
      // si svuota solo una riga scritta dall'agenda (mai una riga inserita a mano con lo stesso numero)
      if (known && !known[key] && !(c && c.row && matches(where[key], c.row))) continue;
      const vals = {}; for (const c of OWN) vals[c] = c === "D" ? "formula" : null;
      writeRow(where[key], vals); delete where[key]; cleared++; clearedFogli.push(key);
    }
    lists.fogli = Object.keys(where);
    const agendaChanged = added + updated + cleared > 0;
    // clienti nuovi dal pulsante "Nuovo cliente": righe in fondo al foglio "clienti"
    const cli = job.newClients && job.newClients.length ? await addClients(zip, sst, job.newClients, lists) : null;
    const newClients = cli ? cli.results : [];
    const changed = agendaChanged || !!(cli && cli.added);
    if (!changed) return { changed: false, added, updated, cleared, lists, collisions, addedFogli, clearedFogli, newClients };

    if (agendaChanged) {
      rows.sort((x, y) => x.n - y.n);
      xml = head + (selfClosed ? "<sheetData>" : "") + rows.map((x) => x.xml).join("") + "</sheetData>" + tail;
      xml = xml.replace(/(<dimension ref="[A-Z]+\d+:)([A-Z]+)(\d+)/, (all, pre, col, n) => (+n < maxRow ? pre + col + maxRow : all));
      zip.file(path, xml);
      await growTables(zip, path, maxRow);
    }
    if (cli && cli.added) { zip.file(cli.path, cli.xml); await growTables(zip, cli.path, cli.maxRow); }
    let wb = await zip.file("xl/workbook.xml").async("string");
    wb = wb.replace(/(<definedName name="_xlnm\._FilterDatabase"[^>]*>agenda!\$[A-Z]+\$\d+:\$)([A-Z]+)\$(\d+)/, (all, pre, col, n) => (+n < maxRow ? pre + col + "$" + maxRow : all));
    wb = /<calcPr\b[^>]*fullCalcOnLoad/.test(wb) ? wb : wb.replace(/<calcPr\b([^>]*?)\/>/, '<calcPr$1 fullCalcOnLoad="1"/>');
    zip.file("xl/workbook.xml", wb);
    if (zip.file("xl/calcChain.xml")) {
      zip.remove("xl/calcChain.xml");
      const ct = await zip.file("[Content_Types].xml").async("string");
      zip.file("[Content_Types].xml", ct.replace(/<Override\b[^>]*calcChain[^>]*\/>/g, ""));
      const wr = await zip.file("xl/_rels/workbook.xml.rels").async("string");
      zip.file("xl/_rels/workbook.xml.rels", wr.replace(/<Relationship\b[^>]*calcChain[^>]*\/>/g, ""));
    }
    const out = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
    return { changed: true, buf: out, added, updated, cleared, lists, collisions, addedFogli, clearedFogli, newClients };
  }

  // la tabella (e il suo filtro) si allarga se servono righe nuove
  async function growTables(zip, path, maxRow) {
    const relsPath = path.replace(/([^/]+)$/, "_rels/$1.rels");
    if (!zip.file(relsPath)) return;
    const rels = await zip.file(relsPath).async("string");
    for (const t of rels.match(/<Relationship\b[^>]*>/g) || []) {
      if (!/\/table$/.test(attr(t, "Type") || "")) continue;
      const tp = ("xl/worksheets/" + attr(t, "Target")).replace(/[^/]+\/\.\.\//g, "");
      if (!zip.file(tp)) continue;
      let tx = await zip.file(tp).async("string");
      tx = tx.replace(/(\sref="[A-Z]+\d+:)([A-Z]+)(\d+)/g, (all, pre, col, n) => (+n < maxRow ? pre + col + maxRow : all));
      zip.file(tp, tx);
    }
  }
  async function addTableColumn(zip, path, rows, byNum, col, name) {
    // testo dell'intestazione nei testi condivisi, come le altre intestazioni
    let idx = null;
    const sf = zip.file("xl/sharedStrings.xml");
    if (sf) {
      let sx = await sf.async("string");
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
    const rels = await zip.file(relsPath).async("string");
    for (const t of rels.match(/<Relationship\b[^>]*>/g) || []) {
      if (!/\/table$/.test(attr(t, "Type") || "")) continue;
      const tp = ("xl/worksheets/" + attr(t, "Target")).replace(/[^/]+\/\.\.\//g, "");
      if (!zip.file(tp)) continue;
      let tx = await zip.file(tp).async("string");
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
    let xml = await zip.file(path).async("string");
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
  async function lists(buf) { const zip = await JSZip.loadAsync(buf); const sstF = zip.file("xl/sharedStrings.xml"); const sst = sstF ? parseSST(await sstF.async("string")) : []; return readLists(zip, sst); }

  window.FAT = { apply, lists, COLS, colIdx, xEsc };
})();
