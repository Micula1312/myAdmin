(function(){
  const current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const items=[
    ['index.html','HOME'],
    ['business.html','BUSINESS'],
    ['projects.html','PLANNING'],
    ['calls.html','CALLS'],
    ['calendar.html','CALENDAR']
  ];
  const nav=document.createElement('header');
  nav.className='global-nav';
  nav.innerHTML=`<a class="global-brand" href="index.html">myAdmin</a><nav>${items.map(([href,label])=>`<a href="${href}" class="${current===href?'active':''}">${label}</a>`).join('')}</nav><span class="global-status">LOCAL / 2026</span>`;
  document.body.prepend(nav);
})();