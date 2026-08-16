(() => {
  const input = document.getElementById('pdfFolderInput');
  const status = document.getElementById('pdfFolderStatus');
  const list = document.getElementById('paidList');
  if (!input || !status || !list) return;

  let localMap = new Map();
  let serverMap = new Map();
  let objectUrls = [];

  function cleanupUrls(){ objectUrls.forEach(url => URL.revokeObjectURL(url)); objectUrls=[]; }
  function numberFromFilename(name){ const m=String(name).match(/^0*(\d{1,4})(?=[\s._-]|\.pdf$)/i); return m?Number(m[1]):null; }

  function apply(){
    cleanupUrls();
    list.querySelectorAll('.paid-card').forEach(card => {
      const slot = card.querySelector('.pdf-slot');
      if(!slot) return;
      const number = Number(card.dataset.receiptNumber);
      if(!Number.isFinite(number)) return;

      let href = null;
      if(localMap.has(number)){
        href = URL.createObjectURL(localMap.get(number));
        objectUrls.push(href);
      } else if(serverMap.has(number)) {
        href = serverMap.get(number);
      }

      if(!href){ slot.outerHTML='<span class="pdf-slot missing">PDF —</span>'; return; }
      slot.outerHTML=`<a class="pdf-slot pdf-link" href="${href}" target="_blank" rel="noopener">APRI PDF ↗</a>`;
    });
  }

  async function scanServerFolder(){
    try{
      const res = await fetch('/api/pdfs', {cache:'no-store'});
      if(!res.ok) throw new Error('no server');
      const data = await res.json();
      serverMap = new Map(Object.entries(data.files || {}).map(([n,url]) => [Number(n), url]));
      status.textContent = `${serverMap.size} PDF trovati automaticamente in ricevute/2026`;
      input.closest('.folder-button')?.classList.add('fallback-only');
      apply();
    }catch(_){
      status.textContent = 'apri con server.py per collegamento automatico, oppure scegli la cartella';
    }
  }

  input.addEventListener('change',()=>{
    localMap=new Map();
    Array.from(input.files||[]).filter(f=>f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf')).forEach(file=>{
      const n=numberFromFilename(file.name); if(n!==null&&!localMap.has(n)) localMap.set(n,file);
    });
    status.textContent=`${localMap.size} PDF collegati dalla cartella scelta`;
    apply();
  });

  document.addEventListener('myadmin:paid-rendered', apply);
  scanServerFolder();
})();
