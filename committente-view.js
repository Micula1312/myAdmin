(() => {
  'use strict';
  const summary = document.getElementById('perspectiveSummary');
  const buttons = [...document.querySelectorAll('[data-perspective]')];
  if (!summary || !buttons.length || typeof formSnapshot !== 'function') return;
  let perspective = sessionStorage.getItem('myadmin-perspective') === 'committente' ? 'committente' : 'prestatrice';
  const money = value => euro(Math.round((Number(value) || 0) * 100) / 100);
  const row = (label, value, strong = false) => '<div class="perspective-row' + (strong ? ' emphasis' : '') + '"><span>' + label + '</span><b>' + money(value) + '</b></div>';
  const originalRenderPreview = renderPreview;
  function updatePerspective() {
    const s = formSnapshot();
    buttons.forEach(button => {
      const active = button.dataset.perspective === perspective;
      button.classList.toggle('perspective-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (perspective === 'committente') {
      const cost = s.lordo + s.inpsCliente;
      summary.innerHTML = '<p class="perspective-label">COSTO COMPLESSIVO PER IL COMMITTENTE</p>' +
        '<strong class="perspective-hero">' + money(cost) + '</strong>' +
        row('Compenso lordo concordato', s.lordo) +
        row('Contributi INPS a carico committente (2/3)', s.inpsCliente) +
        row('Costo totale', cost, true) +
        '<p class="perspective-label perspective-subtitle">RIPARTIZIONE DEL PAGAMENTO</p>' +
        row('Netto da pagare alla prestatrice', s.netto) +
        row('Ritenuta d’acconto da versare', s.ritenuta) +
        row('INPS complessiva da versare (1/3 + 2/3)', s.inpsTot) +
        '<p class="perspective-note">Il netto, la ritenuta e l’INPS totale compongono il costo complessivo. Non sommare nuovamente le trattenute al lordo.</p>';
    } else {
      summary.innerHTML = '<p class="perspective-label">NETTO DA INCASSARE</p>' +
        '<strong class="perspective-hero">' + money(s.netto) + '</strong>' +
        row('Compenso lordo', s.lordo) +
        row('Ritenuta d’acconto', -s.ritenuta) +
        row('INPS a tuo carico (1/3)', -s.inpsMe) +
        row('Netto da incassare', s.netto, true);
    }
  }
  renderPreview = function() { originalRenderPreview(); updatePerspective(); };
  buttons.forEach(button => button.addEventListener('click', () => {
    perspective = button.dataset.perspective;
    sessionStorage.setItem('myadmin-perspective', perspective);
    updatePerspective();
  }));
  // The official receipt is identical from either perspective: it is issued
  // by the prestatrice to the committente, never a client-side invoice.
  const printButton = document.getElementById('printReceiptBtn');
  if (printButton) printButton.textContent = 'STAMPA RICEVUTA PER IL COMMITTENTE / PDF';
  document.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('input', updatePerspective);
    el.addEventListener('change', updatePerspective);
  });
  document.addEventListener('myadmin:paid-rendered', updatePerspective);
  updatePerspective();
})();
