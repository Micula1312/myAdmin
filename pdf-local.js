(() => {
  const input = document.getElementById('pdfFolderInput');
  const status = document.getElementById('pdfFolderStatus');
  const tableBody = document.getElementById('historyBody');
  if (!input || !status || !tableBody) return;

  let pdfMap = new Map();
  let objectUrls = [];

  function cleanupUrls() {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];
  }

  function receiptNumberFromFilename(name) {
    const match = String(name).match(/^0*(\d{1,4})(?=[\s._-]|\.pdf$)/i);
    return match ? Number(match[1]) : null;
  }

  function applyPdfLinks() {
    cleanupUrls();

    tableBody.querySelectorAll('tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 6) return;

      const number = Number((cells[0].textContent || '').trim());
      const pdfCell = cells[5];

      if (!Number.isFinite(number) || !pdfMap.has(number)) {
        pdfCell.innerHTML = '<span class="missing">—</span>';
        return;
      }

      const file = pdfMap.get(number);
      const url = URL.createObjectURL(file);
      objectUrls.push(url);
      pdfCell.innerHTML = `<a class="pdf-link" href="${url}" target="_blank" rel="noopener">APRI PDF ↗</a>`;
    });
  }

  input.addEventListener('change', () => {
    pdfMap = new Map();

    const files = Array.from(input.files || []).filter(file =>
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );

    files.forEach(file => {
      const number = receiptNumberFromFilename(file.name);
      if (number !== null && !pdfMap.has(number)) {
        pdfMap.set(number, file);
      }
    });

    status.textContent = `${pdfMap.size} PDF collegati localmente`;
    applyPdfLinks();
  });

  /*
   * Osserviamo SOLO l'aggiunta/rimozione delle righe direttamente nel tbody.
   * Non usiamo subtree:true: applyPdfLinks() modifica le celle e con subtree
   * attivo il MutationObserver si richiamerebbe all'infinito, bloccando la pagina.
   */
  const observer = new MutationObserver(() => {
    applyPdfLinks();
  });
  observer.observe(tableBody, { childList: true, subtree: false });

  // I PDF sono esclusivamente locali: rimuove eventuali link presenti nei dati iniziali.
  requestAnimationFrame(applyPdfLinks);

  window.addEventListener('beforeunload', cleanupUrls);
})();
