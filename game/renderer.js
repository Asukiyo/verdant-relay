import{TILE_SIZE,BIOMES,BUILDINGS,biomeAt,key,clamp,seeded,distance}from'./config.js';

const C=.8660254,S=.5,TAU=Math.PI*2;
const colorCache=new Map();
function shade(hex,f){const k=hex+f;if(colorCache.has(k))return colorCache.get(k);const n=parseInt(hex.slice(1),16),r=Math.min(255,Math.round((n>>16)*f)),g=Math.min(255,Math.round((n>>8&255)*f)),b=Math.min(255,Math.round((n&255)*f));const out=`rgb(${r},${g},${b})`;colorCache.set(k,out);return out;}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}

/** Orthographic low-poly renderer. No external assets, network calls or GPU requirement. */
export class WorldRenderer{
 constructor(canvas,engine){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw Error('Canvas unavailable');this.engine=engine;
  this.width=1;this.height=1;this.dpr=1;this.scale=36;this.camera={x:engine.player.x-.5,z:engine.player.z+.5};this.groundCache=new Map();this.shake=0;this.lastFrame=0;
  this.resize();this.engine.on('expand',()=>{this.shake=.2;});this.engine.on('damage',()=>{this.shake=.13;});
 }
 resize(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;this.dpr=Math.min(globalThis.devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*this.dpr);this.canvas.height=Math.round(r.height*this.dpr);this.scale=this.width<650?clamp(this.width/13.1,25,34):clamp(this.width/34,30,45);if(this.height<550)this.scale*=.85;}
 project(x,y,z){return{x:this.width*.5+((x-this.camera.x)-(z-this.camera.z))*C*this.scale,y:this.height*(this.width<650?.55:.55)+((x-this.camera.x)+(z-this.camera.z))*S*this.scale-y*this.scale};}
 unproject(x,y){const a=(x-this.width*.5)/(this.scale*C),b=(y-this.height*.55)/(this.scale*S);return{x:this.camera.x+(a+b)/2,z:this.camera.z+(b-a)/2};}
 visible(x,z,pad=160){const p=this.project(x,0,z);return p.x>-pad&&p.x<this.width+pad&&p.y>-pad&&p.y<this.height+pad;}
 polygon(points,fill,stroke=null,width=1){const ctx=this.ctx;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
 worldPoly(points,fill,stroke=null,width=1){this.polygon(points.map(p=>this.project(...p)),fill,stroke,width);}
 shadow(x,z,rx,rz,opacity=.16){const p=this.project(x,0,z);this.ctx.fillStyle=`rgba(24,72,46,${opacity})`;this.ctx.beginPath();this.ctx.ellipse(p.x+this.scale*.18,p.y+this.scale*.12,rx*this.scale,rz*this.scale,0,0,TAU);this.ctx.fill();}
 ring(x,z,r,color,width=2,dashed=false){const ctx=this.ctx,p=this.project(x,.045,z);ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;if(dashed)ctx.setLineDash([5,5]);ctx.beginPath();ctx.ellipse(p.x,p.y,r*this.scale*C,r*this.scale*S,0,0,TAU);ctx.stroke();ctx.restore();}
 draw(dt){
  const e=this.engine,p=e.player;this.camera.x+=(p.x-this.camera.x)*(1-Math.exp(-dt*4));this.camera.z+=(p.z-this.camera.z)*(1-Math.exp(-dt*4));this.shake=Math.max(0,this.shake-dt);
  const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);if(this.shake)ctx.translate(Math.sin(e.time*92)*this.shake*14,Math.cos(e.time*88)*this.shake*9);
  this.drawWater();this.drawLand();
  const gates=[...e.frontiers].sort((a,b)=>distance(a,p)-distance(b,p));
  for(const f of gates)if(this.visible(f.x,f.z))this.drawGateBase(f);
  for(const en of e.entities){if((en.dead&&!en.fall)||!this.visible(en.x,en.z))continue;this.shadow(en.x,en.z,en.type==='tree'?.8*en.scale:en.type==='bear'?.65*en.scale:.55,en.type==='tree'?.26:.23,en.type==='tree'?.12:.15);}
  for(const[id,def]of Object.entries(BUILDINGS))if(e.buildings[id]&&this.visible(def.x,def.z))this.shadow(def.x,def.z,1.35,.6,.14);
  this.shadow(p.x,p.z,.43,.18,.24);this.ring(p.x,p.z,.6,'#e9facc99',1.5);
  if(e.target&&e.path.length){const t=e.target;this.ring(t.x,t.z,.22,'#fffce6cc',2);this.ring(t.x,t.z,.35,'#fffce677',1);}
  const all=e.entities.filter(a=>(!a.dead||a.type!=='bear'||a.fall)&&this.visible(a.x,a.z)).map(a=>({type:a.type,data:a,x:a.x,z:a.z}));
  if(this.scenery)all.push(...this.scenery());
  if(this.sceneObjects)all.push(...this.sceneObjects());
  all.push({type:'player',data:p,x:p.x,z:p.z});
  for(const[id,def]of Object.entries(BUILDINGS))if(e.buildings[id])all.push({type:'building',id,x:def.x,z:def.z});
  all.push({type:'campfire',x:-5,z:3.45});
  if(e.buildings.sawmill){const t=e.time;all.push({type:'worker',x:BUILDINGS.sawmill.x+1.25+Math.sin(t*.6)*.5,z:BUILDINGS.sawmill.z+.25});}
  all.sort((a,b)=>a.x+a.z-b.x-b.z);
  for(const item of all){switch(item.type){case'scenery':case'tree':this.drawTree(item.data);break;case'rock':this.drawRock(item.data);break;case'bear':this.drawBear(item.data);break;case'player':this.drawPlayer(item.data);break;case'building':this.drawBuilding(item.id);break;case'campfire':this.drawCampfire(item.x,item.z);break;case'worker':this.drawWorker(item);break;case'settlement':this.drawSceneObject(item);break;}}
  for(const l of e.loot)if(this.visible(l.x,l.z))this.drawLoot(l);
  if(p.swing>0)this.drawSwing();
  for(const en of e.entities){if(en.dead||!this.visible(en.x,en.z,70))continue;if(en.type==='bear'&&(en.aggro||en.hp<en.maxHp||en.boss))this.drawHealth(en);else if(en.hp<en.maxHp)this.drawHealth(en);}
  // Show the closest gates clearly; distant gates remain quiet plus markers.
  gates.slice(0,this.width<650?2:3).filter(f=>distance(f,p)<10).forEach(f=>this.drawGateLabel(f));
  this.drawEffects();
  if(p.hurt>0){const g=ctx.createRadialGradient(this.width*.5,this.height*.5,this.height*.25,this.width*.5,this.height*.5,this.height*.8);g.addColorStop(0,'#e7543600');g.addColorStop(1,`rgba(200,65,41,${p.hurt*.6})`);ctx.fillStyle=g;ctx.fillRect(0,0,this.width,this.height);}
 }
 drawWater(){
  const ctx=this.ctx,e=this.engine;const g=ctx.createRadialGradient(this.width*.5,this.height*.42,0,this.width*.5,this.height*.5,this.width*.8);g.addColorStop(0,'#82cbc1');g.addColorStop(1,'#50aaa9');ctx.fillStyle=g;ctx.fillRect(0,0,this.width,this.height);
  ctx.lineCap='round';const ox=this.camera.x,oz=this.camera.z;const r=this.width<650?13:25;
  for(let x=Math.floor(ox/4)-r;x<ox/4+r;x++)for(let z=Math.floor(oz/4)-r;z<oz/4+r;z++){
   const wx=x*4+Math.sin(z*9.5)*1.5,wz=z*4+Math.cos(x*4.6),p=this.project(wx,0,wz);if(p.x<0||p.x>this.width||p.y<0||p.y>this.height)continue;
   const a=.08+.06*Math.sin(e.time*.7+x*1.6+z*3);ctx.strokeStyle=`rgba(244,255,236,${a})`;ctx.lineWidth=2;const w=8+Math.sin(x*23+z*7)*6;ctx.beginPath();ctx.moveTo(p.x-w,p.y);ctx.quadraticCurveTo(p.x,p.y+2+Math.sin(e.time+x)*2,p.x+w,p.y);ctx.stroke();
  }
 }
 drawLand(){
  const tiles=[...this.engine.tiles.values()].filter(t=>this.visible(t.x*TILE_SIZE,t.z*TILE_SIZE,330)).sort((a,b)=>a.x+a.z-b.x-b.z);
  for(const t of tiles){
   const b=biomeAt(t.x,t.z),x=t.x*TILE_SIZE,z=t.z*TILE_SIZE,r=TILE_SIZE/2,age=this.engine.time-t.created,raise=age<.6?Math.pow(1-age/.6,2)*-3:0;
   const left=x-r,right=x+r,back=z-r,front=z+r;
   this.worldPoly([[left,-.2,front+.16],[right+.15,-.2,front+.16],[right+.15,-.2,back],[right,-.2,back],[right,-.2,front],[left,-.2,front]],'#92d7ca');
   if(!this.engine.tiles.has(key(t.x+1,t.z)))this.worldPoly([[right,raise,back],[right,raise,front],[right,raise-1.08,front],[right,raise-1.08,back]],b.dark);
   if(!this.engine.tiles.has(key(t.x,t.z+1)))this.worldPoly([[left,raise,front],[right,raise,front],[right,raise-1.08,front],[left,raise-1.08,front]],b.side);
   this.worldPoly([[left,raise,back],[right,raise,back],[right,raise,front],[left,raise,front]],b.grass);
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])if(!this.engine.tiles.has(key(t.x+dx,t.z+dz))){let a,c;if(dx){a=[x+dx*r,raise+.018,back];c=[x+dx*r,raise+.018,front];}else{a=[left,raise+.018,z+dz*r];c=[right,raise+.018,z+dz*r];}const p=this.project(...a),q=this.project(...c);this.ctx.strokeStyle=b.id==='snow'?'#f2f6e8':'#a7d17b';this.ctx.lineWidth=3;this.ctx.beginPath();this.ctx.moveTo(p.x,p.y);this.ctx.lineTo(q.x,q.y);this.ctx.stroke();}
   this.drawGroundDetail(t,raise);
  }
 }
 drawGroundDetail(t,raise){
  let pts=this.groundCache.get(t.key);if(!pts){const rng=seeded(t.seed);pts=Array.from({length:24},()=>({x:(rng()-.5)*TILE_SIZE,z:(rng()-.5)*TILE_SIZE,s:rng(),a:rng()}));this.groundCache.set(t.key,pts);}
  const ctx=this.ctx,b=biomeAt(t.x,t.z);
  for(const d of pts){const x=t.x*TILE_SIZE+d.x,z=t.z*TILE_SIZE+d.z,p=this.project(x,raise+.02,z);if(d.s<.65){ctx.strokeStyle=b.id==='snow'?'#8fac9a60':'#3f924b45';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(p.x-3,p.y);ctx.lineTo(p.x-5,p.y-4);ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+1,p.y-6);ctx.moveTo(p.x+2,p.y);ctx.lineTo(p.x+5,p.y-3);ctx.stroke();}else if(d.s>.92){ctx.fillStyle=d.a>.5?'#e6eab3':'#f3c775';ctx.beginPath();ctx.arc(p.x,p.y-2,1.7,0,TAU);ctx.fill();}else{ctx.fillStyle=b.id==='snow'?'#c3d6cb':'#a0d07b';ctx.beginPath();ctx.ellipse(p.x,p.y,4+d.a*8,2+d.a*3,0,0,TAU);ctx.fill();}}
 }
 model(x,z,angle,scale,callback,alpha=1){
  const faces=[],co=Math.cos(angle),si=Math.sin(angle);const transform=(lx,ly,lz)=>[x+(lx*co+lz*si)*scale,ly*scale,z+(-lx*si+lz*co)*scale];
  const addFace=(pts,color)=>{const world=pts.map(p=>transform(...p));faces.push({points:world.map(p=>this.project(...p)),depth:world.reduce((n,p)=>n+(p[0]+p[2])*.5+p[1]*.8,0)/world.length,color});};
  const box=(bx,by,bz,w,h,d,color,rx=0)=>{
   const rc=Math.cos(rx),rs=Math.sin(rx),vertices=[];
   for(const[dx,dy,dz]of[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]]){let yy=dy*h/2,zz=dz*d/2;vertices.push([bx+dx*w/2,by+yy*rc-zz*rs,bz+yy*rs+zz*rc]);}
   const defs=[[[4,5,6,7],1.14],[[0,4,7,3],.75],[[1,2,6,5],.9],[[0,1,5,4],.78],[[3,7,6,2],1.01],[[0,3,2,1],.65]];
   for(const[ids,f]of defs){const v=ids.map(i=>vertices[i]);const a=v[0],b=v[1],c=v[2];const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const tx=nx*co+nz*si,tz=-nx*si+nz*co;if(tx+tz+ny*1.5>0)continue;addFace(v,shade(color,f));}
  };
  const pyramid=(bx,by,bz,r,h,color,sides=5,rotation=0)=>{
   for(let i=0;i<sides;i++){const a=i*TAU/sides+rotation,b=(i+1)*TAU/sides+rotation;const pts=[[bx+Math.cos(a)*r,by,bz+Math.sin(a)*r],[bx,by+h,bz],[bx+Math.cos(b)*r,by,bz+Math.sin(b)*r]];const light=.9+.19*Math.sin((a+b)/2+angle+1);addFace(pts,shade(color,light));}
  };
  callback(box,pyramid,addFace);faces.sort((a,b)=>a.depth-b.depth);this.ctx.save();this.ctx.globalAlpha=alpha;for(const f of faces)this.polygon(f.points,f.color);this.ctx.restore();
 }
 drawTree(t){
  const b=BIOMES.find(b=>b.id===t.biome)||BIOMES[0];const ctx=this.ctx;const close=distance(t,this.engine.player)<2&&t.x+t.z>this.engine.player.x+this.engine.player.z;
  if(t.dead&&!t.fall){this.model(t.x,t.z,t.angle,t.scale,(box)=>{box(0,.13,0,.37,.26,.36,'#957048');box(0,.275,0,.31,.025,.3,'#dbb276');});return;}
  const shake=t.hit?Math.sin(t.hit*80)*.045:Math.sin(this.engine.time*1.2+t.seed*20)*.012;const scale=t.scale*(t.fall?Math.max(.01,t.fall/.65):1),alpha=(close?.52:1)*(t.fall?Math.min(1,t.fall*3):1);
  this.model(t.x+shake,t.z,t.angle,scale,(box,pyramid)=>{
   box(0,.52,0,.3,1.04,.3,'#987447');
   if(t.variant===0&&t.biome!=='snow'){
    pyramid(0,.85,0,1.04,1.1,b.tree,6);pyramid(-.13,1.47,.04,.98,1.2,b.leaf,5,.7);pyramid(.03,2.12,.04,.65,.85,b.leaf,5,.5);
   }else{
    pyramid(0,.72,0,1,1.48,b.tree,5,.25);pyramid(0,1.31,0,.84,1.35,b.leaf,5,.4);pyramid(0,1.98,0,.56,1.08,t.biome==='snow'?'#e6f0e6':b.leaf,5,.5);
   }
  },alpha);
 }
 drawRock(t){
  if(t.dead)return;const color=t.biome==='snow'?'#9db3b0':'#9aab9b';this.model(t.x,t.z,t.angle,t.scale,(box,pyramid)=>{pyramid(0,.02,0,.72,.95,color,5,.4);pyramid(.43,.01,.23,.35,.45,'#b2bba3',5);box(-.05,.5,.12,.1,.07,.27,'#d1d3b6',.5);});
 }
 drawBear(b){
  if(b.dead&&!b.fall)return;const c=b.boss?'#725340':'#936b45',step=b.aggro?Math.sin(b.walk)*.13:Math.sin(b.walk)*.025;const scale=b.scale*(b.fall?Math.max(.03,b.fall/.65):1),flinch=b.hit>0?Math.sin(b.hit*60)*.05:0;
  if(b.windup>0){this.ring(b.x,b.z,1.05*b.scale,'#d86d48aa',2.5);}
  this.model(b.x+flinch,b.z,b.angle,scale,(box)=>{
   for(const lx of[-.31,.31])for(const lz of[-.46,.46])box(lx,.23+Math.max(0,step*Math.sign(lx*lz)),lz,.29,.46,.32,shadeHex(c,.83));
   box(0,.67,0,.97,.81,1.43,c);box(0,.97,.3,.85,.61,.77,c);box(0,1.04,.7,.8,.67,.72,c);
   box(-.28,1.42,.59,.23,.25,.22,c);box(.28,1.42,.59,.23,.25,.22,c);
   box(-.28,1.43,.72,.12,.12,.04,'#b69467');box(.28,1.43,.72,.12,.12,.04,'#b69467');
   box(0,.89,1.09,.5,.32,.31,'#c4a076');box(0,.99,1.26,.23,.14,.09,'#30392c');
   box(-.255,1.15,1.07,.092,.085,.04,'#202f24');box(.255,1.15,1.07,.092,.085,.04,'#202f24');
   if(b.boss){box(0,1.02,-.24,.66,.14,.25,'#c9a779');box(0,1.06,-.54,.5,.13,.22,'#c9a779');}
  },b.fall?Math.min(1,b.fall*4):1);
  if(b.aggro&&b.hp===b.maxHp){const p=this.project(b.x,2*b.scale,b.z);this.ctx.font='900 19px system-ui';this.ctx.textAlign='center';this.ctx.fillStyle='#fff9da';this.ctx.strokeStyle='#9d6641';this.ctx.lineWidth=4;this.ctx.strokeText('!',p.x,p.y);this.ctx.fillText('!',p.x,p.y);}
 }
 drawPlayer(p){
  const walk=p.moving?Math.sin(p.walk)*.24:0,bob=p.moving?Math.abs(Math.sin(p.walk))*.055:Math.sin(this.engine.time*2)*.01;
  const swing=p.swing>0?Math.sin((.34-p.swing)/.34*Math.PI):0;
  this.model(p.x,p.z,p.angle,1,(box)=>{
   box(-.17,.19+Math.max(0,walk*.35),walk*.25,.26,.34,.36,'#2c5146');box(.17,.19+Math.max(0,-walk*.35),-walk*.25,.26,.34,.36,'#2c5146');
   box(-.17,.48+Math.max(0,walk*.35),walk*.2,.25,.3,.25,'#3c6470');box(.17,.48+Math.max(0,-walk*.35),-walk*.2,.25,.3,.25,'#3c6470');
   box(0,.89+bob,0,.64,.65,.42,'#e78a44');box(0,1.15+bob,.12,.42,.16,.31,'#f1b170');
   box(0,1.37+bob,0,.43,.4,.4,'#f3c598');box(0,1.51+bob,-.12,.44,.2,.2,'#71583c');
   box(0,1.62+bob,0,.68,.095,.61,'#e7d2a0');box(0,1.76+bob,-.015,.43,.24,.41,'#e7d2a0');box(0,1.66+bob,-.015,.45,.065,.43,'#6a7850');
   box(-.105,1.42+bob,.209,.043,.055,.021,'#3d4532');box(.105,1.42+bob,.209,.043,.055,.021,'#3d4532');
   box(-.39,.87+bob,walk*.2,.2,.45,.24,'#db783c');box(-.4,.61+bob,walk*.2,.19,.19,.19,'#f0bd8f');
   const ax=.45+swing*.13,az=.1+swing*.47,ay=.78+bob+swing*.16;
   box(ax,ay,az,.21,.34,.23,'#db783c',swing*.8);box(ax,ay-.16,az+.07,.2,.18,.19,'#f0bd8f');
   box(ax,ay+.04,az+.2,.07,.7,.075,'#7b5b3a',-.55+swing*.7);box(ax,ay+.3,az+.35,.11,.25,.35,'#c8d8cb',-.55+swing*.7);box(ax,ay+.3,az+.51,.12,.25,.06,'#f0f2d6',-.55+swing*.7);
   box(0,.95,-.31,.54,.6,.25,'#637b48');
   const n=Math.min(10,Math.ceil(this.engine.resources.wood/4));for(let i=0;i<n;i++){const row=Math.floor(i/2),side=i%2;box((side-.5)*.28,.87+row*.16,-.48,.24,.14,.58,'#b0844d');box((side-.5)*.28,.87+row*.16,-.78,.19,.105,.015,'#e0b675');}
  },p.invincible>0&&Math.sin(this.engine.time*18)>.4?.65:1);
 }
 drawWorker(w){const t=this.engine.time;this.model(w.x,w.z,-.8,.84,(box)=>{box(-.17,.2,Math.sin(t*3)*.1,.23,.4,.28,'#355449');box(.17,.2,-Math.sin(t*3)*.1,.23,.4,.28,'#355449');box(0,.76,0,.56,.6,.38,'#72916c');box(0,1.26,0,.4,.4,.4,'#ecc196');box(0,1.5,0,.64,.1,.55,'#dcc895');box(.35,.8,.2,.2,.36,.2,'#e9bd8c');box(.42,1.07,.35,.07,.6,.07,'#86613b');box(.42,1.25,.43,.1,.2,.3,'#a7b7a9');});}
 drawBuilding(id){
  const b=BUILDINGS[id],t=this.engine.time;this.model(b.x,b.z,0,1,(box,pyramid,face)=>{
   if(id==='sawmill'){
    box(0,.09,0,2.55,.18,2.1,'#b39860');box(0,.72,0,1.75,1.3,1.48,'#b88b53');
    for(let i=0;i<5;i++)box(0,.24+i*.25,.76,1.85,.075,.08,'#9c703f');
    pyramid(0,1.39,0,1.65,.95,'#54765d',4,Math.PI/4);box(.45,.77,.79,.49,.52,.065,'#2e5346');box(-.39,.54,.81,.5,.99,.07,'#6b563a');box(-.2,.54,.86,.055,.065,.045,'#e5ca83');
    for(let i=0;i<4;i++)box(-1.17,.19+i*.2,.6,.38,.19,1,'#a47b47');
   }else if(id==='quarry'){
    box(0,.08,0,2.35,.16,1.95,'#a3ab90');pyramid(-.25,.15,-.12,1.07,1.32,'#81988a',5);pyramid(.75,.08,.35,.54,.65,'#aabb9f',5);box(-.94,.67,.75,.13,1.18,.13,'#9d7c4c');box(.6,.67,.75,.13,1.18,.13,'#9d7c4c');box(-.17,1.26,.75,1.9,.14,.2,'#ab8750');box(-.15,.87,.75,.05,.65,.05,'#646651');
   }else if(id==='watchtower'){
    for(const x of[-.64,.64])for(const z of[-.55,.55])box(x,1.17,z,.2,2.34,.2,'#ab8852');
    box(0,2.14,0,1.7,.19,1.47,'#bc9459');box(0,2.52,.71,1.73,.58,.12,'#ad8550');box(.81,2.52,0,.12,.58,1.43,'#9d7b48');pyramid(0,3.1,0,1.36,.65,'#6a8762',4,Math.PI/4);box(0,2.78,0,.42,.55,.32,'#e0a050');box(0,3.13,0,.3,.25,.28,'#edc396');
   }else if(id==='camp'){
    box(0,.065,0,2.45,.13,2.1,'#bba371');face([[-1.1,.13,.9],[0,1.75,.9],[0,1.75,-.9],[-1.1,.13,-.9]],'#dfb36d');face([[0,1.75,.9],[1.1,.13,.9],[1.1,.13,-.9],[0,1.75,-.9]],'#f3cc7d');face([[-1.1,.13,.9],[0,1.75,.9],[1.1,.13,.9]],'#e4b266');face([[-.53,.13,.91],[0,1.35,.91],[.53,.13,.91]],'#5d7053');
   }
  });
  const age=t-this.engine.buildings[id].created;if(age<1)this.ring(b.x,b.z,1+age,'#ffefb8',2);
 }
 drawCampfire(x,z){
  this.model(x,z,0,1,(box,pyramid)=>{box(0,.09,0,.75,.18,.17,'#957144');box(0,.19,0,.17,.17,.75,'#a07743');for(let i=0;i<5;i++){const a=i*TAU/5;box(Math.cos(a)*.51,.09,Math.sin(a)*.51,.24,.2,.25,'#a7b09a');}pyramid(0,.16,0,.25,.64+Math.sin(this.engine.time*9)*.08,'#edac50',4);pyramid(.05,.2,.04,.12,.46+Math.sin(this.engine.time*12)*.07,'#ffe8a0',4);});
  const ctx=this.ctx;for(let i=0;i<3;i++){const a=(this.engine.time*.32+i*.33)%1,p=this.project(x+Math.sin(a*7+i)*.14,.5+a*1.8,z);ctx.globalAlpha=(1-a)*.2;ctx.fillStyle='#e5ebd1';ctx.beginPath();ctx.arc(p.x,p.y,(.08+a*.13)*this.scale,0,TAU);ctx.fill();}ctx.globalAlpha=1;
 }
 drawGateBase(f){
  const e=this.engine,can=e.canAfford(e.expansionCost()),r=.55;const pts=[[f.x-r,.03,f.z-r],[f.x+r,.03,f.z-r],[f.x+r,.03,f.z+r],[f.x-r,.03,f.z+r]];
  this.worldPoly(pts,can?'#e8efb0':'#d9e2af',can?'#fffbd6':'#edf1cd',1.8);
  const p=this.project(f.x,.04,f.z);this.ctx.strokeStyle=can?'#648047':'#80905e';this.ctx.lineWidth=2;this.ctx.beginPath();this.ctx.moveTo(p.x-5,p.y);this.ctx.lineTo(p.x+5,p.y);this.ctx.moveTo(p.x,p.y-4);this.ctx.lineTo(p.x,p.y+4);this.ctx.stroke();
  if(e.unlocking?.key===f.key){const ctx=this.ctx;ctx.strokeStyle='#fff9ca';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(p.x,p.y,.7*this.scale*C,.7*this.scale*S,0,-Math.PI/2,-Math.PI/2+e.unlocking.progress*TAU);ctx.stroke();}
 }
 drawGateLabel(f){
  const e=this.engine,ctx=this.ctx,cost=e.expansionCost(),affordable=e.canAfford(cost),p=this.project(f.x,1,f.z),entries=Object.entries(cost),w=entries.length===1?79:entries.length===2?111:142,h=44;
  ctx.save();ctx.translate(p.x,p.y+Math.sin(e.time*2+f.tx+f.tz)*2);ctx.fillStyle='#234a3425';roundRect(ctx,-w/2,-h,w,h,10);ctx.fill();ctx.translate(0,-3);ctx.fillStyle=affordable?'#f6fbdc':'#fffef2';roundRect(ctx,-w/2,-h,w,h,10);ctx.fill();ctx.strokeStyle='#ffffffaa';ctx.lineWidth=1;ctx.stroke();
  this.polygon([{x:-5,y:0},{x:5,y:0},{x:0,y:5}],affordable?'#f6fbdc':'#fffef2');
  ctx.textAlign='center';ctx.fillStyle=affordable?'#66884a':'#7f8a6b';ctx.font='650 10px system-ui';ctx.fillText(affordable?'ここで土地をひらく':'新しい土地',0,-29);
  const cell=w/entries.length;for(let i=0;i<entries.length;i++){const[r,n]=entries[i],x=-w/2+cell*(i+.5);ctx.fillStyle=r==='wood'?'#aa8251':r==='meat'?'#c77d61':'#8b9b85';ctx.beginPath();ctx.roundRect(x-16,-21,9,9,2);ctx.fill();ctx.fillStyle=e.resources[r]>=n?'#3c5a38':'#ad7952';ctx.textAlign='left';ctx.font='800 13px system-ui';ctx.fillText(n>=1000?`${(n/1000).toFixed(1)}k`:String(n),x-3,-12);}
  ctx.restore();
 }
 drawLoot(l){const colors={wood:'#ba9258',meat:'#dc906e',stone:'#b0b9a0'},y=.2+(l.age<.3?Math.sin(l.age/.3*Math.PI)*.6:Math.sin(l.age*3)*.05);this.model(l.x,l.z,l.age*2,.6,(box)=>{box(0,y,0,.37,.29,l.resource==='wood'?.62:.37,colors[l.resource]);if(l.resource==='wood')box(0,y,.32,.28,.2,.025,'#e4c38a');});}
 drawSwing(){
  const p=this.engine.player,ctx=this.ctx,progress=1-p.swing/.34,angle=p.angle;ctx.save();ctx.globalAlpha=Math.sin(progress*Math.PI)*.65;
  const pts=[];for(let i=0;i<=16;i++){const a=angle-1.5+progress*1.5+i/16*1.8;pts.push(this.project(p.x+Math.sin(a)*this.engine.attackRange,.6,p.z+Math.cos(a)*this.engine.attackRange));}
  for(let i=16;i>=0;i--){const a=angle-1.5+progress*1.5+i/16*1.8;pts.push(this.project(p.x+Math.sin(a)*(this.engine.attackRange-.16),.6,p.z+Math.cos(a)*(this.engine.attackRange-.16)));}this.polygon(pts,'#fffde3');ctx.restore();
 }
 drawHealth(e){
  const ctx=this.ctx,p=this.project(e.x,e.type==='tree'?3.3:e.type==='rock'?1.2:e.scale*1.95,e.z),w=e.boss?57:35,h=5;ctx.fillStyle='#284b39aa';roundRect(ctx,p.x-w/2-1,p.y-1,w+2,h+2,4);ctx.fill();ctx.fillStyle=e.type==='bear'?'#edac66':'#eaf7b0';roundRect(ctx,p.x-w/2,p.y,w*Math.max(0,e.hp/e.maxHp),h,3);ctx.fill();if(e.boss){ctx.font='750 11px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff5d8';ctx.strokeStyle='#765034';ctx.lineWidth=3;ctx.strokeText('森の主',p.x,p.y-6);ctx.fillText('森の主',p.x,p.y-6);}
 }
 drawEffects(){const ctx=this.ctx;for(const e of this.engine.effects){const p=this.project(e.x,e.y,e.z);ctx.globalAlpha=Math.min(1,e.life*3);if(e.type==='particle'){ctx.fillStyle=e.color;ctx.fillRect(p.x-e.size*this.scale/2,p.y-e.size*this.scale/2,e.size*this.scale,e.size*this.scale);}else{ctx.textAlign='center';ctx.font='850 18px system-ui';ctx.strokeStyle='#35523985';ctx.lineWidth=3;ctx.strokeText(e.text,p.x,p.y);ctx.fillStyle=e.color;ctx.fillText(e.text,p.x,p.y);}}ctx.globalAlpha=1;}
 drawMap(canvas,large=false){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#d2e5dc';ctx.fillRect(0,0,w,h);
  const t=[...this.engine.tiles.values()],front=this.engine.frontiers;const all=[...t,...front.map(f=>({x:f.tx,z:f.tz}))];
  const us=all.map(v=>v.x-v.z),vs=all.map(v=>v.x+v.z);const minU=Math.min(...us)-1.4,maxU=Math.max(...us)+1.4,minV=Math.min(...vs)-1.4,maxV=Math.max(...vs)+1.4;const scale=Math.min((w-18)/(maxU-minU),(h-18)/(maxV-minV)*1.8);
  const project=(x,z)=>({x:w/2+(x-z-(maxU+minU)/2)*scale,y:h/2+(x+z-(maxV+minV)/2)*scale/1.8});
  const tile=(x,z,color,border)=>{const p=project(x,z);ctx.beginPath();ctx.moveTo(p.x,p.y-scale/1.8*.94);ctx.lineTo(p.x+scale*.94,p.y);ctx.lineTo(p.x,p.y+scale/1.8*.94);ctx.lineTo(p.x-scale*.94,p.y);ctx.closePath();ctx.fillStyle=color;ctx.fill();if(border){ctx.strokeStyle=border;ctx.lineWidth=large?1.5:.7;ctx.stroke();}};
  front.forEach(f=>tile(f.tx,f.tz,'#dddcb0','#f2e9c6'));t.sort((a,b)=>a.x+a.z-b.x-b.z).forEach(v=>tile(v.x,v.z,biomeAt(v.x,v.z).grass,'#d5e1b9'));
  for(const[id,b]of Object.entries(BUILDINGS))if(this.engine.buildings[id]){const p=project(b.x/TILE_SIZE,b.z/TILE_SIZE);ctx.fillStyle='#f2e9b6';ctx.fillRect(p.x-2,p.y-2,4,4);}
  if(large)for(const e of this.engine.entities)if(e.type==='bear'&&e.boss&&!e.dead){const p=project(e.x/TILE_SIZE,e.z/TILE_SIZE);ctx.fillStyle='#b67550';ctx.beginPath();ctx.arc(p.x,p.y,4,0,TAU);ctx.fill();}
  const p=project(this.engine.player.x/TILE_SIZE,this.engine.player.z/TILE_SIZE);ctx.fillStyle='#f1fcdd';ctx.beginPath();ctx.arc(p.x,p.y,large?7:5,0,TAU);ctx.fill();ctx.fillStyle='#df8643';ctx.beginPath();ctx.arc(p.x,p.y,large?4:3,0,TAU);ctx.fill();return{project,scale};
 }
}
function shadeHex(hex,f){const n=parseInt(hex.slice(1),16);return'#'+[n>>16,n>>8&255,n&255].map(c=>Math.round(c*f).toString(16).padStart(2,'0')).join('');}
