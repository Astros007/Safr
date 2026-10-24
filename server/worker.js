import {addressSearch} from './address-search.js';
import {database} from './db.js';
const kinds=new Set(['crossing','sidewalk','curb','lighting','near_miss','obstruction']);
const DAYS90=90*86400000;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function identity(req,env){return req.headers.get('oai-authenticated-user-id')||(env.LOCAL_PREVIEW==='1'&&['localhost','127.0.0.1'].includes(new URL(req.url).hostname)?'local-preview-user':null)}
function bounds(url){const b=(url.searchParams.get('bbox')||'').split(',').map(Number);if(b.length!==4||!b.every(Number.isFinite)||b[0]>=b[2]||b[1]>=b[3]||b[0]<-96.2||b[2]>-94.7||b[1]<29.3||b[3]>30.3||(b[2]-b[0])*(b[3]-b[1])>.04)throw Error('Choose a smaller area in greater Houston.');return b}
export function validReport(v){return v&&kinds.has(v.kind)&&typeof v.note==='string'&&v.note.length<=280&&Number.isFinite(v.lat)&&Number.isFinite(v.lon)&&v.lat>=29.3&&v.lat<=30.3&&v.lon>=-96.2&&v.lon<=-94.7&&typeof v.id==='string'&&/^[a-f0-9-]{36}$/.test(v.id)}
export default {async fetch(req,env,ctx){
 const url=new URL(req.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(req);
 try{
  const user=identity(req,env);
  if(url.pathname==='/api/session')return json({signedIn:!!user,preview:env.LOCAL_PREVIEW==='1'});
  if(url.pathname==='/api/address-search')return addressSearch(req);
  const db=database(env);
  if(url.pathname==='/api/reports'&&req.method==='GET'){
   let b;try{b=bounds(url)}catch(e){return json({error:e.message},400)}
   const rows=await db.prepare('SELECT id,author,kind,lat,lon,note,created FROM reports WHERE status = ? AND created >= ? AND lon BETWEEN ? AND ? AND lat BETWEEN ? AND ? ORDER BY created DESC LIMIT 1001').bind('active',Date.now()-DAYS90,b[0],b[2],b[1],b[3]).all();
   return json({reports:rows.results.slice(0,1000).map(({author,...r})=>({...r,mine:author===user})),truncated:rows.results.length>1000});
  }
  if(url.pathname==='/api/civic'&&req.method==='GET'){
   const r=await db.prepare('SELECT CAST(lat*500 AS INTEGER) AS y, CAST(lon*500 AS INTEGER) AS x, kind, COUNT(*) AS count, MAX(created) AS latest FROM reports WHERE status = ? AND created >= ? GROUP BY y,x,kind LIMIT 5000').bind('active',Date.now()-DAYS90).all();
   return json({cells:r.results.map(r=>({lat:(r.y+.5)/500,lon:(r.x-.5)/500,kind:r.kind,count:r.count,latest:r.latest})),periodDays:90,notice:'Unverified community observations. Counts reflect reporting activity, not crash rates.'});
  }
  if(req.method==='POST'||req.method==='PATCH'){
   if(!user)return json({error:'Sign in to contribute a report.'},401);
   if(req.headers.get('Origin')!==url.origin)return json({error:'Please submit from Safr.'},403);
   if(!req.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required'},415);
   const text=await req.text();if(text.length>2000)return json({error:'Report is too long.'},413);
   let v;try{v=JSON.parse(text)}catch{return json({error:'Invalid report.'},400)}
   if(url.pathname==='/api/reports'&&req.method==='POST'){
    if(!validReport(v))return json({error:'Choose a hazard type and a map location in greater Houston. Notes must be 280 characters or fewer.'},400);
    const existing=await db.prepare('SELECT author FROM reports WHERE id = ?').bind(v.id).first();if(existing)return existing.author===user?json({saved:true,id:v.id}):json({error:'Report ID already used.'},409);
    const now=Date.now();
    const saved=await db.prepare('INSERT INTO reports (id,author,kind,lat,lon,note,status,created,updated) SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM reports WHERE author = ? AND created > ?) < 12 AND NOT EXISTS (SELECT 1 FROM reports WHERE author = ? AND kind = ? AND status = ? AND ABS(lat - ?) < 0.0004 AND ABS(lon - ?) < 0.0004 AND created > ?)').bind(v.id,user,v.kind,+v.lat.toFixed(5),+v.lon.toFixed(5),v.note.trim(),'active',now,now,user,now-86400000,user,v.kind,'active',v.lat,v.lon,now-DAYS90).run();
    return saved.meta.changes?json({saved:true,id:v.id},201):json({error:'You already reported this hazard nearby, or reached 12 reports today.'},429);
   }
   if(url.pathname==='/api/reports'&&req.method==='PATCH'){
    if(typeof v.id!=='string'||v.status!=='withdrawn')return json({error:'Invalid update.'},400);
    const r=await db.prepare('UPDATE reports SET status = ?, updated = ? WHERE id = ? AND author = ?').bind('withdrawn',Date.now(),v.id,user).run();return r.meta.changes?json({saved:true}):json({error:'Report not found.'},404);
   }
  }
  return json({error:'Not found'},404);
 }catch(error){console.error('Safr API failure',url.pathname,error.message);return json({error:'This service is temporarily unavailable. Your draft has been kept; please try again.'},503)}
}};
