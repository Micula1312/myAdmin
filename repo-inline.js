// Inline editor for repository/subproject cards.
// Loaded after projects.js so this renderRepos() replaces the read-only renderer.

function renderRepos(){
  let repos=repoRecords().filter(r=>r.sub.status!=='done');
  repos=repos.filter(r=>scopedProjects().some(p=>p.id===r.project.id));
  repos.sort((a,b)=>({active:0,paused:1}[a.sub.status]??9)-({active:0,paused:1}[b.sub.status]??9)||a.project.name.localeCompare(b.project.name));

  $('repoIndex').innerHTML=repos.length?repos.map(({project:p,sub:s,open})=>{
    const tasks=(s.tasks||[]).map(t=>`<div class="inline-task-row" data-task="${t.id}"><select class="inline-task-status"><option value="todo">○</option><option value="doing">◐</option><option value="blocked">!</option><option value="done">✓</option></select><input class="inline-task-text" value="${esc(t.text)}"><button type="button" class="inline-task-delete">×</button></div>`).join('');
    return `<article class="repo-card ${s.status}" data-project="${p.id}" data-sub="${s.id}">
      <div class="repo-view">
        <div class="repo-card-top"><span class="repo-path">${CATEGORY_LABELS[p.category]} / ${esc(p.name)}</span><div class="repo-card-tools"><span class="repo-state ${s.status}">${SUB_STATUS_LABELS[s.status]}</span><button type="button" class="repo-inline-edit" title="Modifica repo">✎</button></div></div>
        <h3>${esc(s.name)}</h3>
        <div class="repo-task-preview">${(s.tasks||[]).slice(0,4).map(t=>`<div class="repo-task-preview-row ${t.status}"><i></i><span>${esc(t.text)}</span></div>`).join('')||'<span class="empty-board">Nessun task</span>'}</div>
        <div class="task-progress"><i style="width:${taskPctSub(s)}%"></i></div>
        <div class="repo-card-foot"><span>${open} aperti / ${(s.tasks||[]).length}</span><span>${taskPctSub(s)}%${s.repoUrl?' · GIT':''}${s.localPath?' · LOCAL':''}</span></div>
      </div>
      <div class="repo-inline-editor" hidden>
        <div class="inline-repo-top"><input class="inline-repo-name" value="${esc(s.name)}"><select class="inline-repo-status"><option value="active">Attivo</option><option value="paused">In pausa</option><option value="done">Chiuso</option></select></div>
        <div class="inline-repo-links"><input class="inline-repo-url" value="${esc(s.repoUrl||'')}" placeholder="GitHub URL"><input class="inline-repo-path" value="${esc(s.localPath||'')}" placeholder="Path locale"></div>
        <div class="inline-task-list">${tasks}</div>
        <button type="button" class="inline-add-task">+ TASK</button>
        <div class="inline-repo-actions"><button type="button" class="inline-delete-repo">ELIMINA REPO</button><span></span><button type="button" class="inline-cancel-repo">ANNULLA</button><button type="button" class="inline-save-repo">SALVA</button></div>
      </div>
    </article>`;
  }).join(''):'<div class="empty-board">Nessun repo attivo in questa selezione.</div>';

  const root=$('repoIndex');
  root.querySelectorAll('.repo-card').forEach(card=>{
    const view=card.querySelector('.repo-view'),editor=card.querySelector('.repo-inline-editor');
    const status=card.querySelector('.inline-repo-status');
    const p=projectById(card.dataset.project),s=(p?.subprojects||[]).find(x=>x.id===card.dataset.sub);
    if(status&&s)status.value=s.status;

    view.onclick=e=>{
      if(e.target.closest('.repo-inline-edit')){e.stopPropagation();view.hidden=true;editor.hidden=false;card.classList.add('editing');return;}
      openRepo(card.dataset.project,card.dataset.sub);
    };
    card.querySelector('.inline-cancel-repo').onclick=()=>renderRepos();
    card.querySelector('.inline-add-task').onclick=()=>{
      const list=card.querySelector('.inline-task-list');
      const row=document.createElement('div');row.className='inline-task-row';row.dataset.task=uid('t');
      row.innerHTML='<select class="inline-task-status"><option value="todo">○</option><option value="doing">◐</option><option value="blocked">!</option><option value="done">✓</option></select><input class="inline-task-text" placeholder="Nuovo task"><button type="button" class="inline-task-delete">×</button>';
      list.appendChild(row);bindInlineTaskDelete(row);
      row.querySelector('input').focus();
    };
    card.querySelectorAll('.inline-task-row').forEach(bindInlineTaskDelete);
    card.querySelector('.inline-save-repo').onclick=async()=>saveInlineRepo(card);
    card.querySelector('.inline-delete-repo').onclick=async()=>{
      if(!confirm('Eliminare questo repo e tutti i suoi task?'))return;
      const project=projectById(card.dataset.project);project.subprojects=project.subprojects.filter(x=>x.id!==card.dataset.sub);await saveState();
    };
  });
}

function bindInlineTaskDelete(row){const b=row.querySelector('.inline-task-delete');if(b)b.onclick=()=>row.remove();}

async function saveInlineRepo(card){
  const p=projectById(card.dataset.project),s=(p?.subprojects||[]).find(x=>x.id===card.dataset.sub);if(!p||!s)return;
  const name=card.querySelector('.inline-repo-name').value.trim();if(!name)return alert('Inserisci il nome del repo.');
  s.name=name;s.status=card.querySelector('.inline-repo-status').value;s.repoUrl=card.querySelector('.inline-repo-url').value.trim();s.localPath=card.querySelector('.inline-repo-path').value.trim();
  s.tasks=[...card.querySelectorAll('.inline-task-row')].map(r=>({id:r.dataset.task||uid('t'),status:r.querySelector('.inline-task-status').value,text:r.querySelector('.inline-task-text').value.trim()})).filter(t=>t.text);
  await saveState();
}
