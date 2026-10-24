// Size floating UI from its rendered content rather than fixed-height guesses.
const root=document.documentElement,body=document.body;
let pending=false;
const box=selector=>{const el=document.querySelector(selector);if(!el||!el.getClientRects().length||getComputedStyle(el).display==='none')return null;return el.getBoundingClientRect()};
function layout(){
 pending=false;
 const dock=box('#route-dock'),nav=box('.nav-bottom'),banner=box('.nav-banner');
 root.style.setProperty('--route-dock-height',`${dock?.height||80}px`);
 root.style.setProperty('--nav-bottom-height',`${nav?.height||100}px`);
 root.style.setProperty('--nav-banner-bottom',`${banner?.bottom||140}px`);
 const header=box('.brandbar'),status=box('.map-status'),legend=box('.map-legend');
 const top=Math.max(header?.bottom||0,status?.bottom||0,legend?.bottom||0)+12;
 root.style.setProperty('--top-chrome-bottom',`${top}px`);
 const sheet=box('#planner');
 if(sheet&&!body.classList.contains('navigating'))root.style.setProperty('--sheet-height',Math.max(0,innerHeight-sheet.top)+'px');
 const controls=box('.map-controls');
 const ceiling=body.classList.contains('navigating')?(banner?.bottom||0)+12:top;
 body.classList.toggle('tight-map',!!controls&&controls.top<ceiling);
}
const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(layout)}};
const resize=new ResizeObserver(schedule);
for(const s of ['#route-dock','.nav-bottom','.nav-banner','.brandbar','.map-status','.map-legend','#planner','.map-controls']){const el=document.querySelector(s);if(el)resize.observe(el)}
new MutationObserver(schedule).observe(body,{attributes:true,attributeFilter:['class']});
for(const s of ['#route-dock','#planner','#navigation','#map-legend']){const el=document.querySelector(s);if(el)new MutationObserver(schedule).observe(el,{attributes:true,attributeFilter:['hidden','class']})}
window.addEventListener('resize',schedule);visualViewport?.addEventListener('resize',schedule);
schedule();
