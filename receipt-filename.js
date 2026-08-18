(function(){
  function receiptFilename(s){
    const n=Number(s?.numero)||Number(document.getElementById('numero')?.value)||1;
    const padded=String(n).padStart(2,'0');
    const client=(typeof slug==='function'?slug(s?.clienteNome||document.getElementById('clienteNome')?.value||'committente'):'committente')||'committente';
    return `${padded}-${client}-n${n}`;
  }

  function updateSuggestedFilename(){
    const el=document.getElementById('suggestedFilename');
    if(!el)return;
    let s=null;
    try{s=typeof formSnapshot==='function'?formSnapshot():null}catch(_){}
    el.textContent=`${receiptFilename(s)}.pdf`;
  }

  if(typeof renderPreview==='function'){
    const baseRenderPreview=renderPreview;
    renderPreview=function(){
      const out=baseRenderPreview.apply(this,arguments);
      updateSuggestedFilename();
      return out;
    };
  }

  if(typeof printSnapshot==='function'){
    printSnapshot=function(s){
      if(!s)return;
      const previousTitle=document.title;
      const filename=receiptFilename(s);
      document.title=filename;
      const paper=document.getElementById('printPaper');
      const view=document.getElementById('printView');
      if(paper)paper.innerHTML=receiptHTML(s,false);
      if(view)view.classList.add('active');

      const restore=()=>{
        document.title=previousTitle;
        if(view)view.classList.remove('active');
        window.removeEventListener('afterprint',restore);
      };
      window.addEventListener('afterprint',restore);
      setTimeout(()=>window.print(),80);
    };
  }

  updateSuggestedFilename();
})();
