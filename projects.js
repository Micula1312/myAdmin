const $ = id => document.getElementById(id);
const euro = n => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const num = v => {let s=String(v??'').trim().replace(/\s/g,'');if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(',','.');return Number(s)||0};
const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

const PROJECT_SEED = [
  {id:'asap',name:'ASAP',category:'community',status:'active',budget:0,deadline:'',nextAction:'Impostare struttura e prima architettura del nuovo sito',notes:'',subprojects:[{id:'asap-site',name:'Nuovo sito',status:'active',repoUrl:'',localPath:'',tasks:[{id:uid('t'),text:'Definire struttura pagine',status:'todo'},{id:uid('t'),text:'Raccogliere contenuti e riferimenti',status:'todo'},{id:uid('t'),text:'Preparare prima direzione visiva',status:'todo'}]}]},
  {id:'blivet',name:'BLIVET',category:'community',status:'intermittent',budget:0,deadline:'',nextAction:'',notes:'',subprojects:[]},
  {id:'aotu',name:'AOTU',category:'personal',status:'intermittent',budget:0,deadline:'',nextAction:'',notes:'The Archive of the Untamed',subprojects:[]},
  {id:'myadmin',name:'myAdmin',category:'personal',status:'active',budget:0,deadline:'',nextAction:'Indicizzare i repo operativi',notes:'Software personale di amministrazione e lavoro.',subprojects:[{id:'myadmin-core',name:'Core software',status:'active',repoUrl:'https://github.com/Micula1312/myAdmin',localPath:'C:/Users/micol/repository/myADMIN',tasks:[{id:uid('t'),text:'Indicizzare sottoprogetti come repository',status:'doing'}]}]}
];
const CATEGORY_LABELS={commercial:'Commercial Works',community:'Community',personal:'Personal'};
const STATUS_LABELS={active:'Attivo',intermittent:'Intermittente',paused:'In pausa',idea:'Da attivare',done:'Chiuso'};
const SUB_STATUS_LABELS={active:'Attivo',paused:'In pausa',done:'Chiuso'};
const TASK_LABELS={todo:'Da fare',doing:'In corso',blocked:'Bloccato',done:'Fatto'};
let state=null,editingId=null,repoFilter='all';

async function loadState(){
  try{const res=await fetch('/api/state',{cache:'no-store'});if(!res.ok)throw new Error('server');state=await res.json();}
  catch(e){state=JSON.parse(localStorage.getItem('myadmin-projects-fallback')||'{"paid":[],"pending":[]}');}
  migrate();await saveState(false);render();
}
function migrate(){
  if(!Array.isArray(state.projects)) state.projects=JSON.parse(JSON.stringify(PROJECT_SEED));
  state.projects=state.projects.filter(p=>!['gaia-site','ssf'].includes(p.id));
  state.projects.forEach(p=>{
    if(!['commercial','community','personal'].includes(p.category))p.category='commercial';
    if(!Array.isArray(p.subprojects))p.subprojects=[];
    p.subprojects.forEach(s=>{s.repoUrl=s.repoUrl||'';s.localPath=s.localPath||'';s.status=s.status||'active';if(!Array.isArray(s.tasks))s.tasks=[];s.tasks=s.tasks.map(t=>({id:t.id||uid('t'),text:t.text||'',status:t.status||(t.done?'done':'todo')}));});
  });
  ['asap','blivet','aotu','myadmin'].forEach(id=>{if(!state.projects.some(p=>p.id===id)){const seed=PROJECT_SEED.find(p=>p.id===id);state.projects.push(JSON.parse(JSON.stringify(seed)));}});
  state.projectsSchema=3;
}
async function saveState(renderAfter=true){try{await fetch('/api/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});}catch(e){localStorage.setItem('myadmin-projects-fallback',JSON.stringify(state));}if(renderAfter)render();}
function projectById(id){return state.projects.find(p=>p.id===id)}
function allTasks(p){return (p.subprojects||[]).flatMap(s=>(s.tasks||[]).map(t=>({...t,subproject:s.name})));}
function openTaskCount(p){return allTasks(p).filter(t=>t.status!=='done').length}
function taskPctSub(s){const t=s.tasks||[];return t.length?Math.round(t.filter(x=>x.status==='done').length/t.length*100):0}
function repoRecords(projects=state.projects){return projects.flatMap(p=>(p.subprojects||[]).map(s=>({project:p,sub:s,tasks:s.tasks||[],open:(s.tasks||[]).filter(t=>t.status!=='done').length})));}

function render(){const projects=state.projects||[];$('projectCount').textContent=projects.length;$('repoCount').textContent=repoRecords(projects).filter(r=>r.sub.status==='active').length;$('openTasks').textContent=projects.reduce((a,p)=>a+openTaskCount(p),0);$('projectValue').textContent=euro(projects.filter(p=>p.status!=='done').reduce((a,p)=>a+num(p.budget),0));renderNextActions(projects);renderRepoIndex(projects);renderCategories(projects);}
function renderNextActions(projects){
  const rows=[];projects.forEach(p=>(p.subprojects||[]).forEach(s=>(s.tasks||[]).filter(t=>['doing','blocked'].includes(t.status)).forEach(t=>rows.push(`<button class="next-action" data-project="${p.id}" data-sub="${s.id}"><small>${t.status==='blocked'?'BLOCCATO':'IN CORSO'} · ${esc(p.name)} / ${esc(s.name)}</small><b>${esc(t.text)}</b></button>`))));
  projects.filter(p=>p.status!=='done'&&p.nextAction).forEach(p=>rows.push(`<button class="next-action" data-project="${p.id}"><small>PROSSIMA AZIONE · ${esc(p.name)}</small><b>${esc(p.nextAction)}</b></button>`));
  $('nextActions').innerHTML=rows.length?rows.slice(0,12).join(''):'<span class="empty-board">Nessuna azione urgente.</span>';
  document.querySelectorAll('.next-action').forEach(b=>b.onclick=()=>b.dataset.sub?openRepo(b.dataset.project,b.dataset.sub):openDialog(b.dataset.project));
}
function renderRepoIndex(projects){
  let repos=repoRecords(projects);if(repoFilter!=='all')repos=repos.filter(r=>r.project.category===repoFilter);
  repos.sort((a,b)=>({active:0,paused:1,done:2}[a.sub.status]??9)-({active:0,paused:1,done:2}[b.sub.status]??9)||a.project.name.localeCompare(b.project.name)||a.sub.name.localeCompare(b.sub.name));
  $('repoIndex').innerHTML=repos.length?repos.map(({project:p,sub:s,open})=>`<article class="repo-card ${s.status}" data-project="${p.id}" data-sub="${s.id}"><div class="repo-card-top"><span class="repo-path">${esc(CATEGORY_LABELS[p.category])} / ${esc(p.name)}</span><span class="repo-state ${s.status}">${SUB_STATUS_LABELS[s.status]||s.status}</span></div><h3>${esc(s.name)}</h3><div class="repo-stats"><span>${open} task aperti</span><span>${taskPctSub(s)}%</span></div><div class="task-progress"><i style="width:${taskPctSub(s)}%"></i></div>${s.repoUrl?'<span class="repo-badge">GIT</span>':''}${s.localPath?'<span class="repo-badge">LOCAL</span>':''}</article>`).join(''):'<div class="empty-board">Nessun repo in questa categoria.</div>';
  document.querySelectorAll('.repo-card').forEach(c=>c.onclick=()=>openRepo(c.dataset.project,c.dataset.sub));
}
function renderCategories(projects){
  const root=$('categorySections');root.innerHTML='';
  ['commercial','community','personal'].forEach(cat=>{
    const section=document.createElement('section');section.className='category-block';const catProjects=projects.filter(p=>p.category===cat);
    section.innerHTML=`<div class="category-head"><div><p class="eyebrow">${CATEGORY_LABELS[cat]}</p><h2>${CATEGORY_LABELS[cat]}</h2></div><button class="ghost add-in-category" data-category="${cat}">+ PROGETTO</button></div><div class="project-stack">${catProjects.length?catProjects.map(projectCard).join(''):'<div class="empty-category">Nessun progetto</div>'}</div>`;root.appendChild(section);
  });
  document.querySelectorAll('.project-shell').forEach(c=>c.querySelector('.project-shell-head').onclick=()=>openDialog(c.dataset.id));
  document.querySelectorAll('.repo-row').forEach(r=>r.onclick=e=>{e.stopPropagation();openRepo(r.dataset.project,r.dataset.sub)});
  document.querySelectorAll('.add-in-category').forEach(b=>b.onclick=()=>openDialog(null,b.dataset.category));
}
function projectCard(p){const repos=p.subprojects||[];return `<article class="project-shell" data-id="${p.id}"><div class="project-shell-head"><div><h3>${esc(p.name)}</h3><small>${STATUS_LABELS[p.status]||p.status}${p.deadline?' · '+p.deadline.split('-').reverse().join('/'):''}</small></div><span>${openTaskCount(p)} task</span></div><div class="repo-rows">${repos.length?repos.map(s=>`<button class="repo-row" data-project="${p.id}" data-sub="${s.id}"><span class="repo-icon">⌘</span><span class="repo-row-main"><b>${esc(s.name)}</b><small>${SUB_STATUS_LABELS[s.status]} · ${(s.tasks||[]).filter(t=>t.status!=='done').length}/${(s.tasks||[]).length} aperti</small></span><span class="repo-row-progress">${taskPctSub(s)}%</span></button>`).join(''):'<div class="empty-repos">Nessun repo</div>'}</div></article>`}

function openDialog(id=null,category='commercial'){
 editingId=id;const p=id?projectById(id):{id:'',name:'',client:'',category,status:'active',budget:'',deadline:'',nextAction:'',notes:'',subprojects:[]};
 $('dialogTitle').textContent=id?'Modifica progetto':'Nuovo progetto';$('projectId').value=p.id||'';$('projectName').value=p.name||'';$('projectClient').value=p.client||'';$('projectStatus').value=p.status||'active';$('projectCategory').value=p.category||category;$('projectBudget').value=p.budget||'';$('projectDeadline').value=p.deadline||'';$('projectNextAction').value=p.nextAction||'';$('projectNotes').value=p.notes||'';$('deleteProjectBtn').style.visibility=id?'visible':'hidden';renderSubprojectEditor(p.subprojects||[]);$('projectDialog').showModal();
}
function renderSubprojectEditor(subs){const box=$('subprojectEditor');box.innerHTML='';subs.forEach(addSubprojectBlock);if(!subs.length)box.innerHTML='<p class="empty-subprojects">Nessun repo ancora.</p>'}
function addSubprojectBlock(sub={id:uid('sub'),name:'',status:'active',repoUrl:'',localPath:'',tasks:[]}){
 const box=$('subprojectEditor'),empty=box.querySelector('.empty-subprojects');if(empty)empty.remove();const block=document.createElement('section');block.className='subproject-block';block.dataset.id=sub.id||uid('sub');block.innerHTML=`<div class="subproject-top"><input class="sub-name" value="${esc(sub.name||'')}" placeholder="Nome repo / sottoprogetto"><select class="sub-status"><option value="active">Attivo</option><option value="paused">In pausa</option><option value="done">Chiuso</option></select><button type="button" class="sub-remove">×</button></div><div class="grid two repo-fields"><label>Git repo URL<input class="sub-repo" value="${esc(sub.repoUrl||'')}" placeholder="https://github.com/..."></label><label>Path locale<input class="sub-path" value="${esc(sub.localPath||'')}" placeholder="C:/Users/.../repository"></label></div><div class="sub-task-list"></div><button type="button" class="add-sub-task ghost">+ TASK</button>`;block.querySelector('.sub-status').value=sub.status||'active';const list=block.querySelector('.sub-task-list');(sub.tasks||[]).forEach(t=>addTaskRow(list,t));block.querySelector('.add-sub-task').onclick=()=>addTaskRow(list);block.querySelector('.sub-remove').onclick=()=>block.remove();box.appendChild(block);
}
function addTaskRow(container,t={id:uid('t'),text:'',status:'todo'}){const row=document.createElement('div');row.className='task-row';row.dataset.id=t.id||uid('t');row.innerHTML=`<select class="task-status"><option value="todo">○ Da fare</option><option value="doing">◐ In corso</option><option value="blocked">! Bloccato</option><option value="done">✓ Fatto</option></select><input class="task-text" value="${esc(t.text||'')}" placeholder="Task"><button type="button" class="task-remove">×</button>`;row.querySelector('.task-status').value=t.status||(t.done?'done':'todo');row.querySelector('.task-remove').onclick=()=>row.remove();container.appendChild(row)}
function readSubprojects(){return [...document.querySelectorAll('.subproject-block')].map(b=>({id:b.dataset.id||uid('sub'),name:b.querySelector('.sub-name').value.trim(),status:b.querySelector('.sub-status').value,repoUrl:b.querySelector('.sub-repo').value.trim(),localPath:b.querySelector('.sub-path').value.trim(),tasks:[...b.querySelectorAll('.task-row')].map(r=>({id:r.dataset.id||uid('t'),text:r.querySelector('.task-text').value.trim(),status:r.querySelector('.task-status').value})).filter(t=>t.text)})).filter(s=>s.name||s.tasks.length)}

function openRepo(projectId,subId){const p=projectById(projectId),s=(p?.subprojects||[]).find(x=>x.id===subId);if(!p||!s)return;$('repoDialogTitle').textContent=s.name;$('repoDialogMeta').innerHTML=`<span class="category-pill ${p.category}">${CATEGORY_LABELS[p.category]}</span><b>${esc(p.name)}</b><span class="repo-state ${s.status}">${SUB_STATUS_LABELS[s.status]}</span>${s.repoUrl?`<a href="${esc(s.repoUrl)}" target="_blank" rel="noopener">GITHUB ↗</a>`:''}${s.localPath?`<code>${esc(s.localPath)}</code>`:''}`;$('repoTaskList').innerHTML=(s.tasks||[]).length?(s.tasks||[]).map(t=>`<label class="repo-task ${t.status}"><span>${TASK_LABELS[t.status]}</span><b>${esc(t.text)}</b></label>`).join(''):'<div class="empty-board">Nessun task.</div>';$('repoDialog').showModal()}

$('newProjectBtn').onclick=()=>openDialog();$('addSubprojectBtn').onclick=()=>addSubprojectBlock();
$('saveProjectBtn').onclick=async()=>{const project={id:editingId||uid('prj'),name:$('projectName').value.trim(),client:$('projectClient').value.trim(),status:$('projectStatus').value,category:$('projectCategory').value,budget:num($('projectBudget').value),deadline:$('projectDeadline').value,nextAction:$('projectNextAction').value.trim(),notes:$('projectNotes').value.trim(),subprojects:readSubprojects()};if(!project.name)return alert('Inserisci il nome del progetto.');const i=state.projects.findIndex(p=>p.id===project.id);if(i>=0)state.projects[i]=project;else state.projects.push(project);$('projectDialog').close();await saveState();};
$('deleteProjectBtn').onclick=async()=>{if(!editingId||!confirm('Eliminare questo progetto e tutti i suoi repo/task?'))return;state.projects=state.projects.filter(p=>p.id!==editingId);$('projectDialog').close();await saveState();};
document.querySelectorAll('.repo-filter').forEach(b=>b.onclick=()=>{repoFilter=b.dataset.filter;document.querySelectorAll('.repo-filter').forEach(x=>x.classList.toggle('active',x===b));renderRepoIndex(state.projects||[])});
loadState();