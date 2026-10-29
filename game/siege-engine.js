import {CombatEngine} from './combat-engine.js';
import {BUILDINGS,distance,clamp} from './config.js';
import {BARRACKS} from './growth-content.js';

export const WEAPONS={
 beam:{name:'単体ビーム砲',cost:240,range:13,interval:.65,damage:18,description:'単体を即時照射。安定した連続火力。'},
 missile:{name:'範囲ミサイル砲',cost:320,range:16,interval:2.8,damage:30,description:'着弾地点の半径3に範囲攻撃。'},
 slow:{name:'減速電磁タワー',cost:280,range:10,interval:1.6,damage:4,description:'半径3.5の敵を3秒間、移動速度45%に低下。'}
};
const health=(v,max)=>Number.isFinite(v)?clamp(v,0,max):max;
export class SiegeEngine extends CombatEngine{
 constructor(o={}){super(o);this.durability||={};this.deathCaches||=[];this.missiles=[];this.cacheSerial||=0;}
 machineKind(e){return e.enemyKind==='wolf'?'scout':e.enemyKind==='boar'?'armor':e.enemyKind==='yeti'?'artillery':['scout','armor','artillery'][Math.floor((e.seed||0)*3)%3];}
 assignMonsters(){super.assignMonsters();for(const e of this.entities)if(e.type==='bear')e.machineKind=this.machineKind(e);}
 hitEntity(e,damage){const result=super.hitEntity(e,e.type==='bear'&&this.machineKind(e)==='armor'?damage*.65:damage);if(e.dead){e.siegeIntent=null;e.slowUntil=0;}return result;}
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
 updateEnemyAI(e,dt){if(!this.started)return true;const def=this.enemyDefinition(e),inside=this.insideBase(e.x,e.z);e.machineKind=e.enemyKind==='wolf'?'scout':e.enemyKind==='boar'?'armor':e.enemyKind==='yeti'?'artillery':['scout','armor','artillery'][Math.floor((e.seed||0)*3)%3];
  if(e.siegeIntent){const a=e.siegeIntent;e.attackCooldown=Math.max(0,(e.attackCooldown||0)-dt);a.time-=dt;if(a.time<=0){if(a.facility){const f=this.facilities().find(f=>f.id===a.facility);if(f&&distance(f,a)<1&&distance(e,f)<(e.machineKind==='artillery'?12:2))this.damageFacility(f.id,def.damage*(e.machineKind==='armor'?1.7:1));}else if(distance(this.player,a)<1.6&&this.canTravel(e,this.player,e))this.hurtPlayer(e,1.25);e.siegeIntent=null;e.intent=null;}return true;}
  const facilities=this.facilities().filter(f=>this.facilityHealth(f)>0).sort((a,b)=>distance(e,a)-distance(e,b));const target=facilities[0],ranged=e.machineKind==='artillery',range=ranged?11:1.65;
  // Raiders inside the perimeter keep attacking facilities even if the player retreats.
  if(target&&(inside||e.raider&&ranged&&this.canTravel(e,target,{type:'projectile'}))){e.aggro=true;e.attackCooldown=Math.max(0,(e.attackCooldown||0)-dt);e.angle=Math.atan2(target.x-e.x,target.z-e.z);if(distance(e,target)<=range){if(e.attackCooldown<=0){e.siegeIntent={kind:'siege',facility:target.id,x:target.x,z:target.z,time:ranged?1.3:.7};e.intent=e.siegeIntent;e.attackCooldown=ranged?3.2:1.8;}}else this.follow(e,target,dt,def.speed*(e.machineKind==='scout'?1.8:e.machineKind==='armor'?.8:1));return true;}
  if(ranged&&distance(e,this.player)<11&&distance(e,this.player)>3&&this.canTravel(e,this.player,e)){e.aggro=true;e.attackCooldown=Math.max(0,(e.attackCooldown||0)-dt);if(e.attackCooldown<=0){e.siegeIntent={kind:'shell',x:this.player.x,z:this.player.z,time:1.3};e.intent=e.siegeIntent;e.attackCooldown=3.2;}return true;}
  return super.updateEnemyAI(e,dt);
 }
 serialize(){const d=super.serialize();return{...d,siege:{version:1,durability:{...this.durability},weapons:Object.fromEntries((this.growth?.towers||[]).filter(t=>WEAPONS[t.weapon]).map(t=>[t.id,t.weapon])),caches:(this.deathCaches||[]).map(c=>({...c,resources:{...c.resources}}))}};}
 restore(d){super.restore(d);this.durability={};for(const f of this.facilities())this.durability[f.id]=health(d.siege?.durability?.[f.id],f.max);for(const t of this.growth?.towers||[]){const w=d.siege?.weapons?.[t.id];if(Object.hasOwn(WEAPONS,w))t.weapon=w;}this.deathCaches=(Array.isArray(d.siege?.caches)?d.siege.caches:[]).filter(c=>c&&Number.isFinite(c.x)&&Number.isFinite(c.z)&&this.isLand(c.x,c.z)).map((c,i)=>({id:i+1,x:c.x,z:c.z,resources:Object.fromEntries(['wood','meat','stone','ore'].map(r=>[r,Number.isFinite(c.resources?.[r])?clamp(Math.floor(c.resources[r]),0,1e12):0]))}));this.cacheSerial=this.deathCaches.length;this.missiles=[];}
}
