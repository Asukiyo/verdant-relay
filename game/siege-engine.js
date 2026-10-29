import {CombatEngine} from './combat-engine.js';
import {BUILDINGS,distance,clamp} from './config.js';
import {BARRACKS} from './growth-content.js';
import {MACHINE_ATTACKS,inAttackArea} from './enemy-attacks.js';

export const WEAPONS={
 beam:{name:'単体ビーム砲',cost:240,range:13,interval:.65,damage:18,description:'単体を即時照射。安定した連続火力。'},
 missile:{name:'範囲ミサイル砲',cost:320,range:16,interval:2.8,damage:30,description:'着弾地点の半径3に範囲攻撃。'},
 slow:{name:'減速電磁タワー',cost:280,range:10,interval:1.6,damage:4,description:'半径3.5の敵を3秒間、移動速度45%に低下。'}
};
const health=(v,max)=>Number.isFinite(v)?clamp(v,0,max):max;
export class SiegeEngine extends CombatEngine{
 constructor(o={}){super(o);this.durability||={};this.deathCaches||=[];this.missiles=[];this.enemyShells=[];this.cacheSerial||=0;}
 machineKind(e){return e.boss||e.enemyKind==='yeti'?'guardian':e.enemyKind==='wolf'?'scout':e.enemyKind==='boar'?'armor':['scout','armor','artillery'][Math.floor((e.seed||0)*3)%3];}
 assignMonsters(){super.assignMonsters();for(const e of this.entities)if(e.type==='bear')e.machineKind=this.machineKind(e);}
 hitEntity(e,damage){const result=super.hitEntity(e,e.type==='bear'&&['armor','guardian'].includes(this.machineKind(e))?damage*.65:damage);if(e.dead){e.siegeIntent=null;e.enemyAttack=null;e.slowUntil=0;}return result;}
 servicePads(p){return [[0,1.15],[0,-1.8],[-1.8,0],[1.8,0],[0,1.8],[-1.8,-1.8],[1.8,-1.8],[-1.8,1.8],[1.8,1.8],[0,0]].map(([x,z])=>({x:p.x+x,z:p.z+z})).filter(q=>this.canTravel(q,q,this.player));}
 facilities(){return[
  ...Object.entries(this.buildings).map(([id,state])=>({id:'building:'+id,name:BUILDINGS[id].name,...BUILDINGS[id],state,max:180})),
  ...(this.growth?.towers||[]).map(s=>({id:s.id,name:WEAPONS[s.weapon]?.name||'パルスタレット',x:s.x,z:s.z,state:s,max:200+s.level*40})),
  ...(this.growth?.mines||[]).map(s=>({id:s.id,name:'金鉱',x:s.x,z:s.z,state:s,max:220+s.level*40})),
  ...(this.growth?.barracksLevel?[{id:'barracks',name:'兵舎',...BARRACKS,state:this.growth,max:260}]:[])
 ];}
 facilityHealth(f){return health(this.durability?.[f.id],f.max);}
 isFacilityOperational(id){const f=this.facilities().find(f=>f.id===id);return !f||this.facilityHealth(f)>0;}
 damageFacility(id,amount){const f=this.facilities().find(f=>f.id===id);if(!f||amount<=0)return;this.durability||={};const before=this.facilityHealth(f);this.durability[id]=Math.max(0,before-amount);if(before>0&&this.durability[id]===0){this.sceneRevision++;this.emit('facility-disabled',{name:f.name});}this.burst(f.x,f.z,'#ff9b65',5);}
 dropDeathResources(){const resources={};for(const r of ['wood','meat','stone','ore']){const n=Math.floor((this.resources[r]||0)*.3);if(n){resources[r]=n;this.resources[r]-=n;}}if(Object.keys(resources).length){this.deathCaches||=[];this.deathCaches.push({id:++this.cacheSerial,x:this.player.x,z:this.player.z,resources});}this.emit('resources',{...this.resources});}
 interactionMarkers(){const list=super.interactionMarkers(),out=[];for(const m of list){if(m.buildKind==='tower'){
   const used=[];for(const [weapon,d]of Object.entries(WEAPONS)){const p=this.servicePads(m).find(p=>used.every(q=>distance(p,q)>1.55))||m;used.push(p);out.push({...m,...p,key:m.key+'-'+weapon,kind:'defense-build',weapon,name:d.name,cost:d.cost+this.growth.towers.length*65,siteX:m.x,siteZ:m.z,description:d.description});}
  }else if(m.kind==='structure-upgrade'&&m.structure?.startsWith('tower')){const s=this.growth?.towers.find(t=>t.id===m.structure);out.push({...m,name:(WEAPONS[s?.weapon]?.name||'パルスタレット')+' Lv.'+(s.level+1)});}else out.push(m);}
  for(const f of this.facilities()){const hp=this.facilityHealth(f);if(hp<f.max)out.push({key:'repair:'+f.id,kind:'repair',facility:f.id,...(this.servicePads(f)[0]||f),name:f.name+'を修理',cost:0,alloy:Math.max(1,Math.ceil((f.max-hp)/8)),description:`耐久 ${Math.ceil(hp)}/${f.max}${hp<=0?' · 停止中':''}。合金で全回復。`});}
  for(const c of this.deathCaches||[])out.push({...c,key:'cache:'+c.id,kind:'recover',name:'落とした資源を回収',cost:0,description:'死亡時に落とした資源。近づいて1秒待つと回収。'});
  return out;
 }
 markerText(m){return m.kind==='repair'?`修理 · 合金 ${m.alloy}`:m.kind==='recover'?'落とした資源を回収':m.kind==='defense-build'?`${m.name} $${m.cost}`:super.markerText(m);}
 purchaseMarker(m){if(!['repair','recover','defense-build'].includes(m.kind))return super.purchaseMarker(m);const current=this.interactionMarkers().find(x=>x.key===m.key);if(!current||!this.purchaseReady||this.paused||distance(this.player,current)>.85)return{ok:false};
  if(current.kind==='repair'){if(!this.spend({wood:current.alloy}))return{ok:false};const f=this.facilities().find(f=>f.id===current.facility);this.durability[f.id]=f.max;}
  else if(current.kind==='recover'){const c=this.deathCaches.find(c=>'cache:'+c.id===current.key);this.grant(c.resources);this.deathCaches=this.deathCaches.filter(x=>x!==c);}
  else{if(this.baseLevel<(current.requiredLevel||1)||!this.spend({cash:current.cost}))return{ok:false};this.growth.towers.push({id:current.id,x:current.siteX,z:current.siteZ,weapon:current.weapon,level:1,stock:0,clock:0,cart:{cargo:0,progress:0,state:'loading',delivered:0}});this.ensureWorkArea();}
  this.sceneRevision++;this.emit('construction',{name:current.name});this.save();return{ok:true};
 }
 updateExpansion(dt){const m=this.interactionMarkers().find(m=>['repair','recover','defense-build'].includes(m.kind)&&distance(this.player,m)<.75);if(!m||!this.started)return super.updateExpansion(dt);const cost=m.kind==='repair'?{wood:m.alloy}:{cash:m.cost};if(this.baseLevel<(m.requiredLevel||1)){this.unlocking=null;this.hint={type:'base-level',level:m.requiredLevel};return;}if(!this.canAfford(cost)){this.unlocking=null;this.hint={type:'cost',cost};return;}if(this.unlocking?.key!==m.key)this.unlocking={key:m.key,progress:0};this.unlocking.progress+=dt;this.hint={type:'upgrading',name:m.name};if(this.unlocking.progress>=1){this.purchaseReady=true;try{this.purchaseMarker(m);}finally{this.purchaseReady=false;this.unlocking=null;}}}
 updateBuildings(dt){super.updateBuildings(dt);if(!this.started)return;for(const t of this.growth?.towers||[]){const d=WEAPONS[t.weapon];if(!d||!this.isFacilityOperational(t.id))continue;t.weaponClock=(t.weaponClock||0)-dt;if(t.weaponClock>0)continue;const enemy=this.entities.filter(e=>e.type==='bear'&&!e.dead&&distance(e,t)<d.range).sort((a,b)=>distance(a,t)-distance(b,t))[0];if(!enemy)continue;t.weaponClock=d.interval;const damage=d.damage*(1+(t.level-1)*.3);if(t.weapon==='missile')this.missiles.push({x:enemy.x,z:enemy.z,from:{x:t.x,z:t.z},age:0,duration:.8,damage,towerId:t.id});else{this.beamTo(enemy,t,t.weapon==='slow');this.defenseHit(enemy,damage,t);if(t.weapon==='slow')for(const e of this.entities)if(e.type==='bear'&&!e.dead&&distance(e,enemy)<3.5)e.slowUntil=this.time+3;}}
  for(let i=this.missiles.length-1;i>=0;i--){const a=this.missiles[i];a.age+=dt;if(a.age<a.duration)continue;const t=this.growth.towers.find(t=>t.id===a.towerId);if(t){for(const e of this.entities)if(e.type==='bear'&&!e.dead&&distance(e,a)<3)this.defenseHit(e,a.damage,t);this.burst(a.x,a.z,'#ffbc62',18);}this.missiles.splice(i,1);}
 }
 defenseHit(e,damage,t){this.towerHit=true;this.activeTower=t;try{this.hitEntity(e,damage);}finally{this.towerHit=false;this.activeTower=null;}}
 move(e,dx,dz,collision=true){let ratio=1;if(e.type==='bear'){ratio=this.machineKind(e)==='scout'?1.3:this.machineKind(e)==='armor'?.75:.8;if(e.slowUntil>this.time)ratio*=.45;}return super.move(e,dx*ratio,dz*ratio,collision);}
 beginMachineAttack(e,target,{facility,gate}={}){const kind=this.machineKind(e),def=MACHINE_ATTACKS[kind],ranged=def.move==='shell';e.angle=Math.atan2(target.x-e.x,target.z-e.z);e.aggro=true;e.moving=false;
  const a={...def,kind:def.move,elapsed:0,time:def.windup,angle:e.angle,x:ranged?target.x:e.x,z:ranged?target.z:e.z,from:{x:e.x,z:e.z},facility,gate,fired:false};e.enemyAttack=a;e.intent=a;e.windup=a.windup;e.attackCooldown=a.windup+a.active+a.recovery+.4;
 }
 applyMachineDamage(from,amount){const p=this.player;if(p.invincible>0||!this.canTravel(from,p,{type:'projectile'}))return;p.hp=Math.max(0,p.hp-amount);p.invincible=.65;p.hurt=.3;p.lastCombat=this.time;this.emit('damage',{amount});this.floating(p.x,p.z,'−'+amount,'#ffad91');}
 resolveMachineAttack(e,a){const damage=Math.round(this.enemyDefinition(e).damage*a.damage);if(a.move==='shell'){this.enemyShells||=[];this.enemyShells.push({x:a.x,z:a.z,from:{...a.from},age:0,duration:.9,radius:a.radius,damage,facility:a.facility,gate:a.gate});this.emit('enemy-shot',{x:e.x,z:e.z});return;}
  this.effects.push({type:'enemy-impact',move:a.move,x:a.x,z:a.z,angle:a.angle,radius:a.radius,life:.5,total:.5});this.burst(a.x,a.z,'#e59149',a.move==='slam'?18:7);
  if(a.gate){const g=this.gatesNow().find(g=>g.id===a.gate);if(g&&inAttackArea(a,g)){g.hp=Math.max(0,g.hp-(a.move==='drill'?30:a.move==='slam'?36:18));g.lastHit=this.time;if(g.hp===0){g.breach=10;e.route=[];}}}
  else if(a.facility){const f=this.facilities().find(f=>f.id===a.facility);if(f&&inAttackArea(a,f)&&this.canTravel(a.from,f,{type:'projectile'}))this.damageFacility(f.id,damage);}
  if(inAttackArea(a,this.player))this.applyMachineDamage(a.from,damage);
 }
 updateMachineAttack(e,dt){const a=e.enemyAttack;a.elapsed+=dt;a.time=Math.max(0,a.windup-a.elapsed);e.windup=a.time;e.attackCooldown=Math.max(0,e.attackCooldown-dt);if(a.elapsed>=a.windup){e.intent=null;if(!a.fired){a.fired=true;this.resolveMachineAttack(e,a);}}if(a.elapsed>=a.windup+a.active+a.recovery){e.enemyAttack=null;e.windup=0;}return true;}
 updateEnemyAI(e,dt){if(!this.started)return true;e.machineKind=this.machineKind(e);if(e.enemyAttack)return this.updateMachineAttack(e,dt);
  // Preserve committed charges and their original collision/slow behavior.
  if(e.intent||e.dash){const result=super.updateEnemyAI(e,dt);if(e.intent?.kind==='gate'){const g=this.gatesNow().find(g=>g.id===e.intent.gate);if(g)this.beginMachineAttack(e,g,{gate:g.id});}return result;}
  const def=this.enemyDefinition(e),attack=MACHINE_ATTACKS[e.machineKind],inside=this.insideBase(e.x,e.z),ranged=e.machineKind==='artillery';
  const target=this.facilities().filter(f=>this.facilityHealth(f)>0).sort((a,b)=>distance(e,a)-distance(e,b))[0];
  if(target&&(inside||e.raider&&ranged&&this.canTravel(e,target,{type:'projectile'}))){e.aggro=true;e.attackCooldown=Math.max(0,(e.attackCooldown||0)-dt);e.angle=Math.atan2(target.x-e.x,target.z-e.z);if(distance(e,target)<=attack.range){e.moving=false;if(e.attackCooldown<=0)this.beginMachineAttack(e,target,{facility:target.id});}else this.follow(e,target,dt,def.speed);return true;}
  const d=distance(e,this.player),visible=this.canTravel(e,this.player,e),engaged=d<12&&(e.aggro||e.raider||!this.insideBase(this.player.x,this.player.z));
  if(visible&&engaged&&d<=attack.range){e.aggro=true;e.attackCooldown=Math.max(0,(e.attackCooldown||0)-dt);if(e.attackCooldown<=0){this.beginMachineAttack(e,this.player);return true;}if(d<=attack.range*.8){e.moving=false;return true;}}
  if(visible&&engaged&&['scout','armor'].includes(e.machineKind)&&d>2.5&&d<5.5&&(e.attackCooldown||0)<=0){e.intent={kind:'charge',x:this.player.x,z:this.player.z,time:.65};e.windup=.65;e.attackCooldown=3.2;return true;}
  const result=super.updateEnemyAI(e,dt);if(e.intent?.kind==='gate'){const g=this.gatesNow().find(g=>g.id===e.intent.gate);if(g)this.beginMachineAttack(e,g,{gate:g.id});}return result;
 }
 update(dt,input){const before=this.time;super.update(dt,input);const elapsed=this.time-before;if(!elapsed||!this.started)return;for(let i=(this.enemyShells?.length||0)-1;i>=0;i--){const a=this.enemyShells[i];a.age+=elapsed;if(a.age<a.duration)continue;this.effects.push({type:'enemy-impact',move:'shell',x:a.x,z:a.z,radius:a.radius,life:.5,total:.5});this.burst(a.x,a.z,'#ff8d43',16);if(distance(a,this.player)<=a.radius)this.applyMachineDamage(a,a.damage);if(a.facility){const f=this.facilities().find(f=>f.id===a.facility);if(f&&distance(a,f)<=a.radius)this.damageFacility(f.id,a.damage);}if(a.gate){const g=this.gatesNow().find(g=>g.id===a.gate);if(g&&distance(a,g)<=a.radius){g.hp=Math.max(0,g.hp-24);g.lastHit=this.time;if(!g.hp)g.breach=10;}}this.enemyShells.splice(i,1);}}
 serialize(){const d=super.serialize();return{...d,siege:{version:1,durability:{...this.durability},weapons:Object.fromEntries((this.growth?.towers||[]).filter(t=>WEAPONS[t.weapon]).map(t=>[t.id,t.weapon])),caches:(this.deathCaches||[]).map(c=>({...c,resources:{...c.resources}}))}};}
 restore(d){super.restore(d);this.durability={};for(const f of this.facilities())this.durability[f.id]=health(d.siege?.durability?.[f.id],f.max);for(const t of this.growth?.towers||[]){const w=d.siege?.weapons?.[t.id];if(Object.hasOwn(WEAPONS,w))t.weapon=w;}this.deathCaches=(Array.isArray(d.siege?.caches)?d.siege.caches:[]).filter(c=>c&&Number.isFinite(c.x)&&Number.isFinite(c.z)&&this.isLand(c.x,c.z)).map((c,i)=>({id:i+1,x:c.x,z:c.z,resources:Object.fromEntries(['wood','meat','stone','ore'].map(r=>[r,Number.isFinite(c.resources?.[r])?clamp(Math.floor(c.resources[r]),0,1e12):0]))}));this.cacheSerial=this.deathCaches.length;this.missiles=[];this.enemyShells=[];}
}
