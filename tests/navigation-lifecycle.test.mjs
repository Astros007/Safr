import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
function setup(){
 const els=new Map(),state={routes:[{points:[[29.76,-95.37]],summary:{time:600}}],selected:0,request:1,loading:false,mode:'pedestrian',nav:false,watch:null};
 let fix,wake;const counts={watch:0,release:0};
 const ctx=vm.createContext({state,$:id=>{if(!els.has(id))els.set(id,{});return els.get(id)},icon:()=>'',minutes:s=>Math.round(s/60),getPosition:()=>new Promise(r=>fix=r),receiveGPS:p=>{state.gps={coords:[p.coords.latitude,p.coords.longitude],accuracy:p.coords.accuracy,timestamp:p.timestamp}},metersBetween:()=>0,toast:()=>{},locationError:()=>'',document:{body:{classList:{add(){},remove(){}}}},drawRoutes(){},map:{flyTo(){}},keepScreenOn:()=>new Promise(r=>wake=r),updateNavigation(){},navigator:{geolocation:{watchPosition(){counts.watch++;return 1}}},setInterval:()=>1,Date});
 vm.runInContext('let navStartBusy=false,navSession=0,lastSpoken=-1,navTimer=null,wakeLock=null;'+extract('function restoreStartButton()','$(\'cancel-nav-start\').onclick')+extract('async function startNavigation()','function endNavigation('),ctx);
 return {ctx,state,counts,fix:()=>fix({coords:{latitude:29.76,longitude:-95.37,accuracy:10},timestamp:Date.now()}),wake:()=>wake()};
}
test('canceling while GPS is pending prevents navigation from starting',async()=>{const t=setup();const running=vm.runInContext('startNavigation()',t.ctx);vm.runInContext('cancelNavStart()',t.ctx);t.fix();await running;assert.equal(t.state.nav,false);assert.equal(t.counts.watch,0)});
test('ending navigation during screen-lock setup never starts a GPS watcher',async()=>{const t=setup();const running=vm.runInContext('startNavigation()',t.ctx);t.fix();await new Promise(resolve=>setImmediate(resolve));assert.equal(t.state.nav,true);t.state.nav=false;vm.runInContext('cancelNavStart()',t.ctx);t.wake();await running;assert.equal(t.counts.watch,0)});
