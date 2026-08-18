(() => {
  const MINIMALE_2026 = 18808;
  const ALIQUOTA_OCCASIONALE_2026 = 33.72;
  const CONTRIBUTO_ANNO_PIENO_2026 = 6342.06;
  const FRANCHIGIA_OCCASIONALE = 5000;

  const euro = n => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  const num = v => Number(v)||0;

  function paidOccasionalTotal(){
    if (!window.state?.paid) return 0;
    return state.paid.filter(r => !r.excluded).reduce((sum,r) => sum + num(r.lordo), 0);
  }

  function renderPrevidenza(){
    const box = document.getElementById('previdenza2026');
    if (!box) return;
    const compensi = paidOccasionalTotal();
    const imponibile = Math.max(0, compensi - FRANCHIGIA_OCCASIONALE);
    const contributi = imponibile * ALIQUOTA_OCCASIONALE_2026 / 100;
    const mesiRaw = contributi / CONTRIBUTO_ANNO_PIENO_2026 * 12;
    const mesi = Math.min(12, mesiRaw);
    const progress = Math.min(100, contributi / CONTRIBUTO_ANNO_PIENO_2026 * 100);
    const targetCompensi = FRANCHIGIA_OCCASIONALE + MINIMALE_2026;
    const mancanti = Math.max(0, targetCompensi - compensi);

    box.innerHTML = `
      <div class="previdenza-head">
        <div><p class="eyebrow">PREVIDENZA 2026</p><h2>Accredito contributivo</h2></div>
        <strong>${mesi.toFixed(1).replace('.',',')} / 12 mesi</strong>
      </div>
      <div class="previdenza-grid">
        <div><small>Imponibile INPS</small><b>${euro(imponibile)}</b></div>
        <div><small>Contributi complessivi stimati</small><b>${euro(contributi)}</b></div>
        <div><small>Contributo per 12 mesi</small><b>${euro(CONTRIBUTO_ANNO_PIENO_2026)}</b></div>
        <div><small>Target compensi teorico*</small><b>${euro(targetCompensi)}</b></div>
      </div>
      <div class="previdenza-progress"><i style="width:${progress}%"></i></div>
      <p class="archive-note">${mancanti>0 ? `Al ritmo attuale mancano circa <b>${euro(mancanti)}</b> di compensi occasionali incassati per raggiungere un imponibile contributivo di ${euro(MINIMALE_2026)}.` : '<b>Target teorico per 12 mesi raggiunto.</b>'} *Stima gestionale: l’accredito INPS effettivo dipende dai contributi registrati sulla tua posizione e da eventuali altri rapporti in Gestione Separata nello stesso anno.</p>`;
  }

  const oldRenderAll = window.renderAll;
  if (typeof oldRenderAll === 'function') {
    window.renderAll = function(){ oldRenderAll(); renderPrevidenza(); };
  }
  window.addEventListener('load', () => setTimeout(renderPrevidenza, 250));
  document.addEventListener('myadmin:paid-rendered', renderPrevidenza);
})();
