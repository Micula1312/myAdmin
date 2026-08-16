(() => {
  const input = document.getElementById('pdfFolderInput');
  const status = document.getElementById('pdfFolderStatus');
  const list = document.getElementById('paidList');
  if (!input || !status || !list) return;

  let pdfMap = new Map();
  let objectUrls = [];

  function cleanupUrls(){ objectUrls.forEach(url => URL.revokeObjectURL(url)); objectUrls=[]; }
  function numberFromFilename(name){ const m=String(name).match(/^0*(\d{1,4})(?=[\s._-]|\.pdf$)/i); return m?Number(m[1]):null; }

  function apply(){
    cleanupUrls();
    list.querySelectorAll('.paid-card').forEach(card => {
      const slot = card.querySelector('.pdf-slot');
      if(!slot) return;
      const number = Number(card.dataset.receiptNumber);
      if(!Number.isFinite(number) || !pdfMap.has(number)){
        slot.outerHTML='<span class="pdf-slot missing">PDF —</span>';
        return;
      }
      const file=pdfMap.get(number),url=URL.createObjectURL(file);objectUrls.push(url);
      slot.outerHTML=`<a class="pdf-slot pdf-link" href="${url}" target="_blank" rel="noopener">APRI PDF ↗</a>`;
    });
  }

  input.addEventListener('change',()=>{
    pdfMap=new Map();
    Array.from(input.files||[]).filter(f=>f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf')).forEach(file=>{
      const n=numberFromFilename(file.name);if(n!==null&&!pdfMap.has(n))pdfMap.set(n,file);
    });
    status.textContent=`${pdfMap.size} PDF collegati localmente`;
    apply();
  });

  document.addEventListener('myadmin:paid-rendered',()=>{ if(pdfMap.size) apply(); });
})();