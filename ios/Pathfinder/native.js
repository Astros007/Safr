(() => {
  let next = 0, awake = false;
  const callbacks = new Map(), bridge = window.webkit.messageHandlers;
  function stop(id) { clearTimeout(callbacks.get(id)?.timer); callbacks.delete(id); bridge.location.postMessage({action:'stop',id}); }
  function request(success, error, options = {}, watch = false) {
    const id = ++next;
    const timer = setTimeout(() => { const cb = callbacks.get(id); stop(id); cb?.error?.({code:3,message:'Location took too long. Try again.'}); }, Math.max(1000, options.timeout || 20000));
    callbacks.set(id, {success,error,watch,timer});
    bridge.location.postMessage({action:'start',id,watch}); return id;
  }
  window.pathfinderLocation = ({id,position,error}) => {
    const cb = callbacks.get(id); if (!cb) return;
    clearTimeout(cb.timer);
    if (error || !cb.watch) callbacks.delete(id);
    if (error) cb.error?.(error); else cb.success(position);
  };
  Object.defineProperty(navigator, 'geolocation', {value: {
    getCurrentPosition: (success,error,options) => {request(success,error,options);},
    watchPosition: (success,error,options) => request(success,error,options,true),
    clearWatch: stop
  }});
  Object.defineProperty(navigator, 'wakeLock', {value: {request: async () => {
    awake = true; bridge.location.postMessage({awake:true});
    return {release: async () => {awake=false;bridge.location.postMessage({awake:false});}, addEventListener() {}};
  }}});
  window.pathfinderResume = () => {if(awake) bridge.location.postMessage({awake:true});};
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url || input, location.href);
    if (url.protocol !== 'pathfinder:' || !url.pathname.startsWith('/api/')) return originalFetch(input,options);
    if (url.pathname !== '/api/address-search') return new Response(JSON.stringify({error:'Shared hazard reports are not connected in this iPhone version.'}),{status:503,headers:{'Content-Type':'application/json'}});
    if(options.signal?.aborted) throw new DOMException('Aborted','AbortError');
    const task = bridge.address.postMessage(JSON.parse(options.body || '{}'));
    const matches = await new Promise((resolve,reject) => {
      const abort=()=>reject(new DOMException('Aborted','AbortError'));
      options.signal?.addEventListener('abort',abort,{once:true});
      task.then(resolve,reject).finally(()=>options.signal?.removeEventListener('abort',abort));
    });
    const features = matches.filter(m=>Number.isFinite(m.coordinates?.x)&&Number.isFinite(m.coordinates?.y)).map(m=>{
      const c=m.addressComponents||{},street=[c.preDirection,c.preType,c.streetName,c.suffixType,c.suffixDirection].filter(Boolean).join(' '),number=m.matchedAddress?.match(/^\s*(\d+[A-Z-]*)\b/)?.[1]||'';
      return {type:'Feature',geometry:{type:'Point',coordinates:[m.coordinates.x,m.coordinates.y]},properties:{housenumber:number,street,city:c.city,state:c.state,postcode:c.zip,country:'United States',source:'census',estimated:true,name:[number,street].filter(Boolean).join(' ')||m.matchedAddress}};
    });
    return new Response(JSON.stringify({features}),{headers:{'Content-Type':'application/json'}});
  };
})();
