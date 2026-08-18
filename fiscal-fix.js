// INPS cash-basis correction for occasional work.
// The €5,000 contributive threshold is based on compensation actually paid/received.
// Pending receipts must not consume the threshold until they are marked as paid.
(function(){
  if(typeof pendingComputed !== 'function' || typeof paidTotal !== 'function' || typeof calcFrom !== 'function') return;

  pendingComputed = function(){
    const actuallyPaid = paidTotal();
    return state.pending.map((r,i)=>{
      const c=calcFrom(
        actuallyPaid,
        num(r.lordo),
        {...settingsFromForm(), sostituto:r.sostituto!==false}
      );
      return {
        ...r,
        numero:num(state.lastConfirmed)+i+1,
        cumulatoPrima:actuallyPaid,
        ...c
      };
    });
  };

  // Refresh once with the corrected cash-basis calculation.
  if(typeof renderAll === 'function') renderAll();
})();
