const $ = id => document.getElementById(id);
const STORAGE_KEY = "myadmin-2026-v4";
const clone = o => JSON.parse(JSON.stringify(o));
const euro = n => new Intl.NumberFormat("it-IT", {style:"currency", currency:"EUR"}).format(Number(n)||0);
const num = v => { let s=String(v??"").trim().replace(/\s/g,""); if(s.includes(",")&&s.includes(".")) s=s.replace(/\./g,"").replace(",","."); else s=s.replace(",", "."); return Math.max(0,Number(s)||0); };
const dateIT = v => { if(!v) return ""; const [y,m,d]=v.split("-"); return `${d}/${m}/${y}`; };
const slug = s => String(s||"ricevuta").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40);

const DEFAULT_STATE = {
  lastConfirmed: 8,
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
    {id:"docenza-960", clienteNome:"Teorema 3 / Docenza", lordo:960, data:"2026-07-28", descrizione:"Collaborazione per attività di docenza durante il secondo semestre del corso Bachelor Fotografia 3° Anno: lezioni del 19/05, 21/05, 28/05, 04/06, esami del 06/07 e 23/07, più 3 ore dedicate a colloqui con studenti, preparazione esami e riunione di coordinamento.", sostituto:true},
    {id:"balletto-500", clienteNome:"Balletto", lordo:500, data:"", descrizione:"Prestazione occasionale per spettacolo di balletto.", sostituto:true}
  ]
};

function getState(){
  const raw=localStorage.getItem(STORAGE_KEY);
  if(raw){try{return JSON.parse(raw)}catch(e){}}
  const state=clone(DEFAULT_STATE); localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); return state;
}
function setState(state){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));renderAll();}
function paidTotal(state=getState()){return state.paid.filter(r=>!r.excluded).reduce((a,r)=>a+num(r.lordo),0)}
function pendingTotal(state=getState()){return state.pending.reduce((a,r)=>a+num(r.lordo),0)}
function settingsFromForm(){return {franchigia:num($("franchigia").value)||5000, aliquota:$("altraCopertura").checked?24:num($("aliquota").value), quotaLavoratore:num($("quotaLavoratore").value)||1/3, sostituto:$("sostituto").checked, ritenutaPerc:num($("ritenutaPerc").value)||20};}
function calcFrom(cumulato,lordo,settings=settingsFromForm()){
  const residuo=Math.max(0,settings.franchigia-cumulato);
  const quotaInFranchigia=Math.min(lordo,residuo);
  const imponibile=Math.max(0,lordo-quotaInFranchigia);
  const inpsTot=imponibile*settings.aliquota/100;
  const inpsMe=inpsTot*settings.quotaLavoratore;
  const inpsCliente=inpsTot-inpsMe;
  const ritenuta=settings.sostituto?lordo*settings.ritenutaPerc/100:0;
  const netto=lordo-ritenuta-inpsMe;
  return {...settings,cumulato,lordo,quotaInFranchigia,imponibile,inpsTot,inpsMe,inpsCliente,ritenuta,netto,dopo:cumulato+lordo};
}
function profile(){return {nome:$("mioNome").value||"",cf:$("mioCf").value||"",indirizzo:$("mioIndirizzo").value||"",iban:$("iban").value||""};}
function formSnapshot(){
  const c=calcFrom(num($("cumulato").value),num($("lordo").value));
  return {numero:num($("numero").value),data:$("data").value,descrizione:$("descrizione").value,clienteNome:$("clienteNome").value,clienteCf:$("clienteCf").value,clienteIndirizzo:$("clienteIndirizzo").value,prestatore:profile(),...c};
}
function receiptHTML(s,mini=false){
  const p=s.prestatore||profile();
  const inps=s.imponibile>0?`<div class="r-row"><span>Imponibile INPS</span><b>${euro(s.imponibile)}</b></div><div class="r-row"><span>Gestione Separata ${String(s.aliquota).replace(".",",")}% — quota lavoratrice</span><b>− ${euro(s.inpsMe)}</b></div>`:"";
  const rit=s.sostituto?`<div class="r-row"><span>Ritenuta d'acconto ${s.ritenutaPerc}%</span><b>− ${euro(s.ritenuta)}</b></div>`:"";
  const note=s.imponibile>0?"La quota eccedente la franchigia annua indicata è assoggettata a contribuzione alla Gestione Separata INPS.":"Il compenso rientra, sulla base del cumulato indicato, nella franchigia contributiva annua.";
  return `<div class="r-head"><div><small>RICEVUTA PER PRESTAZIONE DI LAVORO AUTONOMO OCCASIONALE</small><h1>Ricevuta</h1></div><div class="num"><b>N. ${s.numero||"—"}</b><br>${dateIT(s.data)}</div></div><div class="r-columns"><div class="r-box"><small>Prestatrice</small><b>${p.nome||""}</b><br>${p.indirizzo||""}<br>CF ${p.cf||""}${p.iban?`<br>IBAN ${p.iban}`:""}</div><div class="r-box"><small>Committente</small><b>${s.clienteNome||""}</b><br>${s.clienteIndirizzo||""}<br>${s.clienteCf||""}</div></div><div class="r-desc">Per la prestazione occasionale: <b>${s.descrizione||"prestazione di lavoro autonomo occasionale"}</b>.</div><div class="r-calc"><div class="r-row"><span>Compenso lordo</span><b>${euro(s.lordo)}</b></div>${inps}${rit}<div class="r-row total"><span>Netto da corrispondere</span><b>${euro(s.netto)}</b></div></div>${mini?"":`<div class="r-note"><p>Operazione fuori campo IVA per carenza del requisito di abitualità.</p><p>${note}</p>${s.lordo>77.47?'<p><b>Marca da bollo da € 2,00</b> sull’originale, ove dovuta.</p>':""}<p>La ricevuta costituisce quietanza al momento dell'effettivo pagamento.</p></div><div class="r-sign"><div>Firma della prestatrice</div></div>`}`;
}

function renderPreview(){
  const s=formSnapshot();
  $("rLordo").textContent=euro(s.lordo);$("rImponibile").textContent=euro(s.imponibile);$("rNetto").textContent=euro(s.netto);
  $("suggestedFilename").textContent=`${String(s.numero||0).padStart(3,"0")}-${slug(s.clienteNome)}.pdf`;
  $("warning").className=s.imponibile>0?"warning attention":"warning";
  $("warning").innerHTML=s.imponibile>0?`Questa ricevuta supera la franchigia per <b>${euro(s.imponibile)}</b>. Tua quota INPS stimata: <b>${euro(s.inpsMe)}</b>.`:`Cumulato dopo il pagamento: <b>${euro(s.dopo)}</b>.`;
  $("receiptPreview").innerHTML=receiptHTML(s,true);
}
function renderSummary(){
  const state=getState(),paid=paidTotal(state),pending=pendingTotal(state),f=num($("franchigia").value)||5000;
  $("statusPaid").textContent=euro(paid);$("statusPending").textContent=euro(pending);$("statusProjected").textContent=euro(paid+pending);$("statusResiduo").textContent=euro(Math.max(0,f-paid));$("progressBar").style.width=Math.min(100,paid/f*100)+"%";
}
function pendingComputed(state=getState()){
  let running=paidTotal(state);
  return state.pending.map((r,i)=>{const settings={...settingsFromForm(),sostituto:r.sostituto!==false};const c=calcFrom(running,num(r.lordo),settings);const out={...r,numero:num(state.lastConfirmed)+i+1,cumulatoPrima:running,...c};running+=num(r.lordo);return out;});
}
function renderPending(){
  const state=getState(),computed=pendingComputed(state),list=$("pendingList");list.innerHTML="";
  if(!computed.length){list.innerHTML='<p class="empty">Nessuna ricevuta in sospeso.</p>';return;}
  computed.forEach((r,i)=>{const card=document.createElement("article");card.className="flow-card pending-card";card.draggable=true;card.dataset.id=r.id;card.innerHTML=`<div class="drag-handle">⋮⋮</div><div class="flow-num">${r.numero}</div><div class="flow-main"><b>${r.clienteNome||"Senza nome"}</b><small>${r.data?dateIT(r.data):"data da definire"} · prima ${euro(r.cumulatoPrima)}</small><small>${r.imponibile>0?`INPS su ${euro(r.imponibile)}`:"dentro franchigia"}</small></div><div class="flow-money">${euro(r.lordo)}</div><div class="flow-actions"><button class="mini edit-pending" data-i="${i}">MODIFICA</button><button class="mini print-pending" data-i="${i}">STAMPA</button>${i===0?`<button class="mini paid-btn">INCASSATA</button>`:""}<button class="mini danger delete-pending" data-i="${i}">×</button></div>`;list.appendChild(card);});
  let dragged=null;
  list.querySelectorAll(".pending-card").forEach(card=>{card.ondragstart=()=>{dragged=card.dataset.id;card.classList.add("dragging")};card.ondragend=()=>card.classList.remove("dragging");card.ondragover=e=>e.preventDefault();card.ondrop=e=>{e.preventDefault();const target=card.dataset.id;if(!dragged||dragged===target)return;const s=getState(),from=s.pending.findIndex(x=>x.id===dragged),to=s.pending.findIndex(x=>x.id===target);const [item]=s.pending.splice(from,1);s.pending.splice(to,0,item);setState(s);};});
  list.querySelectorAll(".edit-pending").forEach(b=>b.onclick=()=>loadPending(+b.dataset.i));
  list.querySelectorAll(".print-pending").forEach(b=>b.onclick=()=>{loadPending(+b.dataset.i);printCurrent();});
  list.querySelectorAll(".delete-pending").forEach(b=>b.onclick=()=>{const s=getState();s.pending.splice(+b.dataset.i,1);setState(s)});
  const paid=list.querySelector(".paid-btn");if(paid)paid.onclick=markFirstPaid;
}
function renderPaid(){
  const state=getState(),list=$("paidList");list.innerHTML="";
  [...state.paid].reverse().forEach((r,revIndex)=>{const i=state.paid.length-1-revIndex;const card=document.createElement("article");card.className="flow-card paid-card";card.dataset.receiptNumber=r.numero;card.innerHTML=`<div class="flow-num">${r.numero??"—"}</div><div class="flow-main"><b>${r.clienteNome||"—"}</b><small>${r.tipo||"Prestazione occasionale"}</small></div><div class="flow-money">${euro(r.lordo)}</div><div class="flow-actions"><span class="pdf-slot missing">PDF —</span>${r.snapshot?`<button class="mini revisit-paid" data-i="${i}">RIVEDI / STAMPA</button><button class="mini reopen-paid" data-i="${i}">RIMETTI IN SOSPESO</button><button class="mini danger delete-paid" data-i="${i}">ELIMINA</button>`:""}</div>`;list.appendChild(card);});
  list.querySelectorAll(".revisit-paid").forEach(b=>b.onclick=()=>openPaid(+b.dataset.i));
  list.querySelectorAll(".reopen-paid").forEach(b=>b.onclick=()=>reopenPaid(+b.dataset.i));
  list.querySelectorAll(".delete-paid").forEach(b=>b.onclick=()=>deletePaid(+b.dataset.i));
  $("totaleRegistro").textContent=euro(paidTotal(state));
  document.dispatchEvent(new CustomEvent("myadmin:paid-rendered"));
}
function renderAll(){renderSummary();renderPending();renderPaid();setBlankDefaults();}
function setBlankDefaults(){const s=getState();$("numero").value=num(s.lastConfirmed)+1;$("cumulato").value=paidTotal(s);renderPreview();}
function clearForm(){const s=getState();$("numero").value=num(s.lastConfirmed)+1;$("data").value=new Date().toISOString().slice(0,10);$("descrizione").value="";$("lordo").value="";$("clienteNome").value="";$("clienteCf").value="";$("clienteIndirizzo").value="";$("cumulato").value=paidTotal(s);renderPreview();}
function loadPending(i){const r=pendingComputed(getState())[i];if(!r)return;$("numero").value=r.numero;$("cumulato").value=r.cumulatoPrima;$("lordo").value=r.lordo;$("data").value=r.data||new Date().toISOString().slice(0,10);$("descrizione").value=r.descrizione||"";$("clienteNome").value=r.clienteNome||"";$("clienteCf").value=r.clienteCf||"";$("clienteIndirizzo").value=r.clienteIndirizzo||"";$("sostituto").checked=r.sostituto!==false;renderPreview();window.scrollTo({top:0,behavior:"smooth"});}
function markFirstPaid(){
  const state=getState();if(!state.pending.length)return;const r=state.pending.shift(),cumulatoPrima=paidTotal(state),number=num(state.lastConfirmed)+1,settings={...settingsFromForm(),sostituto:r.sostituto!==false},c=calcFrom(cumulatoPrima,num(r.lordo),settings);const snapshot={numero:number,data:r.data||new Date().toISOString().slice(0,10),descrizione:r.descrizione||"",clienteNome:r.clienteNome||"",clienteCf:r.clienteCf||"",clienteIndirizzo:r.clienteIndirizzo||"",prestatore:profile(),...c};state.paid.push({numero:number,clienteNome:r.clienteNome,tipo:"Prestazione occasionale",lordo:r.lordo,netto:c.netto,snapshot});state.lastConfirmed=number;setState(state);
}
function openPaid(i){const r=getState().paid[i];if(!r?.snapshot)return;const s=r.snapshot;$("numero").value=s.numero;$("data").value=s.data;$("descrizione").value=s.descrizione;$("cumulato").value=s.cumulato;$("lordo").value=s.lordo;$("clienteNome").value=s.clienteNome;$("clienteCf").value=s.clienteCf;$("clienteIndirizzo").value=s.clienteIndirizzo;$("sostituto").checked=s.sostituto;renderPreview();window.scrollTo({top:0,behavior:"smooth"});}
function reopenPaid(i){const state=getState(),r=state.paid[i];if(!r?.snapshot)return;if(!confirm(`Rimettere la ricevuta n. ${r.numero} in sospeso?`))return;state.paid.splice(i,1);state.pending.unshift({id:`reopen-${Date.now()}`,clienteNome:r.snapshot.clienteNome,clienteCf:r.snapshot.clienteCf,clienteIndirizzo:r.snapshot.clienteIndirizzo,lordo:r.snapshot.lordo,data:r.snapshot.data,descrizione:r.snapshot.descrizione,sostituto:r.snapshot.sostituto});if(r.numero===state.lastConfirmed)state.lastConfirmed=Math.max(...state.paid.filter(x=>!x.excluded).map(x=>num(x.numero)),0);setState(state);}
function deletePaid(i){const state=getState(),r=state.paid[i];if(!r?.snapshot)return;if(!confirm(`Eliminare la ricevuta n. ${r.numero} dal registro myAdmin? Il PDF locale non verrà cancellato.`))return;state.paid.splice(i,1);if(r.numero===state.lastConfirmed)state.lastConfirmed=Math.max(...state.paid.filter(x=>!x.excluded).map(x=>num(x.numero)),0);setState(state);}
function printCurrent(){const s=formSnapshot();$("printPaper").innerHTML=receiptHTML(s,false);document.body.classList.add("printing");window.print();setTimeout(()=>document.body.classList.remove("printing"),300);}
function saveProfile(){localStorage.setItem("myadmin-profile",JSON.stringify(profile()));}
function loadProfile(){const p=JSON.parse(localStorage.getItem("myadmin-profile")||"{}");if(p.nome)$("mioNome").value=p.nome;if(p.cf)$("mioCf").value=p.cf;if(p.indirizzo)$("mioIndirizzo").value=p.indirizzo;if(p.iban)$("iban").value=p.iban;}

["data","descrizione","lordo","clienteNome","clienteCf","clienteIndirizzo","sostituto","altraCopertura","franchigia","aliquota","quotaLavoratore","ritenutaPerc","mioNome","mioCf","mioIndirizzo","iban"].forEach(id=>{const el=$(id);const ev=el.type==="checkbox"||el.tagName==="SELECT"?"change":"input";el.addEventListener(ev,()=>{if(["mioNome","mioCf","mioIndirizzo","iban"].includes(id))saveProfile();renderPreview();if(["franchigia","aliquota","altraCopertura","quotaLavoratore","ritenutaPerc"].includes(id)){renderSummary();renderPending();}});});
$("savePendingBtn").onclick=()=>{const lordo=num($("lordo").value);if(!lordo)return alert("Inserisci il compenso lordo.");const state=getState();state.pending.push({id:`p-${Date.now()}`,clienteNome:$("clienteNome").value||"Senza nome",clienteCf:$("clienteCf").value,clienteIndirizzo:$("clienteIndirizzo").value,lordo,data:$("data").value,descrizione:$("descrizione").value,sostituto:$("sostituto").checked});setState(state);clearForm();};
$("clearFormBtn").onclick=clearForm;$("printReceiptBtn").onclick=printCurrent;$("resetYear").onclick=()=>{if(confirm("Ripristinare i dati iniziali 2026?")){localStorage.setItem(STORAGE_KEY,JSON.stringify(clone(DEFAULT_STATE)));renderAll();}};
loadProfile();if(!$("data").value)$("data").value=new Date().toISOString().slice(0,10);renderAll();