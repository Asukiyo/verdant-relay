import {WorldRenderer} from './renderer.js';
import {TILE_SIZE,BUILDINGS,clamp,seeded,key,distance} from './config.js';
const TAU=Math.PI*2;

/** Smooth, shaded snow-world skin. Simulation and saved worlds remain independent. */
export class SnowRenderer extends WorldRenderer {
 constructor(canvas,engine){super(canvas,engine);this.sprites=new Map();this.sceneryCache=new Map();this.reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;engine.on('harvest',()=>{if(!this.reducedMotion)this.shake=Math.max(this.shake,.065);});engine.on('power',()=>{if(!this.reducedMotion)this.shake=.23;});}
 resize(){super.resize();this.scale*=1.08;this.forestCache=null;}
 surface(w,h){let canvas;if(this.canvas.ownerDocument){canvas=this.canvas.ownerDocument.createElement('canvas');canvas.width=w;canvas.height=h;}else if(typeof OffscreenCanvas!=='undefined')canvas=new OffscreenCanvas(w,h);else canvas=new this.canvas.constructor(w,h);return canvas;}
 orb(x,y,rx,ry,light='#ffffff',dark='#9cb7ca',rotation=0,stroke=null){
  const c=this.ctx;c.save();c.translate(x,y);c.rotate(rotation);c.scale(rx,ry);const g=c.createRadialGradient(-.28,-.38,.03,.04,.1,1.05);g.addColorStop(0,light);g.addColorStop(.3,light);g.addColorStop(1,dark);c.fillStyle=g;c.beginPath();c.arc(0,0,1,0,TAU);c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=Math.max(.7,this.scale*.022)/Math.max(rx,ry);c.stroke();}c.restore();
 }
 shadow(x,z,rx,rz,opacity=.16){const p=this.project(x,0,z),c=this.ctx;c.save();c.fillStyle=`rgba(54,93,137,${opacity})`;c.beginPath();c.ellipse(p.x+this.scale*.17,p.y+this.scale*.15,rx*this.scale,rz*this.scale,0,0,TAU);c.fill();c.restore();}
 drawWater(){
  const c=this.ctx,g=c.createLinearGradient(0,0,this.width,this.height);g.addColorStop(0,'#c8e0f2');g.addColorStop(.5,'#e4f3fd');g.addColorStop(1,'#d2e8f7');c.fillStyle=g;c.fillRect(0,0,this.width,this.height);
  let cache=this.forestCache;const pad=240;let dx=cache?((cache.x-this.camera.x)-(cache.z-this.camera.z))*.8660254*this.scale:0,dy=cache?((cache.x-this.camera.x)+(cache.z-this.camera.z))*.5*this.scale:0;
  if(!cache||cache.tiles!==this.engine.tiles.size||Math.abs(dx)>pad*.6||Math.abs(dy)>pad*.6){
   const canvas=this.surface(this.width+pad*2,this.height+pad*2),ctx=canvas.getContext('2d');this.ctx=ctx;ctx.translate(pad,pad);
   try{for(const t of this.forestObjects().sort((a,b)=>a.x+a.z-b.x-b.z))this.drawTree(t.data);}finally{this.ctx=c;}
   cache=this.forestCache={canvas,x:this.camera.x,z:this.camera.z,tiles:this.engine.tiles.size};dx=0;dy=0;
  }
  c.drawImage(cache.canvas,dx-pad,dy-pad);
 }
 drawLand(){
  const c=this.ctx,r=TILE_SIZE/2;
  for(const t of this.engine.tiles.values()){
   const x=t.x*TILE_SIZE,z=t.z*TILE_SIZE;if(!this.visible(x,z,280))continue;
   const age=this.engine.time-t.created;c.save();c.globalAlpha=clamp(age*2.5,0,1);
   this.worldPoly([[x-r,0,z-r],[x+r,0,z-r],[x+r,0,z+r],[x-r,0,z+r]],'#edf8ff');
   for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]])if(!this.engine.tiles.has(key(t.x+dx,t.z+dz))){
    const a=dx?this.project(x+dx*r,0,z-r):this.project(x-r,0,z+dz*r),b=dx?this.project(x+dx*r,0,z+r):this.project(x+r,0,z+dz*r);
    c.lineCap='round';c.strokeStyle='#ffffffa0';c.lineWidth=12;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.strokeStyle='#b0ccdf66';c.lineWidth=1.5;c.setLineDash([5,7]);c.stroke();c.setLineDash([]);
   }
   const rand=seeded(t.seed);for(let i=0;i<8;i++){const p=this.project(x+(rand()-.5)*TILE_SIZE,0,z+(rand()-.5)*TILE_SIZE);c.fillStyle='#cce0ee28';c.beginPath();c.ellipse(p.x,p.y,8+rand()*12,3,0,0,TAU);c.fill();}c.restore();
  }
 }
 forestObjects(){
  const e=this.engine,cell=e.cellAt(this.camera.x,this.camera.z),out=[];
  for(let x=cell.x-4;x<=cell.x+4;x++)for(let z=cell.z-4;z<=cell.z+4;z++){
   const k=key(x,z);if(e.tiles.has(k)||!this.visible(x*TILE_SIZE,z*TILE_SIZE,470))continue;
   let trees=this.sceneryCache.get(k);if(!trees){const rand=seeded(x*71993+z*38371+9341);trees=[];for(let i=0;i<4;i++)for(let j=0;j<4;j++){trees.push({x:x*TILE_SIZE+(i-1.5)*1.6+(rand()-.5)*.45,z:z*TILE_SIZE+(j-1.5)*1.6+(rand()-.5)*.45,scale:.88+rand()*.22,variant:Math.floor(rand()*3),seed:rand(),hit:0,dead:0,fall:0,scenery:true});}this.sceneryCache.set(k,trees);}
   for(const data of trees)if(this.visible(data.x,data.z,380))out.push({type:'scenery',x:data.x,z:data.z,data});
  }
  // Cache is bounded as the player explores ever farther from the first clearing.
  if(this.sceneryCache.size>160){for(const k of this.sceneryCache.keys()){const[x,z]=k.split(',').map(Number);if(Math.abs(x-cell.x)>5||Math.abs(z-cell.z)>5)this.sceneryCache.delete(k);}}
  return out;
 }
 treeSprite(variant=0){
  if(this.sprites.has(variant))return this.sprites.get(variant);
  let canvas;if(this.canvas.ownerDocument){canvas=this.canvas.ownerDocument.createElement('canvas');canvas.width=220;canvas.height=310;}else if(typeof OffscreenCanvas!=='undefined')canvas=new OffscreenCanvas(220,310);else canvas=new this.canvas.constructor(220,310);
  const c=canvas.getContext('2d');c.translate(110,285);const trunk=c.createLinearGradient(-12,0,12,0);trunk.addColorStop(0,'#785149');trunk.addColorStop(.4,'#b9846b');trunk.addColorStop(1,'#775748');c.fillStyle=trunk;c.beginPath();c.roundRect(-12,-64,24,64,9);c.fill();
  const layer=(y,w,h,tint)=>{c.save();c.translate(0,y);const g=c.createLinearGradient(-w*.35,-h,w*.3,10);g.addColorStop(0,'#edf9ff');g.addColorStop(.35,tint);g.addColorStop(1,'#779bb9');c.fillStyle=g;c.strokeStyle='#476d908c';c.lineWidth=2.7;
   c.beginPath();c.moveTo(0,-h);c.bezierCurveTo(-w*.065,-h*.65,-w*.26,-h*.25,-w*.5,-5);c.quadraticCurveTo(-w*.44,4,-w*.32,2);c.lineTo(-w*.27,-13);c.lineTo(-w*.24,7);c.quadraticCurveTo(-w*.15,12,-w*.075,7);c.lineTo(-w*.035,-8);c.lineTo(w*.005,12);c.quadraticCurveTo(w*.13,14,w*.2,6);c.lineTo(w*.225,-12);c.lineTo(w*.28,6);c.quadraticCurveTo(w*.4,10,w*.5,-4);c.bezierCurveTo(w*.23,-h*.35,w*.1,-h*.58,0,-h);c.closePath();c.fill();c.stroke();
   c.strokeStyle='#ffffff8a';c.lineWidth=2.4;c.beginPath();c.moveTo(-w*.36,-10);c.quadraticCurveTo(-w*.12,-h*.3,-w*.02,-h*.75);c.stroke();c.restore();};
  layer(-32,172,143,variant===1?'#d3e8f7':'#c7dfef');layer(-98,137,133,'#d7ecfa');layer(-163,91,112,'#e0f1fd');this.sprites.set(variant,canvas);return canvas;
 }
 drawTree(t){
  const p=this.project(t.x,0,t.z),c=this.ctx,s=this.scale/80*(t.scale||1);if(t.dead&&!t.fall){this.orb(p.x,p.y-3,7*s,4*s,'#dcb890','#927560');return;}
  const close=!t.scenery&&distance(t,this.engine.player)<2.5&&t.x+t.z>this.engine.player.x+this.engine.player.z;
  c.save();c.translate(p.x,p.y);c.globalAlpha=close?.48:1;
  const age=t.fall?1-t.fall/.65:0;if(t.fall){c.rotate((t.fallDirection||1)*age*age*1.5);c.globalAlpha*=1-age*age;}
  else if(t.hit)c.rotate(Math.sin(t.hit*75)*.055);
  c.drawImage(this.treeSprite(t.variant),-110*s,-285*s,220*s,310*s);c.restore();
 }
 drawRock(t){if(t.dead)return;const p=this.project(t.x,.25,t.z),s=this.scale*t.scale;this.orb(p.x-8,p.y,.45*s,.34*s,'#cfdae0','#879eae',-.2,'#819aab');this.orb(p.x+10,p.y+5,.31*s,.25*s,'#e2ecf0','#a1b5c1',.2);this.orb(p.x-7,p.y-8,.3*s,.07*s,'#f8fdff','#e9f5fc',-.1);}
 local(origin,x,y,z){const a=origin.angle||0;return this.project(origin.x+x*Math.cos(a)+z*Math.sin(a),y,origin.z-x*Math.sin(a)+z*Math.cos(a));}
 drawBear(b){
  if(b.dead&&!b.fall)return;const c=this.ctx,s=this.scale*b.scale,step=b.aggro?Math.sin(b.walk)*.12:0,origin={...b},a=b.angle;
  const center=this.local(origin,0,.65,0),direction=this.local(origin,0,.65,1),rot=Math.atan2(direction.y-center.y,direction.x-center.x);
  c.save();if(b.fall){const age=1-b.fall/.65;c.globalAlpha=1-age;const p=this.project(b.x,0,b.z);c.translate(p.x,p.y);c.scale(1+age*.3,1-age*.6);c.translate(-p.x,-p.y);}
  if(b.hit)c.translate(Math.sin(b.hit*70)*3,0);
  if(b.windup>0)this.ring(b.x,b.z,1.1*b.scale,'#ef856ea0',3);
  for(const x of[-.35,.35])for(const z of[-.5,.5]){const p=this.local(origin,x*b.scale,.13+Math.max(0,step*Math.sign(x*z)),z*b.scale);this.orb(p.x,p.y,.23*s,.24*s,'#edf1f0','#afc2ce');}
  this.orb(center.x,center.y,.91*s,.53*s,b.boss?'#f4f0df':'#fcfdf9','#aebfce',rot,'#91a6b3');
  const head=this.local(origin,0,1.02*b.scale,.76*b.scale);
  for(const x of[-.28,.28]){const ear=this.local(origin,x*b.scale,1.36*b.scale,.66*b.scale);this.orb(ear.x,ear.y,.145*s,.16*s,'#f4f6ed','#a7b9c8');this.orb(ear.x,ear.y+1,.075*s,.085*s,'#9baeb6','#869ba8');}
  this.orb(head.x,head.y,.44*s,.38*s,'#fffef5','#bacad2',rot*.18,'#9eafb9');
  const muzzle=this.local(origin,0,.86*b.scale,1.12*b.scale);this.orb(muzzle.x,muzzle.y,.26*s,.2*s,'#eff3ef','#b7c7ca',rot);
  const nose=this.local(origin,0,.94*b.scale,1.32*b.scale);this.orb(nose.x,nose.y,.1*s,.075*s,'#34424c','#1b2832',rot);
  for(const x of[-.22,.22]){const eye=this.local(origin,x*b.scale,1.14*b.scale,.99*b.scale);this.orb(eye.x,eye.y,.041*s,.047*s,'#273a46','#1d2934');}
  if(b.boss){c.strokeStyle='#8b9dae';c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.moveTo(center.x-8+i*7,center.y-7);c.lineTo(center.x-3+i*7,center.y+4);c.stroke();}}
  c.restore();
 }
 log(x,y,length,width,angle=0,meat=false){const c=this.ctx;c.save();c.translate(x,y);c.rotate(angle);const g=c.createLinearGradient(0,-width/2,0,width/2);g.addColorStop(0,meat?'#ffa49e':'#e8b07b');g.addColorStop(.5,meat?'#e56b70':'#ca8b52');g.addColorStop(1,meat?'#bd4658':'#9b623d');c.fillStyle=g;c.strokeStyle=meat?'#b84b5a':'#8e6244';c.lineWidth=.7;c.beginPath();c.roundRect(-length/2,-width/2,length,width,width/2);c.fill();c.stroke();this.orb(length/2-width*.15,0,width*.3,width*.47,meat?'#ffc8b9':'#ffe0a9',meat?'#eb8c8b':'#d3a16f');c.restore();}
 drawPlayer(p){this.drawExplorer(p);}
 drawExplorer(p,worker=false){
  const c=this.ctx,s=this.scale,bob=p.moving?Math.abs(Math.sin(p.walk))*.07:0,step=p.moving?Math.sin(p.walk)*.17:0;
  const spin=p.spin>0?(1-p.spin/.55)*TAU*1.7:0;const actor={...p,angle:p.angle+spin};
  c.save();if(p.invincible>0&&Math.sin(this.engine.time*18)>.5)c.globalAlpha=.7;
  if(!worker){
   const base=this.local(p,0,.92,-.35),wood=this.engine.resources.wood,meat=this.engine.resources.meat;
   const n=Math.min(28,Math.ceil(wood/3));for(let i=0;i<n;i++){const sway=Math.sin(this.engine.time*3-i*.22)*(p.moving?3:.6)*(i/n);this.log(base.x+sway-3,base.y-i*s*.14,s*1.05,s*.135,-.35);}
   const m=Math.min(18,Math.ceil(meat/3));for(let i=0;i<m;i++)this.log(base.x+s*.39,base.y-i*s*.115,s*.38,s*.13,.18,true);
  }
  for(const x of[-.19,.19]){const foot=this.local(actor,x,.12,Math.sign(x)*step);this.orb(foot.x,foot.y,.2*s,.13*s,'#344652','#172b3a',-.2);const leg=this.local(actor,x,.36,Math.sign(x)*step*.7);this.orb(leg.x,leg.y,.145*s,.24*s,'#46627a','#274155');}
  const body=this.local(actor,0,.83+bob,0);this.orb(body.x,body.y,.41*s,.45*s,worker?'#67aeba':'#3da5e2','#2263a1',-.06,'#234968');
  const belt=this.local(actor,0,.63+bob,.14);c.fillStyle='#6b5650';c.beginPath();c.roundRect(belt.x-.34*s,belt.y-.055*s,.68*s,.12*s,4);c.fill();
  for(const x of[-.41,.41]){const swing=p.swing>0?Math.sin((1-p.swing/.28)*Math.PI)*.3:0;const hand=this.local(actor,x,.75+bob,.18+(x>0?swing:step));this.orb(hand.x,hand.y,.17*s,.23*s,'#61b4e8','#2c78b1',x);this.orb(hand.x,hand.y+s*.12,.135*s,.125*s,'#f2c7a0','#b88769');}
  const head=this.local(actor,0,1.35+bob,0);this.orb(head.x,head.y,.335*s,.34*s,'#5ab6ec','#246caa',0,'#234b71');
  const face=this.local(actor,0,1.32+bob,.16),front=Math.sin(actor.angle)+Math.cos(actor.angle)>-.5;
  if(front){this.orb(face.x,face.y,.255*s,.275*s,'#ffe0ac','#d3a77f');this.orb(face.x,face.y+s*.1,.23*s,.16*s,'#674e3b','#3b3b36');this.orb(face.x,face.y+s*.02,.09*s,.065*s,'#f7c290','#c68f69');for(const dx of[-.09,.09])this.orb(face.x+dx*s,face.y-s*.08,.035*s,.045*s,'#253544','#1b2931');}
  const rim=this.local(actor,0,1.56+bob,.045);this.orb(rim.x,rim.y,.31*s,.095*s,'#fff6d8','#dedfcf',-.2);
  const pack=this.local(actor,.12,1.12,-.31);if(!front)this.orb(pack.x,pack.y,.28*s,.31*s,'#bc8a4c','#795c38');
  const a=actor.angle+(p.swing>0?(-1.1+(1-p.swing/.28)*2.2):.4),r=p.swing>0?1.6:.85;
  const hand=this.project(p.x+Math.sin(a)*.43,.85,p.z+Math.cos(a)*.43),end=this.project(p.x+Math.sin(a)*r,.6,p.z+Math.cos(a)*r);
  c.strokeStyle='#665548';c.lineWidth=s*.11;c.lineCap='round';c.beginPath();c.moveTo(hand.x,hand.y);c.lineTo(end.x,end.y);c.stroke();c.strokeStyle='#b4a082';c.lineWidth=s*.065;c.stroke();
  const rotation=Math.atan2(end.y-hand.y,end.x-hand.x);c.save();c.translate(end.x,end.y);c.rotate(rotation);const g=c.createLinearGradient(-6,-14,9,14);g.addColorStop(0,'#f9ffff');g.addColorStop(.45,'#9eaebc');g.addColorStop(1,'#516981');c.fillStyle=g;c.strokeStyle='#61788d';c.lineWidth=1;c.beginPath();c.moveTo(-s*.13,-s*.12);c.lineTo(s*.15,-s*.35);c.quadraticCurveTo(s*.4,0,s*.15,s*.35);c.lineTo(-s*.13,s*.13);c.closePath();c.fill();c.stroke();c.restore();c.restore();
 }
 drawWorker(w){this.drawExplorer({...w,angle:-.6,moving:true,walk:this.engine.time*4,swing:0,invincible:0,spin:0},true);}
 drawLoot(l){
  const p=this.project(l.x,.25+Math.max(0,Math.sin(Math.min(l.age/.4,1)*Math.PI))*.85,l.z),c=this.ctx,s=this.scale;
  if(l.age>.25){c.strokeStyle=l.resource==='wood'?'#e7b77766':l.resource==='meat'?'#ffa6a866':'#d6edff99';c.lineWidth=3;const q=this.project(l.x,.1,l.z);c.beginPath();c.moveTo(q.x,q.y);c.lineTo(p.x,p.y);c.stroke();}
  if(l.resource==='stone')this.orb(p.x,p.y,s*.13,s*.11,'#eaf4fc','#8aa5b9',.4);else this.log(p.x,p.y,s*(l.resource==='wood'?.48:.32),s*.17,Math.sin(l.age*4)*.5,l.resource==='meat');
 }
 drawCampfire(x,z){
  const p=this.project(x,0,z),c=this.ctx,s=this.scale;const glow=c.createRadialGradient(p.x,p.y,0,p.x,p.y,s*1.5);glow.addColorStop(0,'#ffc15a46');glow.addColorStop(1,'#ffc15a00');c.fillStyle=glow;c.fillRect(p.x-s*1.5,p.y-s*1.5,s*3,s*3);
  for(let i=0;i<8;i++){const a=i*TAU/8;this.orb(p.x+Math.cos(a)*s*.55,p.y+Math.sin(a)*s*.25,s*.19,s*.13,'#d9c7ac','#a49180');}
  c.fillStyle='#b48561';c.beginPath();c.roundRect(p.x-s*.31,p.y-s*.57,s*.62,s*.66,8);c.fill();this.orb(p.x,p.y-s*.55,s*.33,s*.15,'#e2d3b4','#a7967a');this.orb(p.x,p.y-s*.54,s*.22,s*.085,'#ffd58c','#f17449');this.orb(p.x,p.y-s*.02,s*.19,s*.13,'#ffc377','#d65335');
  for(let i=0;i<3;i++){const a=(this.engine.time*.3+i*.33)%1;c.globalAlpha=(1-a)*.22;this.orb(p.x+Math.sin(a*6+i)*5,p.y-s*(.8+a*1.5),s*(.06+a*.12),s*(.08+a*.12),'#fff8df','#c7d1d8');}c.globalAlpha=1;
 }
 drawBuilding(id){
  const b=BUILDINGS[id],p=this.project(b.x,0,b.z),s=this.scale,c=this.ctx;
  if(id==='camp'){this.drawCampfire(b.x,b.z);return;}
  if(id==='quarry'){for(let i=0;i<5;i++){const a=i*2.4;this.orb(p.x+Math.cos(a)*s*.65,p.y+Math.sin(a)*s*.26-s*.35,s*.4,s*.35,'#d9e5eb','#849eaf',a);}this.log(p.x,p.y-s*.9,s*1.8,s*.12);return;}
  const tower=id==='watchtower',h=tower?2.2:1.2,w=tower?1.3:1.9;
  if(tower){for(const dx of[-.5,.5]){c.strokeStyle='#a07a56';c.lineWidth=s*.12;c.beginPath();c.moveTo(p.x+dx*s,p.y);c.lineTo(p.x+dx*s,p.y-h*s);c.stroke();}}
  const bottom=tower?1.3:0;c.fillStyle='#b78d66';c.strokeStyle='#8e6c53';c.lineWidth=1.5;c.beginPath();c.roundRect(p.x-w*s/2,p.y-h*s,w*s,(h-bottom)*s,7);c.fill();c.stroke();
  c.strokeStyle='#926e5144';c.lineWidth=2;for(let i=1;i<5;i++){const y=p.y-h*s+(h-bottom)*s*i/5;c.beginPath();c.moveTo(p.x-w*s/2+2,y);c.lineTo(p.x+w*s/2-2,y);c.stroke();}
  const y=p.y-h*s,roof=c.createLinearGradient(p.x,y-.7*s,p.x,y);roof.addColorStop(0,'#f7fdff');roof.addColorStop(1,'#aacbe1');c.fillStyle=roof;c.strokeStyle='#799eb9';c.beginPath();c.moveTo(p.x-w*s*.68,y+4);c.quadraticCurveTo(p.x-w*s*.38,y-.28*s,p.x,y-.75*s);c.quadraticCurveTo(p.x+w*s*.42,y-.3*s,p.x+w*s*.68,y+4);c.quadraticCurveTo(p.x,y+s*.08,p.x-w*s*.68,y+4);c.fill();c.stroke();
  if(!tower){c.fillStyle='#655449';c.beginPath();c.roundRect(p.x-.18*s,p.y-.7*s,.38*s,.7*s,[7,7,0,0]);c.fill();c.fillStyle='#ffda82';c.beginPath();c.roundRect(p.x+.33*s,p.y-.83*s,.35*s,.32*s,4);c.fill();for(let i=0;i<4;i++)this.log(p.x-w*s*.55,p.y-i*s*.15,s*.7,s*.15,-.2);}
 }
 drawSwing(){
  const p=this.engine.player,c=this.ctx,spin=p.spin>0,progress=spin?1-p.spin/.55:1-p.swing/.28,center=this.project(p.x,.5,p.z),r=(spin?3.5:this.engine.attackRange)*this.scale;
  c.save();c.translate(center.x,center.y);c.scale(1,.57);const alpha=spin?.8:Math.sin(clamp(progress,0,1)*Math.PI)*.85;c.globalAlpha=alpha;c.strokeStyle=spin?'#a7efffff':'#ffffffff';c.lineWidth=spin?9:5;c.lineCap='round';c.shadowColor='#b0ebff';c.shadowBlur=12;
  const angle=(p.angle-Math.PI/4)*-1+(spin?progress*TAU*2:progress*2.2);c.beginPath();c.arc(0,0,r*.85,angle-2.6,angle+(spin?2:.3));c.stroke();c.shadowBlur=0;c.globalAlpha*=.35;c.lineWidth=spin?20:12;c.beginPath();c.arc(0,0,r*.85,angle-2,angle+.2);c.stroke();c.restore();
 }
 drawEffects(){
  const c=this.ctx;for(const e of this.engine.effects){const p=this.project(e.x,e.y,e.z);c.save();c.globalAlpha=Math.min(1,e.life*3);if(e.type==='particle'){c.fillStyle=e.color;c.translate(p.x,p.y);c.rotate(e.life*8);c.beginPath();c.roundRect(-e.size*this.scale/2,-e.size*this.scale/2,e.size*this.scale*1.6,e.size*this.scale,1);c.fill();}else{const scale=1+Math.max(0,e.life-.8)*1.4;c.translate(p.x,p.y);c.scale(scale,scale);c.textAlign='center';c.font='900 20px system-ui';c.strokeStyle='#355c80';c.lineWidth=3.5;c.strokeText(e.text,0,0);c.fillStyle=e.color;c.fillText(e.text,0,0);}c.restore();}
  const p=this.engine.player;if(p.spin>0&&p.swing<=0)this.drawSwing();
  // Light foreground flurries, independent of gameplay state.
  if(!this.reducedMotion){c.fillStyle='#ffffffa0';for(let i=0;i<24;i++){const x=(i*179+Math.sin(this.engine.time*.3+i)*22+this.width)%this.width,y=(i*113+this.engine.time*(11+i%4*3))%this.height;c.beginPath();c.arc(x,y,1+(i%3)*.45,0,TAU);c.fill();}}
 }
}
