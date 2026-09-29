// Collegamento a Dropbox: accesso (OAuth PKCE, senza server) e lettura/scrittura dei file.
(function () {
  "use strict";
  const C = window.AGENDA_CONFIG || {};
  const API = C.dropboxApi || "https://api.dropboxapi.com";
  const CONTENT = C.dropboxContent || "https://content.dropboxapi.com";
  const NOTIFY = C.dropboxNotify || "https://notify.dropboxapi.com";
  const AUTH = C.dropboxAuth || "https://www.dropbox.com/oauth2/authorize";
  const TK = "agenda-dropbox-token-v1";

  let tok = read();
  function read() { try { return JSON.parse(localStorage.getItem(TK) || "null"); } catch (_) { return null; } }
  function save(t) { tok = t; try { t ? localStorage.setItem(TK, JSON.stringify(t)) : localStorage.removeItem(TK); } catch (_) {} }

  const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, "");
  // i caratteri non ASCII nell'intestazione Dropbox-API-Arg vanno scritti come \uXXXX
  const argHeader = (o) => JSON.stringify(o).replace(/[\u007f-￿]/g, (c) => "\\u" + ("000" + c.charCodeAt(0).toString(16)).slice(-4));

  async function startLogin() {
    if (!C.dropboxAppKey) throw { code: "no_key" };
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
    const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    const state = b64url(crypto.getRandomValues(new Uint8Array(12)));
    sessionStorage.setItem("dbx-verifier", verifier);
    sessionStorage.setItem("dbx-state", state);
    location.href = AUTH + "?" + new URLSearchParams({
      client_id: C.dropboxAppKey, response_type: "code", code_challenge: challenge,
      code_challenge_method: "S256", token_access_type: "offline", redirect_uri: redirectUri(), state,
    });
  }

  // Al ritorno da Dropbox: scambia il codice con i token. Restituisce true se ha completato l'accesso.
  async function finishLogin() {
    const q = new URLSearchParams(location.search);
    if (q.get("error")) { history.replaceState(null, "", redirectUri()); throw { code: "denied" }; }
    if (!q.get("code")) return false;
    const verifier = sessionStorage.getItem("dbx-verifier");
    if (!verifier || q.get("state") !== sessionStorage.getItem("dbx-state")) { history.replaceState(null, "", redirectUri()); throw { code: "state" }; }
    const r = await fetch(API + "/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({ code: q.get("code"), grant_type: "authorization_code", client_id: C.dropboxAppKey, code_verifier: verifier, redirect_uri: redirectUri() }),
    });
    history.replaceState(null, "", redirectUri());
    sessionStorage.removeItem("dbx-verifier"); sessionStorage.removeItem("dbx-state");
    if (!r.ok) throw { code: "token", status: r.status };
    const j = await r.json();
    save({ access: j.access_token, refresh: j.refresh_token, exp: Date.now() + ((j.expires_in || 14400) - 120) * 1000, account: j.account_id });
    return true;
  }

  let refreshing = null;
  async function accessToken(force) {
    if (!tok) throw { code: "no_auth" };
    if (!force && tok.access && Date.now() < tok.exp) return tok.access;
    if (!refreshing) {
      refreshing = (async () => {
        let r;
        try {
          r = await fetch(API + "/oauth2/token", { method: "POST", body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tok.refresh, client_id: C.dropboxAppKey }) });
        } catch (_) { throw { code: "network" }; }
        if (r.status === 400 || r.status === 401) { save(null); throw { code: "no_auth" }; }
        if (!r.ok) throw { code: "busy", status: r.status };
        const j = await r.json();
        save(Object.assign({}, tok, { access: j.access_token, exp: Date.now() + ((j.expires_in || 14400) - 120) * 1000 }));
        return tok.access;
      })().finally(() => { refreshing = null; });
    }
    return refreshing;
  }

  async function call(url, opts, retry = true) {
    const t = await accessToken();
    const o = Object.assign({}, opts, { headers: Object.assign({ Authorization: "Bearer " + t }, opts.headers || {}) });
    let r;
    try { r = await fetch(url, o); } catch (_) { throw { code: "network" }; }
    if (r.status === 401 && retry) { await accessToken(true); return call(url, opts, false); }
    if (r.status === 429 || r.status >= 500) throw { code: "busy", status: r.status };
    return r;
  }

  async function rpc(path, body) {
    const r = await call(API + "/2/" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body == null ? null : body) });
    const txt = await r.text();
    let j = null; try { j = JSON.parse(txt); } catch (_) {}
    if (!r.ok) throw { code: r.status === 409 ? "conflict" : "api", status: r.status, summary: (j && j.error_summary) || txt };
    return j;
  }

  async function download(path) {
    const r = await call(CONTENT + "/2/files/download", { method: "POST", headers: { "Dropbox-API-Arg": argHeader({ path }) } });
    if (r.status === 409) { const t = await r.text(); if (/not_found/.test(t)) return null; throw { code: "api", status: 409, summary: t }; }
    if (!r.ok) throw { code: "api", status: r.status };
    let meta = {}; try { meta = JSON.parse(r.headers.get("Dropbox-API-Result") || "{}"); } catch (_) {}
    return { meta, buf: await r.arrayBuffer() };
  }

  // mode: "add" (fallisce se esiste) | "overwrite" | {update: rev} (fallisce se nel frattempo è cambiato)
  async function upload(path, data, mode) {
    const m = typeof mode === "string" ? mode : { ".tag": "update", update: mode.update };
    const r = await call(CONTENT + "/2/files/upload", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream", "Dropbox-API-Arg": argHeader({ path, mode: m, autorename: false, mute: true, strict_conflict: true }) },
      body: data,
    });
    const txt = await r.text();
    if (r.status === 409) throw { code: "conflict", summary: txt };
    if (!r.ok) throw { code: "api", status: r.status, summary: txt };
    return JSON.parse(txt);
  }

  async function listFolder(path, cursor) {
    try {
      return cursor ? await rpc("files/list_folder/continue", { cursor }) : await rpc("files/list_folder", { path, recursive: true, include_deleted: false });
    } catch (e) {
      if (e.code === "conflict" && /reset/.test(e.summary || "")) throw { code: "reset" };
      if (e.code === "conflict" && /not_found/.test(e.summary || "")) return null;
      throw e;
    }
  }

  // Attende fino a `timeout` secondi una modifica nella cartella. Non serve il token.
  async function longpoll(cursor, timeout) {
    const r = await fetch(NOTIFY + "/2/files/list_folder/longpoll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cursor, timeout }) });
    if (!r.ok) throw { code: "api", status: r.status };
    return r.json();
  }

  async function createFolder(path) {
    try { await rpc("files/create_folder_v2", { path, autorename: false }); } catch (e) { if (!(e.code === "conflict" && /conflict/.test(e.summary || ""))) throw e; }
  }
  async function remove(path) { try { await rpc("files/delete_v2", { path }); } catch (e) { if (!(e.code === "conflict" && /not_found/.test(e.summary || ""))) throw e; } }
  async function search(query, ext) {
    const j = await rpc("files/search_v2", { query, options: { file_extensions: ext ? [ext] : undefined, max_results: 25, filename_only: true } });
    return (j.matches || []).map((m) => m.metadata && m.metadata.metadata).filter((x) => x && x[".tag"] === "file");
  }
  async function account() { return rpc("users/get_current_account", null); }

  window.DBX = {
    isLinked: () => !!(tok && tok.refresh),
    hasKey: () => !!C.dropboxAppKey,
    startLogin, finishLogin, download, upload, listFolder, longpoll, createFolder, remove, search, account,
    unlink() { save(null); },
  };
})();
