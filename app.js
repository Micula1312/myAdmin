const $ = id => document.getElementById(id);

const STORAGE_KEY = "myadmin-2026-v3";
const LAST_CONFIRMED_RECEIPT = 8;
const DEFAULT_STATE = {
  lastConfirmed: LAST_CONFIRMED_RECEIPT,
  paid: [
    {numero:1, clienteNome:"Spotlight", tipo:"Prestazione occasionale", lordo:375, netto:300},
    {numero:2, clienteNome:"Scomodo", tipo:"Prestazione occasionale", lordo:500, netto:400},
    {numero:3, clienteNome:"Iuno", tipo:"Prestazione occasionale", lordo:325, netto:260},
    {numero:4, clienteNome:"Fondazione Pastificio", tipo:"Rimborso spese — escluso soglia", lordo:276.35, netto:276.35, extra:2, excluded:true},
    {numero:6, clienteNome:"Teorema 1", tipo:"Prestazione occasionale", lordo:1320, netto:1056},
    {numero:7, clienteNome:"Flyer", tipo:"Prestazione occasionale", lordo:500, netto:400},
    {numero:8, clienteNome:"Teorema 2", tipo:"Prestazione occasionale", lordo:1320, netto:1056}
  ],
  pending: [
    {
      id:"docenza-960",
      clienteNome:"Teorema 3 / Docenza",
      lordo:960,
      data:"2026-07-28",
      descrizione:"Collaborazione per attività di docenza durante il secondo semestre del corso Bachelor Fotografia 3° Anno: lezioni del 19/05, 21/05, 28/05, 04/06, esami del 06/07 e 23/07, più 3 ore dedicate a colloqui con studenti, preparazione esami e riunione di coordinamento.",
      sostituto:true
    },
    {id:"balletto-500", clienteNome:"Balletto", lordo:500, data:"", descrizione:"Prestazione occasionale per spettacolo di balletto.", sostituto:true}
  ]
};

const fields=["numero","data","descrizione","cumulato","lordo","mioNome","mioCf","mioIndirizzo","iban","clienteNome","clienteCf","clienteIndirizzo","sostituto","altraCopertura","franchigia","aliquota","quotaLavoratore","ritenutaPerc"];
const euro=n=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(n)||0);
const num=v=>{if(typeof v==="number")return v;let s=String(v??"").trim().replace(/\s/g,"");if(s.includes(",")&&s.includes("."))s=s.replace(/\./g,"").replace(",", ".");else s=s.replace(",", ".");return Math.max(0,Number(s)||0)};
const dateIT=v=>{if(!v)return"";const[y,m,d]=v.split("-");return`${d}/${m}/${y}`};
const clone=o=>JSON.parse(JSON.stringify(o));

function getState(){
  const saved=localStorage.getItem(STORAGE_KEY);
  if(saved){try{return JSON.parse(saved)}catch(e){}}
  const state=clone(DEFAULT_STATE);localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return state;
}
function setState(state){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));renderAll();}
function paidOccasionalTotal(state=getState()){return state.paid.filter(r=>!r.excluded).reduce((a,r)=>a+num(r.lordo),0)}
function pendingTotal(state=getState()){return state.pending.reduce((a,r)=>a+num(r.lordo),0)}
function nextNumber(state=getState()){return num(state.lastConfirmed)+1}

function calcFrom(cumulato,lordo,settings={}){
  const franchigia=settings.franchigia??(num($("franchigia").value)||5000);
  const residuoPrima=Math.max(0,franchigia-cumulato);
  const quotaInFranchigia=Math.min(lordo,residuoPrima);
  const imponibile=Math.max(0,lordo-quotaInFranchigia);
  const aliquota=settings.aliquota??($("altraCopertura").checked?24:num($("aliquota").value));
  const quotaLavoratore=settings.quotaLavoratore??num($("quotaLavoratore").value);
  const sostituto=settings.sostituto??$("sostituto").checked;
  const ritenutaPerc=settings.ritenutaPerc??num($("ritenutaPerc").value);
  const inpsTot=imponibile*aliquota/100;
  const inpsMe=inpsTot*quotaLavoratore;
  const inpsCliente=inpsTot-inpsMe;
  const ritenuta=sostituto?lordo*ritenutaPerc/100:0;
  const netto=lordo-ritenuta-inpsMe;
  return {cumulato,lordo,franchigia,quotaInFranchigia,imponibile,aliquota,quotaLavoratore,inpsTot,inpsMe,inpsCliente,sostituto,ritenutaPerc,ritenuta,netto,dopo:cumulato+lordo};
}
function calc(){
  const c=calcFrom(num($("cumulato").value),num($("lordo").value));
  $("rLordo").textContent=euro(c.lordo);$("rFranchigia").textContent=euro(c.quotaInFranchigia);$("rImponibile").textContent=euro(c.imponibile);$("rInpsTot").textContent=euro(c.inpsTot);$("rInpsMe").textContent=euro(c.inpsMe);$("rInpsCliente").textContent=euro(c.inpsCliente);$("rRitenuta").textContent=euro(c.ritenuta);$("rNetto").textContent=euro(c.netto);
  const w=$("warning");
  if(c.imponibile>0){w.className="warning attention";w.innerHTML=`⚠️ Questa ricevuta supera la franchigia per <b>${euro(c.imponibile)}</b>. INPS totale stimato <b>${euro(c.inpsTot)}</b>, tua quota <b>${euro(c.inpsMe)}</b>, quota committente <b>${euro(c.inpsCliente)}</b>.`}
  else{w.className="warning";w.textContent=`Questa ricevuta resta nella franchigia. Cumulato dopo il pagamento: ${euro(c.dopo)}.`}
  return c;
}

function renderSummary(){
  const state=getState(),paid=paidOccasionalTotal(state),pending=pendingTotal(state),projected=paid+pending,franchigia=num($("franchigia").value)||5000;
  $("statusPaid").textContent=euro(paid);$("statusPending").textContent=euro(pending);$("statusProjected").textContent=euro(projected);$("statusResiduo").textContent=euro(Math.max(0,franchigia-paid));$("progressBar").style.width=Math.min(100,paid/franchigia*100)+"%";
}
function pendingComputed(state=getState()){
  let running=paidOccasionalTotal(state);
  return state.pending.map((r,i)=>{const computed=calcFrom(running,num(r.lordo),{sostituto:r.sostituto!==false});const out={...r,numero:num(state.lastConfirmed)+i+1,cumulatoPrima:running,...computed};running+=num(r.lordo);return out});
}
function renderPending(){
  const state=getState(),list=$("pendingList"),computed=pendingComputed(state);list.innerHTML="";
  if(!computed.length){list.innerHTML='<div class="empty-pending">Nessuna ricevuta in sospeso.</div>';return}
  computed.forEach((r,i)=>{
    const card=document.createElement("article");card.className="pending-card";card.draggable=true;card.dataset.id=r.id;
    card.innerHTML=`<div class="drag-handle" title="Trascina">⋮⋮</div><div class="pending-number">N. ${r.numero}</div><div class="pending-main"><b>${r.clienteNome||"Senza nome"}</b><small>${r.data?dateIT(r.data):"data da definire"} · cumulato prima ${euro(r.cumulatoPrima)}</small></div><div class="pending-money"><b>${euro(r.lordo)}</b><small>${r.imponibile>0?`INPS su ${euro(r.imponibile)}`:"dentro franchigia"}</small></div><div class="pending-actions"><button class="mini load-pending" data-i="${i}">CARICA / STAMPA</button>${i===0?`<button class="mini paid-btn" data-i="${i}">SEGNA INCASSATA</button>`:""}<button class="mini danger delete-pending" data-i="${i}">×</button></div>`;
    list.appendChild(card);
  });
  let dragged=null;
  list.querySelectorAll(".pending-card").forEach(card=>{
    card.addEventListener("dragstart",()=>{dragged=card.dataset.id;card.classList.add("dragging")});
    card.addEventListener("dragend",()=>card.classList.remove("dragging"));
    card.addEventListener("dragover",e=>e.preventDefault());
    card.addEventListener("drop",e=>{e.preventDefault();const target=card.dataset.id;if(!dragged||dragged===target)return;const s=getState();const from=s.pending.findIndex(r=>r.id===dragged),to=s.pending.findIndex(r=>r.id===target);const[item]=s.pending.splice(from,1);s.pending.splice(to,0,item);setState(s)});
  });
  list.querySelectorAll(".load-pending").forEach(b=>b.onclick=()=>loadPending(+b.dataset.i,true));
  list.querySelectorAll(".delete-pending").forEach(b=>b.onclick=()=>{const s=getState();s.pending.splice(+b.dataset.i,1);setState(s)});
  list.querySelectorAll(".paid-btn").forEach(b=>b.onclick=()=>markFirstPaid());
}

function renderHistory(){
  const state=getState(),body=$("historyBody");body.innerHTML="";
  state.paid.forEach((r,i)=>{
    const tr=document.createElement("tr");
    const revisit=r.snapshot?`<button class="mini revisit-btn" data-i="${i}">RIVEDI / STAMPA</button>`:`<span class="missing">—</span>`;
    tr.innerHTML=`<td>${r.numero??"—"}</td><td><b>${r.clienteNome||"—"}</b></td><td>${r.tipo||"Prestazione occasionale"}</td><td>${euro(r.lordo)}${r.extra?` + ${euro(r.extra)} bollo`:""}</td><td>${euro(r.netto)}</td><td><span class="missing">—</span></td><td>${revisit}</td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll(".revisit-btn").forEach(b=>b.onclick=()=>openPaidReceipt(+b.dataset.i));
  $("totaleRegistro").textContent=`Totale incassato: ${euro(paidOccasionalTotal(state))}`;
}
function renderAll(){renderSummary();renderPending();renderHistory();setBlankFormDefaults();}
function setBlankFormDefaults(){const state=getState();$("numero").value=nextNumber(state);$("cumulato").value=paidOccasionalTotal(state);calc();}

function loadPending(index,openReceipt=false){
  const r=pendingComputed(getState())[index];if(!r)return;
  $("numero").value=r.numero;$("cumulato").value=r.cumulatoPrima;$("lordo").value=r.lordo;$("data").value=r.data||new Date().toISOString().slice(0,10);$("clienteNome").value=r.clienteNome||"";$("clienteCf").value=r.clienteCf||"";$("clienteIndirizzo").value=r.clienteIndirizzo||"";$("descrizione").value=r.descrizione||"";$("sostituto").checked=r.sostituto!==false;calc();
  if(openReceipt)openCurrentReceipt();
}
function profileSnapshot(){return{nome:$("mioNome").value||"",cf:$("mioCf").value||"",indirizzo:$("mioIndirizzo").value||"",iban:$("iban").value||""}}
function markFirstPaid(){
  const state=getState();if(!state.pending.length)return;
  const r=state.pending.shift(),number=num(state.lastConfirmed)+1,cumulatoPrima=paidOccasionalTotal(state);
  const settings={franchigia:num($("franchigia").value)||5000,aliquota:$("altraCopertura").checked?24:num($("aliquota").value),quotaLavoratore:num($("quotaLavoratore").value),sostituto:r.sostituto!==false,ritenutaPerc:num($("ritenutaPerc").value)};
  const computed=calcFrom(cumulatoPrima,num(r.lordo),settings);
  const snapshot={numero:number,data:r.data||new Date().toISOString().slice(0,10),descrizione:r.descrizione||"",clienteNome:r.clienteNome||"",clienteCf:r.clienteCf||"",clienteIndirizzo:r.clienteIndirizzo||"",prestatore:profileSnapshot(),...computed};
  state.paid.push({numero:number,clienteNome:r.clienteNome,tipo:"Prestazione occasionale",lordo:num(r.lordo),netto:computed.netto,data:snapshot.data,descrizione:snapshot.descrizione,snapshot});
  state.lastConfirmed=number;setState(state);
}

function receiptHTMLFromSnapshot(s){
  const bollo=s.lordo>77.47;
  const rit=s.sostituto?`<div class="r-row"><span>Ritenuta d'acconto ${s.ritenutaPerc}%</span><b>− ${euro(s.ritenuta)}</b></div>`:"";
  const inps=s.imponibile>0?`<div class="r-row"><span>Imponibile previdenziale oltre franchigia</span><b>${euro(s.imponibile)}</b></div><div class="r-row"><span>Gestione Separata ${String(s.aliquota).replace(".",",")}% — quota lavoratrice 1/3</span><b>− ${euro(s.inpsMe)}</b></div>`:"";
  const note=s.imponibile>0?`La quota eccedente la franchigia annua indicata è assoggettata a contribuzione Gestione Separata; il versamento è a cura del committente con quota a carico della prestatrice.`:`Il compenso rientra, sulla base del cumulato indicato, nella franchigia contributiva annua.`;
  const p=s.prestatore||profileSnapshot();
  return `<div class="r-head"><div><p style="font-size:10px;letter-spacing:.14em;margin:0 0 7px">RICEVUTA PER PRESTAZIONE DI LAVORO AUTONOMO OCCASIONALE</p><h1>Ricevuta</h1></div><div class="num"><b>N. ${s.numero}</b><br>${dateIT(s.data)}</div></div><div class="r-columns"><div class="r-box"><small>Prestatrice</small><b>${p.nome||""}</b><br>${p.indirizzo||""}<br>CF ${p.cf||""}${p.iban?`<br>IBAN ${p.iban}`:""}</div><div class="r-box"><small>Committente</small><b>${s.clienteNome||""}</b><br>${s.clienteIndirizzo||""}<br>${s.clienteCf||""}</div></div><div class="r-desc">Per la prestazione occasionale: <b>${s.descrizione||"prestazione di lavoro autonomo occasionale"}</b>.</div><div class="r-calc"><div class="r-row"><span>Compenso lordo</span><b>${euro(s.lordo)}</b></div>${inps}${rit}<div class="r-row total"><span>Netto da corrispondere</span><b>${euro(s.netto)}</b></div></div><div class="r-note"><p>Operazione fuori campo IVA per carenza del requisito di abitualità.</p><p>${note}</p>${bollo?`<p><b>Marca da bollo da € 2,00</b> sull'originale, ove dovuta.</p>`:""}<p>La ricevuta costituisce quietanza al momento dell'effettivo pagamento.</p></div><div class="r-sign"><div>Firma della prestatrice</div></div>`;
}
function currentSnapshot(){const c=calc();return{numero:num($("numero").value),data:$("data").value,descrizione:$("descrizione").value,clienteNome:$("clienteNome").value,clienteCf:$("clienteCf").value,clienteIndirizzo:$("clienteIndirizzo").value,prestatore:profileSnapshot(),...c}}
function openCurrentReceipt(){const s=currentSnapshot();if(s.lordo<=0)return alert("Inserisci il compenso lordo.");$("receiptPaper").innerHTML=receiptHTMLFromSnapshot(s);$("receipt").classList.add("open");window.scrollTo(0,0)}
function openPaidReceipt(index){const r=getState().paid[index];if(!r?.snapshot)return;$("receiptPaper").innerHTML=receiptHTMLFromSnapshot(r.snapshot);$("receipt").classList.add("open");window.scrollTo(0,0)}

function saveProfile(){const d={};["mioNome","mioCf","mioIndirizzo","iban"].forEach(k=>d[k]=$(k).value);localStorage.setItem("myadmin-profile",JSON.stringify(d))}
function loadProfile(){const d=JSON.parse(localStorage.getItem("myadmin-profile")||"{}");Object.entries(d).forEach(([k,v])=>{if($(k))$(k).value=v})}

fields.forEach(id=>{const el=$(id);if(el)el.addEventListener(el.type==="checkbox"||el.tagName==="SELECT"?"change":"input",()=>{calc();if(id.startsWith("mio")||id==="iban")saveProfile();if(id==="franchigia")renderSummary()})});
$("previewBtn").onclick=openCurrentReceipt;
$("closeReceipt").onclick=()=>$("receipt").classList.remove("open");
$("printReceipt").onclick=()=>window.print();
$("savePendingBtn").onclick=()=>{
  const lordo=num($("lordo").value);if(lordo<=0)return alert("Inserisci il compenso lordo.");
  const state=getState();state.pending.push({id:`p-${Date.now()}`,clienteNome:$("clienteNome").value||"Senza nome",clienteCf:$("clienteCf").value,clienteIndirizzo:$("clienteIndirizzo").value,lordo,data:$("data").value,descrizione:$("descrizione").value,sostituto:$("sostituto").checked});setState(state);
  $("lordo").value="";$("clienteNome").value="";$("clienteCf").value="";$("clienteIndirizzo").value="";$("descrizione").value="";
};
$("resetYear").onclick=()=>{if(confirm("Ripristinare i dati 2026 verificati e le due ricevute in sospeso?")){localStorage.setItem(STORAGE_KEY,JSON.stringify(clone(DEFAULT_STATE)));renderAll()}};

loadProfile();$("data").value=new Date().toISOString().slice(0,10);renderAll();
