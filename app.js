
(function(){
"use strict";
// ---------- flotta predefinita ----------
function mk(id,name,seats,kind,h){return {id:id,name:name,seats:seats,kind:kind,plate:"",h:!!h};}
const DEFAULT_FLEET=[
  mk("auto","Auto",null,"auto"),
  mk("van7-1","Van 7 posti · 1",7,"van"), mk("van7-2","Van 7 posti · 2",7,"van"),
  mk("b19","Bus 19 posti",19,"bus"),
  mk("b20-1","Bus 20 posti · 1",20,"bus"), mk("b20-2","Bus 20 posti · 2",20,"bus"), mk("b20-3","Bus 20 posti · 3",20,"bus"),
  mk("b28-1","Bus 28 posti · 1",28,"bus"), mk("b28-2","Bus 28 posti · 2",28,"bus"),
  mk("b42-1","Bus 42 posti · 1",42,"bus"), mk("b42-2","Bus 42 posti · 2",42,"bus"),
  mk("b50","Bus 50 posti",50,"bus"),
  mk("b52-1","Bus 52 posti · 1",52,"bus"), mk("b52-2","Bus 52 posti · 2",52,"bus"), mk("b52-3","Bus 52 posti · 3",52,"bus"), mk("b52-4","Bus 52 posti · 4",52,"bus"),
  mk("b52h","Bus 52 posti H",52,"bus",true),
  mk("b54-1","Bus 54 posti · 1",54,"bus"), mk("b54-2","Bus 54 posti · 2",54,"bus"), mk("b54-3","Bus 54 posti · 3",54,"bus"),
  mk("b58-1","Bus 58 posti · 1",58,"bus"), mk("b58-2","Bus 58 posti · 2",58,"bus"),
  mk("b64","Bus 64 posti",64,"bus"),
  mk("b79","Bus 79 posti",79,"bus"),
  mk("b81-1","Bus 81 posti · 1",81,"bus"), mk("b81-2","Bus 81 posti · 2",81,"bus")
];
const TYPES={gitalt:"Gita La Terra",tourlt:"Tour La Terra",evento:"Evento La Terra",gitasc:"Gita Scuole",toursc:"Tour Scuole",gita:"Gita",tour:"Tour",transfer:"Transfer",navetta:"Navetta",transvil:"Transfer Villaggi",escvil:"Escursione Villaggi",immigrati:"Immigrati"};
// valori della colonna B "Tipo Servizio" del fatturato
const TYPE_XL={gitalt:"gita la terra",tourlt:"tour la terra",evento:"evento la terra",gitasc:"gita scuole",toursc:"tour scuole",gita:"gita",tour:"tour",transfer:"transfer",navetta:"navetta",transvil:"transfer villaggi",escvil:"escursione villaggi",immigrati:"immigrati"};
const STAT_LABELS={gitalt:"Gite LT",tourlt:"Tour LT",evento:"Eventi LT",gitasc:"Gite scuole",toursc:"Tour scuole",gita:"Gite",tour:"Tour",transfer:"Transfer",navetta:"Navette",transvil:"Transf. villaggi",escvil:"Escurs. villaggi",immigrati:"Immigrati"};
const MONTH_LAB={transfer:"T",gita:"G",gitalt:"GL",evento:"E",tour:"TR",tourlt:"TL",gitasc:"GS",toursc:"TS",navetta:"N",transvil:"TV",escvil:"EV",immigrati:"I"};
const isMulti=t=>t==="tour"||t==="tourlt"||t==="toursc";
const onlyDeparture=t=>t==="transfer"||t==="transvil";
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

// ---------- stato ----------
// flotta in ordine decrescente di posti (l'auto in fondo)
function sortFleet(list){return list.map((v,i)=>[v,i]).sort((a,b)=>((b[0].seats||0)-(a[0].seats||0))||(a[1]-b[1])).map(x=>x[0]);}
const S={fleet:sortFleet(DEFAULT_FLEET),fleetStored:false,days:{},sel:todayISO(),view:"day",readOnly:false,clients:[],regole:{autisti:[],targhe:{},numeri:{}},allDays:null};
let db=null, unsubDays=null, subMonth=null;
const $=id=>document.getElementById(id);

function bookingsAll(){
  const out=[];
  for(const date in S.days){const bk=(S.days[date]||{}).bookings||{};for(const id in bk){const b=bk[id];if(b&&typeof b==="object")out.push(Object.assign({},b,{id:id,start:b.start||date}));}}
  return out;
}
function endOf(b){return (isMulti(b.type)&&b.end&&b.end>=b.start)?b.end:b.start;}
function on(date,vid,list){return (list||bookingsAll()).filter(b=>b.vehicle===vid&&b.start<=date&&endOf(b)>=date).sort((a,b)=>(a.time||"99").localeCompare(b.time||"99"));}
function vehicle(id){return S.fleet.find(v=>v.id===id);}

// ---------- rendering ----------
// colore della barra per mese (gen → dic)
const MONTH_COLORS=["#0F2F4F","#3D2352","#1E4A2E","#4A5215","#6A1F45","#0D4F57","#7A2E0C","#6B4E05","#521A22","#37414F","#3E2C20","#2B2F6B"];
function applyMonthColor(){
  const m=+S.sel.slice(5,7)-1,r=document.documentElement.style;
  r.setProperty("--sign-bg",MONTH_COLORS[m]);
  r.setProperty("--sign-dim","rgba(255,205,110,.78)");
}
function renderAll(){applyMonthColor();renderMonthBar();renderStrip();if(S.view==="day")renderDay();else if(S.view==="week")renderWeek();else if(S.view==="bill")renderBill();else renderMonth();}
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
    const w=wday(ds),busy=new Set(all.filter(b=>b.start<=ds&&endOf(b)>=ds).map(b=>b.vehicle)).size;
    h+='<th class="'+(w===0?"sun ":"")+(ds===t?"today ":"")+(ds===S.sel?"sel":"")+'" data-goday="'+ds+'" title="Apri la giornata"><span class="wdn">'+WDL[w]+'</span><span class="dnum">'+parse(ds).getUTCDate()+" "+MN[parse(ds).getUTCMonth()].slice(0,3)+'</span><span class="occ">'+busy+"/"+S.fleet.length+' impegnati</span></th>';
  }
  h+='</tr></thead><tbody>';
  for(const v of S.fleet){
    h+='<tr><th class="vc"><b>'+esc(v.name)+(v.h?'<span class="badge-h" title="Accessibile">H</span>':"")+'</b><span>'+(v.seats?v.seats+" posti":"Auto")+(v.plate?" · "+esc(v.plate):"")+'</span></th>';
    for(const ds of days){
      const list=on(ds,v.id,all);
      let inner="";
      for(const b of list){
        let tp=TYPES[b.type]||"",tm=b.time||"";
        if(isMulti(b.type)){const tot=diff(b.start,endOf(b))+1,i=diff(b.start,ds)+1;tp+=" "+i+"/"+tot;if(i>1)tm=i===tot&&b.time2?b.time2:"";}
        inner+='<button class="wb '+esc(b.type)+(b.status==="opzione"?" opzione":"")+'" data-edit="'+esc(b.id)+'" data-start="'+esc(b.start)+'" title="'+esc((b.foglio?"n. "+b.foglio+" · ":"")+(b.client||"")+(b.event?" – "+b.event:"")+(b.route?" – "+b.route:"")+(b.driver?" · Autista: "+b.driver:"")+(b.escort?" · Accompagnatore: "+b.escort:""))+'">'+
          '<span class="l1">'+(tm?'<span class="tm">'+esc(tm)+'</span>':"")+'<span class="tp">'+tp+'</span></span>'+
          '<span class="cl">'+esc(b.client||"Senza cliente")+'</span>'+(b.type==="evento"&&b.event?'<span class="ev">'+esc(b.event)+'</span>':"")+(b.route?'<span class="rt">'+esc(b.route)+'</span>':"")+'</button>';
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
function renderStrip(){
  const k=mkey(S.sel),n=dim(k),all=bookingsAll(),t=todayISO();let h="";
  const wkA=S.view==="week"?weekStart(S.sel):"",wkZ=wkA?addDays(wkA,6):"";
  for(let d=1;d<=n;d++){
    const ds=k+"-"+pad(d),w=wday(ds);
    const inwk=wkA&&ds>=wkA&&ds<=wkZ;
    const busy=new Set(all.filter(b=>b.start<=ds&&endOf(b)>=ds).map(b=>b.vehicle)).size;
    const pct=Math.round(busy/Math.max(1,S.fleet.length)*100);
    h+='<button class="dbtn'+(w===0?" sun":"")+(ds===t?" today":"")+(inwk?" inweek":"")+'" data-day="'+ds+'"'+(ds===S.sel?' aria-current="date"':"")+' title="'+busy+' mezzi impegnati"><span class="wd">'+WD[w]+'</span><span class="dn">'+d+'</span><span class="load"><b style="width:'+pct+'%"></b></span></button>';
  }
  $("strip").innerHTML=h;
  const cur=$("strip").querySelector('[aria-current="date"]');
  if(cur){const w=$("strip").parentElement;const l=cur.offsetLeft-w.clientWidth/2+cur.clientWidth/2;w.scrollLeft=Math.max(0,l);}
}

function bookingHTML(b,date){
  const v=vehicle(b.vehicle);
  let when=esc(b.time||"—");
  let tp=TYPES[b.type]||"Servizio";
  if(isMulti(b.type)){const tot=diff(b.start,endOf(b))+1,i=diff(b.start,date)+1;tp+=" · giorno "+i+" di "+tot;
    if(i>1)when=i===tot&&b.time2?"rientro":"in tour";}
  const det=[];
  if(b.foglio)det.push('<span class="fg">n. '+esc(b.foglio)+'</span>');
  if(isMulti(b.type))det.push(short(b.start)+" → "+short(endOf(b)));
  if(b.time2&&!onlyDeparture(b.type))det.push("Rientro "+esc(b.time2));
  if(b.pax!==""&&b.pax!=null){const over=v&&v.seats&&/^\d+$/.test(String(b.pax))&&+b.pax>v.seats;det.push('<span class="'+(over?"over":"")+'">'+esc(b.pax)+(v&&v.seats?"/"+v.seats:"")+" pax"+(over?" · oltre capienza":"")+"</span>");}
  if(b.driver)det.push("Autista: "+esc(b.driver)+(b.driver2?" + "+esc(b.driver2):""));
  const eu=x=>Number(x).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
  const has=x=>x!==""&&x!=null;
  if(has(b.price))det.push("Noleggio € "+eu(b.price));
  if(has(b.park))det.push("Parcheggi € "+eu(b.park));
  if(has(b.meals))det.push("Pasti € "+eu(b.meals));
  if(isMulti(b.type)&&has(b.advance))det.push("Anticipo € "+eu(b.advance));
  if(isMulti(b.type)&&b.envelope)det.push("Busta "+esc(b.envelope)+(b.envno?" n. "+esc(b.envno):""));
  if(b.type==="evento"&&b.escort)det.push("Accompagnatore: "+esc(b.escort));
  if(b.contact)det.push(esc(b.contact));
  if(b.notes)det.push(esc(b.notes));
  return '<button class="bk '+esc(b.type)+(b.status==="opzione"?" opzione":"")+'" data-edit="'+esc(b.id)+'" data-start="'+esc(b.start)+'">'+
    '<span class="when">'+when+'</span>'+
    '<span class="what"><span class="tp">'+tp+'</span>'+(b.status==="opzione"?'<span class="st">Opzione</span>':"")+
    '<span class="cl">'+esc(b.client||"Senza cliente")+'</span>'+(b.type==="evento"&&b.event?'<span class="ev">'+esc(b.event)+'</span>':"")+(b.route?'<span class="rt">'+esc(b.route)+'</span>':"")+'</span>'+
    (det.length?'<span class="det">'+det.map(x=>"<span>"+x+"</span>").join("")+'</span>':"")+
    '</button>';
}

function renderDay(){
  const date=S.sel,w=wday(date),all=bookingsAll(),d=parse(date);
  const today=all.filter(b=>b.start<=date&&endOf(b)>=date);
  const busy=new Set(today.map(b=>b.vehicle));
  const cnt=t=>today.filter(b=>b.type===t).length;
  $("sign").innerHTML=
    '<div class="date"><small>'+(date===todayISO()?"Oggi · ":"")+WDL[w]+'</small>'+d.getUTCDate()+" "+MN[d.getUTCMonth()]+" "+d.getUTCFullYear()+'</div>'+
    (w===0?'<span class="sunflag">Domenica</span>':"")+
    '<div class="stats">'+
      '<div class="stat"><b>'+busy.size+"/"+S.fleet.length+'</b><span>Mezzi impegnati</span></div>'+
      statsHTML(today)+
    '</div>'+
    '<div class="nav"><button id="dPrev" aria-label="Giorno precedente">‹</button><button id="dNext" aria-label="Giorno successivo">›</button></div>';
  $("sheet").className="sheet"+(w===0?" sun":"");
  let h="",lastG="";
  for(const v of S.fleet){
    const g=GROUPS[v.kind]||"Bus";
    if(g!==lastG){h+='<div class="group-h">'+g+'</div>';lastG=g;}
    const list=on(date,v.id,all);
    h+='<div class="row'+(list.length?" busy":"")+'">'+
      '<div class="veh"><span class="nm">'+esc(v.name)+(v.h?'<span class="badge-h" title="Accessibile">H</span>':"")+'</span>'+
      '<span class="meta">'+(v.seats?v.seats+" posti":"Auto")+(v.plate?" · "+esc(v.plate):"")+'</span></div>'+
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
      const ds=k+"-"+pad(d),w=wday(ds),list=on(ds,v.id,all);
      let inner="",tip=[];
      if(list.length){
        const b=list[0];let cls="cell "+b.type;
        if(isMulti(b.type)){const s=b.start===ds,e=endOf(b)===ds;cls+=s&&e?"":s?" first":e?" last":" mid";}
        if(list.every(x=>x.status==="opzione"))cls+=" opz";
        const lab=list.length>1?list.length:(isMulti(b.type)?(b.start===ds?MONTH_LAB[b.type]:""):(MONTH_LAB[b.type]||""));
        inner='<div class="'+cls+'">'+lab+'</div>';
        tip=list.map(x=>(TYPES[x.type]||"")+(x.time?" "+x.time:"")+" – "+(x.client||"")+(x.event?" · "+x.event:"")+(x.route?" ("+x.route+")":""));
      }
      h+='<td class="c'+(w===0?" sun":"")+(ds===S.sel?" sel":"")+'" data-day="'+ds+'" title="'+esc(ds.split("-").reverse().join("/")+(tip.length?"\n"+tip.join("\n"):" – libero"))+'">'+inner+'</td>';
    }
    h+='</tr>';
  }
  h+='</tbody><tfoot><tr><th class="vc" style="font-size:11.5px;color:var(--ink-3)">Mezzi liberi</th>';
  for(let d=1;d<=n;d++){const ds=k+"-"+pad(d);const busy=new Set(all.filter(b=>b.start<=ds&&endOf(b)>=ds).map(b=>b.vehicle)).size;h+='<td class="'+(wday(ds)===0?"sun":"")+'">'+(S.fleet.length-busy)+'</td>';}
  h+='</tr></tfoot>';
  $("mgrid").innerHTML=h;
}

// ---------- scrittura ----------
function toast(msg){const t=$("toast");t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,2600);}
function handleErr(e){
  const c=e&&e.code;
  if(c==="invalid_argument"){S.readOnly=true;showBanner("Hai accesso in sola lettura: le modifiche non vengono salvate.");renderAll();}
  else if(c==="quota_exceeded")toast("Spazio di archiviazione pieno: elimina le giornate più vecchie.");
  else toast("Salvataggio non riuscito. Riprova tra poco.");
}
function showBanner(m){const b=$("banner");b.textContent=m;b.hidden=false;}

async function writeDay(date,patch){writeDayOps(date,patch);}

// ---------- form prenotazione ----------
let editing=null; // {id,start}
function openForm(opts){
  opts=opts||{};
  const b=opts.booking||{type:"transfer",vehicle:opts.vehicle||S.fleet[0].id,start:opts.date||S.sel,end:"",time:"",time2:"",client:"",clientCode:"",route:"",event:"",escort:"",pax:"",price:"",driver:"",driver2:"",contact:"",status:"confermato",notes:""};
  editing=opts.booking?{id:b.id,start:b.start,foglio:b.foglio||""}:null;progReady=false;
  $("fTitle").textContent=editing?"Modifica prenotazione"+(b.foglio?" · n. "+b.foglio:""):"Nuova prenotazione";
  formClient=b.clientCode!==""&&b.clientCode!=null?{code:b.clientCode,name:b.client||""}:null;
  $("f-price").value=b.price==null?"":b.price;$("f-driver2").value=b.driver2||"";
  $("f-park").value=b.park==null?"":b.park;$("f-meals").value=b.meals==null?"":b.meals;$("f-advance").value=b.advance==null?"":b.advance;$("f-envelope").value=b.envelope||"";$("f-envno").value=b.envno||"";
  $("cSug").hidden=true;
  $("f-vehicle").innerHTML=S.fleet.map(v=>'<option value="'+v.id+'">'+esc(v.name)+(v.plate?" – "+esc(v.plate):"")+'</option>').join("");
  $("t-"+(TYPES[b.type]?b.type:"transfer")).checked=true;
  $("f-vehicle").value=b.vehicle;$("f-start").value=b.start;$("f-end").value=b.end||"";
  $("f-time").value=b.time||"";$("f-time2").value=b.time2||"";$("f-client").value=b.client||"";$("f-route").value=b.route||"";
  $("f-pax").value=b.pax==null?"":b.pax;$("f-event").value=b.event||"";$("f-escort").value=b.escort||"";$("f-driver").value=b.driver||"";$("f-contact").value=b.contact||"";
  $("f-status").value=b.status||"confermato";$("f-notes").value=b.notes||"";
  renderClientInfo();
  $("f-saldo").value=b.saldo||"NO";$("f-npark").value=b.npark||"";$("f-ndriver").value=b.ndriver||"";$("f-n3h").value=b.n3h||"";$("f-nextra").value=b.nextra||"";
  ["refs","hotels","guides"].forEach(k=>renderRep(k,b[k]||[]));
  progCache=Array.isArray(b.program)?b.program.slice():[];renderProgram();
  $("fDelete").hidden=!editing;$("fConfirm").hidden=true;
  [...$("fBooking").elements].forEach(el=>{if(el.id!=="fCancel")el.disabled=S.readOnly;});
  syncType();checkWarns();
  $("ovBooking").hidden=false;setTimeout(()=>$("f-client").focus(),30);
}
function eur(id){const v=$(id).value;return v===""?"":Math.round(Number(v)*100)/100;}
function curType(){const r=document.querySelector('input[name="type"]:checked');return r?r.value:"transfer";}
function syncType(){$("w-tourcash").hidden=!isMulti(curType());if(progReady)renderProgram();const tour=isMulti(curType()),ev=curType()==="evento";$("w-event").hidden=!ev;$("w-escort").hidden=!ev;$("w-time2").hidden=onlyDeparture(curType());$("w-end").hidden=!tour;$("l-start").textContent=tour?"Data partenza":"Data";$("f-end").required=tour;}
function readForm(){
  const type=curType(),start=$("f-start").value;
  return {type:type,vehicle:$("f-vehicle").value,start:start,end:isMulti(type)?($("f-end").value||start):"",
    time:$("f-time").value,time2:onlyDeparture(type)?"":$("f-time2").value,client:$("f-client").value.trim(),clientCode:formClient&&formClient.name===$("f-client").value.trim()?formClient.code:"",route:$("f-route").value.trim(),
    event:type==="evento"?$("f-event").value.trim():"",escort:type==="evento"?$("f-escort").value.trim():"",
    pax:$("f-pax").value.trim(),price:eur("f-price"),park:eur("f-park"),meals:eur("f-meals"),advance:isMulti(type)?eur("f-advance"):"",envelope:isMulti(type)?$("f-envelope").value:"",envno:isMulti(type)?$("f-envno").value.trim():"",driver:$("f-driver").value.trim(),driver2:$("f-driver2").value.trim(),contact:$("f-contact").value.trim(),
    status:$("f-status").value,notes:$("f-notes").value.trim(),
    saldo:$("f-saldo").value,npark:$("f-npark").value.trim(),ndriver:$("f-ndriver").value.trim(),n3h:$("f-n3h").value.trim(),nextra:$("f-nextra").value.trim(),
    refs:readRep("refs"),hotels:readRep("hotels"),guides:readRep("guides"),program:readProgram(),
    updatedAt:new Date().toISOString()};
}
function checkWarns(){
  const b=readForm(),w=[],v=vehicle(b.vehicle);
  if(isMulti(b.type)&&b.end&&b.end<b.start)w.push("La data di rientro è prima della partenza.");
  if(isMulti(b.type)&&b.end&&diff(b.start,b.end)>30)w.push("Un tour può durare al massimo 31 giorni.");
  if(v&&v.seats&&b.pax!==""&&/^\d+$/.test(String(b.pax))&&+b.pax>v.seats)w.push("Passeggeri ("+b.pax+") oltre la capienza del mezzo ("+v.seats+" posti).");
  if(b.start){
    const e=endOf(b),others=bookingsAll().filter(x=>x.vehicle===b.vehicle&&(!editing||x.id!==editing.id)&&x.start<=e&&endOf(x)>=b.start);
    const long=others.filter(x=>!onlyDeparture(x.type)||!onlyDeparture(b.type));
    if(long.length)w.push("Mezzo già impegnato: "+long.map(x=>(TYPES[x.type]||"")+" "+(x.client||"")+" ("+short(x.start)+(endOf(x)!==x.start?"–"+short(endOf(x)):"")+(x.time?" ore "+x.time:"")+")").join("; "));
    else if(others.length)w.push("Sullo stesso mezzo ci sono già "+others.length+" transfer in questa data: verifica gli orari.");
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
const REP_PH={refs:["Nome referente (es. Sonia, escursione)","Telefono"],hotels:["Hotel e indirizzo","Telefono"],guides:["Nome guida","Telefono"]};
function renderRep(k,list){
  $("rep-"+k).innerHTML=list.map((x,i)=>repRow(k,i,x)).join("");
}
function repRow(k,i,x){x=x||{};return '<div class="rep-row"><input data-rk="'+k+'" data-rf="name" value="'+esc(x.name||"")+'" placeholder="'+REP_PH[k][0]+'" aria-label="'+REP_PH[k][0]+'"><input data-rk="'+k+'" data-rf="tel" value="'+esc(x.tel||"")+'" placeholder="Telefono" inputmode="tel" aria-label="Telefono"><button type="button" data-rdel title="Rimuovi" aria-label="Rimuovi">×</button></div>';}
function readRep(k){return [...$("rep-"+k).querySelectorAll(".rep-row")].map(r=>({name:r.querySelector('[data-rf="name"]').value.trim(),tel:r.querySelector('[data-rf="tel"]').value.trim()})).filter(x=>x.name||x.tel);}
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
function readProgram(){return [...$("progWrap").querySelectorAll("textarea")].map(t=>t.value.replace(/\s+$/,""));}
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
$("f-start").addEventListener("change",()=>{if(isMulti(curType()))renderProgram();});
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
  box.innerHTML=sugList.length?sugList.map((c,i)=>'<button type="button" role="option" data-ci="'+i+'" aria-selected="'+(i===sugIdx)+'"><b>'+esc(c[1])+'</b><span>Cod. '+esc(c[0])+(c[2]?' · '+esc(c[2]):'')+(c[3]?' · '+esc(c[3]):'')+'</span></button>').join(""):'<div class="none">'+(S.clients.length?'Nessun cliente trovato: resterà senza codice.':'Elenco clienti non ancora caricato.')+'</div>';
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
$("cSug").addEventListener("mousedown",e=>{const b=e.target.closest("[data-ci]");if(b){e.preventDefault();pickClient(sugList[+b.dataset.ci]);}});

$("fBooking").addEventListener("input",e=>{if(e.target.name==="type")syncType();checkWarns();});
$("fBooking").addEventListener("change",checkWarns);
$("fBooking").addEventListener("submit",async e=>{
  e.preventDefault();if(S.readOnly)return;
  const b=readForm();
  if(!b.start){toast("Inserisci la data.");return;}
  if(isMulti(b.type)&&(b.end<b.start||diff(b.start,b.end)>30)){toast("Controlla le date del tour.");return;}
  const id=editing?editing.id:("b"+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
  const old=editing&&editing.start;
  $("fSave").disabled=true;
  try{
    // n. foglio: AAMMGG + progressivo del giorno del servizio; resta fisso finché il servizio non cambia giorno
    let foglio=editing?editing.foglio:"",seqPatch={};
    if(!foglio||(old&&old!==b.start)){const n=await nextSeq(b.start);foglio=yymmdd(b.start)+pad(n);seqPatch={assign:true};}
    b.foglio=foglio;
    if(old&&old!==b.start)await writeDay(old,{bookings:{[id]:null}});
    await writeDay(b.start,Object.assign({bookings:{[id]:b}},seqPatch));
    closeForm();S.sel=b.start;if(mkey(b.start)!==subMonth)subscribe();renderAll();toast("Prenotazione salvata");
    if(openSheetAfterSave)openSheet(Object.assign({},b,{id:id}));
  }catch(err){handleErr(err);}finally{$("fSave").disabled=false;openSheetAfterSave=false;}
});
$("fCancel").onclick=closeForm;
$("fDelete").onclick=()=>{$("fConfirm").hidden=false;$("fDelete").hidden=true;};
$("fDeleteNo").onclick=()=>{$("fConfirm").hidden=true;$("fDelete").hidden=false;};
$("fDeleteYes").onclick=async()=>{
  if(!editing)return;
  try{await writeDay(editing.start,{bookings:{[editing.id]:null}});closeForm();renderAll();toast("Prenotazione eliminata");}catch(err){handleErr(err);}
};

// ---------- flotta ----------
function openFleet(){
  const T=S.regole.targhe||{},N=S.regole.numeri||{};
  $("dlPlates").innerHTML=XCATS.map(c=>'<datalist id="pl'+c+'">'+(T[c]||[]).map(t=>'<option value="'+esc(t)+'">'+(N[t]?"n. "+esc(N[t]):"")+'</option>').join("")+'</datalist>').join("");
  $("fleetList").innerHTML=S.fleet.map((v,i)=>{const xc=xcatOf(v);return '<div class="fleet-row"><input id="fl-n-'+i+'" value="'+esc(v.name)+'" aria-label="Nome"><input id="fl-s-'+i+'" type="number" min="1" value="'+(v.seats||"")+'" aria-label="Posti"><select id="fl-x-'+i+'" aria-label="Mezzo (Excel)">'+XCATS.map(c=>'<option'+(c===xc?' selected':'')+'>'+c+'</option>').join("")+'</select><input id="fl-p-'+i+'" list="pl'+xc+'" value="'+esc(v.plate||"")+'" placeholder="Targa" aria-label="Targa" autocomplete="off"></div>';}).join("");
  $("ovFleet").hidden=false;
}
$("btnFleet").onclick=openFleet;
$("fleetList").addEventListener("change",e=>{const m=/^fl-x-(\d+)$/.exec(e.target.id);if(m)$("fl-p-"+m[1]).setAttribute("list","pl"+e.target.value);});
$("flCancel").onclick=()=>$("ovFleet").hidden=true;
$("fFleet").addEventListener("submit",async e=>{
  e.preventDefault();if(S.readOnly){$("ovFleet").hidden=true;return;}
  const fleet=S.fleet.map((v,i)=>Object.assign({},v,{name:$("fl-n-"+i).value.trim()||v.name,plate:$("fl-p-"+i).value.trim().toUpperCase(),seats:$("fl-s-"+i).value?Number($("fl-s-"+i).value):null,xcat:$("fl-x-"+i).value}));
  try{
    const changedIds=fleet.filter(v=>{const o=S.fleet.find(x=>x.id===v.id)||{};return (o.plate||"")!==(v.plate||"")||xcatOf(o)!==xcatOf(v);}).map(v=>v.id);
    await STORE.setFleet(fleet,changedIds);
    S.fleet=sortFleet(fleet);$("ovFleet").hidden=true;renderAll();toast("Flotta aggiornata");
  }catch(err){handleErr(err);}
});

// ---------- autisti extra ----------
let exTimer=null,exDate=null;
async function saveExtra(){
  clearTimeout(exTimer);exTimer=null;const date=exDate,val=$("extraText").value;
  if(!date||S.readOnly)return;
  const cur=(S.days[date]&&S.days[date].extra)||"";if(cur===val)return;
  $("extraSaved").textContent="Salvataggio…";
  try{await writeDay(date,{extra:val});$("extraSaved").textContent="Salvato";}catch(err){$("extraSaved").textContent="";handleErr(err);}
}
$("extraText").addEventListener("input",()=>{exDate=S.sel;$("extraSaved").textContent="";clearTimeout(exTimer);exTimer=setTimeout(saveExtra,800);});
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
$("strip").addEventListener("click",e=>{const b=e.target.closest("[data-day]");if(b)go(b.dataset.day);});
$("sign").addEventListener("click",e=>{if(e.target.id==="dPrev")go(addDays(S.sel,-1));if(e.target.id==="dNext")go(addDays(S.sel,1));});
$("sheet").addEventListener("click",e=>{
  const a=e.target.closest("[data-add]");if(a){openForm({vehicle:a.dataset.add,date:S.sel});return;}
  const ed=e.target.closest("[data-edit]");
  if(ed){const b=bookingsAll().find(x=>x.id===ed.dataset.edit&&x.start===ed.dataset.start);if(b)openForm({booking:b});}
});
$("mgrid").addEventListener("click",e=>{const c=e.target.closest("[data-day]");if(c){S.sel=c.dataset.day;setView("day");}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("ovBooking").hidden)closeForm();if(!$("ovFleet").hidden)$("ovFleet").hidden=true;$("ovSheet").hidden=true;}});
[$("ovBooking"),$("ovFleet")].forEach(o=>o.addEventListener("click",e=>{if(e.target===o)o.hidden=true;}));

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
  if(b.type==="evento"&&b.escort)p.push("Accompagnatore: "+b.escort);
  const cl=b.clientCode!==""&&b.clientCode!=null?clientByCode(b.clientCode):null;
  if(b.contact&&!(cl&&cl[4]===b.contact))p.push("Ref. "+b.contact);
  if(b.status==="opzione")p.push("OPZIONE");
  return p.join(" · ");
}
function billItin(b){return b.type==="evento"&&b.event?b.event+(b.route?" – "+b.route:""):(b.route||"");}
// una riga del fatturato per prenotazione
function num(x){return x===""||x==null?"":Number(x);}
function billTotal(r){return [r.P,r.Q,r.R].reduce((a,x)=>a+(x===""?0:x),0);}
function billRow(b){
  const v=vehicle(b.vehicle)||{};
  return {foglio:b.foglio,id:b.id,start:b.start,type:b.type,
    A:Number(b.foglio),B:TYPE_XL[b.type]||b.type,C:b.clientCode===""||b.clientCode==null?"":b.clientCode,
    D:b.client||"",G:xcatOf(v),H:(v.plate||"").trim(),I:b.start,J:endOf(b),
    M:billItin(b),O:billNote(b),P:num(b.price),Q:num(b.park),R:num(b.meals),AH:isMulti(b.type)?num(b.advance):"",AI:isMulti(b.type)?(b.envelope||""):"",AJ:isMulti(b.type)?(b.envno||""):"",Z:b.driver||"",AA:b.driver2||"",
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
async function renderBill(){
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
      '<td>'+esc(r.Z)+'</td><td>'+esc(r.AA)+'</td>'+
      '<td class="num r">'+money(r.P)+'</td><td class="num r">'+money(r.Q)+'</td><td class="num r">'+money(r.R)+'</td><td class="num r"><b>'+(r.P===""&&r.Q===""&&r.R===""?"":money(billTotal(r)))+'</b></td>'+
      '<td class="num">'+(r.AH!==""?"€ "+money(r.AH):"")+(r.AI?'<span class="sub">Busta '+esc(r.AI)+(r.AJ?" n. "+esc(r.AJ):"")+'</span>':"")+'</td><td><button type="button" class="mini" data-fs="1">Foglio di servizio</button></td></tr>';
  }).join("")+'</tbody><tfoot><tr><td colspan="10">'+rows.length+' servizi</td><td class="num r">'+money(sum("P"))+'</td><td class="num r">'+money(sum("Q"))+'</td><td class="num r">'+money(sum("R"))+'</td><td class="num r">'+money(tot)+'</td><td class="num">'+(sum("AH")?"€ "+money(sum("AH")):"")+'</td><td></td></tr></tfoot>';
}
$("btable").addEventListener("click",e=>{const tr=e.target.closest("[data-bid]");if(!tr)return;const b=bookingsAll().concat(S.allDays?billSourceAll():[]).find(x=>x.id===tr.dataset.bid&&x.start===tr.dataset.bstart);if(!b)return;if(e.target.closest("[data-fs]"))openSheet(b);else openForm({booking:b});});
function billSourceAll(){const out=[];for(const date in S.allDays){const bk=(S.allDays[date]||{}).bookings||{};for(const id in bk){const b=bk[id];if(b&&typeof b==="object")out.push(Object.assign({},b,{id:id,start:b.start||date}));}}return out;}
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
    ta.remove();billMsg(ok?rows.length+" righe copiate. In Excel clicca la cella A della prima riga vuota e incolla.":"Copia non consentita in questa vista: usa \"Aggiorna il mio file\".",ok?"ok":"err");
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
// ---------- foglio di servizio ----------
const COMPANY=["La Terra s.r.l. - Via Archimede 285C - 97100 - Ragusa - tel. 0932/626240 - Aut. Reg. Sicilia","www.laterra.it - info@laterra.it - laterrasrl@pec.it - univoco M5UXCR1 - p. iva 00826460883"];
const SH_W=[11.4,12.4,6,12.1,7.4,10.3,9.1,13.3]; // larghezze colonne come nel modello Excel (A–H)
function shClient(b){return b.clientCode!==""&&b.clientCode!=null?clientByCode(b.clientCode):null;}
// Descrizione unica del foglio: righe di 8 colonne, usata per anteprima, PDF ed Excel.
// cella: {t:testo, span, k:"l" etichetta | "v" valore | "h" intestazione, b:grassetto, al:"c"|"r"}
function sheetSpec(b,full){
  const v=vehicle(b.vehicle)||{},cl=shClient(b),plate=(v.plate||"").trim(),num=(S.regole.numeri||{})[plate]||"";
  const nd=diff(b.start,endOf(b))+1,rows=[];
  const L=(t,span)=>({t,span:span||1,k:"l"}),V=(t,span,o)=>Object.assign({t:t==null?"":String(t),span:span||1,k:"v"},o||{});
  const row=cells=>rows.push({cells}),gap=()=>rows.push({gap:1});
  const drivers=[b.driver,b.driver2].filter(Boolean).join(" + ");
  const refName=cl&&cl[6]?cl[6]:"",refTel=cl&&cl[7]?cl[7]:"";
  rows.push({company:1});
  row([V("ESTREMI DEL CONTRATTO CON IL CLIENTE E FOGLIO DI SERVIZIO NUMERO",7,{k:"h"}),V(b.foglio||"",1,{k:"h",b:1,al:"r"})]);
  gap();
  row([L("Passeggeri"),V(b.pax,1,{al:"c"}),L("Bus"),V(xcatOf(v)),L("Numero"),V(num,1,{al:"c"}),L("Targa"),V(plate)]);
  row([L("Inizio"),V(itDate(b.start)),L("Fine"),V(itDate(endOf(b))),L("Giorni"),V(nd,1,{al:"c"}),L("Autista"),V(drivers)]);
  row([L("Cliente"),V(cl?cl[1]:(b.client||""),5,{b:1}),L("Telefono"),V(cl&&cl[4]?cl[4]:"")]);
  row([L("Referente 1°"),V(refName||(b.contact&&!(cl&&cl[4]===b.contact)?b.contact:""),5),L("Telefono"),V(refTel)]);
  (b.refs||[]).forEach(x=>row([L("Referente 2°"),V(x.name,5),L("Telefono"),V(x.tel)]));
  (b.hotels||[]).forEach((x,i)=>row([L((i+1)+"° Hotel"),V(x.name,5),L("Telefono"),V(x.tel)]));
  (b.guides||[]).forEach(x=>row([L("Guida"),V(x.name,5),L("Telefono"),V(x.tel)]));
  if(b.type==="evento"&&(b.event||b.escort)){row([L("Evento"),V(b.event||"",5),L("Accomp."),V(b.escort||"")]);}
  gap();
  const prog=Array.isArray(b.program)?b.program:[];
  if(isMulti(b.type)){
    for(let i=0;i<nd;i++){
      const d=addDays(b.start,i);
      row([V((i+1)+"° giorno - "+(+d.slice(8,10))+"/"+d.slice(5,7)+" - "+WDL[wday(d)].replace(/^./,c=>c.toUpperCase()),8,{b:1,al:"c",k:"d"})]);
      const lines=String(prog[i]||"").split("\n").map(x=>x.trim()).filter(Boolean);
      (lines.length?lines:[i===0&&b.time?"Ore "+b.time+(b.route?" "+b.route:""):""]).forEach(t=>row([V(t,8)]));
    }
  }else{
    let lines=prog.join("\n").split("\n").map(x=>x.trim()).filter(Boolean);
    if(!lines.length)lines=[(b.time?"Ore "+b.time+" ":"")+(b.route||"")].filter(x=>x.trim());
    lines.forEach((t,i)=>row([V((i+1)+") "+t,8)]));
    for(let i=lines.length;i<5;i++)row([V("",8)]);
  }
  gap();
  row([L("Saldo da ricevere",2),V(b.saldo||"NO",2,{al:"c",b:1}),L("Acconto La Terra",3),V(isMulti(b.type)&&b.advance!==""&&b.advance!=null?"€ "+money(b.advance):"",1,{al:"r"})]);
  row([L("Note park"),V(b.npark||"",7)]);
  row([L("Note autista"),V(b.ndriver||"",7)]);
  row([L("Note 3 ore"),V(b.n3h||"",7)]);
  row([L("Note extra"),V(b.nextra||"",7)]);
  gap();
  rows.push({cells:[L("Autista firma",4),L("Azienda firma",4)],sign:1});
  if(!full)return rows;
  rows.push({cut:1});
  const P=num0(b.price),Q=num0(b.park),Rr=num0(b.meals);
  row([L("Servizio"),V(TYPE_XL[b.type]||""),L("Bus"),V(xcatOf(v)),L("Targa"),V(plate),L("Autista"),V(drivers)]);
  row([L("Inizio"),V(itDate(b.start)),L("Fine"),V(itDate(endOf(b))),L("Giorni"),V(nd,1,{al:"c"}),L("Ore"),V(b.time||"")]);
  row([L("Cliente"),V(cl?cl[1]:(b.client||""),5),L("Telefono"),V(cl&&cl[4]?cl[4]:"")]);
  row([L("Referente"),V(refName,5),L("Telefono"),V(refTel)]);
  row([L("Itinerario"),V(billItin(b),7)]);
  row([L("Causale"),V("",5),L("Prezzo i.c."),V(b.price!==""&&b.price!=null?"€ "+money(b.price):"",1,{al:"r"})]);
  row([L("Partita Iva"),V(cl&&cl[5]?cl[5]:""),L("Multi"),V(cl?cl[0]:""),L("SDI"),V(""),L("Parcheggi"),V(b.park!==""&&b.park!=null?"€ "+money(b.park):"",1,{al:"r"})]);
  row([L("Fattura acc."),V(""),L("Del"),V(""),L("Euro"),V(""),L("Pasti"),V(b.meals!==""&&b.meals!=null?"€ "+money(b.meals):"",1,{al:"r"})]);
  row([L("Fattura sald"),V(""),L("Del"),V(""),L("Euro"),V(""),L("Varie"),V("")]);
  row([L("Note A"),V(b.notes||"",5),L("Totale"),V(P+Q+Rr?"€ "+money(P+Q+Rr):"",1,{al:"r",b:1})]);
  row([L("Note B"),V(billNote(b),5),L("Contratto"),V(b.foglio||"",1,{al:"r"})]);
  return rows;
}
function num0(x){return x===""||x==null?0:Number(x)||0;}

// --- anteprima HTML ---
function sheetHTML(rows){
  let h='<table class="fs"><colgroup>'+SH_W.map(w=>'<col style="width:'+(w/82*100).toFixed(2)+'%">').join("")+'</colgroup><tbody>';
  for(const r of rows){
    if(r.company){h+='<tr class="fs-co"><td colspan="6">'+COMPANY.map(esc).join("<br>")+'</td><td colspan="2" class="fs-logo"><img src="logo.jpg" alt="La Terra"></td></tr>';continue;}
    if(r.gap){h+='<tr class="fs-gap"><td colspan="8"></td></tr>';continue;}
    if(r.cut){h+='<tr class="fs-cut"><td colspan="8"><span>taglia qui · copia ufficio</span></td></tr>';continue;}
    h+='<tr'+(r.sign?' class="fs-sign"':'')+'>'+r.cells.map(c=>'<td colspan="'+c.span+'" class="fs-'+c.k+(c.b?" fs-b":"")+(c.al?" fs-"+c.al:"")+'">'+esc(c.t)+'</td>').join("")+'</tr>';
  }
  return h+'</tbody></table>';
}

// --- PDF (pdf-lib) ---
let _pdflib=null;
function loadPdfLib(){
  if(window.PDFLib)return Promise.resolve(window.PDFLib);
  if(_pdflib)return _pdflib;
  _pdflib=new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";sc.onload=()=>res(window.PDFLib);sc.onerror=()=>{_pdflib=null;rej(new Error("pdflib"));};document.head.appendChild(sc);});
  return _pdflib;
}
let _logoBytes=null;
async function logoBytes(){
  if(_logoBytes)return _logoBytes;
  try{const r=await fetch("logo.jpg");if(r.ok)_logoBytes=new Uint8Array(await r.arrayBuffer());}catch(_){}
  return _logoBytes;
}
const pdfTxt=t=>String(t==null?"":t).replace(/→/g,">").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\t/g," ").replace(/[^\x20-\x7E -ÿ€–—…•]/g,"");
function wrapText(text,font,size,maxW){
  const out=[];
  for(const para of pdfTxt(text).split("\n")){
    let line="";
    for(const word of para.split(/\s+/).filter(Boolean)){
      let w=word;
      while(font.widthOfTextAtSize(w,size)>maxW&&w.length>1){ // parola troppo lunga
        let k=w.length;while(k>1&&font.widthOfTextAtSize(w.slice(0,k),size)>maxW)k--;
        if(line){out.push(line);line="";}
        out.push(w.slice(0,k));w=w.slice(k);
      }
      const t=line?line+" "+w:w;
      if(font.widthOfTextAtSize(t,size)<=maxW)line=t;else{out.push(line);line=w;}
    }
    out.push(line);
  }
  return out.length?out:[""];
}
async function sheetPDF(rows){
  const {PDFDocument,StandardFonts,rgb}=await loadPdfLib();
  const pdf=await PDFDocument.create();
  pdf.setTitle("Foglio di servizio");pdf.setAuthor("La Terra s.r.l.");
  const PW=595.28,PH=841.89,mm=2.83465,M=12*mm,W=PW-2*M;
  const X=[M];SH_W.forEach(w=>X.push(X[X.length-1]+w/82*W));
  const reg=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const FILL=rgb(240/255,246/255,250/255),LINE=rgb(120/255,128/255,136/255),INK=rgb(.1,.12,.14),LAB=rgb(.3,.33,.36);
  let page=pdf.addPage([PW,PH]),y=M;
  let logo=null;const lb=await logoBytes();if(lb){try{logo=await pdf.embedJpg(lb);}catch(_){logo=null;}}
  for(const r of rows){
    if(r.company){
      page.drawText(pdfTxt(COMPANY[0]),{x:M,y:PH-y-9,size:8,font:reg,color:INK});
      page.drawText(pdfTxt(COMPANY[1]),{x:M,y:PH-y-19,size:8,font:reg,color:INK});
      if(logo){const lw=44*mm,lh=lw*logo.height/logo.width;page.drawImage(logo,{x:M+W-lw,y:PH-y-lh-1,width:lw,height:lh});}
      y+=32;continue;
    }
    if(r.gap){y+=8;continue;}
    if(r.cut){
      y+=12;page.drawLine({start:{x:M,y:PH-y},end:{x:M+W,y:PH-y},thickness:.8,color:LINE,dashArray:[4,3]});
      const t="taglia qui - copia ufficio",tw=reg.widthOfTextAtSize(t,7);page.drawText(t,{x:M+W/2-tw/2,y:PH-y+3,size:7,font:reg,color:LINE});
      y+=14;continue;
    }
    const size=r.cells.some(c=>c.k==="h")?10.5:9.5,lh=size*1.22;
    let ci=0;
    const laid=r.cells.map(c=>{const x0=X[ci],w=X[ci+c.span]-x0;ci+=c.span;const f=c.b||c.k==="d"||c.k==="h"&&c.b?bold:reg;return {c,x0,w,f,lines:wrapText(c.t,f,size,w-6)};});
    const h=r.sign?56:Math.max(18,Math.max(...laid.map(l=>l.lines.length))*lh+6);
    if(y+h>PH-M){
      page=pdf.addPage([PW,PH]);y=M;
      const fg=(rows.find(x=>x.cells&&x.cells.some(c=>c.k==="h"))||{cells:[{},{}]}).cells[1].t||"";
      page.drawText(pdfTxt("Foglio di servizio n. "+fg+" - segue (pagina "+pdf.getPageCount()+")"),{x:M,y:PH-y-9,size:9,font:bold,color:INK});
      y+=18;
    }
    for(const l of laid){
      const val=l.c.k==="v"||l.c.k==="d";
      page.drawRectangle({x:l.x0,y:PH-y-h,width:l.w,height:h,color:val?FILL:undefined,borderColor:LINE,borderWidth:.6});
      l.lines.forEach((ln,i)=>{
        const tw=l.f.widthOfTextAtSize(ln,size);
        const tx=l.c.al==="c"?l.x0+(l.w-tw)/2:l.c.al==="r"?l.x0+l.w-3-tw:l.x0+3;
        page.drawText(ln,{x:tx,y:PH-y-3-size-(i*lh)+1,size,font:l.f,color:l.c.k==="l"?LAB:INK});
      });
    }
    y+=h;
  }
  return new Blob([await pdf.save()],{type:"application/pdf"});
}

// --- Excel (xlsx scritto da zero, stesso impaginato del modello) ---
async function sheetXLSX(rows){
  const JSZip=await loadJSZip(),zip=new JSZip();
  // stili: 0 normale, 1 etichetta con bordo, 2 valore con bordo e fondo, 3 valore grassetto, 4 intestazione, 5 azienda, 6 giorno tour, 7 centrato, 8 destra, 9 taglio
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<fonts count="4"><font><sz val="12"/><name val="Calibri"/></font><font><b/><sz val="12"/><name val="Calibri"/></font><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="13"/><name val="Calibri"/></font></fonts>'+
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0F6FA"/><bgColor indexed="64"/></patternFill></fill></fills>'+
    '<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF78808A"/></left><right style="thin"><color rgb="FF78808A"/></right><top style="thin"><color rgb="FF78808A"/></top><bottom style="thin"><color rgb="FF78808A"/></bottom><diagonal/></border><border><left/><right/><top/><bottom style="dashed"><color rgb="FF78808A"/></bottom><diagonal/></border></borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10">'+
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>'+
    '<xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>'+
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>'+
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="center"/></xf>'+
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'+
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>'+
    '<xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="top"/></xf>'+
    '<xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment horizontal="right" vertical="top"/></xf>'+
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"><alignment horizontal="center"/></xf>'+
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  const styleOf=c=>c.k==="l"?1:c.k==="h"?4:c.k==="d"?6:c.b?3:c.al==="c"?7:c.al==="r"?8:2;
  let r=1;const xrows=[],merges=[];
  const cell=(col,rr,s,t)=>'<c r="'+XL_COLS[col]+rr+'" s="'+s+'"'+(t!==""&&t!=null?' t="inlineStr"><is><t xml:space="preserve">'+xEsc(t)+'</t></is></c>':'/>');
  for(const row of rows){
    if(row.company){xrows.push('<row r="'+r+'">'+cell(0,r,5,COMPANY[0])+'</row>');r++;xrows.push('<row r="'+r+'">'+cell(0,r,5,COMPANY[1])+'</row>');r+=2;continue;}
    if(row.gap){r++;continue;}
    if(row.cut){let c="";for(let i=0;i<8;i++)c+=cell(i,r,9,i===0?"":"");xrows.push('<row r="'+r+'" ht="10" customHeight="1">'+c+'</row>');r+=2;continue;}
    let col=0,c="",maxLines=1;
    for(const x of row.cells){
      const s=styleOf(x);c+=cell(col,r,s,x.t);
      for(let i=1;i<x.span;i++)c+=cell(col+i,r,s,"");
      if(x.span>1)merges.push(XL_COLS[col]+r+":"+XL_COLS[col+x.span-1]+r);
      if(x.k!=="l"){const wChars=SH_W.slice(col,col+x.span).reduce((a,b)=>a+b,0)*1.3;maxLines=Math.max(maxLines,Math.ceil((String(x.t).length||1)/Math.max(8,wChars)));}
      col+=x.span;
    }
    const ht=row.sign?60:maxLines>1?Math.round(maxLines*16):0;
    xrows.push('<row r="'+r+'"'+(ht?' ht="'+ht+'" customHeight="1"':'')+'>'+c+'</row>');r++;
  }
  const sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:H'+(r-1)+'"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="17"/>'+
    '<cols>'+SH_W.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols>'+
    '<sheetData>'+xrows.join("")+'</sheetData>'+(merges.length?'<mergeCells count="'+merges.length+'">'+merges.map(m=>'<mergeCell ref="'+m+'"/>').join("")+'</mergeCells>':'')+
    '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/></worksheet>';
  zip.file("[Content_Types].xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
  zip.file("_rels/.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file("xl/workbook.xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Foglio1" sheetId="1" r:id="rId1"/></sheets></workbook>');
  zip.file("xl/_rels/workbook.xml.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  zip.file("xl/styles.xml",styles);
  zip.file("xl/worksheets/sheet1.xml",sheet);
  return zip.generateAsync({type:"blob",compression:"DEFLATE"});
}

// --- nome file come nell'archivio: 26092602_cliente_x_destinazione ---
function slug(t){return norm(t).replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,40);}
function sheetFileName(b){
  const cl=shClient(b),who=slug((cl&&cl[2])||(cl&&cl[1])||b.client||"cliente");
  let parts=(b.route||"").split(/[>→,–]| - /).map(x=>x.trim()).filter(Boolean);
  if(parts.length>2){const inner=parts.slice(1);if(norm(inner[inner.length-1])===norm(parts[0]))inner.pop();parts=inner;}else if(parts.length===2)parts=parts.slice(1);
  const what=slug(b.type==="evento"&&b.event?b.event:(parts.slice(0,2).join(" ")||TYPES[b.type]||"servizio"));
  return (b.foglio||"foglio")+"_"+who+(what?"_x_"+what:"");
}

// --- finestra del foglio ---
let sheetBooking=null;
function openSheet(b){
  sheetBooking=b;
  $("sheetTitle").textContent="Foglio di servizio n. "+(b.foglio||"");
  $("sheetView").innerHTML=sheetHTML(sheetSpec(b,$("sheetFull").checked));
  $("sheetMsg").textContent="";
  $("ovSheet").hidden=false;
}
$("sheetFull").addEventListener("change",()=>{if(sheetBooking)$("sheetView").innerHTML=sheetHTML(sheetSpec(sheetBooking,$("sheetFull").checked));});
$("sheetClose").onclick=()=>{$("ovSheet").hidden=true;};
$("ovSheet").addEventListener("click",e=>{if(e.target===$("ovSheet"))$("ovSheet").hidden=true;});
async function sheetSave(kind){
  if(!sheetBooking)return;
  const full=$("sheetFull").checked,btns=[$("sheetPdf"),$("sheetXlsx")];btns.forEach(x=>x.disabled=true);
  $("sheetMsg").textContent="Preparo il file…";
  try{
    const rows=sheetSpec(sheetBooking,full);
    const blob=kind==="pdf"?await sheetPDF(rows):await sheetXLSX(rows);
    const where=await saveXlsx(blob,sheetFileName(sheetBooking)+(full&&kind==="pdf"?"_completo":"")+"."+kind);
    $("sheetMsg").textContent=(kind==="pdf"?"PDF pronto. ":"File Excel pronto. ")+where;
  }catch(err){
    const c=err&&err.code;
    $("sheetMsg").textContent=c==="declined"?"Salvataggio annullato.":c==="unavailable"||c==="not_granted"?"Il download non è disponibile in questa vista.":"Non sono riuscito a creare il file. Controlla la connessione e riprova.";
    console.error(err);
  }finally{btns.forEach(x=>x.disabled=false);}
}
$("sheetPdf").onclick=()=>sheetSave("pdf");
$("sheetXlsx").onclick=()=>sheetSave("xlsx");

// ---------- versione ----------
const APP_VERSION="1.5",APP_DATE="29/09/2026";
$("gVer").textContent="Versione "+APP_VERSION+" · "+APP_DATE;$("appVer").textContent="v"+APP_VERSION;

// ---------- dati: Dropbox ----------
function subscribe(){subMonth=mkey(S.sel);}
function refreshFromStore(){
  S.days=STORE.view();S.allDays=null;
  const fl=STORE.fleet;if(Array.isArray(fl)&&fl.length){S.fleet=sortFleet(fl);S.fleetStored=true;}
  const L=STORE.lists;
  if(L){
    if(L.clients)S.clients=L.clients;
    if(L.regole){S.regole=Object.assign({autisti:[],targhe:{},numeri:{}},L.regole);$("dlDrivers").innerHTML=(S.regole.autisti||[]).map(a=>'<option value="'+esc(a)+'">').join("");}
  }
  if(!$("app").hidden)renderAll();
}
function fmtTime(t){if(!t)return "";const d=new Date(t);const today=new Date().toDateString()===d.toDateString();return (today?"oggi":d.toLocaleDateString("it-IT",{day:"numeric",month:"short"}))+" alle "+d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}
function renderNet(st){
  st=st||STORE.status();
  const el=$("netStatus");let cls,txt;
  const pend=(st.pending||0);
  if(!navigator.onLine){cls="off";txt=pend?"Offline · "+pend+(pend===1?" modifica da inviare":" modifiche da inviare"):"Offline";}
  else if(st.error==="no_auth"){cls="off";txt="Dropbox scollegato";}
  else if(st.error==="scope"){cls="off";txt="Permessi Dropbox mancanti";}
  else if(st.error==="busy"){cls="sync";txt="Dropbox occupato, riprovo…";}
  else if(st.syncing||pend){cls="sync";txt="Sincronizzazione…";}
  else if(st.error){cls="off";txt="Dropbox non raggiungibile";}
  else{cls="on";txt="Sincronizzato";}
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
  onAccessChanged:()=>{if(!$("app").hidden)showGate("code",{msg:"Il codice di accesso è stato cambiato: inserisci quello nuovo."});},
  onAuthLost:()=>showGate("link",{msg:"L'accesso a Dropbox è scaduto o è stato revocato: collegalo di nuovo."}),
  rowFor:b=>Object.assign(billRow(Object.assign({},b,{start:b.start})),{tour:isMulti(b.type)})
});
function writeDayOps(date,patch){
  const ops=[];
  if(patch.bookings)for(const k in patch.bookings)ops.push(patch.bookings[k]===null?{t:"del",id:k}:{t:"put",id:k,b:patch.bookings[k],assign:!!patch.assign});
  if("extra" in patch)ops.push({t:"extra",v:patch.extra});
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
  ["ovBooking","ovFleet","ovMenu","ovSheet"].forEach(id=>{const x=$(id);if(x)x.hidden=true;});
  ["gLink","gLoad","gFat","gCode"].forEach(id=>$(id).hidden=true);
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
      await STORE.setAccess(await makeAccess(code));unlocked();
    }else if(await checkCode(code))unlocked();
    else{$("gMsg").textContent="Codice errato.";$("gCodeIn").select();}
  }catch(_){$("gMsg").textContent="Operazione non riuscita. Controlla la connessione e riprova.";}
  finally{btn.disabled=false;}
});
function hideGate(){$("gate").hidden=true;$("app").hidden=false;renderAll();renderNet();}
let started=false;
function unlocked(){
  hideGate();refreshFromStore();
  if(!started){started=true;STORE.flush();STORE.syncFatturato();STORE.watch();}
}
async function afterSync(o){
  if(!Object.keys(STORE.fatFiles()).length&&navigator.onLine&&!sessionStorage.getItem("fat-later")){showGate("fatturato",o);return;}
  if(!STORE.access){if(!navigator.onLine){showGate("loading",{title:"Connessione necessaria",text:"Per creare il codice di accesso serve internet."});return;}showGate("code-create",o);return;}
  showGate("code",o);
}

// ---------- menu ----------
function menuPane(name){
  ["mMain","mCode","mUnlink"].forEach(id=>{$(id).hidden=id!==name;});
  $("menuMsg").textContent="";
  document.querySelector("#menuFoot .back").hidden=name==="mMain";
  $("codeGo").hidden=name!=="mCode";$("unlinkGo").hidden=name!=="mUnlink";
}
$("btnMenu").onclick=()=>{
  const s=STORE.settings||{};
  const ff=STORE.fatFiles(),fy=Object.keys(ff).sort();
  $("menuInfo").innerHTML="Versione <b>"+APP_VERSION+"</b> del "+APP_DATE+". Dati nella cartella Dropbox <b>"+esc(STORE.BASE)+"</b>. Fatturato: "+(fy.length?fy.map(y=>(y==="*"?"":y+" → ")+"<b>"+esc(ff[y].name)+"</b>").join(", "):"<b>non collegato</b>")+".";
  menuPane("mMain");$("ovMenu").hidden=false;
};
$("mClose").onclick=()=>{$("ovMenu").hidden=true;};
document.querySelectorAll("[data-pane]").forEach(b=>{b.onclick=()=>menuPane(b.dataset.pane);});
$("mLock").onclick=()=>showGate("code");
$("mFat").onclick=()=>{if(!navigator.onLine){$("menuMsg").textContent="Serve la connessione a internet.";return;}showGate("fatturato",{fromMenu:true});};
$("mSync").onclick=async()=>{$("menuMsg").textContent="Aggiorno…";await STORE.pull();await STORE.flush();await STORE.syncFatturato();$("menuMsg").textContent=navigator.onLine?"Fatto.":"Sei offline: le modifiche partiranno appena torna la connessione.";};
$("mCode").addEventListener("submit",async e=>{
  e.preventDefault();const o=$("codeOld").value,n1=$("codeNew").value,n2=$("codeNew2").value,msg=$("menuMsg");
  if(n1.length<6){msg.textContent="Il nuovo codice deve avere almeno 6 caratteri.";return;}
  if(n1!==n2){msg.textContent="I due nuovi codici non coincidono.";return;}
  if(!navigator.onLine){msg.textContent="Per cambiare il codice serve la connessione a internet.";return;}
  if(!(await checkCode(o))){msg.textContent="Il codice attuale è errato.";return;}
  $("codeGo").disabled=true;
  try{await STORE.setAccess(await makeAccess(n1));$("mCode").reset();$("ovMenu").hidden=true;toast("Codice cambiato: vale su tutti i dispositivi");}
  catch(_){msg.textContent="Non riesco a salvare il nuovo codice. Riprova.";}
  finally{$("codeGo").disabled=false;}
});
$("unlinkGo").onclick=()=>{DBX.unlink();STORE.reset();try{localStorage.removeItem("agenda-view");}catch(_){}location.reload();};

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
    const blob=await sheetPDF(sheetSpec(sheetBooking,false));
    const file=new File([blob],sheetFileName(sheetBooking)+".pdf",{type:"application/pdf"});
    await navigator.share({files:[file],title:"Foglio di servizio n. "+(sheetBooking.foglio||"")});
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
$("gHere").onclick=async()=>{$("gHere").hidden=true;showGate("loading",{title:"Avvio…"});if(await takeWindow(true))await start();};
$("gRelink").onclick=()=>{DBX.unlink();STORE.reset();DBX.startLogin().catch(()=>{$("gMsg").textContent="Manca la chiave dell'app Dropbox in config.js.";});};

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
  if(!(await takeWindow()))return;
  await start();
}
async function start(){
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
