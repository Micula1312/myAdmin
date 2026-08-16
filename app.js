const $ = id => document.getElementById(id);
const SEED_2026 = [
  {numero:1, clienteNome:"Spotlight", lordo:375, netto:300, pdf:"ricevute/2026/001-spotlight.pdf", seeded:true},
  {numero:2, clienteNome:"Scomodo", lordo:500, netto:400, pdf:"ricevute/2026/002-scomodo.pdf", seeded:true},
  {numero:3, clienteNome:"Iuno", lordo:500, netto:400, pdf:"ricevute/2026/003-iuno.pdf", seeded:true},
  {numero:4, clienteNome:"Fondaz. Pastificio", lordo:1440, netto:1152, pdf:"ricevute/2026/004-pastificio.pdf", seeded:true},
  {numero:6, clienteNome:"Teorema 1", lordo:500, netto:400, seeded:true},
  {numero:7, clienteNome:"Flyer", lordo:200, netto:160, pdf:"ricevute/2026/007-flyer.pdf", seeded:true},
  {numero:8, clienteNome:"Teorema 2", lordo:0, netto:400, seeded:true},
  {numero:"—", clienteNome:"Filippo", lordo:0, netto:0, seeded:true},
  {numero:"—", clienteNome:"Teorema", lordo:0, netto:0, seeded:true},
  {numero:"—", clienteNome:"Balletto", lordo:0, netto:0, seeded:true}
];
const fields=["numero","data","descrizione","cumulato","lordo","mioNome","mioCf","mioIndirizzo","iban","clienteNome","clienteCf","clienteIndirizzo","sostituto","altraCopertura","franchigia","aliquota","quotaLavoratore","ritenutaPerc"];
const euro=n=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(n)||0);
const num=v=>{if(typeof v==="number")return v;let s=String(v??"").trim().replace(/\s/g,"");if(s.includes(",")&&s.includes("."))s=s.replace(/\./g,"").replace(",",".");else s=s.replace(",",".");return Math.max(0,Number(s)||0)};
const dateIT=v=>{if(!v)return"";const[y,m,d]=v.split("-");return`${d}/${m}/${y}`};

function calc(){
 const cumulato=num($("cumulato").value),lordo=num($("lordo").value),franchigia=num($("franchigia").value)||5000;
 const residuoPrima=Math.max(0,franchigia-cumulato),quotaInFranchigia=Math.min(lordo,residuoPrima),imponibile=Math.max(0,lordo-quotaInFranchigia);
 const aliquota=$("altraCopertura").checked?24:num($("aliquota").value),inpsTot=imponibile*aliquota/100,inpsMe=inpsTot*num($("quotaLavoratore").value),inpsCliente=inpsTot-inpsMe;
 const ritenuta=$("sostituto").checked?lordo*num($("ritenutaPerc").value)/100:0,netto=lordo-ritenuta-inpsMe,dopo=cumulato+lordo;
 $("rLordo").textContent=euro(lordo);$("rFranchigia").textContent=euro(quotaInFranchigia);$("rImponibile").textContent=euro(imponibile);$("rInpsTot").textContent=euro(inpsTot);$("rInpsMe").textContent=euro(inpsMe);$("rInpsCliente").textContent=euro(inpsCliente);$("rRitenuta").textContent=euro(ritenuta);$("rNetto").textContent=euro(netto);
 $("statusCumulato").textContent=euro(cumulato);$("statusResiduo").textContent=euro(Math.max(0,franchigia-cumulato));$("progressBar").style.width=Math.min(100,cumulato/franchigia*100)+"%";
 $("statusLabel").textContent=cumulato>=franchigia?"Soglia già superata":"Sotto soglia";$("statusLabel").className=cumulato>=franchigia?"over":"ok";
 const w=$("warning");if(imponibile>0){w.className="warning attention";w.innerHTML=`⚠️ <b>${euro(imponibile)}</b> di questa ricevuta superano la franchigia. INPS totale stimato: <b>${euro(inpsTot)}</b> — tua quota: <b>${euro(inpsMe)}</b>, quota committente: <b>${euro(inpsCliente)}</b>.`;}else{w.className="warning";w.textContent=`Questa ricevuta resta nella franchigia. Cumulato dopo il pagamento: ${euro(dopo)}.`}
 return{cumulato,lordo,franchigia,quotaInFranchigia,imponibile,aliquota,inpsTot,inpsMe,inpsCliente,ritenuta,netto,dopo};
}
function saveProfile(){const d={};["mioNome","mioCf","mioIndirizzo","iban"].forEach(k=>d[k]=$(k).value);localStorage.setItem("myadmin-profile",JSON.stringify(d))}
function loadProfile(){const d=JSON.parse(localStorage.getItem("myadmin-profile")||"{}");Object.entries(d).forEach(([k,v])=>{if($(k))$(k).value=v})}
function history(){const saved=JSON.parse(localStorage.getItem("myadmin-ricevute-2026")||"null");return saved||structuredClone(SEED_2026)}
function setHistory(h){localStorage.setItem("myadmin-ricevute-2026",JSON.stringify(h));renderHistory()}
function renderHistory(){
 const h=history(),body=$("historyBody");body.innerHTML="";
 h.forEach((r,i)=>{const tr=document.createElement("tr");const pdf=r.pdf?`<a class="pdf-link" href="${r.pdf}" target="_blank">APRI PDF ↗</a>`:`<span class="missing">—</span>`;tr.innerHTML=`<td>${r.numero}</td><td><b>${r.clienteNome||"—"}</b></td><td>${r.lordo?euro(r.lordo):"—"}</td><td>${r.netto?euro(r.netto):"—"}</td><td>${pdf}</td><td>${r.seeded?"":`<button class="delete" data-i="${i}">×</button>`}</td>`;body.appendChild(tr)});
 const total=h.reduce((a,r)=>a+num(r.lordo),0);$("totaleRegistro").textContent=`Totale registrato: ${euro(total)}`;
 document.querySelectorAll(".delete").forEach(b=>b.onclick=()=>{const x=history();x.splice(+b.dataset.i,1);setHistory(x);syncCumulato()});
}
function syncCumulato(){const total=history().reduce((a,r)=>a+num(r.lordo),0);$("cumulato").value=total;calc()}
function receiptHTML(c){
 const bollo=c.lordo>77.47,rit=$("sostituto").checked?`<div class="r-row"><span>Ritenuta d'acconto ${num($("ritenutaPerc").value)}%</span><b>− ${euro(c.ritenuta)}</b></div>`:"";
 const inps=c.imponibile>0?`<div class="r-row"><span>Imponibile previdenziale oltre franchigia</span><b>${euro(c.imponibile)}</b></div><div class="r-row"><span>Gestione Separata ${String(c.aliquota).replace(".",",")}% — quota lavoratrice 1/3</span><b>− ${euro(c.inpsMe)}</b></div>`:"";
 const note=c.imponibile>0?`La quota eccedente la franchigia annua indicata è assoggettata a contribuzione Gestione Separata; il versamento è a cura del committente con quota a carico della prestatrice.`:`Il compenso rientra, sulla base del cumulato indicato, nella franchigia contributiva annua.`;
 return `<div class="r-head"><div><p style="font-size:10px;letter-spacing:.14em;margin:0 0 7px">RICEVUTA PER PRESTAZIONE DI LAVORO AUTONOMO OCCASIONALE</p><h1>Ricevuta</h1></div><div class="num"><b>N. ${$("numero").value}</b><br>${dateIT($("data").value)}</div></div><div class="r-columns"><div class="r-box"><small>Prestatrice</small><b>${$("mioNome").value}</b><br>${$("mioIndirizzo").value}<br>CF ${$("mioCf").value}${$("iban").value?`<br>IBAN ${$("iban").value}`:""}</div><div class="r-box"><small>Committente</small><b>${$("clienteNome").value}</b><br>${$("clienteIndirizzo").value}<br>${$("clienteCf").value}</div></div><div class="r-desc">Per la prestazione occasionale: <b>${$("descrizione").value||"prestazione di lavoro autonomo occasionale"}</b>.</div><div class="r-calc"><div class="r-row"><span>Compenso lordo</span><b>${euro(c.lordo)}</b></div>${inps}${rit}<div class="r-row total"><span>Netto da corrispondere</span><b>${euro(c.netto)}</b></div></div><div class="r-note"><p>Operazione fuori campo IVA per carenza del requisito di abitualità.</p><p>${note}</p>${bollo?`<p><b>Marca da bollo da € 2,00</b> sull'originale, ove dovuta.</p>`:""}<p>La ricevuta costituisce quietanza al momento dell'effettivo pagamento.</p></div><div class="r-sign"><div>Firma della prestatrice</div></div>`;
}
fields.forEach(id=>{const el=$(id);if(el)el.addEventListener(el.type==="checkbox"||el.tagName==="SELECT"?"change":"input",()=>{calc();if(id.startsWith("mio")||id==="iban")saveProfile()})});
$("previewBtn").onclick=()=>{const c=calc();if(c.lordo<=0)return alert("Inserisci il compenso lordo.");$("receiptPaper").innerHTML=receiptHTML(c);$("receipt").classList.add("open");window.scrollTo(0,0)};
$("closeReceipt").onclick=()=>$("receipt").classList.remove("open");$("printReceipt").onclick=()=>window.print();
$("saveBtn").onclick=()=>{const c=calc();if(c.lordo<=0)return alert("Inserisci il compenso lordo.");const h=history();h.push({numero:$("numero").value,data:$("data").value,clienteNome:$("clienteNome").value,lordo:c.lordo,netto:c.netto,imponibile:c.imponibile});setHistory(h);$("cumulato").value=c.dopo;$("numero").value=num($("numero").value)+1;$("lordo").value="";$("clienteNome").value="";$("clienteCf").value="";$("clienteIndirizzo").value="";$("descrizione").value="";calc()};
$("resetYear").onclick=()=>{if(confirm("Ripristinare il registro iniziale 2026?")){localStorage.removeItem("myadmin-ricevute-2026");renderHistory();syncCumulato();$("numero").value=9}};
loadProfile();$("data").value=new Date().toISOString().slice(0,10);renderHistory();syncCumulato();calc();
