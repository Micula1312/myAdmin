// Detailed task editor used inside the Movement sheet.
// Tasks ARE todos. A weekly slot is optional; assigned tasks surface automatically in that week's home view.
function addTaskRow(container,t={id:uid('t'),text:'',status:'todo',week:'',hours:0,notes:'',reminder:false,completedAt:''}){
  const row=document.createElement('div');
  row.className='task-row task-row-detailed';
  row.dataset.id=t.id||uid('t');
  row.dataset.completedAt=t.completedAt||'';
  row.innerHTML=`
    <select class="task-status"><option value="todo">○ Da fare</option><option value="doing">◐ In corso</option><option value="blocked">! Bloccato</option><option value="done">✓ Fatto</option></select>
    <input class="task-text" value="${esc(t.text||'')}" placeholder="Task / to do">
    <input class="task-week" type="week" value="${esc(t.week||'')}" title="Slot settimanale">
    <label class="task-hours"><input class="task-hours-input" type="number" min="0" step="0.25" value="${Number(t.hours)||''}" placeholder="0"><span>h</span></label>
    <label class="task-reminder" title="Promemoria futuro"><input class="task-reminder-input" type="checkbox" ${t.reminder?'checked':''}><span>◉</span></label>
    <button type="button" class="task-remove">×</button>
    <textarea class="task-notes" rows="2" placeholder="Note / dettagli / riferimenti…">${esc(t.notes||'')}</textarea>`;
  row.querySelector('.task-status').value=t.status||(t.done?'done':'todo');
  row.querySelector('.task-remove').onclick=()=>row.remove();
  container.appendChild(row);
}

function readSubprojects(){
  return [...document.querySelectorAll('.subproject-block')].map(b=>({
    id:b.dataset.id||uid('sub'),
    name:b.querySelector('.sub-name').value.trim(),
    status:b.querySelector('.sub-status').value,
    repoUrl:b.querySelector('.sub-repo').value.trim(),
    localPath:b.querySelector('.sub-path').value.trim(),
    tasks:[...b.querySelectorAll('.task-row')].map(r=>{
      const status=r.querySelector('.task-status').value;
      let completedAt=r.dataset.completedAt||'';
      if(status==='done'&&!completedAt)completedAt=todayKey();
      if(status!=='done')completedAt='';
      return {
        id:r.dataset.id||uid('t'),
        text:r.querySelector('.task-text').value.trim(),
        status,
        week:r.querySelector('.task-week')?.value||'',
        hours:Number(r.querySelector('.task-hours-input')?.value)||0,
        notes:r.querySelector('.task-notes')?.value.trim()||'',
        reminder:!!r.querySelector('.task-reminder-input')?.checked,
        completedAt
      };
    }).filter(t=>t.text)
  })).filter(s=>s.name||s.tasks.length);
}