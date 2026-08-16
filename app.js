
const $ = id => document.getElementById(id);
const fields = ["numero","data","descrizione","cumulato","lordo","mioNome","mioCf","mioIndirizzo","iban",
"clienteNome","clienteCf","clienteIndirizzo","sostituto","altraCopertura","franchigia","aliquota","quotaLavoratore","ritenutaPerc"];

const euro = n => new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(n)||0);
const num = v => {
  if(typeof v === "number") return v;
  let s = String(v??"").trim().replace(/\s/g,"");
  if(s.includes(",") && s.includes(".")) s = s.replace(/\./g,"").replace(",",".");
  else s = s.replace(",",".");
  return Math.max(0, Number(s)||0);
};
const dateIT = v => {
  if(!v) return "";
  const [y,m,d]=v.split("-");
  return `${d}/${m}/${y}`;
};

function calc(){
  const cumulato = num($("cumulato").value);
  const lordo = num($("lordo").value);
  const franchigia = num($("franchigia").value) || 5000;
  const residuoPrima = Math.max(0, franchigia-cumulato);
  const quotaInFranchigia = Math.min(lordo,residuoPrima);
  const imponibile = Math.max(0,lordo-quotaInFranchigia);
  const aliquota = $("altraCopertura").checked ? 24 : num($("aliquota").value);
  const inpsTot = imponibile * aliquota/100;
  const inpsMe = inpsTot * num($("quotaLavoratore").value);
  const inpsCliente = inpsTot-inpsMe;
  const ritenuta = $("sostituto").checked ? lordo*num($("ritenutaPerc").value)/100 : 0;
  const netto = lordo - ritenuta - inpsMe;
  const dopo = cumulato+lordo;

  $("rLordo").textContent=euro(lordo);
  $("rFranchigia").textContent=euro(quotaInFranchigia);
  $("rImponibile").textContent=euro(imponibile);
  $("rInpsTot").textContent=euro(inpsTot);
  $("rInpsMe").textContent=euro(inpsMe);
  $("rInpsCliente").textContent=euro(inpsCliente);
  $("rRitenuta").textContent=euro(ritenuta);
  $("rNetto").textContent=euro(netto);
  $("statusCumulato").textContent=euro(cumulato);
  $("statusResiduo").textContent=euro(Math.max(0,franchigia-cumulato));
  $("progressBar").style.width=Math.min(100,(cumulato/franchigia)*100)+"%";

  if(cumulato>=franchigia){
    $("statusLabel").textContent="Soglia già superata"; $("statusLabel").className="over";
  }else{
    $("statusLabel").textContent="Sotto soglia"; $("statusLabel").className="ok";
  }

  const w=$("warning");
  if(imponibile>0){
    w.className="warning attention";
    w.innerHTML=`⚠️ Con questa ricevuta risultano <b>${euro(imponibile)}</b> oltre la franchigia. Comunica al committente il superamento: il contributo complessivo stimato è <b>${euro(inpsTot)}</b>, di cui <b>${euro(inpsMe)}</b> trattenuti a tuo carico e <b>${euro(inpsCliente)}</b> a carico del committente.`;
  }else{
    w.className="warning";
    w.textContent=`Questa ricevuta resta interamente nella franchigia contributiva. Dopo il pagamento il cumulato sarà ${euro(dopo)}.`;
  }
  return {cumulato,lordo,franchigia,quotaInFranchigia,imponibile,aliquota,inpsTot,inpsMe,inpsCliente,ritenuta,netto,dopo};
}

function saveProfile(){
  const data={};
  ["mioNome","mioCf","mioIndirizzo","iban"].forEach(k=>data[k]=$(k).value);
  localStorage.setItem("ricevute-profile",JSON.stringify(data));
}
function loadProfile(){
  const d=JSON.parse(localStorage.getItem("ricevute-profile")||"{}");
  Object.entries(d).forEach(([k,v])=>{if($(k)) $(k).value=v});
}
function history(){return JSON.parse(localStorage.getItem("ricevute-2026")||"[]")}
function setHistory(h){localStorage.setItem("ricevute-2026",JSON.stringify(h));renderHistory()}

function renderHistory(){
  const h=history(), body=$("historyBody");
  body.innerHTML="";
  $("historyEmpty").hidden=h.length>0;
  $("historyTable").hidden=h.length===0;
  h.forEach((r,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${r.numero}</td><td>${dateIT(r.data)}</td><td>${r.clienteNome||"—"}</td><td>${euro(r.lordo)}</td><td>${euro(r.imponibile)}</td><td><button class="delete" data-i="${i}">×</button></td>`;
    body.appendChild(tr);
  });
  const total=h.reduce((a,r)=>a+num(r.lordo),0);
  $("totaleRegistro").textContent=`Totale: ${euro(total)}`;
  document.querySelectorAll(".delete").forEach(b=>b.onclick=()=>{const x=history();x.splice(+b.dataset.i,1);setHistory(x);});
}

function receiptHTML(c){
  const bollo = c.lordo>77.47;
  const ritenutaLine = $("sostituto").checked
    ? `<div class="r-row"><span>Ritenuta d'acconto ${num($("ritenutaPerc").value)}%</span><b>− ${euro(c.ritenuta)}</b></div>` : "";
  const inpsLines = c.imponibile>0 ? `
    <div class="r-row"><span>Imponibile previdenziale oltre franchigia</span><b>${euro(c.imponibile)}</b></div>
    <div class="r-row"><span>Contributo Gestione Separata ${String(c.aliquota).replace(".",",")}% — quota lavoratrice 1/3</span><b>− ${euro(c.inpsMe)}</b></div>` : "";
  const noteInps = c.imponibile>0
    ? `Ai fini previdenziali, la quota di compenso eccedente la franchigia annua di € 5.000,00 è assoggettata a contribuzione alla Gestione Separata INPS. Il versamento è a cura del committente, con rivalsa di 1/3 a carico della prestatrice.`
    : `Compenso rientrante, sulla base del cumulato dichiarato dalla prestatrice, nella franchigia contributiva annua di € 5.000,00 prevista per il lavoro autonomo occasionale.`;

  return `
  <div class="r-head">
    <div><p style="font-size:10px;letter-spacing:.14em;margin:0 0 7px">RICEVUTA PER PRESTAZIONE DI LAVORO AUTONOMO OCCASIONALE</p><h1>Ricevuta</h1></div>
    <div class="num"><b>N. ${$("numero").value}</b><br>${dateIT($("data").value)}</div>
  </div>
  <div class="r-columns">
    <div class="r-box"><small>Prestatrice</small><b>${$("mioNome").value||""}</b><br>${$("mioIndirizzo").value||""}<br>CF ${$("mioCf").value||""}${$("iban").value?`<br>IBAN ${$("iban").value}`:""}</div>
    <div class="r-box"><small>Committente</small><b>${$("clienteNome").value||""}</b><br>${$("clienteIndirizzo").value||""}<br>${$("clienteCf").value||""}</div>
  </div>
  <div class="r-desc">Per la prestazione occasionale: <b>${$("descrizione").value||"prestazione di lavoro autonomo occasionale"}</b>.</div>
  <div class="r-calc">
    <div class="r-row"><span>Compenso lordo</span><b>${euro(c.lordo)}</b></div>
    ${inpsLines}
    ${ritenutaLine}
    <div class="r-row total"><span>Netto da corrispondere</span><b>${euro(c.netto)}</b></div>
  </div>
  <div class="r-note">
    <p>Operazione fuori campo IVA per carenza del requisito di abitualità, trattandosi di prestazione di lavoro autonomo occasionale.</p>
    <p>${noteInps}</p>
    ${bollo?`<p><b>Marca da bollo da € 2,00</b> sull'originale, ove dovuta per ricevute di importo superiore a € 77,47.</p>`:""}
    <p>La presente ricevuta costituisce quietanza al momento dell'effettivo pagamento del compenso.</p>
  </div>
  <div class="r-sign"><div>Firma della prestatrice</div></div>`;
}

fields.forEach(id=>{
  const el=$(id);
  if(!el)return;
  el.addEventListener(el.type==="checkbox"||el.tagName==="SELECT"?"change":"input",()=>{calc(); if(id.startsWith("mio")||id==="iban") saveProfile();});
});

$("previewBtn").onclick=()=>{
  const c=calc();
  if(c.lordo<=0){alert("Inserisci il compenso lordo.");return}
  $("receiptPaper").innerHTML=receiptHTML(c);
  $("receipt").classList.add("open"); $("receipt").setAttribute("aria-hidden","false");
  window.scrollTo(0,0);
};
$("closeReceipt").onclick=()=>{$("receipt").classList.remove("open");$("receipt").setAttribute("aria-hidden","true")};
$("printReceipt").onclick=()=>window.print();

$("saveBtn").onclick=()=>{
  const c=calc();
  if(c.lordo<=0){alert("Inserisci il compenso lordo.");return}
  const h=history();
  h.push({
    numero:$("numero").value,data:$("data").value,clienteNome:$("clienteNome").value,
    lordo:c.lordo,imponibile:c.imponibile,netto:c.netto
  });
  setHistory(h);
  $("cumulato").value=String(c.dopo).replace(".",",");
  $("numero").value=(num($("numero").value)+1);
  $("lordo").value=""; $("clienteNome").value=""; $("clienteCf").value=""; $("clienteIndirizzo").value=""; $("descrizione").value="";
  calc();
};
$("resetYear").onclick=()=>{
  if(confirm("Vuoi eliminare tutto il registro locale 2026? I dati del tuo profilo resteranno salvati.")){localStorage.removeItem("ricevute-2026");renderHistory();}
};

loadProfile();
$("data").value=new Date().toISOString().slice(0,10);
const h0=history();
if(h0.length){
  const tot=h0.reduce((a,r)=>a+num(r.lordo),0);
  $("cumulato").value=String(tot).replace(".",",");
  $("numero").value=Math.max(...h0.map(r=>num(r.numero)),0)+1;
}
calc(); renderHistory();
