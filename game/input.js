export class GameInput{
 constructor(canvas,engine,renderer,{onKey=()=>{},onInteract=()=>{}}={}){
  this.canvas=canvas;this.engine=engine;this.renderer=renderer;this.keys=new Set();this.pointer=null;this.drag={x:0,y:0};this.joystick=document.getElementById('joystick');this.knob=document.getElementById('joystick-knob');this.onInteract=onInteract;
  window.addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){if(!engine.paused){e.preventDefault();this.keys.add(k);onInteract();}}else if(!e.repeat)onKey(k,e);});
  window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>this.clear());
  canvas.addEventListener('pointerdown',e=>this.down(e));canvas.addEventListener('pointermove',e=>this.move(e));canvas.addEventListener('pointerup',e=>this.up(e));canvas.addEventListener('pointercancel',()=>this.clear());
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
 }
 down(e){if(this.engine.paused||this.pointer!==null||e.button>0)return;e.preventDefault();this.canvas.focus({preventScroll:true});this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,touch:e.pointerType!=='mouse',moved:false};this.canvas.setPointerCapture(e.pointerId);this.engine.started=true;this.onInteract();if(this.pointer.touch){this.joystick.style.left=`${e.clientX-54}px`;this.joystick.style.top=`${e.clientY-54}px`;this.joystick.style.bottom='auto';this.joystick.classList.add('active');}}
 move(e){if(!this.pointer||this.pointer.id!==e.pointerId)return;let dx=e.clientX-this.pointer.x,dy=e.clientY-this.pointer.y;const d=Math.hypot(dx,dy);if(d>7)this.pointer.moved=true;const radius=45;if(d>radius){dx*=radius/d;dy*=radius/d;}this.drag={x:dx/radius,y:dy/radius};this.knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;}
 up(e){if(!this.pointer||this.pointer.id!==e.pointerId)return;if(!this.pointer.moved){const bounds=this.canvas.getBoundingClientRect(),x=e.clientX-bounds.left,y=e.clientY-bounds.top;this.navigateClick(x,y);}this.clear();}
 navigateClick(x,y){
  let found=null,best=30;for(const f of (this.engine.interactionMarkers?.()||this.engine.frontiers)){const p=this.renderer.project(f.x,1.4,f.z),q=this.renderer.project(f.x,0,f.z);const d=Math.min(Math.hypot(x-p.x,y-p.y),Math.hypot(x-q.x,y-q.y));if(d<best){best=d;found=f;}}
  if(found){this.engine.navigateTo(found.x,found.z);return;}
  let entity=null;best=32;for(const e of this.engine.entities){if(e.dead)continue;const p=this.renderer.project(e.x,e.type==='tree'?1.6:.7,e.z),d=Math.hypot(x-p.x,y-p.y);if(d<best){best=d;entity=e;}}
  if(entity){this.engine.navigateTo(entity.x,entity.z);return;}
  const world=this.renderer.unproject(x,y);this.engine.navigateTo(world.x,world.z);
 }
 clear(){this.keys.clear();this.pointer=null;this.drag={x:0,y:0};this.joystick.classList.remove('active');this.knob.style.transform='translate(-50%,-50%)';}
 vector(){
  if(this.engine.paused)return{x:0,z:0};let x=this.drag.x,y=this.drag.y;
  if(this.keys.has('a')||this.keys.has('arrowleft'))x-=1;if(this.keys.has('d')||this.keys.has('arrowright'))x+=1;if(this.keys.has('w')||this.keys.has('arrowup'))y-=1;if(this.keys.has('s')||this.keys.has('arrowdown'))y+=1;
  const m=Math.hypot(x,y);if(m<.08)return{x:0,z:0};let wx=x/.8660254+y/.5,wz=-x/.8660254+y/.5;const d=Math.hypot(wx,wz);return{x:wx/d*Math.min(1,m),z:wz/d*Math.min(1,m)};
 }
}
