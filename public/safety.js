import {metersBetween} from './geo.js';

// City of Houston Vision Zero High Injury Network: fatal and serious-injury
// crashes recorded in 2018–2022. This is historical corridor exposure, not a
// prediction of whether a trip will be safe today.
export const SAFETY_SOURCE='https://services.arcgis.com/NummVBqZSIJKUeVR/ArcGIS/rest/services/COH_Vision_Zero_High_Injury_Network_2022_view/FeatureServer/19';

function routeBounds(routes){
  const all=routes.flatMap(route=>route.points);
  const lats=all.map(p=>p[0]),lons=all.map(p=>p[1]);
  return [Math.min(...lons)-.003,Math.min(...lats)-.003,Math.max(...lons)+.003,Math.max(...lats)+.003];
}

export async function loadCrashCorridors(routes,signal){
  if(!routes.length)return null;
  const bbox=routeBounds(routes);
  // The Houston dataset has no coverage elsewhere. Avoid broad queries that
  // might silently truncate ArcGIS results and produce misleading scores.
  if(bbox[0]<-96.1||bbox[2]>-94.8||bbox[1]<29.4||bbox[3]>30.2||
     (bbox[2]-bbox[0])*(bbox[3]-bbox[1])>.02)return null;
  const params=new URLSearchParams({where:'1=1',geometry:bbox.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields:'Full_Name',f:'geojson',resultRecordCount:'2000'});
  const response=await fetch(`${SAFETY_SOURCE}/query?${params}`,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(6000)]):AbortSignal.timeout(6000)});
  if(!response.ok)throw Error('Crash history unavailable');
  const data=await response.json();
  if(data.error||data.exceededTransferLimit||!Array.isArray(data.features))throw Error('Crash history incomplete');
  return data.features.flatMap(feature=>{
    const geometry=feature.geometry;
    if(!geometry)return [];
    const lines=geometry.type==='MultiLineString'?geometry.coordinates:geometry.type==='LineString'?[geometry.coordinates]:[];
    return lines.filter(line=>line.length>1).map(line=>line.map(([lon,lat])=>[lat,lon]));
  });
}

function pointToSegmentMeters(point,a,b){
  const scale=111320*Math.cos(point[0]*Math.PI/180);
  const ax=(a[1]-point[1])*scale,ay=(a[0]-point[0])*111320;
  const bx=(b[1]-point[1])*scale,by=(b[0]-point[0])*111320;
  const dx=bx-ax,dy=by-ay;
  const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(ax+t*dx,ay+t*dy);
}

export function corridorExposure(points,corridors){
  const segments=corridors.flatMap(line=>line.slice(1).map((point,i)=>[line[i],point]));
  let exposed=0,total=0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],length=metersBetween(a,b);
    if(!Number.isFinite(length)||length>50000)continue;
    const samples=Math.max(1,Math.ceil(length/35));
    total+=length;
    for(let j=0;j<samples;j++){
      const fraction=(j+.5)/samples;
      const sample=[a[0]+(b[0]-a[0])*fraction,a[1]+(b[1]-a[1])*fraction];
      if(segments.some(([x,y])=>sample[0]>=Math.min(x[0],y[0])-.0004&&sample[0]<=Math.max(x[0],y[0])+.0004&&
          sample[1]>=Math.min(x[1],y[1])-.0005&&sample[1]<=Math.max(x[1],y[1])+.0005&&pointToSegmentMeters(sample,x,y)<=35))exposed+=length/samples;
    }
  }
  return {meters:Math.round(exposed),percent:total?Math.round(exposed/total*100):0};
}
