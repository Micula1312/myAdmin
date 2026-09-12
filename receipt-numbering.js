(() => {
  const numberInput = document.getElementById('numero');
  if (!numberInput) return;

  // The receipt number is a fiscal/document identifier, not the payment order.
  // Keep it user-editable and only suggest the next number from the current year register.
  numberInput.readOnly = false;
  numberInput.min = '1';
  numberInput.step = '1';
  numberInput.title = 'Numero proposto dal registro annuale; puoi correggerlo manualmente.';

  function usedNumbers(exceptPendingId = null) {
    const nums = [];
    (state?.paid || []).forEach(r => {
      const n = num(r.numero);
      if (n > 0) nums.push(n);
    });
    (state?.pending || []).forEach(r => {
      if (exceptPendingId && r.id === exceptPendingId) return;
      const n = num(r.numero);
      if (n > 0) nums.push(n);
    });
    return nums;
  }

  function suggestedNextNumber() {
    const nums = usedNumbers();
    return nums.length ? Math.max(...nums) + 1 : 1;
  }

  // Override the global helper used by app.js after this script loads.
  window.nextNumber = suggestedNextNumber;

  // Existing pending receipts without a stored number get one once, then keep it.
  function ensurePendingNumbers() {
    const used = new Set((state?.paid || []).map(r => num(r.numero)).filter(Boolean));
    let candidate = used.size ? Math.max(...used) + 1 : 1;
    (state?.pending || []).forEach(r => {
      if (num(r.numero) > 0) {
        used.add(num(r.numero));
        candidate = Math.max(candidate, num(r.numero) + 1);
        return;
      }
      while (used.has(candidate)) candidate++;
      r.numero = candidate;
      used.add(candidate++);
    });
  }

  function refreshBlankNumber() {
    if (!editingPendingId) numberInput.value = suggestedNextNumber();
  }

  // Preserve a manually selected number when saving a pending receipt.
  const originalSave = window.savePendingFromForm;
  if (typeof originalSave === 'function') {
    window.savePendingFromForm = function () {
      const chosen = num(numberInput.value);
      if (!chosen) return alert('Inserisci un numero di ricevuta valido.');
      const duplicate = usedNumbers(editingPendingId).includes(chosen);
      if (duplicate && !confirm(`Il numero ${chosen} risulta già usato nel registro 2026. Vuoi usarlo comunque?`)) return;

      const beforeId = editingPendingId;
      originalSave();
      const target = beforeId
        ? state.pending.find(r => r.id === beforeId)
        : state.pending[state.pending.length - 1];
      if (target) target.numero = chosen;
      saveAndRender();
      refreshBlankNumber();
    };
    const saveBtn = document.getElementById('savePendingBtn');
    if (saveBtn) saveBtn.onclick = window.savePendingFromForm;
  }

  // Pending display keeps the stored document number; drag changes planning order only.
  const originalPendingComputed = window.pendingComputed;
  if (typeof originalPendingComputed === 'function') {
    window.pendingComputed = function () {
      let running = paidTotal();
      return state.pending.map(r => {
        const c = calcFrom(running, num(r.lordo), {...settingsFromForm(), sostituto:r.sostituto!==false});
        const out = {...r, numero:num(r.numero) || suggestedNextNumber(), cumulatoPrima:running, ...c};
        running += num(r.lordo);
        return out;
      });
    };
  }

  // When a receipt becomes paid, keep its document number instead of assigning lastConfirmed+1.
  window.markFirstPaid = function () {
    if (!state.pending.length) return;
    const r = state.pending.shift();
    const cumulatoPrima = paidTotal();
    const number = num(r.numero) || suggestedNextNumber();
    const c = calcFrom(cumulatoPrima, num(r.lordo), {...settingsFromForm(), sostituto:r.sostituto!==false});
    const snapshot = {numero:number,data:r.data||new Date().toISOString().slice(0,10),descrizione:r.descrizione||'',clienteNome:r.clienteNome||'',clienteCf:r.clienteCf||'',clienteIndirizzo:r.clienteIndirizzo||'',prestatore:profile(),...c};
    state.paid.push({numero:number,clienteNome:r.clienteNome,tipo:'Prestazione occasionale',lordo:r.lordo,netto:c.netto,data:snapshot.data,descrizione:snapshot.descrizione,snapshot});
    state.lastConfirmed = Math.max(0, ...state.paid.map(x => num(x.numero)));
    editingPendingId = null;
    saveAndRender();
    clearForm();
    refreshBlankNumber();
  };

  ensurePendingNumbers();
  localSave();
  renderAll();
  refreshBlankNumber();
})();