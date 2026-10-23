(() => {
const mode=document.getElementById("amountMode"), gross=document.getElementById("lordo"), net=document.getElementById("nettoTarget"), help=document.getElementById("amountModeHelp");
if(!mode||!gross||!net)return;
function solve(target){
const prior=num(document.getElementById("cumulato").value), cfg=settingsFromForm();
let low=0,high=Math.max(100,target*3);
for(let i=0;i<30&&calcFrom(prior,high,cfg).netto<target;i++)high*=2;
for(let i=0;i<60;i++){const mid=(low+high)/2;if(calcFrom(prior,mid,cfg).netto<target)low=mid;else high=mid;}
let best=Math.round(high*100),error=Infinity;
for(let k=Math.max(0,best-3);k<=best+3;k++){const e=Math.abs(calcFrom(prior,k/100,cfg).netto-target);if(e<error){best=k;error=e;}}
return best/100;
}
function recalc(){if(mode.value!=="netto")return;const target=num(net.value);gross.value=target?String(solve(target)).replace(".",","):"";renderPreview();}
mode.addEventListener("change",()=>{const active=mode.value==="netto";gross.hidden=active;net.hidden=!active;help.textContent=active?"Il lordo viene calcolato dal netto concordato.":"Inserisci il lordo concordato.";if(active){net.value=gross.value?String(Math.round(formSnapshot().netto*100)/100).replace(".",","):"";recalc();}else renderPreview();});
net.addEventListener("input",recalc);
["franchigia","aliquota","quotaLavoratore","ritenutaPerc","sostituto","altraCopertura"].forEach(id=>{const el=document.getElementById(id);if(el){el.addEventListener("input",recalc);el.addEventListener("change",recalc);}});
const oldClear=clearForm;clearForm=function(){oldClear();mode.value="lordo";gross.hidden=false;net.hidden=true;net.value="";help.textContent="Inserisci il lordo concordato.";};
const oldLoad=loadPending;loadPending=function(...args){mode.value="lordo";gross.hidden=false;net.hidden=true;net.value="";return oldLoad(...args);};
})();