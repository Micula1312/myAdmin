(() => {
  const MINIMALE_2026 = 18808;
  const ALIQUOTA_OCCASIONALE_2026 = 33.72;
  const CONTRIBUTO_ANNO_PIENO_2026 = 6342.06;
  const FRANCHIGIA_OCCASIONALE = 5000;

  const euro = n => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  const num = v => Number(v)||0;

  async function loadPaid(){
    try {
      const res = await fetch('/api/state', {cache:'no-store'});
      if (!res.ok) throw new Error('state unavailable');
      const data = await res.json();
      return Array.isArray(data.paid) ? data.paid : [];
    } catch (e) {
      console.warn('[previdenza] impossibile leggere /api/state', e);
      return [];
    }
  }

  async function renderPrevidenza(){
    const box = document.getElementById('previdenza2026');
    if (!box) return;

    box.innerHTML = '<div class="previdenza-head"><div><p class="eyebrow">PREVIDENZA 2026</p><h2>Accredito contributivo</h2></div><strong>…</strong></div>';

    const paid = await loadPaid();
    const compensi = paid.filter(r => !r.excluded).reduce((sum,r) => sum + num(r.lordo), 0);
    const imponibile = Math.max(0, compensi - FRANCHIGIA_OCCASIONALE);
    const contributi = imponibile * ALIQUOTA_OCCASIONALE_2026 / 100;
    const quotaLavoratrice = contributi / 3;
    const quotaCommittenti = contributi - quotaLavoratrice;
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
        <div><small>Contributi complessivi</small><b>${euro(contributi)}</b></div>
        <div><small>Tua quota stimata</small><b>${euro(quotaLavoratrice)}</b></div>
        <div><small>Quota committenti</small><b>${euro(quotaCommittenti)}</b></div>
      </div>
      <div class="previdenza-progress"><i style="width:${progress}%"></i></div>
      <p class="archive-note">${mancanti>0 ? `Mancano circa <b>${euro(mancanti)}</b> di compensi occasionali incassati per raggiungere il target teorico di <b>${euro(targetCompensi)}</b> (${euro(MINIMALE_2026)} di imponibile contributivo).` : '<b>Target teorico per 12 mesi raggiunto.</b>'} Stima gestionale: l’accredito INPS effettivo dipende dai contributi registrati sulla posizione e da eventuali altri rapporti in Gestione Separata nello stesso anno.</p>`;
  }

  function ensureEmployerCostBox(){
    const preview = document.querySelector('.preview-panel');
    const warning = document.getElementById('warning');
    if (!preview || !warning) return null;

    let box = document.getElementById('employerCostBox');
    if (!box) {
      box = document.createElement('section');
      box.id = 'employerCostBox';
      box.setAttribute('aria-live','polite');
      box.style.margin = '14px 0';
      box.style.padding = '14px';
      box.style.border = '1px solid currentColor';
      box.style.borderRadius = '10px';
      box.style.background = 'rgba(127,127,127,.06)';
      warning.insertAdjacentElement('afterend', box);
    }
    return box;
  }

  function renderEmployerCost(){
    const box = ensureEmployerCostBox();
    if (!box || typeof formSnapshot !== 'function') return;

    const s = formSnapshot();
    const quotaCliente = Number(s.inpsCliente) || 0;
    const costoTotale = (Number(s.lordo) || 0) + quotaCliente;
    const hasInps = (Number(s.imponibile) || 0) > 0;

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:10px">
        <div><p class="eyebrow" style="margin:0 0 3px">COSTO COMMITTENTE</p><b style="font-size:1.05rem">Quanto costa davvero questa prestazione</b></div>
        <strong style="font-size:1.2rem;white-space:nowrap">${euro(costoTotale)}</strong>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:5px 16px;font-size:.92rem">
        <span>Compenso lordo</span><b>${euro(s.lordo)}</b>
        <span>Quota INPS committente (2/3)</span><b>${euro(quotaCliente)}</b>
        <span>Ritenuta d'acconto</span><b>${euro(s.ritenuta)}</b>
      </div>
      <p class="archive-note" style="margin:10px 0 0">${hasInps ? `L'INPS è calcolata solo su <b>${euro(s.imponibile)}</b>, cioè sulla parte eccedente la franchigia. ` : ''}La ritenuta d'acconto è trattenuta dal tuo lordo e <b>non aumenta</b> il costo del committente.</p>`;
  }

  // Aggancia il riquadro al normale aggiornamento live della ricevuta.
  if (typeof renderPreview === 'function') {
    const baseRenderPreview = renderPreview;
    renderPreview = function(){
      baseRenderPreview();
      renderEmployerCost();
    };
  }

  window.renderPrevidenza2026 = renderPrevidenza;
  window.renderEmployerCost = renderEmployerCost;
  window.addEventListener('DOMContentLoaded', () => { renderPrevidenza(); renderEmployerCost(); });
  window.addEventListener('focus', renderPrevidenza);
  document.addEventListener('myadmin:paid-rendered', () => setTimeout(renderPrevidenza, 50));

  // Gli script sono caricati a fondo pagina: aggiorna subito anche senza attendere DOMContentLoaded.
  renderEmployerCost();
})();
