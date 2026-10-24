// Lat/lon compatibility keeps route geometry and GPS calculations independent of the renderer.
const lngLat=p=>[p[1],p[0]];
let serial=0;
export function createMapKit(){
 const fallback=window.L;
 class Surface{
  constructor(id){this.gl=new maplibregl.Map({container:id,style:'map-style.json',center:[-95.3698,29.7596],zoom:14,pitch:0,maxPitch:58,attributionControl:false});this.gl.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');this.pending=[];this.ready=false;this.gl.on('load',()=>{this.ready=true;for(const fn of this.pending)fn();this.pending=[]});this.gl.on('error',()=>{document.getElementById('map').dataset.network='error'});}
  whenReady(fn){if(this.ready)fn();else this.pending.push(fn)}
  setView(p,z){this.gl.jumpTo({center:lngLat(p),zoom:z});return this}
  on(name,fn){this.gl.on(name,e=>{if(name==='click'){if(e.originalEvent?.routeHandled||this.gl.queryRenderedFeatures(e.point).some(f=>f.layer.id.startsWith('overlay-')&&f.geometry.type==='LineString'))return;fn({...e,latlng:{lat:e.lngLat.lat,lng:e.lngLat.lng}})}else fn(e)});return this}
  flyTo(p,z,o={}){this.gl.flyTo({center:lngLat(p),zoom:z,duration:(o.duration??.8)*1000,padding:{top:0,bottom:0,left:0,right:0}})}
  panTo(p,o={}){this.gl.easeTo({center:lngLat(p),duration:(o.duration??.5)*1000,padding:{top:0,bottom:0,left:0,right:0}})}
  getZoom(){return this.gl.getZoom()} getCenter(){return this.gl.getCenter()}
  zoomIn(){this.gl.zoomIn()} zoomOut(){this.gl.zoomOut()} invalidateSize(){this.gl.resize()}
  closePopup(){this.popup?.remove()} removeLayer(l){l.remove()}
  getPane(){return {style:{}}} createPane(){return {style:{}}}
  fitBounds(points,o){const bounds=new maplibregl.LngLatBounds();points.forEach(p=>bounds.extend(lngLat(p)));const [left,top]=o.paddingTopLeft,[right,bottom]=o.paddingBottomRight;const height=this.gl.getContainer().clientHeight;this.gl.fitBounds(bounds,{padding:{left,right,top,bottom:Math.min(bottom,Math.max(0,height-top-100))},maxZoom:o.maxZoom,duration:650,retainPadding:true})}
  toggle3D(){this.three=!this.three;this.whenReady(()=>this.gl.setLayoutProperty('buildings-3d','visibility',this.three?'visible':'none'));this.gl.easeTo({pitch:this.three?45:0,bearing:this.three?-18:0,zoom:this.three?Math.max(14.7,this.gl.getZoom()-.55):this.gl.getZoom(),duration:750});return this.three}
 }
 class Group{constructor(){this.items=[]}addTo(map){this.map=map;return this}clearLayers(){this.items.forEach(x=>x.remove());this.items=[]}add(item){this.items.push(item);item.mount(this.map)}}
 class Layer{
  addTo(target){if(target instanceof Group)target.add(this);else this.mount(target);return this}
  remove(){this.removed=true;this.marker?.remove();if(this.map?.ready){for(const id of this.layers||[])if(this.map.gl.getLayer(id))this.map.gl.removeLayer(id);if(this.id&&this.map.gl.getSource(this.id))this.map.gl.removeSource(this.id)}}
 }
 class Marker extends Layer{
  constructor(p,o={}){super();this.p=p;this.options=o}
  mount(map){this.map=map;this.element=document.createElement('div');this.element.innerHTML=this.options.icon?.html||'';this.element.className='map-marker';this.element.style.zIndex=String(this.options.zIndexOffset||1);this.marker=new maplibregl.Marker({element:this.element}).setLngLat(lngLat(this.p)).addTo(map.gl)}
  on(name,fn){this.element.addEventListener(name,e=>fn({originalEvent:e}));return this}
  bindTooltip(text){const el=document.createElement('div');el.innerHTML=text;this.element.title=el.textContent;return this}
 }
 class Shape extends Layer{
  constructor(points,o,circle=false){super();this.points=points;this.o=o;this.circle=circle;this.id='overlay-'+(++serial);this.layers=[this.id]}
  mount(map){this.map=map;map.whenReady(()=>{if(this.removed)return;let geometry=this.circle?null:{type:'LineString',coordinates:this.points.map(lngLat)};if(this.circle){const [lat,lon]=this.points,r=this.o.radius/111320;geometry={type:'Polygon',coordinates:[Array.from({length:65},(_,i)=>{const t=i/64*Math.PI*2;return [lon+Math.cos(t)*r/Math.cos(lat*Math.PI/180),lat+Math.sin(t)*r]})]}}map.gl.addSource(this.id,{type:'geojson',data:{type:'Feature',properties:{},geometry}});map.gl.addLayer({id:this.id,source:this.id,type:this.circle?'fill':'line',...(this.circle?{paint:{'fill-color':this.o.fillColor,'fill-opacity':this.o.fillOpacity}}:{layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':this.o.color,'line-width':this.o.weight,'line-opacity':this.o.opacity}})});if(this.click){map.gl.on('click',this.id,this.click);this.listener=this.click}})}
  on(name,fn){if(name==='click')this.click=e=>{e.originalEvent.routeHandled=true;fn(e)};return this}
  remove(){if(this.listener)this.map.gl.off('click',this.id,this.listener);super.remove()}
 }
 class Label extends Layer{
  constructor(o){super();this.o=o}setLatLng(p){this.p=p;return this}setContent(s){this.content=s;return this}
  mount(map){const el=document.createElement('div');el.className=this.o.className;el.textContent=this.content;el.style.pointerEvents='none';this.marker=new maplibregl.Marker({element:el,offset:this.o.offset}).setLngLat(lngLat(this.p)).addTo(map.gl)}
 }
 class Popup{setLatLng(p){this.p=p;return this}setContent(el){this.el=el;return this}openOn(map){map.closePopup();map.popup=new maplibregl.Popup({offset:12}).setLngLat(lngLat(this.p)).setDOMContent(this.el).addTo(map.gl);return this}}
 class Tiles extends Layer{
  constructor(url,o){super();this.url=url;this.o=o;this.id='tiles-'+(++serial);this.layers=[this.id]}
  mount(map){this.map=map;map.whenReady(()=>{if(this.removed)return;map.gl.addSource(this.id,{type:'raster',tiles:[this.url],tileSize:256,attribution:this.o.attribution});const before=map.gl.getStyle().layers.find(l=>l.id.startsWith('overlay-'))?.id;map.gl.addLayer({id:this.id,type:'raster',source:this.id,paint:{'raster-opacity':this.o.opacity||.8}},before)})}
  setUrl(url){this.url=url;this.map.whenReady(()=>{if(!this.removed)this.map.gl.getSource(this.id)?.setTiles([url])})}on(){return this}
 }
 let failed=false;
 return {map:(id,o)=>{try{return new Surface(id)}catch(e){failed=true;document.getElementById(id).innerHTML='';return fallback.map(id,o)}},layerGroup:()=>failed?fallback.layerGroup():new Group(),tileLayer:(u,o)=>failed?fallback.tileLayer(u,o):new Tiles(u,o),marker:(p,o)=>failed?fallback.marker(p,o):new Marker(p,o),divIcon:o=>failed?fallback.divIcon(o):o,circle:(p,o)=>failed?fallback.circle(p,o):new Shape(p,o,true),polyline:(p,o)=>failed?fallback.polyline(p,o):new Shape(p,o),tooltip:o=>failed?fallback.tooltip(o):new Label(o),popup:()=>failed?fallback.popup():new Popup(),latLngBounds:p=>failed?fallback.latLngBounds(p):p,DomEvent:{stopPropagation:e=>e.originalEvent?.stopPropagation()}};
}
