let retryAt=0;
export function resetSearchCooldown(){retryAt=0}
const pause=(ms,signal)=>new Promise((resolve,reject)=>{
 if(signal?.aborted)return reject(new DOMException('Aborted','AbortError'));
 const finish=()=>{signal?.removeEventListener('abort',abort);resolve()},timer=setTimeout(finish,ms);
 function abort(){clearTimeout(timer);reject(new DOMException('Aborted','AbortError'))}signal?.addEventListener('abort',abort,{once:true});
});
export async function fetchSearch(url,{signal,fetcher=fetch,wait=pause,onRetry=()=>{}}={}){
 if(Date.now()<retryAt){const e=Error('Search is busy. Please try again shortly.');e.retryAfter=retryAt-Date.now();throw e}
 for(let attempt=0;attempt<2;attempt++){
  try{
   const r=await fetcher(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(7000)]):AbortSignal.timeout(7000)});
   if(r.status===429){const value=r.headers.get('Retry-After'),seconds=Number(value);const delay=value?(Number.isFinite(seconds)?seconds*1000:Date.parse(value)-Date.now()):60000;retryAt=Date.now()+Math.max(1000,Number.isFinite(delay)?delay:60000);const e=Error('Search is busy. Please try again shortly.');e.retryAfter=retryAt-Date.now();throw e}
   if(!r.ok){const e=Error('Places could not be loaded. Please retry.');e.retryable=r.status>=500;throw e}
   const data=await r.json();if(!Array.isArray(data.features)){const e=Error('Search returned an incomplete response. Please retry.');e.retryable=true;throw e}return data.features;
  }catch(e){
   if(signal?.aborted)throw new DOMException('Aborted','AbortError');
   if(e.retryAfter||e.retryable===false)throw e;
   if(attempt===0){onRetry();await wait(750,signal);continue}
   throw Error('Couldn’t reach place search. Check your connection and retry.');
  }
 }
}
