import test from 'node:test';
import assert from 'node:assert/strict';
import {planSafetyTrip} from '../public/traffic-safety.js';
function encode(points){let a=0,b=0,out='';const emit=n=>{n=n<0?~(n<<1):n<<1;let s='';while(n>=32){s+=String.fromCharCode((32|(n&31))+63);n>>=5}return s+String.fromCharCode(n+63)};for(const [lat,lon] of points){const x=Math.round(lat*1e6),y=Math.round(lon*1e6);out+=emit(x-a)+emit(y-b);a=x;b=y}return out}
test('street details run alongside context; repeated geometry is cached; cancellation still works',{timeout:3000},async()=>{
 const real=globalThis.fetch,points=[[29.75011,-95.37011],[29.75111,-95.37011]],shape=encode(points);let routeCalls=0,edgeCalls=0,contextCalls=0,first=true;const pending=[];
 const trip={summary:{time:90,length:.069},legs:[{shape,maneuvers:[{length:.069,street_names:['Test street'],instruction:'Continue',begin_shape_index:0}]}]};
 const edges=[{length:.111,begin_shape_index:0,end_shape_index:1,road_class:'residential',use:'road',speed_limit:40,end_node:{intersecting_edges:[]}}];
 globalThis.fetch=async(url,options)=>{
  url=String(url);
  if(url.endsWith('/route')){routeCalls++;return Response.json({trip})}
  if(url.endsWith('/trace_attributes')){edgeCalls++;assert.equal(contextCalls,5,'all context fetches started before waiting for street details');first=false;for(const resolve of pending)resolve();return Response.json({edges})}
  contextCalls++;
  if(first)await new Promise(resolve=>pending.push(resolve));
  return Response.json(url.includes('interpreter')?{elements:[]}:url.startsWith('/api/reports')?{reports:[],truncated:false}:{features:[]});
 };
 try{
  const input={locations:points,mode:'pedestrian',prefs:{profile:'standard'}};
  const plan=await planSafetyTrip(input);assert.equal(plan.assessed,1);assert.equal(routeCalls,2);assert.equal(edgeCalls,1);
  const again=await planSafetyTrip(input);assert.equal(again.assessed,1);assert.equal(routeCalls,2);assert.equal(edgeCalls,1);assert.equal(contextCalls,10,'reports and local context stay fresh');
  const controller=new AbortController();controller.abort();await assert.rejects(planSafetyTrip({...input,signal:controller.signal}),{name:'AbortError'});
 }finally{globalThis.fetch=real}
});
