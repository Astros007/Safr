import {PROFILES,loadLocalContext,localIndex,segmentContext} from './profile-safety.js';
import {decodeShape,metersBetween,routeDistances} from './geo.js';
import {loadCrashCorridors, corridorExposure} from './safety.js';

export const AADT_SOURCE='https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_AADT/FeatureServer/0';
const VALHALLA='https://valhalla1.openstreetmap.de';
const MAJOR=new Set(['motorway','trunk','primary','secondary']);
const PATHS=new Set(['footway','sidewalk','cycleway','path','steps','pedestrian']);
const CLASS_WEIGHT={motorway:5,trunk:5,primary:3.5,secondary:2.5,tertiary:1.2,unclassified:.6,residential:.25,service_other:.1};
// Conservative class estimates are only used when a posted limit is absent.
const CLASS_KPH={motorway:100,trunk:80,primary:65,secondary:55,tertiary:45,unclassified:40,residential:40,service_other:25};

function combinedSignal(signal,timeout=18000){return signal?AbortSignal.any([signal,AbortSignal.timeout(timeout)]):AbortSignal.timeout(timeout)}
// Short-lived memory cache avoids re-fetching the same geometry on edits.
const routeCache=new Map();
async function request(path,payload,signal){
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const key=path+JSON.stringify(payload),cached=routeCache.get(key);
  if(cached&&Date.now()-cached.time<300000)return cached.data;
  const response=await fetch(`${VALHALLA}/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:combinedSignal(signal,path==='route'?12000:8000)});
  const data=await response.json();
  if(!response.ok||data.error)throw Error(data.error||'Route service unavailable');
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  if(routeCache.size>=48)routeCache.delete(routeCache.keys().next().value);
  routeCache.set(key,{time:Date.now(),data});return data;
}
export function routePayload(locations,mode,kind,prefs={},pathOverride=false){
  const safety=kind==='safety';
  return {locations:locations.map(coords=>({lat:coords[0],lon:coords[1],type:'break'})),costing:mode,units:'miles',language:'en-US',alternates:1,
    costing_options:{pedestrian:{type:prefs.profile==='wheelchair'?'wheelchair':'foot',walking_speed:prefs.profile==='older'?3.5:prefs.profile==='wheelchair'?4:5.1,step_penalty:prefs.profile==='wheelchair'?10000:prefs.profile==='older'?300:30,walkway_factor:safety?(pathOverride?.15:prefs.paths===false?.65:.25):1,sidewalk_factor:safety?.4:1,alley_factor:2,driveway_factor:5,use_ferry:0,shortest:kind==='shortest'},
    bicycle:{bicycle_type:'city',cycling_speed:18,use_roads:safety?0:1,use_hills:.5,use_ferry:0,avoid_bad_surfaces:prefs.rain?.95:prefs.surfaces?.8:.25,shortest:kind==='shortest'}}};
}
function makeRoute(trip,kind){
  const leg=trip.legs?.[0];if(!leg?.shape)throw Error('Route shape missing');
  const points=decodeShape(leg.shape);if(points.length<2)throw Error('Route shape incomplete');
  const names=[...new Set(leg.maneuvers.filter(m=>m.length>.04).flatMap(m=>m.street_names||[]))].slice(0,3);
  return {shape:leg.shape,points,distances:routeDistances(points),summary:trip.summary,steps:leg.maneuvers,via:names.join(' · ')||'Mapped paths and local streets',kind,assessment:null};
}
export async function fetchRouteAttributes(route,mode,signal){
  const attributes=['edge.way_id','edge.length','edge.road_class','edge.use','edge.speed_limit','edge.lane_count','edge.cycle_lane','edge.sidewalk','edge.bridge','edge.tunnel','edge.begin_shape_index','edge.end_shape_index','edge.names','edge.begin_heading','edge.end_heading','edge.end_osm_node_id','node.intersecting_edge.road_class','node.intersecting_edge.driveability','node.intersecting_edge.lane_count','node.intersecting_edge.use','node.traffic_signal'];
  const data=await request('trace_attributes',{encoded_polyline:route.shape,shape_match:'edge_walk',costing:mode,units:'kilometers',filters:{action:'include',attributes}},signal);
  if(!data.edges?.length)throw Error('Road details unavailable');
  const covered=data.edges.reduce((n,e)=>n+(Number(e.length)||0)*1000,0);
  if(covered<route.distances.at(-1)*.85)throw Error('Road details incomplete');
  return data.edges;
}
function bounds(routes){
  const b=[Infinity,Infinity,-Infinity,-Infinity];
  for(const r of routes)for(const [lat,lon] of r.points){b[0]=Math.min(b[0],lon);b[1]=Math.min(b[1],lat);b[2]=Math.max(b[2],lon);b[3]=Math.max(b[3],lat)}
  return [b[0]-.002,b[1]-.002,b[2]+.002,b[3]+.002];
}
export async function loadTrafficVolumes(routes,signal){
  const b=bounds(routes);if(b[0]<-107||b[2]>-93||b[1]<25||b[3]>37)return null;
  const features=[];
  for(let offset=0;offset<6000;offset+=2000){
    const q=new URLSearchParams({where:'AADT_CUR > 0',geometry:b.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields:'AADT_CUR,EXT_DATE',f:'geojson',resultRecordCount:'2000',resultOffset:String(offset)});
    const r=await fetch(AADT_SOURCE+'/query?'+q,{signal:combinedSignal(signal,6000)});const d=await r.json();
    if(!r.ok||d.error||!Array.isArray(d.features))throw Error('Traffic counts unavailable');
    features.push(...d.features);
    if(!d.exceededTransferLimit)return features;
  }
  throw Error('Traffic count coverage incomplete');
}
function pointSegment(p,a,b){
  const scale=111320*Math.cos(p[0]*Math.PI/180),ax=(a[1]-p[1])*scale,ay=(a[0]-p[0])*111320,bx=(b[1]-p[1])*scale,by=(b[0]-p[0])*111320;
  const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(ax+t*dx,ay+t*dy);
}
function bearing(a,b){return Math.atan2((b[1]-a[1])*Math.cos(a[0]*Math.PI/180),b[0]-a[0])*180/Math.PI}
// A small spatial index avoids scanning every traffic-count road for every sample.
export function trafficIndex(features){
  if(!features)return null;
  const cells=new Map(),size=.002;
  for(const f of features){
    const geometry=f.geometry;if(!geometry)continue;
    const lines=geometry.type==='MultiLineString'?geometry.coordinates:geometry.type==='LineString'?[geometry.coordinates]:[];
    for(const line of lines)for(let i=1;i<line.length;i++){
      const a=[line[i-1][1],line[i-1][0]],b=[line[i][1],line[i][0]],s={a,b,heading:bearing(a,b),volume:Number(f.properties.AADT_CUR)};
      for(let y=Math.floor(Math.min(a[0],b[0])/size);y<=Math.floor(Math.max(a[0],b[0])/size);y++)for(let x=Math.floor(Math.min(a[1],b[1])/size);x<=Math.floor(Math.max(a[1],b[1])/size);x++){
        const key=`${y}:${x}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(s);
      }
    }
  }
  return {at(p,heading){
    let best=22,volume=null;const y=Math.floor(p[0]/size),x=Math.floor(p[1]/size);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)for(const segment of cells.get(`${y+dy}:${x+dx}`)||[]){
      const diff=Math.abs(((heading-segment.heading)%180+180)%180);if(Math.min(diff,180-diff)>35)continue;
      const distance=pointSegment(p,segment.a,segment.b);if(distance<best){best=distance;volume=segment.volume}
    }
    return volume;
  }};
}
function samples(points){
  const result=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],length=metersBetween(a,b),count=Math.max(1,Math.ceil(length/45));
    for(let j=0;j<count;j++){const t=(j+.5)/count;result.push({point:[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])],length:length/count,heading:bearing(a,b)})}
  }
  return result;
}
export function assessRoute(route,edges,mode,index,crashCorridors,prefs={},local=localIndex()){
  const profile=prefs.profile||'standard',weights=PROFILES[profile]||PROFILES.standard,usedReports=new Set(),usedCurbs=new Set();
  const result={score:0,fastMeters:0,majorMeters:0,highVolumeMeters:0,volumeMappedMeters:0,pathMeters:0,roadMeters:0,speedKnownMeters:0,intersections:0,unsignaled:0,totalMeters:0,crashMeters:null,volumeAvailable:!!index,hazards:[]};
  Object.assign(result,{profile,segments:[],sidewalkMeters:0,localSidewalkMeters:0,missingSidewalkMeters:0,unknownSidewalkMeters:0,litMeters:0,unlitMeters:0,lightingUnknownMeters:0,steps:0,blocked:0,curbBarriers:0,curbsKnown:0,reportCount:0});
  const junctions=[];
  for(let i=0;i<edges.length;i++){
    const e=edges[i],path=PATHS.has(e.use),crossing=e.use==='pedestrian_crossing';
    const isRoad=!path&&!crossing,major=MAJOR.has(e.road_class),limit=Number(e.speed_limit),known=limit>0&&limit<160;
    const speed=known?limit:CLASS_KPH[e.road_class]||40;
    const protectedFactor=path?.08:mode==='pedestrian'&&['left','right','both'].includes(e.sidewalk)?.45:mode==='bicycle'&&e.cycle_lane==='separated'?.3:mode==='bicycle'&&['dedicated','shared'].includes(e.cycle_lane)?.7:1;
    const points=route.points.slice(e.begin_shape_index,e.end_shape_index+1);
    let edgeScore=0;
    for(const sample of samples(points)){
      const m=sample.length;result.totalMeters+=m;if(path)result.pathMeters+=m;
      if(isRoad){result.roadMeters+=m;if(known)result.speedKnownMeters+=m;if(speed>=56.3)result.fastMeters+=m;if(major)result.majorMeters+=m}
      const volume=index&&!(path&&(e.bridge||e.tunnel))&&!crossing?index.at(sample.point,sample.heading):null;
      if(volume!==null){result.volumeMappedMeters+=m;if(volume>=10000)result.highVolumeMeters+=m}
      const volumeWeight=volume>=20000?4:volume>=10000?2.5:volume>=5000?.8:0;
      const speedWeight=isRoad?(speed>=72.4?5:speed>=56.3?3:speed>=40?.6:0):0;
      const classWeight=isRoad?(CLASS_WEIGHT[e.road_class]??.6):0;
      edgeScore+=m/100*((.25+classWeight+speedWeight+volumeWeight)*protectedFactor);
    }
    edgeScore*=weights.speed;
    const extra=segmentContext(e,points,profile,mode,local,usedReports,usedCurbs);
    for(const key of ['sidewalkMeters','localSidewalkMeters','missingSidewalkMeters','unknownSidewalkMeters','litMeters','unlitMeters','lightingUnknownMeters','steps','blocked','curbBarriers','curbsKnown'])result[key]+=extra[key];
    result.reportCount+=extra.reports;
    const crash=crashCorridors?corridorExposure(points,crashCorridors).meters:0;
    edgeScore+=extra.score+crash/100*2;result.score+=edgeScore;
    const segment={name:(e.names||[]).map(n=>typeof n==='string'?n:n.value).filter(Boolean).join(' / ')||'Unnamed path or street',points,score:edgeScore,speed:known?limit:null,roadClass:e.road_class,sidewalk:extra.sidewalkMeters>0?'mapped':extra.missingSidewalkMeters>0?'missing':extra.localSidewalkMeters>0?'inventory nearby':'unknown',lighting:extra.litMeters>0?'mapped lit':extra.unlitMeters>0?'mapped unlit':'unknown',reports:extra.reports,steps:extra.steps,curbBarriers:extra.curbBarriers,majorJunction:false,signal:false};
    result.segments.push(segment);
    const node=e.end_node,otherRoads=(node?.intersecting_edges||[]).filter(x=>['forward','backward','both'].includes(x.driveability));
    const majorJunction=otherRoads.some(x=>MAJOR.has(x.road_class)||Number(x.lane_count)>=4)||(isRoad&&(major||Number(e.lane_count)>=4)&&otherRoads.length>0);
    const point=route.points[e.end_shape_index];
    if(majorJunction&&point&&!junctions.some(j=>metersBetween(j,point)<35)){
      junctions.push(point);result.intersections++;if(!node.traffic_signal)result.unsignaled++;
      const penalty=(node.traffic_signal?6:9)*weights.crossing;result.score+=penalty;segment.score+=penalty;segment.majorJunction=true;segment.signal=!!node.traffic_signal;
      result.hazards.push({point,weight:(node.traffic_signal?6:9)*weights.crossing,type:'intersection'});
    }
    if(edgeScore>1&&points.length>1)result.hazards.push({point:points[Math.floor(points.length/2)],weight:edgeScore,type:'road'});
  }
  if(result.totalMeters<route.distances.at(-1)*.85)throw Error('Insufficient road geometry');
  if(crashCorridors){const exposure=corridorExposure(route.points,crashCorridors);result.crashMeters=exposure.meters;}
  result.hazards.sort((a,b)=>b.weight-a.weight);
  return result;
}
export function chooseRoutes(routes,prefs={}){
  const eligible=prefs.profile==='wheelchair'?routes.filter(r=>r.assessment&&!r.assessment.steps&&!r.assessment.blocked):routes;
  if(!eligible.length)throw Error('No assessed route without mapped stairs or wheelchair restrictions was found. Try another destination or starting point.');
  const quickest=eligible.reduce((best,r)=>r.summary.time<best.summary.time?r:best,eligible[0]);
  const assessed=routes.filter(r=>r.assessment&&(prefs.profile!=='wheelchair'||(!r.assessment.steps&&!r.assessment.blocked)));
  if(prefs.profile==='wheelchair'&&!assessed.length)throw Error('No assessed route without mapped stairs or wheelchair restrictions was found. Try another destination or starting point.');
  assessed.sort((a,b)=>(prefs.goal==='crossings'?(a.assessment.unsignaled-b.assessment.unsignaled||a.assessment.intersections-b.assessment.intersections):0)||a.assessment.score-b.assessment.score||a.summary.time-b.summary.time);
  const safest=assessed[0]||routes.find(r=>r.kind==='safety')||quickest;
  const displayed=[safest];if(quickest!==safest)displayed.push(quickest);
  safest.name=safest.assessment?(prefs.goal==='crossings'?'Fewer junctions':'Safety route'):'Paths preferred';quickest.name=quickest===safest?(safest.assessment?'Safety route · also quickest':'Quickest found'):'Quickest route';
  return {routes:displayed,quickest,safest,compared:routes.length,assessed:assessed.length,improvement:safest.assessment&&quickest.assessment&&quickest.assessment.score>0?Math.max(0,(1-safest.assessment.score/quickest.assessment.score)*100):null};
}
export async function planSafetyTrip({locations,mode,prefs,pathOverride,signal,onProgress=()=>{}}){
  onProgress('Finding routes…');
  const searches=await Promise.allSettled(['safety','quick'].map(async kind=>{
    const d=await request('route',routePayload(locations,mode,kind,prefs,pathOverride),signal);
    return [d.trip,...(d.alternates||[]).map(x=>x.trip)].filter(Boolean).map(trip=>makeRoute(trip,kind));
  }));
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const routes=[],shapes=new Set();
  for(const search of searches)if(search.status==='fulfilled')for(const route of search.value){if(!shapes.has(route.shape)){shapes.add(route.shape);routes.push(route)}}
  if(!routes.length)throw Error('No route found. Try a nearby street or path.');
  onProgress('Checking road safety…');
  // Fetch context and street details together, once, for the same candidate set.
  // Keep optional datasets bounded; absent coverage remains explicitly unknown.
  const contextTask=Promise.allSettled([loadTrafficVolumes(routes,signal),loadCrashCorridors(routes,signal),loadLocalContext(routes,signal)]);
  let next=0;
  const edgeTask=Promise.all(Array.from({length:Math.min(3,routes.length)},async()=>{
    while(next<routes.length&&!signal?.aborted){const route=routes[next++];try{route.edges=await fetchRouteAttributes(route,mode,signal)}catch{route.edges=null}}
  }));
  const [contexts]=await Promise.all([contextTask,edgeTask]);
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const local=localIndex(contexts[2].status==='fulfilled'?contexts[2].value:{});
  const index=trafficIndex(contexts[0].status==='fulfilled'?contexts[0].value:null);
  const corridors=contexts[1].status==='fulfilled'?contexts[1].value:null;
  for(const route of routes){try{route.assessment=route.edges?assessRoute(route,route.edges,mode,index,corridors,prefs,local):null}catch{route.assessment=null}}
  return {...chooseRoutes(routes,prefs),profile:prefs.profile||'standard',goal:prefs.goal||'exposure',localData:{sidewalks:!!local.context.sidewalks,osm:!!local.context.osm,reports:!!local.context.reportsAvailable},volumeAvailable:!!index,crashAvailable:!!corridors,partialSearch:searches.some(s=>s.status==='rejected')};
}
