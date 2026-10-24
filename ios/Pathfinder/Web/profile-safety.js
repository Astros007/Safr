import {readNotes} from './environment-safety.js';
import {metersBetween} from './geo.js';
export const PROFILES={
 standard:{name:'Everyday',crossing:1,speed:1,missing:2,unknown:.25,unlit:.8,curb:3,steps:2},
 child:{name:'With a child',crossing:2.5,speed:1.4,missing:5,unknown:.6,unlit:1.5,curb:4,steps:3},
 older:{name:'Older walker',crossing:1.8,speed:1.15,missing:5,unknown:.7,unlit:2,curb:7,steps:12},
 wheelchair:{name:'Wheelchair',crossing:1.5,speed:1,missing:15,unknown:2,unlit:1.2,curb:30,steps:100}
};
export function routeBox(routes){const points=routes.flatMap(r=>r.points);return [Math.min(...points.map(p=>p[1]))-.0015,Math.min(...points.map(p=>p[0]))-.0015,Math.max(...points.map(p=>p[1]))+.0015,Math.max(...points.map(p=>p[0]))+.0015]}
export async function loadLocalContext(routes,signal){
 const bbox=routeBox(routes);if(bbox[0]<-96.2||bbox[2]>-94.7||bbox[1]<29.3||bbox[3]>30.3||(bbox[2]-bbox[0])*(bbox[3]-bbox[1])>.04)return {sidewalks:null,osm:null,reports:[],reportsAvailable:false};
 const q='?bbox='+bbox.join(',');
 const localSignal=()=>signal?AbortSignal.any([signal,AbortSignal.timeout(6000)]):AbortSignal.timeout(6000);
 const sidewalkQuery=new URLSearchParams({f:'geojson',where:'1=1',geometry:bbox.join(','),geometryType:'esriGeometryEnvelope',spatialRel:'esriSpatialRelIntersects',inSR:'4326',outSR:'4326',outFields:'OBJECTID',resultRecordCount:'2000'});
 const results=await Promise.allSettled([
  fetch('https://overpass.private.coffee/api/interpreter?data='+encodeURIComponent(`[out:json][timeout:12];(way[highway][lit](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});way[highway][sidewalk](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});way[highway][wheelchair](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});node[kerb](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});node[highway=crossing](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}););out tags geom;`),{signal:localSignal()}).then(async r=>{if(!r.ok)throw Error();const d=await r.json();if(d.remark||!Array.isArray(d.elements)||d.elements.length>10000)throw Error();return {osm:d.elements}}),
  fetch('/api/reports'+q,{signal:localSignal()}).then(async r=>{if(!r.ok)throw Error();return r.json()}),
  fetch('https://geogimsms.houstontx.gov/arcgis/rest/services/HPC/LandbaseAndRoads_hpc/MapServer/21/query?'+sidewalkQuery,{signal:localSignal()}).then(async r=>{if(!r.ok)throw Error();const d=await r.json();if(d.error||d.exceededTransferLimit||!Array.isArray(d.features))throw Error();return d.features})
 ]);
 return {osm:results[0].status==='fulfilled'?results[0].value.osm:null,sidewalks:results[2].status==='fulfilled'?results[2].value:null,reports:results[1].status==='fulfilled'?results[1].value.reports:[],reportsAvailable:results[1].status==='fulfilled'&&!results[1].value.truncated};
}
export function distanceToLine(p,points){let best=Infinity;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],k=Math.cos(p[0]*Math.PI/180),ax=(a[1]-p[1])*111320*k,ay=(a[0]-p[0])*111320,dx=(b[1]-a[1])*111320*k,dy=(b[0]-a[0])*111320,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,Math.hypot(ax+t*dx,ay+t*dy))}return best}
export function localIndex(context={}){
 const ways=new Map(),nodes=[],sidewalks=[];
 for(const e of context.osm||[]){if(e.type==='way')ways.set(String(e.id),e.tags||{});else if(e.type==='node'&&Number.isFinite(e.lat))nodes.push(e)}
 for(const f of context.sidewalks||[]){const g=f.geometry;for(const line of g?.type==='MultiLineString'?g.coordinates:g?.type==='LineString'?[g.coordinates]:[])sidewalks.push(line.map(([lon,lat])=>[lat,lon]))}
 // Index sidewalk segments into ~200 m cells for efficient route sampling.
 const cells=new Map();for(const line of sidewalks)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];for(let y=Math.floor(Math.min(a[0],b[0])/.002);y<=Math.floor(Math.max(a[0],b[0])/.002);y++)for(let x=Math.floor(Math.min(a[1],b[1])/.002);x<=Math.floor(Math.max(a[1],b[1])/.002);x++){const k=`${y}:${x}`;if(!cells.has(k))cells.set(k,[]);cells.get(k).push([a,b])}}
 return {context,ways,nodes,reports:[...(context.reports||[]),...readNotes()],sidewalkNear(p){const x=Math.floor(p[1]/.002),y=Math.floor(p[0]/.002);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)for(const line of cells.get(`${y+dy}:${x+dx}`)||[])if(distanceToLine(p,line)<15)return true;return false}};
}
export function segmentContext(edge,points,profile,mode,index,usedReports,usedCurbs,night=false){
 const weights=PROFILES[profile]||PROFILES.standard,tags=index.ways.get(String(edge.way_id))||{};
 const length=points.slice(1).reduce((s,p,i)=>s+metersBetween(points[i],p),0),path=['footway','sidewalk','pedestrian','path','cycleway'].includes(edge.use),road=!path&&edge.use!=='pedestrian_crossing'&&edge.use!=='steps';
 const sidewalk=path||['left','right','both'].includes(edge.sidewalk)||['yes','both','left','right','separate'].includes(tags.sidewalk);
 const missing=!sidewalk&&(tags.sidewalk==='no'||tags.sidewalk==='none');
 let localMeters=0;if(road&&!sidewalk)for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],m=metersBetween(a,b),n=Math.max(1,Math.ceil(m/30));for(let j=0;j<n;j++){const t=(j+.5)/n;if(index.sidewalkNear([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]))localMeters+=m/n}}
 const unknown=road&&!sidewalk&&!missing?Math.max(0,length-localMeters):0,unlit=tags.lit==='no',lit=tags.lit==='yes',steps=edge.use==='steps',blocked=tags.wheelchair==='no';
 let score=mode==='pedestrian'?length/100*(missing?weights.missing:0)+unknown/100*weights.unknown:0;
 if(unlit&&night)score+=length/100*weights.unlit*3;if(steps)score+=weights.steps;if(blocked&&profile==='wheelchair')score+=100;
 let curbBarriers=0,curbsKnown=0;for(const n of index.nodes){if(!n.tags?.kerb||usedCurbs.has(n.id)||distanceToLine([n.lat,n.lon],points)>12)continue;usedCurbs.add(n.id);curbsKnown++;if(n.tags.kerb==='raised'){curbBarriers++;score+=weights.curb}}
 const reports=[];for(const r of index.reports){if(usedReports.has(r.id)||distanceToLine([r.lat,r.lon],points)>25)continue;usedReports.add(r.id);reports.push(r)}
 // Repeated reports of the same hazard in one ~40 m cell cannot stack penalties.
 const groups=new Set();for(const r of reports){const k=`${r.kind}:${Math.round(r.lat/.0004)}:${Math.round(r.lon/.0004)}`;if(groups.has(k)||usedReports.has('cell:'+k))continue;groups.add(k);usedReports.add('cell:'+k);score+=Math.min(15,({crossing:5*weights.crossing,sidewalk:weights.missing,curb:weights.curb,lighting:night?weights.unlit*3:0,near_miss:3*weights.speed,obstruction:profile==='wheelchair'?12:4})[r.kind]??2)}
 return {score,length,sidewalkMeters:sidewalk?length:0,localSidewalkMeters:localMeters,missingSidewalkMeters:missing?length:0,unknownSidewalkMeters:unknown,litMeters:lit?length:0,unlitMeters:unlit?length:0,lightingUnknownMeters:!lit&&!unlit?length:0,steps:steps?1:0,blocked:blocked?1:0,curbBarriers,curbsKnown,reports:reports.length,tags,profile};
}
export function explainComparison(a,b){
 if(!a)return [];
 const reasons=[];if(b&&a!==b){const crossings=b.intersections-a.intersections;if(crossings>0)reasons.push(`${crossings} fewer major junction${crossings===1?'':'s'}`);const unsignaled=b.unsignaled-a.unsignaled;if(unsignaled>0)reasons.push(`${unsignaled} fewer junction${unsignaled===1?'':'s'} without a mapped signal`);const fast=b.fastMeters-a.fastMeters;if(fast>80)reasons.push(`${(fast/1609.344).toFixed(1)} fewer miles along fast roads`);const sidewalks=a.sidewalkMeters-b.sidewalkMeters;if(sidewalks>80)reasons.push(`${(sidewalks/1609.344).toFixed(1)} more miles of mapped sidewalks or paths`);const reports=b.reportCount-a.reportCount;if(reports>0)reasons.push(`Passes ${reports} fewer reported hazards`)}
 if(!reasons.length)reasons.push('Best match for your route preferences');
 return reasons.slice(0,4);
}
