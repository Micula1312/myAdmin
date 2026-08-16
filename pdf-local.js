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
    tableBody.querySelectorAll('tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 6) return;
      const number = Number((cells[0].textContent || '').trim());
      if (!Number.isFinite(number) || !pdfMap.has(number)) {
        cells[5].innerHTML = '<span class="missing">—</span>';
        return;
      }
      const file = pdfMap.get(number);
      const url = URL.createObjectURL(file);
      objectUrls.push(url);
      cells[5].innerHTML = `<a class="pdf-link" href="${url}" target="_blank" rel="noopener">APRI PDF ↗</a>`;
    });
  }

  input.addEventListener('change', () => {
    cleanupUrls();
    pdfMap = new Map();
    const files = Array.from(input.files || []).filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));

    files.forEach(file => {
      const number = receiptNumberFromFilename(file.name);
      if (number !== null && !pdfMap.has(number)) pdfMap.set(number, file);
    });

    status.textContent = `${pdfMap.size} PDF collegati localmente`;
    applyPdfLinks();
  });

  const observer = new MutationObserver(() => {
    if (!pdfMap.size) {
      tableBody.querySelectorAll('tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) cells[5].innerHTML = '<span class="missing">—</span>';
      });
      return;
    }
    cleanupUrls();
    applyPdfLinks();
  });
  observer.observe(tableBody, { childList: true, subtree: true });

  // Nasconde eventuali link hard-coded nel dataset: i PDF devono restare locali.
  requestAnimationFrame(() => {
    tableBody.querySelectorAll('tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 6) cells[5].innerHTML = '<span class="missing">—</span>';
    });
  });
})();
