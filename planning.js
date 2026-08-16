// Home workspace: Movement -> Repository -> weekly tasks/to-dos.
const workspaceToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const hoursValue=v=>Math.max(0,Number(String(v??'').replace(',','.'))||0);
const weekBounds=()=>{const d=new Date();d.setHours(12,0,0,0);const day=d.getDay()||7,start=new Date(d);start.setDate(d.getDate()-day+1);const end=new Date(start);end.setDate(start.getDate()+6);const key=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;return{start:key(start),end:key(end)}};
const inCurrentWeek=date=>{if(!date)return false;const w=weekBounds();return date>=w.start&&date<=w.end};
function ensureQuickTodos(){
  if(!Array.isArray(state.todos))state.todos=[];
  // Remove old duplicated mirrors of repository tasks: repository tasks are now the source of truth.
  state.todos=state.todos.filter(t=>!t.sourceTaskId);
  state.todos.forEach(t=>{t.status=t.status||'open';t.date=t.date||t.createdAt||workspaceToday();t.hours=hoursValue(t.hours);t.projectId=t.projectId||''});
}
function repoByIds(projectId,repoId){const p=projectById(projectId),s=(p?.subprojects||[]).find(x=>x.id===repoId);return p&&s?{p,s}:null}
function visibleRepos(){let rows=repoRecords().filter(r=>r.sub.status!=='done');if(selectedProject!=='all')rows=rows.filter(r=>r.project.id===selectedProject);return rows}
function projectTint(projectId){if(!projectId)return '#d8d5cd';const i=(state.projects||[]).findIndex(p=>p.id===projectId);return PROJECT_TINTS[(i<0?0:i)%PROJECT_TINTS.length]}
function weeklyItems(){
  const rows=[];
  (state.projects||[]).forEach(p=>(p.subprojects||[]).forEach(s=>(s.tasks||[]).forEach(t=>{
    if(t.status!=='done'&&inCurrentWeek(t.date))rows.push({kind:'task',id:t.id,text:t.text,date:t.date||'',hours:hoursValue(t.hours),projectId:p.id,repoId:s.id,project:p,repo:s,task:t});
  })));
  (state.todos||[]).forEach(t=>{if(t.status!=='done'&&inCurrentWeek(t.date))rows.push({kind:'quick',id:t.id,text:t.text,date:t.date||'',hours:hoursValue(t.hours),projectId:t.projectId||'',todo:t})});
  return rows.sort((a,b)=>(a.date||'').localeCompare(b.date||'')||a.text.localeCompare(b.text));
}
function workspaceRender(){if(!state)return;ensureQuickTodos();renderWorkspaceRepos();renderQuickComposer();renderWeeklyTodos()}
function renderWorkspaceRepos(){
  const rows=visibleRepos(),root=$('workspaceRepos');if(!root)return;
  $('visibleRepoCount').textContent=rows.length;
  $('repoScopeLabel').textContent=selectedProject==='all'?'REPOSITORIES':`${projectById(selectedProject)?.name||''} / REPOSITORIES`;
  root.innerHTML=rows.length?rows.map(({project:p,sub:s})=>{
    const tasks=(s.tasks||[]).filter(t=>t.status!=='done');
    return `<article class="workspace-repo-card" data-project="${p.id}" data-repo="${s.id}"><button type="button" class="workspace-repo-edit" title="Modifica repo">✎</button><small>${CATEGORY_LABELS[p.category]} / ${esc(p.name)}</small><h3>${esc(s.name)}</h3><div class="repo-todo-preview">${tasks.length?tasks.map(t=>`<div class="repo-todo-row ${t.status}"><i></i><span>${esc(t.text)}</span>${t.date?`<time>${new Date(t.date+'T12:00:00').toLocaleDateString('it-IT',{day:'2-digit',month:'short'})}</time>`:''}</div>`).join(''):'<span class="empty-inline">Nessun task aperto</span>'}</div></article>`;
  }).join(''):'<div class="empty-board">Nessun repository in questa selezione.</div>';
  root.querySelectorAll('.workspace-repo-card').forEach(card=>{card.onclick=e=>{if(e.target.closest('.workspace-repo-edit'))return;openRepo(card.dataset.project,card.dataset.repo)};card.querySelector('.workspace-repo-edit').onclick=e=>{e.stopPropagation();openRepoEditor(card.dataset.project,card.dataset.repo)}});
}
function renderQuickComposer(){
  const select=$('todoMovement');if(!select)return;
  const projects=(state.projects||[]).filter(p=>p.status!=='done');
  select.innerHTML='<option value="">Generica</option>'+projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  if(selectedProject!=='all'&&projectById(selectedProject))select.value=selectedProject;
}
function renderWeeklyTodos(){
  const root=$('todoList');if(!root)return;const rows=weeklyItems();
  $('todoCount').textContent=rows.length;const total=rows.reduce((a,r)=>a+hoursValue(r.hours),0);if($('todoHours'))$('todoHours').textContent=total?`${String(total).replace('.',',')} h`:'';
  root.innerHTML=rows.length?rows.map(r=>`<article class="free-todo" data-kind="${r.kind}" data-id="${r.id}" data-project="${r.projectId||''}" data-repo="${r.repoId||''}"><button class="free-todo-check" title="Completa">○</button><i class="movement-signal" style="--signal:${projectTint(r.projectId)}"></i><span>${esc(r.text)}</span></article>`).join(''):'<div class="empty-board">Nessuna to do programmata questa settimana.</div>';
  root.querySelectorAll('.free-todo').forEach(row=>{row.querySelector('.free-todo-check').onclick=async()=>{if(row.dataset.kind==='task'){const r=repoByIds(row.dataset.project,row.dataset.repo),t=(r?.s.tasks||[]).find(x=>x.id===row.dataset.id);if(t){t.status='done';t.completedAt=workspaceToday()}}else{const t=state.todos.find(x=>x.id===row.dataset.id);if(t){t.status='done';t.completedAt=workspaceToday()}}await saveState(false);workspaceRender()}});
}
$('todoComposer').onsubmit=async e=>{e.preventDefault();const text=$('todoText').value.trim();if(!text)return;ensureQuickTodos();state.todos.push({id:uid('todo'),text,projectId:$('todoMovement').value||'',status:'open',date:workspaceToday(),hours:0,createdAt:workspaceToday(),completedAt:''});$('todoText').value='';await saveState(false);workspaceRender()};
$('addRepoQuick').onclick=()=>{const projects=(state.projects||[]).filter(p=>p.status!=='done');$('quickRepoProject').innerHTML=projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');if(selectedProject!=='all')$('quickRepoProject').value=selectedProject;$('quickRepoName').value='';$('quickRepoDialog').showModal();setTimeout(()=>$('quickRepoName').focus(),0)};
$('quickRepoSave').onclick=async()=>{const p=projectById($('quickRepoProject').value),name=$('quickRepoName').value.trim();if(!p||!name)return;if(!Array.isArray(p.subprojects))p.subprojects=[];p.subprojects.push({id:uid('sub'),name,status:'active',repoUrl:'',localPath:'',tasks:[]});selectedProject=p.id;$('quickRepoDialog').close();await saveState(false);renderProjectIndex();workspaceRender()};
const baseRender=render;render=function(){baseRender();workspaceRender()};document.addEventListener('click',e=>{if(e.target.closest('.project-index-card')&&!e.target.closest('.project-edit-pencil'))setTimeout(workspaceRender,0);if(e.target.closest('.category-dot'))setTimeout(workspaceRender,0)});setTimeout(workspaceRender,100);