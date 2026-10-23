(() => {
  "use strict";
  const KEY = "myadmin-saved-clients-v1";
  const fields = ["clienteNome","clienteCf","clienteIndirizzo"];
  const select = document.getElementById("savedClientSelect");
  if (!select) return;
  const read = () => { try { const data=JSON.parse(localStorage.getItem(KEY)||"[]"); return Array.isArray(data)?data:[]; } catch { return []; } };
  const write = data => localStorage.setItem(KEY,JSON.stringify(data));
  const current = () => Object.fromEntries(fields.map(id=>[id,document.getElementById(id).value.trim()]));
  const identity = item => (item.clienteCf||"").toLowerCase() || (item.clienteNome||"").toLowerCase();
  function refresh(selected="") {
    select.replaceChildren(new Option("— Seleziona committente salvato —",""));
    read().sort((a,b)=>a.clienteNome.localeCompare(b.clienteNome,"it")).forEach(item=>select.add(new Option(item.clienteNome+(item.clienteCf?" · "+item.clienteCf:""),identity(item))));
    select.value=selected;
  }
  function sync() { if(typeof renderPreview==="function") renderPreview(); }
  select.addEventListener("change",()=>{
    const item=read().find(x=>identity(x)===select.value);
    if(!item) return;
    fields.forEach(id=>{document.getElementById(id).value=item[id]||""; document.getElementById(id).dispatchEvent(new Event("input",{bubbles:true}));});
    sync();
  });
  document.getElementById("saveClientBtn").addEventListener("click",()=>{
    const item=current();
    if(!item.clienteNome) { alert("Inserisci prima il nome del committente."); return; }
    const key=identity(item),items=read(),index=items.findIndex(x=>identity(x)===key);
    if(index>=0) items[index]=item; else items.push(item);
    write(items);refresh(key);sync();
  });
  document.getElementById("deleteClientBtn").addEventListener("click",()=>{
    const key=select.value;if(!key) return;
    const item=read().find(x=>identity(x)===key);
    if(!item||!confirm("Eliminare i dati salvati di "+item.clienteNome+"? Le ricevute esistenti non saranno modificate.")) return;
    write(read().filter(x=>identity(x)!==key));refresh();
  });
  fields.forEach(id=>document.getElementById(id).addEventListener("input",()=>{
    const item=current();select.value=read().some(x=>identity(x)===identity(item)&&fields.every(f=>(x[f]||"")===item[f]))?identity(item):"";
  }));
  refresh();
})();