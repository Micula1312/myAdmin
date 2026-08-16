// Direct creation controls for the three workspace columns.

function quickProjectOptions(select, onlyWithRepos=false){
  const projects=(state?.projects||[]).filter(p=>p.status!=='done' && (!onlyWithRepos || (p.subprojects||[]).length));
  select.innerHTML=projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  if(selectedProject!=='all' && projects.some(p=>p.id===selectedProject)) select.value=selectedProject;
  return projects;
}

function refreshQuickTaskRepos(){
  const p=projectById($('quickTaskProject').value);
  const repos=(p?.subprojects||[]).filter(s=>s.status!=='done');
  $('quickTaskRepo').innerHTML=repos.length?repos.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join(''):'<option value="">— crea prima un repo —</option>';
}

$('addProjectQuick').onclick=()=>openDialog(null,activeCategory==='all'?'commercial':activeCategory);

$('addRepoQuick').onclick=()=>{
  const projects=quickProjectOptions($('quickRepoProject'));
  if(!projects.length){alert('Crea prima un progetto.');return;}
  $('quickRepoName').value='';$('quickRepoStatus').value='active';$('quickRepoUrl').value='';$('quickRepoPath').value='';
  $('quickRepoDialog').showModal();
  setTimeout(()=>$('quickRepoName').focus(),0);
};

$('quickRepoSave').onclick=async()=>{
  const p=projectById($('quickRepoProject').value),name=$('quickRepoName').value.trim();
  if(!p)return alert('Seleziona un progetto.');
  if(!name)return alert('Inserisci il nome del repo.');
  if(!Array.isArray(p.subprojects))p.subprojects=[];
  p.subprojects.push({id:uid('sub'),name,status:$('quickRepoStatus').value,repoUrl:$('quickRepoUrl').value.trim(),localPath:$('quickRepoPath').value.trim(),tasks:[]});
  selectedProject=p.id;
  $('quickRepoDialog').close();
  await saveState();
};

$('addTaskQuick').onclick=()=>{
  const projects=quickProjectOptions($('quickTaskProject'),true);
  if(!projects.length){alert('Crea prima almeno un repo dentro un progetto.');return;}
  refreshQuickTaskRepos();
  $('quickTaskText').value='';$('quickTaskStatus').value='todo';
  $('quickTaskDialog').showModal();
  setTimeout(()=>$('quickTaskText').focus(),0);
};

$('quickTaskProject').onchange=refreshQuickTaskRepos;
$('quickTaskSave').onclick=async()=>{
  const p=projectById($('quickTaskProject').value),s=(p?.subprojects||[]).find(x=>x.id===$('quickTaskRepo').value),text=$('quickTaskText').value.trim();
  if(!p||!s)return alert('Seleziona un repo.');
  if(!text)return alert('Scrivi il task.');
  if(!Array.isArray(s.tasks))s.tasks=[];
  s.tasks.push({id:uid('t'),text,status:$('quickTaskStatus').value});
  selectedProject=p.id;
  $('quickTaskDialog').close();
  await saveState();
};
