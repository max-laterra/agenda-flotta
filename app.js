
(function(){
"use strict";
const APP_VERSION="2.6",APP_DATE="08/10/2026";window.AGENDA_VERSION=APP_VERSION;
// ---------- protezioni all'avvio (2.1) ----------
// 1) L'agenda non funziona dentro la pagina di un altro sito (iframe): lì qualcuno potrebbe coprirla con
//    pulsanti finti e far fare clic senza accorgersene. Si mostra solo il collegamento per aprirla da sola.
function stopPage(title,text,btn,act){
  const d=document.createElement("div");d.id="stopPage";d.setAttribute("role","alert");
  d.style.cssText="position:fixed;inset:0;z-index:2147483647;background:#f1f2ee;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#1d2330";
  const c=document.createElement("div");c.style.cssText="max-width:460px;background:#fff;border-radius:16px;padding:26px 28px;box-shadow:0 12px 40px rgba(0,0,0,.18);text-align:center;line-height:1.45";
  const h=document.createElement("h1");h.textContent=title;h.style.cssText="font-size:20px;margin:0 0 10px";
  const p=document.createElement("p");p.id="stopText";p.textContent=text;p.style.cssText="margin:0 0 16px;font-size:15px;color:#454b57";
  c.appendChild(h);c.appendChild(p);
  if(btn){const a=document.createElement(act.href?"a":"button");a.id="stopBtn";a.textContent=btn;if(act.href){a.href=act.href;a.target="_top";a.rel="noopener";}else{a.type="button";a.onclick=act.click;}
    a.style.cssText="display:inline-block;border:0;border-radius:10px;background:#1f4b8e;color:#fff;font:600 15px system-ui,-apple-system,Segoe UI,Arial,sans-serif;padding:11px 18px;text-decoration:none;cursor:pointer";c.appendChild(a);}
  d.appendChild(c);
  [...document.body.children].forEach(el=>{if(el.tagName!=="SCRIPT")el.hidden=true;});
  document.body.appendChild(d);
}
let framed=false;try{framed=window.top!==window.self;}catch(_){framed=true;}
if(framed){stopPage("Agenda Flotta La Terra","Per sicurezza l'agenda non si può usare dentro la pagina di un altro sito.","Apri l'agenda",{href:location.origin+location.pathname});return;}
// 2) Tutti i file dell'app devono essere della stessa versione. Subito dopo un aggiornamento su GitHub,
//    per qualche minuto, il sito può dare alcuni file nuovi e altri ancora vecchi: invece di partire a metà
//    (pulsanti che non rispondono, errori) l'app aspetta e riprova da sola.
{
  const F=window.AGENDA_FILES||{},bad=[];
  if(document.documentElement.getAttribute("data-v")!==APP_VERSION)bad.push("index.html");
  for(const f of ["dropbox","fatturato","fatture","store","accessi","autisti"])if(F[f]!==APP_VERSION)bad.push(f+".js");
  let n=0;try{n=+sessionStorage.getItem("agenda-upd-try")||0;}catch(_){}
  if(bad.length){
    // ricaricando, ogni file viene richiesto di nuovo al sito (la copia per l'uso offline non si cancella:
    // se la rete è lenta l'app deve potersi comunque aprire appena i file sono tutti uguali)
    const again=async()=>{
      if(!navigator.onLine){const t=document.getElementById("stopText");if(t)t.textContent="Serve la connessione a internet per completare l'aggiornamento alla versione "+APP_VERSION+". Collegati e premi «Riprova adesso».";return;}
      try{sessionStorage.setItem("agenda-upd-try",String(n+1));}catch(_){}
      try{if(navigator.serviceWorker){const r=await navigator.serviceWorker.getRegistration();if(r)await Promise.race([r.update().catch(()=>{}),new Promise(z=>setTimeout(z,3000))]);}}catch(_){}
      location.reload();
    };
    const wait=n<3?8:n<8?20:60;
    stopPage("Aggiornamento in corso","L'agenda si sta aggiornando alla versione "+APP_VERSION+": alcuni file sono già arrivati, altri no ("+bad.join(", ")+"). "+(navigator.onLine?"Riprovo da sola tra "+wait+" secondi; di solito bastano pochi minuti.":"Serve la connessione a internet per completare l'aggiornamento."),"Riprova adesso",{click:again});
    try{console.warn("Agenda: file di versioni diverse",bad);}catch(_){}
    if(navigator.onLine)setTimeout(again,wait*1000);else window.addEventListener("online",again,{once:true});
    return;
  }
  try{sessionStorage.removeItem("agenda-upd-try");}catch(_){}
}
// i caratteri del sito si attivano da qui (niente codice dentro la pagina: lo vieta la regola di sicurezza CSP)
{const l=document.getElementById("gfonts");if(l){const on=()=>{l.media="all";};if(l.sheet)on();else l.addEventListener("load",on);}}
// ---------- flotta predefinita ----------
function mk(id,name,seats,kind,h){return {id:id,name:name,seats:seats,kind:kind,plate:"",h:!!h};}
// Dati della flotta aggiornati (30/09/2026): targa, posti, categoria Excel, ID mezzo, nell'ordine voluto.
// id = mezzo dell'agenda a cui vanno (le prenotazioni restano legate all'id)
const FLEET_2026=[
  ["b81-1","GM701RZ",81,"_81_posti","50"],["b81-2","EY494KH",81,"_81_posti","41"],["b79","AE383RP",79,"_81_posti","16"],
  ["b64","EB605WA",64,"_64_posti","36"],["b58-1","EL851DX",58,"_58_posti","38"],["b58-2","EL852DX",58,"_58_posti","39"],
  ["b54-1","BY620WH",54,"_54_posti","23"],["b54-2","BY241WH",54,"_54_posti","24"],["b54-3","FY961BX",54,"_54_posti","34"],
  ["b52h","DL621AZ","52H","_54_posti","33"],["b52-1","CW410AT",52,"_54_posti","29"],["b52-2","FX264GX",52,"_54_posti","46"],
  ["b52-3","GP342PL",52,"_54_posti","48"],["b52-4","GZ137ZG",52,"_54_posti","51"],["b50","FE144ZK",50,"_54_posti","43"],
  ["b42-1","ER949JC",42,"_42_posti","40"],["b42-2","FP990DZ",42,"_42_posti","44"],["b28-1","FD945CT",28,"_28_posti","42"],
  ["b28-2","GT856XE",28,"_28_posti","49"],["b20-1","EH555MS",20,"_20_posti","35"],["b20-2","FP353BC",20,"_20_posti","45"],
  ["b20-3","HE096VW",20,"_20_posti","52"],["b19","CY324NW",19,"_20_posti","31"],["van7-1","CY999NW",7,"_7_posti","Viano V"],
  ["van7-2","GT889XE",7,"_7_posti","Viano N"],["auto","DX285ME",4,"_3_posti","SW"]
];
function fleetRec(r,ord){const h=/H$/i.test(String(r[2])),n=parseInt(r[2],10);return {plate:r[1],seats:n,h,xcat:r[3],num:r[4],ord,name:n+" posti"+(h?" H":"")};}
const DEFAULT_FLEET=FLEET_2026.map((r,i)=>Object.assign({id:r[0],kind:r[0]==="auto"?"auto":/^van/.test(r[0])?"van":"bus"},fleetRec(r,i+1)));
const TYPES={gita:"Gita",tour:"Tour",notturno:"Notturno",transfer:"Transfer"};
// valori della colonna B "Tipo Servizio" del fatturato
const TYPE_XL={gita:"gita",tour:"tour",notturno:"notturno",transfer:"transfer"};
const STAT_LABELS={gita:"Gite",tour:"Tour",notturno:"Notturni",transfer:"Transfer"};
const MONTH_LAB={gita:"G",tour:"TR",notturno:"N",transfer:"T"};
// le 12 categorie fino alla versione 1.5 diventano le 4 attuali
const OLD_TYPES={gitalt:"gita",gitasc:"gita",escvil:"gita",tourlt:"tour",toursc:"tour",evento:"notturno",navetta:"transfer",transvil:"transfer",immigrati:"transfer"};
const normType=t=>TYPES[t]?t:(OLD_TYPES[t]||"transfer");
const isMulti=t=>normType(t)==="tour";
const onlyDeparture=t=>normType(t)==="transfer";
const hasEvent=t=>normType(t)==="notturno";
// autisti generici: segnaposto quando non si sa ancora chi andrà
const GEN1="Autista Generico 1",GEN2="Autista Generico 2";
const isGen=x=>/^autista\s+generico\b/i.test(String(x||"").trim());
const realDriver=x=>{x=String(x||"").trim();return x&&!isGen(x)?x:"";};
const DRIVERS=[["Accardi Giovanni","g"],["Buscema Salvatore","r"],["Calabrese Saro","g"],["Campo Gianfranco","g"],["Capuano Cosimo","r"],["Cascone Saro","g"],["Di Blasi Antonio","g"],["Giannone Piero","r"],["Giannone Roberto","r"],["Giummarra Luca","g"],["Giunta Fabio","g"],["Giurdanella Giorgio","r"],["Gurrieri Angelo","r"],["La Terra Massimo","r"],["Lo Buglio Antonio","g"],["Lucenti Franco","r"],["Panasia Giovanni","r"],["Senia Fabio","g"],["Silipo Graziano","r"],["Sortino Giorgio","g"],["Virduzzo Luca","g"]];
// nomi abbreviati delle prenotazioni vecchie (es. "Campo G.") → nome per esteso, per contare una persona una volta sola
function driverCanon(x){
  x=String(x||"").trim().replace(/\s+/g," ");if(!x||isGen(x))return x;
  const n=norm(x).replace(/\bold\b/g,"").replace(/[.]/g," ").replace(/\s+/g," ").trim();
  const exact=DRIVERS.find(d=>norm(d[0])===n);if(exact)return exact[0];
  const parts=n.split(" "),ini=parts.length>1&&parts[parts.length-1].length===1?parts.pop():"",sur=parts.join(" ");
  const same=DRIVERS.filter(d=>norm(d[0]).startsWith(sur+" "));
  if(same.length===1)return same[0][0];
  if(ini){const m=same.filter(d=>norm(d[0]).slice(sur.length+1).startsWith(ini));if(m.length===1)return m[0][0];}
  return x;
}
const driverColor=x=>{const d=DRIVERS.find(d=>d[0]===driverCanon(x));return d?d[1]:"";};
// autisti che servono per un servizio: i nomi veri contano una volta sola al giorno,
// ogni generico (o servizio senza autista) conta come una persona in più
function dayCounts(ds){
  const list=dayList(ds),named=new Set();let gen=0;
  for(const b of list){
    const ds2=[b.driver,b.driver2].map(x=>String(x||"").trim()).filter(Boolean);
    if(!ds2.length)gen++;
    for(const d of ds2){if(isGen(d))gen++;else named.add(driverCanon(d).toLowerCase());}
  }
  return {a:named.size+gen,gen:gen,s:list.length,p:new Set(list.map(b=>b.vehicle)).size};
}
function driversText(b){
  const l=[b.driver,b.driver2].map(x=>String(x||"").trim()).filter(Boolean);
  const real=l.filter(x=>!isGen(x)),g=l.length-real.length;
  return real.concat(g?[g>1?g+" da assegnare":"da assegnare"]:[]).join(" + ");
}
function driversHTML(b){
  const l=[b.driver,b.driver2].map(x=>String(x||"").trim()).filter(Boolean);
  return l.map(x=>isGen(x)?'<span class="gen" title="Autista da assegnare">'+esc(x)+'</span>':esc(x)).join(" + ");
}
// categoria "Mezzo" del fatturato (colonna G) in base ai posti
const XCATS=["_3_posti","_7_posti","_20_posti","_28_posti","_42_posti","_54_posti","_58_posti","_64_posti","_81_posti"];
function xcatOf(v){if(v.xcat)return v.xcat;const n=v.seats;if(!n)return "_3_posti";if(n<=7)return "_7_posti";if(n<=20)return "_20_posti";if(n<=28)return "_28_posti";if(n<=42)return "_42_posti";if(n<=54)return "_54_posti";if(n<=58)return "_58_posti";if(n<=79)return "_64_posti";return "_81_posti";}
function statsHTML(list){const tot='<div class="stat"><b>'+list.length+'</b><span>Servizi</span></div>';return tot+Object.keys(STAT_LABELS).map(k=>{const n=list.filter(b=>b.type===k).length;return n?'<div class="stat"><b>'+n+'</b><span>'+STAT_LABELS[k]+'</span></div>':"";}).join("");}
const GROUPS={auto:"Auto e van",van:"Auto e van",bus:"Bus"};
const WD=["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
const WDL=["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"];
const MN=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];

// ---------- date ----------
const pad=n=>String(n).padStart(2,"0");
const iso=(y,m,d)=>y+"-"+pad(m)+"-"+pad(d);
function todayISO(){const d=new Date();return iso(d.getFullYear(),d.getMonth()+1,d.getDate());}
function parse(s){const p=s.split("-").map(Number);return new Date(Date.UTC(p[0],p[1]-1,p[2]));}
function fmt(d){return iso(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate());}
function addDays(s,n){const d=parse(s);d.setUTCDate(d.getUTCDate()+n);return fmt(d);}
function diff(a,b){return Math.round((parse(b)-parse(a))/864e5);}
function wday(s){return parse(s).getUTCDay();}
function mkey(s){return s.slice(0,7);}
function shiftMonth(k,n){let y=+k.slice(0,4),m=+k.slice(5,7)+n;while(m<1){m+=12;y--;}while(m>12){m-=12;y++;}return y+"-"+pad(m);}
function dim(k){return new Date(Date.UTC(+k.slice(0,4),+k.slice(5,7),0)).getUTCDate();}
function short(s){const d=parse(s);return d.getUTCDate()+" "+MN[d.getUTCMonth()].slice(0,3);}
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// data valida: anno tra 2000 e 2099 e giorno esistente (evita 0026 o 20266 scritti per sbaglio)
function validDate(s){return /^20\d\d-\d\d-\d\d$/.test(String(s||""))&&fmt(parse(s))===s;}
// testo pulito: niente caratteri invisibili incollati da Word, PDF o WhatsApp (rovinerebbero il file Excel)
function cleanText(t,multi){
  t=String(t==null?"":t).replace(/\r\n?/g,"\n").replace(/[\u000B\u000C\u2028\u2029]/g,"\n").replace(/\t/g," ")
    .replace(/[\u0000-\u0008\u000E-\u001F\u007F\u200B\u200E\u200F\u202A-\u202E\u2060\uFEFF]/g,"")
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g,m=>m.length===2?m:"");
  if(!multi)t=t.replace(/\n+/g," ");
  return t.trim();
}

// ---------- stato ----------
// flotta in ordine decrescente di posti (l'auto in fondo)
function sortFleet(list){return (Array.isArray(list)?list:[]).filter(v=>v&&typeof v==="object"&&!Array.isArray(v)).map((v,i)=>[v,i]).sort((a,b)=>(a[0].ord&&b[0].ord?a[0].ord-b[0].ord:0)||((b[0].seats||0)-(a[0].seats||0))||(a[1]-b[1])).map(x=>x[0]);}
// come si vede il mezzo nell'elenco a sinistra delle viste Giorno, Settimana e Mese: "81 p. - GM701RZ (50)"
function vehLabelHTML(v){const s=v.seats?v.seats+" p.":"Auto";return '<b>'+esc(s)+'</b>'+(v.h?'<span class="badge-h" title="Accessibile">H</span>':'')+(v.plate?' - '+esc(v.plate):'')+(v.num?' ('+esc(v.num)+')':'');}
// larghezza della colonna dei mezzi: quanto basta per l'etichetta più lunga, così il resto è per i servizi
let _vw={k:"",w:{}};
function vehColW(px){
  const key=S.fleet.map(v=>[v.seats,v.h?1:0,v.plate,v.num].join("|")).join(";")+"@"+px;
  if(_vw.k!==key||!_vw.w[px]){
    if(_vw.k.split("@")[0]!==key.split("@")[0])_vw={k:key,w:{}};
    const cx=document.createElement("canvas").getContext("2d"),ff=getComputedStyle(document.body).fontFamily||"sans-serif";let mx=0;
    for(const v of S.fleet){cx.font="700 "+px+"px "+ff;let w=cx.measureText(v.seats?v.seats+" p.":"Auto").width;cx.font="400 "+px+"px "+ff;w+=cx.measureText((v.plate?" - "+v.plate:"")+(v.num?" ("+v.num+")":"")).width+(v.h?28:0);if(w>mx)mx=w;}
    _vw.k=key;_vw.w[px]=Math.ceil(mx)+8;
  }
  return _vw.w[px];
}
// nome con cui il cliente compare nelle viste: l'alias, quando c'è
function dispClient(b){const c=b.clientCode!==""&&b.clientCode!=null?clientByCode(b.clientCode):null;return (c&&c[2]?String(c[2]):"")||b.client||"Senza cliente";}
const pending=b=>b.status==="opzione"; // prenotazione in sospeso (da confermare)
function vehLabel(v){return (v.seats?v.seats+" posti"+(v.h?" H":""):"Auto")+(v.plate?" - "+v.plate:"")+(v.num?" ("+v.num+")":"");}
const S={fleet:sortFleet(DEFAULT_FLEET),fleetStored:false,days:{},sel:todayISO(),view:"day",readOnly:false,clients:[],regole:{autisti:[],targhe:{},numeri:{}},allDays:null};
let db=null, unsubDays=null, subMonth=null;
const $=id=>document.getElementById(id);

// tutte le prenotazioni (calcolate una volta sola finché i dati non cambiano: da non modificare)
let _allFor=null,_all=[],_idx=null;
function bookingsAll(){
  if(_allFor===S.days)return _all;
  const out=[];
  for(const date in S.days){const bk=(S.days[date]||{}).bookings||{};for(const id in bk){const b=bk[id];if(b&&typeof b==="object")out.push(Object.assign({},b,{id:id,start:b.start||date,type:normType(b.type)}));}}
  _allFor=S.days;_all=out;_idx=null;
  return out;
}
function endOf(b){return (b.end&&b.end>=b.start&&diff(b.start,b.end)<=31)?b.end:b.start;}
// Tour: cosa fa il mezzo in quel giorno, preso dal programma giorno per giorno
function dayProgram(b,ds){
  if(!isMulti(b.type)||!Array.isArray(b.program))return "";
  const i=diff(b.start,ds);if(i<0)return "";
  return String(b.program[i]||"").split("\n").map(x=>x.trim()).filter(Boolean).join(" · ");
}
// testo da mostrare sotto il cliente: per i tour il programma del giorno (il percorso solo il 1° giorno, se il programma manca)
function whatToday(b,ds){
  if(!isMulti(b.type))return b.route||"";
  const p=dayProgram(b,ds);
  return p||(ds===b.start?b.route||"":"");
}
const spans=b=>endOf(b)>b.start;
// indice giorno → prenotazioni in corso quel giorno (così le viste non scorrono tutto l'archivio per ogni casella)
function byDay(){
  const all=bookingsAll();if(_idx&&_idx.all===all)return _idx.map;
  const map={};
  for(const b of all){if(!validDate(b.start))continue;const e=endOf(b);let d=b.start,n=0;while(d<=e&&n<32){(map[d]||(map[d]=[])).push(b);d=addDays(d,1);n++;}}
  _idx={all,map};return map;
}
const dayList=ds=>byDay()[ds]||[];
function on(date,vid,list){return (list?list.filter(b=>b.start<=date&&endOf(b)>=date):dayList(date)).filter(b=>b.vehicle===vid).sort((a,b)=>(a.time||"99").localeCompare(b.time||"99"));}
function vehicle(id){return S.fleet.find(v=>v.id===id);}

// ---------- rendering ----------
function renderAll(){renderMonthBar();renderStrip();if(S.view==="day")renderDay();else if(S.view==="week")renderWeek();else if(S.view==="bill")renderBill();else renderMonth();}
function weekStart(s){return addDays(s,-((wday(s)+6)%7));}

function renderWeek(){
  const mon=weekStart(S.sel),sun=addDays(mon,6),all=bookingsAll(),t=todayISO();
  const days=[];for(let i=0;i<7;i++)days.push(addDays(mon,i));
  const inWeek=all.filter(b=>b.start<=sun&&endOf(b)>=mon);
  const busyAny=new Set(inWeek.map(b=>b.vehicle)).size;
  const cnt=tp=>inWeek.filter(b=>b.type===tp).length;
  const a=parse(mon),z=parse(sun);
  const range=a.getUTCMonth()===z.getUTCMonth()?a.getUTCDate()+"–"+z.getUTCDate()+" "+MN[z.getUTCMonth()]+" "+z.getUTCFullYear():a.getUTCDate()+" "+MN[a.getUTCMonth()].slice(0,3)+" – "+z.getUTCDate()+" "+MN[z.getUTCMonth()].slice(0,3)+" "+z.getUTCFullYear();
  const wr=a.getUTCFullYear()===z.getUTCFullYear()?a.getUTCDate()+" "+MN[a.getUTCMonth()]+" – "+z.getUTCDate()+" "+MN[z.getUTCMonth()]:a.getUTCDate()+" "+MN[a.getUTCMonth()]+" "+a.getUTCFullYear()+" – "+z.getUTCDate()+" "+MN[z.getUTCMonth()]+" "+z.getUTCFullYear();
  $("wsign").innerHTML='<div class="date"><span>'+wr+'</span>'+(t>=mon&&t<=sun?'<span class="today-tag">Questa settimana</span>':'')+'</div>'+
    '<div class="sright"><div class="nav"><button id="wPrev" aria-label="Settimana precedente">‹</button><button id="wNext" aria-label="Settimana successiva">›</button></div></div>';
  let h='<colgroup><col class="vcol" style="width:'+(vehColW(13.5)+14)+'px">'+days.map(()=>"<col>").join("")+'</colgroup><thead><tr><th class="vc">Mezzo</th>';
  for(const ds of days){
    const w=wday(ds),busy=new Set(dayList(ds).map(b=>b.vehicle)).size;
    h+='<th class="'+(w===0?"sun ":"")+(ds===t?"today ":"")+(ds===S.sel?"sel":"")+'" data-goday="'+ds+'" title="Apri la giornata"><span class="wdn">'+WDL[w]+'</span><span class="dnum">'+parse(ds).getUTCDate()+" "+MN[parse(ds).getUTCMonth()].slice(0,3)+'</span><span class="occ">'+busy+"/"+S.fleet.length+' impegnati</span></th>';
  }
  h+='</tr></thead><tbody>';
  for(const v of S.fleet){
    h+='<tr><th class="vc"><span class="vl" title="'+esc(v.name||"")+'">'+vehLabelHTML(v)+'</span></th>';
    for(const ds of days){
      const list=on(ds,v.id);
      let inner="";
      for(const b of list){
        let tp=TYPES[b.type]||"",tm=b.time||"";
        if(spans(b)){const tot=diff(b.start,endOf(b))+1,i=diff(b.start,ds)+1;tp+=" "+i+"/"+tot;if(i>1)tm=i===tot&&b.time2?b.time2:"";}
        inner+='<button class="wb '+esc(b.type)+(pending(b)?" opzione":"")+'" data-edit="'+esc(b.id)+'" data-start="'+esc(b.start)+'" title="'+esc((pending(b)?"IN SOSPESO · ":"Confermata · ")+(b.foglio?"n. "+b.foglio+" · ":"")+(b.client||"")+(b.event?" – "+b.event:"")+(whatToday(b,ds)?" – "+whatToday(b,ds):"")+(b.driver?" · Autista: "+b.driver:"")+(b.escort?" · Accompagnatore: "+b.escort:""))+'">'+
          '<span class="l1">'+(tm?'<span class="tm">'+esc(tm)+'</span>':"")+'<span class="tp">'+tp+'</span><span class="stm '+(pending(b)?"q":"ok")+'" aria-hidden="true">'+(pending(b)?"?":"✓")+'</span></span>'+
          '<span class="cl">'+esc(dispClient(b))+'</span>'+(hasEvent(b.type)&&b.event?'<span class="ev">'+esc(b.event)+'</span>':"")+(whatToday(b,ds)?'<span class="rt'+(dayProgram(b,ds)?" pg":"")+'">'+esc(whatToday(b,ds))+'</span>':"")+'</button>';
      }
      if(!S.readOnly)inner+='<span class="plus">+ Aggiungi</span>';
      h+='<td class="wc'+(wday(ds)===0?" sun":"")+'" data-addv="'+esc(v.id)+'" data-addd="'+esc(ds)+'"><div class="wcell">'+inner+'</div></td>';
    }
    h+='</tr>';
  }
  h+='</tbody><tfoot><tr><th class="vc">Autisti extra</th>';
  for(const ds of days){const ex=(S.days[ds]&&S.days[ds].extra)||"";h+='<td class="'+(wday(ds)===0?"sun":"")+'" data-goday="'+ds+'" title="Apri la giornata per modificare">'+(ex?esc(ex):'<span class="none">Nessuno</span>')+'</td>';}
  h+='</tr></tfoot>';
  $("wgrid").innerHTML=h;
}

function renderMonthBar(){
  const k=mkey(S.sel);$("mTitle").textContent=MN[+k.slice(5,7)-1]+" "+k.slice(0,4);
  $("fleetCount").textContent=S.fleet.length+" mezzi";
}
let cntOpen=true;try{cntOpen=localStorage.getItem("agenda-conteggi")!=="0";}catch(_){}
function renderStrip(){
  const k=mkey(S.sel),n=dim(k),all=bookingsAll(),t=todayISO(),nf=S.fleet.length;
  const wkA=S.view==="week"?weekStart(S.sel):"",wkZ=wkA?addDays(wkA,6):"";
  let g='<div class="lab lg"><button type="button" class="cnt-tg lb" id="cntToggle" aria-expanded="'+cntOpen+'" title="'+(cntOpen?"Nascondi":"Mostra")+' i conteggi (autisti, servizi, mezzi)"><b>G</b><small>giorno</small><i>'+(cntOpen?"▲":"▼")+'</i></button></div>';
  let ra='<div class="lab r2" title="Autisti impegnati"><span class="lb"><b>A</b><small>autisti</small></span></div>';
  let rs='<div class="lab r2" title="Servizi del giorno"><span class="lb"><b>S</b><small>servizi</small></span></div>';
  let rp='<div class="lab r2" title="Mezzi impegnati"><span class="lb"><b>M</b><small>mezzi</small></span></div>';
  for(let d=1;d<=n;d++){
    const ds=k+"-"+pad(d),w=wday(ds);
    const inwk=wkA&&ds>=wkA&&ds<=wkZ;
    const c=dayCounts(ds);
    const pct=Math.round(c.p/Math.max(1,nf)*100);
    const when=WDL[w]+" "+d+": ";
    g+='<button class="dbtn'+(w===0?" sun":"")+(ds===t?" today":"")+(inwk?" inweek":"")+'" data-day="'+ds+'"'+(ds===S.sel?' aria-current="date"':"")+' title="'+c.p+' mezzi impegnati"><span class="wd">'+WD[w]+'</span><span class="dn">'+d+'</span><span class="load"><b style="width:'+pct+'%"></b></span></button>';
    const cls="cc r2"+(w===0?" sun":"")+(ds===S.sel?" sel":"")+(inwk?" inweek":"");
    ra+='<button type="button" class="'+cls+(c.a?"":" z")+'" data-day="'+ds+'" title="'+when+c.a+' autisti'+(c.gen?" (di cui "+c.gen+" da assegnare)":"")+'">'+c.a+(c.gen?'<span class="tbd"></span>':"")+'</button>';
    rs+='<button type="button" class="'+cls+(c.s?"":" z")+'" data-day="'+ds+'" title="'+when+c.s+' servizi">'+c.s+'</button>';
    rp+='<button type="button" class="'+cls+(c.p?"":" z")+(c.p>=nf?" full":"")+'" data-day="'+ds+'" title="'+when+c.p+" su "+nf+' mezzi impegnati">'+c.p+'</button>';
  }
  const st=$("strip");
  st.style.setProperty("--ndays",n);st.classList.toggle("open",cntOpen);
  st.innerHTML=g+ra+rs+rp;
  const cur=st.querySelector('[aria-current="date"]');
  if(cur){const w=st.parentElement;const l=cur.offsetLeft-w.clientWidth/2+cur.clientWidth/2;w.scrollLeft=Math.max(0,l);}
}

// Vista Giorno: ogni servizio su una riga a colonne fisse (non si vedono, ma i dati restano incolonnati):
// stato · inizio · fine · durata · cliente (o alias) · itinerario · autista. Il resto è nel riquadro al passaggio del mouse.
function bookingHTML(b,date){
  const v=vehicle(b.vehicle);
  const tot=diff(b.start,endOf(b))+1,i=diff(b.start,date)+1,multi=tot>1;
  const hrs=durHours(b)!=null; // gita o transfer a ore: l'ora di rientro si vede anche il giorno di partenza
  const t1=!multi||i===1?(b.time||""):"",t2=!multi||i===tot||hrs?(b.time2||""):"";
  const tp=(TYPES[b.type]||"Servizio")+(multi?" · giorno "+i+" di "+tot:"");
  const det=[];
  if(b.foglio)det.push("n. "+b.foglio);
  if(multi)det.push(short(b.start)+" → "+short(endOf(b)));
  if(b.pax!==""&&b.pax!=null){const over=v&&v.seats&&/^\d+$/.test(String(b.pax))&&+b.pax>v.seats;det.push(b.pax+(v&&v.seats?"/"+v.seats:"")+" pax"+(over?" · oltre capienza":""));}
  const eu=x=>Number(x).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
  const has=x=>x!==""&&x!=null;
  if(has(b.price))det.push("Noleggio € "+eu(b.price));
  if(has(b.park))det.push("Parcheggi € "+eu(b.park));
  if(has(b.meals))det.push("Pasti € "+eu(b.meals));
  if(cashOn(b)&&has(b.advance))det.push("Anticipo € "+eu(b.advance));
  if(cashOn(b)&&b.envelope)det.push("Busta "+b.envelope+(b.envno?" n. "+b.envno:""));
  if(hasEvent(b.type)&&b.escort)det.push("Accompagnatore: "+b.escort);
  if(b.contactName||b.contact)det.push("Ref. "+[b.contactName,b.contact].filter(Boolean).join(" "));
  if(b.notes)det.push(b.notes);
  const dtx=[b.driver,b.driver2].map(x=>String(x||"").trim()).filter(Boolean).join(" + ");if(dtx)det.unshift("Autista: "+dtx);
  const what=[hasEvent(b.type)&&b.event?b.event:"",whatToday(b,date)||""].filter(Boolean),name=dispClient(b),drv=driversHTML(b);
  if(b.capo)det.push(capoTitle(b));
  const tip=[(pending(b)?"IN SOSPESO":"Confermata")+" · "+tp,(b.client||"")+(name!==(b.client||"Senza cliente")?" ("+name+")":""),what.join(" – ")].filter(Boolean).join(" · ")+(det.length?"\n"+det.join(" · "):"");
  const over=v&&v.seats&&/^\d+$/.test(String(b.pax||""))&&+b.pax>v.seats;
  return '<div class="bkw '+esc(b.type)+(pending(b)?" opzione":"")+'">'+
    '<button type="button" class="stt '+(pending(b)?"q":"ok")+'" data-conf="'+esc(b.id)+'" data-start="'+esc(b.start)+'"'+(S.readOnly?" disabled":"")+' title="'+(pending(b)?"In sospeso: clic per confermare":"Confermata: clic per rimetterla in sospeso")+'" aria-label="'+(pending(b)?"In sospeso: conferma la prenotazione":"Confermata: rimetti in sospeso")+'">'+(pending(b)?"?":"✓")+'</button>'+
    '<button type="button" class="bk '+esc(b.type)+'" data-edit="'+esc(b.id)+'" data-start="'+esc(b.start)+'" title="'+esc(tip)+'">'+
    '<span class="c-t1">'+esc(t1||(multi&&i>1?"":"—"))+'</span>'+
    '<span class="c-t2">'+esc(t2)+'</span>'+
    '<span class="c-du">'+esc(durShort(b,date))+'</span>'+
    '<span class="c-cl">'+(over?'<span class="over" title="Passeggeri oltre la capienza">!</span> ':'')+esc(name)+'</span>'+
    '<span class="c-rt'+(dayProgram(b,date)?" pg":"")+'">'+(hasEvent(b.type)&&b.event?'<span class="ev">'+esc(b.event)+'</span>':"")+esc(whatToday(b,date)||"")+'</span>'+
    '<span class="c-dr">'+(b.capo?'<i class="capo-m" title="'+esc(capoTitle(b))+'">capo</i>':'')+drv+'</span>'+
    '</button>'+sentChip(b)+'</div>';
}

function renderDay(){
  const date=S.sel,w=wday(date),all=bookingsAll(),d=parse(date);
  const today=dayList(date);
  const busy=new Set(today.map(b=>b.vehicle)),dc=dayCounts(date);
  // giorno e data sulla stessa riga; la domenica in rosso. Numeri: autisti, servizi, mezzi | tipi di servizio
  $("sign").className="sign"+(w===0?" sun":"");
  const tcount=Object.keys(STAT_LABELS).map(k=>[k,today.filter(b=>b.type===k).length]).filter(x=>x[1]);
  $("sign").innerHTML=
    '<div class="date"><span>'+WDL[w]+'</span><span>'+d.getUTCDate()+" "+MN[d.getUTCMonth()]+" "+d.getUTCFullYear()+'</span>'+(date===todayISO()?'<span class="today-tag">Oggi</span>':'')+'</div>'+
    '<div class="sright"><div class="stats">'+
      '<div class="grp">'+
        '<div class="stat" title="'+(dc.gen?"di cui "+dc.gen+" da assegnare":"")+'"><b>'+dc.a+'</b><span>Autisti</span></div>'+
        '<div class="stat"><b>'+today.length+'</b><span>Servizi</span></div>'+
        '<div class="stat" title="'+busy.size+" su "+S.fleet.length+' mezzi"><b>'+busy.size+'</b><span>Mezzi</span></div>'+
      '</div>'+
      (tcount.length?'<div class="grp">'+tcount.map(([k,n])=>'<div class="stat"><b>'+n+'</b><span>'+(n===1?TYPES[k]:STAT_LABELS[k])+'</span></div>').join("")+'</div>':'')+
    '</div>'+
    '<div class="nav"><button id="dPrev" aria-label="Giorno precedente">‹</button><button id="dNext" aria-label="Giorno successivo">›</button></div></div>';
  $("sheet").className="sheet"+(w===0?" sun":"");
  $("sheet").style.setProperty("--vehw",vehColW(15)+"px");
  let h="";
  for(const v of S.fleet){
    const list=on(date,v.id);
    h+='<div class="row'+(list.length?" busy":"")+'">'+
      '<div class="veh"><span class="vl" title="'+esc(v.name||"")+'">'+vehLabelHTML(v)+'</span></div>'+
      '<div class="slots">'+(list.length?list.map(b=>bookingHTML(b,date)).join(""):'<span class="free">Libero</span>')+'</div>'+
      (S.readOnly?"<span></span>":'<button class="add" data-add="'+esc(v.id)+'">+ Aggiungi</button>')+
    '</div>';
  }
  // la vista viene ridisegnata anche da sola (sincronizzazione): chi usa la tastiera non deve perdere il punto
  const af=document.activeElement,keep=af&&af!==document.body&&$("sheet").contains(af)?Object.assign({},af.dataset):null;
  $("sheet").innerHTML=h;
  if(keep){const k=keep.conf!=null?"conf":keep.edit!=null?"edit":keep.add!=null?"add":"";if(k)for(const el of $("sheet").querySelectorAll("[data-"+k+"]"))if(el.dataset[k]===keep[k]&&(el.dataset.start||"")===(keep.start||"")){el.focus({preventScroll:true});break;}}
  const ta=$("extraText");
  if(document.activeElement!==ta){ta.value=(S.days[date]&&S.days[date].extra)||"";}
  ta.readOnly=S.readOnly;
  $("extraHint").textContent="Nomi, orari e servizio assegnato per "+WDL[w]+" "+d.getUTCDate()+" "+MN[d.getUTCMonth()];
}

function renderMonth(){
  const k=mkey(S.sel),n=dim(k),all=bookingsAll(),t=todayISO();
  $("msign").innerHTML='<div class="date"><span>'+MN[+k.slice(5,7)-1]+" "+k.slice(0,4)+'</span></div><div class="sright"><div class="nav"><button id="msPrev" aria-label="Mese precedente">‹</button><button id="msNext" aria-label="Mese successivo">›</button></div></div>';
  let h='<thead><tr><th class="vc">Mezzo</th>';
  for(let d=1;d<=n;d++){const ds=k+"-"+pad(d),w=wday(ds);h+='<th class="'+(w===0?"sun ":"")+(ds===S.sel?"sel":"")+'" data-day="'+ds+'" style="cursor:pointer">'+WD[w].slice(0,1)+'<span class="n">'+d+'</span></th>';}
  h+='</tr></thead><tbody>';
  for(const v of S.fleet){
    h+='<tr><th class="vc"><span class="vl" title="'+esc(v.name||"")+'">'+vehLabelHTML(v)+'</span></th>';
    for(let d=1;d<=n;d++){
      const ds=k+"-"+pad(d),w=wday(ds),list=on(ds,v.id);
      let inner="",tip=[];
      if(list.length){
        const b=list[0];let cls="cell "+b.type;
        if(spans(b)){const s=b.start===ds,e=endOf(b)===ds;cls+=s&&e?"":s?" first":e?" last":" mid";}
        if(list.every(pending))cls+=" opz";
        const lab=list.length>1?list.length:(spans(b)?(b.start===ds?MONTH_LAB[b.type]:""):(MONTH_LAB[b.type]||""));
        inner='<div class="'+cls+'">'+lab+'</div>';
        tip=list.map(x=>(pending(x)?"? ":"✓ ")+(TYPES[x.type]||"")+(x.time?" "+x.time:"")+" – "+dispClient(x)+(x.event?" · "+x.event:"")+(whatToday(x,ds)?" ("+whatToday(x,ds)+")":""));
      }
      h+='<td class="c'+(w===0?" sun":"")+(ds===S.sel?" sel":"")+'" data-day="'+ds+'" title="'+esc(ds.split("-").reverse().join("/")+(tip.length?"\n"+tip.join("\n"):" – libero"))+'">'+inner+'</td>';
    }
    h+='</tr>';
  }
  h+='</tbody><tfoot><tr><th class="vc" style="font-size:11.5px;color:var(--ink-3)">Mezzi liberi</th>';
  for(let d=1;d<=n;d++){const ds=k+"-"+pad(d);const busy=new Set(dayList(ds).map(b=>b.vehicle)).size;h+='<td class="'+(wday(ds)===0?"sun":"")+'">'+(S.fleet.length-busy)+'</td>';}
  h+='</tr></tfoot>';
  $("mgrid").innerHTML=h;
}

// ---------- scrittura ----------
function toast(msg){const t=$("toast");t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,2600);}
function handleErr(e){
  const c=e&&e.code;
  if(c==="baddate"){toast("Controlla la data: l'anno deve essere tra 2000 e 2099.");return;}
  if(c==="invalid_argument"){S.readOnly=true;showBanner("Hai accesso in sola lettura: le modifiche non vengono salvate.");renderAll();}
  else if(c==="quota_exceeded")toast("Spazio di archiviazione pieno: elimina le giornate più vecchie.");
  else toast("Salvataggio non riuscito. Riprova tra poco.");
  ACC.tlog("errore","Salvataggio non riuscito",String(c||(e&&e.message)||e));
}
function showBanner(m){notify(m,true);}



// ---------- form prenotazione ----------
let editing=null; // {id,start}
let formCashWas=false; // la prenotazione aperta aveva anticipo o busta (per svuotarli nel fatturato se vengono tolti)
function openForm(opts){
  opts=opts||{};memIdx=null; // i suggerimenti ripartono dalle prenotazioni di adesso
  const b=opts.booking||{type:"gita",vehicle:opts.vehicle||S.fleet[0].id,start:opts.date||S.sel,end:"",time:"",time2:"",client:"",clientCode:"",route:"",event:"",escort:"",pax:"",price:"",driver:GEN1,driver2:"",contact:"",status:"opzione",notes:""}; // (nuova: Gita, in sospeso finché non la confermi)
  editing=opts.booking?{id:b.id,start:b.start,foglio:b.foglio||"",base:b.updatedAt||null,by:b.by||"",byAt:b.byAt||"",updBy:b.updBy||"",updAt:b.updatedAt||""}:null;progReady=false;
  // solo il Master vede chi ha creato e modificato la prenotazione
  const wh=editing&&isMaster()?[editing.by?"Creata da "+editing.by+(editing.byAt?" "+fmtTime(editing.byAt):""):"",editing.updBy?"ultima modifica di "+editing.updBy+(editing.updAt?" "+fmtTime(editing.updAt):""):""].filter(Boolean).join(" · "):"";
  $("fWho").textContent=wh;$("fWho").hidden=!wh;
  $("fTitle").textContent=editing?"Modifica prenotazione"+(b.foglio?" · n. "+b.foglio:""):"Nuova prenotazione";
  formClient=b.clientCode!==""&&b.clientCode!=null?{code:b.clientCode,name:b.client||""}:null;
  $("f-price").value=b.price==null?"":b.price;$("f-driver2").value=b.driver2||"";
  $("f-park").value=b.park==null?"":b.park;renderParks(b);$("f-meals").value=b.meals==null?"":b.meals;$("f-advance").value=b.advance==null?"":b.advance;$("f-envelope").value=b.envelope||"";$("f-envno").value=b.envno||"";bustaAuto="";
  $("cSug").hidden=true;
  $("f-vehicle").innerHTML=S.fleet.map(v=>'<option value="'+esc(v.id)+'">'+esc(vehLabel(v))+'</option>').join("");
  $("t-"+normType(b.type)).checked=true;
  $("f-vehicle").value=b.vehicle;if(!$("f-vehicle").value&&S.fleet[0])$("f-vehicle").value=S.fleet[0].id;$("f-start").value=b.start;$("f-end").value=(b.end&&b.end>=b.start)?b.end:b.start;$("f-end").min=b.start||"";formStart=b.start;
  $("f-time").value=b.time||"";$("f-time2").value=b.time2||"";$("f-client").value=b.client||"";$("f-route").value=b.route||"";
  $("f-pax").value=b.pax==null?"":b.pax;$("f-event").value=b.event||"";$("f-escort").value=b.escort||"";$("f-driver").value=b.driver||"";$("f-contact").value=b.contact||"";$("f-contactname").value=b.contactName||"";$("f-contactnote").value=b.contactNote||"";$("f-contactrole").innerHTML=tendinaOpts("ruolo",b.contactRole||"");drvPaint("f-driver");drvPaint("f-driver2");
  $("f-status").value=b.status==="opzione"?"opzione":"confermato";paintStatus();
  // la casella Note non c'è più nel modulo: resta visibile solo nelle prenotazioni che hanno già un testo lì
  $("f-notes").value=b.notes||"";$("w-notes").hidden=!String(b.notes||"").trim();
  renderClientInfo();syncDrvQ();
  $("f-saldo").value=b.saldo||"NO";$("f-saldoamt").value=b.saldoAmt==null?"":b.saldoAmt;
  ["refs","hotels","guides"].forEach(k=>renderRep(k,b[k]||[]));renderRep("dnotes",dnotesOf(b));fillPlaceLists();
  endAuto=false;$("fEditAsk").hidden=true;editConfirmed=false;openSheetAfterSave=false;
  progCache=Array.isArray(b.program)?b.program.slice():[];renderProgram();
  formCashWas=!!(editing&&cashOn(b)&&((b.advance!==""&&b.advance!=null)||b.envelope||b.envno));
  $("fDelete").hidden=!editing;$("fConfirm").hidden=true;$("fCloseAsk").hidden=true;
  $("fSpese").hidden=!(editing&&speseFor(b));
  [...$("fBooking").elements].forEach(el=>{if(el.id!=="fCancel")el.disabled=S.readOnly;});
  // bus e autisti decisi dal capo: l'ufficio non li cambia più (il Super Master sì)
  {const dec=!!(editing&&b.capo),lock=dec&&!isSuper();
    if(lock){["f-vehicle","f-driver","f-driver2"].forEach(id=>{$(id).disabled=true;});document.querySelectorAll('#fBooking [data-gen],#fBooking [data-drvopen]').forEach(x=>{x.disabled=true;});}
    $("fCapo").hidden=!dec;if(dec)$("fCapo").textContent=capoTitle(b)+(lock?": da qui non si cambiano più. Per cambiarli serve il capo, che invia di nuovo il foglio.":": tu puoi ancora cambiarli.");}
  formLoading=true;syncType();formLoading=false;checkWarns();
  formOrig=readForm(); // per sapere se l'utente ha cambiato qualcosa e quali campi
  // parcheggi scelti che superano «€ Parcheggi» (cifra abbassata da un dispositivo non aggiornato): il cambio si vede
  if(editing&&pkMismatch!=null)formOrig.park=pkMismatch;
  $("ovBooking").hidden=false;setTimeout(()=>$("f-client").focus(),30);
}
let formOrig=null,saving=false,editConfirmed=false;
const FORM_SKIP=["updatedAt","foglio","bustaOff"];
// campi cambiati dall'utente rispetto a quando il modulo è stato aperto
function formChanges(){if(!formOrig)return [];const now=readForm();return Object.keys(now).filter(k=>!FORM_SKIP.includes(k)&&JSON.stringify(now[k])!==JSON.stringify(formOrig[k]));}
function formDirty(){return !$("ovBooking").hidden&&!S.readOnly&&formChanges().length>0;}
// chiusura del modulo: se ci sono modifiche non salvate chiede conferma
function tryCloseForm(){if(formDirty()){$("fCloseAsk").hidden=false;$("fCloseNo").focus();return false;}closeForm();return true;}
// elenco autisti: i due generici in cima, poi quelli del foglio "regole"
function fillDrivers(){} // l'elenco autisti è quello fisso (DRIVERS): non si legge più dal foglio "regole"
// tendina autisti: generici in cima, poi l'elenco per esteso con i colori; si può anche scrivere
let drvIdx=-1;
function drvItems(id,q){
  q=norm(q||"").trim();
  const gens=(id==="f-driver"?[GEN1,GEN2]:[GEN2,GEN1]).map(n=>({n,c:"x"}));
  const all=gens.concat(DRIVERS.map(d=>({n:d[0],c:d[1]})));
  return q?all.filter(x=>norm(x.n).split(/\s+/).some(w=>w.startsWith(q))||norm(x.n).includes(q)):all;
}
function drvRender(id,show){
  const box=$("dl-"+id),inp=$(id);
  if(!show){box.hidden=true;inp.setAttribute("aria-expanded","false");return;}
  const q=inp.value,cur=driverCanon(q),items=drvItems(id,DRIVERS.some(d=>d[0]===cur)||isGen(q)?"":q);
  let h="";items.forEach((x,i)=>{if(i===2&&x.c!=="x"&&items[1]&&items[1].c==="x")h+='<div class="sep"></div>';h+='<button type="button" role="option" data-drv="'+esc(x.n)+'" class="drv-'+x.c+'" aria-selected="'+(i===drvIdx)+'">'+esc(x.n)+(x.c==="x"?'<small>da assegnare</small>':'')+'</button>';});
  box.innerHTML=h||'<div class="none">Nessun autista con questo nome: resterà scritto così.</div>';
  box.hidden=false;inp.setAttribute("aria-expanded","true");
}
function drvPaint(id){const el=$(id);el.classList.remove("drv-g","drv-r");const c=driverColor(el.value);if(c)el.classList.add("drv-"+c);}
function drvPick(id,name){$(id).value=name;drvRender(id,false);drvPaint(id);syncDrvQ();checkWarns();}
["f-driver","f-driver2"].forEach(id=>{
  const inp=$(id),box=$("dl-"+id);
  inp.addEventListener("focus",()=>{drvIdx=-1;drvRender(id,true);});
  inp.addEventListener("click",()=>{if(box.hidden){drvIdx=-1;drvRender(id,true);}});
  inp.addEventListener("input",()=>{drvIdx=-1;drvRender(id,true);drvPaint(id);});
  inp.addEventListener("blur",()=>setTimeout(()=>{if(document.activeElement!==inp)drvRender(id,false);},150));
  inp.addEventListener("keydown",e=>{
    if(box.hidden)return;const n=box.querySelectorAll("[data-drv]").length;
    if(e.key==="ArrowDown"){e.preventDefault();drvIdx=Math.min(n-1,drvIdx+1);drvRender(id,true);box.querySelector('[aria-selected="true"]')?.scrollIntoView({block:"nearest"});}
    else if(e.key==="ArrowUp"){e.preventDefault();drvIdx=Math.max(0,drvIdx-1);drvRender(id,true);box.querySelector('[aria-selected="true"]')?.scrollIntoView({block:"nearest"});}
    else if(e.key==="Enter"&&drvIdx>=0){e.preventDefault();const b=box.querySelectorAll("[data-drv]")[drvIdx];if(b)drvPick(id,b.dataset.drv);}
    else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();drvRender(id,false);}
  });
  box.addEventListener("mousedown",e=>{const b=e.target.closest("[data-drv]");if(b){e.preventDefault();drvPick(id,b.dataset.drv);}});
});
document.querySelectorAll("[data-drvopen]").forEach(b=>b.addEventListener("mousedown",e=>{e.preventDefault();const id=b.dataset.drvopen,box=$("dl-"+id);if(box.hidden){$(id).focus();drvIdx=-1;drvRender(id,true);}else drvRender(id,false);}));
function paintStatus(){const el=$("f-status");el.classList.toggle("st-q",el.value==="opzione");el.classList.toggle("st-ok",el.value!=="opzione");}
function syncDrvQ(){$("q-driver").hidden=!!$("f-driver").value.trim()||S.readOnly;}
["f-driver","f-driver2"].forEach(id=>$(id).addEventListener("input",syncDrvQ));
fillDrivers();
$("f-status").addEventListener("change",paintStatus);
document.querySelectorAll("[data-gen]").forEach(bt=>bt.addEventListener("click",()=>{const id=bt.dataset.gen;$(id).value=id==="f-driver"?GEN1:GEN2;drvPaint(id);syncDrvQ();}));
// N. busta: con "Busta SI" propone il numero successivo (per anno), modificabile
let bustaAuto="";
function nextBusta(){
  const st=$("f-start").value||todayISO(),y=st.slice(0,4);
  let m=STORE.bustaMax?STORE.bustaMax(y):0;
  for(const x of bookingsAll()){
    if(editing&&x.id===editing.id)continue;
    if(x.envelope!=="SI"||String(x.start).slice(0,4)!==y)continue;
    const n=parseInt(String(x.envno||"").replace(/\D/g,""),10);if(n>m)m=n;
  }
  return m+1;
}
function envChanged(){
  const v=$("f-envelope").value,no=$("f-envno");
  if(v==="SI"&&!no.value.trim()){no.value=String(nextBusta());bustaAuto=no.value;}
  else if(v!=="SI"&&no.value===bustaAuto){no.value="";bustaAuto="";}
}
$("f-envelope").addEventListener("change",envChanged);
// gite, notturni e transfer: la spunta «Busta per l'autista» vale come «Busta SI» dei tour
$("f-bustaon").addEventListener("change",()=>{$("f-envelope").value=$("f-bustaon").checked?"SI":"";envChanged();syncType();});
function eur(id){const v=$(id).value;return v===""?"":Math.round(Number(v)*100)/100;}
// anticipo e busta: nei tour sempre; in gite, notturni e transfer con «Busta per l'autista» (2.6)
const cashOn=b=>!!b&&(isMulti(b.type)||b.envelope==="SI");
const cashForm=type=>isMulti(type)||$("f-bustaon").checked;

// ---------- parcheggi della prenotazione (2.6): tendina dell'anagrafica + cifra, anche più di uno ----------
function parkReg(pid){return pid?regRows("parcheggi").find(r=>r.id===pid)||null:null;}
// come compare il parcheggio nella riga di rimborso della fattura: «In fattura», altrimenti «A» + città, altrimenti il nome tra parentesi
function parkFatt(r,p){const f=r&&String(r.fatt||"").trim();if(f)return f;const c=r&&String(r.citta||"").trim();if(c)return "A "+c;const n=String((r&&r.nome)||(p&&p.nome)||"").trim();return n?"("+n+")":"";}
const parkLabel=r=>(r.nome||"Parcheggio")+(r.citta?" · "+r.citta:"");
function parkOpts(sel,keepName){
  const rows=regRows("parcheggi").slice().sort((a,b)=>String(a.citta||"").localeCompare(String(b.citta||""),"it")||String(a.nome||"").localeCompare(String(b.nome||""),"it"));
  let h='<option value="">— scegli il parcheggio —</option>'+rows.map(r=>'<option value="'+esc(r.id)+'"'+(r.id===sel?" selected":"")+'>'+esc(parkLabel(r))+'</option>').join("");
  if(sel&&!rows.some(r=>r.id===sel))h+='<option value="'+esc(sel)+'" selected>'+esc((keepName||"Parcheggio")+" (non più in anagrafica)")+'</option>';
  if(!S.readOnly&&canEdit("anag"))h+='<option value="__new">＋ Nuovo parcheggio…</option>';
  return h;
}
function pkRowHTML(p,i){
  return '<div class="pk-row" data-nome="'+esc(p.nome||"")+'"><select id="pk-sel-'+i+'" data-pk="pid" data-prev="'+esc(p.pid||"")+'" aria-label="Parcheggio '+(i+1)+'">'+parkOpts(p.pid||"",p.nome)+'</select>'+
    '<input data-pk="amt" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" value="'+esc(p.amt==null?"":p.amt)+'" aria-label="€ parcheggio '+(i+1)+'">'+
    '<button type="button" class="pk-del" data-pkdel="1" aria-label="Togli questo parcheggio" title="Togli">×</button></div>';
}
let pkMismatch=null; // «€ Parcheggi» salvato più basso della somma dei parcheggi scelti
function renderParks(b){
  let l=Array.isArray(b.parks)?b.parks.filter(p=>p&&(p.pid||(p.amt!==""&&p.amt!=null))).map(p=>({pid:p.pid||"",nome:p.nome||"",amt:p.amt})):[];
  const tot=Number(b.park)||0,sum=l.reduce((a,p)=>a+(Number(p.amt)||0),0);
  pkMismatch=l.length&&sum-tot>0.004?(b.park===""||b.park==null?"":Math.round(tot*100)/100):null;
  if(!l.length)l=[{pid:"",nome:"",amt:b.park==null?"":b.park}];
  else if(tot-sum>0.004)l.push({pid:"",nome:"",amt:Math.round((tot-sum)*100)/100}); // cifra scritta da un dispositivo con la versione di prima
  $("pkRows").innerHTML=l.map(pkRowHTML).join("");$("pkNew").hidden=true;pkSync();
}
function pkRowsData(){return [...$("pkRows").querySelectorAll(".pk-row")].map(r=>{const s=r.querySelector('[data-pk="pid"]'),a=r.querySelector('[data-pk="amt"]').value;const pid=s.value==="__new"?"":s.value,reg=parkReg(pid);return {pid,nome:pid?(reg?reg.nome||"":r.dataset.nome||""):"",amt:a===""?"":Math.round(Number(a)*100)/100};});}
function pkTotal(){const l=pkRowsData().filter(p=>p.amt!=="");return l.length?Math.round(l.reduce((a,p)=>a+(Number(p.amt)||0),0)*100)/100:"";}
// si salvano solo se almeno un parcheggio è scelto: altrimenti resta la sola cifra, come prima
function readParks(){const l=pkRowsData();return l.some(p=>p.pid)?l.filter(p=>p.pid||p.amt!==""):[];}
function pkSync(){
  const rows=$("pkRows").querySelectorAll(".pk-row"),t=pkTotal();
  $("f-park").value=t;rows.forEach(r=>{r.querySelector("[data-pkdel]").hidden=rows.length<2;});
  $("pkTot").hidden=rows.length<2;$("pkTot").textContent=rows.length>1?"· totale € "+money(t===""?0:t):"";
  $("pkAdd").hidden=S.readOnly||rows.length>=8;
}
let pkAsk=null; // la tendina che ha chiesto «Nuovo parcheggio»
$("pkRows").addEventListener("input",e=>{if(e.target.dataset.pk==="amt"){pkSync();checkWarns();}});
$("pkRows").addEventListener("change",e=>{
  const s=e.target.closest('[data-pk="pid"]');if(!s)return;
  if(s.value==="__new"){pkAsk=s;s.value=s.dataset.prev||"";$("pkNome").value="";$("pkCitta").value="";$("pkFatt").value="";$("pkAliq").innerHTML=aliqOpts(STORE.contab(),"","IVA della ricevuta: da scegliere in fattura");$("pkNewMsg").textContent="";$("pkNew").hidden=false;fillPlaceLists();$("pkNome").focus();return;}
  s.dataset.prev=s.value;const r=s.closest(".pk-row"),reg=parkReg(s.value);if(r)r.dataset.nome=reg?reg.nome||"":"";pkSync();
});
$("pkRows").addEventListener("click",e=>{if(!e.target.closest("[data-pkdel]")||S.readOnly)return;const r=e.target.closest(".pk-row");if(r&&$("pkRows").children.length>1){r.remove();pkSync();checkWarns();}});
$("pkAdd").onclick=()=>{const i=$("pkRows").children.length;$("pkRows").insertAdjacentHTML("beforeend",pkRowHTML({pid:"",nome:"",amt:""},i));pkSync();$("pkRows").lastElementChild.querySelector("select").focus();};
$("pkNewCancel").onclick=()=>{$("pkNew").hidden=true;if(pkAsk)pkAsk.focus();pkAsk=null;};
async function pkNewSave(){
  const nome=cleanText($("pkNome").value),citta=cleanText($("pkCitta").value),fatt=cleanText($("pkFatt").value),aliq=$("pkAliq").value;
  if(!nome){$("pkNewMsg").textContent="Scrivi il nome del parcheggio.";$("pkNome").focus();return;}
  if(!navigator.onLine){$("pkNewMsg").textContent="Serve la connessione a internet: l'anagrafica è condivisa.";return;}
  const id=nrid();$("pkNewSave").disabled=true;$("pkNewMsg").textContent="";
  try{
    await STORE.updateReg("parcheggi",J=>{J.rows=J.rows||[];J.rows.push({id,nome,citta,indirizzo:"",fatt,aliq,by:meName(),at:new Date().toISOString()});return J;});
    ACC.log("impostazioni","Anagrafica parcheggi: aggiunto «"+nome+"»");
    // tutte le tendine si rifanno con il parcheggio nuovo; quella che l'ha chiesto lo sceglie
    const keep=pkRowsData();if(pkAsk){const i=[...$("pkRows").querySelectorAll('[data-pk="pid"]')].indexOf(pkAsk);if(i>=0){keep[i].pid=id;keep[i].nome=nome;}}
    $("pkRows").innerHTML=keep.map(pkRowHTML).join("");$("pkNew").hidden=true;pkAsk=null;pkSync();checkWarns();
  }catch(_){$("pkNewMsg").textContent="Non riesco a salvarlo adesso: riprova.";}
  finally{$("pkNewSave").disabled=false;}
}
$("pkNewSave").onclick=pkNewSave;
$("pkNew").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();if(e.target.tagName==="INPUT")pkNewSave();else if(e.target.tagName==="BUTTON")e.target.click();}else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();$("pkNewCancel").click();}});
function curType(){const r=document.querySelector('input[name="type"]:checked');return r?r.value:"transfer";}
function syncType(){const mu=isMulti(curType());if(!mu)$("f-bustaon").checked=$("f-envelope").value==="SI";$("w-bustaon").hidden=mu;$("w-envsel").hidden=!mu;$("w-tourcash").hidden=!(mu||$("f-bustaon").checked);if(progReady)renderProgram();const ev=hasEvent(curType());$("w-event").hidden=!ev;$("w-time2").hidden=false;syncEndNextDay();}
// rientro dopo la mezzanotte (es. notturno 17:00 → 01:00): la data di rientro passa da sola al giorno dopo
let endAuto=false,formLoading=false;
function syncEndNextDay(){
  const st=$("f-start").value,t1=$("f-time").value,t2=$("f-time2").value,en=$("f-end").value;
  const night=!!t1&&!!t2&&t2<t1&&validDate(st);
  if(formLoading){} // prenotazione appena aperta: le date restano quelle salvate
  else if(night&&(!en||en===st)){$("f-end").value=addDays(st,1);endAuto=true;}
  else if(!night&&endAuto&&validDate(st)&&en===addDays(st,1)){$("f-end").value=st;endAuto=false;}
  $("endNext").hidden=!(night&&$("f-end").value===addDays(st,1));
}
["f-time","f-time2"].forEach(id=>$(id).addEventListener("change",()=>{syncEndNextDay();checkWarns();}));
$("f-end").addEventListener("input",()=>{endAuto=false;});
function readForm(){
  const type=curType(),start=$("f-start").value,T=id=>cleanText($(id).value);
  const client=T("f-client");
  return {type:type,vehicle:$("f-vehicle").value,start:start,end:$("f-end").value||start,
    time:$("f-time").value,time2:$("f-time2").value,client:client,clientCode:formClient&&formClient.name===client?formClient.code:"",route:T("f-route"),
    event:hasEvent(type)?T("f-event"):"",escort:hasEvent(type)?T("f-escort"):"",
    pax:T("f-pax"),price:eur("f-price"),park:pkTotal(),parks:readParks(),bustaOff:formCashWas&&!cashForm(type),meals:eur("f-meals"),advance:cashForm(type)?eur("f-advance"):"",envelope:isMulti(type)?$("f-envelope").value:cashForm(type)?"SI":"",envno:cashForm(type)?T("f-envno"):"",driver:T("f-driver"),driver2:T("f-driver2"),contact:T("f-contact"),contactName:T("f-contactname"),
    status:$("f-status").value,notes:cleanText($("f-notes").value,true),
    contactRole:$("f-contactrole").value,contactNote:T("f-contactnote"),
    saldo:$("f-saldo").value,saldoAmt:eur("f-saldoamt"),
    refs:readRep("refs"),hotels:readRep("hotels"),guides:readRep("guides"),program:readProgram(),dnotes:readRep("dnotes"),
    updatedAt:new Date().toISOString()};
}
// per i dispositivi con versioni precedenti: le 4 note del foglio anche nei campi di prima
function withOldNotes(b){return Object.assign(b,noteCells(b));}
// se cambiano le note, nell'unione con le modifiche di altri vanno anche i 4 campi di prima
function withOldNoteKeys(patch){
  if(patch.includes("dnotes"))patch=patch.concat(NOTE_OLD.map(x=>x[0]).filter(k=>!patch.includes(k)));
  // busta tolta (gita, notturno, transfer): il segno che fa svuotare anticipo e busta nel file fatturato va insieme
  if(["type","envelope","advance","envno"].some(k=>patch.includes(k))&&!patch.includes("bustaOff"))patch=patch.concat("bustaOff");
  return patch;
}
// prenotazioni (tranne quella aperta) in corso tra due date
function overlapping(start,end){
  const out=new Map();if(!validDate(start))return [];
  const e=validDate(end)&&end>=start&&diff(start,end)<=31?end:start;
  for(let d=start,n=0;d<=e&&n<32;d=addDays(d,1),n++)for(const x of dayList(d))if(!editing||x.id!==editing.id)out.set(x.id+"|"+x.start,x);
  return [...out.values()];
}
const drvKey=x=>driverCanon(String(x||"").trim()).toLowerCase().replace(/\s+/g," "); // "Campo G." = "Campo Gianfranco"
const when=x=>short(x.start)+(endOf(x)!==x.start?"–"+short(endOf(x)):"")+(x.time?" ore "+x.time:"");
function checkWarns(){
  const b=readForm(),w=[],v=vehicle(b.vehicle);
  if(b.start&&!validDate(b.start))w.push("La data di partenza non è valida: controlla l'anno (per esempio 2026, non 0026).");
  if(b.end&&b.end!==b.start&&!validDate(b.end))w.push("La data di rientro non è valida: controlla l'anno.");
  if(b.end&&b.end<b.start)w.push("La data di rientro è prima della partenza.");
  if(b.end&&diff(b.start,b.end)>30)w.push("Un servizio può durare al massimo 31 giorni.");
  if(v&&v.seats&&b.pax!==""&&/^\d+$/.test(String(b.pax))&&+b.pax>v.seats)w.push("Passeggeri ("+b.pax+") oltre la capienza del mezzo ("+v.seats+" posti).");
  if(validDate(b.start)){
    const near=overlapping(b.start,b.end);
    const others=near.filter(x=>x.vehicle===b.vehicle);
    const long=others.filter(x=>!onlyDeparture(x.type)||!onlyDeparture(b.type));
    if(long.length)w.push("Mezzo già impegnato: "+long.map(x=>(TYPES[x.type]||"")+" "+(x.client||"")+" ("+when(x)+")").join("; "));
    else if(others.length)w.push("Sullo stesso mezzo ci sono già "+others.length+" transfer in questa data: verifica gli orari.");
    // stesso autista (con nome) su un altro servizio negli stessi giorni
    for(const dn of [b.driver,b.driver2].map(realDriver).filter(Boolean)){
      const k=drvKey(dn),busy=near.filter(x=>[x.driver,x.driver2].some(y=>realDriver(y)&&drvKey(y)===k));
      if(!busy.length)continue;
      const hard=busy.filter(x=>!onlyDeparture(x.type)||!onlyDeparture(b.type));
      w.push("Autista "+dn+" già impegnato"+(hard.length?"":" (transfer: verifica gli orari)")+": "+busy.map(x=>(TYPES[x.type]||"")+" "+(x.client||"")+" su "+((vehicle(x.vehicle)||{}).name||"altro mezzo")+" ("+when(x)+")").join("; "));
    }
  }
  if(pkMismatch!=null)w.push("I parcheggi scelti (€ "+money(pkTotal()===""?0:pkTotal())+") superano «€ Parcheggi» salvato (€ "+money(pkMismatch===""?0:pkMismatch)+"), forse cambiato da un dispositivo non aggiornato: controlla le cifre prima di salvare.");
  $("fWarns").innerHTML=w.map(x=>"<div>"+esc(x)+"</div>").join("");
  return w;
}
function closeForm(){$("ovBooking").hidden=true;$("cSug").hidden=true;editing=null;}
function yymmdd(d){return d.slice(2,4)+d.slice(5,7)+d.slice(8,10);}
async function nextSeq(date){
  let d=S.days[date];
  if(!d&&db){try{const snap=await db.doc("days/"+date).get();d=snap.exists?snap.data():null;}catch(_){d=null;}}
  const used=Object.values((d&&d.bookings)||{}).filter(Boolean).map(x=>parseInt(String(x.foglio||"").slice(6),10)||0);
  const ext=(window.STORE?STORE.fileFogli(yymmdd(date)):[]).map(x=>parseInt(String(x).slice(6),10)||0);
  return Math.max((d&&d.seq)||0,0,...used,...ext)+1;
}


// ---------- referenti, guide, hotel e note per l'autista (2.0) ----------
// Ogni riga ha le sue caselle. Il nome si sceglie dalla tendina collegata all'anagrafica (per gli hotel
// anche da Google Maps) oppure si scrive. Il referente 1 usa i campi f-contact*, gli altri vanno in "refs".
const TENDINE_DEF={note:["parcheggi","autista","3 ore","extra 1","extra 2"],ruolo:["contabile","ufficio","operativo","sul bus"]};
function tendina(kind){const t=STORE.reg("tendine")||{};const l=Array.isArray(t[kind])?t[kind].filter(x=>typeof x==="string"&&x.trim()):[];return l.length?l:TENDINE_DEF[kind].slice();}
function tendinaOpts(kind,cur){const l=tendina(kind);if(cur&&!l.includes(cur))l.push(cur);return '<option value=""></option>'+l.map(v=>'<option'+(v===cur?' selected':'')+'>'+esc(v)+'</option>').join("");}
const rinp=(f,val,attrs)=>'<input data-f="'+f+'" value="'+esc(val==null?"":val)+'"'+(attrs||' autocomplete="off"')+'>';
const RDEL='<button type="button" data-rdel title="Rimuovi" aria-label="Rimuovi">×</button>';
const COMBO_ATTR=k=>' data-combo="'+k+'" autocomplete="off" role="combobox" aria-expanded="false"';
function repRow(k,i,x){
  x=x||{};
  if(k==="refs")return '<div class="rep-row prow p-ref">'+
    '<div class="f pf-name"><label><b>Nome referente '+(i+2)+'</b></label>'+rinp("name",x.name,COMBO_ATTR("ref")+' placeholder="Cerca in anagrafica o scrivi"')+'</div>'+
    '<div class="f"><label>Ruolo</label><select data-f="role">'+tendinaOpts("ruolo",x.role||"")+'</select></div>'+
    '<div class="f"><label>Telefono</label>'+rinp("tel",x.tel,' type="tel" inputmode="tel" autocomplete="off"')+'</div>'+
    '<div class="f"><label>Note</label>'+rinp("note",x.note,' autocomplete="off" data-mem="refnote"')+'</div>'+RDEL+'</div>';
  if(k==="guides")return '<div class="rep-row prow p-guide"'+(x.region?' data-region="'+esc(x.region)+'"':'')+'>'+
    '<div class="f pf-name"><label><b>Nome guida '+(i+1)+'</b></label>'+rinp("name",x.name,COMBO_ATTR("guide")+' placeholder="Cerca in anagrafica o scrivi"')+'</div>'+
    '<div class="f"><label>Città</label>'+rinp("city",x.city,' list="dlCities" autocomplete="off"')+'</div>'+
    '<div class="f"><label>Telefono</label>'+rinp("tel",x.tel,' type="tel" inputmode="tel" autocomplete="off"')+'</div>'+
    '<div class="f"><label>Note</label>'+rinp("note",x.note)+'</div>'+RDEL+'</div>';
  if(k==="hotels")return '<div class="rep-row prow p-hotel"'+(x.pid?' data-pid="'+esc(x.pid)+'"':'')+(x.region?' data-region="'+esc(x.region)+'"':'')+'>'+
    '<div class="f pf-name"><label><b>Nome hotel '+(i+1)+'</b></label>'+rinp("name",x.name,COMBO_ATTR("hotel")+' placeholder="Cerca l\'hotel (anagrafica o Google) o scrivi"')+'</div>'+
    '<div class="f"><label>Città</label>'+rinp("city",x.city,' list="dlCities" autocomplete="off"')+'</div>'+
    '<div class="f"><label>Indirizzo</label>'+rinp("addr",x.addr)+'</div>'+
    '<div class="f"><label>Telefono</label>'+rinp("tel",x.tel,' type="tel" inputmode="tel" autocomplete="off"')+'</div>'+RDEL+'</div>';
  if(k==="dnotes")return '<div class="rep-row prow p-note"><span class="nlab">Note '+(i+1)+'</span>'+
    '<div class="f"><label>Causale</label><select data-f="c">'+tendinaOpts("note",x.c||"")+'</select></div>'+
    '<div class="f"><label>Testo</label>'+rinp("t",x.t,' autocomplete="off" data-mem="note" placeholder="Es. parcheggiare al Lumbi, indossare la camicia…"')+'</div>'+RDEL+'</div>';
  return "";
}
// numerazione delle etichette dopo un'aggiunta o una rimozione
function renumberRep(k){
  [...$("rep-"+k).querySelectorAll(".rep-row")].forEach((r,i)=>{
    if(k==="dnotes"){const l=r.querySelector(".nlab");if(l)l.textContent="Note "+(i+1);return;}
    const b=r.querySelector(".pf-name label b");if(b)b.textContent=(k==="refs"?"Nome referente ":k==="guides"?"Nome guida ":"Nome hotel ")+(i+(k==="refs"?2:1));
  });
}
// hotel delle versioni precedenti: tutto nel nome, "Nome – indirizzo, città" → nome, indirizzo e città separati
function splitOldHotel(h){
  if(!h||!h.name||h.addr||h.city||!/ – /.test(h.name))return h;
  const i=h.name.indexOf(" – "),n=h.name.slice(0,i).trim(),rest=h.name.slice(i+3).trim(),parts=rest.split(/,\s*/).filter(Boolean);
  if(!n||parts.length<2)return h; // non sembra "indirizzo, città": si lascia com'è
  const city=parts.pop().trim();
  return Object.assign({},h,{name:n,addr:parts.join(", ").trim(),city});
}
function renderRep(k,list){
  list=(list||[]).slice();if(k==="hotels")list=list.map(splitOldHotel);if(!list.length&&k!=="refs")list=[{}]; // guide, hotel e note: sempre almeno una riga
  $("rep-"+k).innerHTML=list.map((x,i)=>repRow(k,i,x)).join("");
}
function readRep(k){
  return [...$("rep-"+k).querySelectorAll(".rep-row")].map(r=>{
    const o={};r.querySelectorAll("[data-f]").forEach(el=>{o[el.dataset.f]=cleanText(el.value);});
    if(k==="hotels"&&r.dataset.pid)o.pid=r.dataset.pid;
    if((k==="hotels"||k==="guides")&&r.dataset.region)o.region=r.dataset.region;
    for(const f in o)if(o[f]==="")delete o[f];
    return o;
  }).filter(x=>k==="dnotes"?(x.c||x.t):(x.name||x.tel));
}
// note per l'autista: dalle 4 caselle delle versioni precedenti alla lista "Causale + testo"
const NOTE_OLD=[["npark","parcheggi"],["ndriver","autista"],["n3h","3 ore"],["nextra","extra 1"]];
function dnotesOf(b){if(Array.isArray(b.dnotes))return b.dnotes;const l=[];for(const [f,c] of NOTE_OLD)if(b[f])l.push({c,t:b[f]});return l;}
// le 4 caselle del foglio di servizio (Note 1° park, 2° autista, 3° 3 ore, 4° extra)
function noteCells(b){
  const o={npark:[],ndriver:[],n3h:[],nextra:[]};
  for(const n of dnotesOf(b)){
    if(!n||!(n.t||n.c))continue;const c=norm(n.c||"").trim();
    const key=/^(parcheggi|park)/.test(c)?"npark":c==="autista"?"ndriver":/^3\s*ore/.test(c)?"n3h":"nextra";
    const pre=key==="nextra"&&n.c&&!/^extra/i.test(n.c)&&n.t?n.c+": ":"";
    o[key].push(pre+(n.t||n.c));
  }
  return {npark:o.npark.join(" · "),ndriver:o.ndriver.join(" · "),n3h:o.n3h.join(" · "),nextra:o.nextra.join(" · ")};
}
$("fBooking").addEventListener("click",e=>{
  const a=e.target.closest("[data-addrep]");
  if(a){const k=a.dataset.addrep,box=$("rep-"+k);box.insertAdjacentHTML("beforeend",repRow(k,box.children.length,{}));const f=box.lastElementChild.querySelector("input,select");if(f)f.focus();return;}
  const d=e.target.closest("[data-rdel]");
  if(d){const r=d.closest(".rep-row"),box=r.parentElement,k=box.id.replace("rep-","");r.remove();if(k!=="refs"&&!box.children.length)box.insertAdjacentHTML("beforeend",repRow(k,0,{}));renumberRep(k);}
});

// ---------- tendine collegate alle anagrafiche (referenti, guide, hotel) e a Google Maps ----------
// Google Places API (New): suggerimenti mentre scrivi (solo strutture ricettive, in Italia, vicino alla
// Sicilia) e, alla scelta, nome, città, indirizzo e telefono. La chiave la inserisce il Master nelle Impostazioni.
// Suggerimenti e dettagli usano lo stesso "token di sessione": così Google conta una sola ricerca.
const CB={inp:null,box:null,items:[],idx:-1,timer:null,token:null,seq:0,err:"",lastG:[],lastQ:""};
function gKey(){return String(((STORE.settings||{}).googleKey)||"").trim();}
function newToken(){try{return crypto.randomUUID();}catch(_){return "t"+Date.now().toString(36)+Math.random().toString(36).slice(2);}}
function regRows(kind){const r=STORE.reg(kind);return r&&Array.isArray(r.rows)?r.rows.filter(x=>x&&typeof x==="object"&&!Array.isArray(x)):[];}
const nkey=t=>norm(t).replace(/[^a-z0-9]+/g," ").trim();
// hotel scritti nelle prenotazioni (anche quelli delle versioni precedenti, con l'indirizzo nel nome)
function knownHotels(){
  const m=new Map();
  for(const d in S.days){const bk=(S.days[d]&&S.days[d].bookings)||{};for(const id in bk){const x=bk[id];if(!x)continue;for(let h of (x.hotels||[])){if(!h||!h.name)continue;h=splitOldHotel(h);const k=nkey(h.name);const o=m.get(k);if(!o||(!o.tel&&h.tel)||(!o.pid&&h.pid))m.set(k,Object.assign({},h,{n:(o?o.n:0)+1}));else o.n++;}}}
  return [...m.values()];
}
function wmatch(hay,words){const ws=norm(hay).split(/[^a-z0-9]+/);return words.every(w=>ws.some(x=>x.startsWith(w)));}
function cbLocal(kind,q){
  const words=norm(q).split(/[^a-z0-9]+/).filter(Boolean);
  if(kind==="ref"){
    const cli=nkey($("f-client").value),rows=regRows("referenti");
    let l=words.length?rows.filter(r=>wmatch([r.nome,r.cliente,r.citta,r.tel].join(" "),words)):(cli?rows.filter(r=>nkey(r.cliente)===cli):[]);
    l=l.slice().sort((a,b)=>((nkey(b.cliente)===cli)-(nkey(a.cliente)===cli))||String(a.nome||"").localeCompare(String(b.nome||""),"it"));
    return l.slice(0,8).map(r=>({src:"reg",main:r.nome,sec:[r.cliente,r.citta,r.tel].filter(Boolean).join(" · "),fill:{name:r.nome,tel:r.tel||""}}));
  }
  if(!words.length)return [];
  if(kind==="guide"){
    return regRows("guide").filter(r=>wmatch([r.nome,r.citta,r.regione].join(" "),words)).sort((a,b)=>String(a.nome||"").localeCompare(String(b.nome||""),"it")).slice(0,8)
      .map(r=>({src:"reg",main:r.nome,sec:[r.citta,r.regione,r.tel].filter(Boolean).join(" · "),fill:{name:r.nome,city:r.citta||"",tel:r.tel||""},region:r.regione||""}));
  }
  const reg=regRows("hotel").filter(r=>wmatch([r.nome,r.citta,r.indirizzo].join(" "),words)).map(r=>({src:"reg",main:r.nome,sec:[r.indirizzo,r.citta,r.tel].filter(Boolean).join(" · "),fill:{name:r.nome,city:r.citta||"",addr:r.indirizzo||"",tel:r.tel||""},pid:r.pid||"",region:r.regione||""}));
  const seen=new Set(reg.map(x=>nkey(x.main)));
  const old=knownHotels().filter(h=>!seen.has(nkey(h.name))&&wmatch(h.name,words)).sort((a,b)=>b.n-a.n).map(h=>({src:"reg",main:h.name,sec:[h.addr,h.city,h.tel].filter(Boolean).join(" · ")||"già usato",fill:{name:h.name,city:h.city||"",addr:h.addr||"",tel:h.tel||""},pid:h.pid||"",region:h.region||""}));
  return reg.concat(old).slice(0,6);
}
// Una chiave Google limitata ai «siti web» controlla l'indirizzo da cui arriva la richiesta. Il browser di
// solito manda solo il sito (https://nome.github.io/); se nella chiave è scritto l'indirizzo completo
// dell'agenda (…/agenda-flotta/*) Google rifiuta. In quel caso si riprova mandando l'indirizzo completo
// della pagina (senza parametri) e ci si ricorda quale dei due modi funziona.
let gRefFull=false;
const gRefBlocked=e=>e&&e.code==="google"&&e.status===403&&(/REFERRER_BLOCKED/.test(e.reason||"")||/referr?er/i.test(e.msg||""));
async function gFetch1(url,opts,ms,full){
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),ms||8000);
  try{
    const r=await fetch(url,Object.assign({},opts,{signal:ctl.signal},full?{referrer:location.origin+location.pathname,referrerPolicy:"no-referrer-when-downgrade"}:{}));
    const j=await r.json().catch(()=>({}));
    if(!r.ok){const er=j.error||{},rs=((er.details||[]).find(d=>d&&d.reason)||{}).reason||"";throw {code:"google",status:r.status,msg:String(er.message||("HTTP "+r.status)).slice(0,300),st:String(er.status||""),reason:String(rs)};}
    return j;
  }catch(e){if(e&&e.code==="google")throw e;throw {code:"net"};}
  finally{clearTimeout(t);}
}
async function gFetch(url,opts,ms){
  try{return await gFetch1(url,opts,ms,gRefFull);}
  catch(e){
    if(!gRefBlocked(e))throw e;
    try{const j=await gFetch1(url,opts,ms,!gRefFull);gRefFull=!gRefFull;return j;}catch(_){throw e;}
  }
}
async function gAutocomplete(q,key,token){
  const j=await gFetch("https://places.googleapis.com/v1/places:autocomplete",{method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":key},
    body:JSON.stringify({input:q,includedPrimaryTypes:["lodging"],includedRegionCodes:["it"],languageCode:"it",regionCode:"it",sessionToken:token,
      locationBias:{circle:{center:{latitude:37.45,longitude:14.35},radius:50000}}})});
  return (j.suggestions||[]).map(s=>s.placePrediction).filter(Boolean).map(p=>({pid:p.placeId,main:(p.structuredFormat&&p.structuredFormat.mainText&&p.structuredFormat.mainText.text)||(p.text&&p.text.text)||"",sec:(p.structuredFormat&&p.structuredFormat.secondaryText&&p.structuredFormat.secondaryText.text)||""}));
}
async function gDetails(pid,key,token){
  const j=await gFetch("https://places.googleapis.com/v1/places/"+encodeURIComponent(pid)+"?languageCode=it&regionCode=it"+(token?"&sessionToken="+encodeURIComponent(token):""),{headers:{"X-Goog-Api-Key":key,"X-Goog-FieldMask":"id,displayName,shortFormattedAddress,formattedAddress,addressComponents,nationalPhoneNumber,internationalPhoneNumber"}});
  const comps=j.addressComponents||[],get=t=>{const c=comps.find(x=>(x.types||[]).includes(t));return c?(c.longText||c.shortText||""):"";};
  let city=get("locality")||get("administrative_area_level_3")||get("postal_town"),addr=[get("route"),get("street_number")].filter(Boolean).join(", ");
  const region=get("administrative_area_level_1");
  if(!addr||!city){const parts=(j.shortFormattedAddress||j.formattedAddress||"").replace(/,\s*Italia$/,"").split(/,\s*/).filter(Boolean);
    if(!city&&parts.length>1)city=parts[parts.length-1].replace(/\s+[A-Z]{2}$/,"").replace(/^\d{5}\s+/,"");
    if(!addr)addr=parts.slice(0,Math.max(1,parts.length-1)).join(", ");}
  return {pid:j.id||pid,name:(j.displayName&&j.displayName.text)||"",city,addr,region,tel:j.nationalPhoneNumber||j.internationalPhoneNumber||""};
}
function gErrText(e){
  if(!e)return "";
  if(e.code==="net")return navigator.onLine?"Google non risponde: riprova tra poco.":"Sei offline: la ricerca su Google tornerà con la connessione.";
  const rs=e.reason||"",msg=e.msg||"";
  if(/API_KEY_INVALID/.test(rs)||/API key not valid/i.test(msg))return "Chiave Google non valida: il Master la controlla nelle Impostazioni.";
  if(/BILLING/i.test(rs+msg))return "Su Google non è attiva la fatturazione del progetto: senza, la ricerca non funziona.";
  // 403: Google dice il motivo esatto, così si sa cosa sistemare nella console di Google Cloud
  if(gRefBlocked(e))return "Google ha rifiutato la ricerca: questo sito non è tra quelli autorizzati nella chiave. In Google Cloud › Credenziali › la chiave › «Restrizioni dei siti web» aggiungi "+location.origin+"/* (con /* alla fine).";
  if(/SERVICE_DISABLED/.test(rs)||/has not been used in project|it is disabled/i.test(msg))return "Nel progetto Google non è attiva «Places API (New)»: attivala in API e servizi › Libreria (la vecchia «Places API» non basta), poi aspetta qualche minuto.";
  if(/API_KEY_SERVICE_BLOCKED/.test(rs)||/are blocked/i.test(msg))return "La chiave Google non è abilitata a «Places API (New)»: in Credenziali › la chiave › «Restrizioni delle API» aggiungi Places API (New).";
  if(e.status===403)return "Google ha rifiutato la ricerca: la chiave non è abilitata a «Places API (New)» oppure questo sito non è tra quelli autorizzati."+(msg&&!/^HTTP /.test(msg)?" Google dice: «"+msg.slice(0,180)+"»":"");
  if(e.status===429)return "Limite di ricerche Google raggiunto per oggi.";
  return "Ricerca Google non riuscita ("+(msg||e.status||"errore")+").";
}
// per il log tecnico: la risposta di Google così com'è (stato, motivo, messaggio)
function gErrRaw(e){return e&&e.code==="google"?[e.status,e.st,e.reason,e.msg].filter(Boolean).join(" · "):"";}
function cbClose(){if(CB.box)CB.box.remove();if(CB.inp)CB.inp.setAttribute("aria-expanded","false");CB.box=null;CB.items=[];CB.idx=-1;clearTimeout(CB.timer);}
const hsClose=cbClose;
function cbRender(google,loading){
  const inp=CB.inp;if(!inp)return;
  const kind=inp.dataset.combo,q=inp.value.trim();
  const local=cbLocal(kind,q);
  const g=kind==="hotel"?(google||[]).filter(x=>!local.some(l=>l.pid&&l.pid===x.pid)).slice(0,5).map(x=>Object.assign({src:"g"},x)):[];
  CB.items=local.concat(g);if(CB.idx>=CB.items.length)CB.idx=-1;
  if(!CB.box){CB.box=document.createElement("div");CB.box.className="hsug";CB.box.setAttribute("role","listbox");inp.closest(".prow").appendChild(CB.box);
    CB.box.addEventListener("mousedown",e=>{const b=e.target.closest("[data-hi]");e.preventDefault();if(b)cbPick(+b.dataset.hi);});}
  const head={ref:"Anagrafica referenti",guide:"Anagrafica guide",hotel:"Anagrafica hotel"}[kind];
  let h="";
  if(local.length)h+='<div class="hs-h">'+head+'</div>'+local.map((x,i)=>'<button type="button" role="option" data-hi="'+i+'" aria-selected="'+(i===CB.idx)+'"><b>'+esc(x.main)+'</b><span>'+esc(x.sec||"")+'</span></button>').join("");
  if(kind==="hotel"&&q.length>=3){
    if(!gKey())h+='<div class="hs-note">'+(isMaster()?'Per cercare gli hotel su Google inserisci la chiave in <b>Pannello Master › Impostazioni</b>.':'Ricerca su Google non attiva: chiedi al Master.')+'</div>';
    else{
      h+='<div class="hs-h">Google Maps'+(loading?' <i>cerco…</i>':'')+'</div>';
      if(g.length)h+=g.map((x,j)=>{const i=local.length+j;return '<button type="button" role="option" data-hi="'+i+'" aria-selected="'+(i===CB.idx)+'"><b>'+esc(x.main)+'</b><span>'+esc(x.sec)+'</span></button>';}).join("");
      else if(!loading)h+='<div class="hs-note">'+(CB.err?esc(CB.err):'Nessun hotel trovato su Google con questo nome.')+'</div>';
    }
  }
  if(!h){cbClose();return;}
  CB.box.innerHTML=h;inp.setAttribute("aria-expanded","true");
  const r=CB.box.getBoundingClientRect();if(r.bottom>window.innerHeight)CB.box.scrollIntoView({block:"nearest"}); // la tendina deve restare visibile
}
function cbSearch(){
  const inp=CB.inp;if(!inp)return;const q=inp.value.trim();
  clearTimeout(CB.timer);CB.err="";
  if(inp.dataset.combo!=="hotel"||q.length<3||!gKey()||!navigator.onLine){if(inp.dataset.combo==="hotel"&&q.length>=3&&gKey()&&!navigator.onLine)CB.err=gErrText({code:"net"});cbRender([],false);return;}
  cbRender(CB.lastG&&CB.lastQ&&norm(q).startsWith(norm(CB.lastQ))?CB.lastG:[],true);
  const seq=++CB.seq;
  CB.timer=setTimeout(async()=>{
    if(!CB.token)CB.token=newToken();
    try{const r=await gAutocomplete(q,gKey(),CB.token);if(seq!==CB.seq||CB.inp!==inp)return;CB.lastG=r;CB.lastQ=q;cbRender(r,false);}
    catch(e){if(seq!==CB.seq)return;CB.err=gErrText(e);ACC.tlog("avviso","Ricerca hotel su Google: "+CB.err,gErrRaw(e));CB.lastG=[];cbRender([],false);}
  },300);
}
// scegliendo una voce si sostituiscono anche i campi che la voce non ha (niente telefono rimasto della scelta precedente)
function cbFill(row,fill){for(const k in fill){const el=row.querySelector('[data-f="'+k+'"]');if(el&&fill[k]!=null)el.value=fill[k];}}
async function cbPick(i){
  const x=CB.items[i],inp=CB.inp;if(!x||!inp)return;
  const row=inp.closest(".prow");
  cbClose();
  if(x.src==="reg"){cbFill(row,x.fill);if(x.pid)row.dataset.pid=x.pid;else delete row.dataset.pid;if(x.region)row.dataset.region=x.region;else delete row.dataset.region;checkWarns();return;}
  // Google: nome subito, il resto appena arrivano i dettagli
  inp.value=x.main;row.dataset.pid=x.pid;delete row.dataset.region;
  ["city","addr","tel"].forEach(f=>{const el=row.querySelector('[data-f="'+f+'"]');if(el)el.value="";});
  const tel=row.querySelector('[data-f="tel"]');const token=CB.token;CB.token=null; // la sessione di ricerca finisce con la scelta
  if(tel)tel.placeholder="Cerco il telefono…";
  try{const d=await gDetails(x.pid,gKey(),token);if(inp.isConnected){cbFill(row,{name:d.name||x.main,city:d.city||"",addr:d.addr||"",tel:d.tel||""});if(d.region)row.dataset.region=d.region;}}
  catch(e){toast(gErrText(e));ACC.tlog("avviso","Dettagli hotel da Google: "+gErrText(e),gErrRaw(e));}
  finally{if(tel)tel.placeholder="";}
}
$("fBooking").addEventListener("input",e=>{
  const t=e.target;if(!t.dataset||!t.dataset.combo)return;
  const row=t.closest(".prow");if(row&&t.dataset.combo==="hotel")delete row.dataset.pid; // nome cambiato a mano: non è più l'hotel di Google
  if(CB.inp!==t){cbClose();CB.inp=t;}
  cbSearch();
});
$("fBooking").addEventListener("focusin",e=>{const t=e.target;if(!t.dataset||t.dataset.combo!=="ref"||t.value.trim())return;if(CB.inp!==t){cbClose();CB.inp=t;}cbRender([],false);});
$("fBooking").addEventListener("focusout",e=>{if(e.target===CB.inp)setTimeout(()=>{if(document.activeElement!==CB.inp)cbClose();},150);});
$("fBooking").addEventListener("keydown",e=>{
  if(e.target!==CB.inp||!CB.box)return;const n=CB.items.length;
  if(e.key==="ArrowDown"&&n){e.preventDefault();CB.idx=(CB.idx+1)%n;cbRender(CB.lastG,false);}
  else if(e.key==="ArrowUp"&&n){e.preventDefault();CB.idx=CB.idx<=0?n-1:CB.idx-1;cbRender(CB.lastG,false);}
  else if(e.key==="Enter"&&CB.idx>=0){e.preventDefault();cbPick(CB.idx);}
  else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();cbClose();}
});
// città e regioni già usate: suggerimenti nelle caselle Città / Regione
function fillPlaceLists(){
  const c=new Set(),r=new Set();
  for(const k of ["referenti","guide","hotel"])for(const x of regRows(k)){if(x.citta)c.add(x.citta);if(x.regione)r.add(x.regione);}
  ["Sicilia","Calabria","Campania","Puglia","Lazio","Lombardia","Toscana","Veneto","Piemonte","Emilia-Romagna","Sardegna","Basilicata","Abruzzo","Molise","Marche","Umbria","Liguria","Friuli-Venezia Giulia","Trentino-Alto Adige","Valle d'Aosta"].forEach(x=>r.add(x));
  $("dlCities").innerHTML=[...c].sort((a,b)=>a.localeCompare(b,"it")).map(x=>'<option value="'+esc(x)+'">').join("");
  $("dlRegions").innerHTML=[...r].sort((a,b)=>a.localeCompare(b,"it")).map(x=>'<option value="'+esc(x)+'">').join("");
}
// programma: una casella per il servizio in giornata, una per ogni giorno nei tour
let progCache=[],progReady=false;
function progDays(){
  const type=curType(),st=$("f-start").value;
  if(!isMulti(type)||!st)return null;
  const en=$("f-end").value&&$("f-end").value>=st?$("f-end").value:st,n=Math.min(31,diff(st,en)+1),out=[];
  for(let i=0;i<n;i++){const d=addDays(st,i);out.push((i+1)+"° giorno - "+(+d.slice(8,10))+"/"+d.slice(5,7)+" - "+WDL[wday(d)].replace(/^./,c=>c.toUpperCase()));}
  return out;
}
function readProgram(){return [...$("progWrap").querySelectorAll("textarea")].map(t=>cleanText(t.value,true));}
function renderProgram(){
  if(progReady)progCache=readProgram().map((v,i)=>v||progCache[i]||"");
  const days=progDays();
  if(!days){
    const all=progCache.filter(Boolean).join("\n");
    $("progWrap").innerHTML='<textarea id="prog-0" data-mem="programma" data-memline="1" aria-labelledby="l-prog" placeholder="Ore 06:45 PORTO DI POZZALLO, arriva il catamarano&#10;SIRACUSA, Skydiving - strada Laganelli 20&#10;Ore 16:00 partenza per Avola">'+esc(all)+'</textarea>';
    $("progHint").textContent="Una riga per ogni tappa, con orario e luogo. Le righe vengono numerate da sole.";
  }else{
    $("progWrap").innerHTML=days.map((h,i)=>'<div class="prog-day"><b>'+esc(h)+'</b><textarea id="prog-'+i+'" data-mem="programma" data-memline="1" rows="2" aria-label="'+esc(h)+'" placeholder="1° Hotel > Etna Sud > 1° Hotel">'+esc(progCache[i]||"")+'</textarea></div>').join("");
    $("progHint").textContent="Un riquadro per ogni giorno del tour.";
  }
  progReady=true;
}
// la data di rientro segue la partenza finché non la cambi tu
let formStart="";
$("f-start").addEventListener("change",()=>{const st=$("f-start").value,en=$("f-end").value;if(st&&(!en||en<st||en===formStart||(endAuto&&en===addDays(formStart,1))))$("f-end").value=st;syncEndNextDay();$("f-end").min=st||"";formStart=st;checkWarns();if(isMulti(curType()))renderProgram();});
$("f-end").addEventListener("change",()=>{if(isMulti(curType()))renderProgram();});
let openSheetAfterSave=false;
$("fSheet").onclick=()=>{if(S.readOnly)return;openSheetAfterSave=true;$("fBooking").requestSubmit();};

// ---------- ricerca cliente ----------
let formClient=null,sugIdx=-1,sugList=[];
function norm(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
function searchClients(q){
  q=norm(q).trim();if(!q)return [];
  const words=q.split(/\s+/),out=[];
  for(const c of S.clients){
    const hay=c._k||(c._k=norm(c[0]+" "+c[1]+" "+c[2]+" "+c[3]));
    if(words.every(w=>hay.includes(w))){out.push(c);if(out.length>=40)break;}
  }
  const starts=x=>norm(x[1]).startsWith(q)||norm(x[2]).startsWith(q)?0:1;
  return out.sort((a,b)=>starts(a)-starts(b)).slice(0,8);
}
function renderSug(){
  const box=$("cSug"),q=$("f-client").value;
  sugList=searchClients(q);
  if(!q.trim()||(formClient&&formClient.name===q.trim())){box.hidden=true;$("f-client").setAttribute("aria-expanded","false");return;}
  box.innerHTML=sugList.length?sugList.map((c,i)=>'<button type="button" role="option" data-ci="'+i+'" aria-selected="'+(i===sugIdx)+'"><b>'+esc(c[1])+'</b><span>Cod. '+esc(c[0])+(c[2]?' · '+esc(c[2]):'')+(c[3]?' · '+esc(c[3]):'')+'</span></button>').join(""):'<div class="none">'+(S.clients.length?'Nessun cliente trovato: resterà senza codice.':'Elenco clienti non ancora caricato.')+'</div>'+(S.readOnly||!canEdit("clients")?'':'<button type="button" class="addcli" data-addcli="1">+ Aggiungi «'+esc(q.trim())+'» all\'anagrafica clienti</button>');
  box.hidden=false;$("f-client").setAttribute("aria-expanded","true");
}
function pickClient(c){
  formClient={code:c[0],name:c[1]};$("f-client").value=c[1]; // (dalla 2.0 il telefono del cliente non va più nel telefono del referente)
  $("cSug").hidden=true;sugIdx=-1;renderClientInfo();
}
function renderClientInfo(){
  const el=$("cInfo"),v=$("f-client").value.trim();
  if(formClient&&formClient.name===v){const c=S.clients.find(x=>String(x[0])===String(formClient.code));el.className="cinfo ok";el.textContent="Codice "+formClient.code+(c&&c[2]?" · "+c[2]:"")+(c&&c[3]?" · "+c[3]:"")+(c&&c[4]?" · tel. "+c[4]:"");}
  else{el.className="cinfo";el.textContent=v?"Non in elenco: in fatturato il nome andrà nella colonna Cliente, senza codice.":"";}
}
$("f-client").addEventListener("input",()=>{sugIdx=-1;renderSug();renderClientInfo();});
$("f-client").addEventListener("focus",renderSug);
$("f-client").addEventListener("blur",()=>setTimeout(()=>{if(document.activeElement!==$("f-client"))$("cSug").hidden=true;},150));
$("f-client").addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!$("cSug").hidden){e.preventDefault();e.stopPropagation();$("cSug").hidden=true;return;}
  if($("cSug").hidden||!sugList.length)return;
  if(e.key==="ArrowDown"){e.preventDefault();sugIdx=Math.min(sugList.length-1,sugIdx+1);renderSug();}
  else if(e.key==="ArrowUp"){e.preventDefault();sugIdx=Math.max(0,sugIdx-1);renderSug();}
  else if(e.key==="Enter"&&sugIdx>=0){e.preventDefault();pickClient(sugList[sugIdx]);}
  else if(e.key==="Escape"){e.stopPropagation();$("cSug").hidden=true;}
});
$("cSug").addEventListener("mousedown",e=>{const b=e.target.closest("[data-ci]");if(b){e.preventDefault();pickClient(sugList[+b.dataset.ci]);return;}const a=e.target.closest("[data-addcli]");if(a){e.preventDefault();$("cSug").hidden=true;openClientNew({name:$("f-client").value.trim(),fromBooking:true});}});

// ---------- anagrafica clienti ----------
// Colonne del foglio "clienti" (lette dal file). Se il file non è ancora stato letto, quelle del vostro modello.
const CLI_COLS_DEFAULT=[["A","Codice"],["B","Ragione sociale ( attivita')"],["C","Alias Sara"],["D","Indirizzo (att.)"],["E","Cap"],["F","Citta' (att.)"],["G","Provincia (att.)"],["H","Partita iva"],["I","Codice fiscale"],["J","Alias"],["K","Partita IVA estera"],["L","Telefono"],["M","Fax"],["N","E-mail"],["O","Referente 1° nome"],["P","Referente 1° tel"]].map(([c,h])=>({c,h}));
function cliCols(){return (S.clientCols&&S.clientCols.length?S.clientCols:CLI_COLS_DEFAULT);}
// tipo di campo in base all'intestazione della colonna
function cliKind(h){
  h=String(h||"");
  if(/ragione|denominaz/i.test(h))return "name";
  if(/alias\s*sara/i.test(h))return "aliasSara";
  if(/^alias$/i.test(h.trim()))return "cat";
  if(/indirizzo/i.test(h))return "addr";
  if(/^cap\b/i.test(h))return "cap";
  if(/citt/i.test(h))return "city";
  if(/provincia/i.test(h))return "prov";
  if(/estera/i.test(h))return "pivaEst";
  if(/partita\s*iva/i.test(h))return "piva";
  if(/codice\s*fiscale/i.test(h))return "cf";
  if(/\bpec\b/i.test(h))return "pec";
  if(/mail/i.test(h))return "mail";
  if(/sdi|univoco/i.test(h))return "sdi";
  if(/referente.*nome/i.test(h))return "ref";
  if(/tel|cell|fax/i.test(h))return "tel";
  return "text";
}
const CLI_LABEL={name:"Ragione sociale",aliasSara:"Alias Sara",cat:"Alias (categoria)",addr:"Indirizzo",cap:"CAP",city:"Città",prov:"Provincia",piva:"Partita IVA",cf:"Codice fiscale",pivaEst:"Partita IVA estera",mail:"E-mail",sdi:"Codice univoco (SDI)",pec:"PEC",ref:"Referente 1° nome"};
function cliLabel(col){const k=cliKind(col.h);if(col.c==="A")return "Codice Multi";if(k==="tel")return col.h.replace(/\s*\(.*?\)\s*/g,"").trim();return CLI_LABEL[k]||col.h;}
const idNorm=t=>String(t==null?"":t).toUpperCase().replace(/[^A-Z0-9]/g,"").replace(/^IT(?=\d{11}$)/,"");
function cliRow(c){ // valori completi del cliente, allineati alle colonne
  if(Array.isArray(c[8]))return c[8];
  const o={A:c[0],B:c[1],C:c[2],F:c[3],L:c[4],H:c[5],O:c[6],P:c[7]};
  return cliCols().map(x=>o[x.c]!=null?String(o[x.c]):"");
}
function cliField(c,kind){const cols=cliCols(),i=cols.findIndex(x=>cliKind(x.h)===kind);return i<0?"":(cliRow(c)[i]||"");}
function cliHay(c){return c._h||(c._h=norm(cliRow(c).join(" ")+" "+c.slice(0,8).join(" ")));}
function nextClientCode(){
  let m=0;for(const c of S.clients)if(typeof c[0]==="number"&&c[0]>m)m=c[0];
  for(const p of STORE.pendingClients){if(p.kind==="edit")continue;const n=p.vals&&p.vals.A&&p.vals.A.n;if(n>m)m=n;else if(!n)m++;}
  return m+1;
}

let cliShown=150,cliOpenCode=null;
function openClients(q){
  $("ovClients").hidden=false;cliShown=150;cliOpenCode=null;
  if(q!=null)$("cliQ").value=q;
  renderClients();setTimeout(()=>$("cliQ").focus(),30);
}
function cliMark(t,words){
  t=String(t==null?"":t);const ws=words.filter(w=>w.length>=2);
  if(!ws.length||!t)return esc(t);
  // posizioni da evidenziare (senza badare ad accenti e maiuscole), poi si converte in HTML pezzo per pezzo
  const low=norm(t),hit=new Array(t.length).fill(false);
  if(low.length===t.length)for(const w of ws){let i=low.indexOf(w);while(i>=0){for(let k=i;k<i+w.length;k++)hit[k]=true;i=low.indexOf(w,i+w.length);}}
  let h="",on=false;
  for(let i=0;i<t.length;i++){if(hit[i]!==on){h+=on?"</mark>":"<mark>";on=hit[i];}h+=esc(t[i]);}
  return h+(on?"</mark>":"");
}
function renderClients(){
  const q=norm($("cliQ").value).trim(),words=q.split(/\s+/).filter(Boolean);
  const all=S.clients;
  let list=q?all.filter(c=>words.every(w=>cliHay(c).includes(w))):all.slice();
  if(q){const starts=c=>norm(c[1]).startsWith(q)||norm(c[2]).startsWith(q)||String(c[0])===q?0:1;list.sort((a,b)=>starts(a)-starts(b)||String(a[1]).localeCompare(String(b[1]),"it"));}
  else list.sort((a,b)=>(typeof b[0]==="number"?b[0]:0)-(typeof a[0]==="number"?a[0]:0)); // senza ricerca: i più recenti in cima
  $("cliCount").textContent=all.length?all.length.toLocaleString("it-IT")+" clienti":"";
  $("cliNote").textContent=q?(list.length?list.length.toLocaleString("it-IT")+" trovati":""):(all.length?"In cima i clienti aggiunti per ultimi.":"");
  // clienti in attesa di essere scritti nel fatturato
  const pend=STORE.pendingClients;
  $("cliPending").hidden=!pend.length;
  $("cliNew").hidden=S.readOnly||!canEdit("clients");
  $("cliPending").innerHTML=pend.map(p=>p.kind==="edit"?(p.failed?'<div class="err">⚠️ Modifiche a <b>'+esc(p.name||"")+'</b> non scritte nel fatturato: '+esc(cliErrText(p))+'. <button type="button" class="linkbtn" data-cli-retry="'+esc(p.tmp)+'">Riprova</button> · <button type="button" class="linkbtn" data-cli-cancel="'+esc(p.tmp)+'">Annulla</button></div>':'<div>⏳ Modifiche a <b>'+esc(p.name||"")+'</b> — '+(navigator.onLine?"in scrittura nel file fatturato…":"saranno scritte nel file fatturato appena torna la connessione")+' <button type="button" class="linkbtn" data-cli-cancel="'+esc(p.tmp)+'">Annulla</button></div>'):p.failed?'<div class="err">⚠️ <b>'+esc(p.name||"")+'</b> — non scritto nel fatturato: '+esc(cliErrText(p))+'. '+(p.failed==="codeexists"?'<button type="button" class="linkbtn" data-cli-fix="'+esc(p.tmp)+'">Correggi</button>':'<button type="button" class="linkbtn" data-cli-retry="'+esc(p.tmp)+'">Riprova</button>')+' · <button type="button" class="linkbtn" data-cli-cancel="'+esc(p.tmp)+'">Annulla</button></div>':'<div>⏳ <b>'+esc(p.name||"")+'</b> — '+(navigator.onLine?"in scrittura nel file fatturato…":"sarà scritto nel file fatturato appena torna la connessione")+' <button type="button" class="linkbtn" data-cli-cancel="'+esc(p.tmp)+'">Annulla</button></div>').join("");
  if(!all.length){$("cliList").innerHTML='<div class="cli-empty">Elenco clienti non ancora caricato: collega il file fatturato (Menu › Collega file fatturato) e attendi qualche secondo.</div>';return;}
  if(!list.length){$("cliList").innerHTML='<div class="cli-empty">Nessun cliente trovato per «'+esc($("cliQ").value.trim())+'».<br><br><button type="button" class="btn primary" data-cli-new="1">+ Aggiungi «'+esc($("cliQ").value.trim())+'» come nuovo cliente</button></div>';return;}
  const cols=cliCols();
  let h="";
  for(const c of list.slice(0,cliShown)){
    const row=cliRow(c),open=String(c[0])===String(cliOpenCode);
    const piva=cliField(c,"piva"),cf=cliField(c,"cf"),city=cliField(c,"city"),prov=cliField(c,"prov"),mail=cliField(c,"mail");
    h+='<button type="button" class="cli-row" role="listitem" data-cli="'+esc(c[0])+'" aria-expanded="'+open+'">'+
      '<span class="cd">'+cliMark(String(c[0]),words)+'</span>'+
      '<span class="nm"><b>'+cliMark(c[1],words)+'</b></span>'+
      '<span>'+cliMark(city+(prov?" ("+prov+")":""),words)+'</span>'+
      '<span>'+cliMark(piva||cf,words)+'</span>'+
      '<span>'+cliMark(c[4]||"",words)+'</span>'+
      '<span>'+cliMark(mail,words)+'</span>'+
      '<span class="al">'+cliMark(c[2]||"",words)+'</span></button>';
    if(open){
      h+='<div class="cli-det"><dl>'+cols.map((x,i)=>'<div><dt>'+esc(cliLabel(x))+'</dt><dd'+(row[i]?'':' class="none"')+'>'+(row[i]?esc(row[i]):"—")+'</dd></div>').join("")+'</dl>'+
        (S.readOnly?'':'<div class="cli-acts">'+(canEdit("clients")?'<button type="button" class="btn" data-cli-edit="'+esc(c[0])+'">Modifica dati</button>':'')+'<button type="button" class="btn primary" data-cli-book="'+esc(c[0])+'">Nuova prenotazione per questo cliente</button></div>')+'</div>';
    }
  }
  if(list.length>cliShown)h+='<button type="button" class="cli-more" data-cli-more="1">Mostra altri ('+(list.length-cliShown).toLocaleString("it-IT")+')</button>';
  $("cliList").innerHTML=h;
}
// (il pulsante Clienti è nell'Archivio)
$("cliClose").onclick=()=>{$("ovClients").hidden=true;};
backdropClose($("ovClients"),()=>{$("ovClients").hidden=true;});backdropClose($("ovClientNew"),()=>closeClientNew());
$("cliQ").addEventListener("input",()=>{cliShown=150;cliOpenCode=null;renderClients();});
$("cliPending").addEventListener("click",e=>{
  const c=e.target.closest("[data-cli-cancel]");if(c){STORE.cancelClient(c.dataset.cliCancel);delete cnWaiting[c.dataset.cliCancel];renderClients();return;}
  const r=e.target.closest("[data-cli-retry]");if(r){STORE.retryClient(r.dataset.cliRetry);renderClients();}
});
$("cliList").addEventListener("click",e=>{
  const more=e.target.closest("[data-cli-more]");if(more){cliShown+=300;renderClients();return;}
  const nw=e.target.closest("[data-cli-new]");if(nw){openClientNew({name:$("cliQ").value.trim()});return;}
  const ce=e.target.closest("[data-cli-edit]");if(ce){const c=clientByCode(ce.dataset.cliEdit);if(c)openClientNew({edit:c});return;}
  const bk=e.target.closest("[data-cli-book]");
  if(bk){const c=clientByCode(bk.dataset.cliBook);$("ovClients").hidden=true;openForm({});if(c)pickClient(c);return;}
  const r=e.target.closest("[data-cli]");if(r){cliOpenCode=String(cliOpenCode)===r.dataset.cli?null:r.dataset.cli;renderClients();}
});
$("cliNew").onclick=()=>openClientNew({name:""});
// motivo per cui un cliente non è stato scritto (q = elemento della coda con q.failed)
function cliErrText(q){
  const f=q&&q.failed,i=(q&&q.failInfo)||{};
  if(f==="nocode")return "nel file non trovo più il cliente con codice "+(q.code||"");
  return f==="codeexists"?"il codice Multi "+i.num+" nel file è già di «"+(i.by||"")+"»":f==="noclienti"?"nel file non trovo il foglio «clienti»":f==="noname"?"manca la ragione sociale":"errore nel file";
}
// codice Multi già usato: si riapre il modulo compilato per cambiare il codice
$("cliPending").addEventListener("click",e=>{
  const fx=e.target.closest("[data-cli-fix]");
  if(fx){const p=STORE.pendingClients.find(x=>x.tmp===fx.dataset.cliFix);if(p)openClientNew({prefill:p});}
});

// --- nuovo cliente ---
let cnFromBooking=false,cnReplacing=null,cnEditing=null;
function openClientNew(o){
  o=o||{};cnFromBooking=!!o.fromBooking;
  if(S.readOnly){toast("Hai accesso in sola lettura.");return;}
  if(!canEdit("clients")){toast("Il Master non ha abilitato le modifiche all'anagrafica clienti.");return;}
  const ed=o.edit||null;cnEditing=ed?{code:ed[0],name:ed[1],row:cliRow(ed)}:null;
  const files=STORE.fatFiles(),ys=Object.keys(files).filter(k=>k!=="*").sort(),y=String(new Date().getFullYear());
  const f=files[y]||files[ys[ys.length-1]]||files["*"];
  $("cnTitle").textContent=ed?"Modifica cliente · Cod. "+ed[0]:"Nuovo cliente";$("cnSave").textContent=ed?"Salva le modifiche":"Salva nel fatturato";
  $("cnHint").innerHTML=ed&&f?'Le modifiche vanno nella riga del cliente nel foglio <b>clienti</b> di <b>'+esc(f.name)+'</b>. Il codice Multi non si cambia. Se nel frattempo qualcuno cambia lo stesso dato nel file Excel, resta quello del file.':f?'Viene aggiunto in fondo al foglio <b>clienti</b> di <b>'+esc(f.name)+'</b>, con il codice Multi che scrivi qui sotto.':'<span style="color:var(--warn)">Prima collega il file fatturato (Menu › Collega file fatturato): è lì che viene scritto il cliente.</span>';
  const cats=[...new Set(S.clients.map(c=>cliField(c,"cat")).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"it"));
  $("dlCat").innerHTML=cats.map(x=>'<option value="'+esc(x)+'">').join("");
  // campi: Codice Multi, poi le colonne del foglio clienti; se manca la colonna del codice univoco la aggiunge l'app
  const cols=cliCols().filter(x=>x.c!=="A"),fields=[{c:"A",h:"Codice"}];
  const hasSdi=cols.some(x=>cliKind(x.h)==="sdi");
  for(const x of cols){fields.push(x);if(!hasSdi&&cliKind(x.h)==="cf")fields.push({c:"_SDI",h:"Codice univoco"});}
  if(!hasSdi&&!fields.some(x=>x.c==="_SDI"))fields.push({c:"_SDI",h:"Codice univoco"});
  $("cnFields").innerHTML=fields.map(x=>{
    const k=x.c==="A"?"code":cliKind(x.h),id="cn-"+x.c,full=k==="name"||k==="addr";
    const at=k==="code"?' inputmode="numeric" maxlength="7" required':k==="cap"?' inputmode="numeric" maxlength="5"':k==="prov"?' maxlength="2" class="up"':k==="city"||k==="cf"?' class="up"':k==="piva"?' maxlength="20"':k==="mail"||k==="pec"?' type="email"':k==="sdi"?' maxlength="7" class="up"':k==="tel"?' type="tel" inputmode="tel"':k==="cat"?' list="dlCat"':'';
    const ph=k==="name"?' placeholder="Es. Istituto Comprensivo Vittorini"':k==="aliasSara"?' placeholder="Nome breve usato in agenda"':k==="cat"?' placeholder="Es. scuole pubbliche, agenzie viaggi sicilia…"':k==="cap"?' placeholder="97100"':k==="prov"?' placeholder="RG"':k==="sdi"?' placeholder="7 caratteri, es. M5UXCR1"':'';
    const sub=k==="code"?(ed?'':'<span class="sub">Proposto il primo libero: cambialo se in Multi il cliente ha un altro codice.</span>'):x.c==="_SDI"?'<span class="sub">Nel foglio clienti non c\'è ancora questa colonna: la aggiunge l\'app in fondo alla tabella.</span>':'';
    return '<div class="f'+(full?" full":"")+'"><label for="'+id+'">'+esc(x.c==="A"?"Codice Multi":x.c==="_SDI"?"Codice univoco (SDI)":cliLabel(x))+(k==="name"||k==="code"?" *":"")+'</label><input id="'+id+'" data-col="'+x.c+'" data-kind="'+k+'"'+at+ph+' autocomplete="off">'+sub+'</div>';
  }).join("");
  $("cn-A").value=o.prefill?"":nextClientCode();$("cn-A").readOnly=!!ed;
  if(ed){const cs=cliCols(),row=cliRow(ed);$("cn-A").value=ed[0];for(let i=0;i<cs.length;i++){const el=$("cn-"+cs[i].c);if(el&&cs[i].c!=="A")el.value=row[i]||"";}}
  if(o.prefill&&o.prefill.vals)for(const c in o.prefill.vals){const el=$("cn-"+c);const v=o.prefill.vals[c];if(el&&v)el.value=v.t!=null?v.t:v.n;}
  cnReplacing=o.prefill?o.prefill.tmp:null;
  const nameCol=cliCols().find(x=>cliKind(x.h)==="name");
  if(nameCol&&o.name)$("cn-"+nameCol.c).value=o.name;
  $("cnWarns").innerHTML="";$("cnSave").disabled=!f;
  $("ovClientNew").hidden=false;cnOrig=JSON.stringify(cnRead());if(cnEditing)cnEditing.start=cnRead();
  setTimeout(()=>{const el=nameCol&&$("cn-"+nameCol.c);if(el){el.focus();el.select();}},30);
}
function cnRead(){
  const out={};
  for(const el of $("cnFields").querySelectorAll("input")){
    let v=cleanText(el.value).replace(/\s+/g," ");const k=el.dataset.kind;
    if(!v)continue;
    if(k==="city"||k==="prov"||k==="cf"||k==="sdi")v=v.toUpperCase().replace(/\s/g,k==="sdi"?"":" ");
    if(k==="piva")v=v.replace(/\s/g,"").toUpperCase();
    out[el.dataset.col]={v,k};
  }
  return out;
}
// controlli: doppioni (bloccano) e formati (solo avvisi)
function cnCheck(){
  const d=cnRead(),w=[],block=[];
  const get=k=>{for(const c in d)if(d[c].k===k)return d[c].v;return "";};
  const name=get("name"),piva=idNorm(get("piva")),cf=idNorm(get("cf")),code=get("code");
  const self=cnEditing?String(cnEditing.code):null,other=c=>String(c[0])!==self;
  if(cnEditing){}
  else if(!/^\d{1,7}$/.test(code)||!+code)block.push("Scrivi il codice Multi (solo numeri).");
  else{
    const used=S.clients.find(c=>String(c[0])===String(+code));
    if(used)block.push('Il codice Multi <b>'+esc(+code)+'</b> è già di <b>'+esc(used[1])+'</b>: usa un altro codice.');
    else if(STORE.pendingClients.some(p=>p.tmp!==cnReplacing&&p.vals&&p.vals.A&&p.vals.A.n===+code))block.push('Il codice Multi <b>'+esc(+code)+'</b> è già usato da un cliente in attesa di essere scritto.');
  }
  const dup=(k,val)=>val&&S.clients.find(c=>other(c)&&(idNorm(cliField(c,k))===val||(k==="cf"&&idNorm(cliField(c,"piva"))===val)));
  const dp=dup("piva",piva)||dup("cf",cf);
  if(dp)block.push('Esiste già un cliente con questa '+(dup("piva",piva)?"partita IVA":"codice fiscale")+': <b>Cod. '+esc(dp[0])+' – '+esc(dp[1])+'</b>.');
  else if(!piva&&!cf&&name){const dn=S.clients.find(c=>other(c)&&norm(c[1]).replace(/[^a-z0-9]+/g," ").trim()===norm(name).replace(/[^a-z0-9]+/g," ").trim());if(dn)block.push('Esiste già un cliente con questo nome: <b>Cod. '+esc(dn[0])+' – '+esc(dn[1])+'</b>. Se è un cliente diverso, inserisci la partita IVA o il codice fiscale.');}
  if(piva&&!/^\d{11}$/.test(piva))w.push("La partita IVA italiana ha 11 cifre.");
  if(cf&&!/^([A-Z0-9]{16}|\d{11})$/.test(cf))w.push("Il codice fiscale ha 16 caratteri (o 11 cifre per le società).");
  const cap=get("cap");if(cap&&!/^\d{5}$/.test(cap))w.push("Il CAP ha 5 cifre.");
  const pr=get("prov");if(pr&&!/^[A-Z]{2}$/.test(pr))w.push("La provincia va scritta con 2 lettere (es. RG).");
  const ml=get("mail");if(ml&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ml))w.push("L'indirizzo e-mail non sembra valido.");
  const sd=get("sdi");if(sd&&!/^[A-Z0-9]{6,7}$/.test(sd))w.push("Il codice univoco ha 7 caratteri (6 per la pubblica amministrazione).");
  $("cnWarns").innerHTML=block.map(x=>'<div>'+x+'</div>').join("")+w.map(x=>'<div class="soft">'+esc(x)+'</div>').join("");
  return {name,block,dup:dp};
}
$("cnFields").addEventListener("input",()=>{if($("cnWarns").innerHTML)cnCheck();});
let cnOrig="";
function closeClientNew(){if(!$("ovClientNew").hidden&&JSON.stringify(cnRead())!==cnOrig&&!confirm(cnEditing?"Chiudere senza salvare le modifiche al cliente?":"Chiudere senza salvare il nuovo cliente?"))return;$("ovClientNew").hidden=true;cnEditing=null;}
$("cnCancel").onclick=closeClientNew;
$("fClient").addEventListener("submit",e=>{
  e.preventDefault();
  const r=cnCheck();
  if(!r.name){$("cnWarns").innerHTML='<div>Scrivi la ragione sociale.</div>';return;}
  if(r.block.length)return;
  if(cnEditing){saveClientEdit(r.name);return;}
  const d=cnRead(),vals={};
  for(const c in d)vals[c]=d[c].k==="code"?{n:Number(d[c].v)}:d[c].k==="cap"&&/^[1-9]\d{4}$/.test(d[c].v)?{n:Number(d[c].v)}:{t:d[c].v};
  if(cnReplacing){STORE.cancelClient(cnReplacing);delete cnWaiting[cnReplacing];cnReplacing=null;}
  const tmp=STORE.addClient(vals,r.name);
  ACC.log("cliente","Nuovo cliente «"+r.name+"»"+(vals.A&&vals.A.n?" (codice Multi "+vals.A.n+")":""));
  cnWaiting[tmp]={name:r.name,fromBooking:cnFromBooking};
  $("ovClientNew").hidden=true;
  if(cnFromBooking){$("f-client").value=r.name;formClient=null;renderClientInfo();}
  toast(navigator.onLine?"Scrivo «"+r.name+"» nel file fatturato…":"Sei offline: «"+r.name+"» sarà scritto nel fatturato appena torna la connessione.");
  if(!$("ovClients").hidden)renderClients();
});
const cnWaiting={};
// modifica di un cliente esistente: si mandano solo i campi cambiati, con il valore di partenza
function saveClientEdit(name){
  const E=cnEditing,now=cnRead(),cs=cliCols(),vals={},base={},ch=[];
  for(const el of $("cnFields").querySelectorAll("input")){
    const col=el.dataset.col;if(col==="A")continue;
    const a=(E.start[col]||{}).v||"",v=(now[col]||{}).v||"";if(a===v)continue;
    const i=cs.findIndex(x=>x.c===col),was=i>=0?String(E.row[i]||""):"";
    vals[col]=v===""?null:el.dataset.kind==="cap"&&/^[1-9]\d{4}$/.test(v)?{n:Number(v)}:{t:v};base[col]=was;
    ch.push([col==="_SDI"?"Codice univoco (SDI)":cliLabel(cs[i]||{c:col,h:col}),was,v||"(vuoto)"]);
  }
  $("ovClientNew").hidden=true;cnEditing=null;
  if(!ch.length){toast("Nessuna modifica da salvare.");return;}
  STORE.editClient(E.code,vals,base,name||E.name);
  ACC.log("cliente","Modificato il cliente «"+(name||E.name)+"» (codice "+E.code+")",{ch});
  toast(navigator.onLine?"Scrivo le modifiche di «"+(name||E.name)+"» nel file fatturato…":"Sei offline: le modifiche saranno scritte appena torna la connessione.");
  if(!$("ovClients").hidden)renderClients();
}
function onClientEdited(q,x){
  refreshFromStore();
  if(x.conflicts&&x.conflicts.length)notify("Cliente «"+(q.name||"")+"»: "+x.conflicts.join(", ")+(x.conflicts.length>1?" erano stati cambiati":" era stato cambiato")+" anche nel file fatturato: lì è rimasto il valore del file. Controlla la scheda del cliente.",true);
  else toast("Modifiche a «"+(q.name||"")+"» salvate nel fatturato.");
  if(!$("ovClients").hidden){cliOpenCode=String(q.code);renderClients();}
}
function onClientAdded(tmp,info){
  const w=cnWaiting[tmp];delete cnWaiting[tmp];
  refreshFromStore();
  toast(info.existed?"«"+(info.name||"")+"» c'era già nel fatturato: codice "+info.code+".":"Cliente salvato nel fatturato con codice "+info.code+".");
  // se lo stavi inserendo da una prenotazione, la prenotazione prende subito il codice
  if(w&&w.fromBooking&&!$("ovBooking").hidden&&$("f-client").value.trim()===w.name){const c=clientByCode(info.code);if(c)pickClient(c);}
  if(!$("ovClients").hidden){cliOpenCode=String(info.code);renderClients();}
}

$("fBooking").addEventListener("input",e=>{if(e.target.name==="type")syncType();checkWarns();if(!$("fEditAsk").hidden){$("fEditAsk").hidden=true;openSheetAfterSave=false;}}); // cambi ancora qualcosa: l'elenco delle modifiche si rifà al prossimo «Salva»
$("fBooking").addEventListener("change",checkWarns);
$("fBooking").addEventListener("submit",async e=>{
  e.preventDefault();
  if(S.readOnly||saving||$("ovBooking").hidden)return; // niente doppi invii (doppio clic, Invio ripetuto)
  // Il modulo ha "novalidate" perché gli orari vanno a passi di 15 minuti ma si possono anche scrivere a mano
  // (07:40): i controlli del browser su numeri, date e orari scritti male o a metà si fanno qui.
  for(const el of e.target.elements){
    const v=el.validity;if(!v||v.valid||el.disabled||!el.willValidate||el.offsetParent===null)continue;
    if(el.type==="time"&&!v.badInput)continue;
    $("fEditAsk").hidden=true;editConfirmed=false;openSheetAfterSave=false;el.reportValidity();return;
  }
  const b=readForm();
  if(!b.start){openSheetAfterSave=false;toast("Inserisci la data.");return;}
  if(!validDate(b.start)||!validDate(b.end)){openSheetAfterSave=false;checkWarns();toast("Controlla la data: l'anno deve essere tra 2000 e 2099.");return;}
  if(b.end<b.start||diff(b.start,b.end)>30){openSheetAfterSave=false;toast("Controlla la data di rientro.");return;}
  // modifica di una prenotazione già salvata: prima si chiede conferma, con l'elenco delle modifiche
  if(editing&&!editConfirmed){
    const ch=formChanges().filter(k=>FIELD_LBL[k]);
    if(!ch.length){
      const want=openSheetAfterSave,cur=bookingsAll().find(x=>x.id===editing.id);openSheetAfterSave=false;
      closeForm();if(want&&cur)openSheetConfirmed(cur);else toast("Nessuna modifica da salvare.");
      return;
    }
    $("fEditList").innerHTML=ch.map(k=>'<li><b>'+esc(FIELD_LBL[k])+'</b>: '+esc(logVal(k,formOrig[k]))+' → '+esc(logVal(k,b[k]))+'</li>').join("");
    $("fEditAsk").hidden=false;$("fCloseAsk").hidden=true;$("fConfirm").hidden=true;setTimeout(()=>$("fEditYes").focus(),30);
    return;
  }
  editConfirmed=false;$("fEditAsk").hidden=true;
  withOldNotes(b);
  // il segno «inviato all'autista» non è nel modulo: si porta dietro com'è (anche se il servizio cambia giorno)
  let bossEdit=false;
  if(editing){const cur=bookingsAll().find(x=>x.id===editing.id);if(cur&&cur.sent)b.sent=cur.sent;
    // scelta del capo: il segno resta; bus e autisti restano i suoi (li cambia solo il Super Master)
    if(cur&&cur.capo){b.capo=cur.capo;if(isSuper())bossEdit=true;else{b.vehicle=cur.vehicle;b.driver=cur.driver||"";b.driver2=cur.driver2||"";}}}
  const id=editing?editing.id:("b"+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
  const old=editing&&editing.start,moved=!!(old&&old!==b.start);
  // per le modifiche: versione di partenza e campi cambiati, così non si cancellano le modifiche fatte da altri nel frattempo
  const meta=editing?{edit:true,base:editing.base,patch:withOldNoteKeys(formChanges())}:{};
  if(bossEdit)meta.boss=true;
  const who=meName();
  if(editing){b.by=editing.by;b.byAt=editing.byAt;b.updBy=who;if(meta.patch.length)meta.patch.push("updBy");}
  else{b.by=who;b.byAt=b.updatedAt;}
  const logCh=editing?meta.patch.filter(k=>FIELD_LBL[k]).map(k=>[FIELD_LBL[k],logVal(k,formOrig[k]),logVal(k,b[k])]):null;
  saving=true;$("fSave").disabled=true;$("fSheet").disabled=true;
  try{
    // n. foglio: AAMMGG + progressivo del giorno del servizio; resta fisso finché il servizio non cambia giorno
    let foglio=editing?editing.foglio:"",seqPatch={};
    if(!foglio||moved){const n=await nextSeq(b.start);foglio=yymmdd(b.start)+pad(n);seqPatch={assign:true};}
    b.foglio=foglio;
    if(moved)writeDayOps(old,{bookings:{[id]:null}},{move:b.start,know:knowOf(bookingsAll().find(x=>x.id===id))});
    writeDayOps(b.start,Object.assign({bookings:{[id]:b}},seqPatch),Object.assign({},meta,moved?{move:true}:{}));
    if(!editing)ACC.log("prenotazione","Nuova prenotazione "+bookingLabel(b),{id});
    else if(logCh.length)ACC.log("prenotazione","Modificata la prenotazione "+bookingLabel(b),{id,ch:logCh});
    regAutoAdd(b);
    const wantSheet=openSheetAfterSave;
    closeForm();try{document.activeElement&&document.activeElement.blur&&document.activeElement.blur();}catch(_){}
    S.sel=b.start;if(mkey(b.start)!==subMonth)subscribe();renderAll();toast("Prenotazione salvata");
    if(wantSheet)openSheetConfirmed(Object.assign({},b,{id:id}));
  }catch(err){handleErr(err);}finally{saving=false;$("fSave").disabled=false;$("fSheet").disabled=false;openSheetAfterSave=false;}
});
$("fCancel").onclick=tryCloseForm;
$("fEditYes").onclick=()=>{editConfirmed=true;$("fEditAsk").hidden=true;$("fBooking").requestSubmit();};
$("fEditNo").onclick=()=>{$("fEditAsk").hidden=true;editConfirmed=false;openSheetAfterSave=false;};
$("fCloseYes").onclick=closeForm;
$("fCloseNo").onclick=()=>{$("fCloseAsk").hidden=true;};
$("fDelete").onclick=()=>{$("fConfirm").hidden=false;$("fDelete").hidden=true;};
$("fDeleteNo").onclick=()=>{$("fConfirm").hidden=true;$("fDelete").hidden=false;};
$("fDeleteYes").onclick=async()=>{
  if(!editing)return;
  try{const gone=bookingsAll().find(x=>x.id===editing.id);
    const del=Object.assign({},formOrig||{},{foglio:editing.foglio,start:editing.start});writeDayOps(editing.start,{bookings:{[editing.id]:null}},{client:cleanText($("f-client").value),know:knowOf(gone)});ACC.log("prenotazione","Eliminata la prenotazione "+bookingLabel(del),{id:editing.id});closeForm();renderAll();toast("Prenotazione eliminata");
    withdrawAfterDelete(gone);}catch(err){handleErr(err);}
};

// ---------- flotta ----------
function openFleet(){
  const T=S.regole.targhe||{},N=S.regole.numeri||{};
  const cats=[...new Set(XCATS.concat(Object.keys(T)).concat(S.fleet.map(xcatOf)))].sort((a,b)=>(parseInt(a.replace(/\D/g,""),10)||0)-(parseInt(b.replace(/\D/g,""),10)||0));
  $("dlPlates").innerHTML=cats.map(c=>'<datalist id="pl'+esc(c)+'">'+(T[c]||[]).map(t=>'<option value="'+esc(t)+'">'+(N[t]?"n. "+esc(N[t]):"")+'</option>').join("")+'</datalist>').join("");
  fleetOpen={};S.fleet.forEach(v=>{fleetOpen[v.id]={name:v.name,seats:v.seats||null,plate:v.plate||"",xcat:xcatOf(v),num:v.num==null?"":String(v.num)};});
  $("fleetList").innerHTML=S.fleet.map((v,i)=>{const xc=xcatOf(v);return '<div class="fleet-row" data-id="'+esc(v.id)+'"><input id="fl-n-'+i+'" value="'+esc(v.name)+'" aria-label="Nome"><input id="fl-s-'+i+'" type="number" min="1" value="'+(v.seats||"")+'" aria-label="Posti"><select id="fl-x-'+i+'" aria-label="Mezzo (Excel)">'+cats.map(c=>'<option'+(c===xc?' selected':'')+'>'+esc(c)+'</option>').join("")+'</select><input id="fl-p-'+i+'" list="pl'+esc(xc)+'" value="'+esc(v.plate||"")+'" placeholder="Targa" aria-label="Targa" autocomplete="off"><input id="fl-i-'+i+'" value="'+esc(v.num==null?"":v.num)+'" placeholder="ID" aria-label="ID mezzo" autocomplete="off"></div>';}).join("");
  const ro=!canEdit("fleet");$("fFleet").classList.toggle("fleet-ro",ro);$("fleetRo").hidden=!ro;$("flSave").hidden=ro;
  $("fleetList").querySelectorAll("input,select").forEach(el=>{el.readOnly=ro;if(el.tagName==="SELECT")el.disabled=ro;});
  $("ovFleet").hidden=false;
}
let fleetOpen=null;
// (la Flotta è nell'Archivio)
$("fleetList").addEventListener("change",e=>{const m=/^fl-x-(\d+)$/.exec(e.target.id);if(m)$("fl-p-"+m[1]).setAttribute("list","pl"+e.target.value);});
$("flCancel").onclick=()=>$("ovFleet").hidden=true;
// Ogni riga è legata al suo mezzo (data-id), non alla posizione nell'elenco. Si salvano solo i campi
// cambiati, sull'ultima versione della flotta in Dropbox: le modifiche fatte intanto da altri restano.
$("fFleet").addEventListener("submit",async e=>{
  e.preventDefault();if(S.readOnly||!fleetOpen||!canEdit("fleet")){$("ovFleet").hidden=true;return;}
  if(!navigator.onLine){toast("Per modificare la flotta serve la connessione a internet.");return;}
  const patches={};
  for(const row of $("fleetList").querySelectorAll(".fleet-row")){
    const id=row.dataset.id,o=fleetOpen[id];if(!o)continue;
    const inp=row.querySelectorAll("input"),sel=row.querySelector("select");
    const now={name:cleanText(inp[0].value)||o.name,seats:inp[1].value?Number(inp[1].value):null,plate:cleanText(inp[2].value).toUpperCase(),xcat:sel.value,num:cleanText(inp[3].value)};
    const p={};for(const k in now)if(JSON.stringify(now[k])!==JSON.stringify(o[k]))p[k]=now[k];
    if(Object.keys(p).length)patches[id]=p;
  }
  if(!Object.keys(patches).length){$("ovFleet").hidden=true;return;}
  const btn=$("fFleet").querySelector('button[type="submit"]');btn.disabled=true;
  try{
    const vs=await STORE.patchFleet(patches,S.fleet.map(v=>Object.assign({},v,{xcat:xcatOf(v)})));
    const fch=[];for(const id in patches){const o=fleetOpen[id]||{};for(const k in patches[id])fch.push([(o.name||id)+" – "+({name:"nome",seats:"posti",plate:"targa",xcat:"mezzo Excel",num:"ID mezzo"}[k]||k),o[k]==null?"":String(o[k]),String(patches[id][k]==null?"":patches[id][k])]);}
    ACC.log("impostazioni","Modificata la flotta",{ch:fch});
    S.fleet=sortFleet(vs);$("ovFleet").hidden=true;fleetOpen=null;renderAll();toast("Flotta aggiornata");
  }catch(err){toast(err&&err.code==="offline"?"Per modificare la flotta serve la connessione a internet.":"Non riesco a salvare la flotta adesso. Riprova tra poco.");}
  finally{btn.disabled=false;}
});

// ---------- autisti extra ----------
let exTimer=null,exDate=null;const exBase={};
// exBase: il testo da cui si è partiti. Se nel frattempo un altro dispositivo scrive, i due testi vengono uniti.
async function saveExtra(){
  clearTimeout(exTimer);exTimer=null;const date=exDate,val=cleanText($("extraText").value,true);
  if(!date||S.readOnly)return;
  const cur=(S.days[date]&&S.days[date].extra)||"";if(cur===val)return;
  const base=date in exBase?exBase[date]:cur;
  $("extraSaved").textContent="Salvataggio…";
  try{writeDayOps(date,{extra:val,base:base});exBase[date]=val;$("extraSaved").textContent="Salvato";logExtra(date,val);}catch(err){$("extraSaved").textContent="";handleErr(err);}
}
$("extraText").addEventListener("focus",()=>{exBase[S.sel]=(S.days[S.sel]&&S.days[S.sel].extra)||"";});
$("extraText").addEventListener("input",()=>{exDate=S.sel;if(!(S.sel in exBase))exBase[S.sel]=(S.days[S.sel]&&S.days[S.sel].extra)||"";$("extraSaved").textContent="";clearTimeout(exTimer);exTimer=setTimeout(saveExtra,800);});
$("extraText").addEventListener("blur",()=>{if(exTimer)saveExtra();});

// ---------- navigazione ----------
function go(date){if(exTimer)saveExtra();$("extraSaved").textContent="";S.sel=date;if(mkey(date)!==subMonth)subscribe();renderAll();}
function setView(v){S.view=v;["day","week","month","bill"].forEach(k=>{const id={day:"vDay",week:"vWeek",month:"vMonth",bill:"vBill"}[k];$(id).setAttribute("aria-pressed",v===k);$(k+"View").hidden=v!==k;});try{localStorage.setItem("agenda-view",v);}catch(_){}renderAll();}
$("vDay").onclick=()=>setView("day");
$("vWeek").onclick=()=>setView("week");
$("wsign").addEventListener("click",e=>{if(e.target.id==="wPrev")go(addDays(S.sel,-7));if(e.target.id==="wNext")go(addDays(S.sel,7));});
$("wgrid").addEventListener("click",e=>{
  const ed=e.target.closest("[data-edit]");
  if(ed){const b=bookingsAll().find(x=>x.id===ed.dataset.edit&&x.start===ed.dataset.start);if(b)openForm({booking:b});return;}
  const g=e.target.closest("[data-goday]");if(g){S.sel=g.dataset.goday;setView("day");return;}
  const c=e.target.closest("[data-addv]");
  if(c){if(S.readOnly){toast("Accesso in sola lettura");return;}openForm({vehicle:c.dataset.addv,date:c.dataset.addd});}
});
$("vMonth").onclick=()=>setView("month");
$("vBill").onclick=()=>setView("bill");
$("btnToday").onclick=()=>go(todayISO());
$("btnNew").onclick=()=>{if(S.readOnly){toast("Accesso in sola lettura");return;}openForm({date:S.sel});};
$("mPrev").onclick=()=>go(shiftMonth(mkey(S.sel),-1)+"-01");
$("mNext").onclick=()=>go(shiftMonth(mkey(S.sel),1)+"-01");
$("msign").addEventListener("click",e=>{if(e.target.id==="msPrev")$("mPrev").click();if(e.target.id==="msNext")$("mNext").click();});
$("strip").addEventListener("click",e=>{
  if(e.target.closest("#cntToggle")){cntOpen=!cntOpen;try{localStorage.setItem("agenda-conteggi",cntOpen?"1":"0");}catch(_){}renderStrip();const tg=$("cntToggle");if(tg)tg.focus();return;}
  const b=e.target.closest("[data-day]");if(b)go(b.dataset.day);});
$("sign").addEventListener("click",e=>{if(e.target.id==="dPrev")go(addDays(S.sel,-1));if(e.target.id==="dNext")go(addDays(S.sel,1));});
$("sheet").addEventListener("click",e=>{
  const a=e.target.closest("[data-add]");if(a){openForm({vehicle:a.dataset.add,date:S.sel});return;}
  const cf=e.target.closest("[data-conf]");if(cf){toggleConfirm(cf.dataset.conf,cf.dataset.start);return;}
  const sn=e.target.closest("[data-sent]");if(sn){const b=bookingsAll().find(x=>x.id===sn.dataset.sent&&x.start===sn.dataset.start);if(b)openSheet(b);return;}
  const ed=e.target.closest("[data-edit]");
  if(ed){const b=bookingsAll().find(x=>x.id===ed.dataset.edit&&x.start===ed.dataset.start);if(b)openForm({booking:b});}
});
$("mgrid").addEventListener("click",e=>{const c=e.target.closest("[data-day]");if(c){S.sel=c.dataset.day;setView("day");}});
document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;
  if(!$("ovCapo").hidden){$("cpCancel").click();return;}
  if(!$("ovQr").hidden){$("qrClose").click();return;}
  if(!$("ovSpese").hidden){$("spClose").click();return;}
  if(!$("ovClientNew").hidden){closeClientNew();return;}
  if(!$("ovClients").hidden){$("ovClients").hidden=true;return;}
  if(!$("ovReg").hidden){if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest("#regTable"))document.activeElement.blur();$("ovReg").hidden=true;regKind=null;return;}
  if(!$("ovCont").hidden){closeContab();return;}
  if(!$("ovInv").hidden){closeInvoice();return;}
  if(!$("ovInvList").hidden){$("ovInvList").hidden=true;invPending=null;return;}
  if(!$("ovArch").hidden){$("ovArch").hidden=true;return;}
  if(!$("ovBooking").hidden){if(!$("fCloseAsk").hidden){$("fCloseAsk").hidden=true;return;}tryCloseForm();return;}
  if(!$("ovFleet").hidden)$("ovFleet").hidden=true;$("ovSheet").hidden=true;});
// clic sullo sfondo scuro: chiude solo se il clic è cominciato e finito sullo sfondo
// (non quando si seleziona un testo trascinando e si rilascia il mouse fuori dal riquadro)
function backdropClose(o,fn){let down=null;o.addEventListener("pointerdown",e=>{down=e.target;});o.addEventListener("click",e=>{if(e.target===o&&down===o)fn();down=null;});}
backdropClose($("ovBooking"),tryCloseForm);backdropClose($("ovFleet"),()=>{$("ovFleet").hidden=true;});

// ---------- fatturato ----------
const XL_COLS=(()=>{const a=[];for(let i=1;i<=45;i++){let n=i,s="";while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26);}a.push(s);}return a;})(); // A..AS
function colIdx(c){let n=0;for(const ch of c)n=n*26+ch.charCodeAt(0)-64;return n;}
function excelSerial(d){return Math.round((parse(d)-Date.UTC(1899,11,30))/864e5);}
function itDate(d){return d?d.slice(8,10)+"/"+d.slice(5,7)+"/"+d.slice(0,4):"";}
function money(n){return n===""||n==null?"":Number(n).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});}
function clientByCode(code){return S.clients.find(c=>String(c[0])===String(code));}

function billNote(b){
  const p=[];
  if(b.notes)p.push(b.notes);
  if(b.time)p.push("Partenza "+b.time);
  if(b.time2)p.push("Rientro "+b.time2);
  if(b.pax!==""&&b.pax!=null)p.push(b.pax+" pax");
  if(hasEvent(b.type)&&b.escort)p.push("Accompagnatore: "+b.escort);
  const cl=b.clientCode!==""&&b.clientCode!=null?clientByCode(b.clientCode):null;
  if(b.contactName||(b.contact&&!(cl&&cl[4]===b.contact)))p.push("Ref. "+[b.contactName,b.contact&&!(cl&&cl[4]===b.contact)?b.contact:""].filter(Boolean).join(" "));
  if(b.status==="opzione")p.unshift("IN SOSPESO"); // per primo: nella casella del foglio non deve essere tagliato
  return p.join(" · ");
}
function billItin(b){return hasEvent(b.type)&&b.event?b.event+(b.route?" – "+b.route:""):(b.route||"");}
// una riga del fatturato per prenotazione
function num(x){return x===""||x==null?"":Number(x);}
function billTotal(r){return [r.P,r.Q,r.R].reduce((a,x)=>a+(x===""?0:x),0);}
function billRow(b){
  const v=vehicle(b.vehicle)||{},type=normType(b.type);
  return {foglio:b.foglio,id:b.id,start:b.start,type:type,
    A:Number(b.foglio),B:TYPE_XL[type],C:b.clientCode===""||b.clientCode==null?"":b.clientCode,
    D:b.client||"",G:xcatOf(v),H:(v.plate||"").trim(),I:b.start,J:endOf(b),
    M:billItin(b),O:billNote(b),P:num(b.price),Q:num(b.park),R:num(b.meals),AH:cashOn(b)?num(b.advance):"",AI:cashOn(b)?(b.envelope||""):"",AJ:cashOn(b)?(b.envno||""):"",Z:realDriver(b.driver),AA:realDriver(b.driver2),dz:!realDriver(b.driver),daa:isGen(b.driver2),
    vehicleName:v.name||""};
}
function billRows(days){
  const out=[];
  for(const date in days){const bk=(days[date]||{}).bookings||{};for(const id in bk){const b=bk[id];if(b&&b.foglio)out.push(billRow(Object.assign({},b,{id:id,start:b.start||date})));}}
  return out.sort((a,b)=>String(a.foglio).localeCompare(String(b.foglio)));
}
async function rowsForRange(){
  if($("billRange").value==="all"){
    if(!S.allDays){
      if(db){const snap=await db.collection("days").get();const all={};snap.docs.forEach(d=>{if(d.exists)all[d.id]=d.data();});S.allDays=all;}
      else S.allDays=S.days;
    }
    return billRows(S.allDays);
  }
  const k=mkey(S.sel);return billRows(S.days).filter(r=>mkey(r.start)===k);
}
// avviso se nel foglio "regole" del fatturato manca una delle 4 categorie
function renderTipiWarn(){
  const el=$("tipiWarn"),t=(S.regole.tipi||[]).map(x=>String(x).trim().toLowerCase());
  const miss=t.length?Object.values(TYPE_XL).filter(x=>!t.includes(x)):[];
  el.hidden=!miss.length;
  if(miss.length)el.innerHTML='Nel file fatturato, foglio <b>regole</b>, colonna TIPO SERVIZIO manca'+(miss.length>1?'no':'')+': <b>'+miss.map(esc).join(", ")+'</b>. Aggiungil'+(miss.length>1?'i':'o')+' all\'elenco, così Excel '+(miss.length>1?'li':'lo')+' accetta anche quando modifichi la riga a mano.';
}
// Stato della fattura di un servizio (2.6): «emessa» = il file XML per la contabilità è stato creato.
// todo: da fatturare · draft: c'è una bozza · done: fattura emessa (con la data del file)
function billInvState(b,dr){
  const inv=dr.filter(d=>d.xmlAt&&d.tipo!=="TD04").sort((x,y)=>String(y.xmlAt).localeCompare(String(x.xmlAt))),nc=dr.some(d=>d.xmlAt&&d.tipo==="TD04");
  if(inv.length){const d=inv[0];return {k:"done",t:"Emessa",sub:"XML del "+itD(String(d.xmlAt).slice(0,10))+(nc?" · nota di credito":""),title:d.xmlName||""};}
  if(nc){const d=dr.filter(x=>x.xmlAt&&x.tipo==="TD04").sort((x,y)=>String(y.xmlAt).localeCompare(String(x.xmlAt)))[0];return {k:"done",t:"Nota di credito",sub:"XML del "+itD(String(d.xmlAt).slice(0,10)),title:d.xmlName||""};}
  if(dr.length)return {k:"draft",t:"Bozza",sub:dr.length>1?dr.length+" bozze":"non ancora emessa"};
  const fut=String(b.start||"")>todayISO();
  return {k:"todo",t:"Da fatturare",sub:fut?"servizio non ancora fatto":"",now:!fut&&b.status!=="opzione"};
}
let billFilter="all";
async function renderBill(){
  renderTipiWarn();
  const k=mkey(S.sel),all=$("billRange").value==="all";
  $("billTitle").textContent="Fatturato · "+(all?"tutti i servizi":MN[+k.slice(5,7)-1]+" "+k.slice(0,4));
  let rows;try{rows=await rowsForRange();}catch(err){$("btable").innerHTML='<tbody><tr><td class="empty">Impossibile leggere le prenotazioni. Riprova.</td></tr></tbody>';return;}
  if(S.view!=="bill")return;
  const inv=canInv(),src=bookingsAll().concat(S.allDays?billSourceAll():[]),dmap=inv?draftMap():null;
  if(inv){const ok=new Set(src.map(invKey));for(const k of [...invSel])if(!ok.has(k))invSel.delete(k);}
  renderInvBar();
  // stato della fattura per ogni riga, conteggi e totali per stato
  const st=new Map(),cnt={all:0,todo:0,draft:0,done:0},amt={all:0,todo:0,draft:0,done:0};
  const bmap=new Map(src.map(x=>[invKey(x),x])); // la prenotazione (per lo stato confermato / in sospeso)
  if(inv)for(const r of rows){const s=billInvState(Object.assign({},r,{status:(bmap.get(r.id+"|"+r.start)||{}).status}),dmap.get(r.id)||[]);st.set(r.id+"|"+r.start,s);const t=billTotal(r);cnt.all++;cnt[s.k]++;amt.all+=t;amt[s.k]+=t;}
  const fb=$("billFilter");fb.hidden=!inv||!rows.length;
  if(inv&&!cnt[billFilter]&&billFilter!=="all")billFilter="all";
  if(inv)fb.innerHTML=[["all","Tutti"],["todo","Da fatturare"],["draft","Con bozza"],["done","Emesse"]].map(([f,l])=>'<button type="button" class="bf bf-'+f+'" data-bf="'+f+'" aria-pressed="'+(billFilter===f)+'"'+(cnt[f]||f==="all"?"":" disabled")+'><b>'+l+'</b><span>'+cnt[f]+(cnt[f]===1?" servizio":" servizi")+' · € '+money(amt[f])+'</span></button>').join("")+'<span class="bf-note">«Emessa» vuol dire che il file XML per la contabilità è stato creato.</span>';
  const show=inv&&billFilter!=="all"?rows.filter(r=>(st.get(r.id+"|"+r.start)||{}).k===billFilter):rows;
  const NC=inv?14:12;
  const head='<thead><tr>'+(inv?'<th class="selc" title="Spunta i servizi da mettere in una fattura unica"></th>':"")+'<th>N. foglio</th>'+(inv?'<th>Fattura</th>':"")+'<th>Servizio</th><th>Cliente</th><th>Mezzo</th><th>Date</th><th>Itinerario</th><th>Autisti</th><th class="r">€ Noleggio</th><th class="r">€ Parcheggi</th><th class="r">€ Pasti</th><th class="r">€ Totale</th><th>Anticipo</th><th></th></tr></thead>';
  if(!show.length){$("btable").innerHTML=head+'<tbody><tr><td class="empty" colspan="'+(NC+1)+'">'+(rows.length?"Nessun servizio con questo stato.":"Nessun servizio "+(all?"in agenda":"in questo mese")+".")+'</td></tr></tbody>';return;}
  const sum=k=>show.reduce((a,r)=>a+(r[k]===""?0:r[k]),0),tot=show.reduce((a,r)=>a+billTotal(r),0);
  const spIds=new Set(src.filter(speseFor).map(b=>b.id)); // servizi con busta già inviati all'autista
  const dates=r=>esc(itDate(r.I))+(r.J&&r.J!==r.I?'<span class="sub">al '+esc(itDate(r.J))+'</span>':"");
  const drv=r=>(r.Z?esc(r.Z):r.dz?'<span class="tbdtxt">da assegnare</span>':"—")+(r.AA?'<span class="sub">'+esc(r.AA)+'</span>':r.daa?'<span class="sub tbdtxt">2° da assegnare</span>':"");
  $("btable").innerHTML=head+'<tbody>'+show.map(r=>{
    const c=r.C!==""?clientByCode(r.C):null,key=r.id+"|"+r.start,s=st.get(key);
    const cls=[invSel.has(key)?"sel":"",s&&s.k==="todo"&&s.now?"todo-now":"",s&&s.k==="done"?"inv-done":""].filter(Boolean).join(" ");
    return '<tr data-bid="'+esc(r.id)+'" data-bstart="'+esc(r.start)+'"'+(cls?' class="'+cls+'"':"")+'>'+
      (inv?'<td class="selc"><input type="checkbox" data-invsel="1" aria-label="Seleziona il servizio n. '+esc(r.foglio)+' per una fattura unica"'+(invSel.has(key)?" checked":"")+'></td>':"")+
      '<td class="num"><b>'+esc(r.foglio)+'</b></td>'+
      (inv?'<td><span class="fst fst-'+s.k+'"'+(s.title?' title="'+esc(s.title)+'"':"")+'>'+esc(s.t)+'</span>'+(s.sub?'<span class="sub">'+esc(s.sub)+'</span>':"")+'</td>':"")+
      '<td><span class="tip" style="border-color:var(--'+esc(r.type)+'-fill)">'+esc(r.B)+'</span></td>'+
      '<td class="cli">'+esc(r.D||"—")+(r.C!==""?'<span class="sub">Cod. '+esc(r.C)+(c&&c[2]?' · '+esc(c[2]):'')+'</span>':'<span class="sub miss">senza codice cliente</span>')+'</td>'+
      '<td>'+esc(r.G)+'<span class="sub">'+(r.H?esc(r.H):'<span class="miss">manca targa</span>')+'</span></td>'+
      '<td class="num">'+dates(r)+'</td>'+
      '<td class="iti">'+esc(r.M)+(r.O?'<span class="sub">'+esc(r.O)+'</span>':'')+'</td>'+
      '<td>'+drv(r)+'</td>'+
      '<td class="num r">'+money(r.P)+'</td><td class="num r">'+money(r.Q)+'</td><td class="num r">'+money(r.R)+'</td><td class="num r"><b>'+(r.P===""&&r.Q===""&&r.R===""?"":money(billTotal(r)))+'</b></td>'+
      '<td class="num">'+(r.AH!==""?"€ "+money(r.AH):"")+(r.AI?'<span class="sub">Busta '+esc(r.AI)+(r.AJ?" n. "+esc(r.AJ):"")+'</span>':"")+'</td><td class="acts"><button type="button" class="mini" data-fs="1">Foglio di servizio</button>'+(spIds.has(r.id)?'<button type="button" class="mini" data-sp="1">Spese autista</button>':"")+(inv?'<button type="button" class="mini inv" data-inv="1">Bozza Fattura</button>':"")+'</td></tr>';
  }).join("")+'</tbody><tfoot><tr><td colspan="'+(inv?9:7)+'">'+show.length+' servizi'+(inv&&billFilter!=="all"?" ("+({todo:"da fatturare",draft:"con bozza",done:"emesse"}[billFilter])+")":"")+'</td><td class="num r">'+money(sum("P"))+'</td><td class="num r">'+money(sum("Q"))+'</td><td class="num r">'+money(sum("R"))+'</td><td class="num r">'+money(tot)+'</td><td class="num">'+(sum("AH")?"€ "+money(sum("AH")):"")+'</td><td></td></tr></tfoot>';
}
$("billFilter").addEventListener("click",e=>{const b=e.target.closest("[data-bf]");if(!b||b.disabled)return;billFilter=b.dataset.bf;renderBill();});
$("btable").addEventListener("click",e=>{const tr=e.target.closest("[data-bid]");if(!tr)return;const b=bookingsAll().concat(S.allDays?billSourceAll():[]).find(x=>x.id===tr.dataset.bid&&x.start===tr.dataset.bstart);if(!b)return;
  const cb=e.target.closest("[data-invsel]");
  if(cb||e.target.closest("td.selc")){ // casella per la fattura unica: non apre la prenotazione
    const box=cb||tr.querySelector("[data-invsel]"),k=invKey(b);if(!cb)box.checked=!box.checked;
    if(box.checked){const cur=invSelBookings()[0];if(cur&&!sameClient(cur,b)){box.checked=false;toast("In una fattura unica vanno servizi dello stesso cliente.");return;}invSel.add(k);}else invSel.delete(k);
    tr.classList.toggle("sel",box.checked);renderInvBar();return;
  }
  if(e.target.closest("[data-inv]"))openInvoice([b]);else if(e.target.closest("[data-fs]"))openSheet(b);else if(e.target.closest("[data-sp]"))openSpese(b);else openForm({booking:b});});
function billSourceAll(){const out=[];for(const date in S.allDays){const bk=(S.allDays[date]||{}).bookings||{};for(const id in bk){const b=bk[id];if(b&&typeof b==="object")out.push(Object.assign({},b,{id:id,start:b.start||date,type:normType(b.type)}));}}return out;}
$("billRange").addEventListener("change",()=>{S.allDays=null;renderBill();});
function billMsg(t,cls){const m=$("billMsg");m.textContent=t;m.className="bill-msg"+(cls?" "+cls:"");}

// --- copia righe (valori, formato italiano) ---
// Incollato in Excel, un testo che comincia con = + - @ (o con tabulazione/a capo) diventerebbe una formula:
// davanti si mette un apostrofo, che Excel non mostra. I numeri (anche negativi, "-12,50") restano numeri.
function noFormula(t){t=String(t==null?"":t);return /^[=+\-@\t\r]/.test(t)&&!/^[+-]?\d+(?:[.,]\d+)*$/.test(t.trim())?"'"+t:t;}
function rowTSV(r){
  const c=r.C!==""?clientByCode(r.C):null,cells=new Array(45).fill("");
  const put=(col,v)=>{cells[colIdx(col)-1]=noFormula(String(v==null?"":v).replace(/[\t\r\n]+/g," "));};
  put("A",r.foglio);put("B",r.B);put("C",r.C);put("D",c?c[1]:r.D);put("E",c?c[2]:"");put("F",c?c[4]:"");
  put("G",r.G);put("H",r.H);put("I",itDate(r.I));put("J",itDate(r.J));put("K",diff(r.I,r.J)+1);
  put("M",r.M);put("O",r.O);put("P",money(r.P));put("Q",money(r.Q));put("R",money(r.R));put("Y",r.P===""&&r.Q===""&&r.R===""?"":money(billTotal(r)));
  put("AH",money(r.AH));put("AI",r.AI);put("AJ",r.AJ);put("AQ",money(r.AH));put("Z",r.Z);put("AA",r.AA);
  return cells.join("\t");
}
$("billCopy").onclick=async()=>{
  let rows;try{rows=await rowsForRange();}catch(_){billMsg("Impossibile leggere le prenotazioni. Riprova.","err");return;}
  if(!rows.length){billMsg("Nessun servizio da copiare.","err");return;}
  const txt=rows.map(rowTSV).join("\r\n");
  try{await navigator.clipboard.writeText(txt);billMsg(rows.length+" righe copiate. In Excel clicca la cella A della prima riga vuota e incolla.","ok");}
  catch(_){
    const ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;left:-9999px";document.body.appendChild(ta);ta.select();
    let ok=false;try{ok=document.execCommand("copy");}catch(__){}
    ta.remove();billMsg(ok?rows.length+" righe copiate. In Excel clicca la cella A della prima riga vuota e incolla.":"Copia non consentita in questa vista: usa «Aggiorna il fatturato adesso».",ok?"ok":"err");
  }
};

// --- scrittura dentro il file Excel (xlsx) ---
let _jszip=null;
function loadJSZip(){
  if(window.JSZip)return Promise.resolve(window.JSZip);
  if(_jszip)return _jszip;
  _jszip=new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="vendor/jszip.min.js";sc.onload=()=>res(window.JSZip);sc.onerror=()=>{_jszip=null;rej(new Error("jszip"));};document.head.appendChild(sc);});
  return _jszip;
}
const xEsc=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const xUn=t=>t.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&amp;/g,"&");
function attr(tag,name){const m=new RegExp('\\s'+name+'="([^"]*)"').exec(tag);return m?m[1]:null;}
function parseSST(xml){
  const out=[],re=/<si>([\s\S]*?)<\/si>|<si\/>/g;let m;
  while((m=re.exec(xml))){const body=(m[1]||"").replace(/<rPh[\s\S]*?<\/rPh>/g,"");let t="";const r2=/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;let k;while((k=r2.exec(body)))t+=k[1];out.push(xUn(t));}
  return out;
}
function cellValue(attrs,inner,sst){
  if(!inner)return "";
  const t=attr(attrs,"t"),v=/<v>([\s\S]*?)<\/v>/.exec(inner);
  if(t==="s")return v?(sst[+v[1]]||""):"";
  if(t==="inlineStr"){let s="";const r=/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;let k;while((k=r.exec(inner)))s+=k[1];return xUn(s);}
  return v?xUn(v[1]):"";
}
async function sheetFile(zip,name){
  const wb=await zip.file("xl/workbook.xml").async("string");
  const rels=await zip.file("xl/_rels/workbook.xml.rels").async("string");
  const sh=(wb.match(/<sheet\b[^>]*>/g)||[]).find(t=>(attr(t,"name")||"").toLowerCase()===name.toLowerCase());
  if(!sh)return null;
  const rid=attr(sh,"r:id");
  const rel=(rels.match(/<Relationship\b[^>]*>/g)||[]).find(t=>attr(t,"Id")===rid);
  if(!rel)return null;
  const tg=attr(rel,"Target");
  return tg.startsWith("/")?tg.slice(1):"xl/"+tg.replace(/^\.\//,"");
}
async function readSheetGrid(zip,name,cols,sst){
  const path=await sheetFile(zip,name);if(!path||!zip.file(path))return null;
  const xml=await zip.file(path).async("string"),grid={};
  const re=new RegExp('<c r="('+cols.join("|")+')(\\d+)"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)',"g");let m;
  while((m=re.exec(xml))){const v=cellValue(m[3],m[4],sst);if(v!=="")(grid[m[2]]||(grid[m[2]]={}))[m[1]]=v.trim();}
  return grid;
}
function makeCell(ref,s,val){
  const st=s!=null?' s="'+s+'"':"";
  if(val.f!=null)return '<c r="'+ref+'"'+st+(val.str?' t="str"':'')+'><f>'+xEsc(val.f)+'</f></c>';
  if(val.n!=null)return '<c r="'+ref+'"'+st+'><v>'+val.n+'</v></c>';
  if(val.t!=null&&val.t!=="")return '<c r="'+ref+'"'+st+' t="inlineStr"><is><t xml:space="preserve">'+xEsc(val.t)+'</t></is></c>';
  return '<c r="'+ref+'"'+st+'/>';
}
function formulasFor(n){return {
  D:{f:'IFERROR(INDEX(clienti!$B:$B,MATCH(agenda!$C'+n+',clienti!$A:$A,0)),"")',str:1},
  E:{f:'IFERROR(INDEX(clienti!$C:$C,MATCH(agenda!$C'+n+',clienti!$A:$A,0)),"")',str:1},
  F:{f:'IFERROR(INDEX(clienti!$L:$L,MATCH(agenda!$C'+n+',clienti!$A:$A,0)),"")',str:1},
  K:{f:'agenda!$J'+n+'-agenda!$I'+n+'+1'},
  Y:{f:'agenda!$P'+n+'+agenda!$Q'+n+'+agenda!$R'+n+'+agenda!$S'+n+'+agenda!$U'+n+'+agenda!$W'+n},
  AQ:{f:'agenda!$AH'+n+'-agenda!$AK'+n+'-agenda!$AL'+n+'-agenda!$AM'+n+'-agenda!$AN'+n+'-agenda!$AO'+n+'-agenda!$AP'+n}
};}
function valuesFor(r){
  const v={A:{n:r.A},B:{t:r.B},G:{t:r.G},I:{n:excelSerial(r.I)},J:{n:excelSerial(r.J)}};
  if(r.C!=="")v.C=isFinite(Number(r.C))?{n:Number(r.C)}:{t:String(r.C)};else if(r.D)v.D={t:r.D};
  if(r.H)v.H={t:r.H};if(r.M)v.M={t:r.M};if(r.O)v.O={t:r.O};if(r.P!=="")v.P={n:r.P};if(r.Q!=="")v.Q={n:r.Q};if(r.R!=="")v.R={n:r.R};if(r.AH!=="")v.AH={n:r.AH};if(r.AI)v.AI={t:r.AI};if(r.AJ)v.AJ={t:r.AJ};if(r.Z)v.Z={t:r.Z};if(r.AA)v.AA={t:r.AA};
  return v;
}
function rowCells(rowXml){
  const cells={},re=/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;let m;
  while((m=re.exec(rowXml)))cells[m[1]]={xml:m[0],s:attr(m[2],"s"),inner:m[3]||""};
  return cells;
}
async function fillWorkbook(buf,rows){
  const JSZip=await loadJSZip();
  const zip=await JSZip.loadAsync(buf);
  const path=await sheetFile(zip,"agenda");
  if(!path||!zip.file(path))throw {code:"nosheet"};
  const sstF=zip.file("xl/sharedStrings.xml");
  const sst=sstF?parseSST(await sstF.async("string")):[];
  let xml=await zip.file(path).async("string");
  const a=xml.indexOf("<sheetData"),b=xml.indexOf("</sheetData>");
  if(a<0)throw {code:"nosheet"};
  const openEnd=xml.indexOf(">",a)+1;
  const selfClosed=xml[openEnd-2]==="/";
  const head=xml.slice(0,selfClosed?a:openEnd),tail=selfClosed?xml.slice(openEnd):xml.slice(b+"</sheetData>".length);
  const body=selfClosed?"":xml.slice(openEnd,b);
  const rowRe=/<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g,rowsXml=[],byNum={};let m;
  while((m=rowRe.exec(body))){const n=+attr(m[0].slice(0,m[0].indexOf(">")+1),"r");byNum[n]=rowsXml.length;rowsXml.push({n,xml:m[0]});}
  // righe già usate e n. foglio presenti
  const present=new Set();let lastUsed=1;
  const scan=/<c r="(A|B|C|I)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  while((m=scan.exec(body))){const r=+m[2];if(r<2)continue;const v=cellValue(m[3],m[4],sst);if(v==="")continue;if(r>lastUsed)lastUsed=r;if(m[1]==="A")present.add(String(v).trim().replace(/\.0+$/,""));}
  const todo=rows.filter(r=>!present.has(String(r.foglio)));
  // stili di riferimento: prima riga dati esistente
  const tplRow=rowsXml.find(x=>x.n===2)||rowsXml.find(x=>x.n>1);
  const tpl=tplRow?rowCells(tplRow.xml):{};
  let r=lastUsed+1,maxRow=rowsXml.length?rowsXml[rowsXml.length-1].n:1;
  for(const row of todo){
    const vals=valuesFor(row),fx=formulasFor(r);
    let cells,open;
    if(byNum[r]!=null){
      const old=rowsXml[byNum[r]].xml;open=old.slice(0,old.indexOf(">")+1).replace(/\/>$/,">");cells=rowCells(old);
    }else{
      open='<row r="'+r+'" spans="1:45">';cells={};
      for(const c of XL_COLS)cells[c]={xml:makeCell(c+r,tpl[c]&&tpl[c].s,{}),s:tpl[c]&&tpl[c].s,inner:""};
    }
    for(const c of Object.keys(fx)){if(vals[c])continue;const cur=cells[c];if(!cur||!/<f[\s>]/.test(cur.inner)){const s=cur?cur.s:(tpl[c]&&tpl[c].s);cells[c]={xml:makeCell(c+r,s,fx[c]),s,inner:"<f>"};}}
    for(const c of Object.keys(vals)){const s=cells[c]?cells[c].s:(tpl[c]&&tpl[c].s);cells[c]={xml:makeCell(c+r,s,vals[c]),s,inner:""};}
    const rx=open+Object.keys(cells).sort((x,y)=>colIdx(x)-colIdx(y)).map(k=>cells[k].xml).join("")+"</row>";
    if(byNum[r]!=null)rowsXml[byNum[r]].xml=rx;else{byNum[r]=rowsXml.length;rowsXml.push({n:r,xml:rx});}
    if(r>maxRow)maxRow=r;
    r++;
  }
  rowsXml.sort((x,y)=>x.n-y.n);
  xml=head+(selfClosed?"<sheetData>":"")+rowsXml.map(x=>x.xml).join("")+"</sheetData>"+tail;
  // estensione di dimensione, tabella e filtro se servono righe nuove
  const grow=(txt,re)=>txt.replace(re,(all,pre,col,n)=>+n<maxRow?pre+col+maxRow:all);
  xml=grow(xml,/(<dimension ref="[A-Z]+\d+:)([A-Z]+)(\d+)/);
  zip.file(path,xml);
  const relsPath=path.replace(/([^/]+)$/,"_rels/$1.rels");
  if(zip.file(relsPath)){
    const rels=await zip.file(relsPath).async("string");
    for(const t of rels.match(/<Relationship\b[^>]*>/g)||[]){
      if(!/\/table"/.test(attr(t,"Type")+'"'))continue;
      const tp=("xl/worksheets/"+attr(t,"Target")).replace(/[^/]+\/\.\.\//g,"");
      if(!zip.file(tp))continue;
      let tx=await zip.file(tp).async("string");
      tx=tx.replace(/(\sref="[A-Z]+\d+:)([A-Z]+)(\d+)/g,(all,pre,col,n)=>+n<maxRow?pre+col+maxRow:all);
      zip.file(tp,tx);
    }
  }
  let wb=await zip.file("xl/workbook.xml").async("string");
  wb=wb.replace(/(<definedName name="_xlnm\._FilterDatabase"[^>]*>agenda!\$[A-Z]+\$\d+:\$)([A-Z]+)\$(\d+)/,(all,pre,col,n)=>+n<maxRow?pre+col+"$"+maxRow:all);
  // ricalcolo delle formule all'apertura
  wb=/<calcPr\b[^>]*fullCalcOnLoad/.test(wb)?wb:wb.replace(/<calcPr\b([^>]*?)\/>/,'<calcPr$1 fullCalcOnLoad="1"/>');
  zip.file("xl/workbook.xml",wb);
  if(zip.file("xl/calcChain.xml")){
    zip.remove("xl/calcChain.xml");
    const ct=await zip.file("[Content_Types].xml").async("string");
    zip.file("[Content_Types].xml",ct.replace(/<Override\b[^>]*calcChain[^>]*\/>/g,""));
    const wr=await zip.file("xl/_rels/workbook.xml.rels").async("string");
    zip.file("xl/_rels/workbook.xml.rels",wr.replace(/<Relationship\b[^>]*calcChain[^>]*\/>/g,""));
  }
  // elenchi aggiornati dal file (clienti, autisti, targhe)
  const lists=await readLists(zip,sst);
  const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}});
  return {blob,added:todo.length,skipped:rows.length-todo.length,firstRow:lastUsed+1,lists};
}
async function readLists(zip,sst){
  const out={};
  try{
    const g=await readSheetGrid(zip,"clienti",["A","B","C","F","H","L","O","P"],sst);
    if(g){const list=[];for(const r of Object.keys(g).map(Number).sort((a,b)=>a-b)){if(r<2)continue;const x=g[r];if(!x.A||!x.B)continue;const code=/^\d+(\.0+)?$/.test(x.A)?Number(x.A):x.A;list.push([code,x.B,x.C||"",x.F||"",x.L||"",x.H||"",x.O||"",x.P||""]);}if(list.length)out.clients=list;}
  }catch(_){}
  try{
    const g=await readSheetGrid(zip,"regole",["A","E","I","J","K","L","M","N","O","P","Q","R","S"],sst);
    if(g){
      const rowsN=Object.keys(g).map(Number).filter(n=>n>=2).sort((a,b)=>a-b);
      const hdr=g[1]||{},targhe={},numeri={};
      for(const c of ["I","J","K","L","M","N","O","P","Q"]){let name=(hdr[c]||"").trim();if(!name)continue;if(name==="da_64_posti")name="_64_posti";targhe[name]=rowsN.map(n=>g[n][c]).filter(Boolean);}
      for(const n of rowsN){if(g[n].R)numeri[g[n].R]=g[n].S||"";}
      out.regole={autisti:rowsN.map(n=>g[n].E).filter(Boolean),tipi:rowsN.map(n=>g[n].A).filter(Boolean),targhe,numeri};
    }
  }catch(_){}
  return out;
}
// ---------- foglio di servizio: modello "automatico_2026_neutro.xlsx" ----------
// L'impaginato del modello è scritto qui sotto (TPL_COLS, TPL_ROWS): il file Excel non serve sul sito
// e dalla 2.2 non viene più pubblicato (i modelli vecchi contenevano una copia dei dati del fatturato).
const TPL_COLS=[7.85546875,12.0,6.0,13.0,7.42578125,16.140625,4.28515625,13.28515625];
const TPL_LETTERS="ABCDEFGH";
// Impaginato del modello (versione del 06/10/2026, righe referenti/guide/hotel con una sola casella larga): una voce per riga del file Excel. fx: casella che compila
// l'app; m: quante colonne può occupare il testo (caselle unite); bd: bordi (1 nero, 2 grigio, 3 tratteggio
// di taglio, 4 e 5 bianchi); f: sfondo (a azzurrino, g grigio).
const TPL_ROWS=[[20.0,{"A":{"t":" La Terra s.r.l. - Via Archimede 285C - 97100 - Ragusa - tel. 0932/626240 - Aut. Reg. Sicilia","z":15,"bd":"l1t1"},"B":{"z":15,"bd":"t1"},"C":{"z":15,"bd":"t1"},"D":{"z":15,"bd":"t1"},"E":{"z":15,"bd":"t1"},"F":{"z":15,"bd":"t1"},"G":{"z":15,"bd":"t1"},"H":{"z":15,"bd":"r1t1"}}],[20.0,{"A":{"t":"www.laterra.it - info@laterra.it - laterrasrl@pec.it - univoco M5UXCR1 - p. iva 00826460883","z":15,"bd":"l1b1"},"B":{"z":15,"bd":"b1"},"C":{"z":15,"bd":"b1"},"D":{"z":15,"bd":"b1"},"E":{"z":15,"bd":"b1"},"F":{"z":15,"bd":"b1"},"G":{"z":15,"bd":"b1"},"H":{"z":15,"bd":"r1b1"}}],[12.0,{}],[19,{"A":{"t":"ESTREMI DEL CONTRATTO CON IL CLIENTE E FOGLIO DI SERVIZIO NUMERO","al":"l","bd":"l1t1b1"},"B":{"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"t1b1"},"G":{"bd":"t1b1"},"H":{"bd":"l1r1t1b1"}}],[12.0,{"A":{"z":13},"B":{"z":13},"C":{"z":13},"D":{"z":13},"E":{"z":13},"F":{"z":13},"G":{"z":13},"H":{"z":13,"al":"r"}}],[19,{"A":{"t":"Passeggeri","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"t1b1"},"C":{"t":"Bus","f":"a","bd":"l1t1b1"},"D":{"al":"c","bd":"t1b1"},"E":{"t":"Numero","bd":"l1t1b1"},"F":{"fx":1,"al":"l","bd":"r1t1b1"},"G":{"t":"Targa","bd":"t1b1"},"H":{"al":"c","bd":"r1t1b1"}}],[19,{"A":{"t":"Inizio","bd":"l1t1b1"},"B":{"fx":1,"al":"l","bd":"t1b1"},"C":{"t":"Fine","bd":"l1t1b1"},"D":{"al":"l","bd":"r1t1b1"},"E":{"t":"Durata","bd":"l1t1b1"},"F":{"al":"c","bd":"r1t1b1"},"G":{"t":"Autista","bd":"l1t1b1"},"H":{"al":"c","bd":"r1t1b1"}}],[19,{"A":{"t":"Cliente","bd":"l1t1b1"},"B":{"b":1,"bd":"t1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"t1b1"},"G":{"t":"Tel.","bd":"l1t1b1"},"H":{"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Ref.te 1","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"l4t1b1","m":5,"fx":1},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"r1t1b1"},"G":{"t":"Tel.","bd":"l1t1b1"},"H":{"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Ref.te 2","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"l4t1b1","m":5,"fx":1},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"r1t1b1"},"G":{"t":"Tel.","bd":"l1t1b1"},"H":{"f":"a","al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Guida 1","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"l4t1b1","m":5,"fx":1},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"r1t1b1"},"G":{"t":"Tel.","bd":"l1t1b1"},"H":{"f":"a","al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Guida 2","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"l4t1b1","m":5,"fx":1},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"r1t1b1"},"G":{"t":"Tel.","bd":"l1t1b1"},"H":{"f":"a","al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Hotel 1","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"l4t1b1","m":5,"fx":1},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"r1t1b1"},"G":{"t":"Tel.","bd":"l1t1b1"},"H":{"f":"a","al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Hotel 2","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"l4t1b1","m":5,"fx":1},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"r1t1b1"},"G":{"t":"Tel.","bd":"l1t1b1"},"H":{"f":"a","al":"l","bd":"r1t1b1"}}],[13.0,{"A":{"z":15},"B":{"z":15},"C":{"z":15},"D":{"z":15},"E":{"z":15},"F":{"z":15},"G":{"z":15},"H":{"z":15}}],[19,{"A":{"f":"a","al":"l","bd":"l1t1b2"},"B":{"bd":"t1b2"},"C":{"bd":"t1b2"},"D":{"bd":"t1b2"},"E":{"bd":"t1b2"},"F":{"bd":"t1b2"},"G":{"bd":"t1b2"},"H":{"bd":"r1t1b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b1"},"B":{"bd":"t2b1"},"C":{"bd":"t2b1"},"D":{"bd":"t2b1"},"E":{"bd":"t2b1"},"F":{"bd":"t2b1"},"G":{"bd":"t2b1"},"H":{"bd":"r1t2b1"}}],[12.0,{"C":{"bd":"b1"}}],[19,{"A":{"t":"Saldo da ricevere","bd":"l1t1b1"},"B":{"bd":"t1b1"},"C":{"t":"NO","f":"g","al":"c"},"D":{"f":"a","al":"l","bd":"r1t1b1"},"E":{"t":"Acconto La Terra","bd":"l1t1b1"},"F":{"bd":"t1b1"},"G":{"bd":"t1b1"},"H":{"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Note 1","bd":"l1t1b1"},"B":{"fx":1,"f":"a","bd":"t1b1","m":1},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"f":"a","bd":"t1b1"},"H":{"f":"a","bd":"r1t1b1"}}],[19,{"A":{"t":"Note 2","bd":"l1t1b1"},"B":{"fx":1,"f":"a","bd":"t1b1","m":1},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"f":"a","bd":"t1b1"},"H":{"f":"a","bd":"r1t1b1"}}],[19,{"A":{"t":"Note 3","bd":"l1t1b1"},"B":{"fx":1,"f":"a","bd":"t1b1","m":1},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"f":"a","bd":"t1b1"},"H":{"f":"a","bd":"r1t1b1"}}],[19,{"A":{"t":"Note 4","bd":"l1t1b1"},"B":{"fx":1,"f":"a","bd":"t1b1","m":1},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"f":"a","bd":"t1b1"},"H":{"f":"a","bd":"r1t1b1"}}],[19,{"A":{"bd":"t1b1"},"B":{"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"t1b1"},"G":{"bd":"t1b1"},"H":{"bd":"t1b1"}}],[20.0,{"A":{"t":"Autista firma","bd":"l1t1"},"B":{"bd":"t1"},"C":{"bd":"t1"},"D":{"bd":"r1t1"},"E":{"t":"Azienda firma","bd":"l1t1"},"F":{"bd":"t1"},"G":{"z":15,"bd":"t1"},"H":{"z":15,"bd":"r1t1"}}],[20.0,{"A":{"z":15,"bd":"l1"},"B":{"z":15},"C":{"z":15},"D":{"z":15,"bd":"r1"},"E":{"z":15,"bd":"l1"},"F":{"z":15},"G":{"z":15},"H":{"z":15,"bd":"r1"}}],[20.0,{"A":{"z":15,"bd":"l1b1"},"B":{"z":15,"bd":"b1"},"C":{"z":15,"bd":"b1"},"D":{"z":15,"bd":"r1b1"},"E":{"z":15,"bd":"l1b1"},"F":{"z":15,"bd":"b1"},"G":{"z":15,"bd":"b1"},"H":{"z":15,"bd":"r1b1"}}],[20.0,{}],[20.0,{"A":{"bd":"t3"},"B":{"bd":"t3"},"C":{"bd":"t3"},"D":{"bd":"t3"},"E":{"bd":"t3"},"F":{"bd":"t3"},"G":{"bd":"t3"},"H":{"bd":"t3"}}],[20.0,{"A":{"t":"Servizio","bd":"l1t1b1"},"B":{"f":"a","al":"l","bd":"t1b1"},"C":{"t":"Bus","bd":"l1t1b1"},"D":{"bd":"t1b1"},"E":{"t":"Targa","bd":"l1t1b1"},"F":{"bd":"r1t1b1"},"G":{"t":"Autista","bd":"t1b1"},"H":{"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Inizio","bd":"l1t1b1"},"B":{"al":"l","bd":"r1t1b1"},"C":{"t":"Fine","bd":"t1b1"},"D":{"al":"l","bd":"r1t1b1"},"E":{"t":"Giorni","bd":"t1b1"},"F":{"al":"l","bd":"r1"},"G":{"t":"Ore","bd":"l1t1b1"},"H":{"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Cliente","bd":"l1t1b1"},"B":{"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Referente","bd":"l1t1b1"},"B":{"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Itinerario","bd":"l1t1"},"B":{"bd":"t1"},"C":{"bd":"t1"},"D":{"bd":"t1"},"E":{"bd":"t1"},"F":{"bd":"t1"},"G":{"bd":"t1"},"H":{"bd":"r1t1"}}],[19,{"A":{"t":"Causale","bd":"l1t1b1"},"B":{"f":"a","bd":"t1b1"},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"t":"Prezzo i.c.","bd":"l1t1b1"},"H":{"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Partita Iva","bd":"l1t1b1"},"B":{"al":"l","bd":"r1t1b1"},"C":{"t":"Multi","bd":"l1t1b1"},"D":{"al":"l","bd":"r1t1b1"},"E":{"t":"SDI","bd":"l1t1b1"},"F":{"f":"a","bd":"r1t1b1"},"G":{"t":"Parcheggi","bd":"l1t1b1"},"H":{"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Fattura acc.","bd":"l1t1b1"},"B":{"al":"l","bd":"r1t1b1"},"C":{"t":"Del","bd":"l1t1b1"},"D":{"fx":1,"al":"l","bd":"r1t1b1"},"E":{"t":"Euro","bd":"l1t1b1"},"F":{"fx":1,"al":"l","bd":"r1t1b1"},"G":{"t":"Pasti","bd":"l1t1b1"},"H":{"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Fattura sald","bd":"l1t1b1"},"B":{"al":"l","bd":"r1t1b1"},"C":{"t":"Del","bd":"l1t1b1"},"D":{"fx":1,"al":"l","bd":"r1t1b1"},"E":{"t":"Euro","bd":"l1t1b1"},"F":{"fx":1,"al":"l","bd":"r1t1b1"},"G":{"t":"Varie ","bd":"l1t1b1"},"H":{"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Note A","bd":"l1"},"G":{"t":"Totale","bd":"l1t1b1"},"H":{"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Note B","bd":"l1t1b1"},"B":{"fx":1,"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"r1t1b1"},"G":{"t":"Contratto","bd":"l1t1b1"},"H":{"bd":"r1t1b1"}}]];
// righe del modello da cui si copiano le righe che possono ripetersi
const TR={ref1:9,ref2:10,guide:11,hotel:13,note:25};
// gli hotel scritti con le versioni prima della 2.0 ("Nome – indirizzo, città" tutto nel nome) si dividono nelle colonne del foglio
function hotelsOf(b){return ((b&&b.hotels)||[]).filter(x=>x&&(x.name||x.tel)).map(splitOldHotel);}
function guidesOf(b){return ((b&&b.guides)||[]).filter(x=>x&&(x.name||x.tel));}
function notesOf(b){return dnotesOf(b).filter(n=>n&&(n.t||n.c));}
// testo dell'hotel (nome – indirizzo, città) per la pagina 2 e per il registro
const hotelCell=x=>[x.name,[x.addr,x.city].filter(Boolean).join(", ")].filter(Boolean).join(" – ");
const hotelTxt=x=>[hotelCell(x),x.tel].filter(Boolean).join(" – ");
// Nome dell'hotel sul foglio di servizio: senza le stelle della categoria e senza le parole "Hotel" e "Albergo"
// (la riga si chiama già "Hotel 1"). Vale solo per il foglio: prenotazione e anagrafica restano come sono scritte.
const HOTEL_STARS="*\u2605\u2606\u2B50\u2729-\u2730\u22C6\uFE0F",HOTEL_AZ="0-9A-Za-z\u00C0-\u024F";
const HOTEL_RX=[
  // "4 stelle", "4 stelle superior", "3 stars"
  new RegExp("(^|[^"+HOTEL_AZ+"])[1-7]\\s*(?:stelle|stella|stars?)(?:\\s+(?:superior|sup\\.?|lusso|luxury))?(?!["+HOTEL_AZ+"])","gi"),
  // "****", "★★★★", "4*", "4 ★", "****S", "5*L", "**** Superior"
  new RegExp("(?:(^|[^"+HOTEL_AZ+"])[1-7]\\s?)?["+HOTEL_STARS+"]+(?:[SL](?=$|[\\s),.;\\-\u2013])|\\s?(?:superior|sup\\.?|lusso|luxury)(?!["+HOTEL_AZ+"]))?","gi")];
const HOTEL_EDGE=new RegExp("^[^"+HOTEL_AZ+"]+|[^"+HOTEL_AZ+"]+$","g");
function hotelShort(name){
  const src=String(name==null?"":name).replace(/\s+/g," ").trim();if(!src)return "";
  const tidy=t=>t.replace(/\(\s*\)|\[\s*\]/g," ").replace(/\s+/g," ").replace(/\s+([,;:.)])/g,"$1").replace(/([(])\s+/g,"$1")
    .replace(/^[\s\-\u2013\u2014,;:.\u00B7|\/&+]+|[\s\-\u2013\u2014,;:\u00B7|\/&+]+$/g,"").replace(/\s*([\-\u2013\u2014])(?:\s*[\-\u2013\u2014])+\s*/g," $1 ").trim();
  const cut=(t,rx)=>tidy(t.replace(rx,(m,a)=>(a||"")+" "));
  const sym=cut(src.replace(/\uD83C\uDF1F/g,"*"),HOTEL_RX[1]),all=cut(sym,HOTEL_RX[0]);
  const out=tidy(all.split(" ").filter(w=>!/^(?:hotel|h\u00F4tel|albergo)$/i.test(w.replace(HOTEL_EDGE,""))).join(" "));
  return out||sym||src; // se non resterebbe niente (un hotel che si chiama "Hotel", "Hotel 7 Stelle") il nome resta scritto
}
// referente: nome (ruolo) · note; guida: nome – città · note
const refCell=x=>x?[x.name,x.role?"("+x.role+")":""].filter(Boolean).join(" ")+(x.note?" · "+x.note:""):"";
const guideCell=x=>x?[x.name,x.city].filter(Boolean).join(" – ")+(x.note?" · "+x.note:""):"";
function ref1Of(b){return {name:b.contactName||"",role:b.contactRole||"",note:b.contactNote||"",tel:b.contact||""};}
// opzioni della finestra del foglio di servizio. alias: nella casella Cliente del foglio per l'autista
// si scrive l'alias (quando il cliente ne ha uno); nella parte contabile resta sempre la ragione sociale.
const SHO={noPlate:false,alias:false};
function shClient(b){return b.clientCode!==""&&b.clientCode!=null?clientByCode(b.clientCode):null;}
const numOrE=x=>x===""||x==null||!isFinite(Number(x))?"":Number(x);
// referenti della prenotazione, in ordine: il 1° (riga Referente 1 del modulo) e gli altri
function refsOf(b){
  const cl=shClient(b),ctel=cl&&cl[4]?String(cl[4]):"",r1=ref1Of(b);
  if(r1.tel&&r1.tel===ctel)r1.tel=""; // prenotazioni vecchie: il telefono del cliente non si ripete
  return [r1].concat((b&&b.refs)||[]).filter(x=>x&&(x.name||x.tel||x.role||x.note));
}
// Struttura del foglio per questa prenotazione. Il modello ha 2 righe per referenti, guide e hotel e 4 per le
// note: se ne servono di più si aggiungono sotto (Referente 3 sotto il 2, e così via); le note hanno tante
// righe quante sono (senza note resta solo «Note 1», vuota).
function tplPlan(b){
  const P={refs:refsOf(b),gs:guidesOf(b),hs:hotelsOf(b),ns:notesOf(b)};
  const cap=(n,min)=>Math.max(min,Math.min(n,12));
  // foglio dinamico: "Ref.te 1" e "Note 1" ci sono sempre; il 2° referente, le guide e gli hotel solo se scritti
  P.nR=cap(P.refs.length,1);P.nG=cap(P.gs.length,0);P.nH=cap(P.hs.length,0);P.nN=cap(P.ns.length,1);
  P.over=P.refs.length>12||P.gs.length>12||P.hs.length>12||P.ns.length>12;
  // wide: riga con la casella larga (referenti, guide, hotel). Nel modello è centrata; qui il testo parte da sinistra.
  const row=(src,label,wide)=>[TPL_ROWS[src-1][0],Object.assign({},TPL_ROWS[src-1][1],{A:Object.assign({},TPL_ROWS[src-1][1].A,{t:label})},wide?{B:Object.assign({},TPL_ROWS[src-1][1].B,{al:"l"})}:{})];
  const rows=TPL_ROWS.slice(0,8);
  P.rRef=rows.length+1;for(let i=0;i<P.nR;i++)rows.push(row(i?TR.ref2:TR.ref1,"Ref.te "+(i+1),true));
  P.rGuide=rows.length+1;for(let i=0;i<P.nG;i++)rows.push(row(TR.guide,"Guida "+(i+1),true));
  P.rHotel=rows.length+1;for(let i=0;i<P.nH;i++)rows.push(row(TR.hotel,"Hotel "+(i+1),true));
  rows.push(TPL_ROWS[14]);
  P.rProg=rows.length+1;rows.push(...TPL_ROWS.slice(15,22)); // 7 righe del programma
  rows.push(TPL_ROWS[22]);
  P.rSaldo=rows.length+1;rows.push(TPL_ROWS[23]);
  P.rNote=rows.length+1;for(let i=0;i<P.nN;i++)rows.push(row(TR.note,"Note "+(i+1)));
  rows.push(TPL_ROWS[28]);rows.push(...TPL_ROWS.slice(29,32)); // spazio e firme
  P.last=rows.length; // fin qui la copia per l'autista
  rows.push(TPL_ROWS[32],TPL_ROWS[33]); // riga vuota e linea di taglio
  P.rOff=rows.length+1;rows.push(...TPL_ROWS.slice(34)); // parte contabile (11 righe)
  P.rows=rows;
  return P;
}
// programma completo: una riga per tappa (o per giorno nei tour). all (pagina 2): in testa gli hotel e in
// fondo referenti e guide, tutti per esteso.
function tplProgramAll(b,all){
  const lines=[],prog=Array.isArray(b.program)?b.program:[];
  if(all)hotelsOf(b).forEach((x,i)=>lines.push("Hotel "+(i+1)+": "+hotelTxt(Object.assign({},x,{name:hotelShort(x.name)}))));
  const clean=t=>String(t||"").split("\n").map(x=>x.trim()).filter(Boolean);
  if(hasEvent(b.type)&&(b.event||b.escort))lines.push([b.event?"Evento: "+b.event:"",b.escort?"Accompagnatore: "+b.escort:""].filter(Boolean).join(" – "));
  if(isMulti(b.type)){
    const nd=Math.min(31,diff(b.start,endOf(b))+1);
    for(let i=0;i<nd;i++){
      const d=addDays(b.start,i),txt=clean(prog[i]).join(" · ")||(i===0&&(b.time||b.route)?((b.time?"Ore "+b.time+" ":"")+(b.route||"")).trim():"");
      lines.push((i+1)+"° giorno "+(+d.slice(8,10))+"/"+d.slice(5,7)+" "+WD[wday(d)]+(txt?": "+txt:""));
    }
  }else{
    let l=clean(prog.join("\n"));
    if(!l.length){const t=((b.time?"Ore "+b.time+" ":"")+(b.route||"")).trim();if(t)l=[t];}
    l.forEach((t,i)=>lines.push((i+1)+") "+t));
  }
  if(all){
    refsOf(b).forEach((x,i)=>lines.push("Referente "+(i+1)+": "+[refCell(x),x.tel].filter(Boolean).join(" – ")));
    guidesOf(b).forEach((x,i)=>lines.push("Guida "+(i+1)+": "+[guideCell(x),x.tel].filter(Boolean).join(" – ")));
    notesOf(b).forEach((x,i)=>lines.push("Note "+(i+1)+": "+[x.c,x.t].filter(Boolean).join(" – ")));
  }
  return lines;
}
// righe per le 7 caselle del programma. Se non bastano la settima rimanda alla pagina 2, dove c'è tutto.
function tplProgram(b){
  const lines=tplProgramAll(b,false);
  if(lines.length<=7)return lines;
  const head=lines.slice(0,6);
  head.push("▸ Il programma continua a pagina 2 (altre "+(lines.length-6)+" righe)");
  return head;
}
// ---------- durata del servizio ----------
// Gite e transfer di un giorno: ore tra partenza e rientro. Tour, notturni e servizi di più giorni: giorni.
const hoursType=t=>{t=normType(t);return t==="gita"||t==="transfer";};
function durMin(b){
  const m=t=>{const p=/^(\d{1,2}):(\d{2})/.exec(String(t||""));return p?+p[1]*60+ +p[2]:null;};
  const a=m(b.time),z=m(b.time2);if(a==null||z==null)return null;
  const d=diff(b.start,endOf(b))*1440+z-a;return d>0?d:null;
}
function durHours(b){if(!hoursType(b.type))return null;const m=durMin(b);return m!=null&&m<=1440?m:null;}
// sul foglio di servizio: "9 ore", "9 ore 30'", "3 giorni"
function durText(b){
  const m=durHours(b);
  if(m!=null){const h=Math.floor(m/60),r=m%60;return [h?h+(h===1?" ora":" ore"):"",r?r+"'":""].filter(Boolean).join(" ");}
  const nd=diff(b.start,endOf(b))+1;return nd+(nd===1?" giorno":" giorni");
}
// nelle viste: "9h", "9h30", oppure il giorno del servizio ("2/3")
function durShort(b,date){
  const m=durHours(b);
  if(m!=null)return Math.floor(m/60)+"h"+(m%60?pad(m%60):""); // anche se passa la mezzanotte (es. 23:30 → 00:45)
  if(spans(b)||!hoursType(b.type)){const tot=diff(b.start,endOf(b))+1;return Math.min(tot,Math.max(1,diff(b.start,date)+1))+"/"+tot;}
  return "";
}
// valori delle caselle. k: s testo, i numero intero, d data, e euro, a euro contabile
function tplValues(b){
  const P=tplPlan(b),o={};
  const v=vehicle(b.vehicle)||{},cl=shClient(b),plate=(v.plate||"").trim(),type=normType(b.type);
  const nr=v.num!=null&&String(v.num).trim()!==""?v.num:(S.regole.numeri||{})[plate],numero=nr==null?"":(/^\d+$/.test(String(nr).trim())?Number(nr):String(nr).trim());
  const nd=diff(b.start,endOf(b))+1,pr=numOrE(b.price),pk=numOrE(b.park),ml=numOrE(b.meals);
  const name=cl?cl[1]:(b.client||""),tel=cl&&cl[4]?String(cl[4]):"",alias=cl&&cl[2]?String(cl[2]):"";
  const busName=v.name||xcatOf(v),plateShown=SHO.noPlate?"":plate;
  const pax=String(b.pax==null?"":b.pax).trim(),kind=v.kind==="van"?"Van":v.kind==="auto"?"Auto":"Bus";
  const drv=realDriver(b.driver),fg=b.provisional?String(b.foglio||"")+" PROVV.":/^\d+$/.test(String(b.foglio||""))?Number(b.foglio):(b.foglio||"");
  const any=pr!==""||pk!==""||ml!=="",hm=durHours(b);
  const put=(col,row,val)=>{o[col+row]=val;};
  put("H",4,{v:fg,k:b.provisional?"s":"i"});
  put("B",6,{v:/^\d+$/.test(pax)?Number(pax):pax,k:/^\d+$/.test(pax)?"i":"s"});put("C",6,{v:kind});put("D",6,{v:busName});
  put("F",6,{v:SHO.noPlate?"":numero,k:"s"});put("H",6,{v:plateShown});
  put("B",7,{v:b.start,k:"d"});put("D",7,{v:endOf(b),k:"d"});put("F",7,{v:durText(b)});put("H",7,{v:drv});
  put("B",8,{v:SHO.alias&&alias?alias:name});put("H",8,{v:tel});
  // referenti, guide e hotel: una sola casella larga (B:F del modello) con le voci in fila, poi il telefono
  const one=(...a)=>a.map(x=>String(x==null?"":x).trim()).filter(Boolean).join(" - ");
  P.refs.slice(0,P.nR).forEach((x,i)=>{const r=P.rRef+i;put("B",r,{v:one(x.role,x.name,x.note)});put("H",r,{v:x.tel||""});});
  P.gs.slice(0,P.nG).forEach((x,i)=>{const r=P.rGuide+i;put("B",r,{v:one(x.city,x.name,x.note)});put("H",r,{v:x.tel||""});});
  P.hs.slice(0,P.nH).forEach((x,i)=>{const r=P.rHotel+i;put("B",r,{v:one(x.city,hotelShort(x.name),x.addr)});put("H",r,{v:x.tel||""});});
  tplProgram(b).forEach((t,i)=>put("A",P.rProg+i,{v:t}));
  put("C",P.rSaldo,{v:b.saldo==="SI"?"SI":"NO"});put("D",P.rSaldo,{v:numOrE(b.saldoAmt),k:"a"});put("H",P.rSaldo,{v:cashOn(b)?numOrE(b.advance):"",k:"e"});
  P.ns.slice(0,P.nN).forEach((x,i)=>{put("B",P.rNote+i,{v:x.c||""});put("C",P.rNote+i,{v:x.t||""});});
  // parte contabile: sempre la ragione sociale del cliente, mai l'alias
  const r=P.rOff,r1=P.refs[0]||{};
  put("B",r,{v:TYPE_XL[type]||""});put("D",r,{v:busName});put("F",r,{v:plateShown});put("H",r,{v:drv});
  put("B",r+1,{v:b.start,k:"d"});put("D",r+1,{v:endOf(b),k:"d"});put("F",r+1,{v:nd,k:"s"});put("H",r+1,{v:hm==null?"":Math.floor(hm/60)+(hm%60?":"+pad(hm%60):"")});
  put("B",r+2,{v:name});put("H",r+2,{v:tel});
  put("B",r+3,{v:refCell(r1)});put("H",r+3,{v:r1.tel||""});
  put("B",r+4,{v:billItin(b)});
  put("H",r+5,{v:pr,k:"e"});
  put("B",r+6,{v:cl&&cl[5]?String(cl[5]):""});put("D",r+6,{v:cl?cl[0]:"",k:"s"});put("F",r+6,{v:cl?cliField(cl,"sdi"):""});put("H",r+6,{v:pk,k:"e"});
  put("D",r+7,{v:""});put("F",r+7,{v:""});put("H",r+7,{v:ml,k:"e"});
  put("D",r+8,{v:""});put("F",r+8,{v:""});put("H",r+8,{v:any?0:"",k:"e"});
  put("H",r+9,{v:any?(pr||0)+(pk||0)+(ml||0):"",k:"e"});
  put("B",r+10,{v:billNote(b)});put("H",r+10,{v:fg,k:b.provisional?"s":"i"});
  return {vals:o,P};
}
function tplText(x){
  if(!x||x.v===""||x.v==null)return "";
  if(x.k==="d")return itDate(x.v).replace(/\/(\d\d)(\d\d)$/,"/$2");
  if(x.k==="e")return "€ "+money(x.v);
  if(x.k==="a")return money(x.v)+" €";
  return String(x.v);
}
// Disegno del modello (unità: pixel del foglio Excel a 100%). Usato da anteprima, PDF e stampa.
// part: "driver" solo la copia per l'autista, "full" anche la parte contabile, "office" solo la parte contabile.
function tplLayout(b,part,measure){
  const {vals,P}=tplValues(b),rows=P.rows;let cut=P.over;
  const first=part==="office"?P.rOff:1,last=part==="driver"?P.last:rows.length;
  const X=[0];TPL_COLS.forEach(w=>X.push(X[X.length-1]+Math.round(w*9+5)));
  const fills=[],lines=[],texts=[];let y=0;
  const FILLC={a:"#F6FDFC",g:"#E5ECEB"},LINEC={1:"#000000",2:"#AEAAAA",3:"#000000",4:"#FFFFFF",5:"#FFFFFF"};
  for(let r=first;r<=last;r++){
    const [hpt,cells]=rows[r-1],h=hpt*4/3;
    const content=[];
    for(let i=0;i<8;i++){
      const L=TPL_LETTERS[i],c=cells[L]||{},val=vals[L+r];
      const t=val?tplText(val):(c.t!=null&&!c.fx?String(c.t):"");
      content.push({c,t,val});
      const cf=r===P.rSaldo&&L==="D"&&vals["C"+r]&&vals["C"+r].v==="SI"?"#C6E0B4":null; // come la formattazione condizionale del modello
      if(c.f||cf)fills.push({x:X[i],y,w:X[Math.min(8,i+(c.m||1))]-X[i],h,c:cf||FILLC[c.f]});
      const bd=c.bd||"";
      for(const m of bd.matchAll(/([lrtb])([1-5])/g)){
        const s=m[1],k=m[2],dash=k==="3",wd=k==="3"||k==="5"?2:1;
        const x1=s==="r"?X[i+1]:X[i],x2=s==="l"?X[i]:X[i+1],y1=s==="b"?y+h:y,y2=s==="t"?y:y+h;
        lines.push({x1,y1,x2:s==="l"||s==="r"?x1:x2,y2:s==="t"||s==="b"?y1:y2,c:LINEC[k],dash,w:wd,white:k==="4"||k==="5"});
      }
    }
    // Etichetta più larga della sua casella (nel modello alcune colonne sono strette: "Autista", "Parcheggi",
    // "Passeggeri"…) seguita da un valore: in Excel verrebbe tagliata. Qui resta intera: occupa lo spazio libero
    // della casella del valore e, se serve, il valore si sposta un po' a destra o si stringe insieme a lei.
    const inset=[0,0,0,0,0,0,0,0],lab={};
    for(let i=0;i<7;i++){
      const a=content[i],v=content[i+1];
      if(!a.t||a.val||a.c.m||(a.c.al&&a.c.al!=="l")||!v.t||!v.val)continue;
      const size=(a.c.z||14)*4/3,bold=!!a.c.b,cellW=X[i+1]-X[i];let lw=measure(a.t,size,bold);
      if(lw<=cellW-6)continue;
      const isNum=v.val.k&&v.val.k!=="s"&&typeof v.val.v==="number",val=v.c.al||(isNum?"r":"l"),vcell=X[i+2]-X[i+1];
      // fin dove può arrivare il valore: la sua casella; se è scritto a sinistra anche le caselle vuote dopo (o quelle unite)
      let j=i+2;if(val==="l")while(j<8&&!content[j].t)j++;if(v.c.m)j=Math.min(8,i+1+v.c.m);
      const vEnd=X[j],vsize=(v.c.z||14)*4/3,vw=measure(v.t,vsize,!!v.c.b),gap=7,room=vEnd-X[i]-6-gap;
      // se insieme non ci stanno: accanto a un importo si stringe solo l'etichetta (gli importi restano tutti
      // della stessa grandezza); accanto a un testo si stringono un po' tutti e due
      const maxLab=Math.max(cellW-6,isNum?room-vw:lw*Math.min(1,room/(lw+vw))),minSz=size*0.6;let sz=size;
      for(let n=0;n<8&&lw>maxLab&&sz>minSz;n++){sz=Math.max(minSz,sz*Math.min(0.995,maxLab/lw*0.995));lw=measure(a.t,sz,bold);}
      lab[i]={sz,lw};
      // un valore centrato o a destra che non arriva fin lì resta dov'è
      const over=3+lw+gap-cellW,free=v.c.m>1?0:val==="c"?(vcell-vw)/2:val==="r"?vcell-3-vw:0;
      if(over>0&&free<over+2)inset[i+1]=Math.min(over,Math.max(0,vEnd-X[i+1]-20));
    }
    for(let i=0;i<8;i++){
      const {c,t,val}=content[i];if(!t)continue;
      const size=(c.z||14)*4/3,bold=!!c.b,isNum=val&&val.k&&val.k!=="s"&&typeof val.v==="number";
      let al=c.al||(isNum?"r":"l");
      // come in Excel: il testo a sinistra si allunga sulle caselle vuote a destra (nelle caselle unite solo fin lì)
      let j=i+1;while(j<8&&!content[j].t)j++;
      if(c.m)j=Math.min(8,i+c.m);
      const x0=X[i]+inset[i],cellW=X[i+1]-x0,regionW=X[j]-x0;
      let tw=measure(t,size,bold),w=cellW;
      if(c.m>1)w=regionW; // casella unita: il testo (anche centrato) ha tutta la larghezza
      else if(al==="l"||(al==="c"&&tw>cellW-6)){al="l";w=regionW;}
      let sz=size,txt=t;
      if(lab[i]){sz=lab[i].sz;tw=lab[i].lw;w=Math.max(w,Math.min(tw+6,X[8]-x0));} // etichetta già sistemata qui sopra
      if(tw>w-6){
        // prima si rimpicciolisce (etichette e caselle strette un po' di più: restano intere). La misura del
        // browser non è sempre proporzionale alla grandezza, quindi si ricontrolla finché il testo ci sta.
        const minSz=size*(val&&!c.m?0.72:0.6);
        for(let n=0;n<8&&tw>w-6&&sz>minSz;n++){sz=Math.max(minSz,sz*Math.min(0.995,(w-6)/tw*0.995));tw=measure(txt,sz,bold);}
        // ancora troppo lungo: si accorcia e si rimanda alla pagina 2, dove c'è per intero
        const prog=r>=P.rProg&&r<=P.rProg+6&&i===0,dyn=!!val&&((r>=P.rRef&&r<P.rHotel+P.nH)||(r>=P.rNote&&r<P.rNote+P.nN)),p2=prog||!!c.m||dyn,suf=prog?"… (segue a pag. 2)":"…";
        if(tw>w-6){if(p2&&part!=="office")cut=true;let base=txt;while(tw>w-6&&base.length>1){base=base.slice(0,-2);txt=base.replace(/\s+$/,"")+suf;tw=measure(txt,sz,bold);}}}
      const tx=al==="c"?x0+(w-tw)/2:al==="r"?x0+w-3-tw:x0+3;
      texts.push({x:tx,y:y+h-Math.max(3,(h-sz)/2-1)-sz*0.2,t:txt,size:sz,bold});
    }
    y+=h;
  }
  // la linea di taglio tratteggiata va disegnata tutta d'un pezzo; le righe bianche stanno sotto le nere
  const dashed=lines.filter(l=>l.dash),solid=lines.filter(l=>!l.dash).sort((a,b)=>(b.white?1:0)-(a.white?1:0)),rowsY={};
  for(const l of dashed){const k=l.y1;rowsY[k]=rowsY[k]?{x1:Math.min(rowsY[k].x1,l.x1),x2:Math.max(rowsY[k].x2,l.x2)}:{x1:l.x1,x2:l.x2};}
  if(part!=="office")for(const k in rowsY)solid.push({x1:rowsY[k].x1,y1:+k,x2:rowsY[k].x2,y2:+k,c:"#000000",dash:true,w:2});
  return {W:X[8],H:y,fills,lines:solid,texts,cut,part};
}
// serve la pagina 2? (programma più lungo delle 7 righe del modello o testi tagliati). Mai per la sola parte contabile.
function needPage2(b,L){return (!L||L.part!=="office")&&(tplProgramAll(b).length>7||!!(L&&L.cut));}
function page2Head(b){
  const v=vehicle(b.vehicle)||{},cl=shClient(b),alias=cl&&cl[2]?String(cl[2]):"";
  return {title:"Foglio di servizio n. "+(b.foglio||"")+(b.provisional?" (provvisorio)":"")+" – programma completo",
    sub:[SHO.alias&&alias?alias:(cl?cl[1]:(b.client||"")),itDate(b.start)+(endOf(b)!==b.start?" – "+itDate(endOf(b)):""),[v.name,SHO.noPlate?"":(v.plate||"").trim()].filter(Boolean).join(" "),realDriver(b.driver)?"Autista "+realDriver(b.driver):""].filter(Boolean).join(" · ")};
}
function tplPage2HTML(b,part){
  if(!needPage2(b,tplLayout(b,part||"driver",measureCanvas)))return "";
  const h=page2Head(b);
  return '<div class="fs-page2"><p class="p2-note">Pagina 2 del PDF</p><h4>'+esc(h.title)+'</h4><p class="p2-sub">'+esc(h.sub)+'</p>'+tplProgramAll(b,true).map(l=>'<p>'+esc(l)+'</p>').join("")+'</div>';
}
const TPL_FONT="AgendaSans, Calibri, Carlito, 'Helvetica Neue', Arial, sans-serif";
let sheetFontP=null;
function ensureSheetFont(){
  if(sheetFontP)return sheetFontP;
  sheetFontP=loadPdfFonts().then(async F=>{
    if(!window.FontFace||!document.fonts)return false;
    const ff=[new FontFace("AgendaSans",b64bytes(F.regular.b64).buffer,{weight:"400"}),new FontFace("AgendaSans",b64bytes(F.bold.b64).buffer,{weight:"700"})];
    await Promise.all(ff.map(f=>f.load()));ff.forEach(f=>document.fonts.add(f));_mctx=null;return true;
  }).catch(e=>{ACC.tlog("avviso","Font del foglio di servizio non caricato: uso un font di sistema",String(e&&e.message||e));return false;});
  return sheetFontP;
}
let _mctx=null;
function measureCanvas(t,size,bold){if(!_mctx)_mctx=document.createElement("canvas").getContext("2d");_mctx.font=(bold?"bold ":"")+size+"px "+TPL_FONT;return _mctx.measureText(t).width;}
function tplSVG(b,part){
  const L=tplLayout(b,part,measureCanvas);
  let s='<svg class="fs-page" viewBox="-6 -6 '+(L.W+12)+' '+(L.H+12)+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Anteprima del foglio di servizio">';
  s+='<rect x="-6" y="-6" width="'+(L.W+12)+'" height="'+(L.H+12)+'" fill="#fff"/>';
  for(const f of L.fills)s+='<rect x="'+f.x+'" y="'+f.y+'" width="'+f.w+'" height="'+f.h+'" fill="'+f.c+'"/>';
  for(const l of L.lines)s+='<line x1="'+l.x1+'" y1="'+l.y1+'" x2="'+l.x2+'" y2="'+l.y2+'" stroke="'+l.c+'" stroke-width="'+l.w+'"'+(l.dash?' stroke-dasharray="7 4"':'')+'/>';
  for(const t of L.texts)s+='<text x="'+t.x.toFixed(1)+'" y="'+t.y.toFixed(1)+'" font-size="'+t.size.toFixed(2)+'"'+(t.bold?' font-weight="700"':'')+' font-family="'+esc(TPL_FONT)+'" fill="#111">'+esc(t.t)+'</text>';
  return s+'</svg>';
}

// --- PDF (pdf-lib): stesso disegno, una pagina A4 ---
let _pdflib=null;
function loadPdfLib(){
  if(window.PDFLib)return Promise.resolve(window.PDFLib);
  if(_pdflib)return _pdflib;
  _pdflib=new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="vendor/pdf-lib.min.js";sc.onload=()=>res(window.PDFLib);sc.onerror=()=>{_pdflib=null;rej(new Error("pdflib"));};document.head.appendChild(sc);});
  return _pdflib;
}
// Senza il font incorporato (file non disponibile) si usa l'Helvetica standard, che ha solo i caratteri
// dell'Europa occidentale: le altre lettere si semplificano (Ł → L, č → c) invece di sparire.
const TRANSLIT={"Ł":"L","ł":"l","Đ":"D","đ":"d","Ħ":"H","ħ":"h","ı":"i","Ŀ":"L","ŀ":"l","Ŧ":"T","ŧ":"t","Œ":"OE","œ":"oe","ſ":"s","ß":"ss"};
function pdfTxt(t){
  t=String(t==null?"":t).replace(/→/g,">").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\t/g," ").replace(/▸/g,">");
  let out="";
  for(const ch of t){
    if(/[\x20-\x7E -ÿ€–—…•]/.test(ch)){out+=ch;continue;}
    if(TRANSLIT[ch]){out+=TRANSLIT[ch];continue;}
    const base=ch.normalize("NFD").replace(/[̀-ͯ]/g,"");
    if(/^[\x20-\x7E -ÿ]+$/.test(base))out+=base;
  }
  return out;
}
// --- font incorporato nel PDF (vendor/font-pdf.js), senza librerie in più ---
let _fontsP=null;
function loadPdfFonts(){
  if(window.AGENDA_FONTS)return Promise.resolve(window.AGENDA_FONTS);
  if(_fontsP)return _fontsP;
  _fontsP=new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="vendor/font-pdf.js";sc.onload=()=>window.AGENDA_FONTS?res(window.AGENDA_FONTS):rej(new Error("font"));sc.onerror=()=>{_fontsP=null;rej(new Error("font"));};document.head.appendChild(sc);});
  return _fontsP;
}
function b64bytes(s){const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;}
const hex4=n=>n.toString(16).padStart(4,"0");
function utf16hex(cp){if(cp<0x10000)return hex4(cp);cp-=0x10000;return hex4(0xD800+(cp>>10))+hex4(0xDC00+(cp&0x3FF));}
// "embedder" per pdf-lib: font TrueType come Type0/CIDFontType2 con codifica Identity-H e tabella ToUnicode
class PdfFontEmbedder{
  constructor(F,L,name){this.F=F;this.L=L;this.fontName=name;this.scale=1000/F.upm;this.used=new Map();}
  glyphs(text){
    const out=[];
    for(const ch of String(text)){
      const cp=ch.codePointAt(0),g=this.F.cmap[cp];
      if(g!=null){out.push([g,cp]);continue;}
      // carattere assente (es. emoji): si prova la lettera senza accenti, altrimenti si salta
      for(const c2 of ch.normalize("NFD").replace(/[̀-ͯ]/g,"")){const g2=this.F.cmap[c2.codePointAt(0)];if(g2!=null)out.push([g2,c2.codePointAt(0)]);}
    }
    return out;
  }
  encodeText(text){let h="";for(const [g,cp] of this.glyphs(text)){if(!this.used.has(g))this.used.set(g,cp);h+=hex4(g);}return this.L.PDFHexString.of(h);}
  widthOfTextAtSize(text,size){let w=0;for(const [g] of this.glyphs(text))w+=this.F.w[g]||0;return w*this.scale*size/1000;}
  heightOfFontAtSize(size){return (this.F.ascent-this.F.descent)*this.scale*size/1000;}
  sizeOfFontAtHeight(h){return 1000*h/((this.F.ascent-this.F.descent)*this.scale);}
  async embedIntoContext(ctx,ref){
    const F=this.F,L=this.L,s=this.scale,name=this.fontName,bytes=b64bytes(F.b64);
    const fileRef=ctx.register(ctx.flateStream(bytes,{Length1:bytes.length}));
    const descRef=ctx.register(ctx.obj({Type:"FontDescriptor",FontName:name,Flags:32,FontBBox:F.bbox.map(v=>Math.round(v*s)),ItalicAngle:F.italicAngle,Ascent:Math.round(F.ascent*s),Descent:Math.round(F.descent*s),CapHeight:Math.round(F.capHeight*s),XHeight:Math.round(F.xHeight*s),StemV:0,FontFile2:fileRef}));
    const used=[...this.used.entries()].sort((a,b)=>a[0]-b[0]),W=[];
    for(const [g] of used)W.push(g,[Math.round((F.w[g]||0)*s)]);
    const cidRef=ctx.register(ctx.obj({Type:"Font",Subtype:"CIDFontType2",CIDToGIDMap:"Identity",BaseFont:name,CIDSystemInfo:{Registry:L.PDFString.of("Adobe"),Ordering:L.PDFString.of("Identity"),Supplement:0},FontDescriptor:descRef,W:W}));
    let cm="/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000><ffff>\nendcodespacerange\n";
    for(let i=0;i<used.length;i+=100){const part=used.slice(i,i+100);cm+=part.length+" beginbfchar\n"+part.map(([g,cp])=>"<"+hex4(g)+"> <"+utf16hex(cp)+">").join("\n")+"\nendbfchar\n";}
    cm+="endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend";
    const tuRef=ctx.register(ctx.flateStream(cm));
    const font=ctx.obj({Type:"Font",Subtype:"Type0",BaseFont:name,Encoding:"Identity-H",DescendantFonts:[cidRef],ToUnicode:tuRef});
    if(ref){ctx.assign(ref,font);return ref;}
    return ctx.register(font);
  }
}
function customFont(pdf,L,F,name){
  // pdf-lib accetta solo i suoi tipi di font: il nostro si presenta come un CustomFontEmbedder (i metodi restano i nostri)
  if(L.CustomFontEmbedder&&Object.getPrototypeOf(PdfFontEmbedder.prototype)!==L.CustomFontEmbedder.prototype)Object.setPrototypeOf(PdfFontEmbedder.prototype,L.CustomFontEmbedder.prototype);
  const e=new PdfFontEmbedder(F,L,name),ref=pdf.context.nextRef(),f=L.PDFFont.of(ref,pdf,e);pdf.fonts.push(f);return f;
}
// testo su più righe entro una larghezza
function wrapText(t,font,size,maxW,conv){
  const out=[];
  for(const para of String(t||"").split("\n")){
    let line="";
    for(const word of para.split(/\s+/).filter(Boolean)){
      const test=line?line+" "+word:word;
      if(font.widthOfTextAtSize(conv(test),size)<=maxW){line=test;continue;}
      if(line)out.push(line);
      let w=word;while(font.widthOfTextAtSize(conv(w),size)>maxW&&w.length>1){let k=w.length-1;while(k>1&&font.widthOfTextAtSize(conv(w.slice(0,k)),size)>maxW)k--;out.push(w.slice(0,k));w=w.slice(k);}
      line=w;
    }
    out.push(line);
  }
  return out;
}
async function tplPDF(b,part){
  const PL=await loadPdfLib(),{PDFDocument,StandardFonts,rgb}=PL;
  const pdf=await PDFDocument.create();
  pdf.setTitle("Foglio di servizio "+(b.foglio||"")+(b.provisional?" (provvisorio)":""));pdf.setAuthor("La Terra s.r.l.");
  let reg,bold,HK=1,conv=t=>String(t==null?"":t);
  try{const F=await loadPdfFonts();reg=customFont(pdf,PL,F.regular,"AGENDA+AgendaSans-Regular");bold=customFont(pdf,PL,F.bold,"AGENDB+AgendaSans-Bold");}
  catch(e){console.warn("Font del PDF non disponibile, uso Helvetica:",e);reg=await pdf.embedFont(StandardFonts.Helvetica);bold=await pdf.embedFont(StandardFonts.HelveticaBold);HK=0.88;conv=pdfTxt;} // Helvetica è più larga di Calibri
  const L=tplLayout(b,part,(t,size,bd)=>(bd?bold:reg).widthOfTextAtSize(conv(t),size*HK));
  const PW=595.28,PH=841.89,M=28.35,k=Math.min((PW-2*M)/L.W,(PH-2*M)/L.H);
  const page=pdf.addPage([PW,PH]),X=x=>M+x*k,Y=y=>PH-M-y*k;
  const hex=h=>rgb(parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255);
  const ink=rgb(.07,.07,.07);
  for(const f of L.fills)page.drawRectangle({x:X(f.x),y:Y(f.y+f.h),width:f.w*k,height:f.h*k,color:hex(f.c)});
  for(const l of L.lines)page.drawLine({start:{x:X(l.x1),y:Y(l.y1)},end:{x:X(l.x2),y:Y(l.y2)},thickness:(l.w===2?1.3:0.6),color:hex(l.c),dashArray:l.dash?[5,3]:undefined});
  for(const t of L.texts)page.drawText(conv(t.t),{x:X(t.x),y:Y(t.y),size:t.size*HK*k,font:t.bold?bold:reg,color:ink});
  // pagina 2: programma completo, a capo automatico
  if(needPage2(b,L)){
    const P2M=42,maxW=PW-2*P2M;let p=pdf.addPage([PW,PH]),y=PH-P2M;
    const put=(txt,font,size,gapAfter,indent)=>{
      for(const ln of wrapText(txt,font,size,maxW-(indent||0),conv)){
        if(y-size<P2M){p=pdf.addPage([PW,PH]);y=PH-P2M;}
        p.drawText(conv(ln),{x:P2M+(indent||0),y:y-size,size,font,color:ink});y-=size*1.32;
      }
      y-=gapAfter||0;
    };
    const h=page2Head(b);
    put(h.title,bold,14,4);put(h.sub,reg,10.5,12);
    for(const l of tplProgramAll(b,true))put(l,reg,11.5,5);
  }
  return new Blob([await pdf.save()],{type:"application/pdf"});
}

// --- nome file come nell'archivio: 26092602_cliente_x_destinazione ---
function slug(t){return norm(pdfTxt(t)).replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,40);}
function sheetFileName(b){const s=sheetNameParts(b);return s.fg+"_"+s.who+(s.what?"_x_"+s.what:"");}
function sheetNameParts(b){
  const cl=shClient(b),who=slug((cl&&cl[2])||(cl&&cl[1])||b.client||"cliente");
  let parts=(b.route||"").split(/[>→,–]| - /).map(x=>x.trim()).filter(Boolean);
  if(parts.length>2){const inner=parts.slice(1);if(norm(inner[inner.length-1])===norm(parts[0]))inner.pop();parts=inner;}else if(parts.length===2)parts=parts.slice(1);
  const what=slug(hasEvent(b.type)&&b.event?b.event:(parts.slice(0,2).join(" ")||TYPES[normType(b.type)]||"servizio"));
  // il n. foglio entra nel nome del file (e nel percorso in Dropbox): solo lettere, numeri e trattino
  const fg=String(b.foglio==null?"":b.foglio).replace(/[^0-9A-Za-z-]/g,"").slice(0,24);
  return {fg:fg||"foglio",who,what};
}

// --- finestra del foglio ---
let sheetBooking=null;
const sheetsOut={}; // prenotazione → n. foglio con cui il foglio di servizio è già stato salvato o inviato
// Il n. foglio è definitivo solo quando la prenotazione è arrivata in Dropbox: prima è "provvisorio"
// (un altro operatore potrebbe aver appena usato lo stesso numero) e il foglio lo dice chiaramente.
// quale parte del foglio: "driver" (solo foglio per l'autista), "full" (con la parte contabile), "office" (solo quella)
function sheetPart(){if(isInvio())return "driver";const v=$("sheetPart").value;return v==="full"||v==="office"?v:"driver";}
const PART_SUFFIX={driver:"",full:"_completo",office:"_contabile"},PART_LOG={driver:"",full:" (con la parte contabile)",office:" (solo parte contabile)"};
function openSheet(b){
  sheetBooking=Object.assign({},b,{provisional:STORE.isPending(b.id)});
  $("sheetNoPlate").checked=false;SHO.noPlate=false;$("sheetPart").value="driver";
  // Cliente o alias nell'intestazione: la scelta resta quella dell'ultima volta su questo dispositivo
  let al=false;try{al=localStorage.getItem("agenda-sheet-alias")==="1";}catch(_){}
  SHO.alias=al;
  // foglio già inviato all'autista: si riparte dalle scelte fatte per quell'invio (intestazione e targa)
  if(b.sent&&b.sent.at&&!b.sent.off){SHO.alias=!!b.sent.alias;SHO.noPlate=!!b.sent.noPlate;$("sheetNoPlate").checked=SHO.noPlate;}
  // profilo «solo anteprima e invio»: niente stampa, niente PDF, niente ritorno alla prenotazione
  const iv=isInvio();
  $("sheetBack").hidden=iv;$("sheetPdf").hidden=iv;$("sheetPrint").hidden=iv;$("sheetShare").hidden=iv||!canShareFile;
  $("sheetPart").closest("label").hidden=iv;document.querySelector("#ovSheet .sheet-hint").hidden=iv;
  renderSheet();$("sheetMsg").textContent="";
  ensureSheetFont().then(ok=>{if(ok&&!$("ovSheet").hidden)renderSheet();});
  $("ovSheet").hidden=false;
}
function renderSheet(){
  const b=sheetBooking;if(!b)return;
  $("sheetTitle").textContent="Foglio di servizio n. "+(b.foglio||"")+(b.provisional?" (provvisorio)":"");
  $("sheetProv").hidden=!b.provisional;
  // intestazione: l'alias si può scegliere solo se il cliente ne ha uno
  const cl=shClient(b),alias=cl&&cl[2]?String(cl[2]):"",sel=$("sheetName");
  sel.options[1].disabled=!alias;sel.options[1].textContent=alias?"Alias: "+alias:"Alias (il cliente non ne ha)";
  sel.options[0].textContent="Cliente: "+(cl?cl[1]:(b.client||"—"));
  sel.value=SHO.alias&&alias?"alias":"cliente";
  const part=sheetPart();
  $("sheetView").innerHTML=tplSVG(b,part)+tplPage2HTML(b,part);
  renderSheetSent();
}
// dopo "Salva e apri foglio di servizio": si aspetta (al massimo 10 secondi) la conferma del numero
async function openSheetConfirmed(b){
  openSheet(b);
  if(navigator.onLine&&STORE.isPending(b.id)){
    $("sheetMsg").textContent="Confermo il n. foglio con Dropbox…";
    await STORE.whenSent(b.id,10000);
    refreshSheetBooking();
    $("sheetMsg").textContent=sheetBooking&&sheetBooking.provisional?"Numero non ancora confermato: il foglio è provvisorio.":"";
  }
}
// aggiorna il foglio aperto se la prenotazione cambia (numero confermato o rinumerato)
function refreshSheetBooking(){
  if(!sheetBooking||$("ovSheet").hidden)return;
  const cur=bookingsAll().find(x=>x.id===sheetBooking.id);if(!cur)return;
  const nb=Object.assign({},cur,{provisional:STORE.isPending(cur.id)});
  if(nb.foglio!==sheetBooking.foglio||nb.provisional!==sheetBooking.provisional||nb.updatedAt!==sheetBooking.updatedAt){sheetBooking=nb;renderSheet();}
  else if(JSON.stringify(nb.sent||null)!==JSON.stringify(sheetBooking.sent||null)){sheetBooking=nb;renderSheetSent();}
}
$("sheetPart").addEventListener("change",renderSheet);
$("sheetName").addEventListener("change",()=>{SHO.alias=$("sheetName").value==="alias";try{localStorage.setItem("agenda-sheet-alias",SHO.alias?"1":"0");}catch(_){}renderSheet();});
$("sheetNoPlate").addEventListener("change",()=>{SHO.noPlate=$("sheetNoPlate").checked;renderSheet();});
$("sheetClose").onclick=()=>{$("ovSheet").hidden=true;};
// torna alla prenotazione per cambiare qualcosa (dati aggiornati, anche se modificata da altri)
$("sheetBack").onclick=()=>{
  const b0=sheetBooking;if(!b0)return;
  const b=bookingsAll().find(x=>x.id===b0.id);
  if(!b){toast("La prenotazione non c'è più (eliminata o spostata).");return;}
  $("ovSheet").hidden=true;openForm({booking:b});
};
backdropClose($("ovSheet"),()=>{$("ovSheet").hidden=true;});
async function sheetSave(kind){
  if(!sheetBooking)return;
  refreshSheetBooking();
  const part=sheetPart(),btns=[$("sheetPdf"),$("sheetPrint")];btns.forEach(x=>x.disabled=true);
  $("sheetMsg").textContent="Preparo il file…";
  try{
    const blob=await tplPDF(sheetBooking,part);
    const where=await saveXlsx(blob,sheetFileName(sheetBooking)+PART_SUFFIX[part]+(sheetBooking.provisional?"_PROVVISORIO":"")+".pdf");
    sheetsOut[sheetBooking.id]=String(sheetBooking.foglio);
    $("sheetMsg").textContent="PDF pronto. "+where;
  }catch(err){
    const c=err&&err.code;
    $("sheetMsg").textContent=c==="declined"?"Salvataggio annullato.":c==="unavailable"||c==="not_granted"?"Il download non è disponibile in questa vista.":"Non sono riuscito a creare il file. Controlla la connessione e riprova.";
    console.error(err);ACC.tlog("errore","Foglio di servizio: PDF non creato o non salvato",String((err&&(err.code||err.message))||err));
  }finally{btns.forEach(x=>x.disabled=false);}
}
$("sheetPdf").onclick=()=>{sheetSave("pdf");if(sheetBooking)ACC.log("foglio","PDF del foglio di servizio n. "+(sheetBooking.foglio||"")+" «"+(sheetBooking.client||"")+"»"+PART_LOG[sheetPart()],{id:sheetBooking.id});};
// Stampa: il foglio come nell'anteprima (A4); se il programma non ci sta, anche la pagina 2 come nel PDF
async function printSheet(){
  if(!sheetBooking)return;
  refreshSheetBooking();
  const b=sheetBooking,full=sheetPart(),ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  sheetsOut[b.id]=String(b.foglio);
  ACC.log("foglio","Stampa del foglio di servizio n. "+(b.foglio||"")+" «"+(b.client||"")+"»"+PART_LOG[full],{id:b.id});
  if(ios){ // su iPhone/iPad si stampa dal PDF (Condividi › Stampa)
    try{const blob=await tplPDF(b,full);const u=URL.createObjectURL(blob);window.open(u,"_blank");setTimeout(()=>URL.revokeObjectURL(u),60000);}catch(_){toast("Non riesco a preparare la stampa.");}
    return;
  }
  let p2="";
  if(needPage2(b,tplLayout(b,full,measureCanvas))){
    const h=page2Head(b);
    p2='<section class="p2"><h1>'+esc(h.title)+'</h1><p class="sub">'+esc(h.sub)+'</p>'+tplProgramAll(b,true).map(l=>'<p>'+esc(l)+'</p>').join("")+'</section>';
  }
  let fontCss="";
  try{const F=await loadPdfFonts();fontCss='@font-face{font-family:AgendaSans;font-weight:400;src:url(data:font/ttf;base64,'+F.regular.b64+') format("truetype")}@font-face{font-family:AgendaSans;font-weight:700;src:url(data:font/ttf;base64,'+F.bold.b64+') format("truetype")}';}catch(_){}
  const html='<!doctype html><html lang="it"><head><meta charset="utf-8"><title>'+esc("Foglio di servizio "+(b.foglio||"")+(b.provisional?" (provvisorio)":""))+'</title>'+
    '<style>'+fontCss+'@page{size:A4 portrait;margin:10mm}html,body{margin:0;background:#fff;color:#111;font-family:AgendaSans,Calibri,Carlito,Arial,sans-serif}svg{display:block;width:100%;height:auto;max-height:275mm}'+
    '.p2{break-before:page;page-break-before:always;font-size:12pt}.p2 h1{font-size:15pt;margin:0 0 4pt}.p2 .sub{color:#444;margin:0 0 10pt}.p2 p{margin:0 0 4pt}</style></head><body>'+tplSVG(b,full)+p2+'</body></html>';
  let fr=$("printFrame");
  if(fr)fr.remove();
  fr=document.createElement("iframe");fr.id="printFrame";fr.setAttribute("aria-hidden","true");fr.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(fr);
  await new Promise(r=>{fr.onload=r;fr.srcdoc=html;});
  try{await Promise.race([fr.contentDocument.fonts.ready,new Promise(r=>setTimeout(r,1500))]);}catch(_){}
  try{fr.contentWindow.focus();fr.contentWindow.print();}catch(_){toast("Non riesco ad aprire la stampa.");}
}
$("sheetPrint").onclick=printSheet;

// ---------- versione ----------
// (APP_VERSION e APP_DATE sono in testa al file)
$("gVer").textContent="Versione "+APP_VERSION+" · "+APP_DATE;$("appVer").textContent="v"+APP_VERSION;

// ---------- dati: Dropbox ----------
function subscribe(){subMonth=mkey(S.sel);}
function refreshFromStore(){
  S.days=STORE.view();S.allDays=null;
  const fl=STORE.fleet;if(Array.isArray(fl)&&fl.length){S.fleet=sortFleet(fl);S.fleetStored=true;}
  const L=STORE.lists;
  if(L){
    if(L.clients){S.clients=L.clients;S.clientCols=L.clientCols||null;}
    if(L.regole){S.regole=Object.assign({autisti:[],targhe:{},numeri:{}},L.regole);fillDrivers();}
  }
  if(!$("app").hidden)renderAll();
  if(!$("invio").hidden)renderInvio();
  refreshSheetBooking();
  if(!$("app").hidden)setTimeout(migrateFleet2026,300);
  if(!$("ovReg").hidden&&!$("regTable").contains(document.activeElement))renderReg();
}
function fmtTime(t){if(!t)return "";const d=new Date(t);const today=new Date().toDateString()===d.toDateString();return (today?"oggi":d.toLocaleDateString("it-IT",{day:"numeric",month:"short"}))+" alle "+d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}
let tlLastErr="",tlLastFat="";
function renderNet(st){
  st=st||STORE.status();
  if(st.error&&st.error!==tlLastErr&&navigator.onLine)ACC.tlog(st.error==="busy"||st.error==="network"?"avviso":"errore","Dropbox: "+({no_auth:"accesso scaduto o revocato",scope:"permessi mancanti",busy:"occupato, riprovo",network:"non raggiungibile",day:"una giornata non si riesce a salvare"}[st.error]||st.error),st.errorDetail||"");
  tlLastErr=st.error||"";
  const fe=st.fat&&st.fat.error||"";if(fe&&fe!==tlLastFat)ACC.tlog("errore","File fatturato: aggiornamento non riuscito ("+fe+")",JSON.stringify((st.fat||{}).files||{}).slice(0,600));tlLastFat=fe;
  const el=$("netStatus");let cls,txt;
  const pend=(st.pending||0),fp=(st.fatPending||0);
  if(!navigator.onLine){cls="off";txt=pend?"Offline · "+pend+(pend===1?" modifica da inviare":" modifiche da inviare"):"Offline";}
  else if(st.error==="no_auth"){cls="off";txt="Dropbox scollegato";}
  else if(st.error==="scope"){cls="off";txt="Permessi Dropbox mancanti";}
  else if(st.error==="busy"){cls="sync";txt="Dropbox occupato, riprovo…";}
  else if(st.error==="day"){cls="off";txt="Non riesco a salvare un giorno: riprovo";}
  else if(st.syncing||pend){cls="sync";txt="Sincronizzazione…";}
  else if(st.error){cls="off";txt="Dropbox non raggiungibile";}
  else if(fp){cls="sync";txt="Sincronizzato · fatturato: "+fp+" in attesa";}
  else{cls="on";txt="Sincronizzato";}
  if(st.storage==="full"&&!renderNet._warned){renderNet._warned=1;notify("Il browser non riesce più a salvare la copia dell'agenda su questo dispositivo (spazio pieno): le prenotazioni restano in Dropbox, ma senza rete l'agenda potrebbe non aprirsi. Libera spazio sul dispositivo.",true);}
  el.className="net "+cls;el.textContent=txt;el.hidden=false;el.title=st.error?((st.error||"")+" "+(st.errorDetail||"")).trim():"";
  {const e2=$("sdNet");e2.className=el.className;e2.textContent=txt;e2.hidden=false;}
  // stato del fatturato
  const f=st.fat,fs=$("fatStatus");if(!fs)return;
  const files=STORE.fatFiles(),ys=Object.keys(files).sort();
  let h,c="";
  if(!ys.length){h="Nessun file fatturato collegato. Sceglilo dal Menu › Collega file fatturato.";c="err";}
  else{
    // esito dell'ultimo aggiornamento, file per file
    const errs=[],oks=[];
    if(f&&f.files)for(const y of ys){const r=f.files[y];if(!r)continue;const n="<b>"+esc(files[y].name)+"</b>";
      if(r.ok)oks.push(n+" aggiornato "+esc(fmtTime(r.at)));
      else errs.push(r.error==="missing"?"non trovo più "+n+" in Dropbox: collegalo di nuovo dal Menu":
        r.error==="nosheet"?"in "+n+" non c'è il foglio \"agenda\"":
        r.error==="badxlsx"?n+" non è un file Excel valido o è arrivato incompleto: non l'ho toccato. Aprilo con Excel, salvalo di nuovo e riprova":
        r.error==="toobig"?n+" è troppo grande o costruito in modo anomalo: non l'ho aperto":
        n+": aggiornamento non riuscito, riprovo tra poco");}
    const pend=st.fatPending?st.fatPending+(st.fatPending===1?" riga da scrivere nel fatturato":" righe da scrivere nel fatturato"):"";
    // con righe in attesa si dice anche PERCHÉ non vengono scritte (prima restava solo «righe da scrivere…»)
    if(pend&&errs.length&&navigator.onLine){h=pend+": "+errs.join(" · ")+".";c="err";}
    else if(pend){h=pend+(navigator.onLine?"…":" appena torna la connessione.");}
    else if(!f||!f.files){h="In attesa del primo aggiornamento del fatturato.";}
    else{h=oks.concat(errs).join(" · ")+".";c=f.ok?"ok":"err";}
  }
  fs.className="bill-status "+c;fs.innerHTML=h;
}
STORE.configure({
  onChange:refreshFromStore,
  onStatus:renderNet,
  onAccessChanged:()=>{if(!$("app").hidden&&!STORE.users)showGate("code",{msg:"Il codice di accesso è stato cambiato: inserisci quello nuovo."});},
  onUsersChanged:U=>onUsersChanged(U),
  actor:()=>{const s=ACC.session();return s?{uid:s.uid}:null;},
  onAutChanged:()=>{if(!$("ovMaster").hidden&&mstTab==="aut")renderAut();},
  onAuthLost:()=>showGate("link",{msg:"L'accesso a Dropbox è scaduto o è stato revocato: collegalo di nuovo."}),
  rowFor:b=>Object.assign(billRow(Object.assign({},b,{start:b.start})),{tour:cashOn(b)||!!b.bustaOff}), // «tour»: si scrivono anticipo e busta (AH/AI/AJ)
  onMinVer:()=>checkMinVer(),
  onClientAdded:(tmp,info)=>onClientAdded(tmp,info),
  onClientEdited:(q,x)=>onClientEdited(q,x),
  onClientError:(c,q)=>{ACC.tlog("errore","Cliente non scritto nel fatturato: "+c+" «"+((q&&q.name)||"")+"»");notify((c==="codeexists"?"Codice Multi già usato nel file ("+cliErrText(q)+")":c==="noclienti"?"Nel file fatturato non trovo il foglio «clienti»":c==="noname"?"Manca la ragione sociale":"Errore nel file fatturato")+": il cliente «"+((q&&q.name)||"")+"» non è stato scritto. "+(c==="codeexists"?"Correggilo":"Puoi riprovare o annullarlo")+" da Clienti.",true);if(!$("ovClients").hidden)renderClients();},
  onNotice:onNotice
});
// avvisi importanti: restano in alto finché non li chiudi
function notify(msg,sticky){
  if(!sticky){toast(msg);return;}
  const b=$("invio").hidden?$("banner"):$("sdBanner");const d=document.createElement("div");d.className="bn";d.innerHTML='<span></span><button type="button" aria-label="Chiudi avviso">×</button>';d.firstChild.textContent=msg;
  d.lastChild.onclick=()=>{d.remove();b.hidden=!b.children.length;};b.appendChild(d);b.hidden=false;
}
function itD(d){return d?(+d.slice(8,10))+"/"+d.slice(5,7)+"/"+d.slice(0,4):"";}
function onNotice(n){
  if(n.kind==="moveKept"){notify("La prenotazione «"+(n.client||"")+"» del "+itD(n.date)+" NON è stata spostata: nel frattempo il capo ha deciso bus e autisti, oppure il foglio è stato inviato all'autista. Riaprila e, se serve, spostala di nuovo.",true);return;}
  if(n.kind==="sentKept"){notify("Il foglio di «"+(n.client||"")+"» del "+itD(n.date)+": nel frattempo il capo ha deciso bus e autisti. Il foglio va inviato da lui.",true);return;}
  if(n.kind==="delSent"){if(n.b)withdrawAfterDelete(n.b);return;}
  ACC.tlog(n.kind==="badfile"||n.kind==="badcfg"?"errore":"avviso","Avviso sincronizzazione: "+n.kind+(n.date?" "+n.date:"")+(n.client?" «"+n.client+"»":""),n.from?n.from+" → "+n.to:(n.path||""));
  const who=n.client?"«"+n.client+"»":"una prenotazione";
  if(n.kind==="gone")notify("La prenotazione "+who+" del "+itD(n.date)+" era stata eliminata o spostata da un altro dispositivo: la tua modifica non è stata salvata. Controlla e, se serve, ripetila.",true);
  else if(n.kind==="delGone")notify("La prenotazione "+who+" non è stata eliminata: nel frattempo un altro dispositivo l'aveva spostata su un altro giorno. Controlla e, se serve, eliminala di nuovo.",true);
  else if(n.kind==="merged")toast("Prenotazione "+who+" modificata anche da un altro dispositivo: ho unito le modifiche.");
  else if(n.kind==="renumbered"){
    // avviso fisso solo se un foglio di servizio con il numero vecchio è già uscito (salvato o inviato)
    const out=sheetsOut[n.id]===n.from;
    notify("Il n. foglio di "+who+" del "+itD(n.date)+" è cambiato da "+n.from+" a "+n.to+" (un altro operatore aveva appena usato lo stesso numero)."+(out?" Hai già salvato o inviato il foglio di servizio con il numero vecchio: rimandalo.":""),out);
    refreshSheetBooking();}
  else if(n.kind==="extraMerged")toast("Autisti extra del "+itD(n.date)+": uniti al testo scritto da un altro dispositivo.");
  else if(n.kind==="badfile")notify("Il file del giorno "+itD(n.date)+" in Dropbox era rovinato: ho tenuto l'ultima versione buona (una copia del file rovinato è in config › file-rovinati).",true);
  else if(n.kind==="badcfg")notify("Il file "+(n.path||"di configurazione")+" in Dropbox non è valido (forse è stato modificato a mano): continuo con l'ultima versione buona. Per sistemarlo: su dropbox.com apri il file › Cronologia delle versioni e ripristina una versione precedente.",true);
}
// extra: per le prenotazioni {edit, base, patch, move}; per le eliminazioni {move: nuova data}
// Conferma (o rimette in sospeso) una prenotazione con un clic sul riquadro della vista Giorno.
// Si scrive solo lo stato: le modifiche fatte intanto da altri sugli altri campi restano.
function toggleConfirm(id,start){
  if(S.readOnly){toast("Accesso in sola lettura");return;}
  const doc=S.days[start],cur=doc&&doc.bookings&&doc.bookings[id];if(!cur){toast("La prenotazione non c'è più (eliminata o spostata).");return;}
  const was=pending(cur),b=Object.assign({},cur,{status:was?"confermato":"opzione",updatedAt:new Date().toISOString(),updBy:meName()});
  try{
    writeDayOps(start,{bookings:{[id]:b}},{edit:true,only:true,base:cur.updatedAt||null,patch:["status","updBy"]});
    ACC.log("prenotazione",(was?"Confermata":"Rimessa in sospeso")+" la prenotazione "+bookingLabel(Object.assign({start},b)),{id,ch:[["Stato",was?"in sospeso":"confermato",was?"confermato":"in sospeso"]]});
    renderAll();toast(was?"Prenotazione confermata":"Prenotazione rimessa in sospeso");
  }catch(err){handleErr(err);}
}
// quello che questo dispositivo sa della scelta del capo e dell'invio di una prenotazione (per spostamenti ed eliminazioni)
function knowOf(b){return {c:(b&&b.capo&&b.capo.at)||"",s:b&&b.sent?(b.sent.at||"")+"|"+((b.sent.off&&b.sent.off.at)||""):""};}
function writeDayOps(date,patch,extra){
  const ops=[];extra=extra||{};
  if(patch.bookings)for(const k in patch.bookings)ops.push(patch.bookings[k]===null?Object.assign({t:"del",id:k},extra.move&&typeof extra.move==="string"?{move:extra.move}:{},extra.client!=null?{client:extra.client}:{},extra.know?{know:extra.know}:{}):Object.assign({t:"put",id:k,b:patch.bookings[k],assign:!!patch.assign},extra));
  if("extra" in patch)ops.push({t:"extra",v:patch.extra,base:patch.base==null?null:patch.base});
  STORE.mutateDay(date,ops);
}
$("billSync").onclick=async()=>{billMsg("Aggiorno…");await STORE.pull();await STORE.flush();await STORE.syncFatturato();const f=STORE.fat;billMsg(f&&f.ok?"Fatturato aggiornato.":"Non riesco ad aggiornare il fatturato adesso: riprovo da solo più tardi.",f&&f.ok?"ok":"err");};

// ---------- codice di accesso (impronta PBKDF2 salvata in Dropbox) ----------
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function pbkdf2(code,salt,iter){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(code),"PBKDF2",false,["deriveBits"]);return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new TextEncoder().encode(salt),iterations:iter},k,256));}
async function makeAccess(code){const salt=hex(crypto.getRandomValues(new Uint8Array(16)));const iter=150000;return {salt,iter,hash:await pbkdf2(code,salt,iter),at:new Date().toISOString()};}
async function checkCode(code){const a=STORE.access;if(!a||typeof a.hash!=="string"||typeof a.salt!=="string")return false;const it=a.iter==null?150000:Number(a.iter);if(!Number.isInteger(it)||it<STORE.ITER_MIN||it>STORE.ITER_MAX)return false;return (await pbkdf2(String(code),a.salt,it))===a.hash;}

// ---------- schermata iniziale: collegamento, file fatturato, codice ----------
let gateMode="";
function showGate(mode,o){
  o=o||{};gateMode=mode;
  $("gate").hidden=false;$("app").hidden=true;$("invio").hidden=true;
  closeOverlays();
  if(typeof hsClose==="function")hsClose();
  ["gLink","gLoad","gFat","gCode","gMaster","gLogin","gHid","gSuper","gRecShow","gRec"].forEach(id=>$(id).hidden=true);
  $("gMsg").textContent=o.msg||"";$("gMsg").className="gate-msg"+(o.ok?" ok":"");
  if(mode==="link"){$("gTitle").textContent="Collega Dropbox";$("gLink").hidden=false;$("gKeyMissing").hidden=DBX.hasKey();$("gLinkBtn").hidden=!DBX.hasKey();}
  else if(mode==="loading"){$("gTitle").textContent=o.title||"Un momento…";$("gLoad").hidden=false;$("gLoadTxt").textContent=o.text||"";$("gRetry").hidden=true;$("gRelink").hidden=true;$("gErr").hidden=true;$("gHere").hidden=true;}
  else if(mode==="fatturato"){$("gTitle").textContent="Scegli il file fatturato";$("gFat").hidden=false;$("gFatLater").hidden=!!o.fromMenu&&false;gateFromMenu=!!o.fromMenu;if(!$("gFatQ").value)$("gFatQ").value="fatturato";searchFat();}
  else if(mode==="code-create"||mode==="code"){
    $("gCode").hidden=false;const create=mode==="code-create";
    $("gTitle").textContent=create?"Crea il codice di accesso":"Inserisci il codice";
    $("gCodeSub").textContent=create?"Almeno 6 caratteri. Varrà su tutti i Mac e i telefoni collegati a questo Dropbox.":"L'agenda funziona anche senza connessione.";
    $("gCode2Wrap").hidden=!create;$("gCodeIn").value="";$("gCode2").value="";setTimeout(()=>$("gCodeIn").focus(),60);
  }
  else if(mode==="master-create"){
    $("gTitle").textContent="Crea l'account Master";$("gMaster").hidden=false;gateNeedOld=!!o.needOld;$("gmOldWrap").hidden=!gateNeedOld;
    ["gmOld","gmName","gmPw","gmPw2"].forEach(id=>$(id).value="");setTimeout(()=>$(gateNeedOld?"gmOld":"gmName").focus(),60);
  }
  else if(mode==="login"){
    $("gTitle").textContent="Chi sei?";$("gLogin").hidden=false;$("gPw").value="";
    const last=(()=>{try{return localStorage.getItem("agenda-last-user")||"";}catch(_){return "";}})();
    const U=STORE.users;loginUid=U&&U.users[last]&&U.users[last].active!==false?last:null;
    renderWho();$("gDev").textContent="Dispositivo: "+(ACC.devLabel(ACC.device.id)||ACC.device.auto);
    setTimeout(()=>{if(loginUid)$("gPw").focus();},60);
  }
  else gateSuper(mode,o);
}
function closeOverlays(){
  ["ovBooking","ovFleet","ovMenu","ovSheet","ovClients","ovClientNew","ovMaster","ovArch","ovReg","ovInv","ovInvList","ovCont","ovSpese","ovQr","ovCapo"].forEach(id=>{const x=$(id);if(x)x.hidden=true;});try{closeCapo();}catch(_){}try{$("recOut").textContent="";$("recShown").hidden=true;}catch(_){}INV=null;CT=null;ctOrig=null;ctDirty=false;invPending=null;invSel.clear();
  if(typeof spClosePhoto==="function")spClosePhoto();
}
let gateFromMenu=false;
$("gLinkBtn").onclick=async()=>{try{await DBX.startLogin();}catch(e){$("gMsg").textContent="Configurazione mancante: manca la chiave dell'app Dropbox in config.js.";}};
async function searchFat(){
  const q=$("gFatQ").value.trim()||"fatturato";
  $("gFatList").innerHTML='<p class="gate-sub">Cerco in Dropbox…</p>';
  try{
    const res=await DBX.search(q,"xlsx");
    $("gFatList").innerHTML=res.length?res.map((f,i)=>'<button type="button" class="gate-file" data-fi="'+i+'"><b>'+esc(f.name)+'</b><span>'+esc(f.path_display)+'</span></button>').join(""):'<p class="gate-sub">Nessun file Excel trovato con "'+esc(q)+'". Prova un altro nome.</p>';
    $("gFatList").__res=res;
  }catch(e){$("gFatList").innerHTML='<p class="gate-sub">Ricerca non riuscita. Controlla la connessione e riprova.</p>';}
}
$("gFatForm").addEventListener("submit",e=>{e.preventDefault();searchFat();});
$("gFatList").addEventListener("click",async e=>{
  const b=e.target.closest("[data-fi]");if(!b)return;const f=$("gFatList").__res[+b.dataset.fi];
  $("gMsg").textContent="Collego "+f.name+"…";
  try{
    await STORE.linkFatturato(f.path_display,f.name);
    ACC.log("impostazioni","Collegato il file fatturato «"+f.name+"»");
    await STORE.syncFatturato();
    const L=STORE.lists||{};refreshFromStore();
    const n=L.clients?L.clients.length:0;
    if(gateFromMenu){hideGate();toast("File fatturato collegato"+(n?": "+n.toLocaleString("it-IT")+" clienti":""));return;}
    afterSync({msg:n?"Letti "+n.toLocaleString("it-IT")+" clienti dal fatturato.":"",ok:true});
  }catch(err){$("gMsg").textContent="Non riesco a leggere questo file. Controlla che sia il fatturato (.xlsx) e riprova.";}
});
$("gFatLater").onclick=()=>{if(gateFromMenu){hideGate();return;}sessionStorage.setItem("fat-later","1");afterSync();};
$("gCodeShow").onclick=()=>{const show=$("gCodeIn").type==="password";$("gCodeIn").type=$("gCode2").type=show?"text":"password";$("gCodeShow").textContent=show?"Nascondi":"Mostra";};
$("gCodeForm").addEventListener("submit",async e=>{
  e.preventDefault();const code=$("gCodeIn").value,btn=$("gCodeBtn");
  if(code.length<6){$("gMsg").textContent="Il codice deve avere almeno 6 caratteri.";return;}
  btn.disabled=true;$("gMsg").textContent="";
  try{
    if(gateMode==="code-create"){
      if(code!==$("gCode2").value){$("gMsg").textContent="I due codici non coincidono.";return;}
      if(!navigator.onLine){$("gMsg").textContent="Per creare il codice serve la connessione a internet.";return;}
      try{await STORE.createAccess(await makeAccess(code));}
      catch(err){if(err&&err.code==="exists"){showGate("code",{msg:"Il codice di accesso esiste già: inserisci quello aziendale."});return;}throw err;}
      unlocked();
    }else if(await checkCode(code))unlocked();
    else{$("gMsg").textContent="Codice errato.";$("gCodeIn").select();}
  }catch(_){$("gMsg").textContent="Operazione non riuscita. Controlla la connessione e riprova.";}
  finally{btn.disabled=false;}
});
// dopo l'accesso: l'agenda, oppure (profilo «solo anteprima e invio») la schermata con l'elenco dei fogli
function hideGate(){const iv=isInvio();$("gate").hidden=true;$("app").hidden=iv;$("invio").hidden=!iv;if(iv)renderInvio();else renderAll();renderNet();}
let started=false;
function unlocked(){
  hideGate();applyRole();refreshFromStore();lastAct=Date.now();
  if(!started){started=true;STORE.flush();STORE.syncFatturato();STORE.watch();ACC.startBeat();autStart();ACC.tlog("info","Avvio della versione "+APP_VERSION+" su "+(ACC.devLabel(ACC.device.id)||ACC.device.auto));}
  ACC.beat();ACC.flushLog();
  setTimeout(()=>{if(isInvio()||!ACC.session())return;seedRegs();flushRegAdd();},2500);
  autAfterRedirect();(STORE.aut?Promise.resolve():STORE.loadAut()).then(()=>AUT.sync());
  // versione minima (2.6): questa versione la alza; se su Dropbox ce n'è già una più nuova la pagina smette di scrivere
  STORE.loadMinVer().then(()=>{checkMinVer();if(!S.outdated&&!S.readOnly)return STORE.raiseMinVer(APP_VERSION);}).catch(()=>{});
}
function checkMinVer(){
  const mv=STORE.minVer();
  if(!mv||S.outdated||STORE.verCmp(APP_VERSION,mv)>=0)return;
  S.outdated=true;STORE.setOutdated(true);S.readOnly=true;
  showBanner("Su Dropbox c'è già la versione "+mv+" dell'agenda e questa pagina è ancora alla "+APP_VERSION+": chiudila e riaprila (o ricaricala) per continuare. Finché non la aggiorni non salva niente.");
  ACC.tlog("avviso","Pagina con una versione vecchia: "+APP_VERSION+" (su Dropbox "+mv+"): non salva più",String(mv));
  try{if(isInvio())renderInvio();else renderAll();}catch(_){}
}
// Dalla 1.8: ognuno entra con nome e password (config/utenti.json). Se l'elenco utenti non c'è ancora,
// si crea il Master: serve il codice di accesso usato finora (se c'era), così non può farlo chiunque.
async function afterSync(o){
  o=o||{};
  let U=STORE.users;
  if(!U){
    if(!navigator.onLine){showGate("loading",{title:"Connessione necessaria",text:"Il primo accesso con la versione "+APP_VERSION+" richiede internet: collegati e premi Riprova."});$("gRetry").hidden=false;return;}
    try{U=await STORE.fetchUsers();}
    catch(e){
      if(e&&e.code==="badusers"){ACC.tlog("errore","Elenco utenti non valido in Dropbox (config/utenti.json)");showGate("loading",{title:"Elenco utenti non valido",text:"In Dropbox il file config/utenti.json non si legge o non contiene utenti validi (forse è stato modificato a mano). Su dropbox.com apri il file › Cronologia delle versioni e ripristina una versione precedente, poi premi Riprova."});}
      else showGate("loading",{title:"Dropbox non risponde",text:"Non riesco a leggere l'elenco degli utenti da Dropbox. Premi Riprova tra qualche secondo."});
      $("gRetry").hidden=false;return;}
    if(!U){
      let a=STORE.access;
      if(!a){try{a=await STORE.fetchAccess();}catch(_){showGate("loading",{title:"Dropbox non risponde",text:"Non riesco a leggere il codice di accesso da Dropbox. Premi Riprova tra qualche secondo."});$("gRetry").hidden=false;return;}}
      showGate("master-create",Object.assign({},o,{needOld:!!a}));return;
    }
  }
  const s=ACC.session(),why=ACC.sessionProblem(s,U);
  if(!why){ACC.refreshSession(U);enterApp();return;}
  if(why==="blocked"){blockedDevice();return;}
  showGate("login",Object.assign({},o,{msg:o.msg||reasonMsg(why)}));
}
// il Master sceglie il file fatturato, se non è ancora collegato; gli utenti entrano comunque
function enterApp(){
  if(isMaster()&&!Object.keys(STORE.fatFiles()).length&&navigator.onLine&&!sessionStorage.getItem("fat-later")){showGate("fatturato",{});return;}
  unlocked();
}

// ---------- menu ----------
function menuPane(name){
  ["mMain","mPw","mUnlink"].forEach(id=>{$(id).hidden=id!==name;});
  if(name==="mUnlink"){const n=STORE.pending;$("unlinkPend").textContent=n?"Attenzione: su questo dispositivo "+(n===1?"c'è 1 modifica non ancora inviata, che andrà persa.":"ci sono "+n+" modifiche non ancora inviate, che andranno perse.")+" Se puoi, collegati prima a internet e attendi «Sincronizzato».":"";$("unlinkPend").hidden=!n;}
  $("menuMsg").textContent="";
  document.querySelector("#menuFoot .back").hidden=name==="mMain";
  $("pwGo").hidden=name!=="mPw";$("unlinkGo").hidden=name!=="mUnlink";if(name==="mPw")$("mPw").reset();
}
$("btnMenu").onclick=()=>{
  const s=STORE.settings||{};
  const ff=STORE.fatFiles(),fy=Object.keys(ff).sort();
  $("menuInfo").innerHTML="Versione <b>"+APP_VERSION+"</b> del "+APP_DATE+". Dati nella cartella Dropbox <b>"+esc(STORE.BASE)+"</b>. Fatturato: "+(fy.length?fy.map(y=>(y==="*"?"":y+" → ")+"<b>"+esc(ff[y].name)+"</b>").join(", "):"<b>non collegato</b>")+".";
  const me=ACC.session();if(me)$("menuInfo").innerHTML="Sei entrato come <b>"+esc(me.name)+"</b>"+(me.role==="super"?" (Super Master)":me.role==="master"?" (Master)":"")+". "+$("menuInfo").innerHTML;
  applyRole();menuPane("mMain");$("ovMenu").hidden=false;
};
$("whoAmI").onclick=()=>$("btnMenu").click();
$("mClose").onclick=()=>{$("ovMenu").hidden=true;};
document.querySelectorAll("[data-pane]").forEach(b=>{b.onclick=()=>menuPane(b.dataset.pane);});
$("mLock").onclick=()=>doLogout();
$("mFat").onclick=()=>{if(!navigator.onLine){$("menuMsg").textContent="Serve la connessione a internet.";return;}showGate("fatturato",{fromMenu:true});};
$("mSync").onclick=async()=>{$("menuMsg").textContent="Aggiorno…";await STORE.pull();await STORE.flush();await STORE.syncFatturato();await AUT.sync();$("menuMsg").textContent=navigator.onLine?"Fatto.":"Sei offline: le modifiche partiranno appena torna la connessione.";};
// cambio della propria password
$("mPw").addEventListener("submit",async e=>{
  e.preventDefault();const me=ACC.session(),U=STORE.users,u=me&&U&&U.users[me.uid];
  const o=$("pwOld").value,n1=$("pwNew").value,n2=$("pwNew2").value,msg=$("menuMsg");
  if(!u){msg.textContent="Esci e rientra, poi riprova.";return;}
  if(n1.length<6){msg.textContent="La nuova password deve avere almeno 6 caratteri.";return;}
  if(n1!==n2){msg.textContent="Le due nuove password non coincidono.";return;}
  if(!navigator.onLine){msg.textContent="Per cambiare la password serve la connessione a internet.";return;}
  if(!(await ACC.checkPw(u,o))){msg.textContent="La password attuale è errata.";return;}
  $("pwGo").disabled=true;
  try{await setOwnPassword(n1);$("mPw").reset();$("ovMenu").hidden=true;ACC.log("utenti","Ha cambiato la propria password");toast("Password cambiata");}
  catch(_){msg.textContent="Non riesco a salvare la nuova password. Riprova.";}
  finally{$("pwGo").disabled=false;}
});
$("unlinkGo").onclick=async()=>{ACC.log("dispositivi","Ha scollegato questo dispositivo da Dropbox");await ACC.flushLog();await ACC.beat("scollegato");ACC.logout();DBX.unlink();await STORE.reset();try{localStorage.removeItem("agenda-view");}catch(_){}location.reload();};

// ---------- utenti: accesso con nome e password (1.8) ----------
let gateNeedOld=false,loginUid=null,pwChanging=null,lastAct=Date.now();
// Ruoli: "utente", "master", e dalla 2.5 "super" (Super Master: può tutto quello che può un Master, più gli
// account dei Master e i telefoni degli autisti) e "invio" (solo anteprima e invio dei fogli agli autisti).
function myRole(){const s=ACC.session();return s?s.role:"";}
function isSuper(){return myRole()==="super";}
function isInvio(){return myRole()==="invio";}
function isMaster(){const r=myRole();return r==="master"||r==="super";}
const ROLE_LBL={super:"Super Master",master:"Master",utente:"Utente",invio:"Solo anteprima e invio"};
// cosa possono fare gli utenti normali (lo decide il Master nelle Impostazioni; di serie tutto permesso)
function canEdit(kind){if(isMaster())return true;const p=((STORE.settings||{}).perms)||{};return p[kind]!==false;}
function meName(){const s=ACC.session();return s&&s.role!=="super"?s.name:"";}
// nome vero, anche per il Super Master: si usa solo nei dati che vede soltanto lui (scheda Autisti)
function suName(){const s=ACC.session();return s?s.name:"";}
function reasonMsg(why){return {removed:"Il tuo account è stato eliminato dal Master.",disabled:"Il tuo account è stato disattivato dal Master.",password:"La password è stata cambiata: entra con quella nuova.",kicked:"Il Master ha disconnesso questo dispositivo: entra di nuovo con la tua password."}[why]||"";}
function applyRole(){
  const s=ACC.session(),sup=!!s&&s.role==="super",m=!!s&&(s.role==="master"||sup);
  document.body.classList.toggle("is-master",m);document.body.classList.toggle("is-super",sup);
  $("whoAmI").hidden=!s;if(s){$("whoAmI").textContent=s.name+(sup?" · Super Master":m?" · Master":"");$("whoAmI").className="whoami"+(m?" m":"");}
  document.querySelectorAll(".mst-only").forEach(el=>{el.hidden=!m;});
  document.querySelectorAll(".sup-only").forEach(el=>{el.hidden=!sup;});
  $("mstTitle").textContent=sup?"Pannello Super Master":"Pannello Master";
  $("mMaster").firstElementChild.textContent=sup?"Pannello Super Master":"Pannello Master";
}
// utenti validi dell'elenco (oggetti con un nome): un file scritto male non rompe «Chi sei?» né il Pannello Master
function userEntries(U){const m=U&&U.users;return m&&typeof m==="object"&&!Array.isArray(m)?Object.entries(m).filter(([,u])=>u&&typeof u==="object"&&typeof u.name==="string"&&u.name):[];}
function renderWho(){
  const U=STORE.users||{users:{}};
  const list=userEntries(U).filter(([,u])=>u.active!==false&&u.role!=="super").sort((a,b)=>a[1].name.localeCompare(b[1].name,"it"));
  const ini=n=>String(n||"").trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("")||"?";
  $("gWho").innerHTML=list.map(([id,u])=>'<button type="button" role="radio" data-uid="'+esc(id)+'" aria-checked="'+(id===loginUid)+'"><span class="av" aria-hidden="true">'+esc(ini(u.name))+'</span><span class="wn">'+esc(u.name)+(u.role==="master"?'<small>Master</small>':u.role==="invio"?'<small>Invio fogli</small>':'')+'</span></button>').join("")||'<p class="gate-sub">Nessun utente attivo.</p>';
}
$("gWho").addEventListener("click",e=>{const b=e.target.closest("[data-uid]");if(!b)return;loginUid=b.dataset.uid;renderWho();$("gMsg").textContent="";$("gPw").focus();});
$("gPwShow").onclick=()=>{const show=$("gPw").type==="password";$("gPw").type=show?"text":"password";$("gPwShow").textContent=show?"Nascondi":"Mostra";};
$("gLoginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const U=STORE.users,u0=U&&loginUid&&U.users[loginUid],u=u0&&u0.role!=="super"?u0:null,btn=$("gLoginBtn");
  if(!u){$("gMsg").textContent="Scegli il tuo nome.";return;}
  const w=ACC.failWait();if(w){$("gMsg").textContent="Troppi tentativi sbagliati: riprova tra "+w+" secondi.";return;}
  if(!$("gPw").value){$("gMsg").textContent="Scrivi la password.";$("gPw").focus();return;}
  btn.disabled=true;
  try{
    if(await ACC.checkPw(u,$("gPw").value)){
      ACC.failReset();ACC.login(u,loginUid);try{localStorage.setItem("agenda-last-user",loginUid);}catch(_){}
      $("gPw").value="";ACC.log("accesso","Accesso");enterApp();
    }else{
      ACC.failAdd();ACC.log("accesso","Password errata",{bad:1,uid:loginUid},u.name);ACC.flushLog();
      const w2=ACC.failWait();$("gMsg").textContent=w2?"Troppi tentativi sbagliati: riprova tra "+w2+" secondi.":"Password errata.";$("gPw").select();
    }
  }finally{btn.disabled=false;}
});
$("gMasterForm").addEventListener("submit",async e=>{
  e.preventDefault();const btn=$("gmBtn"),msg=$("gMsg");
  const name=cleanText($("gmName").value),pw=$("gmPw").value;
  if(gateNeedOld&&!(await checkCode($("gmOld").value))){msg.textContent="Il codice di accesso usato finora non è corretto.";$("gmOld").select();return;}
  if(name.length<3){msg.textContent="Scrivi il tuo nome e cognome.";$("gmName").focus();return;}
  if(pw.length<8){msg.textContent="La password del Master deve avere almeno 8 caratteri.";$("gmPw").focus();return;}
  if(pw!==$("gmPw2").value){msg.textContent="Le due password non coincidono.";return;}
  if(!navigator.onLine){msg.textContent="Serve la connessione a internet.";return;}
  btn.disabled=true;msg.textContent="";
  try{
    const now=new Date().toISOString(),uid="u"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    const U={v:1,users:{[uid]:Object.assign({name,role:"master",active:true,created:now,createdBy:""},await ACC.makeSecret(pw))},kicks:{},blocked:{},devices:{},createdAt:now};
    try{await STORE.createUsers(U);}
    catch(err){if(err&&err.code==="exists"){afterSync({msg:"L'account Master esiste già: entra con il tuo nome e la tua password."});return;}throw err;}
    ACC.login(U.users[uid],uid);try{localStorage.setItem("agenda-last-user",uid);}catch(_){}
    ACC.log("utenti","Creato l'account Master «"+name+"»");ACC.log("accesso","Accesso");
    enterApp();
  }catch(_){msg.textContent="Non riesco a creare l'account. Controlla la connessione e riprova.";}
  finally{btn.disabled=false;}
});
function doLogout(msg,why){
  ACC.log("accesso",why||"Uscita");ACC.logout();ACC.beat("uscito");ACC.flushLog();
  mstLog=null;mstDevs=null;mstTlog=null;
  applyRole();showGate("login",{msg:msg||""});
}
// l'elenco utenti è cambiato (da questo o da un altro dispositivo): la sessione vale ancora?
function onUsersChanged(U){
  const s=ACC.session();
  if(!s){if(!$("gLogin").hidden)renderWho();return;}
  if(pwChanging&&U.users[s.uid]&&U.users[s.uid].pwAt===pwChanging){s.pwAt=pwChanging;ACC.setSession(s);}
  const why=ACC.sessionProblem(s,U);
  if(why==="blocked"){blockedDevice();return;}
  if(why){doLogout(reasonMsg(why),why==="kicked"?"Disconnesso dal Master":why==="password"?"Uscita: password cambiata":why==="removed"?"Uscita: account eliminato":"Uscita: account disattivato");return;}
  const was=s.role;ACC.refreshSession(U);applyRole();
  // il ruolo è cambiato mentre era dentro (per esempio da utente a «solo invio»): schermata giusta, finestre chiuse
  if($("gate").hidden&&myRole()!==was&&(isInvio()||was==="invio")){closeOverlays();hideGate();return;}
  if(!isMaster()){$("ovMaster").hidden=true;if(!$("ovMenu").hidden)menuPane("mMain");}
  else{if(!isSuper()&&mstTab==="aut")mstTab="users";if(!$("ovMaster").hidden)setMasterTab(mstTab);}
}
async function setOwnPassword(pw){
  const me=ACC.session(),sec=await ACC.makeSecret(pw);pwChanging=sec.pwAt;
  try{await STORE.updateUsers(J=>{const x=J.users[me.uid];if(!x)return null;Object.assign(x,sec);return J;});const s=ACC.session();if(s){s.pwAt=sec.pwAt;ACC.setSession(s);}}
  finally{pwChanging=null;}
}
// dispositivo bloccato dal Master: si scollega da Dropbox e si cancellano i dati sul dispositivo
let blocking=false;
async function blockedDevice(){
  if(blocking)return;blocking=true;
  ACC.log("dispositivi","Dispositivo bloccato dal Master: scollegato da Dropbox");
  try{await ACC.flushLog();await ACC.beat("bloccato");}catch(_){}
  try{await DBX.revoke();}catch(_){}
  ACC.logout();DBX.unlink();await STORE.reset();try{AUT.forget();}catch(_){}ACC.forgetDevice();
  try{localStorage.removeItem("agenda-view");localStorage.removeItem("agenda-last-user");}catch(_){}
  applyRole();showGate("link",{msg:"Questo dispositivo è stato bloccato dal Master. Per usarlo di nuovo va ricollegato con l'account Dropbox dell'azienda."});
  blocking=false;
}
// uscita automatica dopo un periodo senza attività (impostazione del Master)
["pointerdown","keydown","wheel","touchstart"].forEach(t=>document.addEventListener(t,()=>{lastAct=Date.now();},{passive:true,capture:true}));
setInterval(()=>{
  const min=+((STORE.settings||{}).autoLock||0);
  if(!min||!ACC.session()||($("app").hidden&&$("invio").hidden)||formDirty())return;
  if(Date.now()-lastAct>min*60000)doLogout("Sei uscito automaticamente dopo "+(min<60?min+" minuti":(min/60)+(min===60?" ora":" ore"))+" senza attività.","Uscita automatica (inattività)");
},20000);

// ---------- registro: cosa è cambiato in una prenotazione ----------
const FIELD_LBL={type:"Categoria",vehicle:"Mezzo",start:"Data partenza",end:"Data rientro",time:"Ora partenza",time2:"Ora rientro",client:"Cliente",clientCode:"Codice cliente",route:"Itinerario",event:"Evento",escort:"Accompagnatore",pax:"Passeggeri",price:"Prezzo",park:"Parcheggi",parks:"Parcheggi scelti",meals:"Pasti",advance:"Acconto",envelope:"Busta",envno:"N. busta",driver:"1° autista",driver2:"2° autista",contact:"Telefono referente 1",contactName:"Referente 1",contactRole:"Ruolo referente 1",contactNote:"Note referente 1",dnotes:"Note per l'autista",status:"Stato",notes:"Note",saldo:"Saldo da ricevere",saldoAmt:"€ Saldo",npark:"Note 1° park",ndriver:"Note 2° autista",n3h:"Note 3° 3 ore",nextra:"Note 4° extra",refs:"Altri referenti",hotels:"Hotel",guides:"Guide",program:"Programma"};
function logVal(k,v){
  if(v===""||v==null||(Array.isArray(v)&&!v.filter(Boolean).length))return "—";
  if(k==="vehicle"){const vv=vehicle(v);return vv?vehLabel(vv):String(v);}
  if(k==="type")return TYPES[normType(v)]||v;
  if(k==="status")return v==="opzione"?"in sospeso":"confermato";
  if(k==="start"||k==="end")return itD(v);
  if(["price","park","meals","advance","saldoAmt"].includes(k))return "€ "+money(v);
  if(k==="refs"||k==="hotels"||k==="guides")return v.map(x=>[x.name,x.role?"("+x.role+")":"",x.addr,x.city,x.tel,x.note].filter(Boolean).join(" ")).join("; ").slice(0,200);
  if(k==="dnotes")return v.map(x=>[x.c,x.t].filter(Boolean).join(": ")).join("; ").slice(0,200);
  if(k==="parks")return v.map(x=>(x.nome||"senza parcheggio")+(x.amt!==""&&x.amt!=null?" € "+money(x.amt):"")).join("; ").slice(0,200);
  if(k==="program")return v.filter(Boolean).map(x=>String(x).replace(/\n/g," / ")).join(" | ").slice(0,160);
  const t=String(v).replace(/\s+/g," ");return t.length>120?t.slice(0,117)+"…":t;
}
function bookingLabel(b){const v=vehicle(b.vehicle)||{};return "«"+(b.client||"senza cliente")+"» "+(TYPES[normType(b.type)]||"")+" del "+itD(b.start)+(endOf(b)!==b.start?"–"+itD(endOf(b)):"")+" · "+(v.name||"")+(b.foglio?" · n. "+b.foglio:"");}
let lastExtraLog=null;
function logExtra(date,val){
  if(lastExtraLog&&lastExtraLog.date===date&&Date.now()-lastExtraLog.at<10*60000&&ACC.amend(lastExtraLog.e,{d:{txt:val.slice(0,400)}}))return;
  lastExtraLog={date,at:Date.now(),e:ACC.log("prenotazione","Autisti extra del "+itD(date),{txt:val.slice(0,400)})};
}

// ---------- pannello Master ----------
let mstTab="users",mstDevs=null,mstLog=null,mstLogKey="";
function mstMsg(t,err){$("mstMsg").textContent=t||"";$("mstMsg").className="mst-msg"+(err?" err":"");}
function openMaster(tab){
  if(!isMaster())return;
  $("ovMenu").hidden=true;$("ovMaster").hidden=false;mstMsg("");$("uForm").hidden=true;
  setMasterTab(tab||mstTab);
  loadDevices();
}
function setMasterTab(t){
  mstTab=t;
  document.querySelectorAll("[data-mt]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mt===t)));
  if(t==="aut"&&!isSuper())t="users";
  mstTab=t;
  document.querySelectorAll("[data-mt]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mt===t)));
  $("mtUsers").hidden=t!=="users";$("mtDevs").hidden=t!=="devs";$("mtLog").hidden=t!=="log";$("mtTlog").hidden=t!=="tlog";$("mtSet").hidden=t!=="set";$("mtAut").hidden=t!=="aut";
  renderMasterTab();
  if(t==="aut")AUT.sync();
  if(t==="log")loadLog();
  if(t==="tlog")loadTlog();
}
function renderMasterTab(){if(mstTab==="users")renderUsers();else if(mstTab==="devs")renderDevices();else if(mstTab==="log")renderLog();else if(mstTab==="tlog")renderTlog();else if(mstTab==="aut")renderAut();else renderSettings();}
document.querySelectorAll("[data-mt]").forEach(b=>b.onclick=()=>{mstMsg("");setMasterTab(b.dataset.mt);});
$("mMaster").onclick=()=>openMaster();
$("mstClose").onclick=()=>{$("ovMaster").hidden=true;};
function agoTxt(t){if(!t)return "";const m=Math.round((Date.now()-new Date(t))/60000);if(m<2)return "adesso";if(m<60)return m+" min fa";return fmtTime(t);}
async function loadDevices(){
  try{mstDevs=await ACC.devices();}catch(_){mstDevs=mstDevs||[];if(mstTab==="devs")mstMsg("Non riesco a leggere l'elenco dei dispositivi. Controlla la connessione.",true);}
  if(!$("ovMaster").hidden&&(mstTab==="devs"||mstTab==="users"))renderMasterTab();
}
function lastLoginOf(uid){let t="",dv="";for(const d of (mstDevs||[]))if(d.uid===uid&&d.loginAt&&d.loginAt>t){t=d.loginAt;dv=d.dev;}return t?{t,dv}:null;}
// chi può modificare un account: il Super Master tutti; un Master solo gli utenti normali
function canManage(u){return isSuper()||(!!u&&u.role==="utente");}
const ROLE_ORD={super:0,master:1,invio:2,utente:3},ROLE_PILL={super:" s",master:" m",invio:" i",utente:""};
function renderUsers(){
  const U=STORE.users||{users:{}},me=ACC.session()||{},sup=isSuper();
  // il Super Master compare solo a se stesso
  const list=userEntries(U).filter(([,u])=>sup||u.role!=="super").sort((a,b)=>(ROLE_ORD[a[1].role]-ROLE_ORD[b[1].role])||a[1].name.localeCompare(b[1].name,"it"));
  const supNames=new Set(userEntries(U).filter(([,u])=>u.role==="super").map(([,u])=>norm(u.name)));
  $("uSub").innerHTML=sup?"Da qui gestisci <b>tutti gli account</b>: Master, utenti e profilo «solo anteprima e invio». I Master possono creare e modificare solo gli utenti normali.":"Ognuno entra con il proprio nome e la propria password. Gli <b>utenti</b> lavorano sull'agenda; il <b>Master</b> vede anche questo pannello. Da qui gestisci gli <b>utenti normali</b>; gli altri account non si modificano da questo pannello.";
  $("uList").innerHTML=list.map(([id,u])=>{
    const ll=lastLoginOf(id),on=(mstDevs||[]).some(d=>d.uid===id&&d.state==="attivo"&&Date.now()-new Date(d.last)<20*60000);
    return '<div class="u-row"><div><b>'+esc(u.name)+'</b>'+(id===me.uid?' <span class="pill">tu</span>':'')+'<small>'+(u.created?"creato il "+esc(itD(String(u.created).slice(0,10)))+(u.createdBy&&(sup||!supNames.has(norm(u.createdBy)))?" da "+esc(u.createdBy):""):"")+'</small></div>'+
      '<div><span class="pill'+ROLE_PILL[u.role]+'">'+esc(ROLE_LBL[u.role])+'</span></div>'+
      '<div><span class="pill '+(u.active===false?"off":"on")+'">'+(u.active===false?"Disattivato":on?"Collegato ora":"Attivo")+'</span></div>'+
      '<div><small>Ultimo accesso</small>'+(ll?esc(fmtTime(ll.t))+'<small>'+esc(ACC.devLabel(ll.dv)||devAuto(ll.dv))+'</small>':'<small>—</small>')+'</div>'+
      '<div class="row-act">'+(canManage(u)?'<button type="button" class="btn" data-uedit="'+esc(id)+'">Modifica</button>':'<small>non modificabile da qui</small>')+'</div></div>';
  }).join("");
}
function devAuto(id){const d=(mstDevs||[]).find(x=>x.dev===id);return d?d.auto:"";}
let uEditing=null;
function openUserForm(id){
  const U=STORE.users||{users:{}},u=id?U.users[id]:null,sup=isSuper();
  if(u&&!canManage(u)){mstMsg("Questo account non si modifica da qui.",true);return;}
  uEditing=id||null;
  $("uFormTitle").textContent=u?"Modifica «"+u.name+"»":"Nuovo utente";
  // ruolo: un Master crea solo utenti normali; il ruolo del Super Master non si cambia
  const rs=$("uRole"),own=u&&u.role==="super";
  let so=rs.querySelector('option[value="super"]');if(own&&!so){so=document.createElement("option");so.value="super";so.textContent="Super Master";rs.appendChild(so);}else if(!own&&so)so.remove();
  [...rs.options].forEach(o=>{o.disabled=!sup&&o.value!=="utente";});rs.disabled=!sup||own;
  $("uName").value=u?u.name:"";rs.value=u?u.role:"utente";$("uActive").checked=u?u.active!==false:true;$("uActive").disabled=!!own;
  $("uPw").value=u?"":ACC.genPassword();$("uPwLbl").textContent=u?"Nuova password":"Password da comunicare";$("uPw").placeholder=u?"lascia vuoto per non cambiarla":"";
  $("uDel").hidden=!u||id===(ACC.session()||{}).uid||own;$("uNote").textContent="";
  $("uForm").hidden=false;$("uName").focus();
}
$("uNew").onclick=()=>openUserForm(null);
$("uList").addEventListener("click",e=>{const b=e.target.closest("[data-uedit]");if(b)openUserForm(b.dataset.uedit);});
$("uGen").onclick=()=>{$("uPw").value=ACC.genPassword();};
$("uCancel").onclick=()=>{$("uForm").hidden=true;uEditing=null;};
const LAST_MASTER="Non salvato: deve restare almeno un Master attivo. Un altro Master è stato appena tolto o disattivato da un altro dispositivo: controlla l'elenco aggiornato.";
const NOT_ALLOWED="Non salvato: questo account non si modifica da questo pannello.";
function mastersLeft(J,exceptId){return userEntries(J).filter(([id,u])=>id!==exceptId&&u.role==="master"&&u.active!==false).length;}
$("uForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const name=cleanText($("uName").value),role=$("uRole").value,active=$("uActive").checked,pw=$("uPw").value.trim(),me=ACC.session(),note=$("uNote");
  const U=STORE.users||{users:{}},id=uEditing,old=id?U.users[id]:null;
  if(name.length<2){note.textContent="Scrivi nome e cognome.";return;}
  if(userEntries(U).some(([k,u])=>k!==id&&(isSuper()||u.role!=="super")&&norm(u.name)===norm(name))){note.textContent="Esiste già un utente con questo nome.";return;}
  if(!old&&pw.length<6){note.textContent="La password deve avere almeno 6 caratteri.";return;}
  if(old&&pw&&pw.length<6){note.textContent="La nuova password deve avere almeno 6 caratteri.";return;}
  if(!isSuper()&&(role!=="utente"||(old&&old.role!=="utente"))){note.textContent="Da questo pannello si gestiscono solo gli utenti normali.";return;}
  if(old&&old.role==="super"&&role!=="super"){note.textContent="Il ruolo del Super Master non si cambia.";return;}
  if(role==="super"&&!(old&&old.role==="super")){note.textContent="Il Super Master è uno solo.";return;}
  if(id===me.uid&&(role!==old.role||!active)){note.textContent="Non puoi cambiare il tuo ruolo né disattivarti.";return;}
  if(old&&old.role==="master"&&(role!=="master"||!active)&&!mastersLeft(U,id)){note.textContent="Deve restare almeno un Master attivo.";return;}
  if(!navigator.onLine){note.textContent="Serve la connessione a internet.";return;}
  $("uSave").disabled=true;
  try{
    const sec=pw?await ACC.makeSecret(pw):null,now=new Date().toISOString();
    const nid=id||("u"+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
    if(id===me.uid&&sec)pwChanging=sec.pwAt;
    await STORE.updateUsers(J=>{
      if(id&&!J.users[id])return null;
      const x=id?J.users[id]:{created:now,createdBy:meName()};
      x.name=name;x.active=active;if(sec)Object.assign(x,sec);
      // i ruoli nuovi stanno nel campo lvl (vedi store.js): le versioni vecchie non li cancellano
      if(role==="super"||role==="invio"){x.lvl=role;x.role="utente";}else{delete x.lvl;x.role=role;}
      J.users[nid]=x;return J;
    });
    if(id===me.uid&&sec){const s=ACC.session();s.pwAt=sec.pwAt;ACC.setSession(s);}
    const ch=[];
    if(old){if(old.name!==name)ch.push(["Nome",old.name,name]);if(old.role!==role)ch.push(["Ruolo",ROLE_LBL[old.role]||old.role,ROLE_LBL[role]||role]);if((old.active!==false)!==active)ch.push(["Stato",old.active!==false?"attivo":"disattivato",active?"attivo":"disattivato"]);if(sec)ch.push(["Password","","cambiata"]);}
    ACC.log("utenti",old?"Modificato l'utente «"+name+"»":"Creato l'utente «"+name+"» ("+(ROLE_LBL[role]||role)+")",ch.length?{ch}:null);
    $("uForm").hidden=true;uEditing=null;renderUsers();
    mstMsg(old?"Utente aggiornato."+(sec&&id!==me.uid?" Sui suoi dispositivi dovrà entrare con la nuova password.":""):"Utente creato. Password da comunicare: "+pw);
  }catch(err){note.textContent=err&&err.code==="offline"?"Serve la connessione a internet.":err&&err.code==="lastmaster"?LAST_MASTER:err&&err.code==="forbidden"?NOT_ALLOWED:err&&err.code==="onesuper"?"Il Super Master è uno solo.":"Non riesco a salvare. Riprova tra poco.";if(err&&err.code==="forbidden")renderUsers();if(err&&err.code==="lastmaster"){ACC.tlog("avviso","Modifica utente rifiutata: sarebbe rimasta l'agenda senza Master");renderUsers();}}
  finally{$("uSave").disabled=false;pwChanging=null;}
});
$("uDel").onclick=async()=>{
  const id=uEditing,U=STORE.users,u=id&&U&&U.users[id];if(!u)return;
  if(!canManage(u)||u.role==="super"){$("uNote").textContent=NOT_ALLOWED;return;}
  if(u.role==="master"&&!mastersLeft(U,id)){$("uNote").textContent="Deve restare almeno un Master attivo.";return;}
  if(!confirm("Eliminare l'utente «"+u.name+"»? Non potrà più entrare. Nel registro restano le sue azioni."))return;
  try{await STORE.updateUsers(J=>{if(!J.users[id])return null;delete J.users[id];return J;});ACC.log("utenti","Eliminato l'utente «"+u.name+"»");$("uForm").hidden=true;uEditing=null;renderUsers();mstMsg("Utente eliminato.");}
  catch(err){$("uNote").textContent=err&&err.code==="lastmaster"?LAST_MASTER:err&&err.code==="forbidden"?NOT_ALLOWED:"Non riesco a eliminarlo adesso. Riprova.";}
};
function renderDevices(){
  const U=STORE.users||{},bl=U.blocked||{},list=(mstDevs||[]).slice().sort((a,b)=>(a.dev===ACC.device.id?-1:b.dev===ACC.device.id?1:0)||(a.last<b.last?1:-1));
  if(!mstDevs){$("devList").innerHTML='<div class="lg-empty">Carico l\'elenco…</div>';return;}
  $("devList").innerHTML=list.map(d=>{
    const me=d.dev===ACC.device.id,blocked=!!bl[d.dev]||d.state==="bloccato",fresh=Date.now()-new Date(d.last)<20*60000,on=d.state==="attivo"&&fresh&&!blocked;
    const lbl=ACC.devLabel(d.dev)||d.auto||"Dispositivo";
    const who=blocked?'<span class="pill off">Bloccato</span>'+(d.state==="bloccato"?"<small>scollegato da Dropbox</small>":"<small>si scollega appena torna online</small>"):d.uid&&d.state==="attivo"?'<b>'+esc(d.user)+'</b><small>'+(devRole(d)==="master"?"Master · ":devRole(d)==="invio"?"Invio fogli · ":"")+"entrato "+esc(fmtTime(d.loginAt))+'</small>':'<span class="pill">Nessuno</span><small>'+(d.state==="scollegato"?"scollegato":"uscito")+'</small>';
    let act="";
    if(me)act='<span class="pill m">Questo dispositivo</span>';
    else if(blocked)act=d.state==="bloccato"?'<button type="button" class="btn" data-dforget="'+esc(d.dev)+'">Togli dall\'elenco</button>':'';
    else if(devProtected(d))act='<small>non gestibile da qui</small>';
    else act=(d.uid&&d.state==="attivo"?'<button type="button" class="btn" data-dkick="'+esc(d.dev)+'">Disconnetti</button>':'')+'<button type="button" class="btn danger" data-dblock="'+esc(d.dev)+'">Blocca</button>';
    return '<div class="dev-row'+(me?" me":"")+'"><div><button type="button" class="dev-name" data-dname="'+esc(d.dev)+'" title="Rinomina">'+esc(lbl)+' ✎</button><small>'+esc(d.auto||"")+(d.ver?" · v"+esc(d.ver):"")+'</small></div>'+
      '<div>'+who+'</div><div><span class="dot'+(on?" on":"")+'"></span>'+esc(agoTxt(d.last))+'<small>ultima attività</small></div><div><small>versione</small>'+esc(d.ver||"—")+'</div><div class="row-act">'+act+'</div></div>';
  }).join("")||'<div class="lg-empty">Nessun dispositivo ha ancora usato la versione '+APP_VERSION+'.</div>';
}
// ruolo di chi sta lavorando su un dispositivo: vale quello dell'elenco utenti di adesso (la scheda del
// dispositivo si aggiorna solo all'accesso e ogni 10 minuti: chi è appena diventato Master va protetto subito)
function devRole(d){const U=STORE.users,u=d&&d.uid&&U&&U.users?U.users[d.uid]:null;return u?(u.active===false?"":u.role):((d&&d.role)||"");}
function devProtected(d){const r=devRole(d);return !isSuper()&&(r==="master"||r==="invio")&&!!d.uid&&d.state==="attivo";}
$("devReload").onclick=()=>{mstDevs=null;renderDevices();loadDevices();};
$("devList").addEventListener("click",async e=>{
  const k=e.target.closest("[data-dkick]"),bl=e.target.closest("[data-dblock]"),nm=e.target.closest("[data-dname]"),fg=e.target.closest("[data-dforget]");
  const d=(mstDevs||[]).find(x=>x.dev===((k||bl||nm||fg)||{dataset:{}}).dataset[k?"dkick":bl?"dblock":nm?"dname":"dforget"]);if(!d)return;
  const lbl=ACC.devLabel(d.dev)||d.auto;
  if((k||bl)&&devProtected(d)){mstMsg("Il dispositivo dove lavora un altro Master, o chi invia i fogli, non si gestisce da questo pannello.",true);return;}
  try{
    if(k){if(!confirm("Far uscire "+(d.user||"l'utente")+" da «"+lbl+"»? Per rientrare servirà la password."))return;
      await STORE.updateUsers(J=>{J.kicks=J.kicks||{};J.kicks[d.dev]=new Date().toISOString();return J;});ACC.log("dispositivi","Disconnesso «"+(d.user||"")+"» dal dispositivo «"+lbl+"»");mstMsg("Fatto: il dispositivo torna alla schermata di accesso appena riceve l'aggiornamento (pochi secondi se è acceso e collegato).");}
    else if(bl){if(!confirm("Bloccare «"+lbl+"»? Verrà scollegato da Dropbox e perderà la copia dell'agenda. Per usarlo di nuovo andrà ricollegato con l'account Dropbox dell'azienda."))return;
      await STORE.updateUsers(J=>{J.blocked=J.blocked||{};J.blocked[d.dev]={at:new Date().toISOString(),by:meName()};return J;});ACC.log("dispositivi","Bloccato il dispositivo «"+lbl+"»");mstMsg("Dispositivo bloccato.");}
    else if(nm){const v=prompt("Nome del dispositivo (es. Mac ufficio, iPhone Massimo):",lbl);if(v==null||!cleanText(v))return;
      await STORE.updateUsers(J=>{J.devices=J.devices||{};J.devices[d.dev]={label:cleanText(v).slice(0,40)};return J;});ACC.log("dispositivi","Rinominato il dispositivo «"+lbl+"» in «"+cleanText(v)+"»");}
    else if(fg){await DBX.remove(ACC.REG()+"/dispositivi/"+d.dev+".json");await STORE.updateUsers(J=>{if(J.blocked)delete J.blocked[d.dev];if(J.kicks)delete J.kicks[d.dev];if(J.devices)delete J.devices[d.dev];return J;});mstDevs=mstDevs.filter(x=>x.dev!==d.dev);}
    renderDevices();
  }catch(_){mstMsg("Operazione non riuscita: controlla la connessione e riprova.",true);}
});
// registro
const LOG_KIND={accesso:"Accesso",prenotazione:"Prenotazione",cliente:"Cliente",foglio:"Foglio",fattura:"Fattura",impostazioni:"Impostazioni",utenti:"Utenti",dispositivi:"Dispositivi"};
function logRange(){const n=+$("lgPer").value,to=ACC.localDate(),d=new Date();d.setDate(d.getDate()-n);return {from:ACC.localDate(d),to};}
async function loadLog(){
  const r=logRange(),key=r.from+"|"+r.to;
  if(mstLog&&mstLogKey===key&&Date.now()-mstLog.at<30000){renderLog();return;}
  $("lgList").innerHTML='<div class="lg-empty">Leggo il registro da Dropbox…</div>';
  try{await ACC.flushLog();const ev=await ACC.readLog(r.from,r.to);mstLog={ev,at:Date.now()};mstLogKey=key;}
  catch(_){mstLog=null;$("lgList").innerHTML='<div class="lg-empty">Non riesco a leggere il registro. Controlla la connessione e riprova.</div>';return;}
  renderLog();
}
function logVisible(e){
  if(isSuper())return true;
  const U=STORE.users,u=U&&U.users&&U.users[e.u];
  return e.s!=="1"&&!(u&&u.role==="super")&&!(e.d&&e.d.hid);
}
function logFiltered(){
  if(!mstLog)return [];
  const uf=$("lgUser").value,kf=$("lgKind").value,q=norm($("lgQ").value).trim();
  return mstLog.ev.filter(logVisible).filter(e=>(!uf||e.u===uf||(!e.u&&e.d&&e.d.uid===uf))&&(!kf||e.k===kf||(kf==="impostazioni"&&(e.k==="utenti"||e.k==="dispositivi")))&&(!q||norm(e.n+" "+e.x+" "+JSON.stringify(e.d||"")).includes(q)));
}
function logTime(t){const d=new Date(t),y=d.getFullYear()!==new Date().getFullYear();return d.toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:y?"2-digit":undefined})+" "+d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}
function renderLog(){
  const U=STORE.users||{users:{}},sel=$("lgUser").value;
  const names=new Map(userEntries(U).filter(([,u])=>isSuper()||u.role!=="super").map(([id,u])=>[id,u.name]));(mstLog?mstLog.ev:[]).filter(logVisible).forEach(e=>{if(e.u&&!names.has(e.u))names.set(e.u,e.n+" (eliminato)");});
  $("lgUser").innerHTML='<option value="">Tutti gli utenti</option>'+[...names].sort((a,b)=>a[1].localeCompare(b[1],"it")).map(([id,n])=>'<option value="'+esc(id)+'"'+(id===sel?" selected":"")+'>'+esc(n)+'</option>').join("");
  if(!mstLog)return;
  const ev=logFiltered(),max=600;
  $("lgList").innerHTML=ev.slice(0,max).map(e=>{
    const bad=e.d&&e.d.bad,ch=(e.d&&e.d.ch)||[];
    return '<div class="lg-row"><span class="t">'+esc(logTime(e.t))+'</span><span>'+esc(e.n||"—")+'</span><span class="dv">'+esc(ACC.devLabel(e.dv)||e.auto||"")+(e.local?" · non ancora in Dropbox":"")+'</span><span><span class="k '+(bad?"bad":esc(e.k))+'">'+esc(LOG_KIND[e.k]||e.k)+'</span>'+esc(e.x)+
      (ch.length?'<ul>'+ch.map(c=>'<li><b>'+esc(c[0])+'</b>: '+(c[1]!==""?esc(c[1])+' → ':'')+esc(c[2])+'</li>').join("")+'</ul>':'')+(e.d&&e.d.txt?'<ul><li>'+esc(e.d.txt)+'</li></ul>':'')+'</span></div>';
  }).join("")+(ev.length>max?'<div class="lg-empty">Mostrati i primi '+max+' eventi su '+ev.length+': restringi il periodo o cerca.</div>':'')||'<div class="lg-empty">Nessun evento nel periodo scelto.</div>';
}
["lgUser","lgKind"].forEach(id=>$(id).addEventListener("change",renderLog));
$("lgPer").addEventListener("change",loadLog);
$("lgQ").addEventListener("input",()=>{clearTimeout(renderLog._t);renderLog._t=setTimeout(renderLog,150);});
$("lgCsv").onclick=()=>{
  const ev=logFiltered(),q=v=>'"'+noFormula(v).replace(/"/g,'""')+'"';
  const rows=[["Data","Ora","Utente","Dispositivo","Tipo","Azione","Dettagli"].map(q).join(";")].concat(ev.map(e=>{const d=new Date(e.t);return [d.toLocaleDateString("it-IT"),d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}),e.n,ACC.devLabel(e.dv)||e.auto,LOG_KIND[e.k]||e.k,e.x,((e.d&&e.d.ch)||[]).map(c=>c[0]+": "+(c[1]!==""?c[1]+" → ":"")+c[2]).join(" | ")+(e.d&&e.d.txt?e.d.txt:"")].map(q).join(";");}));
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["﻿"+rows.join("\r\n")],{type:"text/csv;charset=utf-8"}));a.download="registro_agenda_"+logRange().from+"_"+logRange().to+".csv";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
  ACC.log("impostazioni","Scaricato il registro in CSV ("+ev.length+" eventi)");
};
// impostazioni
function renderSettings(){
  const st=STORE.settings||{},ff=STORE.fatFiles(),fy=Object.keys(ff).sort();
  if(document.activeElement!==$("setGKey"))$("setGKey").value=st.googleKey||"";
  $("setGSite").textContent=location.origin+"/*";
  $("setLock").value=String(st.autoLock||0);
  const pm=st.perms||{};$("permClients").checked=pm.clients!==false;$("permFleet").checked=pm.fleet!==false;$("permAnag").checked=pm.anag!==false;$("permInv").checked=pm.inv!==false;$("permCont").checked=pm.contab===true;
  $("setFatInfo").innerHTML="File fatturato: "+(fy.length?fy.map(y=>(y==="*"?"":y+" → ")+"<b>"+esc(ff[y].name)+"</b>").join(", "):"<b>non collegato</b>")+". Flotta: <b>"+S.fleet.length+" mezzi</b>.";
}
function setGMsg(t,c){$("setGMsg").textContent=t||"";$("setGMsg").className="set-msg"+(c?" "+c:"");}
$("setGTest").onclick=async()=>{
  const k=$("setGKey").value.trim();if(!k){setGMsg("Incolla prima la chiave.","err");return;}
  setGMsg("Provo a cercare «hotel Ragusa»…");
  try{const r=await gAutocomplete("hotel Ragusa",k,newToken());setGMsg(r.length?"Funziona: per esempio «"+r[0].main+"» ("+r[0].sec+").":"La chiave funziona, ma non ha trovato hotel.","ok");}
  catch(e){setGMsg(gErrText(e),"err");ACC.tlog("avviso","Prova della chiave Google: "+gErrText(e),gErrRaw(e));}
};
$("setGSave").onclick=async()=>{
  const k=$("setGKey").value.trim();
  try{await STORE.setSettings({googleKey:k});ACC.log("impostazioni",k?"Salvata la chiave Google per la ricerca hotel":"Tolta la chiave Google");setGMsg(k?"Chiave salvata: vale su tutti i dispositivi.":"Ricerca Google disattivata.","ok");}
  catch(_){setGMsg("Non riesco a salvare: serve la connessione a internet.","err");}
};
$("setLock").onchange=async()=>{
  const v=+$("setLock").value;
  try{await STORE.setSettings({autoLock:v});ACC.log("impostazioni","Uscita automatica: "+$("setLock").selectedOptions[0].textContent.toLowerCase());mstMsg("Impostazione salvata per tutti i dispositivi.");}
  catch(_){mstMsg("Non riesco a salvare: serve la connessione a internet.",true);renderSettings();}
};
["permClients","permFleet","permAnag","permInv","permCont"].forEach(id=>$(id).onchange=async()=>{
  const perms=Object.assign({},((STORE.settings||{}).perms)||{},{clients:$("permClients").checked,fleet:$("permFleet").checked,anag:$("permAnag").checked,inv:$("permInv").checked,contab:$("permCont").checked});
  try{await STORE.setSettings({perms});ACC.log("impostazioni","Permessi degli utenti: anagrafica clienti "+(perms.clients?"sì":"no")+", flotta "+(perms.fleet?"sì":"no")+", anagrafiche e tendine "+(perms.anag?"sì":"no")+", bozze di fattura "+(perms.inv?"sì":"no")+", contabilità "+(perms.contab?"sì":"no"));mstMsg("Permessi salvati per tutti i dispositivi.");}
  catch(_){mstMsg("Non riesco a salvare: serve la connessione a internet.",true);renderSettings();}
});
$("setFat").onclick=()=>{if(!navigator.onLine){mstMsg("Serve la connessione a internet.",true);return;}$("ovMaster").hidden=true;showGate("fatturato",{fromMenu:true});};
$("setFleet").onclick=()=>{$("ovMaster").hidden=true;openFleet();};

// ---------- Contabilità e bozze di fattura (2.4) ----------
// I conti e il file XML sono in fatture.js (FATTURE); qui ci sono le finestre: la sezione Contabilità
// (Archivio), la bozza con l'anteprima, l'elenco delle bozze e i tasti nella vista Fatturato.
const FT=window.FATTURE;
// permessi decisi dal Master: le bozze di fattura di serie sì, la sezione Contabilità di serie no
function canInv(){if(isMaster())return true;const p=((STORE.settings||{}).perms)||{};return p.inv!==false;}
function canCont(){if(isMaster())return true;const p=((STORE.settings||{}).perms)||{};return p.contab===true;}
const eur2=n=>Number(n||0).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
const optList=(o,sel)=>Object.keys(o).map(k=>'<option value="'+esc(k)+'"'+(k===sel?" selected":"")+'>'+esc(o[k])+'</option>').join("");
function setPath(o,path,v){const p=path.split(".");let x=o;for(let i=0;i<p.length-1;i++){if(!x[p[i]]||typeof x[p[i]]!=="object")x[p[i]]={};x=x[p[i]];}x[p[p.length-1]]=v;}
function getPath(o,path){let x=o;for(const k of path.split(".")){if(x==null)return "";x=x[k];}return x==null?"":x;}
const inpVal=el=>el.type==="checkbox"?el.checked:el.dataset.t==="num"?(el.value===""?0:Number(el.value)):el.dataset.t==="up"?el.value.toUpperCase():el.value;

// ----- sezione Contabilità -----
let CT=null,ctOrig=null,ctTab="az",ctDirty=false; // ctOrig: com'era quando si è aperta la finestra
const CT_AZ=[["nome","Denominazione",2],["piva","Partita IVA"],["cf","Codice fiscale"],["regime","Regime fiscale","sel",()=>Object.fromEntries(Object.entries(FT.REGIMI).map(([k,v])=>[k,k+" – "+v]))],["sdi","Codice univoco (SDI)"],["pec","PEC"],["tel","Telefono"],
  ["indirizzo","Indirizzo (via e numero)",2],["cap","CAP"],["comune","Comune"],["prov","Provincia (sigla)"],["nazione","Nazione (sigla)"],["email","E-mail"],
  ["iban","IBAN",2],["banca","Banca"],["abi","ABI"],["cab","CAB"],["bic","BIC / SWIFT"],["beneficiario","Intestatario del conto (se diverso)",2],
  ["reaUfficio","REA – provincia"],["reaNumero","REA – numero"],["capitale","Capitale sociale €"],["socioUnico","Soci","sel",()=>({"":"non indicato",SU:"socio unico",SM:"più soci"})],["liquidazione","Stato","sel",()=>({LN:"non in liquidazione",LS:"in liquidazione"})]];
function openContab(){
  if(!canCont()){toast("La sezione Contabilità è riservata: la apre il Master o chi è autorizzato da lui.");return;}
  CT=STORE.contab();ctOrig=STORE.contab();ctTab="az";ctDirty=false;renderContab();$("ovCont").hidden=false;ctMsg("");
  if(!STORE.contabLoaded)ctMsg("Sono i dati di partenza (quelli già stampati sul foglio di servizio): controllali, aggiungi IBAN e banca e premi «Salva».");
}
function ctMsg(t,cls){const m=$("contMsg");m.textContent=t||"";m.className="inv-msg"+(cls?" "+cls:"");}
function aliqOpts(C,sel,blank){return (blank?'<option value=""'+(sel?"":" selected")+'>'+esc(blank)+'</option>':"")+C.aliquote.map(a=>'<option value="'+esc(a.id)+'"'+(a.id===sel?" selected":"")+'>'+esc(a.nome)+'</option>').join("");}
function renderContab(){
  document.querySelectorAll("#contTabs [data-ct-tab]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.ctTab===ctTab));
  const C=CT;let h="";
  if(ctTab==="az"){
    h='<p class="ct-note">Sono i dati che finiscono nella fattura come «cedente/prestatore». IBAN e banca compaiono nel pagamento.</p><div class="ct-grid">'+CT_AZ.map(([k,l,w,o])=>'<div class="f'+(w===2?" w2":"")+'"><label for="ct-'+k+'">'+esc(l)+'</label>'+(w==="sel"?'<select id="ct-'+k+'" data-ct="azienda.'+k+'">'+optList(o(),C.azienda[k])+'</select>':'<input id="ct-'+k+'" data-ct="azienda.'+k+'" value="'+esc(C.azienda[k])+'" autocomplete="off">')+'</div>').join("")+'</div>';
  }else if(ctTab==="iva"){
    h='<p class="ct-note">Le aliquote tra cui scegliere su ogni riga della fattura. Con 0% serve la «natura» (per esempio N2.2 fuori campo IVA) e conviene scrivere il riferimento che deve comparire in fattura.</p>'+
      '<div class="ct-table"><div class="ct-row hd ct-iva"><span>Nome</span><span>% IVA</span><span>Natura (solo con 0%)</span><span>Riferimento normativo</span><span></span></div>'+
      C.aliquote.map((a,i)=>'<div class="ct-row ct-iva"><input data-ctl="aliquote.'+i+'.nome" value="'+esc(a.nome)+'" aria-label="Nome"><input data-ctl="aliquote.'+i+'.perc" data-t="num" type="number" min="0" max="100" step="0.01" value="'+esc(a.perc)+'" aria-label="Percentuale"><select data-ctl="aliquote.'+i+'.natura" aria-label="Natura"'+(a.perc>0?" disabled":"")+'><option value="">–</option>'+Object.keys(FT.NATURE).map(n=>'<option value="'+n+'"'+(a.natura===n&&!(a.perc>0)?" selected":"")+'>'+n+' – '+esc(FT.NATURE[n])+'</option>').join("")+'</select><input data-ctl="aliquote.'+i+'.rif" value="'+esc(a.rif)+'" aria-label="Riferimento normativo"><button type="button" class="btn icon" data-ctdel="aliquote.'+i+'" aria-label="Elimina aliquota" title="Elimina">×</button></div>').join("")+
      '</div><button type="button" class="btn" data-ctadd="aliquote">+ Aggiungi aliquota</button>';
  }else if(ctTab==="cau"){
    h='<p class="ct-note">I testi con cui l\'agenda prepara le righe. Tra parentesi graffe ci sono i dati presi dal servizio: <b>{MEZZO}</b> <b>{DATA}</b> <b>{PERIODO}</b> <b>{MESE}</b> <b>{ITINERARIO}</b> <b>{EVENTO}</b> <b>{PAX}</b> <b>{TARGA}</b> <b>{FOGLIO}</b>; nel rimborso dei parcheggi <b>{PARCHEGGIO}</b> (es. A SIRACUSA, dall\'anagrafica parcheggi: se manca si aggiunge in fondo). «Si usa per» dice quando l\'agenda la sceglie da sola; le altre si aggiungono a mano dalla bozza.</p>'+
      '<div class="ct-table"><div class="ct-row hd ct-cau"><span>Nome</span><span>Si usa per</span><span>Testo della riga</span><span>Aliquota</span><span></span></div>'+
      C.causali.map((c,i)=>'<div class="ct-row ct-cau"><input data-ctl="causali.'+i+'.nome" value="'+esc(c.nome)+'" aria-label="Nome"><select data-ctl="causali.'+i+'.uso" aria-label="Si usa per">'+optList(FT.USI,c.uso)+'</select><textarea data-ctl="causali.'+i+'.testo" rows="2" aria-label="Testo">'+esc(c.testo)+'</textarea><select data-ctl="causali.'+i+'.aliq" aria-label="Aliquota">'+aliqOpts(C,c.aliq,"da scegliere ogni volta")+'</select><button type="button" class="btn icon" data-ctdel="causali.'+i+'" aria-label="Elimina causale" title="Elimina">×</button></div>').join("")+
      '</div><button type="button" class="btn" data-ctadd="causali">+ Aggiungi causale</button>'+
      '<h4 class="ct-h">Come si scrive il mezzo ({MEZZO})</h4><div class="ct-grid">'+[["bus","Pullman"],["van","Van / minibus"],["auto","Auto"]].map(([k,l])=>'<div class="f"><label for="ct-mz-'+k+'">'+l+'</label><input id="ct-mz-'+k+'" data-ct="mezzi.'+k+'" value="'+esc(C.mezzi[k])+'"></div>').join("")+'</div>';
  }else{
    const O=C.opzioni;
    h='<div class="ct-cards"><div class="set-card"><h4>Prezzi e descrizioni</h4>'+
      '<label class="perm"><input type="checkbox" data-ct="opzioni.lordi"'+(O.lordi?" checked":"")+'> <span><b>I prezzi dell\'agenda sono IVA compresa</b> – la bozza ricava l\'imponibile per scorporo (es. 600,00 → 545,45 + 54,55)</span></label>'+
      '<label class="perm"><input type="checkbox" data-ct="opzioni.maiuscole"'+(O.maiuscole?" checked":"")+'> <span><b>Descrizioni in maiuscolo</b>, come nelle vostre fatture</span></label>'+
      '<div class="f"><label for="ct-tipo">Tipo di documento proposto</label><select id="ct-tipo" data-ct="opzioni.tipo">'+optList(Object.fromEntries(Object.entries(FT.TIPI_SCELTA).map(([k,v])=>[k,k+" – "+v])),O.tipo)+'</select></div></div>'+
      '<div class="set-card"><h4>Pagamento</h4><div class="ct-grid two"><div class="f"><label for="ct-mod">Modalità</label><select id="ct-mod" data-ct="opzioni.mod">'+optList(FT.MOD_PAG,O.mod)+'</select></div><div class="f"><label for="ct-cond">Condizioni</label><select id="ct-cond" data-ct="opzioni.cond">'+optList(FT.COND_PAG,O.cond)+'</select></div>'+
      '<div class="f"><label for="ct-gg">Scadenza: giorni dalla data fattura</label><input id="ct-gg" data-ct="opzioni.giorni" data-t="num" type="number" min="0" max="365" step="1" value="'+esc(O.giorni)+'"></div><div class="f"><label for="ct-ggpa">Enti pubblici: giorni</label><input id="ct-ggpa" data-ct="opzioni.giorniPA" data-t="num" type="number" min="0" max="365" step="1" value="'+esc(O.giorniPA)+'"></div></div>'+
      '<label class="perm"><input type="checkbox" data-ct="opzioni.splitPA"'+(O.splitPA?" checked":"")+'> <span><b>Enti pubblici: scissione dei pagamenti</b> – l\'ente paga solo l\'imponibile, l\'IVA la versa lui</span></label></div>'+
      '<div class="set-card"><h4>Sconti e arrotondamenti</h4><div class="ct-grid two"><div class="f"><label for="ct-sc">Sconto proposto su ogni fattura (%)</label><input id="ct-sc" data-ct="opzioni.scontoPerc" data-t="num" type="number" min="0" max="100" step="0.01" value="'+esc(O.scontoPerc)+'"></div><div class="f"><label for="ct-bollo">Importo del bollo (€)</label><input id="ct-bollo" data-ct="opzioni.bolloImporto" data-t="num" type="number" min="0" max="100" step="0.01" value="'+esc(O.bolloImporto)+'"></div>'+
      '<div class="f"><label for="ct-arr">Arrotondamento del totale</label><select id="ct-arr" data-ct="opzioni.arrot">'+optList(FT.ARROT,O.arrot)+'</select></div><div class="f"><label for="ct-arrv">Verso</label><select id="ct-arrv" data-ct="opzioni.arrotVerso">'+optList(FT.VERSI,O.arrotVerso)+'</select></div></div>'+
      '<p class="mst-sub">Sono i valori proposti: su ogni bozza sconto e arrotondamento si possono cambiare o togliere.</p></div></div>';
  }
  $("contBody").innerHTML=h;
}
function ctRead(e){
  const el=e.target,p=el.dataset.ct||el.dataset.ctl;if(!p||!CT)return;
  setPath(CT,p,inpVal(el));ctDirty=true;ctMsg("");
  // % cambiata: la natura serve solo con lo 0%
  if(e.type==="change"&&/^aliquote\.\d+\.perc$/.test(p))renderContab();
}
$("contBody").addEventListener("input",ctRead);$("contBody").addEventListener("change",ctRead);
$("contBody").addEventListener("click",e=>{
  const add=e.target.closest("[data-ctadd]"),del=e.target.closest("[data-ctdel]");if(!CT||(!add&&!del))return;
  if(add){if(add.dataset.ctadd==="aliquote")CT.aliquote.push({id:FT.newId("a").slice(0,20),nome:"",perc:0,natura:"N2.2",rif:""});else CT.causali.push({id:FT.newId("c").slice(0,20),nome:"",uso:"libera",testo:"",aliq:""});}
  else{const [k,i]=del.dataset.ctdel.split(".");if(k==="aliquote"&&CT.aliquote.length<=1){ctMsg("Deve restare almeno un'aliquota.","err");return;}CT[k].splice(+i,1);}
  ctDirty=true;renderContab();
  if(add){const rows=$("contBody").querySelectorAll(".ct-row:not(.hd)"),last=rows[rows.length-1];if(last){const f=last.querySelector("input");if(f)f.focus();}}
});
$("contTabs").addEventListener("click",e=>{const b=e.target.closest("[data-ct-tab]");if(!b)return;ctTab=b.dataset.ctTab;renderContab();});
function closeContab(){if(ctDirty&&!confirm("Chiudere senza salvare le modifiche alla Contabilità?"))return;$("ovCont").hidden=true;CT=null;ctOrig=null;ctDirty=false;}
$("contClose").onclick=closeContab;backdropClose($("ovCont"),closeContab);
$("contSave").onclick=async()=>{
  if(!CT||S.readOnly)return;
  if(!canCont()){ctMsg("Non hai più il permesso di modificare la Contabilità.","err");return;}
  $("contSave").disabled=true;ctMsg("Salvo…");
  try{
    const before=STORE.contab(),mine=CT,orig=ctOrig||before,J=x=>JSON.stringify(x);
    // sopra l'ultima versione in Dropbox si mettono solo le voci cambiate in questa finestra: se intanto un altro
    // dispositivo ha salvato (per esempio l'IBAN) le sue modifiche restano
    CT=await STORE.updateContab(cur=>{
      for(const sec of ["azienda","opzioni","mezzi"])for(const k of Object.keys(mine[sec]||{}))if(J(mine[sec][k])!==J((orig[sec]||{})[k]))cur[sec][k]=mine[sec][k];
      for(const sec of ["aliquote","causali"])if(J(mine[sec])!==J(orig[sec]))cur[sec]=mine[sec];
      return cur;
    });
    ctOrig=STORE.contab();ctDirty=false;renderContab();
    const ch=[];if(JSON.stringify(before.azienda)!==JSON.stringify(CT.azienda))ch.push("dati societari");if(JSON.stringify(before.aliquote)!==JSON.stringify(CT.aliquote))ch.push("aliquote");if(JSON.stringify(before.causali)!==JSON.stringify(CT.causali)||JSON.stringify(before.mezzi)!==JSON.stringify(CT.mezzi))ch.push("causali");if(JSON.stringify(before.opzioni)!==JSON.stringify(CT.opzioni))ch.push("pagamento, sconti e arrotondamenti");
    ACC.log("fattura","Contabilità: salvate le impostazioni"+(ch.length?" ("+ch.join(", ")+")":""));
    ctMsg("Salvato per tutti i dispositivi.","ok");
  }catch(err){ctMsg(err&&err.code==="offline"?"Serve la connessione a internet.":"Non riesco a salvare: riprova tra poco.","err");}
  finally{$("contSave").disabled=false;}
};

// ----- dai servizi alla bozza -----
const invKey=b=>b.id+"|"+b.start;
function invService(b){
  const v=vehicle(b.vehicle)||{};
  return {id:b.id,start:b.start,end:endOf(b),type:normType(b.type),foglio:String(b.foglio||""),itin:billItin(b),event:b.event||"",pax:b.pax,client:b.client||"",vehicle:{kind:v.kind,seats:v.seats,plate:(v.plate||"").trim()},price:Number(b.price)||0,park:Number(b.park)||0,meals:Number(b.meals)||0,parks:(Array.isArray(b.parks)?b.parks:[]).filter(p=>p&&p.pid).map(p=>{const r=parkReg(p.pid);return {key:p.pid,testo:parkFatt(r,p),aliq:r?String(r.aliq||""):"",amt:Number(p.amt)||0};})};
}
// dati del cliente dall'anagrafica (foglio "clienti" del fatturato)
function invClient(b){
  const c=b.clientCode!==""&&b.clientCode!=null?clientByCode(b.clientCode):null;
  if(!c)return {code:"",nome:b.client||""};
  const f=k=>String(cliField(c,k)||"").trim(),est=f("pivaEst").toUpperCase().replace(/[^A-Z0-9]/g,"");
  let paese="IT",piva=idNorm(f("piva"));
  if(!piva&&/^[A-Z]{2}[A-Z0-9]{2,}$/.test(est)){paese=est.slice(0,2);piva=est.slice(2);}
  let comune=f("city"),prov=f("prov").toUpperCase();const m=/^(.*?)\s*\(([A-Za-z]{2})\)\s*$/.exec(comune);if(m){comune=m[1];if(!prov)prov=m[2].toUpperCase();}
  const cf=idNorm(f("cf"));
  return {code:String(c[0]),nome:c[1]||b.client||"",paese,piva,cf:piva&&cf===piva?"":cf,sdi:f("sdi").toUpperCase(),pec:f("pec"),indirizzo:f("addr"),cap:f("cap"),comune,prov,nazione:paese};
}
// I servizi di una bozza come sono adesso in agenda. Un servizio spostato di giorno tiene il suo id ma cambia
// data (e n. foglio): si ritrova lo stesso. missing: i n. foglio dei servizi che non ci sono più.
function invBookings(d){
  const all=bookingsAll().concat(S.allDays?billSourceAll():[]),out=[],missing=[];
  for(const s of d.servizi||[]){const b=all.find(x=>x.id===s.id&&x.start===s.start)||all.find(x=>x.id===s.id);if(b){if(!out.includes(b))out.push(b);}else missing.push(s.foglio||s.start);}
  out.missing=missing;return out;
}
const sameClient=(a,b)=>(a.clientCode!==""&&a.clientCode!=null)||(b.clientCode!==""&&b.clientCode!=null)?String(a.clientCode)===String(b.clientCode):norm(a.client||"")===norm(b.client||"");
// bozze per servizio (id della prenotazione → bozze, la più recente per prima): si costruisce una volta per ogni disegno della tabella
function draftMap(){
  const m=new Map(),list=STORE.drafts().sort((a,z)=>String(z.updatedAt||z.createdAt).localeCompare(String(a.updatedAt||a.createdAt)));
  for(const d of list)for(const s of d.servizi){if(!m.has(s.id))m.set(s.id,[]);if(!m.get(s.id).includes(d))m.get(s.id).push(d);}
  return m;
}

// ----- la bozza -----
let INV=null; // {d: bozza, rev: versione del file quando è stata aperta, isNew, dirty, edits, scadAuto, touched}
let invPending=null; // servizi per cui si è chiesta una bozza mentre ne esistono già: si sceglie dall'elenco
function openInvoice(list,forceNew){
  if(!canInv()){toast("Le bozze di fattura sono riservate: chiedi al Master.");return;}
  list=list.filter(Boolean);if(!list.length)return;
  if(list.some(b=>!sameClient(b,list[0]))){toast("Per una fattura unica i servizi devono essere dello stesso cliente.");return;}
  // ci sono già bozze con questi servizi: si mostrano, con la possibilità di farne un'altra (es. acconto e saldo)
  if(!forceNew){const ids=new Set(list.map(b=>b.id)),old=STORE.drafts().filter(d=>d.servizi.some(s=>ids.has(s.id)));if(old.length){invPending=list;openInvList(old.map(d=>d.id));return;}}
  invPending=null;
  const C=STORE.contab(),d=FT.newDraft(list.map(invService),invClient(list[0]),C,{today:todayISO(),by:meName()});
  INV={d,rev:"",isNew:true,dirty:true,edits:0,scadAuto:true,touched:false};showInvoice();
}
function openDraft(id){
  if(!canInv()){toast("Le bozze di fattura sono riservate: chiedi al Master.");return;}
  const d=STORE.draft(id);if(!d){toast("La bozza non c'è più.");return;}
  INV={d,rev:STORE.draftRev(id),isNew:false,dirty:false,edits:0,scadAuto:false,touched:true};showInvoice();
}
// la causale è legata a una riga (2.6): quella scritta in d.causaleId, altrimenti la prima riga di noleggio.
// Nelle bozze di prima della 2.6 con una causale diversa da ogni descrizione resta una voce a parte (causLink=false)
// finché non viene cancellata.
function invCausTarget(d){if(d.causaleId){const r=d.righe.find(x=>x.id===d.causaleId);if(r)return r;}return FT.causaleRow(d);}
function invCausLinked(d){const c=String(d.causale||"").trim();if(!c)return true;const r=invCausTarget(d);return !!r&&FT.latin(r.desc)===FT.latin(d.causale);}
function showInvoice(){memIdx=null;if(INV)INV.causLink=invCausLinked(INV.d);$("ovInvList").hidden=true;invTab("dati");renderInvForm();renderInvLive();invMsg("");$("ovInv").hidden=false;}
function invMsg(t,cls){const m=$("invMsg");m.textContent=t||"";m.className="inv-msg"+(cls?" "+cls:"");}
function invTab(t){document.querySelectorAll("#invTabs [data-it]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.it===t));$("invGrid").dataset.tab=t;growAll($("invForm"));}
$("invTabs").addEventListener("click",e=>{const b=e.target.closest("[data-it]");if(b)invTab(b.dataset.it);});
const ivF=(id,label,inner,cls)=>'<div class="f'+(cls?" "+cls:"")+'"><label for="'+id+'">'+label+'</label>'+inner+'</div>';
const ivI=(id,path,v,extra)=>'<input id="'+id+'" data-m="'+path+'" value="'+esc(v)+'" autocomplete="off"'+(extra||"")+'>';
function invRowsHTML(){
  const d=INV.d,C=STORE.contab();
  return d.righe.map((r,i)=>'<div class="iv-row" data-rid="'+esc(r.id)+'"><span class="n">'+(i+1)+'</span>'+
    '<textarea data-rk="desc" data-mem="fattura" rows="1" aria-label="Descrizione riga '+(i+1)+'" maxlength="1000">'+esc(r.desc)+'</textarea>'+
    '<input data-rk="qta" data-t="num" type="number" min="0" step="any" value="'+esc(r.qta)+'" aria-label="Quantità">'+
    '<input data-rk="prezzo" data-t="num" type="number" step="0.01" value="'+esc(r.prezzo)+'" aria-label="Prezzo">'+
    '<input data-rk="sc" data-t="num" type="number" min="0" max="100" step="0.01" value="'+esc(r.sc||"")+'" placeholder="0" aria-label="Sconto %">'+
    '<select data-rk="aliq" aria-label="Aliquota IVA"'+(r.aliq?"":' class="miss"')+'>'+aliqOpts(C,r.aliq,"scegli…")+'</select>'+
    '<span class="tot" data-rtot="'+esc(r.id)+'"></span>'+
    '<span class="ops"><button type="button" class="btn icon" data-rup="'+esc(r.id)+'" aria-label="Sposta su" title="Sposta su"'+(i?"":" disabled")+'>↑</button><button type="button" class="btn icon" data-rdel="'+esc(r.id)+'" aria-label="Elimina riga" title="Elimina riga">×</button></span></div>').join("");
}
function renderInvForm(){
  const d=INV.d,C=STORE.contab(),c=d.cliente,pa=c.pa;
  $("invTitle").textContent="Bozza fattura"+(c.nome?" · "+c.nome:"");
  const fogli=d.servizi.map(s=>s.foglio).filter(Boolean);
  let h='<section class="iv-sec"><h4>Documento</h4><div class="iv-grid g4">'+
    ivF("iv-tipo","Tipo",'<select id="iv-tipo" data-m="tipo">'+optList(Object.assign({},FT.TIPI_SCELTA,FT.TIPI_SCELTA[d.tipo]?{}:{[d.tipo]:(FT.TIPI_DOC[d.tipo]||d.tipo)+" (non più usato)"}),d.tipo)+'</select>')+
    ivF("iv-data","Data",'<input id="iv-data" data-m="data" type="date" min="2000-01-01" max="2099-12-31" value="'+esc(d.data)+'">')+
    ivF("iv-numero","Numero",ivI("iv-numero","numero",d.numero,' maxlength="20" placeholder="lo assegna la contabilità"'))+
    ivF("iv-serv","Servizi",'<output id="iv-serv" class="iv-out">'+(fogli.length?esc(fogli.length>3?fogli.slice(0,3).join(", ")+" … ("+fogli.length+")":fogli.join(", ")):"nessun servizio collegato")+'</output>')+
    ivF("iv-causale",'Causale <small class="iv-cnote" id="ivCNote">'+(INV.causLink!==false?'· diventa la descrizione della riga del noleggio':'· bozza di prima della 2.6: resta una voce a parte (cancellala e riscrivila per farla diventare la descrizione del noleggio)')+'</small>','<textarea id="iv-causale" data-m="causale" data-mem="fattura" rows="1" maxlength="1000" placeholder="Scrivi qui la causale: prende il posto del testo automatico «NOLEGGIO …» della riga del noleggio">'+esc(d.causale)+'</textarea>',"w4")+'</div></section>';
  h+='<section class="iv-sec"><h4>Cliente <small>dall\'anagrafica clienti'+(c.code?" · codice "+esc(c.code):"")+'</small></h4><div class="iv-grid g4">'+
    ivF("iv-c-nome","Denominazione",ivI("iv-c-nome","cliente.nome",c.nome,' maxlength="80"'),"w2")+
    ivF("iv-c-piva","Partita IVA",'<span class="iv-pair">'+ivI("iv-c-paese","cliente.paese",c.paese,' data-t="up" maxlength="2" aria-label="Paese della partita IVA" class="cc"')+ivI("iv-c-piva","cliente.piva",c.piva,' maxlength="28"')+'</span>')+
    ivF("iv-c-cf","Codice fiscale",ivI("iv-c-cf","cliente.cf",c.cf,' data-t="up" maxlength="16"'))+
    ivF("iv-c-ind","Indirizzo",ivI("iv-c-ind","cliente.indirizzo",c.indirizzo,' maxlength="60"'),"w2")+
    ivF("iv-c-cap","CAP",ivI("iv-c-cap","cliente.cap",c.cap,' maxlength="5" inputmode="numeric"'))+
    ivF("iv-c-comune","Comune",ivI("iv-c-comune","cliente.comune",c.comune,' maxlength="60"'))+
    ivF("iv-c-prov","Provincia",ivI("iv-c-prov","cliente.prov",c.prov,' data-t="up" maxlength="2"'))+
    ivF("iv-c-naz","Nazione",ivI("iv-c-naz","cliente.nazione",c.nazione,' data-t="up" maxlength="2"'))+
    ivF("iv-c-sdi",pa?"Codice univoco ufficio":"Codice destinatario",ivI("iv-c-sdi","cliente.sdi",c.sdi,' data-t="up" maxlength="7"'))+
    ivF("iv-c-pec","PEC",ivI("iv-c-pec","cliente.pec",c.pec,' maxlength="256" type="email"'))+
    '<label class="perm w4"><input type="checkbox" id="iv-c-pa" data-m="cliente.pa"'+(pa?" checked":"")+'> <span><b>Ente pubblico</b> (scuole, comuni…): codice ufficio di 6 caratteri, fattura in formato PA</span></label></div>'+
    '<div class="iv-grid g4 iv-pa"'+(pa||d.pa.ordNum||d.pa.cig||d.pa.cup||d.pa.split?"":" hidden")+' id="ivPa">'+
    ivF("iv-ordnum","Ordine n.",ivI("iv-ordnum","pa.ordNum",d.pa.ordNum,' maxlength="20"'))+
    ivF("iv-orddata","Ordine del",'<input id="iv-orddata" data-m="pa.ordData" type="date" min="2000-01-01" max="2099-12-31" value="'+esc(d.pa.ordData)+'">')+
    ivF("iv-cig","CIG",ivI("iv-cig","pa.cig",d.pa.cig,' data-t="up" maxlength="15"'))+
    ivF("iv-cup","CUP",ivI("iv-cup","pa.cup",d.pa.cup,' data-t="up" maxlength="15"'))+
    '<label class="perm w4"><input type="checkbox" id="iv-split" data-m="pa.split"'+(d.pa.split?" checked":"")+'> <span><b>Scissione dei pagamenti</b> – l\'ente paga solo l\'imponibile</span></label></div>'+
    (pa||d.pa.ordNum||d.pa.cig||d.pa.cup||d.pa.split?"":'<button type="button" class="linkbtn" id="ivPaShow">+ Ordine d\'acquisto / CIG / CUP</button>')+'</section>';
  h+='<section class="iv-sec"><h4>Righe</h4><div class="iv-bar">'+
    '<label>Prezzi <select id="iv-lordi" data-m="lordi" data-t="bool"><option value="1"'+(d.lordi?" selected":"")+'>IVA compresa (come in agenda)</option><option value="0"'+(d.lordi?"":" selected")+'>IVA esclusa</option></select></label>'+
    (d.servizi.length>1?'<label>Noleggio <select id="iv-modo" data-m="modo"><option value="riepilogo"'+(d.modo==="riepilogo"?" selected":"")+'>una riga riepilogativa</option><option value="singole"'+(d.modo==="singole"?" selected":"")+'>una riga per servizio</option></select></label>':"")+
    (d.servizi.length?'<button type="button" class="linkbtn" id="ivRegen" title="Rifà le righe partendo dai dati dei servizi come sono adesso in agenda">↻ Rifai le righe dai servizi</button>':"")+'</div>'+
    '<div class="iv-rows"><div class="iv-row hd"><span>N.</span><span>Descrizione</span><span>Q.tà</span><span id="ivPriceHd">Prezzo</span><span>Sc. %</span><span>IVA</span><span class="r">Imponibile</span><span></span></div><div id="ivRows">'+invRowsHTML()+'</div></div>'+
    '<div class="iv-add"><button type="button" class="btn" data-radd="libera">+ Riga</button><select id="ivCau" aria-label="Causale da aggiungere"><option value="">+ Riga da causale…</option>'+C.causali.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nome)+'</option>').join("")+'</select><button type="button" class="btn" data-radd="sconto">+ Sconto in euro</button></div></section>';
  h+='<section class="iv-sec"><h4>Sconto, arrotondamento, bollo</h4><div class="iv-grid g4">'+
    ivF("iv-sconto",'Sconto sulla fattura (%) <small title="Lo sconto vale per il noleggio e le righe scritte a mano; non per i rimborsi spese e il bollo">· non sui rimborsi</small>','<input id="iv-sconto" data-m="scontoPerc" data-t="num" type="number" min="0" max="100" step="0.01" value="'+esc(d.scontoPerc||"")+'" placeholder="0">')+
    ivF("iv-arrot","Arrotondamento (€)",'<input id="iv-arrot" data-m="arrot" data-t="num" type="number" min="-1000" max="1000" step="0.01" value="'+(d.arrotAuto||d.arrotStep?"":esc(d.arrot))+'" placeholder="'+arrotHint(d,C)+'">')+
    '<div class="f w2 iv-quick"><label>Porta il totale a</label><span><button type="button" class="btn" data-arr="1" aria-pressed="'+(d.arrotStep===1)+'">euro intero</button><button type="button" class="btn" data-arr="0.5" aria-pressed="'+(d.arrotStep===0.5)+'">50 cent</button><button type="button" class="btn" data-arr="0.1" aria-pressed="'+(d.arrotStep===0.1)+'">10 cent</button><button type="button" class="btn" data-arr="0">togli</button></span></div>'+
    '<label class="perm w2"><input type="checkbox" id="iv-bollo" data-m="bollo"'+(d.bollo?" checked":"")+'> <span><b>Bollo virtuale</b> di € '+eur2(C.opzioni.bolloImporto)+' assolto da noi</span></label>'+
    '<label class="perm w2"><input type="checkbox" id="iv-bolloadd" data-m="bolloAddebita"'+(d.bolloAddebita?" checked":"")+(d.bollo?"":" disabled")+'> <span>…e addebitato al cliente con una riga</span></label></div></section>';
  h+='<section class="iv-sec"><h4>Pagamento</h4><div class="iv-grid g4">'+
    ivF("iv-mod","Modalità",'<select id="iv-mod" data-m="pagamento.mod">'+optList(FT.MOD_PAG,d.pagamento.mod)+'</select>')+
    ivF("iv-cond","Condizioni",'<select id="iv-cond" data-m="pagamento.cond">'+optList(FT.COND_PAG,d.pagamento.cond)+'</select>')+
    ivF("iv-scad","Scadenza",'<input id="iv-scad" data-m="pagamento.scad" type="date" min="2000-01-01" max="2099-12-31" value="'+esc(d.pagamento.scad)+'">')+
    ivF("iv-iban","Coordinate bancarie",'<output id="iv-iban" class="iv-out">'+(C.azienda.iban?esc(C.azienda.iban):'<span class="miss">manca l\'IBAN (Contabilità)</span>')+'</output>')+'</div></section>';
  $("invForm").innerHTML=h;
  $("invDel").hidden=INV.isNew;
  growAll($("invForm"));
}
// le caselle di testo della bozza si allungano con il testo: niente parole nascoste o fuori dalla casella
function autoGrow(t){if(!t||t.tagName!=="TEXTAREA")return;t.style.height="auto";if(t.scrollHeight)t.style.height=(t.scrollHeight+2)+"px";}
function growAll(root){if(root)requestAnimationFrame(()=>root.querySelectorAll("textarea").forEach(autoGrow));}
// se cambia la larghezza (compare la barra di scorrimento, si allarga la finestra) le righe di testo cambiano: si rimisura
let growW=0;if(window.ResizeObserver)new ResizeObserver(en=>{const w=Math.round(en[0].contentRect.width);if(w&&w!==growW){growW=w;growAll($("invForm"));}}).observe($("invForm"));
// la causale prende il posto della descrizione della riga del noleggio; cancellandola torna il testo automatico
function invRowTa(r){return r?$("ivRows").querySelector('[data-rid="'+(window.CSS&&CSS.escape?CSS.escape(r.id):r.id)+'"] textarea'):null;}
function invCausaleSync(){
  const d=INV.d,c=String(d.causale||"");
  if(INV.causLink===false){if(c.trim())return;INV.causLink=true;const n=$("ivCNote");if(n)n.textContent="· diventa la descrizione della riga del noleggio";}
  const r=invCausTarget(d);if(!r)return;
  const show=x=>{const ta=invRowTa(x);if(ta&&ta!==document.activeElement){ta.value=x.desc;autoGrow(ta);}};
  if(c.trim()){
    // la riga legata è cambiata (righe rifatte, spostate o eliminate): quella di prima riprende il suo testo
    if(d.causaleId&&d.causaleId!==r.id){const old=d.righe.find(x=>x.id===d.causaleId);if(old&&old.auto){old.desc=old.auto;old.auto="";show(old);}}
    if(!r.auto&&r.desc!==c)r.auto=r.desc;r.desc=c;d.causaleId=r.id;
  }else{if(r.auto){r.desc=r.auto;r.auto="";}d.causaleId="";}
  show(r);growAll($("invForm"));
}
const arrotHint=(d,C)=>d.arrotStep===1?"all'euro":d.arrotStep===0.5?"ai 50 cent":d.arrotStep===0.1?"ai 10 cent":C.opzioni.arrot==="no"||!d.arrotAuto?"0,00":"automatico";
// totali, anteprima e controlli: si rifanno a ogni tasto, senza toccare i campi in cui si sta scrivendo
function renderInvLive(){
  if(!INV)return;
  const d=INV.d,C=STORE.contab(),k=FT.calc(d,C),issues=FT.validate(d,C),errs=issues.filter(x=>x.lv==="err");
  for(const l of k.lines){const el=$("invForm").querySelector('[data-rtot="'+(window.CSS&&CSS.escape?CSS.escape(l.id):l.id)+'"]');if(el)el.textContent=eur2(l.tot);}
  const ph=$("ivPriceHd");if(ph)ph.textContent=d.lordi?"Prezzo IVA compr.":"Prezzo netto";
  $("invTotals").innerHTML='<span>Imponibile <b>'+eur2(k.imponibile)+'</b></span><span>IVA <b>'+eur2(k.imposta)+'</b></span>'+(k.arrot?'<span>Arrot. <b>'+eur2(k.arrot)+'</b></span>':"")+'<span class="tot">Totale <b>€ '+eur2(k.totale)+'</b></span>'+(k.split?'<span>Da pagare <b>€ '+eur2(k.daPagare)+'</b></span>':"");
  $("invPaper").innerHTML=invoiceHTML(d,k,C);
  issues.sort((a,b)=>(a.lv==="err"?0:1)-(b.lv==="err"?0:1));
  $("invIssues").innerHTML=issues.length?'<ul>'+issues.map(x=>'<li class="'+x.lv+'">'+(x.lv==="err"?"Da correggere: ":"Nota: ")+esc(x.msg)+'</li>').join("")+'</ul>':'<p class="ok">Tutto in ordine: il file XML si può creare.</p>';
  const off=S.readOnly||!canInv(); // permesso tolto mentre la bozza è aperta: si può ancora guardare, non salvare né creare il file
  $("invXml").disabled=!!errs.length||off;$("invXml").title=errs.length?"Prima correggi le voci segnate in rosso":"";
  $("invSave").disabled=off;$("invDel").disabled=off;
  $("invState").textContent=d.xmlAt?"File XML creato il "+itD(d.xmlAt.slice(0,10))+(d.xmlBy?" da "+d.xmlBy:"")+(INV.dirty?" · modifiche non salvate":""):INV.isNew?"Nuova (non ancora salvata)":INV.dirty?"Modifiche non salvate":"Bozza salvata"+(d.updatedAt?" il "+itD(d.updatedAt.slice(0,10)):"");
}
// l'anteprima ha la stessa disposizione della fattura dell'Agenzia delle Entrate (quella dei PDF che ricevono i clienti)
function invoiceHTML(d,k,C){
  const A=C.azienda,c=d.cliente,dt=x=>FT.itLong(x),li=(l,v)=>v?'<div>'+l+': <b>'+esc(v)+'</b></div>':"";
  const dest=c.pa?c.sdi:c.nazione!=="IT"?"XXXXXXX":/^[A-Z0-9]{7}$/.test(c.sdi)?c.sdi:c.pec?"Indicata PEC":"0000000";
  let h='<div class="fe"><div class="fe-parti"><div><h5>Cedente/prestatore (fornitore)</h5>'+li("Identificativo fiscale ai fini IVA",A.paese+A.piva)+li("Codice fiscale",A.cf)+li("Denominazione",A.nome)+li("Regime fiscale",A.regime+" ("+(FT.REGIMI[A.regime]||"").toLowerCase()+")")+li("Indirizzo",[A.indirizzo,A.civico].filter(Boolean).join(", "))+'<div>Comune: <b>'+esc(A.comune)+'</b> Provincia: <b>'+esc(A.prov)+'</b></div><div>Cap: <b>'+esc(A.cap)+'</b> Nazione: <b>'+esc(A.nazione)+'</b></div>'+li("Telefono",A.tel)+'</div>'+
    '<div><h5>Cessionario/committente (cliente)</h5>'+li("Identificativo fiscale ai fini IVA",c.piva?c.paese+c.piva:"")+li("Codice fiscale",c.cf)+li("Denominazione",c.nome)+li("Indirizzo",[c.indirizzo,c.civico].filter(Boolean).join(", "))+'<div>Comune: <b>'+esc(c.comune)+'</b> Provincia: <b>'+esc(c.prov)+'</b></div><div>Cap: <b>'+esc(c.nazione==="IT"&&/^\d{5}$/.test(c.cap)?c.cap:"00000")+'</b> Nazione: <b>'+esc(c.nazione)+'</b></div>'+(dest==="Indicata PEC"?li("Pec",c.pec):"")+'</div></div>';
  h+='<table class="fe-t fe-doc"><thead><tr><th>Tipologia documento</th><th>Numero documento</th><th>Data documento</th><th>Codice destinatario</th></tr></thead><tbody><tr><td>'+esc(d.tipo)+' ('+esc((FT.TIPI_DOC[d.tipo]||"").toLowerCase())+')</td><td>'+(String(d.numero||"").trim()?esc(d.numero):'<span class="fe-bozza">BOZZA</span>')+'</td><td>'+esc(dt(d.data))+'</td><td>'+esc(dest)+'</td></tr></tbody></table>';
  const ord=d.pa.ordNum||d.pa.cig||d.pa.cup?"Vs.Ord. "+(d.pa.ordNum||"")+(d.pa.ordData?" del "+dt(d.pa.ordData):"")+(d.pa.cup?" CUP: "+d.pa.cup:"")+(d.pa.cig?" CIG: "+d.pa.cig:""):"";
  h+='<table class="fe-t fe-righe"><thead><tr><th class="l">Descrizione</th><th>Quantità</th><th>Prezzo unitario</th><th>Sconto o magg.</th><th>%IVA</th><th>Prezzo totale</th></tr></thead><tbody>'+
    (ord?'<tr><td class="l">'+esc(ord)+'</td><td></td><td></td><td></td><td></td><td></td></tr>':"")+(FT.causaleApart(d)?'<tr><td class="l">'+esc(d.causale)+'</td><td></td><td></td><td></td><td></td><td></td></tr>':"")+
    (k.lines.length?k.lines.map(l=>'<tr><td class="l">'+esc(l.desc)+'</td><td>'+eur2(l.qta)+'</td><td>'+Number(l.unit).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:6})+'</td><td>'+([l.sc,l.docSc].filter(Boolean).map(x=>"SC "+eur2(x)+"%").join(" + "))+'</td><td>'+(l.aliqOk?(l.perc>0?eur2(l.perc):esc(l.natura)):'<span class="fe-miss">?</span>')+'</td><td>'+eur2(l.tot)+'</td></tr>').join(""):'<tr><td class="l" colspan="6">Nessuna riga</td></tr>')+'</tbody></table>';
  h+='<table class="fe-t"><caption>RIEPILOGHI IVA</caption><thead><tr><th class="l">esigibilità iva / riferimenti normativi</th><th>%IVA</th><th>Totale imponibile</th><th>Totale imposta</th></tr></thead><tbody>'+
    k.riepilogo.map(r=>'<tr><td class="l">'+(r.esigibilita==="S"?"S (scissione dei pagamenti)":r.esigibilita==="I"?"I (esigibilità immediata)":esc(r.rif||FT.NATURE[r.natura]||""))+'</td><td>'+(r.perc>0?eur2(r.perc):esc(r.natura||"?"))+'</td><td>'+eur2(r.imponibile)+'</td><td>'+eur2(r.imposta)+'</td></tr>').join("")+'</tbody></table>';
  h+='<table class="fe-t"><caption>TOTALI</caption><thead><tr><th>Importo bollo</th><th>Sconto/Maggiorazione</th><th>Arr.</th><th>Totale documento</th></tr></thead><tbody><tr><td>'+(k.bollo?eur2(k.bollo)+" (virtuale)":"")+'</td><td>'+(k.sconto?"SC "+eur2(k.sconto)+"%":"")+'</td><td>'+(k.arrot?eur2(k.arrot):"")+'</td><td><b>'+eur2(k.totale)+'</b></td></tr></tbody></table>';
  const pg=d.pagamento;
  h+='<table class="fe-t"><thead><tr><th class="l">Modalità pagamento</th><th class="l">Coordinate bancarie</th><th class="l">Istituto</th><th>Data scadenza</th><th>Importo</th></tr></thead><tbody><tr><td class="l">'+esc(pg.mod)+' '+esc(FT.MOD_PAG[pg.mod]||"")+'</td><td class="l">'+(pg.mod==="MP05"&&A.iban?"IBAN "+esc(A.iban)+(A.abi||A.cab?"<br>ABI "+esc(A.abi)+" - CAB "+esc(A.cab):""):"")+'</td><td class="l">'+(pg.mod==="MP05"?esc(A.banca):"")+'</td><td>'+esc(dt(pg.scad))+'</td><td>'+eur2(k.daPagare)+'</td></tr></tbody></table></div>';
  return h;
}
function invTouch(){INV.dirty=true;INV.edits++;renderInvLive();}
function invRegen(ask){
  const d=INV.d,list=invBookings(d);
  if(!list.length){invMsg("Non trovo più in agenda i servizi di questa bozza.","err");return false;}
  // se ne manca qualcuno non si rifà niente: una fattura con un servizio in meno e lo stesso elenco sarebbe sbagliata
  if(list.missing.length){invMsg("Non trovo più in agenda "+(list.missing.length===1?"il servizio n. ":"i servizi n. ")+list.missing.join(", ")+" (eliminat"+(list.missing.length===1?"o":"i")+"?): le righe restano come sono. Correggile a mano o fai una bozza nuova.","err");return false;}
  if(ask&&INV.touched&&!confirm("Rifaccio le righe partendo dai servizi: quelle scritte o corrette a mano vanno perse. Continuo?"))return false;
  d.servizi=list.map(b=>({id:b.id,start:b.start,foglio:String(b.foglio||"")})); // un servizio spostato di giorno: data e n. foglio di adesso
  d.righe=FT.linesFor(list.map(invService),STORE.contab(),d.modo);d.bolloAddebita=false;INV.touched=false;
  d.causaleId="";if(INV.causLink!==false&&String(d.causale||"").trim()){const r=FT.causaleRow(d);if(r){r.auto=r.desc;r.desc=d.causale;d.causaleId=r.id;}}
  const cb=$("iv-bolloadd");if(cb)cb.checked=false;
  $("ivRows").innerHTML=invRowsHTML();growAll($("ivRows"));invTouch();return true;
}
function invPaChanged(){
  const d=INV.d,C=STORE.contab(),pa=d.cliente.pa;
  d.pa.split=pa&&C.opzioni.splitPA;
  if(INV.scadAuto&&FT.okDate(d.data))d.pagamento.scad=FT.addDays(d.data,pa?C.opzioni.giorniPA:C.opzioni.giorni);
}
function invInput(e){
  if(!INV)return;const el=e.target,d=INV.d,C=STORE.contab();
  const row=el.closest("[data-rid]");
  if(row&&el.dataset.rk){
    const r=d.righe.find(x=>x.id===row.dataset.rid);if(!r)return;
    let rv=inpVal(el);
    if(el.dataset.rk==="prezzo"&&r.tipo==="sconto")rv=-Math.abs(rv); // lo sconto in euro toglie sempre, con o senza il segno meno
    r[el.dataset.rk]=rv;INV.touched=true;if(el.dataset.rk==="aliq")el.classList.toggle("miss",!el.value);
    if(el.dataset.rk==="desc"){autoGrow(el);
      // si corregge la descrizione della riga che fa da causale: la causale la segue
      if(INV.causLink!==false&&String(d.causale||"").trim()&&r===invCausTarget(d)){d.causale=r.desc;r.auto="";d.causaleId=r.desc.trim()?r.id:"";const ca=$("iv-causale");if(ca){ca.value=d.causale;autoGrow(ca);}}}
    invTouch();return;
  }
  const p=el.dataset.m;if(!p)return;
  let v=inpVal(el);if(el.dataset.t==="bool")v=el.value==="1";
  if(p==="arrot"){d.arrotStep=0;d.arrotAuto=el.value===""&&C.opzioni.arrot!=="no";d.arrot=el.value===""?0:Number(el.value)||0;el.placeholder=arrotHint(d,C);document.querySelectorAll("#invForm [data-arr]").forEach(b=>b.setAttribute("aria-pressed","false"));invTouch();return;}
  setPath(d,p,v);
  if(p==="causale"){autoGrow(el);invCausaleSync();INV.touched=true;}
  if(p==="pagamento.scad")INV.scadAuto=false;
  // la scadenza segue la data senza ridisegnare il modulo (scrivendo la data a mano il cursore resta dov'è)
  if(p==="data"&&INV.scadAuto&&FT.okDate(d.data)){d.pagamento.scad=FT.addDays(d.data,d.cliente.pa?C.opzioni.giorniPA:C.opzioni.giorni);const sc=$("iv-scad");if(sc)sc.value=d.pagamento.scad;}
  if(e.type==="change"){
    let redraw=false;
    if(p==="cliente.sdi"){const pa=FT.isPA(d.cliente);if(pa!==d.cliente.pa){d.cliente.pa=pa;invPaChanged();redraw=true;}}
    if(p==="cliente.pa"){invPaChanged();redraw=true;}
    if(p==="modo"){if(invRegen(true)!==true){d.modo=d.modo==="riepilogo"?"singole":"riepilogo";redraw=true;}}
    if(p==="bollo"){if(!d.bollo&&d.bolloAddebita){d.bolloAddebita=false;d.righe=d.righe.filter(r=>r.tipo!=="bollo");}redraw=true;}
    if(p==="bolloAddebita"){
      d.righe=d.righe.filter(r=>r.tipo!=="bollo");
      if(d.bolloAddebita){const n1=C.aliquote.find(a=>a.natura==="N1");d.righe.push({id:FT.newId("r"),tipo:"bollo",desc:"IMPOSTA DI BOLLO ASSOLTA IN MODO VIRTUALE",qta:1,prezzo:C.opzioni.bolloImporto,sc:0,aliq:n1?n1.id:"",fogli:[]});}
      redraw=true;
    }
    if(redraw){const keep=el.id;renderInvForm();const again=keep&&$(keep);if(again)again.focus();}
  }
  invTouch();
}
$("invForm").addEventListener("input",invInput);$("invForm").addEventListener("change",invInput);
$("invForm").addEventListener("submit",e=>e.preventDefault());
$("invForm").addEventListener("click",e=>{
  if(!INV)return;const d=INV.d,C=STORE.contab(),t=e.target;
  if(t.closest("#ivPaShow")){$("ivPa").hidden=false;t.closest("#ivPaShow").remove();$("iv-ordnum").focus();return;}
  if(t.closest("#ivRegen")){invRegen(true);return;}
  const arr=t.closest("[data-arr]");
  if(arr){
    // si ricorda il passo, non l'importo: se poi cambiano i prezzi il totale resta arrotondato
    const st=Number(arr.dataset.arr);
    d.arrotStep=[0.1,0.5,1].includes(st)?st:0;d.arrotAuto=false;d.arrot=0;
    const f=$("iv-arrot");f.value="";f.placeholder=arrotHint(d,C);
    document.querySelectorAll("#invForm [data-arr]").forEach(b=>b.setAttribute("aria-pressed",String(!!d.arrotStep&&Number(b.dataset.arr)===d.arrotStep)));
    invTouch();return;
  }
  const add=t.closest("[data-radd]"),del=t.closest("[data-rdel]"),up=t.closest("[data-rup]");
  if(add){
    const first=d.righe.find(r=>r.aliq);
    d.righe.push(add.dataset.radd==="sconto"?{id:FT.newId("r"),tipo:"sconto",desc:C.opzioni.maiuscole?"SCONTO":"Sconto",qta:1,prezzo:-0,sc:0,aliq:first?first.aliq:"",fogli:[]}:{id:FT.newId("r"),tipo:"libera",desc:"",qta:1,prezzo:0,sc:0,aliq:"",fogli:[]});
  }else if(del){d.righe=d.righe.filter(r=>r.id!==del.dataset.rdel);if(!d.righe.some(r=>r.tipo==="bollo")&&d.bolloAddebita){d.bolloAddebita=false;const cb=$("iv-bolloadd");if(cb)cb.checked=false;}}
  else if(up){const i=d.righe.findIndex(r=>r.id===up.dataset.rup);if(i>0){const x=d.righe[i];d.righe[i]=d.righe[i-1];d.righe[i-1]=x;}}
  else return;
  INV.touched=true;$("ivRows").innerHTML=invRowsHTML();growAll($("ivRows"));invTouch();
  if(add){const rows=$("ivRows").querySelectorAll(".iv-row"),last=rows[rows.length-1];if(last)last.querySelector(add.dataset.radd==="sconto"?'[data-rk="prezzo"]':"textarea").focus();}
});
// riga da una causale: il testo si riempie con i dati del primo servizio della bozza
$("invForm").addEventListener("change",e=>{
  if(!INV||e.target.id!=="ivCau"||!e.target.value)return;
  const d=INV.d,C=STORE.contab(),c=C.causali.find(x=>x.id===e.target.value);e.target.value="";if(!c)return;
  const list=invBookings(d).map(invService),s=list[0];
  const vals=s?{MEZZO:FT.mezzo(s.vehicle,C),DATA:FT.itShort(s.start),DATA_FINE:FT.itShort(s.end||s.start),PERIODO:FT.periodo(s.start,s.end),MESE:FT.mesi(list),ITINERARIO:String(s.itin||"").replace(/\s*>\s*/g," - "),EVENTO:s.event||"",PAX:s.pax==null?"":String(s.pax),FOGLIO:s.foglio||"",TARGA:s.vehicle.plate||"",CLIENTE:s.client||"",N:String(list.length),PARCHEGGIO:""}:{MEZZO:"",DATA:"",DATA_FINE:"",PERIODO:"",MESE:"",ITINERARIO:"",EVENTO:"",PAX:"",FOGLIO:"",TARGA:"",CLIENTE:"",N:"",PARCHEGGIO:""};
  d.righe.push({id:FT.newId("r"),tipo:c.uso==="parcheggi"?"parcheggi":c.uso==="pasti"?"pasti":"libera",desc:FT.fill(c.testo,vals,C),qta:1,prezzo:0,sc:0,aliq:c.aliq||"",fogli:[]});
  INV.touched=true;$("ivRows").innerHTML=invRowsHTML();growAll($("ivRows"));invTouch();
  const rows=$("ivRows").querySelectorAll(".iv-row"),last=rows[rows.length-1];if(last)last.querySelector('[data-rk="prezzo"]').focus();
});
function closeInvoice(force){
  if(!INV){$("ovInv").hidden=true;return true;}
  if(INV.busy){toast("Aspetta un momento: sto creando il file XML.");return false;}
  if(!force&&INV.dirty&&!S.readOnly&&!confirm(INV.isNew?"Chiudere senza salvare la bozza?":"Chiudere senza salvare le modifiche alla bozza?"))return false;
  $("ovInv").hidden=true;INV=null;if(S.view==="bill")renderBill();return true;
}
$("invClose").onclick=()=>closeInvoice();backdropClose($("ovInv"),()=>closeInvoice());
async function invSave(quiet){
  if(!INV||S.readOnly)return false;
  if(!canInv()){invMsg("Non hai più il permesso di preparare le bozze di fattura.","err");return false;}
  const cur=INV,d=cur.d,was=cur.isNew,n0=cur.edits;
  d.updatedAt=new Date().toISOString();d.updBy=meName();
  $("invSave").disabled=true;if(!quiet)invMsg("Salvo…");
  try{
    const saved=await STORE.saveDraft(d,cur.rev);
    // d resta quello del modulo (se intanto si è scritto ancora non si perde niente); cambia solo lo stato
    cur.rev=STORE.draftRev(saved.id);cur.isNew=false;cur.dirty=cur.edits!==n0;
    ACC.log("fattura",(was?"Nuova bozza di fattura":"Modificata la bozza di fattura")+" «"+(saved.cliente.nome||"")+"» · € "+eur2(FT.calc(saved,STORE.contab()).totale)+(saved.servizi.length?" · n. "+saved.servizi.map(s=>s.foglio).filter(Boolean).slice(0,6).join(", ")+(saved.servizi.length>6?"…":""):""),{id:saved.id});
    if(INV!==cur)return true; // nel frattempo la finestra è stata chiusa o si è aperta un'altra bozza
    $("invDel").hidden=false;renderInvLive();if(!quiet)invMsg("Bozza salvata.","ok");
    return true;
  }catch(err){
    if(INV===cur)invMsg(err&&err.code==="offline"?"Serve la connessione a internet per salvare la bozza.":err&&err.code==="conflict"?"Un altro dispositivo ha modificato questa bozza mentre era aperta qui: per non cancellare le sue modifiche non la salvo. Chiudila e riaprila.":"Non riesco a salvare la bozza: riprova tra poco.","err");
    return false;
  }finally{if(INV===cur)$("invSave").disabled=S.readOnly||!canInv();}
}
$("invSave").onclick=()=>invSave();
$("invDel").onclick=async()=>{
  if(!INV||INV.isNew||S.readOnly)return;
  if(!canInv()){invMsg("Non hai più il permesso di preparare le bozze di fattura.","err");return;}
  if(!confirm("Eliminare questa bozza di fattura? I servizi in agenda non vengono toccati."))return;
  try{const d=INV.d;await STORE.deleteDraft(d.id);ACC.log("fattura","Eliminata la bozza di fattura «"+(d.cliente.nome||"")+"»",{id:d.id});INV.dirty=false;closeInvoice(true);toast("Bozza eliminata");}
  catch(err){invMsg(err&&err.code==="offline"?"Serve la connessione a internet.":"Non riesco a eliminarla: riprova tra poco.","err");}
};
// File XML per la contabilità (dalla 2.6): stesso nome del foglio di servizio (con più servizi: il primo e
// «_e_altri_N»; nota di credito: «NC_» davanti) e cartella Fatture XML / anno / mese / giorno del servizio.
// Una copia va in Dropbox, la bozza si salva con il nome del file e il file si scarica sul dispositivo.
// Rifacendolo per la stessa bozza il file prende il posto del precedente: alla contabilità non restano due file
// della stessa fattura. Se il nome è già di un'altra fattura si aggiunge _2, _3…
function invServicesSorted(d){return invBookings(d).slice().sort((a,b)=>String(a.start).localeCompare(String(b.start))||String(a.foglio).localeCompare(String(b.foglio)));}
function invFileBase(d){
  const list=invServicesSorted(d),n=Math.max(list.length,(d.servizi||[]).length);let base;
  if(list.length){const s=sheetNameParts(list[0]);base=n>1?s.fg+"_"+s.who+"_e_altri_"+(n-1):s.fg+"_"+s.who+(s.what?"_x_"+s.what:"");}
  else{const f=String(((d.servizi||[])[0]||{}).foglio||"").replace(/[^0-9A-Za-z-]/g,"").slice(0,24);base=(f||"fattura")+"_"+(slug(d.cliente&&d.cliente.nome)||"cliente")+(n>1?"_e_altri_"+(n-1):"");}
  return (d.tipo==="TD04"?"NC_":"")+base;
}
function invFileDate(d){const l=invServicesSorted(d);if(l.length)return l[0].start;const s=(d.servizi||[]).map(x=>x.start).filter(validDate).sort();return s[0]||d.data;}
$("invXml").onclick=async()=>{
  if(!INV||S.readOnly)return;
  if(!canInv()){invMsg("Non hai più il permesso di preparare le bozze di fattura.","err");return;}
  const cur=INV,C=STORE.contab();
  // il file si scrive dalla bozza ripulita (stessi controlli di quando si salva): quello che si vede è quello che esce
  const d=FT.cleanDraft(cur.d);
  const errs=FT.validate(cur.d,C).concat(d?FT.validate(d,C):[{lv:"err",msg:"La bozza non è valida."}]).filter(x=>x.lv==="err");
  if(errs.length){invMsg("Prima correggi: "+errs[0].msg,"err");return;}
  // un altro dispositivo ha salvato questa bozza mentre era aperta qui: niente file fatto da una copia vecchia
  if(!cur.isNew&&STORE.draftRev(cur.d.id)&&STORE.draftRev(cur.d.id)!==cur.rev){invMsg("Un altro dispositivo ha modificato questa bozza mentre era aperta qui: chiudila e riaprila prima di creare il file.","err");return;}
  $("invXml").disabled=true;cur.busy=true;invMsg("Preparo il file…");
  try{
    // rifatto per la stessa bozza: stesso progressivo d'invio, e il file nuovo prende il posto di quello di prima.
    // I file delle altre bozze non si sovrascrivono né si eliminano; il progressivo è diverso dal loro.
    const again=!!cur.d.xmlAt,oldPath=again?(cur.d.xmlPath||""):"";
    const others=STORE.drafts().filter(x=>x.id!==cur.d.id),taken=new Set(others.map(x=>String(x.xmlPath||"").toLowerCase()).filter(Boolean));
    let prog=cur.d.xmlProg||FT.progOf(cur.d.xmlName)||FT.progressivo();
    const progs=new Set(others.map(x=>x.xmlProg||FT.progOf(x.xmlName)).filter(Boolean));for(let i=0;progs.has(prog)&&i<500;i++)prog=FT.nextProg(prog);
    const out=FT.xml(d,C,{prog}),base=invFileBase(d),fdate=invFileDate(d);
    out.name=base+".xml";let path="",where="",oldLeft=false;
    if(navigator.onLine){
      try{
        for(let i=0;;i++){
          const nm=base+(i?"_"+(i+1):"")+".xml";
          try{const r=await STORE.saveInvoiceXml(nm,out.xml,oldPath,fdate,taken);path=r.path;oldLeft=r.oldLeft;out.name=path.split("/").pop();break;}
          catch(e){if(!(e&&e.code==="conflict")||i>=30)throw e;} // nome già usato da un'altra fattura: _2, _3…
        }
        where=" Copia in Dropbox › "+path.replace(STORE.BASE+"/","").split("/").slice(0,-1).join(" › ")+"."+(oldLeft?" Il file di prima di questa bozza ("+oldPath.split("/").pop()+") non sono riuscito a toglierlo: eliminalo a mano in Dropbox, così alla contabilità non arrivano due file.":"");
      }catch(_){where=" Non sono riuscito a metterne una copia in Dropbox.";}
    }else where=" Sei offline: il file è solo su questo dispositivo.";
    cur.d.xmlAt=new Date().toISOString();cur.d.xmlBy=meName();cur.d.xmlName=out.name;cur.d.xmlProg=prog;if(path)cur.d.xmlPath=path;cur.dirty=true;
    const saved=INV===cur?await invSave(true):false;
    const blob=new Blob([out.xml],{type:"application/xml"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=out.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
    ACC.log("fattura",(again?"Rifatto":"Creato")+" il file XML "+out.name+" («"+(d.cliente.nome||"")+"», € "+eur2(out.calc.totale)+", formato "+out.formato+")",{id:d.id});
    if(INV===cur)invMsg("File "+out.name+" scaricato."+where+(saved?"":" La bozza però non è stata salvata."),saved&&!oldLeft?"ok":"err");
  }catch(err){console.error(err);ACC.tlog("errore","Bozza fattura: file XML non creato",String((err&&(err.code||err.message))||err));if(INV===cur)invMsg("Non sono riuscito a creare il file.","err");}
  finally{cur.busy=false;if(INV===cur)renderInvLive();}
};
const FE_PRINT='@page{size:A4 portrait;margin:12mm}html,body{margin:0;background:#fff;color:#111;font:9.5pt/1.35 Arial,Helvetica,sans-serif}.fe h5{margin:0 0 3pt;font-size:9.5pt}.fe-parti{display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;margin-bottom:10pt}.fe-parti>div{padding:5pt 8pt}.fe-parti>div+div{border-left:1px solid #000}.fe-t{width:100%;border-collapse:collapse;margin:0 0 12pt}.fe-t caption{border:1px solid #000;border-bottom:0;font-weight:700;padding:3pt}.fe-t th{border:1px solid #000;font-weight:400;padding:3pt 5pt;font-size:8.5pt}.fe-t td{padding:4pt 5pt;text-align:right;vertical-align:top;border-left:1px solid #000;border-right:1px solid #000}.fe-t tbody tr:last-child td{border-bottom:1px solid #000}.fe-t .l{text-align:left}.fe-doc td{text-align:center;font-weight:700}.fe-bozza{letter-spacing:.1em}.fe-righe td.l{white-space:pre-wrap;overflow-wrap:anywhere}.fe-miss{color:#b00020;font-weight:700}';
$("invPrint").onclick=async()=>{
  if(!INV)return;
  const d=INV.d,C=STORE.contab(),html='<!doctype html><html lang="it"><head><meta charset="utf-8"><title>'+esc("Bozza fattura "+(d.cliente.nome||""))+'</title><style>'+FE_PRINT+'.wm{font-size:8pt;color:#666;margin:0 0 6pt}</style></head><body><p class="wm">BOZZA – non è la fattura: quella vera la emette la contabilità.</p>'+invoiceHTML(d,FT.calc(d,C),C)+'</body></html>';
  let fr=$("printFrame");if(fr)fr.remove();
  fr=document.createElement("iframe");fr.id="printFrame";fr.setAttribute("aria-hidden","true");fr.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(fr);await new Promise(r=>{fr.onload=r;fr.srcdoc=html;});
  try{fr.contentWindow.focus();fr.contentWindow.print();}catch(_){toast("Non riesco ad aprire la stampa.");}
};

// ----- elenco delle bozze -----
let invOnly=null; // elenco ristretto alle bozze di certi servizi
function openInvList(only){
  if(!canInv()){toast("Le bozze di fattura sono riservate: chiedi al Master.");return;}
  invOnly=Array.isArray(only)?only:null;if(!invOnly)invPending=null;
  $("invQ").value="";$("invQ").hidden=!!invOnly;renderInvList();$("ovInvList").hidden=false;
}
function renderInvList(){
  const C=STORE.contab(),q=norm($("invQ").value||"").trim();
  let list=STORE.drafts().sort((a,z)=>String(z.updatedAt||z.createdAt).localeCompare(String(a.updatedAt||a.createdAt)));
  const tot=list.length;if(invOnly)list=list.filter(d=>invOnly.includes(d.id));else if(q)list=list.filter(d=>norm([d.cliente.nome,d.numero,d.servizi.map(s=>s.foglio).join(" "),d.xmlName].join(" ")).includes(q));
  $("invListCount").textContent=invOnly?(list.length===1?"C'è già una bozza con questo servizio":"Ci sono già "+list.length+" bozze con questi servizi"):tot+(tot===1?" bozza":" bozze");
  $("invListNew").hidden=!(invOnly&&invPending);$("invListAll").hidden=!invOnly;
  $("invListBody").innerHTML=list.length?'<table class="bt inv-lt"><thead><tr><th>Data</th><th>Cliente</th><th>Servizi (n. foglio)</th><th class="r">Totale</th><th>Stato</th><th>Ultima modifica</th></tr></thead><tbody>'+list.map(d=>{const k=FT.calc(d,C),f=d.servizi.map(s=>s.foglio).filter(Boolean);
    return '<tr data-draft="'+esc(d.id)+'" tabindex="0"><td class="num">'+esc(itDate(d.data))+'</td><td><b>'+esc(d.cliente.nome||"—")+'</b>'+(d.numero?'<span class="sub">n. '+esc(d.numero)+'</span>':"")+'</td><td>'+esc(f.slice(0,4).join(", ")+(f.length>4?" … ("+f.length+")":""))+'</td><td class="num r"><b>'+eur2(k.totale)+'</b></td><td>'+(d.xmlAt?'<span class="inv-badge xml">XML creato il '+esc(itD(d.xmlAt.slice(0,10)))+'</span>':'<span class="inv-badge">Bozza</span>')+'</td><td>'+esc((d.updBy||d.createdBy||"")+" · "+itD(String(d.updatedAt||d.createdAt).slice(0,10)))+'</td></tr>';}).join("")+'</tbody></table>':'<p class="empty">'+(tot?"Nessuna bozza con queste parole.":"Non ci sono ancora bozze: dalla vista Fatturato premi «Bozza Fattura» sulla riga di un servizio.")+'</p>';
}
$("invQ").addEventListener("input",renderInvList);
$("invListBody").addEventListener("click",e=>{const tr=e.target.closest("[data-draft]");if(tr)openDraft(tr.dataset.draft);});
$("invListBody").addEventListener("keydown",e=>{if(e.key!=="Enter")return;const tr=e.target.closest("[data-draft]");if(tr)openDraft(tr.dataset.draft);});
$("invListClose").onclick=()=>{$("ovInvList").hidden=true;invPending=null;};backdropClose($("ovInvList"),()=>{$("ovInvList").hidden=true;invPending=null;});
$("invListNew").onclick=()=>{const l=invPending;if(l)openInvoice(l,true);};
$("invListAll").onclick=()=>openInvList();
$("invList").onclick=()=>openInvList();

// ----- vista Fatturato: caselle per scegliere più servizi e tasto «Bozza Fattura» -----
const invSel=new Set();
function invSelBookings(){const all=bookingsAll().concat(S.allDays?billSourceAll():[]);return [...invSel].map(k=>all.find(b=>invKey(b)===k)).filter(Boolean);}
function renderInvBar(){
  const on=canInv();$("billInv").hidden=!on;if(!on)return;
  const sel=invSelBookings(),n=sel.length,tot=sel.reduce((a,b)=>a+(Number(b.price)||0)+(Number(b.park)||0)+(Number(b.meals)||0),0);
  $("invSel").disabled=!n;$("invSel").textContent=n?"Bozza fattura unica dei "+n+" servizi selezionati (€ "+eur2(tot)+")":"Bozza fattura di più servizi";
  $("invSelClear").hidden=!n;
  const nd=STORE.drafts().length;$("invList").textContent="Bozze fattura"+(nd?" ("+nd+")":"");
}
$("invSel").onclick=()=>{const l=invSelBookings();if(l.length)openInvoice(l);};
$("invSelClear").onclick=()=>{invSel.clear();renderBill();};

// ---------- Memoria di quello che si scrive (2.6) ----------
// Mentre si scrive in itinerario, evento, programma, note per l'autista, note dei referenti e nelle righe della
// bozza fattura compaiono i testi già scritti nelle altre prenotazioni e bozze (i più usati prima). Nel programma
// il suggerimento vale per la riga in cui si scrive. «×» toglie un suggerimento per tutti (suggerimenti-tolti.json).
const MEM_MIN=2,MEM_MAX=8;
let memIdx=null,memAt=0,memEl=null,memList=[],memSel=-1;
const memKey=t=>norm(t).replace(/\s+/g," ").trim();
function memIndex(){
  if(memIdx&&Date.now()-memAt<20000)return memIdx;
  const idx={},hid=new Set(regRows("suggerimenti").map(r=>(r.f||"")+"|"+memKey(r.t||"")));
  const add=(f,t,when)=>{t=String(t||"").replace(/\s+/g," ").trim();if(t.length<3||t.length>1000)return;const k=memKey(t);if(hid.has(f+"|"+k))return;const m=idx[f]||(idx[f]=new Map());const o=m.get(k);if(o){o.n++;if(when>o.at){o.at=when;o.t=t;}}else m.set(k,{t,k,n:1,at:when||""});};
  for(const b of bookingsAll()){
    const w=String(b.updatedAt||b.byAt||b.start||"");
    add("itinerario",b.route,w);add("evento",b.event,w);
    for(const x of Array.isArray(b.program)?b.program:[])for(const l of String(x||"").split("\n"))add("programma",l,w);
    for(const x of Array.isArray(b.dnotes)?b.dnotes:[])if(x)add("note",x.t,w);
    add("refnote",b.contactNote,w);for(const x of Array.isArray(b.refs)?b.refs:[])if(x)add("refnote",x.note,w);
  }
  if(canInv())for(const d of STORE.drafts()){const w=String(d.updatedAt||d.createdAt||"");add("fattura",d.causale,w);for(const r of d.righe||[])if(r&&(r.tipo==="noleggio"||r.tipo==="libera"||r.tipo==="parcheggi"||r.tipo==="pasti"))add("fattura",r.desc,w);}
  memIdx=idx;memAt=Date.now();return idx;
}
function memQuery(el){
  if(el.dataset.memline){const v=el.value,c=el.selectionStart==null?v.length:el.selectionStart,a=v.lastIndexOf("\n",c-1)+1;let z=v.indexOf("\n",c);if(z<0)z=v.length;return {q:v.slice(a,z),a,z};}
  return {q:el.value,a:0,z:el.value.length};
}
function memFind(el){
  const {q}=memQuery(el),qk=memKey(q);if(qk.length<MEM_MIN)return [];
  const words=qk.split(/[^a-z0-9]+/).filter(Boolean);if(!words.length)return [];
  const m=memIndex()[el.dataset.mem];if(!m)return [];
  const out=[];for(const o of m.values()){if(o.k===qk)continue;if(words.every(w=>o.k.includes(w)))out.push(o);}
  out.sort((x,y)=>(y.k.startsWith(qk)?1:0)-(x.k.startsWith(qk)?1:0)||y.n-x.n||String(y.at).localeCompare(String(x.at)));
  return out.slice(0,MEM_MAX);
}
function memBox(){let b=$("memSug");if(!b){b=document.createElement("div");b.id="memSug";b.className="memsug";b.setAttribute("role","listbox");b.hidden=true;document.body.appendChild(b);
  b.addEventListener("mousedown",e=>e.preventDefault()); // il campo resta attivo
  b.addEventListener("click",e=>{const x=e.target.closest("[data-memdel]");if(x){memHide(+x.dataset.memdel);return;}const it=e.target.closest("[data-memi]");if(it)memPick(+it.dataset.memi);});}
  return b;}
function memClose(){const b=$("memSug");if(b){b.hidden=true;b.innerHTML="";}memList=[];memSel=-1;}
function memShow(el){
  if(S.readOnly&&el.closest("#fBooking,#invForm")){memClose();return;}
  memList=memFind(el);memEl=el;memSel=-1;const b=memBox();
  if(!memList.length){memClose();return;}
  const canDel=!S.readOnly;
  b.innerHTML='<div class="memsug-h">Già scritti'+(canDel?' <span>· × per toglierne uno</span>':'')+'</div>'+memList.map((o,i)=>'<div class="memsug-i" data-memi="'+i+'" role="option" title="'+esc(o.t)+'"><span>'+esc(o.t.length>160?o.t.slice(0,157)+"…":o.t)+'</span>'+(o.n>1?'<small>'+o.n+'×</small>':'')+(canDel?'<button type="button" data-memdel="'+i+'" aria-label="Togli questo suggerimento" title="Togli dai suggerimenti">×</button>':'')+'</div>').join("");
  const r=el.getBoundingClientRect(),w=Math.max(260,Math.min(r.width,560)),vh=window.innerHeight;
  b.style.width=w+"px";b.style.left=Math.max(8,Math.min(r.left,window.innerWidth-w-8))+"px";
  b.hidden=false;const h=b.offsetHeight;
  b.style.top=(r.bottom+4+h>vh&&r.top-4-h>0?r.top-4-h:r.bottom+4)+"px";
}
function memMark(){const b=$("memSug");if(!b)return;b.querySelectorAll("[data-memi]").forEach((x,i)=>x.setAttribute("aria-selected",String(i===memSel)));const s=b.querySelector('[aria-selected="true"]');if(s)s.scrollIntoView({block:"nearest"});}
function memPick(i){
  const o=memList[i],el=memEl;if(!o||!el)return;
  const {a,z}=memQuery(el);el.value=el.value.slice(0,a)+o.t+el.value.slice(z);
  const c=a+o.t.length;try{el.setSelectionRange(c,c);}catch(_){}
  memClose();el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));if(el.tagName==="TEXTAREA"&&typeof autoGrow==="function")autoGrow(el);el.focus();
}
async function memHide(i){
  const o=memList[i],el=memEl;if(!o||!el)return;
  if(!navigator.onLine){toast("Serve la connessione a internet per togliere un suggerimento.");return;}
  if(!confirm("Togliere dai suggerimenti «"+(o.t.length>80?o.t.slice(0,77)+"…":o.t)+"»?\nLe prenotazioni dove è scritto non cambiano."))return;
  try{await STORE.updateReg("suggerimenti",J=>{J.rows=J.rows||[];if(!J.rows.some(r=>r.f===el.dataset.mem&&memKey(r.t||"")===o.k))J.rows.push({id:nrid(),f:el.dataset.mem,t:o.t.slice(0,1000),by:meName(),at:new Date().toISOString()});if(J.rows.length>3000)J.rows=J.rows.slice(-3000);return J;});memIdx=null;memShow(el);}
  catch(_){toast("Non riesco a togliere il suggerimento adesso: riprova.");}
}
document.addEventListener("input",e=>{const el=e.target;if(el&&el.dataset&&el.dataset.mem&&e.isTrusted)memShow(el);},true);
document.addEventListener("focusout",e=>{if(e.target===memEl)setTimeout(()=>{if(document.activeElement!==memEl)memClose();},120);},true);
document.addEventListener("keydown",e=>{
  const b=$("memSug");if(!b||b.hidden||e.target!==memEl)return;
  const ta=memEl.tagName==="TEXTAREA",lastLine=!ta||memEl.value.indexOf("\n",memEl.selectionEnd==null?0:memEl.selectionEnd)<0;
  if(e.key==="ArrowDown"&&(memSel>=0||lastLine)){e.preventDefault();memSel=Math.min(memList.length-1,memSel+1);memMark();}
  else if(e.key==="ArrowUp"&&memSel>=0){e.preventDefault();memSel=Math.max(-1,memSel-1);memMark();}
  else if(e.key==="ArrowDown"||e.key==="ArrowUp")memClose();
  else if(e.key==="Enter"&&memSel>=0){e.preventDefault();e.stopPropagation();memPick(memSel);}
  else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();memClose();}
  else if(e.key==="Tab")memClose();
},true);
window.addEventListener("resize",memClose);
document.addEventListener("scroll",e=>{const b=$("memSug");if(b&&!b.hidden&&!b.contains(e.target))memClose();},true);

// ---------- Archivio (2.0): anagrafiche clienti, flotta, referenti, guide, hotel e tendine ----------
const ARCH=[
  {k:"clienti",ic:"👥",t:"Anagrafica clienti",n:()=>S.clients.length.toLocaleString("it-IT")+" clienti",open:()=>openClients()},
  {k:"flotta",ic:"🚌",t:"Anagrafica flotta",n:()=>S.fleet.length+" mezzi",open:()=>openFleet()},
  {k:"referenti",ic:"☎️",t:"Anagrafica referenti",n:()=>regRows("referenti").length+" referenti",open:()=>openReg("referenti")},
  {k:"guide",ic:"🧭",t:"Anagrafica guide",n:()=>regRows("guide").length+" guide",open:()=>openReg("guide")},
  {k:"hotel",ic:"🏨",t:"Anagrafica hotel",n:()=>regRows("hotel").length+" hotel",open:()=>openReg("hotel")},
  {k:"parcheggi",ic:"🅿️",t:"Anagrafica parcheggi",n:()=>regRows("parcheggi").length+" parcheggi",open:()=>openReg("parcheggi")},
  {k:"note",ic:"📝",t:"Tendina note",n:()=>tendina("note").length+" voci (causali delle note per l'autista)",open:()=>openReg("note")},
  {k:"ruolo",ic:"🏷️",t:"Tendina ruolo",n:()=>tendina("ruolo").length+" voci (ruolo del referente)",open:()=>openReg("ruolo")},
  {k:"contab",ic:"🧾",t:"Contabilità",n:()=>"Dati societari, aliquote IVA, causali, pagamento, sconti e arrotondamenti delle bozze di fattura",open:()=>openContab(),show:()=>canCont()},
];
function openArchive(){
  $("archGrid").innerHTML=ARCH.filter(a=>!a.show||a.show()).map(a=>'<button type="button" class="arch-tile" data-arch="'+a.k+'"><span class="ic" aria-hidden="true">'+a.ic+'</span><b>'+esc(a.t)+'</b><span>'+esc(a.n())+'</span></button>').join("");
  $("ovArch").hidden=false;
}
$("btnArch").onclick=openArchive;
$("archClose").onclick=()=>{$("ovArch").hidden=true;};
$("archGrid").addEventListener("click",e=>{const b=e.target.closest("[data-arch]");if(!b)return;const a=ARCH.find(x=>x.k===b.dataset.arch);$("ovArch").hidden=true;a.open();});
backdropClose($("ovArch"),()=>{$("ovArch").hidden=true;});

// --- editor delle anagrafiche e delle tendine ---
const REG_COLS={
  referenti:[["cliente","Cliente","dlCliNames"],["citta","Città","dlCities"],["nome","Nome"],["tel","Telefono"]],
  guide:[["nome","Nome"],["regione","Regione","dlRegions"],["citta","Città","dlCities"],["tel","Telefono"]],
  hotel:[["regione","Regione","dlRegions"],["citta","Città","dlCities"],["nome","Nome"],["indirizzo","Indirizzo"],["tel","Telefono"]],
  parcheggi:[["nome","Nome"],["citta","Città","dlCities"],["indirizzo","Indirizzo"],["fatt","In fattura"],["aliq","IVA della ricevuta",null,"aliq"]],
  note:[["v","Causale"]],ruolo:[["v","Ruolo"]],
};
const REG_TITLE={referenti:"Anagrafica referenti",guide:"Anagrafica guide",hotel:"Anagrafica hotel",parcheggi:"Anagrafica parcheggi",note:"Tendina note",ruolo:"Tendina ruolo"};
const REG_NOTE={referenti:"Si scelgono nel modulo della prenotazione (riga Referente). I referenti scritti nelle prenotazioni si aggiungono da soli.",
  guide:"Si scelgono nel modulo della prenotazione (riga Guida). Le guide scritte nelle prenotazioni si aggiungono da sole.",
  hotel:"Si scelgono nel modulo della prenotazione (riga Hotel), insieme agli hotel di Google Maps. Gli hotel scritti nelle prenotazioni si aggiungono da soli.",
  parcheggi:"Si scelgono nel modulo della prenotazione, accanto a «€ Parcheggi» (anche più di uno). «In fattura» è come il parcheggio compare nella riga di rimborso della bozza fattura (es. A SIRACUSA, ALL'APT. DI CATANIA): se è vuoto si usa la città. «IVA della ricevuta» è l'aliquota di quella riga.",
  note:"Voci della casella «Causale» delle note per l'autista. Parcheggi, autista e 3 ore vanno nelle righe 1°, 2° e 3° del foglio di servizio; le altre nella 4° (extra).",
  ruolo:"Voci della casella «Ruolo» del referente."};
const isTend=k=>k==="note"||k==="ruolo";
const regFile=k=>isTend(k)?"tendine":k;
const nrid=()=>"r"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let regKind=null,regNew=[];
function regList(k){return isTend(k)?tendina(k).map(v=>({id:"v:"+v,v})):regRows(k).slice();}
function regSort(k,l){
  if(isTend(k))return l;
  const key=k==="referenti"?r=>[r.cliente,r.nome]:k==="hotel"?r=>[r.regione,r.citta,r.nome]:k==="parcheggi"?r=>[r.citta,r.nome]:r=>[r.nome];
  return l.sort((a,b)=>{const x=key(a),y=key(b);for(let i=0;i<x.length;i++){const c=String(x[i]||"").localeCompare(String(y[i]||""),"it");if(c)return c;}return 0;});
}
function openReg(k){
  regKind=k;regNew=[];$("regQ").value="";$("regMsg").textContent="";
  $("regTitle").textContent=REG_TITLE[k];$("regNote").textContent=REG_NOTE[k];
  if(k==="referenti")$("dlCliNames").innerHTML=S.clients.map(c=>'<option value="'+esc(c[1])+'">').join("");
  fillPlaceLists();renderReg();$("ovReg").hidden=false;
}
function regRO(){return S.readOnly||!canEdit("anag");}
function renderReg(){
  const k=regKind;if(!k)return;
  const cols=REG_COLS[k],ro=regRO(),words=norm($("regQ").value).split(/[^a-z0-9]+/).filter(Boolean);
  const all=regList(k),list=regSort(k,all.filter(r=>!words.length||wmatch(cols.map(c=>r[c[0]]).join(" "),words)));
  const tpl=cols.map(c=>c[0]==="indirizzo"||c[0]==="nome"||c[0]==="cliente"||c[0]==="v"?"minmax(160px,1.6fr)":c[3]==="aliq"?"minmax(150px,1fr)":"minmax(110px,1fr)").join(" ")+(ro?"":" 36px");
  const cell=(c,r)=>c[3]==="aliq"?'<select data-c="'+c[0]+'"'+(ro?' disabled':'')+' aria-label="'+esc(c[1])+'">'+aliqOpts(STORE.contab(),r[c[0]]||"","da scegliere in fattura")+'</select>':'<input data-c="'+c[0]+'" maxlength="'+(c[0]==="v"?60:200)+'" value="'+esc(r[c[0]]||"")+'"'+(c[2]?' list="'+c[2]+'"':'')+(ro?' readonly':'')+' aria-label="'+esc(c[1])+'" autocomplete="off"'+(c[0]==="fatt"?' placeholder="A '+esc(String(r.citta||"città").toUpperCase())+'"':'')+'>';
  const row=(r,isNew)=>'<div class="reg-row'+(isNew?" new":"")+'" data-id="'+esc(r.id)+'" style="grid-template-columns:'+tpl+'">'+cols.map(c=>cell(c,r)).join("")+(ro?'':'<button type="button" class="del" data-regdel="'+esc(r.id)+'" title="Elimina" aria-label="Elimina">×</button>')+'</div>';
  $("regTable").innerHTML='<div class="reg-row hd" style="grid-template-columns:'+tpl+'">'+cols.map(c=>'<span>'+esc(c[1])+'</span>').join("")+(ro?'':'<span></span>')+'</div>'+
    regNew.map(r=>row(r,true)).join("")+list.map(r=>row(r,false)).join("")+(list.length||regNew.length?'':'<div class="reg-empty">'+(words.length?"Nessun risultato.":"Ancora vuota."+(ro?"":" Premi «+ Nuovo» per aggiungere."))+'</div>');
  $("regCount").textContent=all.length+(isTend(k)?" voci":"")+(words.length?" · "+list.length+" trovati":"");
  $("regNew").hidden=ro;
}
function regMsg(t,err){$("regMsg").textContent=t||"";$("regMsg").className="reg-msg"+(err?" err":"");}
$("regQ").addEventListener("input",renderReg);
$("regNew").onclick=()=>{regNew.unshift({id:"new:"+nrid()});renderReg();const f=$("regTable").querySelector(".reg-row.new input");if(f)f.focus();};
$("regBack").onclick=()=>{$("ovReg").hidden=true;regKind=null;openArchive();};
$("regClose").onclick=()=>{$("ovReg").hidden=true;regKind=null;};
// salvataggio di una riga quando cambi una casella (serve internet: l'anagrafica è condivisa)
// I salvataggi della stessa riga vanno in fila: se passi subito alla casella dopo mentre la prima
// si sta ancora salvando, la riga nuova non viene creata due volte.
$("regTable").addEventListener("change",e=>{
  const inp=e.target.closest("[data-c]");if(!inp||regRO())return;
  const rowEl=inp.closest(".reg-row"),k=regKind;
  (rowEl._dirty=rowEl._dirty||new Set()).add(inp.dataset.c); // si scrivono solo le caselle cambiate qui
  rowEl._q=(rowEl._q||Promise.resolve()).then(()=>regSaveRow(rowEl,k));
});
async function regSaveRow(rowEl,k){
  const id=rowEl.dataset.id,vals={},dirty=[...(rowEl._dirty||[])];if(rowEl._dirty)rowEl._dirty.clear();
  rowEl.querySelectorAll("[data-c]").forEach(x=>{vals[x.dataset.c]=cleanText(x.value);});
  if(!Object.entries(vals).some(([f,v])=>v&&f!=="aliq"))return; // una riga nuova con la sola IVA scelta aspetta il nome
  if(!navigator.onLine){regMsg("Serve la connessione a internet per salvare l'anagrafica.",true);return;}
  rowEl.classList.add("saving");
  try{
    let newId=id;
    if(isTend(k)){
      const v=vals.v,old=id.startsWith("v:")?id.slice(2):null;if(!v)return;
      await STORE.updateReg("tendine",J=>{const l=Array.isArray(J[k])?J[k]:TENDINE_DEF[k].slice();if(old!=null){const i=l.indexOf(old);if(i>=0)l[i]=v;else if(!l.includes(v))l.push(v);}else if(!l.includes(v))l.push(v);J[k]=[...new Set(l)];return J;});
      newId="v:"+v;ACC.log("impostazioni",(old!=null?"Tendina "+k+": «"+old+"» → «"+v+"»":"Tendina "+k+": aggiunta «"+v+"»"));
    }else if(id.startsWith("new:")){
      newId=nrid();
      await STORE.updateReg(k,J=>{J.rows=J.rows||[];J.rows.push(Object.assign({id:newId,by:meName(),at:new Date().toISOString()},vals));return J;});
      ACC.log("impostazioni",REG_TITLE[k]+": aggiunto «"+(vals.nome||vals.cliente||"")+"»");
    }else{
      // solo le caselle cambiate su questo dispositivo: le modifiche fatte intanto da altri sulla stessa riga restano
      let before=null,after=null;if(!dirty.length)return;
      await STORE.updateReg(k,J=>{const r=(J.rows||[]).find(x=>x.id===id);if(!r)return null;before=Object.assign({},r);for(const f of dirty)r[f]=vals[f]||"";Object.assign(r,{updBy:meName(),updAt:new Date().toISOString()});after=Object.assign({},r);return J;});
      if(!before){regMsg("Questa riga è stata eliminata da un altro dispositivo: la modifica non è stata salvata.",true);renderReg();return;}
      ACC.log("impostazioni",REG_TITLE[k]+": modificato «"+(after.nome||after.cliente||"")+"»",{ch:REG_COLS[k].filter(c=>(before[c[0]]||"")!==(after[c[0]]||"")).map(c=>[c[1],before[c[0]]||"",after[c[0]]||""])});
    }
    rowEl.dataset.id=newId;rowEl.classList.remove("new");
    const bt=rowEl.querySelector("[data-regdel]");if(bt)bt.dataset.regdel=newId;
    regNew=regNew.filter(r=>r.id!==id);
    regMsg("Salvato.");
    if(!rowEl.isConnected)renderReg(); // la tabella è stata ridisegnata durante il salvataggio
    else if(regKind===k&&!$("regQ").value.trim())$("regCount").textContent=regList(k).length+(isTend(k)?" voci":"");
  }catch(err){regMsg("Non riesco a salvare adesso: riprova.",true);ACC.tlog("errore","Anagrafica "+k+": salvataggio non riuscito",String(err&&(err.code||err.message)||err));}
  finally{rowEl.classList.remove("saving");}
}
$("regTable").addEventListener("click",async e=>{
  const d=e.target.closest("[data-regdel]");if(!d||regRO())return;
  const id=d.dataset.regdel,k=regKind;
  if(id.startsWith("new:")){regNew=regNew.filter(r=>r.id!==id);renderReg();return;}
  const rowEl=d.closest(".reg-row"),label=[...rowEl.querySelectorAll("[data-c]")].map(x=>x.value).filter(Boolean).join(" · ");
  if(!confirm("Eliminare «"+label+"»?"))return;
  if(!navigator.onLine){regMsg("Serve la connessione a internet.",true);return;}
  try{
    if(isTend(k)){const v=id.slice(2);await STORE.updateReg("tendine",J=>{J[k]=(Array.isArray(J[k])?J[k]:TENDINE_DEF[k].slice()).filter(x=>x!==v);return J;});}
    else await STORE.updateReg(k,J=>{J.rows=(J.rows||[]).filter(x=>x.id!==id);return J;});
    ACC.log("impostazioni",REG_TITLE[k]+": eliminato «"+label+"»");renderReg();regMsg("Eliminato.");
  }catch(_){regMsg("Non riesco a eliminare adesso: riprova.",true);}
});
backdropClose($("ovReg"),()=>{$("ovReg").hidden=true;regKind=null;});

// --- referenti, guide e hotel delle prenotazioni: si aggiungono da soli alle anagrafiche ---
const REG_KEY={referenti:r=>nkey(r.nome)+"|"+nkey(r.cliente),guide:r=>nkey(r.nome),hotel:r=>nkey(r.nome)+"|"+nkey(r.citta)};
const RAK="agenda-reg-add";
function regCandidates(b){
  const out={referenti:[],guide:[],hotel:[]},cl=shClient(b),cli=cl?cl[1]:(b.client||""),city=cl?cliField(cl,"city"):"";
  const ctel=cl&&cl[4]?String(cl[4]):"";
  for(const r of [ref1Of(b)].concat(b.refs||[]))if(r&&r.name)out.referenti.push({cliente:cli,citta:city,nome:r.name,tel:r.tel&&r.tel!==ctel?r.tel:""});
  for(const g of b.guides||[])if(g&&g.name)out.guide.push({nome:g.name,regione:g.region||"",citta:g.city||"",tel:g.tel||""});
  for(let h of b.hotels||[])if(h&&h.name){h=splitOldHotel(h);out.hotel.push({regione:h.region||"",citta:h.city||"",nome:h.name,indirizzo:h.addr||"",tel:h.tel||"",pid:h.pid||""});}
  return out;
}
function regAutoAdd(b){
  if(!canEdit("anag")||S.readOnly)return;
  let q={};try{q=JSON.parse(localStorage.getItem(RAK)||"{}")||{};}catch(_){}
  const c=regCandidates(b);
  for(const k in c){
    const have=new Set(regRows(k).map(REG_KEY[k]));
    for(const x of c[k])if(!have.has(REG_KEY[k](x))){(q[k]=q[k]||[]).push(x);have.add(REG_KEY[k](x));}
  }
  try{localStorage.setItem(RAK,JSON.stringify(q));}catch(_){}
  flushRegAdd();
}
let regAdding=false;
async function flushRegAdd(){
  if(regAdding||!navigator.onLine||!ACC.session())return;
  const readQ=()=>{try{return JSON.parse(localStorage.getItem(RAK)||"{}")||{};}catch(_){return {};}};
  let q=readQ();
  if(!Object.keys(q).some(k=>(q[k]||[]).length))return;
  regAdding=true;let again=false;
  try{
    for(const k of Object.keys(q)){
      const items=q[k]||[];if(!items.length||!REG_KEY[k])continue;
      let added=0;
      await STORE.updateReg(k,J=>{
        added=0; // (la funzione può ripartire se il file è cambiato nel frattempo)
        J.rows=J.rows||[];const idx=new Map(J.rows.map(r=>[REG_KEY[k](r),r]));let ch=false;
        for(const x of items){const o=idx.get(REG_KEY[k](x));
          if(!o){const r=Object.assign({id:nrid(),by:meName(),at:new Date().toISOString()},x);J.rows.push(r);idx.set(REG_KEY[k](x),r);added++;ch=true;}
          else for(const f in x)if(x[f]&&!o[f]){o[f]=x[f];ch=true;} // completa i dati mancanti (es. telefono)
        }
        return ch?J:null;
      });
      if(added)ACC.log("impostazioni",REG_TITLE[k]+": "+added+(added===1?" voce aggiunta":" voci aggiunte")+" dalle prenotazioni");
      // si tolgono dalla coda solo le voci appena scritte: quelle aggiunte intanto (altra prenotazione salvata) restano
      const done=new Set(items.map(x=>JSON.stringify(x))),cur=readQ();
      cur[k]=(cur[k]||[]).filter(x=>!done.has(JSON.stringify(x)));if(!cur[k].length)delete cur[k];
      try{localStorage.setItem(RAK,JSON.stringify(cur));}catch(_){}
    }
    const rest=readQ();again=Object.keys(rest).some(k=>REG_KEY[k]&&(rest[k]||[]).length); // arrivate altre voci intanto
  }catch(e){again=false;ACC.tlog("avviso","Anagrafiche: aggiunta automatica rimandata",String(e&&(e.code||e.message)||e));}
  finally{regAdding=false;}
  if(again)setTimeout(flushRegAdd,1500);
}
window.addEventListener("online",()=>setTimeout(flushRegAdd,3000));
// prima volta con la 2.0: le anagrafiche si riempiono con referenti, guide e hotel già scritti nelle prenotazioni
let regSeeded=false;
async function seedRegs(){
  if(regSeeded||!navigator.onLine||!ACC.session()||!STORE.hasData||$("app").hidden)return;
  regSeeded=true;
  await STORE.loadRegs().catch(()=>{}); // anagrafiche e tendine create mentre il dispositivo aveva una versione precedente
  STORE.loadInvoices().catch(()=>{}); // contabilità e bozze di fattura (2.4)
  const all={referenti:[],guide:[],hotel:[]};
  for(const b of bookingsAll()){
    const c=regCandidates(b);
    for(const k in c)for(const x of c[k]){
      all[k].push(x); // (gli hotel delle versioni precedenti arrivano già divisi da regCandidates)
    }
  }
  for(const k of Object.keys(all)){
    if(STORE.regLoaded(k)||!all[k].length)continue;
    try{
      await STORE.updateReg(k,J=>{
        if((J.rows||[]).length)return null; // c'è già: non si tocca
        const seen=new Set();J.rows=[];
        for(const x of all[k]){const key=REG_KEY[k](x);if(seen.has(key))continue;seen.add(key);J.rows.push(Object.assign({id:nrid(),by:"(dalle prenotazioni)",at:new Date().toISOString()},x));}
        return J.rows.length?J:null;
      });
    }catch(e){regSeeded=false;ACC.tlog("avviso","Anagrafiche: primo riempimento rimandato",String(e&&(e.code||e.message)||e));}
  }
}

// ---------- log tecnico nel Pannello Master ----------
let mstTlog=null,mstTlogKey="";
function tlRange(){const n=+$("tlPer").value,to=ACC.localDate(),d=new Date();d.setDate(d.getDate()-n);return {from:ACC.localDate(d),to};}
async function loadTlog(){
  const r=tlRange(),key=r.from+"|"+r.to;
  if(mstTlog&&mstTlogKey===key&&Date.now()-mstTlog.at<20000){renderTlog();return;}
  $("tlList").innerHTML='<div class="lg-empty">Leggo il log da Dropbox…</div>';
  try{const ev=await ACC.readTlog(r.from,r.to);mstTlog={ev,at:Date.now()};mstTlogKey=key;}
  catch(_){mstTlog=null;$("tlList").innerHTML='<div class="lg-empty">Non riesco a leggere il log. Controlla la connessione e riprova.</div>';return;}
  renderTlog();
}
function tlFiltered(){
  if(!mstTlog)return [];
  const lv=$("tlLev").value,q=norm($("tlQ").value).trim();
  return mstTlog.ev.filter(e=>(!lv||(lv==="errore"?e.l==="errore":e.l==="errore"||e.l==="avviso"))&&(!q||norm(e.m+" "+(e.d||"")+" "+e.n).includes(q)));
}
function renderTlog(){
  if(!mstTlog)return;
  const ev=tlFiltered(),max=800;
  $("tlList").innerHTML=ev.slice(0,max).map(e=>'<div class="lg-row"><span class="t">'+esc(logTime(e.t))+'</span><span>'+esc(e.n||"—")+'</span><span class="dv">'+esc(ACC.devLabel(e.dv)||e.auto||"")+(e.v?" · v"+esc(e.v):"")+'</span><span><span class="k '+esc(e.l)+'">'+esc(e.l)+'</span>'+esc(e.m)+(e.d?'<span class="d">'+esc(e.d)+'</span>':'')+'</span></div>').join("")||'<div class="lg-empty">Nessun messaggio nel periodo scelto. Bene così.</div>';
}
["tlLev"].forEach(id=>$(id).addEventListener("change",renderTlog));
$("tlPer").addEventListener("change",loadTlog);
$("tlQ").addEventListener("input",()=>{clearTimeout(renderTlog._t);renderTlog._t=setTimeout(renderTlog,150);});
$("tlTxt").onclick=()=>{
  const ev=tlFiltered().slice().reverse();
  const txt=["Agenda Flotta La Terra – log tecnico "+tlRange().from+" / "+tlRange().to,""].concat(ev.map(e=>{const d=new Date(e.t);return d.toLocaleString("it-IT")+" ["+e.l+"] "+(ACC.devLabel(e.dv)||e.auto||e.dv)+(e.n?" · "+e.n:"")+(e.v?" · v"+e.v:"")+" — "+e.m+(e.d?" | "+e.d:"");})).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"text/plain;charset=utf-8"}));a.download="log_agenda_"+tlRange().from+"_"+tlRange().to+".txt";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
};

// ---------- flotta: dati aggiornati del 30/09/2026 (una volta sola, su tutti i dispositivi) ----------
// Ogni riga dei dati nuovi va al mezzo con la stessa targa; se non c'è, al mezzo previsto (se libero),
// altrimenti al mezzo libero con i posti più vicini. Le prenotazioni restano legate al loro mezzo.
let fleetMigrating=false;
async function migrateFleet2026(){
  if(fleetMigrating||!navigator.onLine||!ACC.session()||$("app").hidden)return;
  const cur=STORE.fleet;
  if(!Array.isArray(cur)||!cur.length)return; // flotta mai modificata: valgono già i dati nuovi
  if((STORE.settings||{}).fleet2026||cur.some(v=>v.num!=null&&String(v.num)!==""))return;
  fleetMigrating=true;
  try{
    const np=t=>String(t||"").toUpperCase().replace(/\s+/g,"");
    const free=new Set(cur.map(v=>v.id)),assign={};
    const recs=FLEET_2026.map((r,i)=>({r,rec:fleetRec(r,i+1),kind:r[0]==="auto"?"auto":/^van/.test(r[0])?"van":"bus"}));
    for(const x of recs){const v=cur.find(y=>free.has(y.id)&&np(y.plate)&&np(y.plate)===np(x.rec.plate));if(v){assign[v.id]=x;free.delete(v.id);x.done=1;}}
    for(const x of recs){if(!x.done&&free.has(x.r[0])){assign[x.r[0]]=x;free.delete(x.r[0]);x.done=1;}}
    for(const x of recs){
      if(x.done)continue;let best=null;
      for(const v of cur){if(!free.has(v.id))continue;const kv=v.kind==="auto"?"auto":v.kind==="van"?"van":"bus";const sc=(kv===x.kind?0:1000)+Math.abs((v.seats||0)-x.rec.seats);if(!best||sc<best.sc)best={v,sc};}
      if(best){assign[best.v.id]=x;free.delete(best.v.id);x.done=1;}
    }
    const patches={};for(const id in assign)patches[id]=Object.assign({},assign[id].rec);
    const vs=await STORE.patchFleet(patches,S.fleet.map(v=>Object.assign({},v,{xcat:xcatOf(v)})));
    await STORE.setSettings({fleet2026:new Date().toISOString()});
    S.fleet=sortFleet(vs);renderAll();
    ACC.log("impostazioni","Flotta aggiornata con i dati del 30/09/2026 ("+Object.keys(patches).length+" mezzi)",{ch:Object.keys(patches).map(id=>{const o=cur.find(v=>v.id===id)||{};return [o.name||id,[o.seats?o.seats+" posti":"",o.plate||""].filter(Boolean).join(" "),vehLabel(Object.assign({},o,patches[id]))];})});
    notify("Flotta aggiornata con i dati nuovi (targhe, posti, categorie ed ID mezzo). Controlla le prenotazioni già inserite sui mezzi che prima non avevano la targa.",true);
  }catch(e){console.warn("Aggiornamento flotta non riuscito, riprovo più tardi:",e);}
  finally{fleetMigrating=false;}
}

// ---------- file dei fogli di servizio: in Dropbox e sul dispositivo ----------
async function saveXlsx(blob,filename){
  let where="";
  try{if(navigator.onLine){const sd=(sheetBooking&&sheetBooking.start)||todayISO();await STORE.saveSheetFile(filename,blob,sd);where="Copia salvata in Dropbox › "+STORE.sheetFolder(sd).replace(STORE.BASE+"/","").split("/").join(" › ")+".";}else where="Sei offline: il file è solo su questo dispositivo.";}
  catch(_){where="Non sono riuscito a salvarlo in Dropbox.";}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
  return where;
}
let canShareFile=false;
async function shareSheet(){
  if(!sheetBooking)return;
  try{
    const part=sheetPart(),blob=await tplPDF(sheetBooking,part);
    const file=new File([blob],sheetFileName(sheetBooking)+PART_SUFFIX[part]+(sheetBooking.provisional?"_PROVVISORIO":"")+".pdf",{type:"application/pdf"});
    await navigator.share({files:[file],title:"Foglio di servizio n. "+(sheetBooking.foglio||"")});
    sheetsOut[sheetBooking.id]=String(sheetBooking.foglio);
    ACC.log("foglio","Inviato il foglio di servizio n. "+(sheetBooking.foglio||"")+" «"+(sheetBooking.client||"")+"»"+PART_LOG[part],{id:sheetBooking.id});
    $("sheetMsg").textContent="Inviato.";
  }catch(e){if(e&&e.name!=="AbortError")$("sheetMsg").textContent="Invio non riuscito: scarica il PDF e allegalo.";}
}
(function(){try{const f=new File([new Blob(["x"])],"a.pdf",{type:"application/pdf"});if(navigator.canShare&&navigator.canShare({files:[f]})){canShareFile=true;$("sheetShare").hidden=false;}}catch(_){}})();
$("sheetShare").onclick=shareSheet;

// =====================================================================================
// 2.5 — Invio dei fogli agli autisti, stato dei fogli, spese della busta, Super Master,
//        profilo «solo anteprima e invio», telefoni degli autisti
// =====================================================================================
// La cartella degli autisti («Autisti La Terra») e tutto quello che ci passa stanno in autisti.js (AUT).
// All'autista arrivano il PDF del foglio (solo la parte per l'autista) e pochi dati del servizio:
// prezzi e parte contabile non vengono mai inviati.
let autReturn=null; // ritorno da Dropbox dopo aver autorizzato la cartella o un telefono
AUT.configure({onChange:()=>{
  if(!$("app").hidden&&S.view==="day")renderDay();
  if(!$("invio").hidden)renderInvio();
  if(!$("ovSheet").hidden)renderSheetSent();
  if(!$("ovMaster").hidden&&mstTab==="aut")renderAut();
}});
function autStart(){
  setInterval(()=>{if(document.visibilityState==="visible"&&ACC.session()&&AUT.linked())AUT.sync();},120000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&ACC.session()&&AUT.linked()&&Date.now()-AUT.lastSync>30000)AUT.sync();});
}
// messaggi sulla cartella degli autisti: il Super Master si nomina solo a lui
const autMissing=()=>"La cartella «Autisti La Terra» non è ancora collegata: "+(isSuper()?"collegala dal Pannello Super Master, scheda Autisti.":"i fogli si potranno inviare appena sarà stata collegata.");
const autBroken=()=>"Il collegamento con la cartella degli autisti non è più valido: "+(isSuper()?"ricollegala dal Pannello Super Master, scheda Autisti.":"va ricollegata. Il foglio NON è stato inviato.");
// servizi con busta (le spese valgono solo per questi): i tour e, dalla 2.6, gite, notturni e transfer con la spunta
const hasBusta=b=>!!b&&b.envelope==="SI"; // dalla 2.6 anche gite, notturni e transfer con la spunta «Busta per l'autista»
// la scheda spese si apre per i servizi con busta già inviati all'autista
function speseFor(b){return !!b&&hasBusta(b)&&!!(b.sent&&b.sent.at)&&!isInvio();}
// cosa parte verso l'autista: intestazione (cliente o alias), mezzo, autisti
function sendOpts(b,o){
  o=o||{};
  const v=vehicle(b.vehicle)||{},cl=shClient(b),alias=cl&&cl[2]?String(cl[2]):"",al=!!(o.alias&&alias);
  return {alias:al,noPlate:!!o.noPlate,cliente:al?alias:(cl?String(cl[1]):(b.client||"")),
    mezzo:{nome:v.name||"",posti:v.seats?String(v.seats)+(v.h?" H":""):"",targa:(v.plate||"").trim()},
    autisti:[...new Set([b.driver,b.driver2].map(realDriver).filter(Boolean).map(driverCanon))],by:meName()};
}
// stato dell'invio: null se il foglio non è mai stato inviato
function sentInfo(b){
  const st=AUT.status(b);if(!st)return null;
  // «da reinviare»: dopo l'invio è cambiato qualcosa che sta sul foglio (con l'alias serve l'anagrafica clienti già letta)
  st.stale=st.k!=="ritirato"&&st.k!=="consegnata"&&endOf(b)>=todayISO()&&!!b.sent.h&&!(b.sent.alias&&!(S.clients&&S.clients.length))&&b.sent.h!==AUT.sheetHash(b,sendOpts(b,b.sent));
  return st;
}
const SENT_LBL={inviato:"Inviato",aperto:"Aperto dall'autista",consegnata:"Busta consegnata",ritirato:"Ritirato"},SENT_SHORT={inviato:"Inviato",aperto:"Aperto",consegnata:"Busta consegnata",ritirato:"Ritirato"};
function sentTitle(b,st){
  if(st.k==="ritirato")return "Foglio ritirato dall'app dell'autista "+fmtTime(st.at)+(st.by?" da "+st.by:"");
  const l=["Inviato a "+(st.to.join(" e ")||"—")+" "+fmtTime(st.at)+(st.by?" da "+st.by:"")+(st.n>1?" (invio n. "+st.n+")":"")];
  if(st.k==="aperto")l.push("Aperto dall'autista "+fmtTime(st.when));
  if(st.k==="consegnata")l.push("Busta consegnata "+fmtTime(st.when));
  if(st.stale)l.push("ATTENZIONE: la prenotazione è cambiata dopo l'invio: il foglio va inviato di nuovo");
  return l.join("\n");
}
function sentChip(b){
  const st=sentInfo(b);if(!st)return "";
  return '<button type="button" class="snt k-'+st.k+(st.stale?" stale":"")+'" data-sent="'+esc(b.id)+'" data-start="'+esc(b.start)+'" title="'+esc(sentTitle(b,st))+'">'+esc(st.stale?"Da reinviare":SENT_SHORT[st.k])+'</button>';
}
// riga di stato nella finestra del foglio: inviato → aperto → busta consegnata
function renderSheetSent(){
  const b0=sheetBooking,bar=$("sheetSent");if(!b0){bar.hidden=true;return;}
  const b=bookingsAll().find(x=>x.id===b0.id)||b0,st=sentInfo(b),iv=isInvio(),on=AUT.linked();
  const stp=(ok,t,sub)=>'<span class="stp'+(ok?" on":"")+'"><i>✓</i><span>'+esc(t)+(sub?' <small>'+esc(sub)+'</small>':'')+'</span></span>';
  let h="";
  if(!st||st.k==="ritirato"){
    h='<span class="none">'+(st?"Foglio ritirato dall'app dell'autista "+esc(fmtTime(st.at))+(st.by?" da "+esc(st.by):"")+".":on?"Non ancora inviato all'autista.":autMissing())+'</span>';
  }else{
    const op=st.k==="aperto"||st.k==="consegnata";
    h=stp(true,"Inviato a "+(st.to.join(" e ")||"—"),fmtTime(st.at)+(st.by?" da "+st.by:"")+(st.n>1?" · invio n. "+st.n:""))+
      stp(op,"Aperto dall'autista",st.opened?fmtTime(st.opened)+(st.openedBy&&st.to.length>1?" da "+st.openedBy:""):op?"":st.openedOld?"aperta solo la versione precedente":"non ancora")+
      (hasBusta(b)?stp(st.k==="consegnata","Busta consegnata",st.k==="consegnata"?fmtTime(st.when):st.sp?st.sp.n+(st.sp.n===1?" spesa scritta":" spese scritte"):"non ancora"):"")+
      (st.stale?'<span class="warn">La prenotazione è cambiata dopo l\'invio: l\'autista ha ancora il foglio vecchio. Premi «Invia di nuovo».</span>':"");
  }
  bar.innerHTML=h;bar.hidden=false;
  const live=!!st&&st.k!=="ritirato";
  const lock=capoLock(b);
  if(b.capo)bar.insertAdjacentHTML("beforeend",'<span class="capo">'+esc(capoTitle(b))+(lock?": il foglio lo invia (e lo ritira) solo lui.":".")+'</span>');
  $("sheetSend").textContent=iv?(live?"Cambia bus o autisti e invia di nuovo":"Scegli bus e autisti e invia"):live?"Invia di nuovo":"Invia all'autista";
  $("sheetSend").disabled=lock;$("sheetSend").title=lock?"Bus e autisti decisi dal capo: il foglio lo invia lui":"";
  $("sheetWithdraw").hidden=!live||lock;
  $("sheetSpese").hidden=!(live&&speseFor(b));
}
let sending=false;
// Invia il foglio (parte per l'autista) e i dati del servizio. say: dove scrivere i messaggi.
async function sendToDriver(b0,o,say){
  say=say||toast;
  if(sending)return false;
  if(S.outdated){say("Questa pagina ha una versione vecchia dell'agenda: chiudila e riaprila prima di inviare.");return false;}
  const b=bookingsAll().find(x=>x.id===b0.id);
  if(!b){say("La prenotazione non c'è più (eliminata o spostata).");return false;}
  if(capoLock(b)){say(CAPO_NO);return false;}
  if(!AUT.linked()){say(autMissing());return false;}
  if(!navigator.onLine){say("Per inviare il foglio serve la connessione a internet.");return false;}
  if(STORE.isPending(b.id)){say("La prenotazione non è ancora arrivata in Dropbox (n. foglio provvisorio): riprova tra qualche secondo.");return false;}
  const so=sendOpts(b,o);
  if(!so.autisti.length){say("Manca l'autista: prima di inviare il foglio va assegnato un autista alla prenotazione.");return false;}
  if(o.alias&&!so.alias){say("Per questo foglio è stata scelta l'intestazione con l'alias, ma l'alias del cliente non si trova"+(S.clients&&S.clients.length?"":" (l'elenco clienti non è ancora stato letto)")+": il foglio NON è partito. Apri l'anteprima e controlla «Intestazione».");return false;}
  const ph=(STORE.aut&&STORE.aut.phones)||{},noPhone=so.autisti.filter(n=>!Object.values(ph).some(f=>!f.blocked&&norm(f.driver)===norm(n)));
  const again=!!(b.sent&&b.sent.at&&!b.sent.off);
  if(!o.noConfirm&&!confirm("Inviare il foglio di servizio n. "+(b.foglio||"")+" («"+so.cliente+"», "+itD(b.start)+") a "+so.autisti.join(" e ")+"?\n\nParte solo il foglio per l'autista: prezzi e parte contabile non vengono inviati."+
    (pending(b)?"\n\nATTENZIONE: questa prenotazione è ancora IN SOSPESO.":"")+
    (noPhone.length?"\n\nNessun telefono collegato per "+noPhone.join(" e ")+": il foglio resta in attesa finché il telefono non viene collegato.":"")+
    (again?"\n\nIl foglio era già stato inviato: l'autista vedrà la versione nuova.":"")))return false;
  // intanto (mentre la domanda era aperta, o su un altro dispositivo) il capo può aver deciso bus e autisti:
  // si rilegge Dropbox e, in quel caso, non si invia
  say("Controllo la prenotazione…");try{await STORE.pull();}catch(_){}
  {const now=bookingsAll().find(x=>x.id===b.id);if(!now){say("La prenotazione non c'è più (eliminata o spostata).");return false;}
    if(capoLock(now)||now.vehicle!==b.vehicle||(now.driver||"")!==(b.driver||"")||(now.driver2||"")!==(b.driver2||"")){say(capoLock(now)?CAPO_NO:"Bus o autisti sono appena cambiati: controlla l'anteprima e invia di nuovo.");return false;}}
  sending=true;say("Invio il foglio all'autista…");
  try{
    // il PDF è quello dell'anteprima, sempre e solo nella parte per l'autista
    const keep={alias:SHO.alias,noPlate:SHO.noPlate};let blob;
    try{SHO.alias=so.alias;SHO.noPlate=so.noPlate;try{await ensureSheetFont();}catch(_){}blob=await tplPDF(Object.assign({},b,{provisional:false}),"driver");}
    finally{SHO.alias=keep.alias;SHO.noPlate=keep.noPlate;}
    const sent=await AUT.send(b,blob,so);
    if(!markSent(b,sent)){say("Il foglio è partito, ma intanto la prenotazione è stata spostata o eliminata: controlla l'elenco e, se serve, invia di nuovo.");return false;}
    ACC.log("foglio","Inviato all'autista ("+sent.to.join(", ")+") il foglio di servizio n. "+(b.foglio||"")+" «"+(b.client||"")+"»"+(sent.n>1?" – invio n. "+sent.n:""),{id:b.id});
    sheetsOut[b.id]=String(b.foglio);
    say("Foglio inviato a "+sent.to.join(" e ")+".");
    return true;
  }catch(e){
    const c=e&&e.code;
    say(c==="no_auth"||c==="nolink"?autBroken():c==="network"||c==="busy"?"Dropbox non risponde: il foglio NON è stato inviato. Riprova tra poco.":c==="readonly"?"Con questo profilo non si può fare.":c==="capo"?CAPO_NO:"Non sono riuscito a inviare il foglio: riprova.");
    ACC.tlog("errore","Invio del foglio all'autista non riuscito",String((e&&(e.code||e.summary||e.message))||e));
    return false;
  }finally{sending=false;}
}
// scrive sulla prenotazione solo il campo «sent» (le modifiche fatte intanto da altri sugli altri campi restano)
function markSent(b,sent){
  const doc=S.days[b.start],cur=doc&&doc.bookings&&doc.bookings[b.id];if(!cur)return false;
  writeDayOps(b.start,{bookings:{[b.id]:Object.assign({},cur,{sent})}},Object.assign({edit:true,only:true,base:cur.updatedAt||null,patch:["sent"]},isInvio()||isSuper()?{boss:true}:{}));
  if(!$("app").hidden)renderAll();if(!$("invio").hidden)renderInvio();
  return true;
}
async function withdrawFromDriver(b0,say){
  say=say||toast;
  const b=bookingsAll().find(x=>x.id===b0.id);if(!b||!b.sent||b.sent.off)return false;
  if(capoLock(b)){say(CAPO_NO);return false;}
  if(!AUT.linked()||!navigator.onLine){say("Per ritirare il foglio serve la connessione a internet.");return false;}
  if(!confirm("Ritirare il foglio n. "+(b.foglio||"")+" dall'app dell'autista ("+((b.sent.to||[]).join(" e ")||"—")+")?\nL'autista non lo vedrà più. Le spese già scritte restano in archivio."))return false;
  try{
    const off=await AUT.withdraw(b,meName());
    markSent(b,Object.assign({},b.sent,{off}));
    ACC.log("foglio","Ritirato dall'app dell'autista il foglio di servizio n. "+(b.foglio||"")+" «"+(b.client||"")+"»",{id:b.id});
    say("Foglio ritirato dall'app dell'autista.");return true;
  }catch(e){say("Non sono riuscito a ritirare il foglio: riprova.");ACC.tlog("errore","Ritiro del foglio dall'autista non riuscito",String((e&&(e.code||e.summary))||e));return false;}
}
// prenotazione eliminata: se il foglio era dall'autista, si ritira
function withdrawAfterDelete(b){
  if(!b||!b.sent||!b.sent.at||b.sent.off)return;
  const warn=()=>notify("La prenotazione «"+(b.client||"")+"» del "+itD(b.start)+" è stata eliminata, ma non sono riuscito a ritirare il foglio n. "+(b.foglio||"")+" dall'app dell'autista ("+((b.sent.to||[]).join(" e ")||"—")+"): avvisalo.",true);
  if(!AUT.linked()||!navigator.onLine){warn();return;}
  AUT.withdraw(b,meName()).then(()=>{ACC.log("foglio","Ritirato dall'app dell'autista il foglio n. "+(b.foglio||"")+" (prenotazione eliminata)",{id:b.id});toast("Foglio ritirato dall'app dell'autista");}).catch(warn);
}
const sheetSay=t=>{$("sheetMsg").textContent=t;};
$("sheetSend").onclick=async()=>{
  if(!sheetBooking)return;refreshSheetBooking();
  // il capo sceglie sempre bus e autisti prima di inviare
  if(isInvio()){openCapo(sheetBooking,{alias:SHO.alias,noPlate:SHO.noPlate});return;}
  $("sheetSend").disabled=true;
  try{await sendToDriver(sheetBooking,{alias:SHO.alias,noPlate:SHO.noPlate},sheetSay);refreshSheetBooking();}
  finally{$("sheetSend").disabled=false;renderSheetSent();}
};
$("sheetWithdraw").onclick=async()=>{if(!sheetBooking)return;await withdrawFromDriver(sheetBooking,sheetSay);refreshSheetBooking();renderSheetSent();};
$("sheetSpese").onclick=()=>{if(sheetBooking)openSpese(sheetBooking);};
$("fSpese").onclick=()=>{if(!editing)return;const b=bookingsAll().find(x=>x.id===editing.id);if(b)openSpese(b);};

// ---------- scheda con le spese dell'autista (servizi con busta) ----------
let spB=null,spData=null,spUrl="",spReq=0;
function spClosePhoto(){$("spPhoto").hidden=true;$("spImg").removeAttribute("src");if(spUrl){try{URL.revokeObjectURL(spUrl);}catch(_){}spUrl="";}}
function openSpese(b){
  if(isInvio())return;
  spB=b;spData=null;spClosePhoto();$("spMsg").textContent="";$("ovSpese").hidden=false;renderSpese();loadSpese();
}
async function loadSpese(){
  if(!spB)return;
  if(!AUT.linked()){$("spMsg").textContent=autMissing();return;}
  if(!navigator.onLine){$("spMsg").textContent="Per leggere le spese serve la connessione a internet.";return;}
  const req=++spReq,id=spB.id,mine=()=>req===spReq&&!!spB&&spB.id===id;$("spMsg").textContent="Leggo le spese dalla cartella degli autisti…";
  try{await AUT.sync();if(!mine())return;const d=await AUT.spese(spB);if(!mine())return;spData=d||{v:1,righe:[],kmPartenza:null,kmRientro:null,note:"",consegnata:false,consegnataAt:"",autista:"",updatedAt:"",none:true};$("spMsg").textContent="";}
  catch(e){if(!mine())return;$("spMsg").textContent=e&&e.code==="no_auth"?autBroken():"Non riesco a leggere le spese adesso. Riprova.";}
  renderSpese();
}
function renderSpese(){
  if(!spB)return;
  const b=bookingsAll().find(x=>x.id===spB.id)||spB,st=sentInfo(b)||{},d=spData;
  $("spTitle").textContent="Spese dell'autista · foglio n. "+(b.foglio||"");
  $("spInfo").innerHTML="<b>"+esc(b.client||"Senza cliente")+"</b> · "+esc(itD(b.start))+(endOf(b)!==b.start?" – "+esc(itD(endOf(b))):"")+" · Autista: <b>"+esc(((b.sent&&b.sent.to)||[]).join(" e ")||driversText(b)||"—")+"</b> · Busta n. <b>"+esc(b.envno||"—")+"</b>";
  const pill=$("spState"),deliv=st.k==="consegnata";
  pill.className="pill "+(deliv?"on":st.k==="ritirato"?"off":"");
  pill.textContent=deliv?"Busta consegnata "+fmtTime(st.when):st.k==="ritirato"?"Foglio ritirato":st.re?"Busta riaperta dall'ufficio "+fmtTime(st.re):"Busta non ancora consegnata";
  $("spReopen").hidden=!deliv||S.readOnly;
  if(!d){$("spTot").innerHTML="";$("spBody").innerHTML="";return;}
  const t=AUT.totals(d,b.advance),tile=(l,v,c)=>'<div class="'+(c||"")+'"><span>'+esc(l)+'</span><b>'+esc(v)+'</b></div>';
  $("spTot").innerHTML=tile("Anticipo in busta",t.anticipo==null?"—":"€ "+eur2(t.anticipo))+tile("Spese in contanti","€ "+eur2(t.contanti))+
    tile(t.rimanenza!=null&&t.rimanenza<0?"Da rimborsare all'autista":"Rimanenza in busta",t.rimanenza==null?"—":"€ "+eur2(Math.abs(t.rimanenza)),"main"+(t.rimanenza!=null&&t.rimanenza<0?" neg":""))+
    tile("Con carta aziendale","€ "+eur2(t.carta));
  let h="";
  if(d.none||!d.righe.length)h+='<div class="lg-empty">'+(d.none?"L'autista non ha ancora scritto nessuna spesa.":"Nessuna spesa scritta.")+'</div>';
  for(const c of Object.keys(AUT.CATS)){
    const rows=d.righe.filter(r=>r.cat===c).sort((a,z)=>(a.data||"")<(z.data||"")?-1:1);if(!rows.length)continue;
    h+='<div class="sp-cat"><h4><span>'+esc(AUT.CATS[c])+'</span><span>€ '+esc(eur2(t.cat[c]||0))+'</span></h4>'+rows.map(r=>
      '<div class="sp-row"><span>'+esc(r.data?itD(r.data):"—")+'</span><span>'+esc(r.luogo||"—")+(r.nota?'<small>'+esc(r.nota)+'</small>':'')+'</span><span>'+(r.pag==="carta"?"carta aziendale":"contanti")+'</span><span class="eu">€ '+esc(eur2(r.importo))+'</span>'+
      '<span>'+(r.foto?'<button type="button" class="btn" data-spf="'+esc(r.foto)+'">Scontrino</button>':'<small>senza foto</small>')+'</span></div>').join("")+'</div>';
  }
  const km=v=>v==null?"—":v.toLocaleString("it-IT");
  h+='<div class="sp-tot sp-km">'+tile("Km alla partenza",km(d.kmPartenza))+tile("Km al rientro",km(d.kmRientro))+tile("Km effettuati",km(t.km))+'</div>';
  if(d.note)h+='<div class="sp-note"><b>Note dell\'autista</b>'+esc(d.note)+'</div>';
  if(d.updatedAt)h+='<p class="mst-sub">Ultimo aggiornamento dal telefono: '+esc(fmtTime(d.updatedAt))+(d.autista?" · "+esc(d.autista):"")+'</p>';
  $("spBody").innerHTML=h;
}
$("spBody").addEventListener("click",async e=>{
  const b=e.target.closest("[data-spf]");if(!b||!spB)return;
  $("spMsg").textContent="Scarico la foto dello scontrino…";
  try{const blob=await AUT.photo(spB,b.dataset.spf);spClosePhoto();spUrl=URL.createObjectURL(blob);$("spImg").src=spUrl;$("spPhoto").hidden=false;$("spMsg").textContent="";$("spPhoto").scrollIntoView({block:"nearest"});}
  catch(err){$("spMsg").textContent=err&&err.code==="badphoto"?"Il file dello scontrino non è una foto valida: non l'ho aperto.":"Non riesco a scaricare la foto. Riprova.";}
});
$("spPhotoClose").onclick=spClosePhoto;
$("spReload").onclick=loadSpese;
$("spClose").onclick=()=>{$("ovSpese").hidden=true;spClosePhoto();spB=null;spData=null;};
backdropClose($("ovSpese"),()=>$("spClose").click());
$("spReopen").onclick=async()=>{
  if(!spB||isInvio()||S.readOnly)return;
  if(!confirm("Riaprire la busta? L'autista potrà di nuovo aggiungere o correggere le spese e dovrà consegnarla un'altra volta."))return;
  try{await AUT.reopen(spB,meName());ACC.log("foglio","Riaperta la busta del foglio n. "+(spB.foglio||"")+" «"+(spB.client||"")+"»",{id:spB.id});$("spMsg").textContent="Busta riaperta.";renderSpese();}
  catch(_){$("spMsg").textContent="Non riesco a riaprire la busta adesso. Riprova.";}
};

// ---------- profilo «solo anteprima e invio»: elenco dei servizi del giorno ----------
let sdDay="";
function renderInvio(){
  if(!sdDay||!validDate(sdDay))sdDay=todayISO();
  const s=ACC.session()||{},d=parse(sdDay),w=wday(sdDay);
  $("sdName").textContent=s.name||"";$("sdVer").textContent="Agenda Flotta La Terra · versione "+APP_VERSION+" · profilo «solo anteprima e invio»";
  $("sdDate").textContent=WDL[w]+" "+d.getUTCDate()+" "+MN[d.getUTCMonth()]+" "+d.getUTCFullYear()+(sdDay===todayISO()?" · oggi":"");
  $("sdDate").className="sd-date"+(w===0?" sun":"");
  if(document.activeElement!==$("sdPick"))$("sdPick").value=sdDay;
  const wn=$("sdWarn");
  if(!AUT.linked()){wn.textContent=autMissing();wn.hidden=false;}else wn.hidden=true;
  const list=dayList(sdDay).slice().sort((a,b)=>(a.time||"99").localeCompare(b.time||"99")||String(a.foglio||"").localeCompare(String(b.foglio||"")));
  $("sdList").innerHTML=list.map(b=>{
    const v=vehicle(b.vehicle)||{},tot=diff(b.start,endOf(b))+1,i=diff(b.start,sdDay)+1,st=sentInfo(b),real=[b.driver,b.driver2].map(realDriver).filter(Boolean);
    const live=!!st&&st.k!=="ritirato";
    const stTxt=!st?'<span class="pill">Da inviare</span>':'<span class="snt k-'+st.k+(st.stale?" stale":"")+'">'+esc(st.stale?"Da reinviare":SENT_LBL[st.k])+'</span><small>'+esc(st.k==="ritirato"?"ritirato "+fmtTime(st.at):"inviato "+fmtTime(st.at)+(st.by?" da "+st.by:"")+(st.k==="aperto"?" · aperto "+fmtTime(st.when):st.k==="consegnata"?" · busta consegnata "+fmtTime(st.when):""))+'</small>';
    return '<div class="sd-card '+esc(b.type)+'">'+
      '<div class="sd-main"><div class="sd-l1"><span class="sd-time">'+esc(i===1?(b.time||"—"):"—")+'</span><span class="sd-cli">'+esc(dispClient(b))+'</span><span class="sd-tp">'+esc((TYPES[b.type]||"Servizio")+(tot>1?" · giorno "+i+" di "+tot:"")+(pending(b)?" · in sospeso":""))+'</span></div>'+
      '<div class="sd-rt">'+esc([hasEvent(b.type)&&b.event?b.event:"",whatToday(b,sdDay)||b.route||""].filter(Boolean).join(" – "))+'</div>'+
      '<div class="sd-meta">Autista: <b>'+(driversHTML(b)||'<span class="gen">da assegnare</span>')+'</b> · Mezzo: <b>'+esc(vehLabel(v)||v.name||"—")+'</b> · Foglio n. <b>'+esc(b.foglio||"—")+'</b>'+(hasBusta(b)?' · Busta n. <b>'+esc(b.envno||"—")+'</b>':'')+'</div>'+
      '<div class="sd-capo'+(b.capo?" on":"")+'">'+esc(b.capo?capoTitle(b):"Bus e autisti scritti dall'ufficio: li decidi tu quando invii")+'</div>'+
      '<div class="sd-st">'+stTxt+'</div></div>'+
      '<div class="sd-act"><button type="button" class="btn" data-sdprev="'+esc(b.id)+'">Anteprima</button><button type="button" class="btn send" data-sdsend="'+esc(b.id)+'">'+(live?"Invia di nuovo":"Invia all'autista")+'</button>'+(live?'<button type="button" class="btn quiet" data-sdoff="'+esc(b.id)+'">Ritira il foglio</button>':'')+'</div></div>';
  }).join("")||'<div class="sd-empty">Nessun servizio in questo giorno.</div>';
}
function sdGo(day){if(validDate(day)){sdDay=day;renderInvio();}}
$("sdPrev").onclick=()=>sdGo(addDays(sdDay||todayISO(),-1));
$("sdNext").onclick=()=>sdGo(addDays(sdDay||todayISO(),1));
$("sdToday").onclick=()=>sdGo(todayISO());
$("sdPick").addEventListener("change",()=>sdGo($("sdPick").value));
$("sdOut").onclick=()=>doLogout();
$("sdSync").onclick=async()=>{const b=$("sdSync");b.disabled=true;b.textContent="Aggiorno…";try{await STORE.pull();await AUT.sync();}finally{b.disabled=false;b.textContent="Aggiorna";renderInvio();toast(navigator.onLine?"Elenco aggiornato":"Sei offline");}};
$("sdList").addEventListener("click",async e=>{
  const pv=e.target.closest("[data-sdprev]"),sn=e.target.closest("[data-sdsend]"),of=e.target.closest("[data-sdoff]"),id=pv?pv.dataset.sdprev:sn?sn.dataset.sdsend:of?of.dataset.sdoff:"";if(!id)return;
  const b=bookingsAll().find(x=>x.id===id);if(!b){toast("La prenotazione non c'è più.");renderInvio();return;}
  if(pv){openSheet(b);return;}
  if(of){of.disabled=true;try{await withdrawFromDriver(b);}finally{renderInvio();}return;}
  // prima di inviare si scelgono bus e autisti; intestazione e targa: come all'ultimo invio (o quelle solite, al primo)
  let al=false;try{al=localStorage.getItem("agenda-sheet-alias")==="1";}catch(_){}
  openCapo(b,b.sent&&b.sent.at&&!b.sent.off?{alias:b.sent.alias,noPlate:b.sent.noPlate}:{alias:al,noPlate:false});
});

// ---------- scelta del capo: bus e autisti si decidono all'invio ----------
// Chi ha il profilo «solo anteprima e invio» (il capo) quando invia un foglio sceglie il bus e gli autisti:
// la scelta viene scritta sulla prenotazione e vale in tutta l'Agenda (viste, foglio, fatturato). Da quel
// momento l'ufficio non può più cambiare bus e autisti di quel servizio né inviare o ritirare il foglio.
const CAPO_NO="Bus e autisti di questo servizio li ha decisi il capo: il foglio lo invia (o lo ritira) solo lui.";
function capoLock(b){return !!(b&&b.capo)&&!isInvio()&&!isSuper();}
function capoTitle(b){const c=(b&&b.capo)||{};return "Bus e autisti decisi dal capo"+(c.by?" ("+c.by+")":"")+(c.at?" "+fmtTime(c.at):"");}
let cpB=null,cpOpts=null,cpBusy=false;
const cpSay=t=>{$("cpMsg").textContent=t;};
// gli altri servizi negli stessi giorni (per segnalare bus e autisti già impegnati)
function cpOthers(b){
  const out=new Map(),e=endOf(b);
  for(let d=b.start,n=0;d<=e&&n<32;d=addDays(d,1),n++)for(const x of dayList(d))if(x.id!==b.id)out.set(x.id,x);
  return [...out.values()];
}
const cpName=x=>realDriver(x)?driverCanon(x):"";
function openCapo(b0,o){
  if(!isInvio()&&!isSuper())return;
  const b=bookingsAll().find(x=>x.id===b0.id);if(!b){toast("La prenotazione non c'è più.");return;}
  cpB=b;cpOpts=o||{};cpBusy=false;
  const oth=cpOthers(b),busyV=new Set(oth.map(x=>x.vehicle)),busyD=new Set();
  oth.forEach(x=>[x.driver,x.driver2].map(realDriver).filter(Boolean).forEach(d=>busyD.add(drvKey(d))));
  $("cpTitle").textContent="Bus e autisti · foglio n. "+(b.foglio||"—");
  $("cpInfo").innerHTML="<b>"+esc(dispClient(b))+"</b> · "+esc(TYPES[b.type]||"Servizio")+" · "+esc(itD(b.start))+(endOf(b)!==b.start?" – "+esc(itD(endOf(b))):"")+(b.time?" · ore "+esc(b.time):"")+(b.pax!==""&&b.pax!=null?" · "+esc(b.pax)+" passeggeri":"")+(b.route?"<br>"+esc(b.route):"");
  $("cpVeh").innerHTML=S.fleet.map(v=>'<option value="'+esc(v.id)+'">'+esc(vehLabel(v))+(busyV.has(v.id)?" · già impegnato":"")+'</option>').join("");
  $("cpVeh").value=b.vehicle;
  const c1=cpName(b.driver),c2=cpName(b.driver2),names=DRIVERS.map(d=>d[0]);
  [c1,c2].forEach(n=>{if(n&&!names.includes(n))names.push(n);}); // nomi di prenotazioni vecchie, fuori elenco
  const opts=first=>'<option value="">'+esc(first)+'</option>'+names.map(n=>'<option value="'+esc(n)+'">'+esc(n)+(busyD.has(drvKey(n))?" · già impegnato":"")+'</option>').join("");
  $("cpDrv").innerHTML=opts("— scegli l'autista —");$("cpDrv2").innerHTML=opts("— nessuno —");
  $("cpDrv").value=c1;$("cpDrv2").value=c2&&c2!==c1?c2:"";
  const v0=vehicle(b.vehicle)||{};
  $("cpWas").textContent=b.capo?capoTitle(b)+".":"Scritto dall'ufficio: "+(vehLabel(v0)||v0.name||"—")+" · "+(driversText(b)||"autista da assegnare")+".";
  const live=!!(b.sent&&b.sent.at&&!b.sent.off);
  $("cpSend").textContent=live?"Invia di nuovo all'autista":"Invia all'autista";
  cpSay("");cpWarns();cpButtons();$("ovCapo").hidden=false;setTimeout(()=>{try{$("cpVeh").focus();}catch(_){}},30);
}
function cpButtons(){["cpSend","cpSave","cpCancel","cpVeh","cpDrv","cpDrv2"].forEach(id=>{$(id).disabled=cpBusy;});}
function cpWarns(){
  const b=cpB;if(!b)return [];
  const w=[],veh=$("cpVeh").value,v=vehicle(veh),oth=cpOthers(b),d1=$("cpDrv").value,d2=$("cpDrv2").value;
  if(d1&&d2&&d1===d2)w.push("Il secondo autista è uguale al primo.");
  if(v&&v.seats&&/^\d+$/.test(String(b.pax||""))&&+b.pax>v.seats)w.push("Passeggeri ("+b.pax+") oltre la capienza del bus ("+v.seats+" posti).");
  const onV=oth.filter(x=>x.vehicle===veh);
  if(onV.length)w.push("Questo bus negli stessi giorni ha già: "+onV.map(x=>(TYPES[x.type]||"")+" «"+dispClient(x)+"» ("+when(x)+")").join("; ")+".");
  for(const dn of [d1,d2].filter(Boolean)){
    const k=drvKey(dn),busy=oth.filter(x=>[x.driver,x.driver2].some(y=>realDriver(y)&&drvKey(y)===k));
    if(busy.length)w.push(dn+" negli stessi giorni ha già: "+busy.map(x=>(TYPES[x.type]||"")+" «"+dispClient(x)+"» ("+when(x)+")").join("; ")+".");
  }
  if(pending(b))w.push("Questa prenotazione è ancora IN SOSPESO.");
  const ph=(STORE.aut&&STORE.aut.phones)||{},noPh=[d1,d2].filter(Boolean).filter(n=>!Object.values(ph).some(f=>!f.blocked&&norm(f.driver)===norm(n)));
  if(AUT.linked()&&noPh.length)w.push("Nessun telefono collegato per "+noPh.join(" e ")+": il foglio resta in attesa finché il telefono non viene collegato.");
  if(!AUT.linked())w.push("La cartella degli autisti non è ancora collegata: puoi salvare la scelta, ma il foglio non può partire.");
  $("cpWarn").innerHTML=w.map(x=>"<div>"+esc(x)+"</div>").join("");$("cpWarn").hidden=!w.length;
  return w;
}
["cpVeh","cpDrv","cpDrv2"].forEach(id=>$(id).addEventListener("change",()=>{cpSay("");cpWarns();}));
function closeCapo(){$("ovCapo").hidden=true;cpB=null;cpOpts=null;cpBusy=false;}
$("cpCancel").onclick=()=>{if(!cpBusy)closeCapo();};
backdropClose($("ovCapo"),()=>$("cpCancel").click());
async function capoApply(send){
  if(!cpB||cpBusy)return;
  if(!isInvio()&&!isSuper()){closeCapo();return;}
  const b=bookingsAll().find(x=>x.id===cpB.id);
  if(!b){closeCapo();toast("La prenotazione non c'è più (eliminata o spostata).");if(!$("invio").hidden)renderInvio();return;}
  const veh=$("cpVeh").value,d1=$("cpDrv").value,d2=$("cpDrv2").value;
  if(!vehicle(veh)){cpSay("Scegli il bus.");return;}
  if(!d1){cpSay("Scegli l'autista.");$("cpDrv").focus();return;}
  if(d2&&d2===d1){cpSay("Il secondo autista è uguale al primo: toglilo o scegline un altro.");$("cpDrv2").focus();return;}
  cpBusy=true;cpButtons();
  try{
    if(!(b.capo&&b.vehicle===veh&&(b.driver||"")===d1&&(b.driver2||"")===d2)){
      const now=new Date().toISOString(),who=meName();
      const nb=Object.assign({},b,{vehicle:veh,driver:d1,driver2:d2,capo:{at:now,by:who},updatedAt:now,updBy:who});
      try{writeDayOps(b.start,{bookings:{[b.id]:nb}},{edit:true,only:true,boss:true,base:b.updatedAt||null,patch:["vehicle","driver","driver2","capo","updBy"]});}
      catch(err){cpSay(err&&err.code==="readonly"?"Con questo profilo non si può fare.":"Non sono riuscito a salvare la scelta: riprova.");return;}
      const ch=[["Mezzo",logVal("vehicle",b.vehicle),logVal("vehicle",veh)],["1° Autista",b.driver||"—",d1],["2° Autista",b.driver2||"—",d2||"—"]].filter(c=>c[1]!==c[2]);
      ACC.log("prenotazione","Il capo ha deciso bus e autisti di "+bookingLabel(nb),{id:b.id,ch});
      if(!$("invio").hidden)renderInvio();if(!$("app").hidden)renderAll();
      if(!$("ovSheet").hidden&&sheetBooking&&sheetBooking.id===b.id){refreshSheetBooking();renderSheet();}
    }
    let synced=!STORE.isPending(b.id);
    if(!synced&&navigator.onLine){cpSay("Salvo la scelta…");synced=await STORE.whenSent(b.id,15000);}
    if(synced){
      // la prenotazione può essere stata spostata o eliminata dall'ufficio mentre la finestra era aperta
      const got=bookingsAll().find(x=>x.id===b.id);
      if(!got||!got.capo||got.vehicle!==veh||(got.driver||"")!==d1||(got.driver2||"")!==d2){cpSay("Mentre sceglievi, la prenotazione è stata spostata o eliminata dall'ufficio: la scelta NON è stata salvata"+(send?" e il foglio NON è partito":"")+". Premi «Annulla» e controlla l'elenco.");return;}
    }
    if(!send){closeCapo();toast(synced?"Scelta salvata: bus e autisti aggiornati in tutta l'Agenda.":"Scelta salvata su questo dispositivo: arriverà agli altri appena torna la connessione.");return;}
    if(!synced){cpSay("La scelta è salvata su questo dispositivo, ma "+(navigator.onLine?"Dropbox non ha ancora risposto":"sei offline")+": il foglio NON è partito. Riprova tra poco con «Invia all'autista».");return;}
    const ok=await sendToDriver(b,Object.assign({},cpOpts||{},{noConfirm:true}),cpSay);
    if(ok){const cur=bookingsAll().find(x=>x.id===b.id),to=(cur&&cur.sent&&cur.sent.to)||[d1,d2].filter(Boolean);closeCapo();toast("Foglio inviato a "+to.join(" e ")+".");
      if(!$("ovSheet").hidden&&sheetBooking&&sheetBooking.id===b.id){refreshSheetBooking();renderSheet();}}
  }finally{cpBusy=false;if(!$("ovCapo").hidden)cpButtons();if(!$("invio").hidden)renderInvio();}
}
$("cpSend").onclick=()=>capoApply(true);
$("cpSave").onclick=()=>capoApply(false);

// ---------- Super Master: accesso nascosto, creazione, codice di recupero ----------
// Il Super Master non compare in «Chi sei?»: per entrare si fanno 5 clic di seguito sul logo della
// schermata di accesso. Se non esiste ancora, gli stessi 5 clic aprono la sua creazione (serve la
// password di un Master).
function superEntry(U){return userEntries(U).find(([,u])=>u.role==="super")||null;}
let logoTaps=[],recCode="";
document.querySelector(".gate-logo").addEventListener("click",()=>{
  if(gateMode!=="login"&&gateMode!=="hid")return;
  const now=Date.now();logoTaps=logoTaps.filter(t=>now-t<3000);logoTaps.push(now);
  if(logoTaps.length<5)return;
  logoTaps=[];const U=STORE.users;if(!U)return;
  showGate(superEntry(U)?"hid":"super-create");
});
function gateSuper(mode,o){
  if(mode==="hid"){$("gTitle").textContent="Accesso riservato";$("gHid").hidden=false;$("ghName").value="";$("ghPw").value="";setTimeout(()=>$("ghName").focus(),60);}
  else if(mode==="super-create"){
    $("gTitle").textContent="Crea il Super Master";$("gSuper").hidden=false;
    const U=STORE.users||{users:{}};
    $("gsMaster").innerHTML=userEntries(U).filter(([,u])=>u.role==="master"&&u.active!==false).sort((a,b)=>a[1].name.localeCompare(b[1].name,"it")).map(([id,u])=>'<option value="'+esc(id)+'">'+esc(u.name)+'</option>').join("");
    ["gsMpw","gsName","gsPw","gsPw2"].forEach(id=>$(id).value="");setTimeout(()=>$("gsMpw").focus(),60);
  }
  else if(mode==="super-code"){$("gTitle").textContent="Codice di recupero";$("gRecShow").hidden=false;$("grCode").textContent=recCode;}
  else if(mode==="super-rec"){$("gTitle").textContent="Password dimenticata";$("gRec").hidden=false;["gcName","gcCode","gcPw","gcPw2"].forEach(id=>$(id).value="");setTimeout(()=>$("gcName").focus(),60);}
}
$("ghBack").onclick=()=>showGate("login");$("gsBack").onclick=()=>showGate("login");$("gcBack").onclick=()=>showGate("hid");
$("ghRec").onclick=()=>showGate("super-rec");
$("gHidForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const U=STORE.users,ent=U&&superEntry(U),name=cleanText($("ghName").value),pw=$("ghPw").value,btn=$("ghBtn"),msg=$("gMsg");
  const w=ACC.failWait();if(w){msg.textContent="Troppi tentativi sbagliati: riprova tra "+w+" secondi.";return;}
  if(!name||!pw){msg.textContent="Scrivi nome e password.";return;}
  btn.disabled=true;
  try{
    // stessa risposta se è sbagliato il nome o la password
    const ok=!!ent&&ent[1].active!==false&&norm(ent[1].name)===norm(name)&&await ACC.checkPw(ent[1],pw);
    if(ok){ACC.failReset();ACC.login(ent[1],ent[0]);$("ghPw").value="";ACC.log("accesso","Accesso");enterApp();}
    else{ACC.failAdd();ACC.log("accesso","Accesso riservato: nome o password errati",{bad:1,hid:1},"");ACC.flushLog();const w2=ACC.failWait();msg.textContent=w2?"Troppi tentativi sbagliati: riprova tra "+w2+" secondi.":"Nome o password errati.";$("ghPw").select();}
  }finally{btn.disabled=false;}
});
$("gSuperForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const U=STORE.users,msg=$("gMsg"),btn=$("gsBtn"),mid=$("gsMaster").value,mu=U&&U.users[mid];
  const name=cleanText($("gsName").value),pw=$("gsPw").value;
  if(U&&superEntry(U)){showGate("hid",{msg:"Il Super Master esiste già: entra con il suo nome e la sua password."});return;}
  const w=ACC.failWait();if(w){msg.textContent="Troppi tentativi sbagliati: riprova tra "+w+" secondi.";return;}
  if(!mu||mu.role!=="master"||mu.active===false){msg.textContent="Scegli un Master.";return;}
  if(name.length<3){msg.textContent="Scrivi il nome del Super Master (almeno 3 caratteri).";$("gsName").focus();return;}
  if(userEntries(U).some(([,u])=>norm(u.name)===norm(name))){msg.textContent="Esiste già un account con questo nome: scegline un altro.";$("gsName").focus();return;}
  if(pw.length<10){msg.textContent="La password del Super Master deve avere almeno 10 caratteri.";$("gsPw").focus();return;}
  if(pw!==$("gsPw2").value){msg.textContent="Le due password non coincidono.";return;}
  if(!navigator.onLine){msg.textContent="Serve la connessione a internet.";return;}
  btn.disabled=true;msg.textContent="";
  try{
    if(!(await ACC.checkPw(mu,$("gsMpw").value))){ACC.failAdd();ACC.log("accesso","Password errata",{bad:1,uid:mid},mu.name);ACC.flushLog();msg.textContent="La password del Master non è corretta.";$("gsMpw").select();return;}
    ACC.failReset();
    const code=ACC.genRecovery(),sec=await ACC.makeSecret(pw),rec=await ACC.makeRecovery(code),now=new Date().toISOString(),uid="u"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    const R=await STORE.updateUsers(J=>{
      if(Object.values(J.users).some(u=>u.role==="super"))return null;
      J.users[uid]=Object.assign({name,role:"utente",lvl:"super",active:true,created:now,createdBy:mu.name,rec},sec);return J;
    },{boot:"super"});
    const made=R&&R.users&&R.users[uid];
    if(!made){showGate("hid",{msg:"Il Super Master è appena stato creato da un altro dispositivo."});return;}
    ACC.login(made,uid);ACC.log("utenti","Creato il Super Master");ACC.log("accesso","Accesso");
    recCode=code;showGate("super-code");
  }catch(err){msg.textContent=err&&err.code==="offline"?"Serve la connessione a internet.":"Non riesco a creare l'account. Controlla la connessione e riprova.";}
  finally{btn.disabled=false;}
});
$("grOk").onclick=()=>{recCode="";$("grCode").textContent="";enterApp();};
// nuovo codice di recupero (pannello, scheda Utenti): quello di prima smette di valere
$("recNew").onclick=async()=>{
  const me=ACC.session(),out=$("recOut");if(!isSuper()||!me)return;
  if(!navigator.onLine){mstMsg("Serve la connessione a internet.",true);return;}
  if(!confirm("Creare un nuovo codice di recupero?\nIl codice di prima non varrà più. Quello nuovo viene mostrato una volta sola: tieni pronta carta e penna."))return;
  $("recNew").disabled=true;
  try{
    const code=ACC.genRecovery(),rec=await ACC.makeRecovery(code);
    const R=await STORE.updateUsers(J=>{const x=J.users[me.uid];if(!x||x.lvl!=="super")return null;x.rec=rec;return J;});
    if(!R||!R.users||!R.users[me.uid]){mstMsg("Non sono riuscito a salvare il nuovo codice.",true);return;}
    ACC.log("utenti","Creato un nuovo codice di recupero");
    out.textContent=code;$("recShown").hidden=false;mstMsg("Nuovo codice di recupero creato: scrivilo su carta adesso.");
  }catch(_){mstMsg("Non sono riuscito a salvare il nuovo codice: controlla la connessione e riprova.",true);}
  finally{$("recNew").disabled=false;}
};
$("recHide").onclick=()=>{$("recOut").textContent="";$("recShown").hidden=true;};
$("mstClose").addEventListener("click",()=>$("recHide").onclick());
$("gRecForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const U=STORE.users,ent=U&&superEntry(U),msg=$("gMsg"),btn=$("gcBtn"),name=cleanText($("gcName").value),pw=$("gcPw").value;
  const w=ACC.failWait();if(w){msg.textContent="Troppi tentativi sbagliati: riprova tra "+w+" secondi.";return;}
  if(pw.length<10){msg.textContent="La nuova password deve avere almeno 10 caratteri.";$("gcPw").focus();return;}
  if(pw!==$("gcPw2").value){msg.textContent="Le due password non coincidono.";return;}
  if(!navigator.onLine){msg.textContent="Serve la connessione a internet.";return;}
  btn.disabled=true;msg.textContent="";
  try{
    const ok=!!ent&&norm(ent[1].name)===norm(name)&&await ACC.checkRecovery(ent[1],$("gcCode").value);
    if(!ok){ACC.failAdd();ACC.log("accesso","Accesso riservato: codice di recupero errato",{bad:1,hid:1},"");ACC.flushLog();msg.textContent="Nome o codice di recupero non corretti.";return;}
    const sec=await ACC.makeSecret(pw);
    await STORE.updateUsers(J=>{const x=J.users[ent[0]];if(!x)return null;Object.assign(x,sec);return J;},{recover:ent[0]});
    ACC.failReset();ACC.log("accesso","Accesso riservato: password cambiata con il codice di recupero",{hid:1},"");
    showGate("hid",{msg:"Password cambiata: entra con quella nuova. Poi crea un nuovo codice di recupero dal pannello, scheda Utenti.",ok:true});
  }catch(_){msg.textContent="Non riesco a salvare la nuova password. Riprova.";}
  finally{btn.disabled=false;}
});

// ---------- Pannello Super Master › Autisti: cartella e telefoni ----------
const redirHere=()=>location.origin+location.pathname.replace(/index\.html$/,"");
function phoneState(pid,f){
  if(f.blocked)return {k:"off",t:"Bloccato",s:(f.blocked.at?fmtTime(f.blocked.at):"")+(f.blocked.by?" da "+f.blocked.by:"")};
  const live=AUT.phone(pid);
  if(live&&live.at)return {k:"on",t:"Collegato",s:"primo accesso "+fmtTime(live.at)+(live.last?" · ultimo "+fmtTime(live.last):"")+(live.ua?" · "+live.ua:"")};
  return {k:"",t:"In attesa",s:"non ancora aperto sul telefono"};
}
function renderAut(){
  if(!isSuper())return;
  const a=STORE.aut,on=AUT.linked();
  $("autRedir").textContent=redirHere();
  $("autState").className="aut-state "+(on?"ok":"no");
  $("autState").textContent=on?"Cartella collegata"+(a.office.at?" "+fmtTime(a.office.at):"")+(a.office.by?" da "+a.office.by:"")+".":"Cartella non ancora collegata.";
  if(document.activeElement!==$("autKey"))$("autKey").value=(a&&a.key)||"";
  $("autLink").textContent=on?"Ricollega la cartella":"Collega la cartella";
  if(document.activeElement!==$("autUrl"))$("autUrl").value=(a&&a.appUrl)||"";
  const sel=$("phDriver"),cur=sel.value;
  sel.innerHTML='<option value="">Scegli l\'autista…</option>'+DRIVERS.map(d=>'<option'+(d[0]===cur?" selected":"")+'>'+esc(d[0])+'</option>').join("");
  const ph=Object.entries((a&&a.phones)||{}).sort((x,y)=>x[1].driver.localeCompare(y[1].driver,"it")||(x[1].created<y[1].created?-1:1));
  $("phList").innerHTML=ph.map(([pid,f])=>{
    const s=phoneState(pid,f);
    return '<div class="ph-row"><div><b>'+esc(f.driver)+'</b></div><div>'+esc(f.label||"Telefono")+'<small>'+(f.created?"creato "+esc(fmtTime(f.created)):"")+(f.by?" da "+esc(f.by):"")+'</small></div>'+
      '<div><span class="pill '+s.k+'">'+esc(s.t)+'</span><small>'+esc(s.s)+'</small></div>'+
      '<div class="row-act">'+(f.blocked?'<button type="button" class="btn" data-phdel="'+esc(pid)+'">Togli dall\'elenco</button>':(s.k===""?'<button type="button" class="btn" data-phqr="'+esc(pid)+'">Mostra QR e link</button>':'')+'<button type="button" class="btn danger" data-phblock="'+esc(pid)+'">Blocca</button>')+'</div></div>';
  }).join("")||'<div class="lg-empty">Nessun telefono collegato.</div>';
}
$("autLink").onclick=async()=>{
  if(!isSuper())return;
  const key=$("autKey").value.trim(),a=STORE.aut;
  if(!/^[A-Za-z0-9]{6,40}$/.test(key)){mstMsg("Incolla la App key dell'app Dropbox degli autisti (solo lettere e numeri).",true);return;}
  if(key===(window.AGENDA_CONFIG||{}).dropboxAppKey){mstMsg("Questa è la App key dell'Agenda: per gli autisti serve un'app Dropbox diversa, con la sua cartella.",true);return;}
  if(!navigator.onLine){mstMsg("Serve la connessione a internet.",true);return;}
  if(a&&a.key&&a.key!==key&&Object.keys(a.phones||{}).length&&!confirm("Stai collegando un'app Dropbox diversa da quella di prima: i telefoni già collegati non funzioneranno più e andranno ricollegati. Continuare?"))return;
  mstMsg("Apro Dropbox…");
  try{await AUT.startLink(key,{t:"office"});}catch(_){mstMsg("Non riesco ad aprire Dropbox. Riprova.",true);}
};
$("autUrlSave").onclick=async()=>{
  if(!isSuper())return;
  let u=$("autUrl").value.trim().replace(/#.*$/,"");
  if(u&&!/^https:\/\/[^\s"'<>]{4,200}$/.test(u)){mstMsg("L'indirizzo deve cominciare con https:// (per esempio https://nome.github.io/autisti/).",true);return;}
  try{await STORE.updateAut(J=>{J.appUrl=u;return J;});ACC.log("impostazioni",u?"Indirizzo dell'app degli autisti: "+u:"Tolto l'indirizzo dell'app degli autisti");mstMsg("Indirizzo salvato.");renderAut();}
  catch(_){mstMsg("Non riesco a salvare: serve la connessione a internet.",true);}
};
$("phAdd").onclick=async()=>{
  if(!isSuper())return;
  const a=STORE.aut,driver=$("phDriver").value,label=cleanText($("phLabel").value).slice(0,60)||("Telefono di "+driver);
  if(!AUT.linked()){mstMsg("Prima collega la cartella «Autisti La Terra».",true);return;}
  if(!a.appUrl){mstMsg("Prima scrivi e salva l'indirizzo dell'app degli autisti.",true);return;}
  if(!driver){mstMsg("Scegli l'autista.",true);return;}
  if(!navigator.onLine){mstMsg("Serve la connessione a internet.",true);return;}
  if(!confirm("Collegare un telefono per "+driver+"?\nSi apre Dropbox per un momento: se lo chiede, premi «Consenti». Poi qui compare il codice QR da far inquadrare al telefono."))return;
  mstMsg("Apro Dropbox…");
  try{await AUT.startLink(a.key,{t:"phone",driver,label});}catch(_){mstMsg("Non riesco ad aprire Dropbox. Riprova.",true);}
};
function showQr(pid){
  const a=STORE.aut,f=a&&a.phones&&a.phones[pid];if(!f||!f.refresh||f.blocked||!isSuper())return;
  const link=AUT.phoneLink(a.appUrl,a.key,f.refresh,f.driver,pid);
  $("qrTitle").textContent="Collega il telefono di "+f.driver;
  $("qrInfo").textContent=(f.label||"Telefono")+" · app degli autisti: "+a.appUrl;
  $("qrBox").innerHTML=AUT.qrSvg(link);$("qrLink").value=link;$("qrMsg").textContent="";
  $("ovQr").hidden=false;
}
$("qrClose").onclick=()=>{$("ovQr").hidden=true;$("qrBox").innerHTML="";$("qrLink").value="";};
$("qrCopy").onclick=async()=>{
  try{await navigator.clipboard.writeText($("qrLink").value);$("qrMsg").textContent="Link copiato: incollalo solo in un messaggio per quell'autista.";}
  catch(_){$("qrLink").select();$("qrMsg").textContent="Seleziona il link e copialo (Cmd+C).";}
};
$("phList").addEventListener("click",async e=>{
  if(!isSuper())return;
  const q=e.target.closest("[data-phqr]"),bl=e.target.closest("[data-phblock]"),dl=e.target.closest("[data-phdel]");
  const pid=(q||bl||dl||{dataset:{}}).dataset[q?"phqr":bl?"phblock":"phdel"],a=STORE.aut,f=pid&&a&&a.phones&&a.phones[pid];if(!f)return;
  if(q){showQr(pid);return;}
  try{
    if(bl){
      if(!confirm("Bloccare «"+(f.label||"Telefono")+"» di "+f.driver+"?\nIl telefono viene scollegato da Dropbox e non vede più i fogli. Gli altri telefoni restano collegati."))return;
      if(!navigator.onLine){mstMsg("Serve la connessione a internet.",true);return;}
      mstMsg("Blocco il telefono…");
      await AUT.revoke(f.refresh,a.key);
      await STORE.updateAut(J=>{const x=J.phones[pid];if(!x)return null;x.blocked={at:new Date().toISOString(),by:suName()};x.refresh="";return J;});
      ACC.log("dispositivi","Bloccato il telefono «"+(f.label||"")+"» dell'autista «"+f.driver+"»");mstMsg("Telefono bloccato: è stato scollegato da Dropbox.");
    }else if(dl){
      await STORE.updateAut(J=>{if(!J.phones[pid])return null;delete J.phones[pid];return J;});mstMsg("");
    }
    renderAut();
  }catch(err){mstMsg(bl?"Non sono riuscito a bloccare il telefono: controlla la connessione e riprova. Finché non ci riesco il telefono resta collegato.":"Operazione non riuscita: riprova.",true);}
});
// ritorno da Dropbox dopo l'autorizzazione: si completa il collegamento della cartella o del telefono
async function autAfterRedirect(){
  const r=autReturn;if(!r||!ACC.session())return;autReturn=null;
  const p=r.purpose||{};
  if(!isSuper()){if(r.tok)AUT.revoke(r.tok.refresh,r.key).catch(()=>{});return;}
  openMaster("aut");
  if(r.err||!r.tok){mstMsg(r.err&&r.err.code==="denied"?"Collegamento annullato: su Dropbox non è stato dato il consenso.":"Collegamento a Dropbox non riuscito: controlla la App key e l'indirizzo scritto in «Redirect URIs», poi riprova.",true);return;}
  mstMsg("Completo il collegamento…");
  let saved=false; // dopo il salvataggio il collegamento è buono: un errore successivo non lo deve revocare
  try{
    if(p.t==="phone"&&p.driver){
      if(!STORE.aut||STORE.aut.key!==r.key)throw {code:"otherapp"};
      const pid=AUT.newPhoneId();
      await STORE.updateAut(J=>{J.phones[pid]={driver:String(p.driver),label:String(p.label||""),refresh:r.tok.refresh,created:new Date().toISOString(),by:suName(),blocked:null};return J;});
      saved=true;
      ACC.log("dispositivi","Preparato il collegamento di un telefono per l'autista «"+p.driver+"»"+(p.label?" ("+p.label+")":""));
      renderAut();mstMsg("Collegamento pronto: fai inquadrare il codice QR al telefono di "+p.driver+".");
      try{showQr(pid);}catch(_){mstMsg("Collegamento pronto, ma non riesco a disegnare il codice QR: ricarica la pagina e premi «Mostra QR e link» nella riga del telefono.",true);}
    }else{
      const was=STORE.aut,old=was&&was.office?was.office.refresh:"",oldKey=was?was.key:"";
      // telefoni dell'app di prima (se si cambia app): vanno scollegati da Dropbox, non solo tolti dall'elenco
      const oldPhones=was&&was.key&&was.key!==r.key?Object.values(was.phones||{}).map(f=>f.refresh).filter(Boolean):[];
      let probe="";try{const m=await DBX.metadata(STORE.BASE+"/config/utenti.json");probe=(m&&m.id)||"";}catch(_){}
      await AUT.prepare(r.tok.refresh,r.key,probe);
      await STORE.updateAut(J=>{if(J.key&&J.key!==r.key)J.phones={};J.key=r.key;J.office={refresh:r.tok.refresh,at:new Date().toISOString(),by:suName()};return J;});
      saved=true;
      if(old&&old!==r.tok.refresh)AUT.revoke(old,oldKey).catch(()=>{}); // il collegamento di prima non serve più
      for(const rt of oldPhones)AUT.revoke(rt,oldKey).catch(()=>{});
      ACC.log("impostazioni","Collegata la cartella «Autisti La Terra»"+(oldPhones.length?" con un'altra app Dropbox: scollegati i "+oldPhones.length+" telefoni di prima":""));
      renderAut();mstMsg("Cartella «Autisti La Terra» collegata."+(oldPhones.length?" I telefoni collegati all'app di prima sono stati scollegati: vanno collegati di nuovo.":""));AUT.sync();
    }
  }catch(e){
    if(saved){ACC.tlog("errore","Dopo il collegamento della cartella autisti",String((e&&(e.code||e.message))||e));return;}
    AUT.revoke(r.tok.refresh,r.key).catch(()=>{});
    if(e&&e.code==="notappfolder"){mstMsg("Collegamento NON salvato: questa app Dropbox vede anche altri file dell'azienda. Non è di tipo «App folder», oppure la sua cartella non è vuota. Per gli autisti serve un'app nuova, creata scegliendo «App folder» (vedi «Come si crea l'app Dropbox degli autisti»).",true);ACC.tlog("errore","Cartella autisti: l'app Dropbox non è di tipo App folder");return;}
    if(e&&e.code==="otherapp"){mstMsg("Collegamento del telefono non riuscito: la cartella degli autisti è cambiata nel frattempo. Riprova.",true);return;}
    mstMsg("Non riesco a completare il collegamento"+(e&&e.code==="scope"?": nell'app Dropbox degli autisti mancano i permessi (scheda Permissions: files.content.write e files.content.read, poi Submit; poi premi di nuovo «Collega la cartella»).":": controlla la connessione e riprova."),true);
    ACC.tlog("errore","Collegamento della cartella autisti non riuscito",String((e&&(e.code||e.summary||e.message))||e));
  }
}

// ---------- errori al primo avvio ----------
function showStartError(){
  const st=STORE.status(),code=st.error,det=String(st.errorDetail||"");
  let title="Dropbox non risponde",text;
  if(!navigator.onLine){title="Connessione necessaria";text="Il primo avvio su questo dispositivo richiede internet. Collegati e premi Riprova.";}
  else if(code==="scope"){title="Mancano i permessi dell'app Dropbox";text="Nella pagina dell'app su dropbox.com/developers/apps, scheda Permissions, spunta files.metadata.read, files.content.read e files.content.write e premi Submit in fondo. Poi qui premi \"Ricollega Dropbox\": il collegamento va rifatto perché i permessi valgono solo per i nuovi accessi.";}
  else if(code==="no_auth"){title="Accesso a Dropbox scaduto";text="Premi \"Ricollega Dropbox\" e accedi di nuovo.";}
  else if(code==="network"){title="Dropbox non raggiungibile";text="Il browser non riesce a contattare Dropbox. Se usi un blocco pubblicità o una rete aziendale con filtri, prova a disattivarli per questo sito, poi premi Riprova.";}
  else{text="Dropbox ha risposto con un errore. Premi Riprova; se continua, premi \"Ricollega Dropbox\" e, se ancora non va, manda a chi ti assiste questo dettaglio:";}
  showGate("loading",{title,text});
  $("gErr").hidden=!(det&&code!=="scope"&&code!=="network");$("gErr").textContent=(code||"")+" "+det;
  $("gRetry").hidden=false;$("gRelink").hidden=!DBX.hasKey();
}
$("gRetry").onclick=()=>location.reload();
function lostWindow(){
  STORE.disable();
  showGate("loading",{title:"Agenda aperta in un'altra finestra",text:"Hai continuato a lavorare in un'altra finestra, quindi questa si è fermata per non creare doppioni. Chiudila, oppure premi il pulsante per usare di nuovo questa."});
  $("gHere").hidden=false;
}
// "Continua in questa finestra": si ricarica la pagina, così si riparte dai dati aggiornati dall'altra finestra
$("gHere").onclick=()=>{$("gHere").hidden=true;showGate("loading",{title:"Avvio…"});try{sessionStorage.setItem("agenda-steal","1");}catch(_){}location.reload();};
// ricollega Dropbox senza cancellare la copia locale né le modifiche non ancora inviate
$("gRelink").onclick=()=>{DBX.unlink();DBX.startLogin().catch(()=>{$("gMsg").textContent="Manca la chiave dell'app Dropbox in config.js.";});};

// ---------- una sola finestra attiva per dispositivo ----------
// Due finestre aperte insieme si sovrascriverebbero a vicenda le modifiche non ancora inviate.
function takeWindow(steal){
  if(!navigator.locks)return Promise.resolve(true);
  return new Promise(res=>{
    navigator.locks.request("agenda-laterra-finestra",steal?{steal:true}:{ifAvailable:true},lock=>{
      if(!lock){res(false);return;}
      res(true);return new Promise(()=>{}); // la tiene finché la finestra resta aperta
    }).catch(()=>lostWindow()); // un'altra finestra l'ha presa: questa si ferma
  }).then(ok=>{
    if(!ok){showGate("loading",{title:"Agenda già aperta",text:"L'agenda è aperta in un'altra finestra o scheda di questo dispositivo. Usa quella, oppure continua qui: l'altra si fermerà."});$("gHere").hidden=false;}
    return ok;
  });
}

// ---------- avvio ----------
async function boot(){
  try{const v=localStorage.getItem("agenda-view");if(v==="month"||v==="week"||v==="bill")setView(v);}catch(_){}
  if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
  showGate("loading",{title:"Avvio…"});
  let steal=false;try{steal=sessionStorage.getItem("agenda-steal")==="1";sessionStorage.removeItem("agenda-steal");}catch(_){}
  if(!(await takeWindow(steal)))return;
  await start();
}
async function start(){
  await STORE.ready(); // copia locale (e coda rilette adesso, dopo aver preso il controllo della finestra)
  STORE.enable();
  // Dropbox ci ha rimandato qui: per l'Agenda o per la cartella degli autisti? (ogni collegamento riconosce il suo)
  if(AUT.redirectMine()){autReturn=await AUT.takeRedirect();}
  else try{await DBX.finishLogin();}
  catch(e){
    // Indirizzo con un codice di accesso non valido (collegamento vecchio, copiato o costruito apposta):
    // se il dispositivo è già collegato si ignora e si continua, senza chiedere di ricollegare Dropbox.
    if(!DBX.isLinked()){showGate("link",{msg:e&&e.code==="denied"?"Collegamento a Dropbox annullato.":"Collegamento a Dropbox non riuscito. Riprova."});return;}
    ACC.tlog("avviso","Indirizzo con un codice di accesso a Dropbox non valido: ignorato",String(e&&e.code||""));
  }
  if(!DBX.isLinked()){showGate("link");return;}
  refreshFromStore();
  if(navigator.onLine){
    showGate("loading",{title:"Sincronizzazione",text:"Leggo l'agenda da Dropbox…"});
    for(let i=0;i<4;i++){await STORE.pull();const e=STORE.status().error;if(STORE.hasData||!(e==="busy"||e==="network"))break;await new Promise(r=>setTimeout(r,[2000,5000,10000][i]||10000));}
  }
  if(!STORE.hasData){showStartError();return;}
  if(Object.keys(STORE.fatFiles()).length&&!(STORE.lists&&STORE.lists.clients))await STORE.syncFatturato();
  refreshFromStore();
  await afterSync();
}
boot();

})();
