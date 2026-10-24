const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(){
 const messages=[]; const context={navigator:{},URL,Response,DOMException,setTimeout,clearTimeout,location:{href:'pathfinder://app/index.html'}};
 context.window={fetch:async()=>new Response('external'),webkit:{messageHandlers:{location:{postMessage:v=>messages.push(v)},address:{postMessage:async()=>[{coordinates:{x:-95.4,y:29.7},matchedAddress:'123 MAIN ST',addressComponents:{streetName:'MAIN',suffixType:'ST',city:'HOUSTON'}}]}}}};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../Pathfinder/native.js'),'utf8'),context);
 return {context,messages};
}
test('GPS watch delivers positions and can be cancelled',()=>{
 const {context:c,messages}=setup(); let received;
 const id=c.navigator.geolocation.watchPosition(p=>received=p);
 c.window.pathfinderLocation({id,position:{coords:{latitude:29.7}}});
 assert.equal(received.coords.latitude,29.7);
 c.navigator.geolocation.clearWatch(id);
 assert.equal(messages.at(-1).action,'stop');
});
test('Census addresses retain estimated-location flag',async()=>{
 const {context:c}=setup(); const response=await c.window.fetch('/api/address-search',{body:JSON.stringify({query:'123 Main St'})});
 const data=await response.json(); assert.equal(data.features[0].properties.estimated,true);assert.equal(data.features[0].properties.housenumber,'123');
});
test('Unconnected community service is unavailable, not an empty successful response',async()=>{
 const {context:c}=setup(); assert.equal((await c.window.fetch('/api/reports')).status,503);
});
test('Wake lock can release and restore after foregrounding',async()=>{
 const {context:c,messages}=setup(); const lock=await c.navigator.wakeLock.request();c.window.pathfinderResume();assert.equal(messages.at(-1).awake,true);await lock.release();assert.equal(messages.at(-1).awake,false);
});
