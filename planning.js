// Linear workspace: Movement -> Repository -> To do.
const workspaceToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const hoursValue=v=>Math.max(0,Number(String(v??'').replace(',','.'))||0);
const hoursLabel=v=>{const n=hoursValue(v);return n?`${String(n).replace('.',',')} h`:''};
function ensureTodos(){
  if(!Array.isArray(state.todos))state.todos=[];
  state.todos.forEach(t=>{if(typeof t.hours!=='number')t.hours=hoursValue(t.hours)});
  if(!state.todoMigratedV1){
    (state.projects||[]).forEach(p=>(p.subprojects||[]).forEach(s=>(s.tasks||[]).filter(t=>t.status!=='done').forEach(t=>{
      if(!state.todos.some(x=>x.sourceTaskId===t.id))state.todos.push({id:uid('todo'),text:t.text,projectId:p.id,repoId:s.id,status:t.status==='blocked'?'blocked':'open',hours:hoursValue(t.hours),createdAt:workspaceToday(),completedAt:'',sourceTaskId:t.id});
    })));
    state.todoMigratedV1=true;
  }
}
function repoByIds(projectId,repoId){const p=projectById(projectId),s=(p?.subprojects||[]).find(x=>x.id===repoId);return p&&s?{p,s}:null}
function visibleRepos(){let rows=repoRecords().filter(r=>r.sub.status!=='done');if(selectedProject!=='all')rows=rows.filter(r=>r.project.id===selectedProject);return rows}
function todosForRepo(projectId,repoId){return(state.todos||[]).filter(t=>t.status!=='done'&&t.projectId===projectId&&t.repoId===repoId)}
function workspaceRender(){if(!state)return;ensureTodos();renderWorkspaceRepos();renderTodoComposer();renderTodos()}
function renderWorkspaceRepos(){
  const rows=visibleRepos(),root=$('workspaceRepos');if(!root)return;
  $('visibleRepoCount').textContent=rows.length;
  $('repoScopeLabel').textContent=selectedProject==='all'?'REPOSITORIES':`${projectById(selectedProject)?.name||''} / REPOSITORIES`;
  root.innerHTML=rows.length?rows.map(({project:p,sub:s})=>{const todos=todosForRepo(p.id,s.id),total=todos.reduce((a,t)=>a+hoursValue(t.hours),0);return `<article class="workspace-repo-card" data-project="${p.id}" data-repo="${s.id}">
    <button type="button" class="workspace-repo-edit" title="Modifica repo">✎</button>
    <small>${CATEGORY_LABELS[p.category]} / ${esc(p.name)}</small><h3>${esc(s.name)}</h3>
    <div class="repo-todo-preview">${todos.length?todos.map(t=>`<div class="repo-todo-row ${t.status}"><i></i><span>${esc(t.text)}</span>${t.hours?`<em>${hoursLabel(t.hours)}</em>`:''}</div>`).join(''):'<span class="empty-inline">Nessuna to do assegnata</span>'}</div>
    ${total?`<div class="repo-hours-total">${hoursLabel(total)} aperte</div>`:''}
  </article>`}).join(''):'<div class="empty-board">Nessun repository in questa selezione.</div>';
  root.querySelectorAll('.workspace-repo-card').forEach(card=>{
    card.onclick=e=>{if(e.target.closest('.workspace-repo-edit'))return;openRepo(card.dataset.project,card.dataset.repo)};
    card.querySelector('.workspace-repo-edit').onclick=e=>{e.stopPropagation();openRepoEditor(card.dataset.project,card.dataset.repo)};
  });
}
function renderTodoComposer(){
  const select=$('todoRepo');if(!select)return;const rows=repoRecords().filter(r=>r.sub.status!=='done');
  select.innerHTML='<option value="">Generica / nessun repo</option>'+rows.map(r=>`<option value="${r.project.id}|${r.sub.id}">${esc(r.project.name)} / ${esc(r.sub.name)}</option>`).join('');
  if(selectedProject!=='all'){const first=rows.find(r=>r.project.id===selectedProject);if(first)select.value=`${first.project.id}|${first.sub.id}`}
}
function renderTodos(){
  const root=$('todoList');if(!root)return;const todos=(state.todos||[]).filter(t=>t.status!=='done');$('todoCount').textContent=todos.length;const totalHours=todos.reduce((a,t)=>a+hoursValue(t.hours),0);if($('todoHours'))$('todoHours').textContent=`${String(totalHours).replace('.',',')} h`;
  root.innerHTML=todos.length?todos.map(t=>{const r=t.repoId?repoByIds(t.projectId,t.repoId):null;return `<article class="todo-item ${t.status}" data-id="${t.id}"><button class="todo-check" title="Completa">○</button><div class="todo-copy"><small>${r?`${esc(r.p.name)} / ${esc(r.s.name)}`:'GENERICA'}</small><b>${esc(t.text)}</b></div><label class="todo-hours-inline"><input class="todo-hours-edit" type="number" min="0" step="0.25" value="${t.hours||''}" placeholder="0"><span>h</span></label><select class="todo-assign"><option value="">Generica</option>${repoRecords().filter(x=>x.sub.status!=='done').map(x=>`<option value="${x.project.id}|${x.sub.id}" ${t.projectId===x.project.id&&t.repoId===x.sub.id?'selected':''}>${esc(x.project.name)} / ${esc(x.sub.name)}</option>`).join('')}</select><button class="todo-delete" title="Elimina">×</button></article>`}).join(''):'<div class="empty-board">Scrivi qui sopra la prima to do.</div>';
  root.querySelectorAll('.todo-item').forEach(row=>{
    const todo=state.todos.find(t=>t.id===row.dataset.id);
    row.querySelector('.todo-check').onclick=async()=>{todo.status='done';todo.completedAt=workspaceToday();syncLinkedTask(todo,true);await saveState(false);workspaceRender()};
    row.querySelector('.todo-delete').onclick=async()=>{state.todos=state.todos.filter(t=>t.id!==todo.id);await saveState(false);workspaceRender()};
    row.querySelector('.todo-hours-edit').onchange=async e=>{todo.hours=hoursValue(e.target.value);syncLinkedTask(todo,false);await saveState(false);workspaceRender()};
    row.querySelector('.todo-assign').onchange=async e=>{const v=e.target.value;if(v){[todo.projectId,todo.repoId]=v.split('|');syncLinkedTask(todo,false)}else{todo.projectId='';todo.repoId=''}await saveState(false);workspaceRender()};
  });
}
function syncLinkedTask(todo,complete){
  if(!todo.sourceTaskId)return;const r=repoByIds(todo.projectId,todo.repoId),task=(r?.s.tasks||[]).find(t=>t.id===todo.sourceTaskId);if(!task)return;
  task.hours=hoursValue(todo.hours);task.status=complete?'done':task.status;if(complete)task.completedAt=todo.completedAt;
}
$('todoComposer').onsubmit=async e=>{e.preventDefault();const text=$('todoText').value.trim();if(!text)return;const hours=hoursValue($('todoHoursInput')?.value);let projectId='',repoId='',sourceTaskId='';const v=$('todoRepo').value;if(v)[projectId,repoId]=v.split('|');if(repoId){const r=repoByIds(projectId,repoId);const task={id:uid('t'),text,status:'todo',hours,completedAt:''};r.s.tasks.push(task);sourceTaskId=task.id}state.todos.push({id:uid('todo'),text,projectId,repoId,status:'open',hours,createdAt:workspaceToday(),completedAt:'',sourceTaskId});$('todoText').value='';if($('todoHoursInput'))$('todoHoursInput').value='';await saveState(false);workspaceRender()};
$('addRepoQuick').onclick=()=>{const projects=(state.projects||[]).filter(p=>p.status!=='done');$('quickRepoProject').innerHTML=projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');if(selectedProject!=='all')$('quickRepoProject').value=selectedProject;$('quickRepoName').value='';$('quickRepoDialog').showModal();setTimeout(()=>$('quickRepoName').focus(),0)};
$('quickRepoSave').onclick=async()=>{const p=projectById($('quickRepoProject').value),name=$('quickRepoName').value.trim();if(!p||!name)return;if(!Array.isArray(p.subprojects))p.subprojects=[];p.subprojects.push({id:uid('sub'),name,status:'active',repoUrl:'',localPath:'',tasks:[]});selectedProject=p.id;$('quickRepoDialog').close();await saveState(false);renderProjectIndex();workspaceRender()};
const baseRender=render;render=function(){baseRender();workspaceRender()};
document.addEventListener('click',e=>{if(e.target.closest('.project-index-card')&&!e.target.closest('.project-edit-pencil'))setTimeout(workspaceRender,0);if(e.target.closest('.category-dot'))setTimeout(workspaceRender,0)});
setTimeout(workspaceRender,100);