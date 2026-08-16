const fragmentsA=['Forse devo smettere di chiamarlo sito e iniziare a chiamarlo dispositivo.','Oggi faccio solo le cose che hanno davvero bisogno di esistere.','Se una cosa può stare in tre cartelle contemporaneamente probabilmente è organizzata bene.','Il problema non è il caos, è che non ha ancora una buona interfaccia.','Prima lo faccio funzionare, poi capiamo che cosa abbiamo costruito.','Un archivio non è mai finito, al massimo cambia stato.'];
const fragmentsB=['Potrei farlo più semplice, ma così mi annoio.','Comunque questa cosa potrebbe diventare un software.','La grafica viene dopo: prima devo capire la logica.','Forse ci serve una regia, non un altro menu.','Lo mettiamo nel repo e poi vediamo.','Sì, ma deve rimanere vivo.'];
const thought=document.getElementById('homeThought');

async function archiveThought(text){
  try{
    await fetch('/api/brain/thoughts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,source:'auto-micol-local-v0',model:'fragment-combinator-v0',context:'homepage'})});
  }catch(e){
    const key='auto-micol-thoughts-fallback';
    const rows=JSON.parse(localStorage.getItem(key)||'[]');
    rows.push({text,source:'auto-micol-local-v0',model:'fragment-combinator-v0',context:'homepage',createdAt:new Date().toISOString()});
    localStorage.setItem(key,JSON.stringify(rows));
  }
}

async function saySomething(){
  const text=fragmentsA[Math.floor(Math.random()*fragmentsA.length)]+' '+fragmentsB[Math.floor(Math.random()*fragmentsB.length)];
  thought.textContent=text;
  await archiveThought(text);
}

document.getElementById('regenerateThought').onclick=saySomething;
saySomething();