
(function(){
"use strict";
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
function sortFleet(list){return list.map((v,i)=>[v,i]).sort((a,b)=>(a[0].ord&&b[0].ord?a[0].ord-b[0].ord:0)||((b[0].seats||0)-(a[0].seats||0))||(a[1]-b[1])).map(x=>x[0]);}
// come si vede il mezzo nella vista Giorno: "81 posti - GM701RZ (50)"
function vehLabelHTML(v){const s=v.seats?v.seats+" posti":"Auto";return '<b>'+esc(s)+'</b>'+(v.h?'<span class="badge-h" title="Accessibile">H</span>':'')+(v.plate?' - '+esc(v.plate):'')+(v.num?' ('+esc(v.num)+')':'');}
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
  $("wsign").innerHTML='<div class="date"><small>'+(t>=mon&&t<=sun?"Questa settimana":"Settimana")+'</small>'+range+'</div>'+
    '<div class="stats">'+
      '<div class="stat"><b>'+busyAny+"/"+S.fleet.length+'</b><span>Mezzi usati</span></div>'+
      statsHTML(inWeek)+
    '</div>'+
    '<div class="nav"><button id="wPrev" aria-label="Settimana precedente">‹</button><button id="wNext" aria-label="Settimana successiva">›</button></div>';
  let h='<colgroup><col class="vcol">'+days.map(()=>"<col>").join("")+'</colgroup><thead><tr><th class="vc">Mezzo</th>';
  for(const ds of days){
    const w=wday(ds),busy=new Set(dayList(ds).map(b=>b.vehicle)).size;
    h+='<th class="'+(w===0?"sun ":"")+(ds===t?"today ":"")+(ds===S.sel?"sel":"")+'" data-goday="'+ds+'" title="Apri la giornata"><span class="wdn">'+WDL[w]+'</span><span class="dnum">'+parse(ds).getUTCDate()+" "+MN[parse(ds).getUTCMonth()].slice(0,3)+'</span><span class="occ">'+busy+"/"+S.fleet.length+' impegnati</span></th>';
  }
  h+='</tr></thead><tbody>';
  for(const v of S.fleet){
    h+='<tr><th class="vc"><b>'+esc(v.seats?v.seats+" posti":"Auto")+(v.h?'<span class="badge-h" title="Accessibile">H</span>':"")+'</b><span>'+esc([v.plate,v.num?"("+v.num+")":""].filter(Boolean).join(" "))+'</span></th>';
    for(const ds of days){
      const list=on(ds,v.id);
      let inner="";
      for(const b of list){
        let tp=TYPES[b.type]||"",tm=b.time||"";
        if(spans(b)){const tot=diff(b.start,endOf(b))+1,i=diff(b.start,ds)+1;tp+=" "+i+"/"+tot;if(i>1)tm=i===tot&&b.time2?b.time2:"";}
        inner+='<button class="wb '+esc(b.type)+(b.status==="opzione"?" opzione":"")+'" data-edit="'+esc(b.id)+'" data-start="'+esc(b.start)+'" title="'+esc((b.foglio?"n. "+b.foglio+" · ":"")+(b.client||"")+(b.event?" – "+b.event:"")+(whatToday(b,ds)?" – "+whatToday(b,ds):"")+(b.driver?" · Autista: "+b.driver:"")+(b.escort?" · Accompagnatore: "+b.escort:""))+'">'+
          '<span class="l1">'+(tm?'<span class="tm">'+esc(tm)+'</span>':"")+'<span class="tp">'+tp+'</span></span>'+
          '<span class="cl">'+esc(b.client||"Senza cliente")+'</span>'+(hasEvent(b.type)&&b.event?'<span class="ev">'+esc(b.event)+'</span>':"")+(whatToday(b,ds)?'<span class="rt'+(dayProgram(b,ds)?" pg":"")+'">'+esc(whatToday(b,ds))+'</span>':"")+'</button>';
      }
      if(!S.readOnly)inner+='<span class="plus">+ Aggiungi</span>';
      h+='<td class="wc'+(wday(ds)===0?" sun":"")+'" data-addv="'+v.id+'" data-addd="'+ds+'"><div class="wcell">'+inner+'</div></td>';
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

function bookingHTML(b,date){
  const v=vehicle(b.vehicle);
  let when=esc(b.time||"—");
  let tp=TYPES[b.type]||"Servizio";
  if(spans(b)){const tot=diff(b.start,endOf(b))+1,i=diff(b.start,date)+1;tp+=" · giorno "+i+" di "+tot;
    if(i>1)when=i===tot&&b.time2?"rientro":(isMulti(b.type)?"in tour":"in corso");}
  const det=[];
  if(b.foglio)det.push('<span class="fg">n. '+esc(b.foglio)+'</span>');
  if(spans(b))det.push(short(b.start)+" → "+short(endOf(b)));
  if(b.time2&&!onlyDeparture(b.type))det.push("Rientro "+esc(b.time2));
  if(b.pax!==""&&b.pax!=null){const over=v&&v.seats&&/^\d+$/.test(String(b.pax))&&+b.pax>v.seats;det.push('<span class="'+(over?"over":"")+'">'+esc(b.pax)+(v&&v.seats?"/"+v.seats:"")+" pax"+(over?" · oltre capienza":"")+"</span>");}
  const dh=driversHTML(b);if(dh)det.push("Autista: "+dh);
  const eu=x=>Number(x).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
  const has=x=>x!==""&&x!=null;
  if(has(b.price))det.push("Noleggio € "+eu(b.price));
  if(has(b.park))det.push("Parcheggi € "+eu(b.park));
  if(has(b.meals))det.push("Pasti € "+eu(b.meals));
  if(isMulti(b.type)&&has(b.advance))det.push("Anticipo € "+eu(b.advance));
  if(isMulti(b.type)&&b.envelope)det.push("Busta "+esc(b.envelope)+(b.envno?" n. "+esc(b.envno):""));
  if(hasEvent(b.type)&&b.escort)det.push("Accompagnatore: "+esc(b.escort));
  if(b.contactName||b.contact)det.push("Ref. "+esc([b.contactName,b.contact].filter(Boolean).join(" ")));
  if(b.notes)det.push(esc(b.notes));
  const tip=[(b.time||"")+" "+tp,b.client||"",whatToday(b,date)||""].filter(Boolean).join(" · ")+(det.length?"\n"+det.map(x=>x.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'")).join(" · "):"");
  return '<button class="bk '+esc(b.type)+(b.status==="opzione"?" opzione":"")+'" data-edit="'+esc(b.id)+'" data-start="'+esc(b.start)+'" title="'+esc(tip)+'">'+
    '<span class="when">'+when+'</span>'+
    '<span class="what"><span class="tp">'+tp+'</span>'+(b.status==="opzione"?'<span class="st">Opzione</span>':"")+
    '<span class="cl">'+esc(b.client||"Senza cliente")+'</span>'+(hasEvent(b.type)&&b.event?'<span class="ev">'+esc(b.event)+'</span>':"")+(whatToday(b,date)?'<span class="rt'+(dayProgram(b,date)?" pg":"")+'">'+esc(whatToday(b,date))+'</span>':"")+'</span>'+
    (det.length?'<span class="det">'+det.map(x=>"<span>"+x+"</span>").join("")+'</span>':"")+
    '</button>';
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
  let h="";
  for(const v of S.fleet){
    const list=on(date,v.id);
    h+='<div class="row'+(list.length?" busy":"")+'">'+
      '<div class="veh"><span class="vl" title="'+esc(v.name||"")+'">'+vehLabelHTML(v)+'</span></div>'+
      '<div class="slots">'+(list.length?list.map(b=>bookingHTML(b,date)).join(""):'<span class="free">Libero</span>')+'</div>'+
      (S.readOnly?"<span></span>":'<button class="add" data-add="'+v.id+'">+ Aggiungi</button>')+
    '</div>';
  }
  $("sheet").innerHTML=h;
  const ta=$("extraText");
  if(document.activeElement!==ta){ta.value=(S.days[date]&&S.days[date].extra)||"";}
  ta.readOnly=S.readOnly;
  $("extraHint").textContent="Nomi, orari e servizio assegnato per "+WDL[w]+" "+d.getUTCDate()+" "+MN[d.getUTCMonth()];
}

function renderMonth(){
  const k=mkey(S.sel),n=dim(k),all=bookingsAll(),t=todayISO();
  let h='<thead><tr><th class="vc">Mezzo</th>';
  for(let d=1;d<=n;d++){const ds=k+"-"+pad(d),w=wday(ds);h+='<th class="'+(w===0?"sun ":"")+(ds===S.sel?"sel":"")+'" data-day="'+ds+'" style="cursor:pointer">'+WD[w].slice(0,1)+'<span class="n">'+d+'</span></th>';}
  h+='</tr></thead><tbody>';
  for(const v of S.fleet){
    h+='<tr><th class="vc">'+esc(v.name)+(v.plate?'<small>'+esc(v.plate)+'</small>':"")+'</th>';
    for(let d=1;d<=n;d++){
      const ds=k+"-"+pad(d),w=wday(ds),list=on(ds,v.id);
      let inner="",tip=[];
      if(list.length){
        const b=list[0];let cls="cell "+b.type;
        if(spans(b)){const s=b.start===ds,e=endOf(b)===ds;cls+=s&&e?"":s?" first":e?" last":" mid";}
        if(list.every(x=>x.status==="opzione"))cls+=" opz";
        const lab=list.length>1?list.length:(spans(b)?(b.start===ds?MONTH_LAB[b.type]:""):(MONTH_LAB[b.type]||""));
        inner='<div class="'+cls+'">'+lab+'</div>';
        tip=list.map(x=>(TYPES[x.type]||"")+(x.time?" "+x.time:"")+" – "+(x.client||"")+(x.event?" · "+x.event:"")+(whatToday(x,ds)?" ("+whatToday(x,ds)+")":""));
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
}
function showBanner(m){notify(m,true);}



// ---------- form prenotazione ----------
let editing=null; // {id,start}
function openForm(opts){
  opts=opts||{};
  const b=opts.booking||{type:"transfer",vehicle:opts.vehicle||S.fleet[0].id,start:opts.date||S.sel,end:"",time:"",time2:"",client:"",clientCode:"",route:"",event:"",escort:"",pax:"",price:"",driver:GEN1,driver2:"",contact:"",status:"confermato",notes:""};
  editing=opts.booking?{id:b.id,start:b.start,foglio:b.foglio||"",base:b.updatedAt||null,by:b.by||"",byAt:b.byAt||"",updBy:b.updBy||"",updAt:b.updatedAt||""}:null;progReady=false;
  // solo il Master vede chi ha creato e modificato la prenotazione
  const wh=editing&&isMaster()?[editing.by?"Creata da "+editing.by+(editing.byAt?" "+fmtTime(editing.byAt):""):"",editing.updBy?"ultima modifica di "+editing.updBy+(editing.updAt?" "+fmtTime(editing.updAt):""):""].filter(Boolean).join(" · "):"";
  $("fWho").textContent=wh;$("fWho").hidden=!wh;
  $("fTitle").textContent=editing?"Modifica prenotazione"+(b.foglio?" · n. "+b.foglio:""):"Nuova prenotazione";
  formClient=b.clientCode!==""&&b.clientCode!=null?{code:b.clientCode,name:b.client||""}:null;
  $("f-price").value=b.price==null?"":b.price;$("f-driver2").value=b.driver2||"";
  $("f-park").value=b.park==null?"":b.park;$("f-meals").value=b.meals==null?"":b.meals;$("f-advance").value=b.advance==null?"":b.advance;$("f-envelope").value=b.envelope||"";$("f-envno").value=b.envno||"";bustaAuto="";
  $("cSug").hidden=true;
  $("f-vehicle").innerHTML=S.fleet.map(v=>'<option value="'+v.id+'">'+esc(vehLabel(v))+'</option>').join("");
  $("t-"+normType(b.type)).checked=true;
  $("f-vehicle").value=b.vehicle;if(!$("f-vehicle").value&&S.fleet[0])$("f-vehicle").value=S.fleet[0].id;$("f-start").value=b.start;$("f-end").value=(b.end&&b.end>=b.start)?b.end:b.start;$("f-end").min=b.start||"";formStart=b.start;
  $("f-time").value=b.time||"";$("f-time2").value=b.time2||"";$("f-client").value=b.client||"";$("f-route").value=b.route||"";
  $("f-pax").value=b.pax==null?"":b.pax;$("f-event").value=b.event||"";$("f-escort").value=b.escort||"";$("f-driver").value=b.driver||"";$("f-contact").value=b.contact||"";$("f-contactname").value=b.contactName||"";drvPaint("f-driver");drvPaint("f-driver2");
  $("f-status").value=b.status||"confermato";$("f-notes").value=b.notes||"";
  renderClientInfo();syncDrvQ();
  $("f-saldo").value=b.saldo||"NO";$("f-saldoamt").value=b.saldoAmt==null?"":b.saldoAmt;$("f-npark").value=b.npark||"";$("f-ndriver").value=b.ndriver||"";$("f-n3h").value=b.n3h||"";$("f-nextra").value=b.nextra||"";
  ["refs","hotels","guides"].forEach(k=>renderRep(k,b[k]||[]));
  progCache=Array.isArray(b.program)?b.program.slice():[];renderProgram();
  $("fDelete").hidden=!editing;$("fConfirm").hidden=true;$("fCloseAsk").hidden=true;
  [...$("fBooking").elements].forEach(el=>{if(el.id!=="fCancel")el.disabled=S.readOnly;});
  syncType();checkWarns();
  formOrig=readForm(); // per sapere se l'utente ha cambiato qualcosa e quali campi
  $("ovBooking").hidden=false;setTimeout(()=>$("f-client").focus(),30);
}
let formOrig=null,saving=false;
const FORM_SKIP=["updatedAt","foglio"];
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
function syncDrvQ(){$("q-driver").hidden=!!$("f-driver").value.trim()||S.readOnly;$("q-driver2").hidden=!!$("f-driver2").value.trim()||S.readOnly;}
["f-driver","f-driver2"].forEach(id=>$(id).addEventListener("input",syncDrvQ));
fillDrivers();
document.querySelectorAll("[data-gen]").forEach(bt=>bt.addEventListener("click",()=>{const id=bt.dataset.gen;$(id).value=id==="f-driver"?GEN1:GEN2;drvPaint(id);syncDrvQ();}));
// N. busta: con "Busta SI" propone il numero successivo (per anno), modificabile
let bustaAuto="";
function nextBusta(){
  const st=$("f-start").value||todayISO(),y=st.slice(0,4);
  let m=STORE.bustaMax?STORE.bustaMax(y):0;
  for(const x of bookingsAll()){
    if(editing&&x.id===editing.id)continue;
    if(!isMulti(x.type)||x.envelope!=="SI"||String(x.start).slice(0,4)!==y)continue;
    const n=parseInt(String(x.envno||"").replace(/\D/g,""),10);if(n>m)m=n;
  }
  return m+1;
}
$("f-envelope").addEventListener("change",()=>{
  const v=$("f-envelope").value,no=$("f-envno");
  if(v==="SI"&&!no.value.trim()){no.value=String(nextBusta());bustaAuto=no.value;}
  else if(v!=="SI"&&no.value===bustaAuto){no.value="";bustaAuto="";}
});
function eur(id){const v=$(id).value;return v===""?"":Math.round(Number(v)*100)/100;}
function curType(){const r=document.querySelector('input[name="type"]:checked');return r?r.value:"transfer";}
function syncType(){$("w-tourcash").hidden=!isMulti(curType());if(progReady)renderProgram();const ev=hasEvent(curType());$("w-event").hidden=!ev;$("w-escort").hidden=!ev;$("w-time2").hidden=onlyDeparture(curType());}
function readForm(){
  const type=curType(),start=$("f-start").value,T=id=>cleanText($(id).value);
  const client=T("f-client");
  return {type:type,vehicle:$("f-vehicle").value,start:start,end:$("f-end").value||start,
    time:$("f-time").value,time2:onlyDeparture(type)?"":$("f-time2").value,client:client,clientCode:formClient&&formClient.name===client?formClient.code:"",route:T("f-route"),
    event:hasEvent(type)?T("f-event"):"",escort:hasEvent(type)?T("f-escort"):"",
    pax:T("f-pax"),price:eur("f-price"),park:eur("f-park"),meals:eur("f-meals"),advance:isMulti(type)?eur("f-advance"):"",envelope:isMulti(type)?$("f-envelope").value:"",envno:isMulti(type)?T("f-envno"):"",driver:T("f-driver"),driver2:T("f-driver2"),contact:T("f-contact"),contactName:T("f-contactname"),
    status:$("f-status").value,notes:cleanText($("f-notes").value,true),
    saldo:$("f-saldo").value,saldoAmt:eur("f-saldoamt"),npark:T("f-npark"),ndriver:T("f-ndriver"),n3h:T("f-n3h"),nextra:T("f-nextra"),
    refs:readRep("refs"),hotels:readRep("hotels"),guides:readRep("guides"),program:readProgram(),
    updatedAt:new Date().toISOString()};
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


// ---------- campi del foglio di servizio ----------
const REP_PH={refs:["Nome referente (es. Sonia, escursione)","Telefono"],hotels:["Cerca l'hotel o scrivi nome e indirizzo","Telefono"],guides:["Nome guida","Telefono"]};
function renderRep(k,list){
  $("rep-"+k).innerHTML=list.map((x,i)=>repRow(k,i,x)).join("");
}
function repRow(k,i,x){x=x||{};return '<div class="rep-row"'+(k==="hotels"&&x.pid?' data-pid="'+esc(x.pid)+'"':'')+'><input data-rk="'+k+'" data-rf="name" value="'+esc(x.name||"")+'" placeholder="'+REP_PH[k][0]+'" aria-label="'+REP_PH[k][0]+'"'+(k==="hotels"?' autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false"':'')+'><input data-rk="'+k+'" data-rf="tel" value="'+esc(x.tel||"")+'" placeholder="Telefono" inputmode="tel" aria-label="Telefono"><button type="button" data-rdel title="Rimuovi" aria-label="Rimuovi">×</button></div>';}
function readRep(k){return [...$("rep-"+k).querySelectorAll(".rep-row")].map(r=>{const o={name:cleanText(r.querySelector('[data-rf="name"]').value),tel:cleanText(r.querySelector('[data-rf="tel"]').value)};if(k==="hotels"&&r.dataset.pid)o.pid=r.dataset.pid;return o;}).filter(x=>x.name||x.tel);}

// ---------- hotel: tendina con gli hotel già usati e la ricerca su Google ----------
// Google Places API (New): suggerimenti mentre scrivi (solo strutture ricettive, in Italia, vicino alla
// Sicilia) e, alla scelta, nome, indirizzo e telefono. La chiave la inserisce il Master nelle Impostazioni.
// Suggerimenti e dettagli usano lo stesso "token di sessione": così Google conta una sola ricerca.
const HS={inp:null,box:null,items:[],idx:-1,timer:null,token:null,seq:0,err:""};
function gKey(){return String(((STORE.settings||{}).googleKey)||"").trim();}
function newToken(){try{return crypto.randomUUID();}catch(_){return "t"+Date.now().toString(36)+Math.random().toString(36).slice(2);}}
function knownHotels(){
  const m=new Map();
  for(const d in S.days){const bk=(S.days[d]&&S.days[d].bookings)||{};for(const id in bk){const x=bk[id];if(!x)continue;for(const h of (x.hotels||[])){if(!h||!h.name)continue;const k=norm(h.name).replace(/[^a-z0-9]+/g," ").trim();const o=m.get(k);if(!o||(!o.tel&&h.tel)||(!o.pid&&h.pid))m.set(k,{name:h.name,tel:h.tel||"",pid:h.pid||"",n:(o?o.n:0)+1});else o.n++;}}}
  return [...m.values()];
}
async function gFetch(url,opts,ms){
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),ms||8000);
  try{
    const r=await fetch(url,Object.assign({},opts,{signal:ctl.signal}));
    const j=await r.json().catch(()=>({}));
    if(!r.ok){const er=j.error||{},rs=((er.details||[]).find(d=>d&&d.reason)||{}).reason||"";throw {code:"google",status:r.status,msg:er.message||("HTTP "+r.status),st:er.status||"",reason:rs};}
    return j;
  }catch(e){if(e&&e.code==="google")throw e;throw {code:"net"};}
  finally{clearTimeout(t);}
}
async function gAutocomplete(q,key,token){
  const j=await gFetch("https://places.googleapis.com/v1/places:autocomplete",{method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":key},
    body:JSON.stringify({input:q,includedPrimaryTypes:["lodging"],includedRegionCodes:["it"],languageCode:"it",regionCode:"it",sessionToken:token,
      locationBias:{circle:{center:{latitude:37.45,longitude:14.35},radius:50000}}})});
  return (j.suggestions||[]).map(s=>s.placePrediction).filter(Boolean).map(p=>({pid:p.placeId,main:(p.structuredFormat&&p.structuredFormat.mainText&&p.structuredFormat.mainText.text)||(p.text&&p.text.text)||"",sec:(p.structuredFormat&&p.structuredFormat.secondaryText&&p.structuredFormat.secondaryText.text)||""}));
}
async function gDetails(pid,key,token){
  const j=await gFetch("https://places.googleapis.com/v1/places/"+encodeURIComponent(pid)+"?languageCode=it&regionCode=it"+(token?"&sessionToken="+encodeURIComponent(token):""),{headers:{"X-Goog-Api-Key":key,"X-Goog-FieldMask":"id,displayName,shortFormattedAddress,formattedAddress,nationalPhoneNumber,internationalPhoneNumber"}});
  const addr=(j.shortFormattedAddress||j.formattedAddress||"").replace(/,\s*Italia$/,"");
  return {pid:j.id||pid,name:((j.displayName&&j.displayName.text)||"")+(addr?" – "+addr:""),tel:j.nationalPhoneNumber||j.internationalPhoneNumber||""};
}
function gErrText(e){
  if(!e)return "";
  if(e.code==="net")return navigator.onLine?"Google non risponde: riprova tra poco.":"Sei offline: la ricerca su Google tornerà con la connessione.";
  if(/API_KEY_INVALID/.test(e.reason||"")||/API key not valid/i.test(e.msg||""))return "Chiave Google non valida: il Master la controlla nelle Impostazioni.";
  if(/BILLING/i.test((e.reason||"")+(e.msg||"")))return "Su Google non è attiva la fatturazione del progetto: senza, la ricerca non funziona.";
  if(e.status===403)return "Google ha rifiutato la ricerca: la chiave non è abilitata a «Places API (New)» oppure questo sito non è tra quelli autorizzati.";
  if(e.status===429)return "Limite di ricerche Google raggiunto per oggi.";
  return "Ricerca Google non riuscita ("+(e.msg||e.status||"errore")+").";
}
function hsClose(){if(HS.box)HS.box.remove();if(HS.inp)HS.inp.setAttribute("aria-expanded","false");HS.box=null;HS.items=[];HS.idx=-1;clearTimeout(HS.timer);}
function hsRender(google,loading){
  const inp=HS.inp;if(!inp)return;
  const q=norm(inp.value).trim(),words=q.split(/[^a-z0-9]+/).filter(Boolean);
  const local=q.length<2?[]:knownHotels().filter(h=>{const ws=norm(h.name).split(/[^a-z0-9]+/);return words.every(w=>ws.some(x=>x.startsWith(w)));}).sort((a,b)=>b.n-a.n).slice(0,4).map(h=>Object.assign({src:"loc"},h));
  const g=(google||[]).filter(x=>!local.some(l=>l.pid&&l.pid===x.pid)).slice(0,5).map(x=>Object.assign({src:"g"},x));
  HS.items=local.concat(g);if(HS.idx>=HS.items.length)HS.idx=-1;
  if(!HS.box){HS.box=document.createElement("div");HS.box.className="hsug";HS.box.setAttribute("role","listbox");inp.closest(".rep-row").appendChild(HS.box);
    HS.box.addEventListener("mousedown",e=>{const b=e.target.closest("[data-hi]");e.preventDefault();if(b)hsPick(+b.dataset.hi);});}
  let h="";
  if(local.length)h+='<div class="hs-h">Già usati</div>'+local.map((x,i)=>'<button type="button" role="option" data-hi="'+i+'" aria-selected="'+(i===HS.idx)+'"><b>'+esc(x.name)+'</b><span>'+esc(x.tel||"senza telefono")+'</span></button>').join("");
  if(q.length>=3){
    if(!gKey())h+='<div class="hs-note">'+(isMaster()?'Per cercare gli hotel su Google inserisci la chiave in <b>Pannello Master › Impostazioni</b>.':'Ricerca su Google non attiva: chiedi al Master.')+'</div>';
    else{
      h+='<div class="hs-h">Google Maps'+(loading?' <i>cerco…</i>':'')+'</div>';
      if(g.length)h+=g.map((x,j)=>{const i=local.length+j;return '<button type="button" role="option" data-hi="'+i+'" aria-selected="'+(i===HS.idx)+'"><b>'+esc(x.main)+'</b><span>'+esc(x.sec)+'</span></button>';}).join("");
      else if(!loading)h+='<div class="hs-note">'+(HS.err?esc(HS.err):'Nessun hotel trovato su Google con questo nome.')+'</div>';
    }
  }
  if(!h){hsClose();return;}
  HS.box.innerHTML=h;inp.setAttribute("aria-expanded","true");
  const r=HS.box.getBoundingClientRect();if(r.bottom>window.innerHeight)HS.box.scrollIntoView({block:"nearest"}); // la tendina deve restare visibile
}
function hsSearch(){
  const inp=HS.inp;if(!inp)return;const q=inp.value.trim();
  clearTimeout(HS.timer);HS.err="";
  if(q.length<3||!gKey()||!navigator.onLine){if(q.length>=3&&gKey()&&!navigator.onLine)HS.err=gErrText({code:"net"});hsRender([],false);return;}
  hsRender(HS.lastG&&HS.lastQ&&norm(q).startsWith(norm(HS.lastQ))?HS.lastG:[],true);
  const seq=++HS.seq;
  HS.timer=setTimeout(async()=>{
    if(!HS.token)HS.token=newToken();
    try{const r=await gAutocomplete(q,gKey(),HS.token);if(seq!==HS.seq||HS.inp!==inp)return;HS.lastG=r;HS.lastQ=q;hsRender(r,false);}
    catch(e){if(seq!==HS.seq)return;HS.err=gErrText(e);HS.lastG=[];hsRender([],false);}
  },300);
}
async function hsPick(i){
  const x=HS.items[i],inp=HS.inp;if(!x||!inp)return;
  const row=inp.closest(".rep-row"),tel=row.querySelector('[data-rf="tel"]');
  hsClose();
  if(x.src==="loc"){inp.value=x.name;if(x.tel)tel.value=x.tel;if(x.pid)row.dataset.pid=x.pid;else delete row.dataset.pid;return;}
  inp.value=x.main+(x.sec?" – "+x.sec.replace(/,\s*Italia$/,""):"");row.dataset.pid=x.pid;
  const token=HS.token;HS.token=null; // la sessione di ricerca finisce con la scelta
  tel.placeholder="Cerco il telefono…";
  try{const d=await gDetails(x.pid,gKey(),token);if(inp.isConnected){inp.value=d.name||inp.value;if(d.tel)tel.value=d.tel;}}
  catch(e){toast(gErrText(e));}
  finally{tel.placeholder="Telefono";}
}
$("sheetBox").addEventListener("input",e=>{
  const t=e.target;if(t.dataset.rk!=="hotels"||t.dataset.rf!=="name")return;
  const row=t.closest(".rep-row");if(row)delete row.dataset.pid; // testo cambiato a mano: non è più l'hotel di Google
  if(HS.inp!==t){hsClose();HS.inp=t;}
  hsSearch();
});
$("sheetBox").addEventListener("focusout",e=>{if(e.target===HS.inp)setTimeout(()=>{if(document.activeElement!==HS.inp)hsClose();},150);});
$("sheetBox").addEventListener("keydown",e=>{
  if(e.target!==HS.inp||!HS.box)return;const n=HS.items.length;
  if(e.key==="ArrowDown"&&n){e.preventDefault();HS.idx=(HS.idx+1)%n;hsRender(HS.lastG,false);}
  else if(e.key==="ArrowUp"&&n){e.preventDefault();HS.idx=HS.idx<=0?n-1:HS.idx-1;hsRender(HS.lastG,false);}
  else if(e.key==="Enter"&&HS.idx>=0){e.preventDefault();hsPick(HS.idx);}
  else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();hsClose();}
});
$("sheetBox").addEventListener("click",e=>{
  const a=e.target.closest("[data-addrep]");
  if(a){const k=a.dataset.addrep,box=$("rep-"+k);box.insertAdjacentHTML("beforeend",repRow(k,box.children.length,{}));box.lastElementChild.querySelector("input").focus();return;}
  const d=e.target.closest("[data-rdel]");if(d)d.closest(".rep-row").remove();
});
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
    $("progWrap").innerHTML='<textarea id="prog-0" aria-labelledby="l-prog" placeholder="Ore 06:45 PORTO DI POZZALLO, arriva il catamarano&#10;SIRACUSA, Skydiving - strada Laganelli 20&#10;Ore 16:00 partenza per Avola">'+esc(all)+'</textarea>';
    $("progHint").textContent="Una riga per ogni tappa, con orario e luogo. Le righe vengono numerate da sole.";
  }else{
    $("progWrap").innerHTML=days.map((h,i)=>'<div class="prog-day"><b>'+esc(h)+'</b><textarea id="prog-'+i+'" rows="2" aria-label="'+esc(h)+'" placeholder="1° Hotel > Etna Sud > 1° Hotel">'+esc(progCache[i]||"")+'</textarea></div>').join("");
    $("progHint").textContent="Un riquadro per ogni giorno del tour.";
  }
  progReady=true;
}
// la data di rientro segue la partenza finché non la cambi tu
let formStart="";
$("f-start").addEventListener("change",()=>{const st=$("f-start").value,en=$("f-end").value;if(st&&(!en||en<st||en===formStart))$("f-end").value=st;$("f-end").min=st||"";formStart=st;checkWarns();if(isMulti(curType()))renderProgram();});
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
  formClient={code:c[0],name:c[1]};$("f-client").value=c[1];
  if(!$("f-contact").value.trim()&&c[4])$("f-contact").value=c[4];
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
      '<span class="nm"><b>'+cliMark(c[1],words)+'</b>'+(c[2]?'<small>'+cliMark(c[2],words)+'</small>':'')+'</span>'+
      '<span>'+cliMark(city+(prov?" ("+prov+")":""),words)+'</span>'+
      '<span>'+cliMark(piva||cf,words)+'</span>'+
      '<span>'+cliMark(c[4]||"",words)+'</span>'+
      '<span>'+cliMark(mail,words)+'</span>'+
      '<span>'+cliMark([c[6],c[7]].filter(Boolean).join(" · "),words)+'</span></button>';
    if(open){
      h+='<div class="cli-det"><dl>'+cols.map((x,i)=>'<div><dt>'+esc(cliLabel(x))+'</dt><dd'+(row[i]?'':' class="none"')+'>'+(row[i]?esc(row[i]):"—")+'</dd></div>').join("")+'</dl>'+
        (S.readOnly?'':'<div class="cli-acts">'+(canEdit("clients")?'<button type="button" class="btn" data-cli-edit="'+esc(c[0])+'">Modifica dati</button>':'')+'<button type="button" class="btn primary" data-cli-book="'+esc(c[0])+'">Nuova prenotazione per questo cliente</button></div>')+'</div>';
    }
  }
  if(list.length>cliShown)h+='<button type="button" class="cli-more" data-cli-more="1">Mostra altri ('+(list.length-cliShown).toLocaleString("it-IT")+')</button>';
  $("cliList").innerHTML=h;
}
$("btnClients").onclick=()=>openClients();
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

$("fBooking").addEventListener("input",e=>{if(e.target.name==="type")syncType();checkWarns();});
$("fBooking").addEventListener("change",checkWarns);
$("fBooking").addEventListener("submit",async e=>{
  e.preventDefault();
  if(S.readOnly||saving||$("ovBooking").hidden)return; // niente doppi invii (doppio clic, Invio ripetuto)
  const b=readForm();
  if(!b.start){toast("Inserisci la data.");return;}
  if(!validDate(b.start)||!validDate(b.end)){checkWarns();toast("Controlla la data: l'anno deve essere tra 2000 e 2099.");return;}
  if(b.end<b.start||diff(b.start,b.end)>30){toast("Controlla la data di rientro.");return;}
  const id=editing?editing.id:("b"+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
  const old=editing&&editing.start,moved=!!(old&&old!==b.start);
  // per le modifiche: versione di partenza e campi cambiati, così non si cancellano le modifiche fatte da altri nel frattempo
  const meta=editing?{edit:true,base:editing.base,patch:formChanges()}:{};
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
    if(moved)writeDayOps(old,{bookings:{[id]:null}},{move:b.start});
    writeDayOps(b.start,Object.assign({bookings:{[id]:b}},seqPatch),Object.assign({},meta,moved?{move:true}:{}));
    if(!editing)ACC.log("prenotazione","Nuova prenotazione "+bookingLabel(b),{id});
    else if(logCh.length)ACC.log("prenotazione","Modificata la prenotazione "+bookingLabel(b),{id,ch:logCh});
    const wantSheet=openSheetAfterSave;
    closeForm();try{document.activeElement&&document.activeElement.blur&&document.activeElement.blur();}catch(_){}
    S.sel=b.start;if(mkey(b.start)!==subMonth)subscribe();renderAll();toast("Prenotazione salvata");
    if(wantSheet)openSheetConfirmed(Object.assign({},b,{id:id}));
  }catch(err){handleErr(err);}finally{saving=false;$("fSave").disabled=false;$("fSheet").disabled=false;openSheetAfterSave=false;}
});
$("fCancel").onclick=tryCloseForm;
$("fCloseYes").onclick=closeForm;
$("fCloseNo").onclick=()=>{$("fCloseAsk").hidden=true;};
$("fDelete").onclick=()=>{$("fConfirm").hidden=false;$("fDelete").hidden=true;};
$("fDeleteNo").onclick=()=>{$("fConfirm").hidden=true;$("fDelete").hidden=false;};
$("fDeleteYes").onclick=async()=>{
  if(!editing)return;
  try{const del=Object.assign({},formOrig||{},{foglio:editing.foglio,start:editing.start});writeDayOps(editing.start,{bookings:{[editing.id]:null}},{client:cleanText($("f-client").value)});ACC.log("prenotazione","Eliminata la prenotazione "+bookingLabel(del),{id:editing.id});closeForm();renderAll();toast("Prenotazione eliminata");}catch(err){handleErr(err);}
};

// ---------- flotta ----------
function openFleet(){
  const T=S.regole.targhe||{},N=S.regole.numeri||{};
  const cats=[...new Set(XCATS.concat(Object.keys(T)).concat(S.fleet.map(xcatOf)))].sort((a,b)=>(parseInt(a.replace(/\D/g,""),10)||0)-(parseInt(b.replace(/\D/g,""),10)||0));
  $("dlPlates").innerHTML=cats.map(c=>'<datalist id="pl'+c+'">'+(T[c]||[]).map(t=>'<option value="'+esc(t)+'">'+(N[t]?"n. "+esc(N[t]):"")+'</option>').join("")+'</datalist>').join("");
  fleetOpen={};S.fleet.forEach(v=>{fleetOpen[v.id]={name:v.name,seats:v.seats||null,plate:v.plate||"",xcat:xcatOf(v),num:v.num==null?"":String(v.num)};});
  $("fleetList").innerHTML=S.fleet.map((v,i)=>{const xc=xcatOf(v);return '<div class="fleet-row" data-id="'+esc(v.id)+'"><input id="fl-n-'+i+'" value="'+esc(v.name)+'" aria-label="Nome"><input id="fl-s-'+i+'" type="number" min="1" value="'+(v.seats||"")+'" aria-label="Posti"><select id="fl-x-'+i+'" aria-label="Mezzo (Excel)">'+cats.map(c=>'<option'+(c===xc?' selected':'')+'>'+c+'</option>').join("")+'</select><input id="fl-p-'+i+'" list="pl'+xc+'" value="'+esc(v.plate||"")+'" placeholder="Targa" aria-label="Targa" autocomplete="off"><input id="fl-i-'+i+'" value="'+esc(v.num==null?"":v.num)+'" placeholder="ID" aria-label="ID mezzo" autocomplete="off"></div>';}).join("");
  const ro=!canEdit("fleet");$("fFleet").classList.toggle("fleet-ro",ro);$("fleetRo").hidden=!ro;$("flSave").hidden=ro;
  $("fleetList").querySelectorAll("input,select").forEach(el=>{el.readOnly=ro;if(el.tagName==="SELECT")el.disabled=ro;});
  $("ovFleet").hidden=false;
}
let fleetOpen=null;
$("btnFleet").onclick=openFleet;
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
$("strip").addEventListener("click",e=>{
  if(e.target.closest("#cntToggle")){cntOpen=!cntOpen;try{localStorage.setItem("agenda-conteggi",cntOpen?"1":"0");}catch(_){}renderStrip();const tg=$("cntToggle");if(tg)tg.focus();return;}
  const b=e.target.closest("[data-day]");if(b)go(b.dataset.day);});
$("sign").addEventListener("click",e=>{if(e.target.id==="dPrev")go(addDays(S.sel,-1));if(e.target.id==="dNext")go(addDays(S.sel,1));});
$("sheet").addEventListener("click",e=>{
  const a=e.target.closest("[data-add]");if(a){openForm({vehicle:a.dataset.add,date:S.sel});return;}
  const ed=e.target.closest("[data-edit]");
  if(ed){const b=bookingsAll().find(x=>x.id===ed.dataset.edit&&x.start===ed.dataset.start);if(b)openForm({booking:b});}
});
$("mgrid").addEventListener("click",e=>{const c=e.target.closest("[data-day]");if(c){S.sel=c.dataset.day;setView("day");}});
document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;
  if(!$("ovClientNew").hidden){closeClientNew();return;}
  if(!$("ovClients").hidden){$("ovClients").hidden=true;return;}
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
  if(b.time2&&!onlyDeparture(b.type))p.push("Rientro "+b.time2);
  if(b.pax!==""&&b.pax!=null)p.push(b.pax+" pax");
  if(hasEvent(b.type)&&b.escort)p.push("Accompagnatore: "+b.escort);
  const cl=b.clientCode!==""&&b.clientCode!=null?clientByCode(b.clientCode):null;
  if(b.contactName||(b.contact&&!(cl&&cl[4]===b.contact)))p.push("Ref. "+[b.contactName,b.contact&&!(cl&&cl[4]===b.contact)?b.contact:""].filter(Boolean).join(" "));
  if(b.status==="opzione")p.push("OPZIONE");
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
    M:billItin(b),O:billNote(b),P:num(b.price),Q:num(b.park),R:num(b.meals),AH:isMulti(b.type)?num(b.advance):"",AI:isMulti(b.type)?(b.envelope||""):"",AJ:isMulti(b.type)?(b.envno||""):"",Z:realDriver(b.driver),AA:realDriver(b.driver2),dz:!realDriver(b.driver),daa:isGen(b.driver2),
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
async function renderBill(){
  renderTipiWarn();
  const k=mkey(S.sel),all=$("billRange").value==="all";
  $("billTitle").textContent="Fatturato · "+(all?"tutti i servizi":MN[+k.slice(5,7)-1]+" "+k.slice(0,4));
  let rows;try{rows=await rowsForRange();}catch(err){$("btable").innerHTML='<tbody><tr><td class="empty">Impossibile leggere le prenotazioni. Riprova.</td></tr></tbody>';return;}
  if(S.view!=="bill")return;
  const head='<thead><tr><th>N. foglio</th><th>Tipo servizio</th><th>Cliente</th><th>Mezzo</th><th>Targa</th><th>Inizio</th><th>Fine</th><th>Itinerario</th><th>1° autista</th><th>2° autista</th><th class="r">€ Noleggio</th><th class="r">€ Parcheggi</th><th class="r">€ Pasti</th><th class="r">€ Totale</th><th>Anticipo / busta</th><th></th></tr></thead>';
  if(!rows.length){$("btable").innerHTML=head+'<tbody><tr><td class="empty" colspan="16">Nessun servizio '+(all?"in agenda":"in questo mese")+'.</td></tr></tbody>';return;}
  const sum=k=>rows.reduce((a,r)=>a+(r[k]===""?0:r[k]),0),tot=rows.reduce((a,r)=>a+billTotal(r),0);
  $("btable").innerHTML=head+'<tbody>'+rows.map(r=>{
    const c=r.C!==""?clientByCode(r.C):null;
    return '<tr data-bid="'+esc(r.id)+'" data-bstart="'+esc(r.start)+'">'+
      '<td class="num"><b>'+esc(r.foglio)+'</b></td>'+
      '<td><span class="tip" style="border-color:var(--'+esc(r.type)+'-fill)">'+esc(r.B)+'</span></td>'+
      '<td>'+esc(r.D||"—")+(r.C!==""?'<span class="sub">Cod. '+esc(r.C)+(c&&c[2]?' · '+esc(c[2]):'')+'</span>':'<span class="sub miss">senza codice cliente</span>')+'</td>'+
      '<td>'+esc(r.G)+'<span class="sub">'+esc(r.vehicleName)+'</span></td>'+
      '<td class="num">'+(r.H?esc(r.H):'<span class="miss">manca targa</span>')+'</td>'+
      '<td class="num">'+itDate(r.I)+'</td><td class="num">'+itDate(r.J)+'</td>'+
      '<td>'+esc(r.M)+(r.O?'<span class="sub">'+esc(r.O)+'</span>':'')+'</td>'+
      '<td>'+(r.Z?esc(r.Z):r.dz?'<span class="tbdtxt">da assegnare</span>':"")+'</td><td>'+(r.AA?esc(r.AA):r.daa?'<span class="tbdtxt">da assegnare</span>':"")+'</td>'+
      '<td class="num r">'+money(r.P)+'</td><td class="num r">'+money(r.Q)+'</td><td class="num r">'+money(r.R)+'</td><td class="num r"><b>'+(r.P===""&&r.Q===""&&r.R===""?"":money(billTotal(r)))+'</b></td>'+
      '<td class="num">'+(r.AH!==""?"€ "+money(r.AH):"")+(r.AI?'<span class="sub">Busta '+esc(r.AI)+(r.AJ?" n. "+esc(r.AJ):"")+'</span>':"")+'</td><td><button type="button" class="mini" data-fs="1">Foglio di servizio</button></td></tr>';
  }).join("")+'</tbody><tfoot><tr><td colspan="10">'+rows.length+' servizi</td><td class="num r">'+money(sum("P"))+'</td><td class="num r">'+money(sum("Q"))+'</td><td class="num r">'+money(sum("R"))+'</td><td class="num r">'+money(tot)+'</td><td class="num">'+(sum("AH")?"€ "+money(sum("AH")):"")+'</td><td></td></tr></tfoot>';
}
$("btable").addEventListener("click",e=>{const tr=e.target.closest("[data-bid]");if(!tr)return;const b=bookingsAll().concat(S.allDays?billSourceAll():[]).find(x=>x.id===tr.dataset.bid&&x.start===tr.dataset.bstart);if(!b)return;if(e.target.closest("[data-fs]"))openSheet(b);else openForm({booking:b});});
function billSourceAll(){const out=[];for(const date in S.allDays){const bk=(S.allDays[date]||{}).bookings||{};for(const id in bk){const b=bk[id];if(b&&typeof b==="object")out.push(Object.assign({},b,{id:id,start:b.start||date,type:normType(b.type)}));}}return out;}
$("billRange").addEventListener("change",()=>{S.allDays=null;renderBill();});
function billMsg(t,cls){const m=$("billMsg");m.textContent=t;m.className="bill-msg"+(cls?" "+cls:"");}

// --- copia righe (valori, formato italiano) ---
function rowTSV(r){
  const c=r.C!==""?clientByCode(r.C):null,cells=new Array(45).fill("");
  const put=(col,v)=>{cells[colIdx(col)-1]=String(v==null?"":v).replace(/[\t\r\n]+/g," ");};
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
  _jszip=new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";sc.onload=()=>res(window.JSZip);sc.onerror=()=>{_jszip=null;rej(new Error("jszip"));};document.head.appendChild(sc);});
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
// Il file Excel del modello NON viene modificato: l'app riempie solo le caselle da compilare
// e il valore già calcolato delle formule (che restano quelle del modello).
const TPL_FILE="modelli/automatico_2026_neutro.xlsx",TPL_FILE_H="modelli/neutro_versione_hotel.xlsx";
const TPL_COLS=[11.42578125,12.42578125,6,12.140625,7.42578125,10.28515625,9.140625,13.28515625];
const TPL_LETTERS="ABCDEFGH";
const TPL_ROWS=[[20.0,{"A":{"t":" La Terra s.r.l. - Via Archimede 285C - 97100 - Ragusa - tel. 0932/626240 - Aut. Reg. Sicilia","z":15,"bd":"l1t1"},"B":{"z":15,"bd":"t1"},"C":{"z":15,"bd":"t1"},"D":{"z":15,"bd":"t1"},"E":{"z":15,"bd":"t1"},"F":{"z":15,"bd":"t1"},"G":{"z":15,"bd":"t1"},"H":{"z":15,"bd":"r1t1"}}],[20.0,{"A":{"t":"www.laterra.it - info@laterra.it - laterrasrl@pec.it - univoco M5UXCR1 - p. iva 00826460883","z":15,"bd":"l1b1"},"B":{"z":15,"bd":"b1"},"C":{"z":15,"bd":"b1"},"D":{"z":15,"bd":"b1"},"E":{"z":15,"bd":"b1"},"F":{"z":15,"bd":"b1"},"G":{"z":15,"bd":"b1"},"H":{"z":15,"bd":"r1b1"}}],[12.0,{}],[19,{"A":{"t":"ESTREMI DEL CONTRATTO CON IL CLIENTE E FOGLIO DI SERVIZIO NUMERO","al":"l","bd":"l1t1b1"},"B":{"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"t1b1"},"G":{"bd":"t1b1"},"H":{"bd":"l1r1t1b1"}}],[12.0,{"A":{"z":13},"B":{"z":13},"C":{"z":13},"D":{"z":13},"E":{"z":13},"F":{"z":13},"G":{"z":13},"H":{"z":13,"al":"r"}}],[19,{"A":{"t":"Passeggeri","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"t1b1"},"C":{"t":"Bus","f":"a","bd":"l1t1b1"},"D":{"fx":1,"al":"c","bd":"t1b1"},"E":{"t":"Numero","bd":"l1t1b1"},"F":{"fx":1,"al":"c","bd":"r1t1b1"},"G":{"t":"Targa","bd":"t1b1"},"H":{"fx":1,"al":"c","bd":"r1t1b1"}}],[19,{"A":{"t":"Inizio","bd":"l1t1b1"},"B":{"fx":1,"al":"l","bd":"t1b1"},"C":{"t":"Fine","bd":"l1t1b1"},"D":{"fx":1,"al":"l","bd":"r1t1b1"},"E":{"t":"Giorni","bd":"l1t1b1"},"F":{"fx":1,"al":"c","bd":"r1t1b1"},"G":{"t":"Autista","bd":"l1t1b1"},"H":{"fx":1,"al":"c","bd":"r1t1b1"}}],[19,{"A":{"t":"Cliente","bd":"l1t1b1"},"B":{"fx":1,"b":1,"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Referente 1°","bd":"l1t1b1"},"B":{"fx":1,"al":"l","bd":"t1b1"},"C":{"al":"c","bd":"t1b1"},"D":{"al":"c","bd":"t1b1"},"E":{"al":"c","bd":"t1b1"},"F":{"al":"c","bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Referente 2°","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"t1b1"},"C":{"f":"a","al":"c","bd":"t1b1"},"D":{"f":"a","al":"c","bd":"t1b1"},"E":{"f":"a","al":"c","bd":"t1b1"},"F":{"f":"a","al":"c","bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"f":"a","al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Guida 1°","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"t1b1"},"C":{"f":"a","al":"c","bd":"t1b1"},"D":{"f":"a","al":"c","bd":"t1b1"},"E":{"f":"a","al":"c","bd":"t1b1"},"F":{"f":"a","al":"c","bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"f":"a","al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Guida 2°","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"t1b1"},"C":{"f":"a","al":"c","bd":"t1b1"},"D":{"f":"a","al":"c","bd":"t1b1"},"E":{"f":"a","al":"c","bd":"t1b1"},"F":{"f":"a","al":"c","bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"f":"a","al":"l","bd":"r1t1b1"}}],[13.0,{"A":{"z":15},"B":{"z":15},"C":{"z":15},"D":{"z":15},"E":{"z":15},"F":{"z":15},"G":{"z":15},"H":{"z":15}}],[19,{"A":{"f":"a","al":"l","bd":"l1t1b2"},"B":{"bd":"t1b2"},"C":{"bd":"t1b2"},"D":{"bd":"t1b2"},"E":{"bd":"t1b2"},"F":{"bd":"t1b2"},"G":{"bd":"t1b2"},"H":{"bd":"r1t1b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b1"},"B":{"bd":"t2b1"},"C":{"bd":"t2b1"},"D":{"bd":"t2b1"},"E":{"bd":"t2b1"},"F":{"bd":"t2b1"},"G":{"bd":"t2b1"},"H":{"bd":"r1t2b1"}}],[12.0,{"C":{"bd":"b1"}}],[19,{"A":{"t":"Saldo da ricevere","bd":"l1t1b1"},"B":{"bd":"t1b1"},"C":{"t":"NO","f":"g","al":"c"},"D":{"f":"a","al":"l","bd":"r1t1b1"},"E":{"t":"Acconto La Terra","bd":"l1t1b1"},"F":{"bd":"t1b1"},"G":{"bd":"t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Note 1° park","bd":"l1t1b1"},"B":{"f":"a","bd":"t1b1"},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"f":"a","bd":"t1b1"},"H":{"f":"a","bd":"r1t1b1"}}],[19,{"A":{"t":"Note 2° autis","bd":"l1t1b1"},"B":{"f":"a","bd":"t1b1"},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"f":"a","bd":"t1b1"},"H":{"f":"a","bd":"r1t1b1"}}],[19,{"A":{"t":"Note 3° 3 ore","bd":"l1t1b1"},"B":{"f":"a","bd":"t1b1"},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"f":"a","bd":"t1b1"},"H":{"f":"a","bd":"r1t1b1"}}],[19,{"A":{"t":"Note 4° extra","bd":"l1t1b1"},"B":{"f":"a","bd":"t1b1"},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"f":"a","bd":"t1b1"},"H":{"f":"a","bd":"r1t1b1"}}],[12.0,{}],[12.0,{}],[20.0,{"A":{"t":"Autista firma","bd":"l1t1"},"B":{"bd":"t1"},"C":{"bd":"t1"},"D":{"bd":"r1t1"},"E":{"t":"Azienda firma","bd":"l1t1"},"F":{"bd":"t1"},"G":{"z":15,"bd":"t1"},"H":{"z":15,"bd":"r1t1"}}],[20.0,{"A":{"z":15,"bd":"l1"},"B":{"z":15},"C":{"z":15},"D":{"z":15,"bd":"r1"},"E":{"z":15,"bd":"l1"},"F":{"z":15},"G":{"z":15},"H":{"z":15,"bd":"r1"}}],[20.0,{"A":{"z":15,"bd":"l1b1"},"B":{"z":15,"bd":"b1"},"C":{"z":15,"bd":"b1"},"D":{"z":15,"bd":"r1b1"},"E":{"z":15,"bd":"l1b1"},"F":{"z":15,"bd":"b1"},"G":{"z":15,"bd":"b1"},"H":{"z":15,"bd":"r1b1"}}],[20.0,{}],[20.0,{"A":{"bd":"t3"},"B":{"bd":"t3"},"C":{"bd":"t3"},"D":{"bd":"t3"},"E":{"bd":"t3"},"F":{"bd":"t3"},"G":{"bd":"t3"},"H":{"bd":"t3"}}],[20.0,{"A":{"t":"Servizio","bd":"l1t1b1"},"B":{"f":"a","al":"l","bd":"t1b1"},"C":{"t":"Bus","bd":"l1t1b1"},"D":{"fx":1,"bd":"t1b1"},"E":{"t":"Targa","bd":"l1t1b1"},"F":{"fx":1,"bd":"r1t1b1"},"G":{"t":"Autista","bd":"t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Inizio","bd":"l1t1b1"},"B":{"fx":1,"al":"l","bd":"r1t1b1"},"C":{"t":"Fine","bd":"t1b1"},"D":{"fx":1,"al":"l","bd":"r1t1b1"},"E":{"t":"Giorni","bd":"t1b1"},"F":{"fx":1,"al":"l","bd":"r1"},"G":{"t":"Ore","bd":"l1t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Cliente","bd":"l1t1b1"},"B":{"fx":1,"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Referente","bd":"l1t1b1"},"B":{"fx":1,"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Itinerario","bd":"l1t1"},"B":{"fx":1,"bd":"t1"},"C":{"bd":"t1"},"D":{"bd":"t1"},"E":{"bd":"t1"},"F":{"bd":"t1"},"G":{"bd":"t1"},"H":{"bd":"r1t1"}}],[19,{"A":{"t":"Causale","bd":"l1t1b1"},"B":{"f":"a","bd":"t1b1"},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"t":"Prezzo i.c.","bd":"l1t1b1"},"H":{"fx":1,"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Partita Iva","bd":"l1t1b1"},"B":{"fx":1,"al":"l","bd":"r1t1b1"},"C":{"t":"Multi","bd":"l1t1b1"},"D":{"fx":1,"al":"l","bd":"r1t1b1"},"E":{"t":"SDI","bd":"l1t1b1"},"F":{"f":"a","bd":"r1t1b1"},"G":{"t":"Parcheggi","bd":"l1t1b1"},"H":{"fx":1,"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Fattura acc.","bd":"l1t1b1"},"B":{"fx":1,"al":"l","bd":"r1t1b1"},"C":{"t":"Del","bd":"l1t1b1"},"D":{"fx":1,"al":"l","bd":"r1t1b1"},"E":{"t":"Euro","bd":"l1t1b1"},"F":{"fx":1,"al":"l","bd":"r1t1b1"},"G":{"t":"Pasti","bd":"l1t1b1"},"H":{"fx":1,"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Fattura sald","bd":"l1t1b1"},"B":{"fx":1,"al":"l","bd":"r1t1b1"},"C":{"t":"Del","bd":"l1t1b1"},"D":{"fx":1,"al":"l","bd":"r1t1b1"},"E":{"t":"Euro","bd":"l1t1b1"},"F":{"fx":1,"al":"l","bd":"r1t1b1"},"G":{"t":"Varie ","bd":"l1t1b1"},"H":{"fx":1,"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Note A","bd":"l1"},"B":{"fx":1},"G":{"t":"Totale","bd":"l1t1b1"},"H":{"fx":1,"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Note B","bd":"l1t1b1"},"B":{"fx":1,"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"r1t1b1"},"G":{"t":"Contratto","bd":"l1t1b1"},"H":{"fx":1,"bd":"r1t1b1"}}]];
const TPL_DRIVER_LAST=31; // righe 1–31: copia per l'autista; 32–44: copia ufficio
// Modello "versione Hotel" (neutro_versione_hotel.xlsx): identico al neutro con in più la riga 13
// "Hotel | Telefono" (stessa grafica della riga 12); da lì in giù tutto scende di una riga.
// Con più hotel (anteprima, PDF e stampa) ogni hotel ha la sua riga, una sotto l'altra: 1° Hotel, 2° Hotel…
function hotelRow(label){return [TPL_ROWS[11][0],Object.assign(JSON.parse(JSON.stringify(TPL_ROWS[11][1])),{A:Object.assign({},TPL_ROWS[11][1].A,{t:label})})];}
function hotelsOf(b){return ((b&&b.hotels)||[]).filter(x=>x&&(x.name||x.tel));}
// quale modello: con almeno un hotel si usa la versione Hotel. one: una sola riga Hotel (file Excel del modello)
function tplKind(b,one){
  const n=Math.min(hotelsOf(b).length,one?1:12);
  const rows=n?TPL_ROWS.slice(0,12).concat(Array.from({length:n},(_,i)=>hotelRow(n>1?(i+1)+"° Hotel":"Hotel")),TPL_ROWS.slice(12)):TPL_ROWS;
  return {hotel:n>0,n,rows,file:n?TPL_FILE_H:TPL_FILE,last:TPL_DRIVER_LAST+n,sh:n};
}
const hotelTxt=x=>[x.name,x.tel].filter(Boolean).join(" – ");
function shClient(b){return b.clientCode!==""&&b.clientCode!=null?clientByCode(b.clientCode):null;}
function xlSerial(d){return Math.round((Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10))-Date.UTC(1899,11,30))/864e5);}
const numOrE=x=>x===""||x==null||!isFinite(Number(x))?"":Number(x);
function tplRef2(b,cl){
  const tel=b.contact&&!(cl&&String(cl[4])===b.contact)?b.contact:"";
  if(b.contactName)return {name:b.contactName,tel};
  if(tel)return {name:tel,tel:""}; // prenotazioni vecchie: nome e telefono nella stessa casella
  return null;
}
// programma completo: una riga per tappa (o per giorno nei tour), più referenti, hotel e guide in più
function tplProgramAll(b,all,extraHotels){
  const lines=[],prog=Array.isArray(b.program)?b.program:[];
  // versione Hotel: gli hotel hanno le loro righe sotto le guide; nella pagina 2 (all) si ripetono in testa.
  // extra: hotel che non trovano riga (solo nel file Excel, che ha una riga Hotel sola)
  const hs=hotelsOf(b);
  (all?hs:(extraHotels||[])).forEach(x=>lines.push((hs.length>1?(hs.indexOf(x)+1)+"° ":"")+"Hotel: "+hotelTxt(x)));
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
  (b.refs||[]).slice(tplRef2(b,shClient(b))?0:1).forEach(x=>{if(x.name||x.tel)lines.push("Referente: "+[x.name,x.tel].filter(Boolean).join(" – "));});
  (b.guides||[]).slice(2).forEach(x=>{if(x.name||x.tel)lines.push("Guida: "+[x.name,x.tel].filter(Boolean).join(" – "));});
  return lines;
}
// righe per le 7 caselle del modello (righe 14–20). Se non bastano: nel PDF la settima rimanda alla
// pagina 2, dove c'è il programma completo; nell'Excel la settima contiene tutto il resto.
function tplProgram(b,forPdf,extraHotels){
  const lines=tplProgramAll(b,false,extraHotels);
  if(lines.length<=7)return lines;
  const head=lines.slice(0,6);
  head.push(forPdf?"▸ Il programma continua a pagina 2 (altre "+(lines.length-6)+" righe)":lines.slice(6).join(" · "));
  return head;
}
// valori delle caselle. k: s testo, i numero intero, d data, e euro, a euro contabile. f: casella con formula del modello
function tplValues(b,forPdf,one){
  const v=vehicle(b.vehicle)||{},cl=shClient(b),plate=(v.plate||"").trim(),type=normType(b.type);
  const nr=v.num!=null&&String(v.num).trim()!==""?v.num:(S.regole.numeri||{})[plate],numero=nr==null?"":(/^\d+$/.test(String(nr).trim())?Number(nr):String(nr).trim());
  const nd=diff(b.start,endOf(b))+1,P=numOrE(b.price),Q=numOrE(b.park),R=numOrE(b.meals);
  const name=cl?cl[1]:(b.client||""),tel=cl&&cl[4]?String(cl[4]):"",refName=cl&&cl[6]?cl[6]:"",refTel=cl&&cl[7]?String(cl[7]):"";
  const contact=b.contact&&!(cl&&String(cl[4])===b.contact)?b.contact:"";
  // Referente 2°: il referente della prenotazione (nome + telefono), altrimenti il primo degli "Altri referenti"
  const r2=tplRef2(b,cl)||(b.refs||[])[0]||{},g=b.guides||[];
  const pax=String(b.pax==null?"":b.pax).trim(),kind=v.kind==="van"?"Van":v.kind==="auto"?"Auto":"Bus";
  const drv=realDriver(b.driver),fg=b.provisional?String(b.foglio||"")+" PROVV.":/^\d+$/.test(String(b.foglio||""))?Number(b.foglio):(b.foglio||"");
  const any=P!==""||Q!==""||R!=="";
  const o={
    H4:{v:fg,k:b.provisional?"s":"i"},
    B6:{v:/^\d+$/.test(pax)?Number(pax):pax,k:/^\d+$/.test(pax)?"i":"s"},C6:{v:kind},D6:{v:xcatOf(v),f:1},F6:{v:numero,k:typeof numero==="number"?"i":"s",f:1},H6:{v:plate,f:1},
    B7:{v:b.start,k:"d",f:1},D7:{v:endOf(b),k:"d",f:1},F7:{v:nd,k:"i",f:1},H7:{v:drv,f:1},
    B8:{v:name,f:1},H8:{v:tel,f:1},B9:{v:refName,f:1},H9:{v:refTel,f:1},
    B10:{v:r2.name||""},H10:{v:r2.tel||""},B11:{v:(g[0]||{}).name||""},H11:{v:(g[0]||{}).tel||""},B12:{v:(g[1]||{}).name||""},H12:{v:(g[1]||{}).tel||""},
    C22:{v:b.saldo==="SI"?"SI":"NO"},D22:{v:numOrE(b.saldoAmt),k:"a"},H22:{v:isMulti(type)?numOrE(b.advance):"",k:"e",f:1},
    B23:{v:b.npark||""},B24:{v:b.ndriver||""},B25:{v:b.n3h||""},B26:{v:b.nextra||""},
    B34:{v:TYPE_XL[type]||""},D34:{v:xcatOf(v),f:1},F34:{v:plate,f:1},H34:{v:drv,f:1},
    B35:{v:b.start,k:"d",f:1},D35:{v:endOf(b),k:"d",f:1},F35:{v:nd,k:"i",f:1},H35:{v:drv,f:1},
    B36:{v:name,f:1},H36:{v:tel,f:1},B37:{v:refName,f:1},H37:{v:refTel,f:1},B38:{v:billItin(b),f:1},
    H39:{v:P,k:"e",f:1},B40:{v:cl&&cl[5]?String(cl[5]):"",f:1},F40:{v:cl?cliField(cl,"sdi"):""},D40:{v:cl?cl[0]:"",k:cl&&typeof cl[0]==="number"?"i":"s",f:1},H40:{v:Q,k:"e",f:1},
    B41:{v:"",f:1},D41:{v:"",f:1},F41:{v:"",f:1},H41:{v:R,k:"e",f:1},
    B42:{v:"",f:1},D42:{v:"",f:1},F42:{v:"",f:1},H42:{v:any?0:"",k:"e",f:1},
    B43:{v:"",f:1},H43:{v:(P||0)+(Q||0)+(R||0),k:"e",f:1},B44:{v:billNote(b),f:1},H44:{v:fg,k:b.provisional?"s":"i",f:1},
  };
  const hs=hotelsOf(b),K=tplKind(b,one);
  tplProgram(b,forPdf,hs.slice(K.n)).forEach((t,i)=>{o["A"+(14+i)]={v:t};});
  for(let i=14;i<=20;i++)if(!o["A"+i])o["A"+i]={v:""};
  if(!K.n)return o;
  // dalla riga 13 in giù tutto scende di tante righe quanti sono gli hotel
  const o2={};
  for(const ref in o){const m=/^([A-H])(\d+)$/.exec(ref);o2[m[1]+(+m[2]>=13?+m[2]+K.n:+m[2])]=o[ref];}
  for(let i=0;i<K.n;i++){o2["B"+(13+i)]={v:(one&&hs.length>1?"1° ":"")+(hs[i].name||"")};o2["H"+(13+i)]={v:hs[i].tel||""};}
  return o2;
}
function tplText(x){
  if(!x||x.v===""||x.v==null)return "";
  if(x.k==="d")return itDate(x.v).replace(/\/(\d\d)(\d\d)$/,"/$2");
  if(x.k==="e")return "€ "+money(x.v);
  if(x.k==="a")return money(x.v)+" €";
  return String(x.v);
}
// Disegno del modello (unità: pixel del foglio Excel a 100%). Usato da anteprima e PDF.
function tplLayout(b,full,measure){
  const K=tplKind(b),vals=tplValues(b,true),last=full?K.rows.length:K.last;let cut=false;
  const X=[0];TPL_COLS.forEach(w=>X.push(X[X.length-1]+Math.round(w*9+5)));
  const fills=[],lines=[],texts=[];let y=0;
  const FILLC={a:"#F6FDFC",g:"#E5ECEB"};
  for(let r=1;r<=last;r++){
    const [hpt,cells]=K.rows[r-1],h=hpt*4/3;
    const content=[];
    for(let i=0;i<8;i++){
      const L=TPL_LETTERS[i],c=cells[L]||{},val=vals[L+r];
      const t=val?tplText(val):(c.t!=null&&!c.fx?String(c.t):"");
      content.push({c,t,val});
      const sr="C"+(22+K.sh),cf=L+r==="D"+(22+K.sh)&&vals[sr]&&vals[sr].v==="SI"?"#C6E0B4":null; // come la formattazione condizionale del modello
      if(c.f||cf)fills.push({x:X[i],y,w:X[i+1]-X[i],h,c:cf||FILLC[c.f]});
      const bd=c.bd||"";
      for(const m of bd.matchAll(/([lrtb])([123])/g)){
        const s=m[1],k=m[2],col=k==="2"?"#AEAAAA":"#000000",dash=k==="3",wd=k==="3"?2:1;
        const x1=s==="r"?X[i+1]:X[i],x2=s==="l"?X[i]:X[i+1],y1=s==="b"?y+h:y,y2=s==="t"?y:y+h;
        lines.push({x1,y1,x2:s==="l"||s==="r"?x1:x2,y2:s==="t"||s==="b"?y1:y2,c:col,dash,w:wd});
      }
    }
    for(let i=0;i<8;i++){
      const {c,t,val}=content[i];if(!t)continue;
      const size=(c.z||14)*4/3,bold=!!c.b,isNum=val&&val.k&&val.k!=="s"&&typeof val.v==="number";
      let al=c.al||(isNum?"r":"l");
      // come in Excel: il testo a sinistra si allunga sulle caselle vuote a destra
      let j=i+1;while(j<8&&!content[j].t)j++;
      const cellW=X[i+1]-X[i],regionW=X[j]-X[i];
      let tw=measure(t,size,bold),x0=X[i],w=cellW;
      if(al==="l"||(al==="c"&&tw>cellW-6)){al="l";w=regionW;}
      let sz=size,txt=t;
      if(tw>w-6){sz=Math.max(size*0.72,size*(w-6)/tw);tw=measure(txt,sz,bold);
        // riga del programma troppo lunga: si accorcia e si rimanda alla pagina 2, dove c'è per intero
        const prog=r>=14+K.sh&&r<=20+K.sh&&i===0,suf=prog?"… (segue a pag. 2)":"…";
        if(tw>w-6){if(prog)cut=true;let base=txt;while(tw>w-6&&base.length>1){base=base.slice(0,-2);txt=base.replace(/\s+$/,"")+suf;tw=measure(txt,sz,bold);}}}
      const tx=al==="c"?x0+(w-tw)/2:al==="r"?x0+w-3-tw:x0+3;
      texts.push({x:tx,y:y+h-Math.max(3,(h-sz)/2-1)-sz*0.2,t:txt,size:sz,bold});
    }
    y+=h;
  }
  // la linea di taglio tratteggiata va disegnata tutta d'un pezzo
  const dashed=lines.filter(l=>l.dash),solid=lines.filter(l=>!l.dash),rowsY={};
  for(const l of dashed){const k=l.y1;rowsY[k]=rowsY[k]?{x1:Math.min(rowsY[k].x1,l.x1),x2:Math.max(rowsY[k].x2,l.x2)}:{x1:l.x1,x2:l.x2};}
  for(const k in rowsY)solid.push({x1:rowsY[k].x1,y1:+k,x2:rowsY[k].x2,y2:+k,c:"#000000",dash:true,w:2});
  return {W:X[8],H:y,fills,lines:solid,texts,cut,hotel:K.hotel};
}
// serve la pagina 2? (programma più lungo delle 7 righe del modello o righe tagliate)
function needPage2(b,L){return tplProgramAll(b).length>7||!!(L&&L.cut);} // (gli hotel hanno le loro righe)
function page2Head(b){
  const v=vehicle(b.vehicle)||{},cl=shClient(b);
  return {title:"Foglio di servizio n. "+(b.foglio||"")+(b.provisional?" (provvisorio)":"")+" – programma completo",
    sub:[cl?cl[1]:(b.client||""),itDate(b.start)+(endOf(b)!==b.start?" – "+itDate(endOf(b)):""),[v.name,(v.plate||"").trim()].filter(Boolean).join(" "),realDriver(b.driver)?"Autista "+realDriver(b.driver):""].filter(Boolean).join(" · ")};
}
function tplPage2HTML(b){
  if(!needPage2(b,tplLayout(b,false,measureCanvas)))return "";
  const h=page2Head(b);
  return '<div class="fs-page2"><p class="p2-note">Pagina 2 del PDF</p><h4>'+esc(h.title)+'</h4><p class="p2-sub">'+esc(h.sub)+'</p>'+tplProgramAll(b,true).map(l=>'<p>'+esc(l)+'</p>').join("")+'</div>';
}
const TPL_FONT="Calibri, Carlito, 'Helvetica Neue', Arial, sans-serif";
let _mctx=null;
function measureCanvas(t,size,bold){if(!_mctx)_mctx=document.createElement("canvas").getContext("2d");_mctx.font=(bold?"bold ":"")+size+"px "+TPL_FONT;return _mctx.measureText(t).width;}
function tplSVG(b,full){
  const L=tplLayout(b,full,measureCanvas);
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
async function tplPDF(b,full){
  const PL=await loadPdfLib(),{PDFDocument,StandardFonts,rgb}=PL;
  const pdf=await PDFDocument.create();
  pdf.setTitle("Foglio di servizio "+(b.foglio||"")+(b.provisional?" (provvisorio)":""));pdf.setAuthor("La Terra s.r.l.");
  let reg,bold,HK=1,conv=t=>String(t==null?"":t);
  try{const F=await loadPdfFonts();reg=customFont(pdf,PL,F.regular,"AGENDA+AgendaSans-Regular");bold=customFont(pdf,PL,F.bold,"AGENDB+AgendaSans-Bold");}
  catch(e){console.warn("Font del PDF non disponibile, uso Helvetica:",e);reg=await pdf.embedFont(StandardFonts.Helvetica);bold=await pdf.embedFont(StandardFonts.HelveticaBold);HK=0.88;conv=pdfTxt;} // Helvetica è più larga di Calibri
  const L=tplLayout(b,full,(t,size,bd)=>(bd?bold:reg).widthOfTextAtSize(conv(t),size*HK));
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

// --- Excel: il file del modello, con le sole caselle compilate ---
function tplSetCell(xml,ref,val){
  const m=new RegExp('<c r="'+ref+'"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)').exec(xml);
  if(!m)return xml;
  const attrs=m[1].replace(/\s+t="[^"]*"/,""),fm=/<f[\s\S]*?(?:<\/f>|\/>)/.exec(m[2]||"");
  const v=val.v,empty=v===""||v==null,num=val.k==="d"?xlSerial(v):Number(v);
  const isNum=!empty&&val.k&&val.k!=="s"&&isFinite(num);
  const txt=xEsc(String(empty?"":v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,""));
  let out;
  if(fm)out=isNum?'<c r="'+ref+'"'+attrs+'>'+fm[0]+'<v>'+num+'</v></c>':'<c r="'+ref+'"'+attrs+' t="str">'+fm[0]+'<v>'+txt+'</v></c>';
  else if(empty)out='<c r="'+ref+'"'+attrs+'/>';
  else out=isNum?'<c r="'+ref+'"'+attrs+'><v>'+num+'</v></c>':'<c r="'+ref+'"'+attrs+' t="inlineStr"><is><t xml:space="preserve">'+txt+'</t></is></c>';
  return xml.slice(0,m.index)+out+xml.slice(m.index+m[0].length);
}
async function tplXLSX(b){
  const JSZip=await loadJSZip();
  let r;try{r=await fetch(tplKind(b).file,{cache:"no-cache"});}catch(_){r=null;}
  if(!r||!r.ok)throw {code:"tpl"};
  const zip=await JSZip.loadAsync(await r.arrayBuffer()),p="xl/worksheets/sheet1.xml";
  let xml=await zip.file(p).async("string");
  const vals=tplValues(b,false,true),sstF=zip.file("xl/sharedStrings.xml");
  const sst=sstF?[...(await sstF.async("string")).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>[...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x=>x[1]).join("")):[];
  for(const ref in vals){
    const cur=new RegExp('<c r="'+ref+'"[^>]*t="s"[^>]*><v>(\\d+)</v></c>').exec(xml);
    if(cur&&sst[+cur[1]]===xEsc(String(vals[ref].v)))continue; // es. "Bus" o "NO" già presenti nel modello
    xml=tplSetCell(xml,ref,vals[ref]);
  }
  zip.file(p,xml);
  for(const n of Object.keys(zip.files))if(zip.files[n].dir)delete zip.files[n]; // stesso elenco di file del modello
  return zip.generateAsync({type:"blob",compression:"DEFLATE",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}

// --- nome file come nell'archivio: 26092602_cliente_x_destinazione ---
function slug(t){return norm(pdfTxt(t)).replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,40);}
function sheetFileName(b){
  const cl=shClient(b),who=slug((cl&&cl[2])||(cl&&cl[1])||b.client||"cliente");
  let parts=(b.route||"").split(/[>→,–]| - /).map(x=>x.trim()).filter(Boolean);
  if(parts.length>2){const inner=parts.slice(1);if(norm(inner[inner.length-1])===norm(parts[0]))inner.pop();parts=inner;}else if(parts.length===2)parts=parts.slice(1);
  const what=slug(hasEvent(b.type)&&b.event?b.event:(parts.slice(0,2).join(" ")||TYPES[normType(b.type)]||"servizio"));
  return (b.foglio||"foglio")+"_"+who+(what?"_x_"+what:"");
}

// --- finestra del foglio ---
let sheetBooking=null;
const sheetsOut={}; // prenotazione → n. foglio con cui il foglio di servizio è già stato salvato o inviato
// Il n. foglio è definitivo solo quando la prenotazione è arrivata in Dropbox: prima è "provvisorio"
// (un altro operatore potrebbe aver appena usato lo stesso numero) e il foglio lo dice chiaramente.
function openSheet(b){
  sheetBooking=Object.assign({},b,{provisional:STORE.isPending(b.id)});
  renderSheet();$("sheetMsg").textContent="";
  $("ovSheet").hidden=false;
}
function renderSheet(){
  const b=sheetBooking;if(!b)return;
  $("sheetTitle").textContent="Foglio di servizio n. "+(b.foglio||"")+(b.provisional?" (provvisorio)":"");
  $("sheetKind").textContent=tplKind(b).hotel?"Versione Hotel":"Versione senza hotel";$("sheetKind").className="sheet-kind"+(tplKind(b).hotel?" h":"");$("sheetTpl").textContent=tplKind(b).hotel?"neutro_versione_hotel":"automatico_2026_neutro";
  $("sheetProv").hidden=!b.provisional;
  $("sheetView").innerHTML=tplSVG(b,$("sheetFull").checked)+tplPage2HTML(b);
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
}
$("sheetFull").addEventListener("change",renderSheet);
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
  const full=$("sheetFull").checked,btns=[$("sheetPdf"),$("sheetPrint")];btns.forEach(x=>x.disabled=true);
  $("sheetMsg").textContent="Preparo il file…";
  try{
    const blob=kind==="pdf"?await tplPDF(sheetBooking,full):await tplXLSX(sheetBooking);
    const where=await saveXlsx(blob,sheetFileName(sheetBooking)+(full&&kind==="pdf"?"_completo":"")+(sheetBooking.provisional?"_PROVVISORIO":"")+"."+kind);
    sheetsOut[sheetBooking.id]=String(sheetBooking.foglio);
    $("sheetMsg").textContent=(kind==="pdf"?"PDF pronto. ":"File Excel pronto. ")+where;
  }catch(err){
    const c=err&&err.code;
    $("sheetMsg").textContent=c==="tpl"?"Non trovo il modello del foglio di servizio (cartella modelli): controlla di averla caricata su GitHub.":c==="declined"?"Salvataggio annullato.":c==="unavailable"||c==="not_granted"?"Il download non è disponibile in questa vista.":"Non sono riuscito a creare il file. Controlla la connessione e riprova.";
    console.error(err);
  }finally{btns.forEach(x=>x.disabled=false);}
}
$("sheetPdf").onclick=()=>{sheetSave("pdf");if(sheetBooking)ACC.log("foglio","PDF del foglio di servizio n. "+(sheetBooking.foglio||"")+" «"+(sheetBooking.client||"")+"»"+(tplKind(sheetBooking).hotel?" (versione Hotel)":""),{id:sheetBooking.id});};
// Stampa: il foglio come nell'anteprima (A4); se il programma non ci sta, anche la pagina 2 come nel PDF
async function printSheet(){
  if(!sheetBooking)return;
  refreshSheetBooking();
  const b=sheetBooking,full=$("sheetFull").checked,ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  sheetsOut[b.id]=String(b.foglio);
  ACC.log("foglio","Stampa del foglio di servizio n. "+(b.foglio||"")+" «"+(b.client||"")+"»"+(tplKind(b).hotel?" (versione Hotel)":""),{id:b.id});
  if(ios){ // su iPhone/iPad si stampa dal PDF (Condividi › Stampa)
    try{const blob=await tplPDF(b,full);const u=URL.createObjectURL(blob);window.open(u,"_blank");setTimeout(()=>URL.revokeObjectURL(u),60000);}catch(_){toast("Non riesco a preparare la stampa.");}
    return;
  }
  let p2="";
  if(needPage2(b,tplLayout(b,false,measureCanvas))){
    const h=page2Head(b);
    p2='<section class="p2"><h1>'+esc(h.title)+'</h1><p class="sub">'+esc(h.sub)+'</p>'+tplProgramAll(b,true).map(l=>'<p>'+esc(l)+'</p>').join("")+'</section>';
  }
  const html='<!doctype html><html lang="it"><head><meta charset="utf-8"><title>'+esc("Foglio di servizio "+(b.foglio||"")+(b.provisional?" (provvisorio)":""))+'</title>'+
    '<style>@page{size:A4 portrait;margin:10mm}html,body{margin:0;background:#fff;color:#111;font-family:Calibri,Carlito,Arial,sans-serif}svg{display:block;width:100%;height:auto;max-height:275mm}'+
    '.p2{break-before:page;page-break-before:always;font-size:12pt}.p2 h1{font-size:15pt;margin:0 0 4pt}.p2 .sub{color:#444;margin:0 0 10pt}.p2 p{margin:0 0 4pt}</style></head><body>'+tplSVG(b,full)+p2+'</body></html>';
  let fr=$("printFrame");
  if(fr)fr.remove();
  fr=document.createElement("iframe");fr.id="printFrame";fr.setAttribute("aria-hidden","true");fr.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(fr);
  await new Promise(r=>{fr.onload=r;fr.srcdoc=html;});
  try{fr.contentWindow.focus();fr.contentWindow.print();}catch(_){toast("Non riesco ad aprire la stampa.");}
}
$("sheetPrint").onclick=printSheet;

// ---------- versione ----------
const APP_VERSION="1.9",APP_DATE="30/09/2026";window.AGENDA_VERSION=APP_VERSION;
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
  refreshSheetBooking();
  if(!$("app").hidden)setTimeout(migrateFleet2026,300);
}
function fmtTime(t){if(!t)return "";const d=new Date(t);const today=new Date().toDateString()===d.toDateString();return (today?"oggi":d.toLocaleDateString("it-IT",{day:"numeric",month:"short"}))+" alle "+d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}
function renderNet(st){
  st=st||STORE.status();
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
  // stato del fatturato
  const f=st.fat,fs=$("fatStatus");if(!fs)return;
  const files=STORE.fatFiles(),ys=Object.keys(files).sort();
  let h,c="";
  if(!ys.length){h="Nessun file fatturato collegato. Sceglilo dal Menu › Collega file fatturato.";c="err";}
  else if(st.fatPending){h=st.fatPending+(st.fatPending===1?" riga da scrivere nel fatturato":" righe da scrivere nel fatturato")+(navigator.onLine?"…":" appena torna la connessione.");}
  else if(!f||!f.files){h="In attesa del primo aggiornamento del fatturato.";}
  else{
    const parts=ys.map(y=>{const r=f.files[y]||{},n="<b>"+esc(files[y].name)+"</b>";
      if(r.ok)return n+" aggiornato "+fmtTime(r.at);
      if(r.error==="missing")return "non trovo più "+n+" in Dropbox: collegalo di nuovo dal Menu";
      if(r.error==="nosheet")return "in "+n+" non c'è il foglio \"agenda\"";
      return n+": aggiornamento non riuscito, riprovo tra poco";});
    h=parts.join(" · ")+".";c=f.ok?"ok":"err";
  }
  fs.className="bill-status "+c;fs.innerHTML=h;
}
STORE.configure({
  onChange:refreshFromStore,
  onStatus:renderNet,
  onAccessChanged:()=>{if(!$("app").hidden&&!STORE.users)showGate("code",{msg:"Il codice di accesso è stato cambiato: inserisci quello nuovo."});},
  onUsersChanged:U=>onUsersChanged(U),
  onAuthLost:()=>showGate("link",{msg:"L'accesso a Dropbox è scaduto o è stato revocato: collegalo di nuovo."}),
  rowFor:b=>Object.assign(billRow(Object.assign({},b,{start:b.start})),{tour:isMulti(b.type)}),
  onClientAdded:(tmp,info)=>onClientAdded(tmp,info),
  onClientEdited:(q,x)=>onClientEdited(q,x),
  onClientError:(c,q)=>{notify((c==="codeexists"?"Codice Multi già usato nel file ("+cliErrText(q)+")":c==="noclienti"?"Nel file fatturato non trovo il foglio «clienti»":c==="noname"?"Manca la ragione sociale":"Errore nel file fatturato")+": il cliente «"+((q&&q.name)||"")+"» non è stato scritto. "+(c==="codeexists"?"Correggilo":"Puoi riprovare o annullarlo")+" da Clienti.",true);if(!$("ovClients").hidden)renderClients();},
  onNotice:onNotice
});
// avvisi importanti: restano in alto finché non li chiudi
function notify(msg,sticky){
  if(!sticky){toast(msg);return;}
  const b=$("banner");const d=document.createElement("div");d.className="bn";d.innerHTML='<span></span><button type="button" aria-label="Chiudi avviso">×</button>';d.firstChild.textContent=msg;
  d.lastChild.onclick=()=>{d.remove();b.hidden=!b.children.length;};b.appendChild(d);b.hidden=false;
}
function itD(d){return d?(+d.slice(8,10))+"/"+d.slice(5,7)+"/"+d.slice(0,4):"";}
function onNotice(n){
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
  else if(n.kind==="badcfg")notify("Non riesco a leggere il file "+(n.path||"di configurazione")+" in Dropbox: controllalo.",true);
}
// extra: per le prenotazioni {edit, base, patch, move}; per le eliminazioni {move: nuova data}
function writeDayOps(date,patch,extra){
  const ops=[];extra=extra||{};
  if(patch.bookings)for(const k in patch.bookings)ops.push(patch.bookings[k]===null?Object.assign({t:"del",id:k},extra.move&&typeof extra.move==="string"?{move:extra.move}:{},extra.client!=null?{client:extra.client}:{}):Object.assign({t:"put",id:k,b:patch.bookings[k],assign:!!patch.assign},extra));
  if("extra" in patch)ops.push({t:"extra",v:patch.extra,base:patch.base==null?null:patch.base});
  STORE.mutateDay(date,ops);
}
$("billSync").onclick=async()=>{billMsg("Aggiorno…");await STORE.pull();await STORE.flush();await STORE.syncFatturato();const f=STORE.fat;billMsg(f&&f.ok?"Fatturato aggiornato.":"Non riesco ad aggiornare il fatturato adesso: riprovo da solo più tardi.",f&&f.ok?"ok":"err");};

// ---------- codice di accesso (impronta PBKDF2 salvata in Dropbox) ----------
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function pbkdf2(code,salt,iter){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(code),"PBKDF2",false,["deriveBits"]);return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new TextEncoder().encode(salt),iterations:iter},k,256));}
async function makeAccess(code){const salt=hex(crypto.getRandomValues(new Uint8Array(16)));const iter=150000;return {salt,iter,hash:await pbkdf2(code,salt,iter),at:new Date().toISOString()};}
async function checkCode(code){const a=STORE.access;return !!a&&(await pbkdf2(code,a.salt,a.iter||150000))===a.hash;}

// ---------- schermata iniziale: collegamento, file fatturato, codice ----------
let gateMode="";
function showGate(mode,o){
  o=o||{};gateMode=mode;
  $("gate").hidden=false;$("app").hidden=true;
  ["ovBooking","ovFleet","ovMenu","ovSheet","ovClients","ovClientNew","ovMaster"].forEach(id=>{const x=$(id);if(x)x.hidden=true;});
  if(typeof hsClose==="function")hsClose();
  ["gLink","gLoad","gFat","gCode","gMaster","gLogin"].forEach(id=>$(id).hidden=true);
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
function hideGate(){$("gate").hidden=true;$("app").hidden=false;renderAll();renderNet();}
let started=false;
function unlocked(){
  hideGate();applyRole();refreshFromStore();lastAct=Date.now();
  if(!started){started=true;STORE.flush();STORE.syncFatturato();STORE.watch();ACC.startBeat();}
  ACC.beat();ACC.flushLog();
}
// Dalla 1.8: ognuno entra con nome e password (config/utenti.json). Se l'elenco utenti non c'è ancora,
// si crea il Master: serve il codice di accesso usato finora (se c'era), così non può farlo chiunque.
async function afterSync(o){
  o=o||{};
  let U=STORE.users;
  if(!U){
    if(!navigator.onLine){showGate("loading",{title:"Connessione necessaria",text:"Il primo accesso con la versione "+APP_VERSION+" richiede internet: collegati e premi Riprova."});$("gRetry").hidden=false;return;}
    try{U=await STORE.fetchUsers();}
    catch(_){showGate("loading",{title:"Dropbox non risponde",text:"Non riesco a leggere l'elenco degli utenti da Dropbox. Premi Riprova tra qualche secondo."});$("gRetry").hidden=false;return;}
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
  const me=ACC.session();if(me)$("menuInfo").innerHTML="Sei entrato come <b>"+esc(me.name)+"</b>"+(me.role==="master"?" (Master)":"")+". "+$("menuInfo").innerHTML;
  applyRole();menuPane("mMain");$("ovMenu").hidden=false;
};
$("whoAmI").onclick=()=>$("btnMenu").click();
$("mClose").onclick=()=>{$("ovMenu").hidden=true;};
document.querySelectorAll("[data-pane]").forEach(b=>{b.onclick=()=>menuPane(b.dataset.pane);});
$("mLock").onclick=()=>doLogout();
$("mFat").onclick=()=>{if(!navigator.onLine){$("menuMsg").textContent="Serve la connessione a internet.";return;}showGate("fatturato",{fromMenu:true});};
$("mSync").onclick=async()=>{$("menuMsg").textContent="Aggiorno…";await STORE.pull();await STORE.flush();await STORE.syncFatturato();$("menuMsg").textContent=navigator.onLine?"Fatto.":"Sei offline: le modifiche partiranno appena torna la connessione.";};
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
function isMaster(){const s=ACC.session();return !!s&&s.role==="master";}
// cosa possono fare gli utenti normali (lo decide il Master nelle Impostazioni; di serie tutto permesso)
function canEdit(kind){if(isMaster())return true;const p=((STORE.settings||{}).perms)||{};return p[kind]!==false;}
function meName(){const s=ACC.session();return s?s.name:"";}
function reasonMsg(why){return {removed:"Il tuo account è stato eliminato dal Master.",disabled:"Il tuo account è stato disattivato dal Master.",password:"La password è stata cambiata: entra con quella nuova.",kicked:"Il Master ha disconnesso questo dispositivo: entra di nuovo con la tua password."}[why]||"";}
function applyRole(){
  const s=ACC.session(),m=!!s&&s.role==="master";
  document.body.classList.toggle("is-master",m);
  $("whoAmI").hidden=!s;if(s){$("whoAmI").textContent=s.name+(m?" · Master":"");$("whoAmI").className="whoami"+(m?" m":"");}
  document.querySelectorAll(".mst-only").forEach(el=>{el.hidden=!m;});
}
function renderWho(){
  const U=STORE.users||{users:{}};
  const list=Object.entries(U.users).filter(([,u])=>u.active!==false).sort((a,b)=>a[1].name.localeCompare(b[1].name,"it"));
  $("gWho").innerHTML=list.map(([id,u])=>'<button type="button" role="radio" data-uid="'+esc(id)+'" aria-checked="'+(id===loginUid)+'">'+esc(u.name)+(u.role==="master"?'<small>Master</small>':'')+'</button>').join("")||'<p class="gate-sub">Nessun utente attivo.</p>';
}
$("gWho").addEventListener("click",e=>{const b=e.target.closest("[data-uid]");if(!b)return;loginUid=b.dataset.uid;renderWho();$("gMsg").textContent="";$("gPw").focus();});
$("gPwShow").onclick=()=>{const show=$("gPw").type==="password";$("gPw").type=show?"text":"password";$("gPwShow").textContent=show?"Nascondi":"Mostra";};
$("gLoginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const U=STORE.users,u=U&&loginUid&&U.users[loginUid],btn=$("gLoginBtn");
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
  ACC.refreshSession(U);applyRole();
  if(!isMaster()){$("ovMaster").hidden=true;if(!$("ovMenu").hidden)menuPane("mMain");}
  else if(!$("ovMaster").hidden)renderMasterTab();
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
  ACC.logout();DBX.unlink();await STORE.reset();ACC.forgetDevice();
  try{localStorage.removeItem("agenda-view");localStorage.removeItem("agenda-last-user");}catch(_){}
  applyRole();showGate("link",{msg:"Questo dispositivo è stato bloccato dal Master. Per usarlo di nuovo va ricollegato con l'account Dropbox dell'azienda."});
  blocking=false;
}
// uscita automatica dopo un periodo senza attività (impostazione del Master)
["pointerdown","keydown","wheel","touchstart"].forEach(t=>document.addEventListener(t,()=>{lastAct=Date.now();},{passive:true,capture:true}));
setInterval(()=>{
  const min=+((STORE.settings||{}).autoLock||0);
  if(!min||!ACC.session()||$("app").hidden||formDirty())return;
  if(Date.now()-lastAct>min*60000)doLogout("Sei uscito automaticamente dopo "+(min<60?min+" minuti":(min/60)+(min===60?" ora":" ore"))+" senza attività.","Uscita automatica (inattività)");
},20000);

// ---------- registro: cosa è cambiato in una prenotazione ----------
const FIELD_LBL={type:"Categoria",vehicle:"Mezzo",start:"Data partenza",end:"Data rientro",time:"Ora partenza",time2:"Ora rientro",client:"Cliente",clientCode:"Codice cliente",route:"Itinerario",event:"Evento",escort:"Accompagnatore",pax:"Passeggeri",price:"Prezzo",park:"Parcheggi",meals:"Pasti",advance:"Acconto",envelope:"Busta",envno:"N. busta",driver:"1° autista",driver2:"2° autista",contact:"Referente telefono",contactName:"Referente nome",status:"Stato",notes:"Note",saldo:"Saldo da ricevere",saldoAmt:"€ Saldo",npark:"Note 1° park",ndriver:"Note 2° autista",n3h:"Note 3° 3 ore",nextra:"Note 4° extra",refs:"Altri referenti",hotels:"Hotel",guides:"Guide",program:"Programma"};
function logVal(k,v){
  if(v===""||v==null||(Array.isArray(v)&&!v.filter(Boolean).length))return "—";
  if(k==="vehicle")return (vehicle(v)||{}).name||String(v);
  if(k==="type")return TYPES[normType(v)]||v;
  if(k==="start"||k==="end")return itD(v);
  if(["price","park","meals","advance","saldoAmt"].includes(k))return "€ "+money(v);
  if(k==="refs"||k==="hotels"||k==="guides")return v.map(x=>[x.name,x.tel].filter(Boolean).join(" ")).join("; ").slice(0,160);
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
  $("mtUsers").hidden=t!=="users";$("mtDevs").hidden=t!=="devs";$("mtLog").hidden=t!=="log";$("mtSet").hidden=t!=="set";
  renderMasterTab();
  if(t==="log")loadLog();
}
function renderMasterTab(){if(mstTab==="users")renderUsers();else if(mstTab==="devs")renderDevices();else if(mstTab==="log")renderLog();else renderSettings();}
document.querySelectorAll("[data-mt]").forEach(b=>b.onclick=()=>{mstMsg("");setMasterTab(b.dataset.mt);});
$("mMaster").onclick=()=>openMaster();
$("mstClose").onclick=()=>{$("ovMaster").hidden=true;};
function agoTxt(t){if(!t)return "";const m=Math.round((Date.now()-new Date(t))/60000);if(m<2)return "adesso";if(m<60)return m+" min fa";return fmtTime(t);}
async function loadDevices(){
  try{mstDevs=await ACC.devices();}catch(_){mstDevs=mstDevs||[];if(mstTab==="devs")mstMsg("Non riesco a leggere l'elenco dei dispositivi. Controlla la connessione.",true);}
  if(!$("ovMaster").hidden&&(mstTab==="devs"||mstTab==="users"))renderMasterTab();
}
function lastLoginOf(uid){let t="",dv="";for(const d of (mstDevs||[]))if(d.uid===uid&&d.loginAt&&d.loginAt>t){t=d.loginAt;dv=d.dev;}return t?{t,dv}:null;}
function renderUsers(){
  const U=STORE.users||{users:{}},me=ACC.session()||{};
  const list=Object.entries(U.users).sort((a,b)=>(a[1].role===b[1].role?0:a[1].role==="master"?-1:1)||a[1].name.localeCompare(b[1].name,"it"));
  $("uList").innerHTML=list.map(([id,u])=>{
    const ll=lastLoginOf(id),on=(mstDevs||[]).some(d=>d.uid===id&&d.state==="attivo"&&Date.now()-new Date(d.last)<20*60000);
    return '<div class="u-row"><div><b>'+esc(u.name)+'</b>'+(id===me.uid?' <span class="pill">tu</span>':'')+'<small>'+(u.created?"creato il "+itD(u.created.slice(0,10))+(u.createdBy?" da "+esc(u.createdBy):""):"")+'</small></div>'+
      '<div><span class="pill'+(u.role==="master"?" m":"")+'">'+(u.role==="master"?"Master":"Utente")+'</span></div>'+
      '<div><span class="pill '+(u.active===false?"off":"on")+'">'+(u.active===false?"Disattivato":on?"Collegato ora":"Attivo")+'</span></div>'+
      '<div><small>Ultimo accesso</small>'+(ll?esc(fmtTime(ll.t))+'<small>'+esc(ACC.devLabel(ll.dv)||devAuto(ll.dv))+'</small>':'<small>—</small>')+'</div>'+
      '<div class="row-act"><button type="button" class="btn" data-uedit="'+esc(id)+'">Modifica</button></div></div>';
  }).join("");
}
function devAuto(id){const d=(mstDevs||[]).find(x=>x.dev===id);return d?d.auto:"";}
let uEditing=null;
function openUserForm(id){
  const U=STORE.users||{users:{}},u=id?U.users[id]:null;uEditing=id||null;
  $("uFormTitle").textContent=u?"Modifica «"+u.name+"»":"Nuovo utente";
  $("uName").value=u?u.name:"";$("uRole").value=u?u.role:"utente";$("uActive").checked=u?u.active!==false:true;
  $("uPw").value=u?"":ACC.genPassword();$("uPwLbl").textContent=u?"Nuova password":"Password da comunicare";$("uPw").placeholder=u?"lascia vuoto per non cambiarla":"";
  $("uDel").hidden=!u||id===(ACC.session()||{}).uid;$("uNote").textContent="";
  $("uForm").hidden=false;$("uName").focus();
}
$("uNew").onclick=()=>openUserForm(null);
$("uList").addEventListener("click",e=>{const b=e.target.closest("[data-uedit]");if(b)openUserForm(b.dataset.uedit);});
$("uGen").onclick=()=>{$("uPw").value=ACC.genPassword();};
$("uCancel").onclick=()=>{$("uForm").hidden=true;uEditing=null;};
function mastersLeft(J,exceptId){return Object.entries(J.users).filter(([id,u])=>id!==exceptId&&u.role==="master"&&u.active!==false).length;}
$("uForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const name=cleanText($("uName").value),role=$("uRole").value,active=$("uActive").checked,pw=$("uPw").value.trim(),me=ACC.session(),note=$("uNote");
  const U=STORE.users||{users:{}},id=uEditing,old=id?U.users[id]:null;
  if(name.length<2){note.textContent="Scrivi nome e cognome.";return;}
  if(Object.entries(U.users).some(([k,u])=>k!==id&&norm(u.name)===norm(name))){note.textContent="Esiste già un utente con questo nome.";return;}
  if(!old&&pw.length<6){note.textContent="La password deve avere almeno 6 caratteri.";return;}
  if(old&&pw&&pw.length<6){note.textContent="La nuova password deve avere almeno 6 caratteri.";return;}
  if(id===me.uid&&(role!=="master"||!active)){note.textContent="Non puoi togliere a te stesso il ruolo Master o disattivarti.";return;}
  if(old&&old.role==="master"&&(role!=="master"||!active)&&!mastersLeft(U,id)){note.textContent="Deve restare almeno un Master attivo.";return;}
  if(!navigator.onLine){note.textContent="Serve la connessione a internet.";return;}
  $("uSave").disabled=true;
  try{
    const sec=pw?await ACC.makeSecret(pw):null,now=new Date().toISOString();
    const nid=id||("u"+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
    if(id===me.uid&&sec)pwChanging=sec.pwAt;
    await STORE.updateUsers(J=>{
      if(id&&!J.users[id])return null;
      const x=id?J.users[id]:{created:now,createdBy:me.name};
      x.name=name;x.role=role;x.active=active;if(sec)Object.assign(x,sec);
      J.users[nid]=x;return J;
    });
    if(id===me.uid&&sec){const s=ACC.session();s.pwAt=sec.pwAt;ACC.setSession(s);}
    const ch=[];
    if(old){if(old.name!==name)ch.push(["Nome",old.name,name]);if(old.role!==role)ch.push(["Ruolo",old.role,role]);if((old.active!==false)!==active)ch.push(["Stato",old.active!==false?"attivo":"disattivato",active?"attivo":"disattivato"]);if(sec)ch.push(["Password","","cambiata"]);}
    ACC.log("utenti",old?"Modificato l'utente «"+name+"»":"Creato l'utente «"+name+"» ("+(role==="master"?"Master":"Utente")+")",ch.length?{ch}:null);
    $("uForm").hidden=true;uEditing=null;renderUsers();
    mstMsg(old?"Utente aggiornato."+(sec&&id!==me.uid?" Sui suoi dispositivi dovrà entrare con la nuova password.":""):"Utente creato. Password da comunicare: "+pw);
  }catch(err){note.textContent=err&&err.code==="offline"?"Serve la connessione a internet.":"Non riesco a salvare. Riprova tra poco.";}
  finally{$("uSave").disabled=false;pwChanging=null;}
});
$("uDel").onclick=async()=>{
  const id=uEditing,U=STORE.users,u=id&&U&&U.users[id];if(!u)return;
  if(u.role==="master"&&!mastersLeft(U,id)){$("uNote").textContent="Deve restare almeno un Master attivo.";return;}
  if(!confirm("Eliminare l'utente «"+u.name+"»? Non potrà più entrare. Nel registro restano le sue azioni."))return;
  try{await STORE.updateUsers(J=>{if(!J.users[id])return null;delete J.users[id];return J;});ACC.log("utenti","Eliminato l'utente «"+u.name+"»");$("uForm").hidden=true;uEditing=null;renderUsers();mstMsg("Utente eliminato.");}
  catch(_){$("uNote").textContent="Non riesco a eliminarlo adesso. Riprova.";}
};
function renderDevices(){
  const U=STORE.users||{},bl=U.blocked||{},list=(mstDevs||[]).slice().sort((a,b)=>(a.dev===ACC.device.id?-1:b.dev===ACC.device.id?1:0)||(a.last<b.last?1:-1));
  if(!mstDevs){$("devList").innerHTML='<div class="lg-empty">Carico l\'elenco…</div>';return;}
  $("devList").innerHTML=list.map(d=>{
    const me=d.dev===ACC.device.id,blocked=!!bl[d.dev]||d.state==="bloccato",fresh=Date.now()-new Date(d.last)<20*60000,on=d.state==="attivo"&&fresh&&!blocked;
    const lbl=ACC.devLabel(d.dev)||d.auto||"Dispositivo";
    const who=blocked?'<span class="pill off">Bloccato</span>'+(d.state==="bloccato"?"<small>scollegato da Dropbox</small>":"<small>si scollega appena torna online</small>"):d.uid&&d.state==="attivo"?'<b>'+esc(d.user)+'</b><small>'+(d.role==="master"?"Master · ":"")+"entrato "+esc(fmtTime(d.loginAt))+'</small>':'<span class="pill">Nessuno</span><small>'+(d.state==="scollegato"?"scollegato":"uscito")+'</small>';
    let act="";
    if(me)act='<span class="pill m">Questo dispositivo</span>';
    else if(blocked)act=d.state==="bloccato"?'<button type="button" class="btn" data-dforget="'+esc(d.dev)+'">Togli dall\'elenco</button>':'';
    else act=(d.uid&&d.state==="attivo"?'<button type="button" class="btn" data-dkick="'+esc(d.dev)+'">Disconnetti</button>':'')+'<button type="button" class="btn danger" data-dblock="'+esc(d.dev)+'">Blocca</button>';
    return '<div class="dev-row'+(me?" me":"")+'"><div><button type="button" class="dev-name" data-dname="'+esc(d.dev)+'" title="Rinomina">'+esc(lbl)+' ✎</button><small>'+esc(d.auto||"")+(d.ver?" · v"+esc(d.ver):"")+'</small></div>'+
      '<div>'+who+'</div><div><span class="dot'+(on?" on":"")+'"></span>'+esc(agoTxt(d.last))+'<small>ultima attività</small></div><div><small>versione</small>'+esc(d.ver||"—")+'</div><div class="row-act">'+act+'</div></div>';
  }).join("")||'<div class="lg-empty">Nessun dispositivo ha ancora usato la versione '+APP_VERSION+'.</div>';
}
$("devReload").onclick=()=>{mstDevs=null;renderDevices();loadDevices();};
$("devList").addEventListener("click",async e=>{
  const k=e.target.closest("[data-dkick]"),bl=e.target.closest("[data-dblock]"),nm=e.target.closest("[data-dname]"),fg=e.target.closest("[data-dforget]");
  const d=(mstDevs||[]).find(x=>x.dev===((k||bl||nm||fg)||{dataset:{}}).dataset[k?"dkick":bl?"dblock":nm?"dname":"dforget"]);if(!d)return;
  const lbl=ACC.devLabel(d.dev)||d.auto;
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
const LOG_KIND={accesso:"Accesso",prenotazione:"Prenotazione",cliente:"Cliente",foglio:"Foglio",impostazioni:"Impostazioni",utenti:"Utenti",dispositivi:"Dispositivi"};
function logRange(){const n=+$("lgPer").value,to=ACC.localDate(),d=new Date();d.setDate(d.getDate()-n);return {from:ACC.localDate(d),to};}
async function loadLog(){
  const r=logRange(),key=r.from+"|"+r.to;
  if(mstLog&&mstLogKey===key&&Date.now()-mstLog.at<30000){renderLog();return;}
  $("lgList").innerHTML='<div class="lg-empty">Leggo il registro da Dropbox…</div>';
  try{await ACC.flushLog();const ev=await ACC.readLog(r.from,r.to);mstLog={ev,at:Date.now()};mstLogKey=key;}
  catch(_){mstLog=null;$("lgList").innerHTML='<div class="lg-empty">Non riesco a leggere il registro. Controlla la connessione e riprova.</div>';return;}
  renderLog();
}
function logFiltered(){
  if(!mstLog)return [];
  const uf=$("lgUser").value,kf=$("lgKind").value,q=norm($("lgQ").value).trim();
  return mstLog.ev.filter(e=>(!uf||e.u===uf||(!e.u&&e.d&&e.d.uid===uf))&&(!kf||e.k===kf||(kf==="impostazioni"&&(e.k==="utenti"||e.k==="dispositivi")))&&(!q||norm(e.n+" "+e.x+" "+JSON.stringify(e.d||"")).includes(q)));
}
function logTime(t){const d=new Date(t),y=d.getFullYear()!==new Date().getFullYear();return d.toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:y?"2-digit":undefined})+" "+d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}
function renderLog(){
  const U=STORE.users||{users:{}},sel=$("lgUser").value;
  const names=new Map(Object.entries(U.users).map(([id,u])=>[id,u.name]));(mstLog?mstLog.ev:[]).forEach(e=>{if(e.u&&!names.has(e.u))names.set(e.u,e.n+" (eliminato)");});
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
  const ev=logFiltered(),q=v=>'"'+String(v==null?"":v).replace(/"/g,'""')+'"';
  const rows=[["Data","Ora","Utente","Dispositivo","Tipo","Azione","Dettagli"].map(q).join(";")].concat(ev.map(e=>{const d=new Date(e.t);return [d.toLocaleDateString("it-IT"),d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}),e.n,ACC.devLabel(e.dv)||e.auto,LOG_KIND[e.k]||e.k,e.x,((e.d&&e.d.ch)||[]).map(c=>c[0]+": "+(c[1]!==""?c[1]+" → ":"")+c[2]).join(" | ")+(e.d&&e.d.txt?e.d.txt:"")].map(q).join(";");}));
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["﻿"+rows.join("\r\n")],{type:"text/csv;charset=utf-8"}));a.download="registro_agenda_"+logRange().from+"_"+logRange().to+".csv";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
  ACC.log("impostazioni","Scaricato il registro in CSV ("+ev.length+" eventi)");
};
// impostazioni
function renderSettings(){
  const st=STORE.settings||{},ff=STORE.fatFiles(),fy=Object.keys(ff).sort();
  if(document.activeElement!==$("setGKey"))$("setGKey").value=st.googleKey||"";
  $("setLock").value=String(st.autoLock||0);
  const pm=st.perms||{};$("permClients").checked=pm.clients!==false;$("permFleet").checked=pm.fleet!==false;
  $("setFatInfo").innerHTML="File fatturato: "+(fy.length?fy.map(y=>(y==="*"?"":y+" → ")+"<b>"+esc(ff[y].name)+"</b>").join(", "):"<b>non collegato</b>")+". Flotta: <b>"+S.fleet.length+" mezzi</b>.";
}
function setGMsg(t,c){$("setGMsg").textContent=t||"";$("setGMsg").className="set-msg"+(c?" "+c:"");}
$("setGTest").onclick=async()=>{
  const k=$("setGKey").value.trim();if(!k){setGMsg("Incolla prima la chiave.","err");return;}
  setGMsg("Provo a cercare «hotel Ragusa»…");
  try{const r=await gAutocomplete("hotel Ragusa",k,newToken());setGMsg(r.length?"Funziona: per esempio «"+r[0].main+"» ("+r[0].sec+").":"La chiave funziona, ma non ha trovato hotel.","ok");}
  catch(e){setGMsg(gErrText(e),"err");}
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
["permClients","permFleet"].forEach(id=>$(id).onchange=async()=>{
  const perms=Object.assign({},((STORE.settings||{}).perms)||{},{clients:$("permClients").checked,fleet:$("permFleet").checked});
  try{await STORE.setSettings({perms});ACC.log("impostazioni","Permessi degli utenti: anagrafica clienti "+(perms.clients?"sì":"no")+", flotta "+(perms.fleet?"sì":"no"));mstMsg("Permessi salvati per tutti i dispositivi.");}
  catch(_){mstMsg("Non riesco a salvare: serve la connessione a internet.",true);renderSettings();}
});
$("setFat").onclick=()=>{if(!navigator.onLine){mstMsg("Serve la connessione a internet.",true);return;}$("ovMaster").hidden=true;showGate("fatturato",{fromMenu:true});};
$("setFleet").onclick=()=>{$("ovMaster").hidden=true;openFleet();};

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
  try{if(navigator.onLine){await STORE.saveSheetFile(filename,blob,(sheetBooking&&sheetBooking.start||todayISO()).slice(0,4));where="Copia salvata in Dropbox › Fogli di servizio.";}else where="Sei offline: il file è solo su questo dispositivo.";}
  catch(_){where="Non sono riuscito a salvarlo in Dropbox.";}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
  return where;
}
async function shareSheet(){
  if(!sheetBooking)return;
  try{
    const blob=await tplPDF(sheetBooking,$("sheetFull").checked);
    const file=new File([blob],sheetFileName(sheetBooking)+(sheetBooking.provisional?"_PROVVISORIO":"")+".pdf",{type:"application/pdf"});
    await navigator.share({files:[file],title:"Foglio di servizio n. "+(sheetBooking.foglio||"")});
    sheetsOut[sheetBooking.id]=String(sheetBooking.foglio);
    ACC.log("foglio","Inviato il foglio di servizio n. "+(sheetBooking.foglio||"")+" «"+(sheetBooking.client||"")+"»",{id:sheetBooking.id});
    $("sheetMsg").textContent="Inviato.";
  }catch(e){if(e&&e.name!=="AbortError")$("sheetMsg").textContent="Invio non riuscito: scarica il PDF e allegalo.";}
}
(function(){try{const f=new File([new Blob(["x"])],"a.pdf",{type:"application/pdf"});if(navigator.canShare&&navigator.canShare({files:[f]}))$("sheetShare").hidden=false;}catch(_){}})();
$("sheetShare").onclick=shareSheet;

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
  try{await DBX.finishLogin();}
  catch(e){showGate("link",{msg:e&&e.code==="denied"?"Collegamento a Dropbox annullato.":"Collegamento a Dropbox non riuscito. Riprova."});return;}
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
