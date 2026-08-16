const $ = id => document.getElementById(id);
const euro = n => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const num = v => {let s=String(v??'').trim().replace(/\s/g,'');if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(',','.');return Number(s)||0};

const PROJECT_SEED = [
  {id:'gaia-site',name:'Sito di Gaia',client:'Gaia',status:'paused',category:'Sito web',budget:0,deadline:'',nextAction:'Riprendere quando arriva il prossimo intervento',notes:'Progetto intermittente: manutenzione e aggiornamenti quando richiesti.',tasks:[{text:'Controllare richieste aperte',done:false}]},
  {id:'ssf',name:'Sound Studies Forum',client:'Sound Studies Forum',status:'paused',category:'Sito web',budget:0,deadline:'',nextAction:'Tenere traccia dei prossimi interventi sul sito',notes:'Sito già attivo, lavoro a chiamata / manutenzione.',tasks:[{text:'Raccogliere prossime modifiche',done:false}]},
  {id:'asap-site',name:'ASAP — nuovo sito',client:'ASAP',status:'active',category:'Sito web',budget:0,deadline:'',nextAction:'Impostare struttura e prima architettura del nuovo sito',notes:'Nuovo task attivo per ASAP.',tasks:[{text:'Definire struttura pagine',done:false},{text:'Raccogliere contenuti e riferimenti',done:false},{text:'Preparare prima direzione visiva',done:false}]}
];

let state = null;
let editingId = null;

async function loadState(){
  try{
    const res = await fetch('/api/state',{cache:'no-store'});
    if(!res.ok) throw new Error('server');
    state = await res.json();
  }catch(e){
    state = JSON.parse(localStorage.getItem('myadmin-projects-fallback')||'{"paid":[],"pending":[]}');
  }
  if(!Array.isArray(state.projects)) state.projects = PROJECT_SEED;
  await saveState(false);
  render();
}
async function saveState(renderAfter=true){
  try{
    await fetch('/api/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});
  }catch(e){ localStorage.setItem('myadmin-projects-fallback',JSON.stringify(state)); }
  if(renderAfter) render();
}
function projectById(id){return state.projects.find(p=>p.id===id)}
function uid(){return 'prj-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function openTasks(p){return (p.tasks||[]).filter(t=>!t.done).length}
function taskPct(p){const t=p.tasks||[];if(!t.length)return 0;return Math.round(t.filter(x=>x.done).length/t.length*100)}

function render(){
  const projects=state.projects||[];
  $('activeCount').textContent=projects.filter(p=>p.status==='active').length;
  $('pausedCount').textContent=projects.filter(p=>p.status==='paused').length;
  $('openTasks').textContent=projects.reduce((a,p)=>a+openTasks(p),0);
  $('projectValue').textContent=euro(projects.filter(p=>p.status!=='done').reduce((a,p)=>a+num(p.budget),0));

  document.querySelectorAll('.board-column').forEach(col=>col.querySelector('.project-list').innerHTML='');
  ['idea','active','paused','done'].forEach(s=>{$('count-'+s).textContent=projects.filter(p=>p.status===s).length});

  projects.forEach(p=>{
    const list=document.querySelector(`.board-column[data-status="${p.status}"] .project-list`);
    if(!list)return;
    const card=document.createElement('article');
    card.className='project-card';card.draggable=true;card.dataset.id=p.id;
    card.innerHTML=`<h3>${p.name}</h3><div class="project-client">${p.client||p.category||''}</div><div class="project-meta"><span>${p.category||'Altro'}</span><b>${p.budget?euro(p.budget):'—'}</b></div>${p.deadline?`<div class="project-meta"><span>Deadline</span><b>${p.deadline.split('-').reverse().join('/')}</b></div>`:''}${p.nextAction?`<div class="project-action">→ ${p.nextAction}</div>`:''}<div class="task-progress"><i style="width:${taskPct(p)}%"></i></div><div class="project-meta"><span>${openTasks(p)} task aperti</span><span>${taskPct(p)}%</span></div>`;
    card.onclick=()=>openDialog(p.id);
    card.ondragstart=e=>{e.stopPropagation();card.classList.add('dragging');e.dataTransfer.setData('text/plain',p.id)};
    card.ondragend=()=>card.classList.remove('dragging');
    list.appendChild(card);
  });

  document.querySelectorAll('.board-column').forEach(col=>{
    const list=col.querySelector('.project-list');if(!list.children.length)list.innerHTML='<div class="empty-board">Nessun progetto</div>';
  });

  const actions=projects.filter(p=>p.status!=='done'&&p.nextAction).sort((a,b)=>(a.deadline||'9999').localeCompare(b.deadline||'9999'));
  $('nextActions').innerHTML=actions.length?actions.map(p=>`<button class="next-action" data-id="${p.id}"><b>${p.name}</b> ${p.nextAction}</button>`).join(''):'<span class="empty-board">Nessuna prossima azione.</span>';
  document.querySelectorAll('.next-action').forEach(b=>b.onclick=()=>openDialog(b.dataset.id));
}

function openDialog(id=null){
  editingId=id;
  const p=id?projectById(id):{id:'',name:'',client:'',status:'idea',category:'Sito web',budget:'',deadline:'',nextAction:'',notes:'',tasks:[]};
  $('dialogTitle').textContent=id?'Modifica progetto':'Nuovo progetto';
  $('projectId').value=p.id||'';$('projectName').value=p.name||'';$('projectClient').value=p.client||'';$('projectStatus').value=p.status||'idea';$('projectCategory').value=p.category||'Sito web';$('projectBudget').value=p.budget||'';$('projectDeadline').value=p.deadline||'';$('projectNextAction').value=p.nextAction||'';$('projectNotes').value=p.notes||'';
  $('deleteProjectBtn').style.visibility=id?'visible':'hidden';
  renderTaskEditor(p.tasks||[]);
  $('projectDialog').showModal();
}
function renderTaskEditor(tasks){
  const box=$('taskEditor');box.innerHTML='';
  tasks.forEach((t,i)=>addTaskRow(t.text,t.done,i));
}
function addTaskRow(text='',done=false){
  const row=document.createElement('div');row.className='task-row';
  row.innerHTML=`<input type="checkbox" ${done?'checked':''}><input type="text" value="${String(text).replace(/"/g,'&quot;')}" placeholder="Task"><button type="button" class="task-remove">×</button>`;
  row.querySelector('.task-remove').onclick=()=>row.remove();$('taskEditor').appendChild(row);
}
function readTasks(){return [...document.querySelectorAll('.task-row')].map(r=>({done:r.querySelector('input[type=checkbox]').checked,text:r.querySelector('input[type=text]').value.trim()})).filter(t=>t.text)}

$('newProjectBtn').onclick=()=>openDialog();
$('addTaskBtn').onclick=()=>addTaskRow();
$('saveProjectBtn').onclick=async()=>{
  const project={id:editingId||uid(),name:$('projectName').value.trim(),client:$('projectClient').value.trim(),status:$('projectStatus').value,category:$('projectCategory').value,budget:num($('projectBudget').value),deadline:$('projectDeadline').value,nextAction:$('projectNextAction').value.trim(),notes:$('projectNotes').value.trim(),tasks:readTasks()};
  if(!project.name)return alert('Inserisci il nome del progetto.');
  const i=state.projects.findIndex(p=>p.id===project.id);if(i>=0)state.projects[i]=project;else state.projects.push(project);
  $('projectDialog').close();await saveState();
};
$('deleteProjectBtn').onclick=async()=>{if(!editingId||!confirm('Eliminare questo progetto?'))return;state.projects=state.projects.filter(p=>p.id!==editingId);$('projectDialog').close();await saveState();};

document.querySelectorAll('.board-column').forEach(col=>{
  col.ondragover=e=>{e.preventDefault();col.classList.add('drag-over')};
  col.ondragleave=()=>col.classList.remove('drag-over');
  col.ondrop=async e=>{e.preventDefault();col.classList.remove('drag-over');const id=e.dataTransfer.getData('text/plain'),p=projectById(id);if(!p)return;p.status=col.dataset.status;await saveState();};
});

loadState();
