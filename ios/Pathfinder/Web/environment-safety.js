// Approximate solar elevation using NOAA's fractional-year equations.
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF
export function solarElevation([lat,lon],time=Date.now()){
 const d=new Date(time),year=d.getUTCFullYear(),day=(Date.UTC(year,d.getUTCMonth(),d.getUTCDate())-Date.UTC(year,0,1))/86400000+1;
 const hour=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600,days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
 const g=2*Math.PI/days*(day-1+(hour-12)/24),c=Math.cos,s=Math.sin;
 const eq=229.18*(.000075+.001868*c(g)-.032077*s(g)-.014615*c(2*g)-.040849*s(2*g));
 const dec=.006918-.399912*c(g)+.070257*s(g)-.006758*c(2*g)+.000907*s(2*g)-.002697*c(3*g)+.00148*s(3*g);
 const ha=(hour*60+eq+4*lon)/4-180,r=lat*Math.PI/180;
 return Math.asin(Math.max(-1,Math.min(1,s(r)*s(dec)+c(r)*c(dec)*c(ha*Math.PI/180))))*180/Math.PI;
}
export function darkDuringTrip(points,seconds,now=Date.now()){
 if(!points?.length)return false;
 const n=Math.max(2,Math.min(288,Math.ceil(seconds/300)));
 for(let i=0;i<=n;i++)if(solarElevation(points[Math.round(i/n*(points.length-1))],now+seconds*1000*i/n)<-.833)return true;
 return false;
}
export const NOTE_KINDS={lighting:'Poor lighting',sidewalk:'Broken sidewalk',obstruction:'Blocked path',crossing:'Difficult crossing'};
const key='safr-personal-hazards-v1';
export function readNotes(now=Date.now()){
 try{return JSON.parse(localStorage.getItem(key)||'[]').filter(n=>NOTE_KINDS[n.kind]&&Number.isFinite(n.lat)&&Number.isFinite(n.lon)&&Math.abs(n.lat)<=90&&Math.abs(n.lon)<=180&&n.expires>now&&n.created<=now).slice(-100)}catch{return []}
}
export function saveNote(kind,coords,now=Date.now()){
 if(!NOTE_KINDS[kind])throw Error('Choose a hazard type.');
 const notes=readNotes(now),note={id:'personal-'+now,kind,lat:coords[0],lon:coords[1],created:now,expires:now+86400000};
 // One note per type and approximate 40m cell; repeat taps renew the expiry.
 const kept=notes.filter(n=>!(n.kind===kind&&Math.abs(n.lat-note.lat)<.0004&&Math.abs(n.lon-note.lon)<.0004));
 localStorage.setItem(key,JSON.stringify([...kept,note].slice(-100)));return note;
}
export function clearNotes(){localStorage.removeItem(key)}
