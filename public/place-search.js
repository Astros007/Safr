import {metersBetween} from './geo.js';
export function searchArea(center,zoom=14){
  const radius=Math.max(15000,Math.min(100000,15000*2**(12-zoom)));
  const dy=radius/111320,dx=dy/Math.max(.1,Math.cos(center[0]*Math.PI/180));
  return {center,radius,bbox:[Math.max(-180,center[1]-dx),Math.max(-85,center[0]-dy),Math.min(180,center[1]+dx),Math.min(85,center[0]+dy)]};
}
export function placeLabel(feature){
  const p=feature.properties||{},address=[p.housenumber,p.street].filter(Boolean).join(' ');
  const title=address&&(!p.name||p.name===p.housenumber||p.name===p.street)?address:p.name||address||p.city||'Unnamed place';
  const detail=[address!==title?address:'',p.city||p.town||p.village||p.district,p.state,p.postcode].filter(Boolean);
  return {title,detail:[...new Set(detail)].join(', ')||p.country||''};
}
export function rankPlaces(features,query,area,local=true){
  const number=query.match(/^\s*(\d+[a-z]?)\s+\S/i)?.[1]?.toLowerCase(),seen=new Set();
  return features.filter(f=>Array.isArray(f.geometry?.coordinates)&&f.geometry.coordinates.every(Number.isFinite)).map((f,index)=>{
    const [lon,lat]=f.geometry.coordinates,p=f.properties||{},distance=metersBetween(area.center,[lat,lon]);
    const exactNumber=!number||String(p.housenumber||'').toLowerCase()===number;
    return {f,index,distance,exactNumber};
  }).filter(({f,distance})=>{
    if(local&&distance>area.radius*1.42)return false;
    const label=placeLabel(f),key=label.title.toLowerCase()+label.detail+f.geometry.coordinates.map(x=>x.toFixed(4)).join();
    if(seen.has(key))return false;seen.add(key);return true;
  }).sort((a,b)=>Number(b.exactNumber)-Number(a.exactNumber)||(local||number?a.distance-b.distance:a.index-b.index)).slice(0,6).map(x=>x.f);
}
export function searchParams(query,area,zoom,local=true){
  const params=new URLSearchParams({q:query,limit:'15',lang:'en',lat:area.center[0],lon:area.center[1],zoom:String(Math.round(Math.max(8,Math.min(16,Number.isFinite(zoom)?zoom:14)))),location_bias_scale:'0.1'});
  if(local)params.set('bbox',area.bbox.join(','));
  // Let address words and an explicit city outweigh the initial map location.
  if(!local&&/^\s*\d+[a-z]?\s+\S/i.test(query))for(const key of ['lat','lon','zoom','location_bias_scale'])params.delete(key);
  return params;
}
