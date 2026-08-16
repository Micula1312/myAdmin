const $ = id => document.getElementById(id);
const euro = n => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const num = v => {let s=String(v??'').trim().replace(/\s/g,'');if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(',','.');return Number(s)||0};
const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;

const PROJECT_SEED = [
  {
    id:'asap',name:'ASAP',category:'community',status:'active',economic:'mixed',budget:0,deadline:'',
    nextAction:'Impostare struttura e prima architettura del nuovo sito',notes:'',public:false,publicSummary:'',
    subprojects:[{id:'asap-site',name:'Nuovo sito',status:'active',tasks:[
      {id:uid('t'),text:'Definire struttura pagine',status:'todo'},
      {id:uid('t'),text:'Raccogliere contenuti e riferimenti',status:'todo'},
      {id:uid('t'),text:'Preparare prima direzione visiva',status:'todo'}
    ]}]
  },
  {id:'blivet',name:'BLIVET',category:'community',status:'intermittent',economic:'mixed',budget:0,deadline:'',nextAction:'',notes:'',public:false,publicSummary:'',subprojects:[]},
  {id:'aotu',name:'AOTU',category:'personal',status:'intermittent',economic:'mixed',budget:0,deadline:'',nextAction:'',notes:'The Archive of the Untamed',public:true,publicSummary:'',subprojects:[]},
  {id:'myadmin',name:'myAdmin',category:'personal',status:'active',economic:'na',budget:0,deadline:'',nextAction:'Costruire gestione progetti e output pubblico',notes:'Software personale di amministrazione e lavoro.',public:false,publicSummary:'',subprojects:[{id:'myadmin-core',name:'Core software',status:'active',tasks:[{id:uid('t'),text:'Gerarchia categoria → progetto → sottoprogetto → task',status:'doing'}]}]}
];

const CATEGORY_LABELS={commercial:'Commercial Works',community:'Community',personal:'Personal'};
const STATUS_LABELS={active:'Attivo',intermittent:'Intermittente',paused:'In pausa',idea:'Da attivare',done:'Chiuso'};
const TASK_LABELS={todo:'Da fare',doing:'In corso',blocked:'Bloccato',done:'Fatto'};
let state=null;
let editingId=null;
let activeCategory='all';

async function loadState(){
  try{const res=await fetch('/api/state',{cache:'no-store'});if(!res.ok)throw new Error('server');state=await res.json();}
  catch(e){state=JSON.parse(localStorage.getItem('myadmin-projects-fallback')||'{"paid":[],"pending":[]}');}
  migrateProjects();
  await saveState(false);
  render();
}

function migrateProjects(){
  if(!Array.isArray(state.projects)){
    state.projects=JSON.parse(JSON.stringify(PROJECT_SEED));
    state.projectsSchema=2;
    return;
  }
  if(state.projectsSchema===2)return;

  // Rimuove soltanto i due vecchi esempi automatici, mai i progetti creati dall'utente.
  state.projects=state.projects.filter(p=>!['gaia-site','ssf'].includes(p.id));
  const hasMeaningful=state.projects.some(p=>!['asap-site'].includes(p.id));
  if(!hasMeaningful){state.projects=JSON.parse(JSON.stringify(PROJECT_SEED));}
  else{
    state.projects=state.projects.map(p=>{
      let category=p.workCategory||p.category;
      if(!['commercial','community','personal'].includes(category)) category='commercial';
      let status=p.status==='paused'?'intermittent':(p.status||'idea');
      const oldTasks=Array.isArray(p.tasks)?p.tasks:[];
      return {
        ...p,
        category,status,economic:p.economic||'paid',public:!!p.public,publicSummary:p.publicSummary||'',
        subprojects:Array.isArray(p.subprojects)?p.subprojects:(oldTasks.length?[{id:uid('sub'),name:'Generale',status:'active',tasks:oldTasks.map(t=>({id:t.id||uid('t'),text:t.text||'',status:t.status||(t.done?'done':'todo')}))}]:[])
      };
    });
    if(!state.projects.some(p=>p.id==='asap')) state.projects.push(PROJECT_SEED[0]);
    if(!state.projects.some(p=>p.id==='blivet')) state.projects.push(PROJECT_SEED[1]);
    if(!state.projects.some(p=>p.id==='aotu')) state.projects.push(PROJECT_SEED[2]);
    if(!state.projects.some(p=>p.id==='myadmin')) state.projects.push(PROJECT_SEED[3]);
  }
  state.projectsSchema=2;
}

async function saveState(renderAfter=true){
  try{await fetch('/api/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});}
  catch(e){localStorage.setItem('myadmin-projects-fallback',JSON.stringify(state));}
  if(renderAfter)render();
}
function projectById(id){return state.projects.find(p=>p.id===id)}
function allTasks(p){return (p.subprojects||[]).flatMap(s=>(s.tasks||[]).map(t=>({...t,subproject:s.name})));}
function openTaskCount(p){return allTasks(p).filter(t=>t.status!=='done').length;}
function doingTaskCount(p){return allTasks(p).filter(t=>t.status==='doing').length;}
function taskPct(p){const tasks=allTasks(p);if(!tasks.length)return 0;return Math.round(tasks.filter(t=>t.status==='done').length/tasks.length*100);}

function render(){
  const projects=state.projects||[];
  $('activeCount').textContent=projects.filter(p=>['active','intermittent'].includes(p.status)).length;
  $('openTasks').textContent=projects.reduce((a,p)=>a+openTaskCount(p),0);
  $('doingTasks').textContent=projects.reduce((a,p)=>a+doingTaskCount(p),0);
  $('publicCount').textContent=projects.filter(p=>p.public).length;
  ['commercial','community','personal'].forEach(c=>{$('cat-'+c).textContent=projects.filter(p=>p.category===c).length});
  $('cat-all').textContent=projects.length;

  renderNextActions(projects);
  renderGrid(projects);
}

function renderNextActions(projects){
  const taskActions=[];
  projects.forEach(p=>(p.subprojects||[]).forEach(s=>(s.tasks||[]).filter(t=>['doing','blocked'].includes(t.status)).forEach(t=>taskActions.push({p,s,t}))));
  const projectActions=projects.filter(p=>p.status!=='done'&&p.nextAction).map(p=>({p,action:p.nextAction}));
  const chunks=[
    ...taskActions.slice(0,8).map(x=>`<button class="next-action ${x.t.status}" data-id="${x.p.id}"><small>${x.t.status==='blocked'?'BLOCCATO':'IN CORSO'} · ${x.p.name} / ${x.s.name}</small><b>${x.t.text}</b></button>`),
    ...projectActions.slice(0,5).map(x=>`<button class="next-action" data-id="${x.p.id}"><small>PROSSIMA AZIONE · ${x.p.name}</small><b>${x.action}</b></button>`)
  ];
  $('nextActions').innerHTML=chunks.length?chunks.join(''):'<span class="empty-board">Nessuna azione urgente.</span>';
  document.querySelectorAll('.next-action').forEach(b=>b.onclick=()=>openDialog(b.dataset.id));
}

function renderGrid(projects){
  const filtered=activeCategory==='all'?projects:projects.filter(p=>p.category===activeCategory);
  const grid=$('projectGrid');grid.innerHTML='';
  if(!filtered.length){grid.innerHTML='<div class="empty-state">Nessun progetto in questa categoria. <button id="emptyNew" class="ghost">+ crealo</button></div>';const b=$('emptyNew');if(b)b.onclick=()=>openDialog();return;}

  filtered.forEach(p=>{
    const card=document.createElement('article');card.className='project-card';card.dataset.id=p.id;
    const subs=p.subprojects||[];
    const subHtml=subs.length?subs.slice(0,4).map(s=>{
      const total=(s.tasks||[]).length,open=(s.tasks||[]).filter(t=>t.status!=='done').length;
      return `<div class="subproject-line"><span>${s.name}</span><small>${open}/${total} aperti</small></div>`;
    }).join(''):'<div class="subproject-line empty-sub">Nessun sottoprogetto</div>';
    card.innerHTML=`
      <div class="project-card-head"><div><span class="category-pill ${p.category}">${CATEGORY_LABELS[p.category]}</span><h2>${escapeHtml(p.name)}</h2></div><span class="status-pill ${p.status}">${STATUS_LABELS[p.status]||p.status}</span></div>
      ${p.nextAction?`<div class="project-next">→ ${escapeHtml(p.nextAction)}</div>`:''}
      <div class="subproject-lines">${subHtml}</div>
      <div class="task-progress"><i style="width:${taskPct(p)}%"></i></div>
      <div class="project-footer"><span>${openTaskCount(p)} task aperti · ${taskPct(p)}%</span><span>${p.public?'● output sito':''}</span></div>`;
    card.onclick=()=>openDialog(p.id);grid.appendChild(card);
  });
}

function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

function openDialog(id=null){
  editingId=id;
  const p=id?projectById(id):{id:'',name:'',category:activeCategory==='all'?'commercial':activeCategory,status:'active',economic:'paid',budget:'',deadline:'',nextAction:'',notes:'',public:false,publicSummary:'',subprojects:[]};
  $('dialogTitle').textContent=id?'Modifica progetto':'Nuovo progetto';
  $('projectId').value=p.id||'';$('projectName').value=p.name||'';$('projectCategory').value=p.category||'commercial';$('projectStatus').value=p.status||'active';$('projectEconomic').value=p.economic||'paid';$('projectBudget').value=p.budget||'';$('projectDeadline').value=p.deadline||'';$('projectNextAction').value=p.nextAction||'';$('projectNotes').value=p.notes||'';$('projectPublic').checked=!!p.public;$('projectPublicSummary').value=p.publicSummary||'';
  $('deleteProjectBtn').style.visibility=id?'visible':'hidden';
  renderSubprojectEditor(p.subprojects||[]);
  $('projectDialog').showModal();
}

function renderSubprojectEditor(subprojects){
  const box=$('subprojectEditor');box.innerHTML='';
  subprojects.forEach(s=>addSubprojectBlock(s));
  if(!subprojects.length)box.innerHTML='<p class="empty-subprojects">Nessun sottoprogetto: aggiungine uno quando questo progetto produce un output o un nuovo filone di lavoro.</p>';
}
function addSubprojectBlock(sub={id:uid('sub'),name:'',status:'active',tasks:[]}){
  const box=$('subprojectEditor');const empty=box.querySelector('.empty-subprojects');if(empty)empty.remove();
  const block=document.createElement('section');block.className='subproject-block';block.dataset.id=sub.id||uid('sub');
  block.innerHTML=`
    <div class="subproject-top"><input class="sub-name" value="${escapeHtml(sub.name||'')}" placeholder="Nome sottoprogetto / output"><select class="sub-status"><option value="active">Attivo</option><option value="paused">In pausa</option><option value="done">Chiuso</option></select><button type="button" class="sub-remove">×</button></div>
    <div class="sub-task-list"></div>
    <button type="button" class="add-sub-task ghost">+ TASK</button>`;
  block.querySelector('.sub-status').value=sub.status||'active';
  const taskList=block.querySelector('.sub-task-list');(sub.tasks||[]).forEach(t=>addTaskRow(taskList,t));
  block.querySelector('.add-sub-task').onclick=()=>addTaskRow(taskList);
  block.querySelector('.sub-remove').onclick=()=>block.remove();
  box.appendChild(block);
}
function addTaskRow(container,t={id:uid('t'),text:'',status:'todo'}){
  const row=document.createElement('div');row.className='task-row';row.dataset.id=t.id||uid('t');
  row.innerHTML=`<select class="task-status"><option value="todo">○ Da fare</option><option value="doing">◐ In corso</option><option value="blocked">! Bloccato</option><option value="done">✓ Fatto</option></select><input class="task-text" value="${escapeHtml(t.text||'')}" placeholder="Cosa devo fare?"><button type="button" class="task-remove">×</button>`;
  row.querySelector('.task-status').value=t.status||(t.done?'done':'todo');row.querySelector('.task-remove').onclick=()=>row.remove();container.appendChild(row);
}
function readSubprojects(){
  return [...document.querySelectorAll('.subproject-block')].map(b=>({
    id:b.dataset.id||uid('sub'),name:b.querySelector('.sub-name').value.trim(),status:b.querySelector('.sub-status').value,
    tasks:[...b.querySelectorAll('.task-row')].map(r=>({id:r.dataset.id||uid('t'),text:r.querySelector('.task-text').value.trim(),status:r.querySelector('.task-status').value})).filter(t=>t.text)
  })).filter(s=>s.name||s.tasks.length);
}

$('newProjectBtn').onclick=()=>openDialog();
$('addSubprojectBtn').onclick=()=>addSubprojectBlock();
$('saveProjectBtn').onclick=async()=>{
  const project={id:editingId||uid('prj'),name:$('projectName').value.trim(),category:$('projectCategory').value,status:$('projectStatus').value,economic:$('projectEconomic').value,budget:num($('projectBudget').value),deadline:$('projectDeadline').value,nextAction:$('projectNextAction').value.trim(),notes:$('projectNotes').value.trim(),public:$('projectPublic').checked,publicSummary:$('projectPublicSummary').value.trim(),subprojects:readSubprojects()};
  if(!project.name)return alert('Inserisci il nome del progetto.');
  const i=state.projects.findIndex(p=>p.id===project.id);if(i>=0)state.projects[i]=project;else state.projects.push(project);
  $('projectDialog').close();await saveState();
};
$('deleteProjectBtn').onclick=async()=>{if(!editingId||!confirm('Eliminare questo progetto e i suoi sottoprogetti/task?'))return;state.projects=state.projects.filter(p=>p.id!==editingId);$('projectDialog').close();await saveState();};

document.querySelectorAll('.category-tab').forEach(btn=>btn.onclick=()=>{activeCategory=btn.dataset.category;document.querySelectorAll('.category-tab').forEach(b=>b.classList.toggle('active',b===btn));renderGrid(state.projects||[]);});

loadState();
