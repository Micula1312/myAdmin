// Drag & drop + ricalcolo progressivo delle ricevute incassate.
// L'ordine interno di state.paid resta cronologico (dal numero più basso al più alto),
// mentre la UI lo mostra al contrario, con la ricevuta più recente in cima.

(function(){
  function receiptNumberSlots(){
    return state.paid
      .map(r=>num(r.numero))
      .filter(n=>n>0)
      .sort((a,b)=>a-b);
  }

  function recalcPaidOrder(){
    // Conserviamo i numeri già esistenti (anche eventuali buchi):
    // trascinando, il numero segue la nuova posizione cronologica.
    const slots=receiptNumberSlots();
    let running=0;

    state.paid.forEach((r,i)=>{
      const number=slots[i] ?? (i ? num(state.paid[i-1].numero)+1 : 1);
      r.numero=number;

      if(r.excluded){
        r.cumulatoPrima=running;
        r.imponibile=0;
        if(r.snapshot) r.snapshot={...r.snapshot,numero:number,cumulato:running,imponibile:0,dopo:running};
        return;
      }

      const sostituto=r.snapshot ? r.snapshot.sostituto!==false : true;
      const c=calcFrom(running,num(r.lordo),{...settingsFromForm(),sostituto});
      r.cumulatoPrima=running;
      r.imponibile=c.imponibile;
      r.netto=c.netto;

      if(r.snapshot){
        r.snapshot={
          ...r.snapshot,
          numero:number,
          ...c,
          lordo:num(r.lordo)
        };
      }

      running+=num(r.lordo);
    });

    state.lastConfirmed=Math.max(0,...state.paid.map(r=>num(r.numero)));
  }

  function paidComputed(){
    let running=0;
    return state.paid.map((r,i)=>{
      if(r.excluded){
        return {...r,_index:i,cumulatoPrima:running,imponibile:0};
      }
      const sostituto=r.snapshot ? r.snapshot.sostituto!==false : true;
      const c=calcFrom(running,num(r.lordo),{...settingsFromForm(),sostituto});
      const out={...r,_index:i,cumulatoPrima:running,imponibile:c.imponibile};
      running+=num(r.lordo);
      return out;
    });
  }

  renderPaid=function(){
    const list=$("paidList");
    list.innerHTML="";
    const computed=paidComputed();

    [...computed].reverse().forEach(r=>{
      const i=r._index;
      const card=document.createElement("article");
      card.className="flow-card paid-card";
      card.draggable=true;
      card.dataset.index=String(i);
      card.dataset.receiptNumber=r.numero;

      const fiscalLine=r.excluded
        ? "esclusa dalla soglia INPS"
        : `${euro(r.cumulatoPrima)} prima · ${r.imponibile>0 ? `INPS su ${euro(r.imponibile)}` : "dentro franchigia"}`;

      card.innerHTML=`<div class="drag-handle">⋮⋮</div><div class="flow-num">${r.numero??"—"}</div><div class="flow-main"><b>${r.clienteNome||"—"}</b><small>${r.tipo||"Prestazione occasionale"}</small><small>${fiscalLine}</small></div><div class="flow-money">${euro(r.lordo)}</div><div class="flow-actions"><span class="pdf-slot missing">PDF —</span>${r.snapshot?`<button class="mini revisit-paid" data-i="${i}">RIVEDI / STAMPA</button>`:""}<button class="mini reopen-paid" data-i="${i}">RIMETTI IN SOSPESO</button><button class="mini danger delete-paid" data-i="${i}">ELIMINA</button></div>`;
      list.appendChild(card);
    });

    let draggedIndex=null;
    list.querySelectorAll(".paid-card").forEach(card=>{
      card.ondragstart=()=>{
        draggedIndex=Number(card.dataset.index);
        card.classList.add("dragging");
      };
      card.ondragend=()=>{
        draggedIndex=null;
        card.classList.remove("dragging");
      };
      card.ondragover=e=>e.preventDefault();
      card.ondrop=e=>{
        e.preventDefault();
        const targetIndex=Number(card.dataset.index);
        if(draggedIndex===null || draggedIndex===targetIndex) return;

        const [item]=state.paid.splice(draggedIndex,1);
        state.paid.splice(targetIndex,0,item);
        recalcPaidOrder();
        saveAndRender();
      };
    });

    list.querySelectorAll(".revisit-paid").forEach(b=>b.onclick=()=>openPaid(+b.dataset.i));
    list.querySelectorAll(".reopen-paid").forEach(b=>b.onclick=()=>reopenPaid(+b.dataset.i));
    list.querySelectorAll(".delete-paid").forEach(b=>b.onclick=()=>deletePaid(+b.dataset.i));
    document.dispatchEvent(new CustomEvent("myadmin:paid-rendered"));
  };

  // Rende subito attiva la nuova vista dopo il caricamento di app.js.
  renderAll();
})();
