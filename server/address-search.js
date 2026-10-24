// A house-number fallback for US addresses not individually mapped in OSM.
export function censusFeatures(matches){
 return matches.filter(m=>Number.isFinite(m.coordinates?.x)&&Number.isFinite(m.coordinates?.y)).map(m=>{
  const c=m.addressComponents||{},street=[c.preDirection,c.preType,c.streetName,c.suffixType,c.suffixDirection].filter(Boolean).join(' ');
  const number=m.matchedAddress?.match(/^\s*(\d+[A-Z-]*)\b/)?.[1]||'';
  return {type:'Feature',geometry:{type:'Point',coordinates:[m.coordinates.x,m.coordinates.y]},properties:{housenumber:number,street,city:c.city,state:c.state,postcode:c.zip,country:'United States',source:'census',estimated:true,name:[number,street].filter(Boolean).join(' ')||m.matchedAddress}};
 });
}
export async function addressSearch(req){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const reply=(body,status=200)=>Response.json(body,{status,headers});
 if(req.method!=='POST')return reply({error:'Use POST'},405);
 if(req.headers.get('Origin')!==new URL(req.url).origin)return reply({error:'Search from Safr'},403);
 if(!req.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'JSON required'},415);
 const text=await req.text();if(text.length>600)return reply({error:'Address too long'},413);
 let body;try{body=JSON.parse(text)}catch{return reply({error:'Invalid search'},400)}
 const q=typeof body.query==='string'?body.query.trim():'';
 if(q.length<6||q.length>160||!/^\d+[a-z-]*\s+\S/i.test(q))return reply({features:[]});
 // The local city is a fallback only. Explicit cities/ZIP codes are tried first.
 const queries=[q];if(body.houston&&!/\b(houston|texas|tx)\b|\b\d{5}\b/i.test(q))queries.push(q+', Houston, TX');
 try{
  for(const query of queries){
   const params=new URLSearchParams({address:query,benchmark:'Public_AR_Current',format:'json'});
   const r=await fetch('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?'+params,{signal:AbortSignal.timeout(5000)});
   if(!r.ok)throw Error('Address service unavailable');
   const d=await r.json(),features=censusFeatures(d.result?.addressMatches||[]);if(features.length)return reply({features});
  }
  return reply({features:[]});
 }catch{return reply({features:[],unavailable:true},503)}
}
