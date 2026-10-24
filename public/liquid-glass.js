// Specular highlight follows pointer movement without touching the map renderer.
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const pointer=matchMedia('(pointer: fine)');
let frame=0,pending;
document.addEventListener('pointermove',event=>{
 if(motion.matches||!pointer.matches)return;
 const surface=event.target.closest('.brandbar,.planner,.map-pill,.map-control,.route-dock,.nav-bottom,dialog');
 if(!surface)return;
 pending={surface,x:event.clientX,y:event.clientY};
 if(frame)return;
 frame=requestAnimationFrame(()=>{frame=0;const {surface,x,y}=pending;const bounds=surface.getBoundingClientRect();surface.style.setProperty('--glass-x',`${(x-bounds.left)/bounds.width*100}%`);surface.style.setProperty('--glass-y',`${(y-bounds.top)/bounds.height*100}%`)});
},{passive:true});
