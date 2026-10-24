const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderDirections({route,origin,destination,mode,distance,minutes,arrow,onStart,onMap}){
 const dialog=document.getElementById('details-dialog');
 const svg=(name)=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
 document.getElementById('details-title').textContent='Directions';
 const list=document.getElementById('directions-list');
 list.innerHTML=`<section class="directions-overview" aria-label="Trip overview"><div class="directions-mode">${svg(mode==='bicycle'?'bike':'walk')}<span>${mode==='bicycle'?'Bike ride':'Walk'}</span><span class="directions-route-name">${escape(route.name||'Selected route')}</span></div><div class="directions-totals"><strong>${minutes(route.summary.time)}<span> min</span></strong><span>${route.summary.length.toFixed(1)} mi</span></div><div class="directions-endpoints"><div><i class="endpoint-start"></i><span>${escape(origin?.name||'Starting point')}</span></div><div><i class="endpoint-end"></i><strong>${escape(destination?.name||'Destination')}</strong></div></div></section><div class="directions-list-label">YOUR ROUTE <span>${route.steps.length} steps</span></div><ol class="turn-list">${route.steps.map((step,index)=>{
 const last=index===route.steps.length-1,arrived=[4,5,6].includes(step.type),symbol=arrow(step);
 const paths={'←':'M18 20V11a4 4 0 0 0-4-4H4m5-5L4 7l5 5','→':'M6 20V11a4 4 0 0 1 4-4h10m-5-5 5 5-5 5','↶':'M7 20V8a5 5 0 0 1 10 0v8m-4-4 4 4 4-4','↻':'M5 10a7 7 0 1 0 3-6m-3-2v8h8','↑':'M12 21V3m-7 7 7-7 7 7'};
 const mark=arrived?svg('pin'):`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[symbol]||paths['↑']}"/></svg>`;
 return `<li class="turn-item${arrived?' turn-arrival':''}"><div class="turn-symbol">${mark}</div><div class="turn-copy"><span class="turn-index">${arrived?'ARRIVE':index===0?'START':`STEP ${index+1}`}</span><p>${escape(step.instruction)}</p>${!arrived&&step.length>0?`<span class="turn-distance">Continue for <strong>${escape(distance(step.length*1609.344))}</strong></span>`:''}</div></li>`;
 }).join('')}</ol>`;
 let footer=dialog.querySelector('.directions-footer');
 if(!footer){footer=document.createElement('div');footer.className='directions-footer';dialog.append(footer)}
 footer.innerHTML=`<button type="button" class="directions-map">${svg('route')}<span>View map</span></button><button type="button" class="primary directions-start">${svg('nav')}<span>${mode==='bicycle'?'Start ride':'Start walk'}</span></button>`;
 footer.querySelector('.directions-map').onclick=()=>{dialog.close();onMap()};
 footer.querySelector('.directions-start').onclick=()=>{dialog.close();onStart()};
 dialog.showModal();list.scrollTop=0;
}
