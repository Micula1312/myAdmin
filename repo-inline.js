// Repository cards stay compact; the pencil opens the single-repo editor.
// Loaded after projects.js so this renderer replaces the base repository renderer.

function renderRepos(){
  let repos=repoRecords().filter(r=>r.sub.status!=='done');
  repos=repos.filter(r=>scopedProjects().some(p=>p.id===r.project.id));
  repos.sort((a,b)=>({active:0,paused:1}[a.sub.status]??9)-({active:0,paused:1}[b.sub.status]??9)||a.project.name.localeCompare(b.project.name));

  $('repoIndex').innerHTML=repos.length?repos.map(({project:p,sub:s,open})=>`
    <article class="repo-card ${s.status}" data-project="${p.id}" data-sub="${s.id}">
      <div class="repo-card-top">
        <span class="repo-path">${CATEGORY_LABELS[p.category]} / ${esc(p.name)}</span>
        <div class="repo-card-tools">
          <span class="repo-state ${s.status}">${SUB_STATUS_LABELS[s.status]}</span>
          <button type="button" class="repo-inline-edit" title="Modifica repo" aria-label="Modifica ${esc(s.name)}">✎</button>
        </div>
      </div>
      <h3>${esc(s.name)}</h3>
      <div class="repo-task-preview">${(s.tasks||[]).slice(0,4).map(t=>`<div class="repo-task-preview-row ${t.status}"><i></i><span>${esc(t.text)}</span></div>`).join('')||'<span class="empty-board">Nessun task</span>'}</div>
      <div class="task-progress"><i style="width:${taskPctSub(s)}%"></i></div>
      <div class="repo-card-foot"><span>${open} aperti / ${(s.tasks||[]).length}</span><span>${taskPctSub(s)}%${s.repoUrl?' · GIT':''}${s.localPath?' · LOCAL':''}</span></div>
    </article>`).join(''):'<div class="empty-board">Nessun repo attivo in questa selezione.</div>';

  const root=$('repoIndex');
  root.querySelectorAll('.repo-card').forEach(card=>{
    card.onclick=e=>{
      if(e.target.closest('.repo-inline-edit')) return;
      openRepo(card.dataset.project,card.dataset.sub);
    };
    card.querySelector('.repo-inline-edit').onclick=e=>{
      e.stopPropagation();
      openRepoEditor(card.dataset.project,card.dataset.sub);
    };
  });
}

function openRepoEditor(projectId,subId){
  const p=projectById(projectId),s=(p?.subprojects||[]).find(x=>x.id===subId);if(!p||!s)return;
  const dialog=$('repoDialog');
  $('repoDialogTitle').textContent=s.name;
  $('repoDialogMeta').innerHTML=`
    <span class="category-pill">${CATEGORY_LABELS[p.category]}</span>
    <b>${esc(p.name)}</b>
    <span class="repo-edit-caption">MODIFICA REPOSITORY</span>`;

  $('repoTaskList').innerHTML=`
    <section class="repo-sheet-editor" data-project="${p.id}" data-sub="${s.id}">
      <div class="repo-sheet-grid">
        <label>Nome repo<input id="sheetRepoName" value="${esc(s.name)}"></label>
        <label>Stato<select id="sheetRepoStatus"><option value="active">Attivo</option><option value="paused">In pausa</option><option value="done">Chiuso</option></select></label>
        <label>GitHub URL<input id="sheetRepoUrl" value="${esc(s.repoUrl||'')}" placeholder="https://github.com/..."></label>
        <label>Path locale<input id="sheetRepoPath" value="${esc(s.localPath||'')}" placeholder="C:/Users/.../repository"></label>
      </div>
      <div class="repo-sheet-section-head"><div><p class="eyebrow">TASK</p><h3>Attività del repo</h3></div><button type="button" id="sheetAddTask" class="ghost">+ TASK</button></div>
      <div id="sheetTaskList" class="sheet-task-list"></div>
      <div class="repo-sheet-actions">
        <button type="button" id="sheetDeleteRepo" class="danger-btn">ELIMINA REPO</button>
        <div><button type="button" id="sheetCancelRepo" class="ghost">ANNULLA</button><button type="button" id="sheetSaveRepo" class="primary">SALVA</button></div>
      </div>
    </section>`;
  $('sheetRepoStatus').value=s.status||'active';
  (s.tasks||[]).forEach(t=>addSheetTask(t));
  $('sheetAddTask').onclick=()=>addSheetTask();
  $('sheetCancelRepo').onclick=()=>dialog.close();
  $('sheetSaveRepo').onclick=async()=>{
    const name=$('sheetRepoName').value.trim();if(!name)return alert('Inserisci il nome del repo.');
    s.name=name;
    s.status=$('sheetRepoStatus').value;
    s.repoUrl=$('sheetRepoUrl').value.trim();
    s.localPath=$('sheetRepoPath').value.trim();
    s.tasks=[...document.querySelectorAll('#sheetTaskList .sheet-task-row')].map(row=>({
      id:row.dataset.task||uid('t'),
      status:row.querySelector('.sheet-task-status').value,
      text:row.querySelector('.sheet-task-text').value.trim()
    })).filter(t=>t.text);
    dialog.close();
    await saveState();
  };
  $('sheetDeleteRepo').onclick=async()=>{
    if(!confirm('Eliminare questo repo e tutti i suoi task?'))return;
    p.subprojects=p.subprojects.filter(x=>x.id!==s.id);
    dialog.close();
    await saveState();
  };
  dialog.showModal();
  setTimeout(()=>$('sheetRepoName')?.focus(),50);
}

function addSheetTask(t={id:uid('t'),text:'',status:'todo'}){
  const list=$('sheetTaskList');
  const row=document.createElement('div');row.className='sheet-task-row';row.dataset.task=t.id||uid('t');
  row.innerHTML=`
    <select class="sheet-task-status"><option value="todo">○ Da fare</option><option value="doing">◐ In corso</option><option value="blocked">! Bloccato</option><option value="done">✓ Fatto</option></select>
    <input class="sheet-task-text" value="${esc(t.text||'')}" placeholder="Cosa devo fare?">
    <button type="button" class="sheet-task-delete">×</button>`;
  row.querySelector('.sheet-task-status').value=t.status||'todo';
  row.querySelector('.sheet-task-delete').onclick=()=>row.remove();
  list.appendChild(row);
  if(!t.text)setTimeout(()=>row.querySelector('.sheet-task-text')?.focus(),0);
}
