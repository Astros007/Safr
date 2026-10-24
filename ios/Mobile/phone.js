const sheet=document.getElementById('planner'),grip=document.getElementById('panel-toggle');
document.querySelector('.planner-head h1').textContent='Where to?';
document.getElementById('origin').placeholder='Address or current location';
document.getElementById('destination').placeholder='Search places or addresses';
for(const [id,hint] of [['origin','next'],['destination','search']]){
 const input=document.getElementById(id);
 input.type='search';input.enterKeyHint=hint;input.autocapitalize='words';input.spellcheck=false;
}
const root=document.documentElement;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let offset=0,peek=false,drag=null,animation=null,suppressClick=false;
const limit=()=>Math.max(0,sheet.offsetHeight-96);
function paint(y){
 offset=y;
 sheet.style.transform=`translate3d(0,${y}px,0)`;
 const docked=sheet.classList.contains('has-routes')&&!sheet.classList.contains('editing')&&!sheet.classList.contains('searching');
 root.style.setProperty('--sheet-height',Math.max(0,sheet.offsetHeight-y)+(docked?(document.getElementById('route-dock').getBoundingClientRect().height||80):0)+'px');
}
function settle(toPeek,animated=true){
 peek=toPeek;
 const from=offset,to=peek?limit():0;
 animation?.cancel();animation=null;
 const start=performance.now(),duration=reduceMotion.matches||!animated?0:340;
 grip.setAttribute('aria-expanded',String(!peek));
 grip.setAttribute('aria-label',peek?'Expand route panel':'Expand map');
 function frame(now){
  const t=duration?Math.min(1,(now-start)/duration):1;
  const eased=1-Math.pow(1-t,4);
  paint(from+(to-from)*eased);
  if(t<1){const id=requestAnimationFrame(frame);animation={cancel:()=>cancelAnimationFrame(id)}}else{animation=null;paint(to)}
 }
 frame(start);
}
new ResizeObserver(()=>{if(!drag&&!animation)paint(peek?limit():0)}).observe(sheet);
new MutationObserver(()=>{
 if(sheet.classList.contains('collapsed')){sheet.classList.remove('collapsed');settle(true);return}
 if(sheet.classList.contains('searching')||sheet.classList.contains('editing'))settle(false);
 else if(!drag&&!animation)paint(peek?limit():0);
}).observe(sheet,{attributes:true,attributeFilter:['class']});
const handles=[grip,document.querySelector('.planner-head')];
for(const handle of handles){
 handle.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  animation?.cancel();animation=null;
  drag={id:e.pointerId,start:e.clientY,offset,lastY:e.clientY,lastTime:performance.now(),velocity:0,moved:false,wasPeek:peek};
  handle.setPointerCapture(e.pointerId);sheet.classList.add('sheet-dragging');
 });
 handle.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const now=performance.now(),delta=e.clientY-drag.start;
  drag.moved ||= Math.abs(delta)>6;
  drag.velocity=(e.clientY-drag.lastY)/Math.max(1,now-drag.lastTime);
  drag.lastY=e.clientY;drag.lastTime=now;
  const proposed=drag.offset+delta;
  paint(proposed<0?proposed*.15:proposed>limit()?limit()+(proposed-limit())*.15:proposed);
 });
 function end(e,cancelled=false){
  if(!drag||drag.id!==e.pointerId)return;
  const d=drag;drag=null;sheet.classList.remove('sheet-dragging');
  suppressClick=d.moved;
  const velocity=performance.now()-d.lastTime<100?d.velocity:0;
  settle(cancelled?d.wasPeek:d.moved?(Math.abs(velocity)>.45?velocity>0:offset>limit()*.4):d.wasPeek);
  if(suppressClick)setTimeout(()=>suppressClick=false,400);
 }
 handle.addEventListener('pointerup',e=>end(e));
 handle.addEventListener('pointercancel',e=>end(e,true));
}
grip.onclick=()=>{if(!suppressClick)settle(!peek)};
document.querySelector('.planner-head').addEventListener('click',()=>{if(peek&&!suppressClick)settle(false)});
// Keep keyboard focus and edits visible even after the map was expanded.
document.addEventListener('focusin',e=>{if(e.target.matches('#origin,#destination')){document.body.classList.add('place-picker-open');document.querySelector('.planner-head h1').textContent=e.target.id==='origin'?'Choose starting point':'Choose destination';settle(false)}});
document.addEventListener('focusout',e=>{if(e.target.matches('#origin,#destination'))setTimeout(()=>{if(!document.activeElement?.matches('#origin,#destination,#find-route')&&!sheet.classList.contains('searching')){document.body.classList.remove('place-picker-open');document.querySelector('.planner-head h1').textContent='Where to?'}},120)});
document.getElementById('find-route').addEventListener('click',()=>document.body.classList.remove('place-picker-open'),{capture:true});
document.getElementById('edit-trip').addEventListener('click',()=>{peek=false;paint(0);settle(false,false)});
function keyboard(){
 const v=visualViewport, gap=v?Math.max(0,innerHeight-v.height-v.offsetTop):0;
 document.documentElement.style.setProperty('--keyboard',gap+'px');
 document.documentElement.style.setProperty('--visible-height',(v?.height||innerHeight)+'px');
 document.body.classList.toggle('keyboard-open',gap>80);
}
visualViewport?.addEventListener('resize',keyboard);
visualViewport?.addEventListener('scroll',keyboard);
document.addEventListener('focusin',e=>{if(e.target.matches('#origin,#destination'))sheet.classList.remove('collapsed')});
keyboard();paint(0);

// A successful GPS fix is already visible in the From field and on the map.
// Remove the redundant success banner so it does not cover useful map space.
const locationToast=document.getElementById('toast');
if(locationToast)new MutationObserver(()=>{
 if(!locationToast.hidden&&/^Location found(?:[.,]|$)/i.test(locationToast.textContent.trim()))locationToast.hidden=true;
}).observe(locationToast,{childList:true,subtree:true,characterData:true});

// Let the full-screen place picker dismiss with the familiar iOS swipe-down gesture.
const pickerHandle=document.querySelector('.planner-head');
let pickerSwipe=null;
pickerHandle.addEventListener('pointerdown',e=>{
 if(!document.body.classList.contains('place-picker-open'))return;
 e.stopImmediatePropagation();
 pickerSwipe={id:e.pointerId,start:e.clientY,last:e.clientY,time:performance.now()};
 pickerHandle.setPointerCapture(e.pointerId);sheet.classList.add('picker-swiping');
},{capture:true});
pickerHandle.addEventListener('pointermove',e=>{
 if(!pickerSwipe||pickerSwipe.id!==e.pointerId)return;
 e.stopImmediatePropagation();pickerSwipe.last=e.clientY;
 const distance=Math.max(0,e.clientY-pickerSwipe.start);
 sheet.style.setProperty('--picker-drag',Math.min(distance,180)+'px');
},{capture:true});
function finishPickerSwipe(e,cancelled=false){
 if(!pickerSwipe||pickerSwipe.id!==e.pointerId)return;
 e.stopImmediatePropagation();
 const distance=Math.max(0,pickerSwipe.last-pickerSwipe.start);
 const speed=distance/Math.max(1,performance.now()-pickerSwipe.time);
 pickerSwipe=null;sheet.classList.remove('picker-swiping');
 if(!cancelled&&(distance>78||speed>.55)){
  document.activeElement?.blur();
  const dismiss=document.getElementById('search-dismiss');
  if(dismiss&&!document.getElementById('search-results').hidden)dismiss.click();
  document.body.classList.remove('place-picker-open');
  document.querySelector('.planner-head h1').textContent='Where to?';
 }
 sheet.style.removeProperty('--picker-drag');
}
pickerHandle.addEventListener('pointerup',e=>finishPickerSwipe(e),{capture:true});
pickerHandle.addEventListener('pointercancel',e=>finishPickerSwipe(e,true),{capture:true});

// Confirm before navigation when the route begins somewhere other than GPS.
const startChoice=document.createElement('div');
startChoice.id='start-location-choice';startChoice.hidden=true;
startChoice.innerHTML=`<div class="start-choice-backdrop"></div><section role="dialog" aria-modal="true" aria-labelledby="start-choice-title"><div class="start-choice-icon">⌖</div><h2 id="start-choice-title">This isn’t your current location</h2><p>The route starts at <strong id="chosen-start-name"></strong>. Where do you want directions to begin?</p><button type="button" class="primary full" data-start-choice="selected">Start from selected location</button><button type="button" class="secondary full" data-start-choice="current">Use my current location</button><button type="button" class="text-button full" data-start-choice="cancel">Cancel</button></section>`;
document.body.append(startChoice);
let allowSelectedStart=false;
const startNavigationButton=document.getElementById('start-nav');
startNavigationButton?.addEventListener('click',e=>{
 const origin=document.getElementById('origin').value.trim();
 if(allowSelectedStart||!origin||/^my current location$/i.test(origin)){allowSelectedStart=false;return}
 e.preventDefault();e.stopImmediatePropagation();
 document.getElementById('chosen-start-name').textContent=origin;
 startChoice.hidden=false;
},{capture:true});
startChoice.addEventListener('click',e=>{
 const choice=e.target.closest('[data-start-choice]')?.dataset.startChoice;
 if(!choice)return;
 startChoice.hidden=true;
 if(choice==='selected'){window.safrKeepSelectedStart=true;allowSelectedStart=true;startNavigationButton.click();return}
 if(choice==='current'){
  window.safrKeepSelectedStart=false;
  document.getElementById('locate-inline').click();
  const deadline=Date.now()+17000;
  const waitForGPS=setInterval(()=>{
   const ready=/^my current location$/i.test(document.getElementById('origin').value.trim());
   if(ready||Date.now()>deadline){clearInterval(waitForGPS);if(ready)startNavigationButton.click()}
  },200);
 }
 if(choice==='cancel')window.safrKeepSelectedStart=false;
});
