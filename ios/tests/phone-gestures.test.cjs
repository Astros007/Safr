const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 const elements=new Map();
 function el(id){if(elements.has(id))return elements.get(id);const classes=new Set(),listeners={};const e={offsetHeight:400,getBoundingClientRect:()=>({height:80}),style:{setProperty(){}},classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x),toggle(){}},setAttribute(){},setPointerCapture(){},matches:()=>false,addEventListener:(k,f)=>(listeners[k]??=[]).push(f),emit(k,v){for(const f of listeners[k]||[])f(v)}};elements.set(id,e);return e;}
 let now=0,frames=new Map(),next=0;
 const c={document:{getElementById:el,querySelector:el,documentElement:el('root'),body:el('body'),addEventListener(){}},matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},MutationObserver:class{observe(){}},performance:{now:()=>now},requestAnimationFrame:f=>{frames.set(++next,f);return next},cancelAnimationFrame:id=>frames.delete(id),visualViewport:null,innerHeight:800,setTimeout:()=>0};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../Mobile/phone.js','utf8'),c);
 const grip=el('panel-toggle'),sheet=el('planner');
 return {sheet,grip,move(y,t){now=t;grip.emit('pointermove',{pointerId:1,clientY:y})},down(y=0){grip.emit('pointerdown',{pointerId:1,clientY:y,pointerType:'touch'})},up(y){grip.emit('pointerup',{pointerId:1,clientY:y})},finish(){now+=400;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(now))}};
}
test('sheet tracks finger before release and snaps down',()=>{const h=setup();h.down();h.move(150,100);assert.equal(h.sheet.style.transform,'translate3d(0,150px,0)');h.up(150);h.finish();assert.equal(h.sheet.style.transform,'translate3d(0,304px,0)')});
test('upward drag from collapsed sheet returns to expanded',()=>{const h=setup();h.down();h.move(200,100);h.up(200);h.finish();h.down(300);h.move(50,600);h.up(50);h.finish();assert.equal(h.sheet.style.transform,'translate3d(0,0px,0)')});
test('overscroll is resisted and returns to valid position',()=>{const h=setup();h.down(100);h.move(0,100);assert.equal(h.sheet.style.transform,'translate3d(0,-15px,0)');h.up(0);h.finish();assert.equal(h.sheet.style.transform,'translate3d(0,0px,0)')});
