// Repository cards stay compact; the pencil opens the single-repo editor.
function renderRepos(){const root=$('repoIndex');if(!root)return;let repos=repoRecords().filter(r=>r.sub.status!=='done');repos=repos.filter(r=>scopedProjects().some(p=>p.id===r.project.id));repos.sort((a,b)=>({active:0,paused:1}[a.sub.status]??9)-({active:0,paused:1}[b.sub.status]??9)||a.project.name.localeCompare(b.project.name));root.innerHTML=repos.length?repos.map(({project:p,sub:s})=>`<article class="repo-card ${s.status}" data-project="${p.id}" data-sub="${s.id}"><div class="repo-card-top"><span class="repo-path">${CATEGORY_LABELS[p.category]} / ${esc(p.name)}</span><div class="repo-card-tools"><span class="repo-state ${s.status}">${SUB_STATUS_LABELS[s.status]}</span><button type="button" class="repo-inline-edit" title="Modifica repo">✎</button></div></div><h3>${esc(s.name)}</h3></article>`).join(''):'<div class="empty-board">Nessun repo attivo.</div>';root.querySelectorAll('.repo-card').forEach(card=>{card.onclick=e=>{if(e.target.closest('.repo-inline-edit'))return;openRepo(card.dataset.project,card.dataset.sub)};card.querySelector('.repo-inline-edit').onclick=e=>{e.stopPropagation();openRepoEditor(card.dataset.project,card.dataset.sub)}})}

function repoWeekKey(){const d=new Date(),x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7));const y=new Date(Date.UTC(x.getUTCFullYear(),0,1));return `${x.getUTCFullYear()}-W${String(Math.ceil((((x-y)/86400000)+1)/7)).padStart(2,'0')}`}

function openRepoEditor(projectId,subId){
  const p=projectById(projectId),s=(p?.subprojects||[]).find(x=>x.id===subId);if(!p||!s)return;
  const dialog=$('repoDialog');$('repoDialogTitle').textContent=s.name;$('repoDialogMeta').innerHTML=`<span class="category-pill">${CATEGORY_LABELS[p.category]}</span><b>${esc(p.name)}</b><span class="repo-edit-caption">MODIFICA REPOSITORY</span>`;
  $('repoTaskList').innerHTML=`<section class="repo-sheet-editor" data-project="${p.id}" data-sub="${s.id}">
    <div class="repo-sheet-grid"><label>Nome repo<input id="sheetRepoName" value="${esc(s.name)}"></label><label>Stato<select id="sheetRepoStatus"><option value="active">Attivo</option><option value="paused">In pausa</option><option value="done">Chiuso</option></select></label><label>GitHub URL<input id="sheetRepoUrl" value="${esc(s.repoUrl||'')}"></label><label>Path locale<input id="sheetRepoPath" value="${esc(s.localPath||'')}"></label></div>
    <div class="repo-sheet-section-head"><div><p class="eyebrow">TASK / TO DO</p><h3>Attività del repo</h3><small>Gli stessi task alimentano la To do della home.</small></div><button type="button" id="sheetAddTask" class="ghost">+ TASK</button></div>
    <div id="sheetTaskList" class="sheet-task-list refined-task-list"></div>
    <div class="repo-sheet-actions"><button type="button" id="sheetDeleteRepo" class="danger-btn">ELIMINA REPO</button><div><button type="button" id="sheetCancelRepo" class="ghost">ANNULLA</button><button type="button" id="sheetSaveRepo" class="primary">SALVA</button></div></div>
  </section>`;
  $('sheetRepoStatus').value=s.status||'active';(s.tasks||[]).forEach(t=>addSheetTask(t));$('sheetAddTask').onclick=()=>addSheetTask();$('sheetCancelRepo').onclick=()=>dialog.close();
  $('sheetSaveRepo').onclick=async()=>{const name=$('sheetRepoName').value.trim();if(!name)return alert('Inserisci il nome del repo.');s.name=name;s.status=$('sheetRepoStatus').value;s.repoUrl=$('sheetRepoUrl').value.trim();s.localPath=$('sheetRepoPath').value.trim();s.tasks=[...document.querySelectorAll('#sheetTaskList .sheet-task-row')].map(row=>{const status=row.querySelector('.sheet-task-status').value;let completedAt=row.dataset.completedAt||'';if(status==='done'&&!completedAt)completedAt=todayKey();if(status!=='done')completedAt='';return{id:row.dataset.task||uid('t'),status,text:row.querySelector('.sheet-task-text').value.trim(),week:row.querySelector('.sheet-task-week').value.trim(),date:row.querySelector('.sheet-task-date').value||'',hours:Number(row.querySelector('.sheet-task-hours').value)||0,notes:row.querySelector('.sheet-task-notes').value.trim(),reminder:row.querySelector('.sheet-task-reminder').checked,completedAt}}).filter(t=>t.text);dialog.close();await saveState()};
  $('sheetDeleteRepo').onclick=async()=>{if(!confirm('Eliminare questo repo e tutti i suoi task?'))return;p.subprojects=p.subprojects.filter(x=>x.id!==s.id);dialog.close();await saveState()};dialog.showModal();setTimeout(()=>$('sheetRepoName')?.focus(),50)
}

function addSheetTask(t={id:uid('t'),text:'',status:'todo',week:'',date:'',hours:0,notes:'',reminder:false,completedAt:''}){
  const list=$('sheetTaskList'),row=document.createElement('article');row.className='sheet-task-row refined-task';row.dataset.task=t.id||uid('t');row.dataset.completedAt=t.completedAt||'';
  row.innerHTML=`
    <div class="refined-task-main">
      <select class="sheet-task-status"><option value="todo">○ Da fare</option><option value="doing">◐ In corso</option><option value="blocked">! Bloccato</option><option value="done">✓ Fatto</option></select>
      <input class="sheet-task-text" value="${esc(t.text||'')}" placeholder="Cosa devo fare?">
      <button type="button" class="sheet-task-delete" title="Elimina task">×</button>
    </div>
    <div class="refined-task-meta">
      <label><span>Settimana</span><input class="sheet-task-week" type="week" value="${esc(t.week||'')}"></label>
      <label><span>Data</span><input class="sheet-task-date" type="date" value="${esc(t.date||'')}"></label>
      <label><span>Ore</span><input class="sheet-task-hours" type="number" min="0" step="0.25" value="${Number(t.hours)||''}" placeholder="0"></label>
      <label class="refined-reminder"><span>Reminder</span><input class="sheet-task-reminder" type="checkbox" ${t.reminder?'checked':''}></label>
      <button type="button" class="sheet-this-week" title="Assegna alla settimana corrente">THIS WEEK</button>
    </div>
    <textarea class="sheet-task-notes" rows="2" placeholder="Note / dettagli / riferimenti…">${esc(t.notes||'')}</textarea>`;
  row.querySelector('.sheet-task-status').value=t.status||'todo';row.querySelector('.sheet-task-delete').onclick=()=>row.remove();row.querySelector('.sheet-this-week').onclick=()=>{row.querySelector('.sheet-task-week').value=repoWeekKey()};list.appendChild(row);if(!t.text)setTimeout(()=>row.querySelector('.sheet-task-text')?.focus(),0)
}