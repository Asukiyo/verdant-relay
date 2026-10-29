import * as T from '../vendor/three.module.min.js';
import {BeamRenderer} from './beam-renderer.js';
import {box,cyl,ell} from './models-3d.js';
import {WEAPONS} from './siege-engine.js';
import {distance} from './config.js';
import {animateEnemy} from './enemy-models.js';

export class SiegeRenderer extends BeamRenderer{
 constructor(...args){super(...args);this.siegeModels=new Map();this.shellModels=[];this.cacheModels=new Map();this.enemyShellModels=[];this.attackWarningPool=[];this.impactPool=[];}
 beforeRender(dt){super.beforeRender(dt);const e=this.engine;
  for(const enemy of e.entities){const m=this.actors.get(enemy.id);if(m&&enemy.machineKind&&!enemy.dead)animateEnemy(m,enemy,e.time);}
  // The base warning renderer still handles charges; specials show their real footprint.
  const threats=e.entities.filter(e=>!e.dead&&e.intent);for(let i=0;i<threats.length;i++)if(threats[i].enemyAttack&&this.dangerPool[i])this.dangerPool[i].visible=false;
  const warnings=[...e.entities.filter(e=>!e.dead&&e.enemyAttack&&!e.enemyAttack.fired).map(e=>e.enemyAttack),...(e.enemyShells||[]).map(a=>({...a,move:'shell',angle:0,time:a.duration-a.age,windup:a.duration}))];
  for(let i=0;i<warnings.length;i++){const a=warnings[i];let root=this.attackWarningPool[i];if(!root){root=new T.Group();for(const [move,span]of [['slash',Math.PI*1.1],['drill',1.52],['shell',Math.PI*2],['slam',Math.PI*2]]){const ring=new T.Mesh(new T.RingGeometry(.88,1,32,1,-Math.PI/2-span/2,span),new T.MeshBasicMaterial({color:move==='shell'?'#ffb34b':'#ff6241',transparent:true,opacity:.75,side:T.DoubleSide,depthWrite:false}));ring.name=move;ring.rotation.x=-Math.PI/2;root.add(ring);}this.scene.add(root);this.attackWarningPool.push(root);}root.visible=true;root.position.set(a.x,.085,a.z);root.rotation.y=a.angle||0;root.scale.setScalar(a.radius);for(const ring of root.children){ring.visible=ring.name===a.move;ring.material.opacity=.45+.3*(1-a.time/a.windup);}}
  for(let i=warnings.length;i<this.attackWarningPool.length;i++)this.attackWarningPool[i].visible=false;
  const impacts=e.effects.filter(f=>f.type==='enemy-impact');for(let i=0;i<impacts.length;i++){let m=this.impactPool[i];if(!m){m=new T.Mesh(new T.RingGeometry(.82,1,32),new T.MeshBasicMaterial({color:'#ffb86a',transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;this.scene.add(m);this.impactPool.push(m);}const f=impacts[i],progress=1-f.life/f.total;m.visible=true;m.position.set(f.x,.11,f.z);m.scale.setScalar(f.radius*(.25+progress*.75));m.material.opacity=(1-progress)*.85;}for(let i=impacts.length;i<this.impactPool.length;i++)this.impactPool[i].visible=false;
  for(let i=0;i<(e.enemyShells?.length||0);i++){let m=this.enemyShellModels[i];if(!m){m=new T.Mesh(new T.SphereGeometry(.18,8,6),new T.MeshBasicMaterial({color:'#ff7135',toneMapped:false}));this.scene.add(m);this.enemyShellModels.push(m);}const a=e.enemyShells[i],p=a.age/a.duration;m.visible=true;m.position.set(a.from.x+(a.x-a.from.x)*p,1.8*(1-p)+Math.sin(p*Math.PI)*3.5,a.from.z+(a.z-a.from.z)*p);}for(let i=e.enemyShells?.length||0;i<this.enemyShellModels.length;i++)this.enemyShellModels[i].visible=false;
  for(const f of e.facilities()){const hp=e.facilityHealth(f),model=this.facilityModels.get(f.id);if(model){model.position.y=hp<=0?-.4:0;model.rotation.z=hp<=0?.15:0;}
   const t=f.state;if(!WEAPONS[t.weapon])continue;let m=this.siegeModels.get(f.id);if(!m){m=new T.Group();box(m,'#34505f',[0,.2,0],[1.35,.4,1.35]);cyl(m,'#8cabb8',[0,.8,0],[.42,1,.42]);if(t.weapon==='beam'){box(m,'#d0e5e3',[0,1.5,.2],[.65,.5,1.2]);ell(m,'#6dffe3',[0,1.5,.85],[.22,.2,.06]);}else if(t.weapon==='missile'){for(const x of[-.3,.3]){const tube=cyl(m,'#cfa268',[x,1.55,.1],[.22,1.1,.22]);tube.rotation.x=.75;}}else{for(const y of[1.2,1.5,1.8])cyl(m,'#89b9ff',[0,y,0],[.6,.09,.6]);ell(m,'#baf9ff',[0,2,0],[.2,.2,.2]);}m.position.set(f.x,0,f.z);this.scene.add(m);this.siegeModels.set(f.id,m);}m.position.y=hp<=0?-.45:0;m.rotation.z=hp<=0?.2:0;if(model)model.visible=false;
  }
  const shells=e.missiles||[];for(let i=0;i<shells.length;i++){let m=this.shellModels[i];if(!m){m=new T.Mesh(new T.SphereGeometry(.16,8,6),new T.MeshBasicMaterial({color:'#ffbc62'}));this.scene.add(m);this.shellModels.push(m);}const a=shells[i],p=a.age/a.duration;m.visible=true;m.position.set(a.from.x+(a.x-a.from.x)*p,1+Math.sin(p*Math.PI)*4,a.from.z+(a.z-a.from.z)*p);}for(let i=shells.length;i<this.shellModels.length;i++)this.shellModels[i].visible=false;
  const ids=new Set();for(const c of e.deathCaches||[]){ids.add(c.id);let m=this.cacheModels.get(c.id);if(!m){m=new T.Group();box(m,'#d7a44b',[0,.3,0],[.8,.6,.6]);box(m,'#fff3b2',[0,.62,0],[.82,.06,.62]);this.scene.add(m);this.cacheModels.set(c.id,m);}m.position.set(c.x,0,c.z);}for(const[id,m]of this.cacheModels)if(!ids.has(id)){this.scene.remove(m);this.cacheModels.delete(id);}
 }
 drawOverlay(){super.drawOverlay();for(const f of this.engine.facilities()){if(distance(f,this.engine.player)>14)continue;const hp=this.engine.facilityHealth(f);if(hp<f.max)this.label(f.x,f.z,2.6,`${f.name} ${Math.ceil(hp)}/${f.max}${hp<=0?' 停止中':''}`,hp<=0?'#a33728ee':'#324959dd');}}
}
