
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
function dayCounts(ds,all){
  const list=all.filter(b=>b.start<=ds&&endOf(b)>=ds),named=new Set();let gen=0;
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

// ---------- stato ----------
// flotta in ordine decrescente di posti (l'auto in fondo)
function sortFleet(list){return list.map((v,i)=>[v,i]).sort((a,b)=>((b[0].seats||0)-(a[0].seats||0))||(a[1]-b[1])).map(x=>x[0]);}
const S={fleet:sortFleet(DEFAULT_FLEET),fleetStored:false,days:{},sel:todayISO(),view:"day",readOnly:false,clients:[],regole:{autisti:[],targhe:{},numeri:{}},allDays:null};
let db=null, unsubDays=null, subMonth=null;
const $=id=>document.getElementById(id);

function bookingsAll(){
  const out=[];
  for(const date in S.days){const bk=(S.days[date]||{}).bookings||{};for(const id in bk){const b=bk[id];if(b&&typeof b==="object")out.push(Object.assign({},b,{id:id,start:b.start||date,type:normType(b.type)}));}}
  return out;
}
function endOf(b){return (b.end&&b.end>=b.start)?b.end:b.start;}
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
function on(date,vid,list){return (list||bookingsAll()).filter(b=>b.vehicle===vid&&b.start<=date&&endOf(b)>=date).sort((a,b)=>(a.time||"99").localeCompare(b.time||"99"));}
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
  let g='<div class="lab lg"><button type="button" class="cnt-tg lb" id="cntToggle" aria-expanded="'+cntOpen+'" title="'+(cntOpen?"Nascondi":"Mostra")+' i conteggi (autisti, servizi, pullman)"><b>G</b><small>giorno</small><i>'+(cntOpen?"▲":"▼")+'</i></button></div>';
  let ra='<div class="lab r2" title="Autisti impegnati"><span class="lb"><b>A</b><small>autisti</small></span></div>';
  let rs='<div class="lab r2" title="Servizi del giorno"><span class="lb"><b>S</b><small>servizi</small></span></div>';
  let rp='<div class="lab r2" title="Pullman (mezzi) impegnati"><span class="lb"><b>P</b><small>pullman</small></span></div>';
  for(let d=1;d<=n;d++){
    const ds=k+"-"+pad(d),w=wday(ds);
    const inwk=wkA&&ds>=wkA&&ds<=wkZ;
    const c=dayCounts(ds,all);
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
  return '<button class="bk '+esc(b.type)+(b.status==="opzione"?" opzione":"")+'" data-edit="'+esc(b.id)+'" data-start="'+esc(b.start)+'">'+
    '<span class="when">'+when+'</span>'+
    '<span class="what"><span class="tp">'+tp+'</span>'+(b.status==="opzione"?'<span class="st">Opzione</span>':"")+
    '<span class="cl">'+esc(b.client||"Senza cliente")+'</span>'+(hasEvent(b.type)&&b.event?'<span class="ev">'+esc(b.event)+'</span>':"")+(whatToday(b,date)?'<span class="rt'+(dayProgram(b,date)?" pg":"")+'">'+esc(whatToday(b,date))+'</span>':"")+'</span>'+
    (det.length?'<span class="det">'+det.map(x=>"<span>"+x+"</span>").join("")+'</span>':"")+
    '</button>';
}

function renderDay(){
  const date=S.sel,w=wday(date),all=bookingsAll(),d=parse(date);
  const today=all.filter(b=>b.start<=date&&endOf(b)>=date);
  const busy=new Set(today.map(b=>b.vehicle)),dc=dayCounts(date,all);
  $("sign").innerHTML=
    '<div class="date"><small>'+(date===todayISO()?"Oggi · ":"")+WDL[w]+'</small>'+d.getUTCDate()+" "+MN[d.getUTCMonth()]+" "+d.getUTCFullYear()+'</div>'+
    (w===0?'<span class="sunflag">Domenica</span>':"")+
    '<div class="stats">'+
      '<div class="stat"><b>'+busy.size+"/"+S.fleet.length+'</b><span>Mezzi impegnati</span></div>'+
      '<div class="stat" title="'+(dc.gen?"di cui "+dc.gen+" da assegnare":"")+'"><b>'+dc.a+'</b><span>Autisti</span></div>'+
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
  const b=opts.booking||{type:"transfer",vehicle:opts.vehicle||S.fleet[0].id,start:opts.date||S.sel,end:"",time:"",time2:"",client:"",clientCode:"",route:"",event:"",escort:"",pax:"",price:"",driver:GEN1,driver2:"",contact:"",status:"confermato",notes:""};
  editing=opts.booking?{id:b.id,start:b.start,foglio:b.foglio||""}:null;progReady=false;
  $("fTitle").textContent=editing?"Modifica prenotazione"+(b.foglio?" · n. "+b.foglio:""):"Nuova prenotazione";
  formClient=b.clientCode!==""&&b.clientCode!=null?{code:b.clientCode,name:b.client||""}:null;
  $("f-price").value=b.price==null?"":b.price;$("f-driver2").value=b.driver2||"";
  $("f-park").value=b.park==null?"":b.park;$("f-meals").value=b.meals==null?"":b.meals;$("f-advance").value=b.advance==null?"":b.advance;$("f-envelope").value=b.envelope||"";$("f-envno").value=b.envno||"";bustaAuto="";
  $("cSug").hidden=true;
  $("f-vehicle").innerHTML=S.fleet.map(v=>'<option value="'+v.id+'">'+esc(v.name)+(v.plate?" – "+esc(v.plate):"")+'</option>').join("");
  $("t-"+normType(b.type)).checked=true;
  $("f-vehicle").value=b.vehicle;$("f-start").value=b.start;$("f-end").value=(b.end&&b.end>=b.start)?b.end:b.start;$("f-end").min=b.start||"";formStart=b.start;
  $("f-time").value=b.time||"";$("f-time2").value=b.time2||"";$("f-client").value=b.client||"";$("f-route").value=b.route||"";
  $("f-pax").value=b.pax==null?"":b.pax;$("f-event").value=b.event||"";$("f-escort").value=b.escort||"";$("f-driver").value=b.driver||"";$("f-contact").value=b.contact||"";$("f-contactname").value=b.contactName||"";drvPaint("f-driver");drvPaint("f-driver2");
  $("f-status").value=b.status||"confermato";$("f-notes").value=b.notes||"";
  renderClientInfo();syncDrvQ();
  $("f-saldo").value=b.saldo||"NO";$("f-saldoamt").value=b.saldoAmt==null?"":b.saldoAmt;$("f-npark").value=b.npark||"";$("f-ndriver").value=b.ndriver||"";$("f-n3h").value=b.n3h||"";$("f-nextra").value=b.nextra||"";
  ["refs","hotels","guides"].forEach(k=>renderRep(k,b[k]||[]));
  progCache=Array.isArray(b.program)?b.program.slice():[];renderProgram();
  $("fDelete").hidden=!editing;$("fConfirm").hidden=true;
  [...$("fBooking").elements].forEach(el=>{if(el.id!=="fCancel")el.disabled=S.readOnly;});
  syncType();checkWarns();
  $("ovBooking").hidden=false;setTimeout(()=>$("f-client").focus(),30);
}
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
  const type=curType(),start=$("f-start").value;
  return {type:type,vehicle:$("f-vehicle").value,start:start,end:$("f-end").value||start,
    time:$("f-time").value,time2:onlyDeparture(type)?"":$("f-time2").value,client:$("f-client").value.trim(),clientCode:formClient&&formClient.name===$("f-client").value.trim()?formClient.code:"",route:$("f-route").value.trim(),
    event:hasEvent(type)?$("f-event").value.trim():"",escort:hasEvent(type)?$("f-escort").value.trim():"",
    pax:$("f-pax").value.trim(),price:eur("f-price"),park:eur("f-park"),meals:eur("f-meals"),advance:isMulti(type)?eur("f-advance"):"",envelope:isMulti(type)?$("f-envelope").value:"",envno:isMulti(type)?$("f-envno").value.trim():"",driver:$("f-driver").value.trim(),driver2:$("f-driver2").value.trim(),contact:$("f-contact").value.trim(),contactName:$("f-contactname").value.trim(),
    status:$("f-status").value,notes:$("f-notes").value.trim(),
    saldo:$("f-saldo").value,saldoAmt:eur("f-saldoamt"),npark:$("f-npark").value.trim(),ndriver:$("f-ndriver").value.trim(),n3h:$("f-n3h").value.trim(),nextra:$("f-nextra").value.trim(),
    refs:readRep("refs"),hotels:readRep("hotels"),guides:readRep("guides"),program:readProgram(),
    updatedAt:new Date().toISOString()};
}
function checkWarns(){
  const b=readForm(),w=[],v=vehicle(b.vehicle);
  if(b.end&&b.end<b.start)w.push("La data di rientro è prima della partenza.");
  if(b.end&&diff(b.start,b.end)>30)w.push("Un servizio può durare al massimo 31 giorni.");
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
  box.innerHTML=sugList.length?sugList.map((c,i)=>'<button type="button" role="option" data-ci="'+i+'" aria-selected="'+(i===sugIdx)+'"><b>'+esc(c[1])+'</b><span>Cod. '+esc(c[0])+(c[2]?' · '+esc(c[2]):'')+(c[3]?' · '+esc(c[3]):'')+'</span></button>').join(""):'<div class="none">'+(S.clients.length?'Nessun cliente trovato: resterà senza codice.':'Elenco clienti non ancora caricato.')+'</div>'+(S.readOnly?'':'<button type="button" class="addcli" data-addcli="1">+ Aggiungi «'+esc(q.trim())+'» all\'anagrafica clienti</button>');
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
  for(const p of STORE.pendingClients){const n=p.vals&&p.vals.A&&p.vals.A.n;if(n>m)m=n;else if(!n)m++;}
  return m+1;
}

let cliShown=150,cliOpenCode=null;
function openClients(q){
  $("ovClients").hidden=false;cliShown=150;cliOpenCode=null;
  if(q!=null)$("cliQ").value=q;
  renderClients();setTimeout(()=>$("cliQ").focus(),30);
}
function cliMark(t,words){
  let h=esc(t);if(!words.length||!t)return h;
  for(const w of words){if(w.length<2)continue;const re=new RegExp("("+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig");h=h.replace(/(<[^>]*>)|([^<]+)/g,(all,tag,txt)=>tag?tag:txt.replace(re,"<mark>$1</mark>"));}
  return h;
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
  $("cliPending").innerHTML=pend.map(p=>p.error?'<div class="err">⚠ <b>'+esc(p.name||"")+'</b> non scritto nel fatturato: '+esc(cliErrText(p.error))+' <button type="button" class="btn" data-cli-fix="'+esc(p.tmp)+'">Correggi</button><button type="button" class="btn" data-cli-drop="'+esc(p.tmp)+'">Elimina</button></div>':'<div>⏳ <b>'+esc(p.name||"")+'</b> — '+(navigator.onLine?"in scrittura nel file fatturato…":"sarà scritto nel file fatturato appena torna la connessione")+'</div>').join("");
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
        (S.readOnly?'':'<button type="button" class="btn primary" data-cli-book="'+esc(c[0])+'">Nuova prenotazione per questo cliente</button>')+'</div>';
    }
  }
  if(list.length>cliShown)h+='<button type="button" class="cli-more" data-cli-more="1">Mostra altri ('+(list.length-cliShown).toLocaleString("it-IT")+')</button>';
  $("cliList").innerHTML=h;
}
$("btnClients").onclick=()=>openClients();
$("cliClose").onclick=()=>{$("ovClients").hidden=true;};
$("ovClients").addEventListener("click",e=>{if(e.target===$("ovClients"))$("ovClients").hidden=true;});
$("cliQ").addEventListener("input",()=>{cliShown=150;cliOpenCode=null;renderClients();});
$("cliList").addEventListener("click",e=>{
  const more=e.target.closest("[data-cli-more]");if(more){cliShown+=300;renderClients();return;}
  const nw=e.target.closest("[data-cli-new]");if(nw){openClientNew({name:$("cliQ").value.trim()});return;}
  const bk=e.target.closest("[data-cli-book]");
  if(bk){const c=clientByCode(bk.dataset.cliBook);$("ovClients").hidden=true;openForm({});if(c)pickClient(c);return;}
  const r=e.target.closest("[data-cli]");if(r){cliOpenCode=String(cliOpenCode)===r.dataset.cli?null:r.dataset.cli;renderClients();}
});
$("cliNew").onclick=()=>openClientNew({name:""});
function cliErrText(e){return e.code==="codeexists"?"il codice Multi "+e.num+" nel file è già di «"+(e.by||"")+"»":e.code==="noclienti"?"nel file non c'è il foglio «clienti»":"errore di scrittura";}
$("cliPending").addEventListener("click",e=>{
  const fx=e.target.closest("[data-cli-fix]"),dr=e.target.closest("[data-cli-drop]");
  if(fx){const p=STORE.pendingClients.find(x=>x.tmp===fx.dataset.cliFix);if(p)openClientNew({prefill:p});}
  if(dr){STORE.dropClient(dr.dataset.cliDrop);renderClients();}
});

// --- nuovo cliente ---
let cnFromBooking=false,cnReplacing=null;
function openClientNew(o){
  o=o||{};cnFromBooking=!!o.fromBooking;
  if(S.readOnly){toast("Hai accesso in sola lettura.");return;}
  const files=STORE.fatFiles(),ys=Object.keys(files).filter(k=>k!=="*").sort(),y=String(new Date().getFullYear());
  const f=files[y]||files[ys[ys.length-1]]||files["*"];
  $("cnHint").innerHTML=f?'Viene aggiunto in fondo al foglio <b>clienti</b> di <b>'+esc(f.name)+'</b>, con il codice Multi che scrivi qui sotto.':'<span style="color:var(--warn)">Prima collega il file fatturato (Menu › Collega file fatturato): è lì che viene scritto il cliente.</span>';
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
    const sub=k==="code"?'<span class="sub">Proposto il primo libero: cambialo se in Multi il cliente ha un altro codice.</span>':x.c==="_SDI"?'<span class="sub">Nel foglio clienti non c\'è ancora questa colonna: la aggiunge l\'app in fondo alla tabella.</span>':'';
    return '<div class="f'+(full?" full":"")+'"><label for="'+id+'">'+esc(x.c==="A"?"Codice Multi":x.c==="_SDI"?"Codice univoco (SDI)":cliLabel(x))+(k==="name"||k==="code"?" *":"")+'</label><input id="'+id+'" data-col="'+x.c+'" data-kind="'+k+'"'+at+ph+' autocomplete="off">'+sub+'</div>';
  }).join("");
  $("cn-A").value=o.prefill?"":nextClientCode();
  if(o.prefill&&o.prefill.vals)for(const c in o.prefill.vals){const el=$("cn-"+c);const v=o.prefill.vals[c];if(el&&v)el.value=v.t!=null?v.t:v.n;}
  cnReplacing=o.prefill?o.prefill.tmp:null;
  const nameCol=cliCols().find(x=>cliKind(x.h)==="name");
  if(nameCol&&o.name)$("cn-"+nameCol.c).value=o.name;
  $("cnWarns").innerHTML="";$("cnSave").disabled=!f;
  $("ovClientNew").hidden=false;
  setTimeout(()=>{const el=nameCol&&$("cn-"+nameCol.c);if(el){el.focus();el.select();}},30);
}
function cnRead(){
  const out={};
  for(const el of $("cnFields").querySelectorAll("input")){
    let v=el.value.replace(/\s+/g," ").trim();const k=el.dataset.kind;
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
  if(!/^\d{1,7}$/.test(code)||!+code)block.push("Scrivi il codice Multi (solo numeri).");
  else{
    const used=S.clients.find(c=>String(c[0])===String(+code));
    if(used)block.push('Il codice Multi <b>'+esc(+code)+'</b> è già di <b>'+esc(used[1])+'</b>: usa un altro codice.');
    else if(STORE.pendingClients.some(p=>p.tmp!==cnReplacing&&p.vals&&p.vals.A&&p.vals.A.n===+code))block.push('Il codice Multi <b>'+esc(+code)+'</b> è già usato da un cliente in attesa di essere scritto.');
  }
  const dup=(k,val)=>val&&S.clients.find(c=>idNorm(cliField(c,k))===val||(k==="cf"&&idNorm(cliField(c,"piva"))===val));
  const dp=dup("piva",piva)||dup("cf",cf);
  if(dp)block.push('Esiste già un cliente con questa '+(dup("piva",piva)?"partita IVA":"codice fiscale")+': <b>Cod. '+esc(dp[0])+' – '+esc(dp[1])+'</b>.');
  else if(!piva&&!cf&&name){const dn=S.clients.find(c=>norm(c[1]).replace(/[^a-z0-9]+/g," ").trim()===norm(name).replace(/[^a-z0-9]+/g," ").trim());if(dn)block.push('Esiste già un cliente con questo nome: <b>Cod. '+esc(dn[0])+' – '+esc(dn[1])+'</b>. Se è un cliente diverso, inserisci la partita IVA o il codice fiscale.');}
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
$("cnCancel").onclick=()=>{$("ovClientNew").hidden=true;};
$("fClient").addEventListener("submit",e=>{
  e.preventDefault();
  const r=cnCheck();
  if(!r.name){$("cnWarns").innerHTML='<div>Scrivi la ragione sociale.</div>';return;}
  if(r.block.length)return;
  const d=cnRead(),vals={};
  for(const c in d)vals[c]=d[c].k==="code"?{n:Number(d[c].v)}:d[c].k==="cap"&&/^[1-9]\d{4}$/.test(d[c].v)?{n:Number(d[c].v)}:{t:d[c].v};
  if(cnReplacing){STORE.dropClient(cnReplacing);cnReplacing=null;}
  const tmp=STORE.addClient(vals,r.name);
  cnWaiting[tmp]={name:r.name,fromBooking:cnFromBooking};
  $("ovClientNew").hidden=true;
  if(cnFromBooking){$("f-client").value=r.name;formClient=null;renderClientInfo();}
  toast(navigator.onLine?"Scrivo «"+r.name+"» nel file fatturato…":"Sei offline: «"+r.name+"» sarà scritto nel fatturato appena torna la connessione.");
  if(!$("ovClients").hidden)renderClients();
});
const cnWaiting={};
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
  e.preventDefault();if(S.readOnly)return;
  const b=readForm();
  if(!b.start){toast("Inserisci la data.");return;}
  if(b.end<b.start||diff(b.start,b.end)>30){toast("Controlla la data di rientro.");return;}
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
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("ovClientNew").hidden){$("ovClientNew").hidden=true;return;}if(!$("ovClients").hidden){$("ovClients").hidden=true;return;}if(!$("ovBooking").hidden)closeForm();if(!$("ovFleet").hidden)$("ovFleet").hidden=true;$("ovSheet").hidden=true;}});
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
// ---------- foglio di servizio: modello "automatico_2026_neutro.xlsx" ----------
// Il file Excel del modello NON viene modificato: l'app riempie solo le caselle da compilare
// e il valore già calcolato delle formule (che restano quelle del modello).
const TPL_FILE="modelli/automatico_2026_neutro.xlsx";
const TPL_COLS=[11.42578125,12.42578125,6,12.140625,7.42578125,10.28515625,9.140625,13.28515625];
const TPL_LETTERS="ABCDEFGH";
const TPL_ROWS=[[20.0,{"A":{"t":" La Terra s.r.l. - Via Archimede 285C - 97100 - Ragusa - tel. 0932/626240 - Aut. Reg. Sicilia","z":15,"bd":"l1t1"},"B":{"z":15,"bd":"t1"},"C":{"z":15,"bd":"t1"},"D":{"z":15,"bd":"t1"},"E":{"z":15,"bd":"t1"},"F":{"z":15,"bd":"t1"},"G":{"z":15,"bd":"t1"},"H":{"z":15,"bd":"r1t1"}}],[20.0,{"A":{"t":"www.laterra.it - info@laterra.it - laterrasrl@pec.it - univoco M5UXCR1 - p. iva 00826460883","z":15,"bd":"l1b1"},"B":{"z":15,"bd":"b1"},"C":{"z":15,"bd":"b1"},"D":{"z":15,"bd":"b1"},"E":{"z":15,"bd":"b1"},"F":{"z":15,"bd":"b1"},"G":{"z":15,"bd":"b1"},"H":{"z":15,"bd":"r1b1"}}],[12.0,{}],[19,{"A":{"t":"ESTREMI DEL CONTRATTO CON IL CLIENTE E FOGLIO DI SERVIZIO NUMERO","al":"l","bd":"l1t1b1"},"B":{"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"t1b1"},"G":{"bd":"t1b1"},"H":{"bd":"l1r1t1b1"}}],[12.0,{"A":{"z":13},"B":{"z":13},"C":{"z":13},"D":{"z":13},"E":{"z":13},"F":{"z":13},"G":{"z":13},"H":{"z":13,"al":"r"}}],[19,{"A":{"t":"Passeggeri","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"t1b1"},"C":{"t":"Bus","f":"a","bd":"l1t1b1"},"D":{"fx":1,"al":"c","bd":"t1b1"},"E":{"t":"Numero","bd":"l1t1b1"},"F":{"fx":1,"al":"c","bd":"r1t1b1"},"G":{"t":"Targa","bd":"t1b1"},"H":{"fx":1,"al":"c","bd":"r1t1b1"}}],[19,{"A":{"t":"Inizio","bd":"l1t1b1"},"B":{"fx":1,"al":"l","bd":"t1b1"},"C":{"t":"Fine","bd":"l1t1b1"},"D":{"fx":1,"al":"l","bd":"r1t1b1"},"E":{"t":"Giorni","bd":"l1t1b1"},"F":{"fx":1,"al":"c","bd":"r1t1b1"},"G":{"t":"Autista","bd":"l1t1b1"},"H":{"fx":1,"al":"c","bd":"r1t1b1"}}],[19,{"A":{"t":"Cliente","bd":"l1t1b1"},"B":{"fx":1,"b":1,"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Referente 1°","bd":"l1t1b1"},"B":{"fx":1,"al":"l","bd":"t1b1"},"C":{"al":"c","bd":"t1b1"},"D":{"al":"c","bd":"t1b1"},"E":{"al":"c","bd":"t1b1"},"F":{"al":"c","bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Referente 2°","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"t1b1"},"C":{"f":"a","al":"c","bd":"t1b1"},"D":{"f":"a","al":"c","bd":"t1b1"},"E":{"f":"a","al":"c","bd":"t1b1"},"F":{"f":"a","al":"c","bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"f":"a","al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Guida 1°","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"t1b1"},"C":{"f":"a","al":"c","bd":"t1b1"},"D":{"f":"a","al":"c","bd":"t1b1"},"E":{"f":"a","al":"c","bd":"t1b1"},"F":{"f":"a","al":"c","bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"f":"a","al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Guida 2°","bd":"l1t1b1"},"B":{"f":"a","al":"c","bd":"t1b1"},"C":{"f":"a","al":"c","bd":"t1b1"},"D":{"f":"a","al":"c","bd":"t1b1"},"E":{"f":"a","al":"c","bd":"t1b1"},"F":{"f":"a","al":"c","bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"f":"a","al":"l","bd":"r1t1b1"}}],[13.0,{"A":{"z":15},"B":{"z":15},"C":{"z":15},"D":{"z":15},"E":{"z":15},"F":{"z":15},"G":{"z":15},"H":{"z":15}}],[19,{"A":{"f":"a","al":"l","bd":"l1t1b2"},"B":{"bd":"t1b2"},"C":{"bd":"t1b2"},"D":{"bd":"t1b2"},"E":{"bd":"t1b2"},"F":{"bd":"t1b2"},"G":{"bd":"t1b2"},"H":{"bd":"r1t1b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b2"},"B":{"bd":"t2b2"},"C":{"bd":"t2b2"},"D":{"bd":"t2b2"},"E":{"bd":"t2b2"},"F":{"bd":"t2b2"},"G":{"bd":"t2b2"},"H":{"bd":"r1t2b2"}}],[19,{"A":{"bd":"l1t2b1"},"B":{"bd":"t2b1"},"C":{"bd":"t2b1"},"D":{"bd":"t2b1"},"E":{"bd":"t2b1"},"F":{"bd":"t2b1"},"G":{"bd":"t2b1"},"H":{"bd":"r1t2b1"}}],[12.0,{"C":{"bd":"b1"}}],[19,{"A":{"t":"Saldo da ricevere","bd":"l1t1b1"},"B":{"bd":"t1b1"},"C":{"t":"NO","f":"g","al":"c"},"D":{"f":"a","al":"l","bd":"r1t1b1"},"E":{"t":"Acconto La Terra","bd":"l1t1b1"},"F":{"bd":"t1b1"},"G":{"bd":"t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Note 1° park","bd":"l1t1b1"},"B":{"f":"a","bd":"t1b1"},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"f":"a","bd":"t1b1"},"H":{"f":"a","bd":"r1t1b1"}}],[19,{"A":{"t":"Note 2° autis","bd":"l1t1b1"},"B":{"f":"a","bd":"t1b1"},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"f":"a","bd":"t1b1"},"H":{"f":"a","bd":"r1t1b1"}}],[19,{"A":{"t":"Note 3° 3 ore","bd":"l1t1b1"},"B":{"f":"a","bd":"t1b1"},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"f":"a","bd":"t1b1"},"H":{"f":"a","bd":"r1t1b1"}}],[19,{"A":{"t":"Note 4° extra","bd":"l1t1b1"},"B":{"f":"a","bd":"t1b1"},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"f":"a","bd":"t1b1"},"H":{"f":"a","bd":"r1t1b1"}}],[12.0,{}],[12.0,{}],[20.0,{"A":{"t":"Autista firma","bd":"l1t1"},"B":{"bd":"t1"},"C":{"bd":"t1"},"D":{"bd":"r1t1"},"E":{"t":"Azienda firma","bd":"l1t1"},"F":{"bd":"t1"},"G":{"z":15,"bd":"t1"},"H":{"z":15,"bd":"r1t1"}}],[20.0,{"A":{"z":15,"bd":"l1"},"B":{"z":15},"C":{"z":15},"D":{"z":15,"bd":"r1"},"E":{"z":15,"bd":"l1"},"F":{"z":15},"G":{"z":15},"H":{"z":15,"bd":"r1"}}],[20.0,{"A":{"z":15,"bd":"l1b1"},"B":{"z":15,"bd":"b1"},"C":{"z":15,"bd":"b1"},"D":{"z":15,"bd":"r1b1"},"E":{"z":15,"bd":"l1b1"},"F":{"z":15,"bd":"b1"},"G":{"z":15,"bd":"b1"},"H":{"z":15,"bd":"r1b1"}}],[20.0,{}],[20.0,{"A":{"bd":"t3"},"B":{"bd":"t3"},"C":{"bd":"t3"},"D":{"bd":"t3"},"E":{"bd":"t3"},"F":{"bd":"t3"},"G":{"bd":"t3"},"H":{"bd":"t3"}}],[20.0,{"A":{"t":"Servizio","bd":"l1t1b1"},"B":{"f":"a","al":"l","bd":"t1b1"},"C":{"t":"Bus","bd":"l1t1b1"},"D":{"fx":1,"bd":"t1b1"},"E":{"t":"Targa","bd":"l1t1b1"},"F":{"fx":1,"bd":"r1t1b1"},"G":{"t":"Autista","bd":"t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Inizio","bd":"l1t1b1"},"B":{"fx":1,"al":"l","bd":"r1t1b1"},"C":{"t":"Fine","bd":"t1b1"},"D":{"fx":1,"al":"l","bd":"r1t1b1"},"E":{"t":"Giorni","bd":"t1b1"},"F":{"fx":1,"al":"l","bd":"r1"},"G":{"t":"Ore","bd":"l1t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Cliente","bd":"l1t1b1"},"B":{"fx":1,"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Referente","bd":"l1t1b1"},"B":{"fx":1,"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"t1b1"},"G":{"t":"Telefono","bd":"l1t1b1"},"H":{"fx":1,"al":"l","bd":"r1t1b1"}}],[19,{"A":{"t":"Itinerario","bd":"l1t1"},"B":{"fx":1,"bd":"t1"},"C":{"bd":"t1"},"D":{"bd":"t1"},"E":{"bd":"t1"},"F":{"bd":"t1"},"G":{"bd":"t1"},"H":{"bd":"r1t1"}}],[19,{"A":{"t":"Causale","bd":"l1t1b1"},"B":{"f":"a","bd":"t1b1"},"C":{"f":"a","bd":"t1b1"},"D":{"f":"a","bd":"t1b1"},"E":{"f":"a","bd":"t1b1"},"F":{"f":"a","bd":"t1b1"},"G":{"t":"Prezzo i.c.","bd":"l1t1b1"},"H":{"fx":1,"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Partita Iva","bd":"l1t1b1"},"B":{"fx":1,"al":"l","bd":"r1t1b1"},"C":{"t":"Multi","bd":"l1t1b1"},"D":{"fx":1,"al":"l","bd":"r1t1b1"},"E":{"t":"SDI","bd":"l1t1b1"},"F":{"f":"a","bd":"r1t1b1"},"G":{"t":"Parcheggi","bd":"l1t1b1"},"H":{"fx":1,"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Fattura acc.","bd":"l1t1b1"},"B":{"fx":1,"al":"l","bd":"r1t1b1"},"C":{"t":"Del","bd":"l1t1b1"},"D":{"fx":1,"al":"l","bd":"r1t1b1"},"E":{"t":"Euro","bd":"l1t1b1"},"F":{"fx":1,"al":"l","bd":"r1t1b1"},"G":{"t":"Pasti","bd":"l1t1b1"},"H":{"fx":1,"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Fattura sald","bd":"l1t1b1"},"B":{"fx":1,"al":"l","bd":"r1t1b1"},"C":{"t":"Del","bd":"l1t1b1"},"D":{"fx":1,"al":"l","bd":"r1t1b1"},"E":{"t":"Euro","bd":"l1t1b1"},"F":{"fx":1,"al":"l","bd":"r1t1b1"},"G":{"t":"Varie ","bd":"l1t1b1"},"H":{"fx":1,"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Note A","bd":"l1"},"B":{"fx":1},"G":{"t":"Totale","bd":"l1t1b1"},"H":{"fx":1,"al":"r","bd":"r1t1b1"}}],[19,{"A":{"t":"Note B","bd":"l1t1b1"},"B":{"fx":1,"bd":"t1b1"},"C":{"bd":"t1b1"},"D":{"bd":"t1b1"},"E":{"bd":"t1b1"},"F":{"bd":"r1t1b1"},"G":{"t":"Contratto","bd":"l1t1b1"},"H":{"fx":1,"bd":"r1t1b1"}}]];
const TPL_DRIVER_LAST=31; // righe 1–31: copia per l'autista; 32–44: copia ufficio
function shClient(b){return b.clientCode!==""&&b.clientCode!=null?clientByCode(b.clientCode):null;}
function xlSerial(d){return Math.round((Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10))-Date.UTC(1899,11,30))/864e5);}
const numOrE=x=>x===""||x==null||!isFinite(Number(x))?"":Number(x);
function tplRef2(b,cl){
  const tel=b.contact&&!(cl&&String(cl[4])===b.contact)?b.contact:"";
  if(b.contactName)return {name:b.contactName,tel};
  if(tel)return {name:tel,tel:""}; // prenotazioni vecchie: nome e telefono nella stessa casella
  return null;
}
// programma: al massimo le 7 righe del modello (righe 14–20)
function tplProgram(b){
  const lines=[],prog=Array.isArray(b.program)?b.program:[];
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
  (b.hotels||[]).forEach(x=>{if(x.name||x.tel)lines.push("Hotel: "+[x.name,x.tel].filter(Boolean).join(" – "));});
  (b.guides||[]).slice(2).forEach(x=>{if(x.name||x.tel)lines.push("Guida: "+[x.name,x.tel].filter(Boolean).join(" – "));});
  if(lines.length>7){const head=lines.slice(0,6);head.push(lines.slice(6).join(" · "));return head;}
  return lines;
}
// valori delle caselle. k: s testo, i numero intero, d data, e euro, a euro contabile. f: casella con formula del modello
function tplValues(b){
  const v=vehicle(b.vehicle)||{},cl=shClient(b),plate=(v.plate||"").trim(),type=normType(b.type);
  const nr=(S.regole.numeri||{})[plate],numero=nr==null?"":(/^\d+$/.test(String(nr).trim())?Number(nr):String(nr));
  const nd=diff(b.start,endOf(b))+1,P=numOrE(b.price),Q=numOrE(b.park),R=numOrE(b.meals);
  const name=cl?cl[1]:(b.client||""),tel=cl&&cl[4]?String(cl[4]):"",refName=cl&&cl[6]?cl[6]:"",refTel=cl&&cl[7]?String(cl[7]):"";
  const contact=b.contact&&!(cl&&String(cl[4])===b.contact)?b.contact:"";
  // Referente 2°: il referente della prenotazione (nome + telefono), altrimenti il primo degli "Altri referenti"
  const r2=tplRef2(b,cl)||(b.refs||[])[0]||{},g=b.guides||[];
  const pax=String(b.pax==null?"":b.pax).trim(),kind=v.kind==="van"?"Van":v.kind==="auto"?"Auto":"Bus";
  const drv=realDriver(b.driver),fg=/^\d+$/.test(String(b.foglio||""))?Number(b.foglio):(b.foglio||"");
  const any=P!==""||Q!==""||R!=="";
  const o={
    H4:{v:fg,k:"i"},
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
    B43:{v:"",f:1},H43:{v:(P||0)+(Q||0)+(R||0),k:"e",f:1},B44:{v:billNote(b),f:1},H44:{v:fg,k:"i",f:1},
  };
  tplProgram(b).forEach((t,i)=>{o["A"+(14+i)]={v:t};});
  for(let i=14;i<=20;i++)if(!o["A"+i])o["A"+i]={v:""};
  return o;
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
  const vals=tplValues(b),last=full?TPL_ROWS.length:TPL_DRIVER_LAST;
  const X=[0];TPL_COLS.forEach(w=>X.push(X[X.length-1]+Math.round(w*9+5)));
  const fills=[],lines=[],texts=[];let y=0;
  const FILLC={a:"#F6FDFC",g:"#E5ECEB"};
  for(let r=1;r<=last;r++){
    const [hpt,cells]=TPL_ROWS[r-1],h=hpt*4/3;
    const content=[];
    for(let i=0;i<8;i++){
      const L=TPL_LETTERS[i],c=cells[L]||{},val=vals[L+r];
      const t=val?tplText(val):(c.t!=null&&!c.fx?String(c.t):"");
      content.push({c,t,val});
      const cf=L+r==="D22"&&vals.C22&&vals.C22.v==="SI"?"#C6E0B4":null; // come la formattazione condizionale del modello
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
        while(tw>w-6&&txt.length>1){txt=txt.slice(0,-2)+"…";tw=measure(txt,sz,bold);}}
      const tx=al==="c"?x0+(w-tw)/2:al==="r"?x0+w-3-tw:x0+3;
      texts.push({x:tx,y:y+h-Math.max(3,(h-sz)/2-1)-sz*0.2,t:txt,size:sz,bold});
    }
    y+=h;
  }
  // la linea di taglio tratteggiata va disegnata tutta d'un pezzo
  const dashed=lines.filter(l=>l.dash),solid=lines.filter(l=>!l.dash),rowsY={};
  for(const l of dashed){const k=l.y1;rowsY[k]=rowsY[k]?{x1:Math.min(rowsY[k].x1,l.x1),x2:Math.max(rowsY[k].x2,l.x2)}:{x1:l.x1,x2:l.x2};}
  for(const k in rowsY)solid.push({x1:rowsY[k].x1,y1:+k,x2:rowsY[k].x2,y2:+k,c:"#000000",dash:true,w:2});
  return {W:X[8],H:y,fills,lines:solid,texts};
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
const pdfTxt=t=>String(t==null?"":t).replace(/→/g,">").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\t/g," ").replace(/[^\x20-\x7E\u00A0-\u00FF€–—…•]/g,"");
async function tplPDF(b,full){
  const {PDFDocument,StandardFonts,rgb}=await loadPdfLib();
  const pdf=await PDFDocument.create();
  pdf.setTitle("Foglio di servizio "+(b.foglio||""));pdf.setAuthor("La Terra s.r.l.");
  const reg=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const HK=0.88; // Helvetica è più larga di Calibri: stessa resa con un corpo un po' più piccolo
  const L=tplLayout(b,full,(t,size,bd)=>(bd?bold:reg).widthOfTextAtSize(pdfTxt(t),size*HK));
  const PW=595.28,PH=841.89,M=28.35,k=(PW-2*M)/L.W;
  const page=pdf.addPage([PW,PH]),X=x=>M+x*k,Y=y=>PH-M-y*k;
  const hex=h=>rgb(parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255);
  for(const f of L.fills)page.drawRectangle({x:X(f.x),y:Y(f.y+f.h),width:f.w*k,height:f.h*k,color:hex(f.c)});
  for(const l of L.lines)page.drawLine({start:{x:X(l.x1),y:Y(l.y1)},end:{x:X(l.x2),y:Y(l.y2)},thickness:(l.w===2?1.3:0.6),color:hex(l.c),dashArray:l.dash?[5,3]:undefined});
  for(const t of L.texts)page.drawText(pdfTxt(t.t),{x:X(t.x),y:Y(t.y),size:t.size*HK*k,font:t.bold?bold:reg,color:rgb(.07,.07,.07)});
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
  let r;try{r=await fetch(TPL_FILE,{cache:"no-cache"});}catch(_){r=null;}
  if(!r||!r.ok)throw {code:"tpl"};
  const zip=await JSZip.loadAsync(await r.arrayBuffer()),p="xl/worksheets/sheet1.xml";
  let xml=await zip.file(p).async("string");
  const vals=tplValues(b),sstF=zip.file("xl/sharedStrings.xml");
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
function slug(t){return norm(t).replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,40);}
function sheetFileName(b){
  const cl=shClient(b),who=slug((cl&&cl[2])||(cl&&cl[1])||b.client||"cliente");
  let parts=(b.route||"").split(/[>→,–]| - /).map(x=>x.trim()).filter(Boolean);
  if(parts.length>2){const inner=parts.slice(1);if(norm(inner[inner.length-1])===norm(parts[0]))inner.pop();parts=inner;}else if(parts.length===2)parts=parts.slice(1);
  const what=slug(hasEvent(b.type)&&b.event?b.event:(parts.slice(0,2).join(" ")||TYPES[normType(b.type)]||"servizio"));
  return (b.foglio||"foglio")+"_"+who+(what?"_x_"+what:"");
}

// --- finestra del foglio ---
let sheetBooking=null;
function openSheet(b){
  sheetBooking=b;
  $("sheetTitle").textContent="Foglio di servizio n. "+(b.foglio||"");
  $("sheetView").innerHTML=tplSVG(b,$("sheetFull").checked);
  $("sheetMsg").textContent="";
  $("ovSheet").hidden=false;
}
$("sheetFull").addEventListener("change",()=>{if(sheetBooking)$("sheetView").innerHTML=tplSVG(sheetBooking,$("sheetFull").checked);});
$("sheetClose").onclick=()=>{$("ovSheet").hidden=true;};
$("ovSheet").addEventListener("click",e=>{if(e.target===$("ovSheet"))$("ovSheet").hidden=true;});
async function sheetSave(kind){
  if(!sheetBooking)return;
  const full=$("sheetFull").checked,btns=[$("sheetPdf"),$("sheetPrint")];btns.forEach(x=>x.disabled=true);
  $("sheetMsg").textContent="Preparo il file…";
  try{
    const blob=kind==="pdf"?await tplPDF(sheetBooking,full):await tplXLSX(sheetBooking);
    const where=await saveXlsx(blob,sheetFileName(sheetBooking)+(full&&kind==="pdf"?"_completo":"")+"."+kind);
    $("sheetMsg").textContent=(kind==="pdf"?"PDF pronto. ":"File Excel pronto. ")+where;
  }catch(err){
    const c=err&&err.code;
    $("sheetMsg").textContent=c==="tpl"?"Non trovo il modello del foglio di servizio (cartella modelli): controlla di averla caricata su GitHub.":c==="declined"?"Salvataggio annullato.":c==="unavailable"||c==="not_granted"?"Il download non è disponibile in questa vista.":"Non sono riuscito a creare il file. Controlla la connessione e riprova.";
    console.error(err);
  }finally{btns.forEach(x=>x.disabled=false);}
}
$("sheetPdf").onclick=()=>sheetSave("pdf");
// Stampa: il foglio (come nell'anteprima) su una pagina A4
async function printSheet(){
  if(!sheetBooking)return;
  const full=$("sheetFull").checked,ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  if(ios){ // su iPhone/iPad si stampa dal PDF (Condividi › Stampa)
    try{const blob=await tplPDF(sheetBooking,full);const u=URL.createObjectURL(blob);window.open(u,"_blank");setTimeout(()=>URL.revokeObjectURL(u),60000);}catch(_){toast("Non riesco a preparare la stampa.");}
    return;
  }
  const html='<!doctype html><html lang="it"><head><meta charset="utf-8"><title>'+esc("Foglio di servizio "+(sheetBooking.foglio||""))+'</title>'+
    '<style>@page{size:A4 portrait;margin:10mm}html,body{margin:0;background:#fff}svg{display:block;width:100%;height:auto}</style></head><body>'+tplSVG(sheetBooking,full)+'</body></html>';
  let fr=$("printFrame");
  if(fr)fr.remove();
  fr=document.createElement("iframe");fr.id="printFrame";fr.setAttribute("aria-hidden","true");fr.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(fr);
  await new Promise(r=>{fr.onload=r;fr.srcdoc=html;});
  try{fr.contentWindow.focus();fr.contentWindow.print();}catch(_){toast("Non riesco ad aprire la stampa.");}
}
$("sheetPrint").onclick=printSheet;

// ---------- versione ----------
const APP_VERSION="1.7",APP_DATE="30/09/2026";
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
  rowFor:b=>Object.assign(billRow(Object.assign({},b,{start:b.start})),{tour:isMulti(b.type)}),
  onClientAdded:(tmp,info)=>onClientAdded(tmp,info),
  onClientError:(tmp,q)=>{toast("«"+(q.name||"")+"» non scritto nel fatturato: "+cliErrText(q.error)+". Correggilo da Clienti.");if(!$("ovClients").hidden)renderClients();}
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
    const blob=await tplPDF(sheetBooking,$("sheetFull").checked);
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
