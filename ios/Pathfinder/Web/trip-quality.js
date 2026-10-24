export function gpsQuality(gps,now=Date.now()){
 if(!gps||!Number.isFinite(gps.timestamp)||now-gps.timestamp>25000)return 'stale';
 if(!Number.isFinite(gps.accuracy)||gps.accuracy>75)return 'imprecise';
 return 'ready';
}
export function accessNotice(route){
 const edges=route?.edges||[];
 if(edges.some(e=>e.tunnel)||/\btunnel\b/i.test(route?.via||''))return 'Includes a tunnel. Check opening hours and public access before setting out.';
 return '';
}
