import {VERSION,SAVE_KEY,TILE_SIZE,ACTORS,UPGRADES,BUILDINGS,QUESTS,key,clamp,distance,seeded,biomeAt} from './config.js';

const START_TILES=[[-1,0],[0,0],[-1,1],[0,1]];
const DIRECTIONS=[[1,0],[-1,0],[0,1],[0,-1]];
const EMPTY_STATS={woodCollected:0,meatCollected:0,stoneCollected:0,trees:0,bears:0,bosses:0,expanded:0,tiles:4,playTime:0};

/** Pure simulation; rendering, audio and input subscribe to events. New systems use on()/emit(). */
export class GameEngine{
 constructor({storage=null,seed=71329}={}){
  this.storage=storage;this.seed=seed;this.listeners=new Map();this.time=0;this.paused=false;this.started=false;
  this.tiles=new Map();this.entities=[];this.frontiers=[];this.loot=[];this.effects=[];this.path=[];
  this.resources={wood:0,meat:0,stone:0};this.upgrades={axe:1,boots:1,vitality:1,reach:1};this.buildings={};
  this.stats={...EMPTY_STATS};this.questIndex=0;this.level=1;this.xp=0;this.settings={sound:false};
  this.player={x:-.8,z:1.5,hp:100,angle:-.4,swing:0,walk:0,moving:false,invincible:0,hurt:0,attackCooldown:0,lastCombat:-20};
  this.combo=0;this.comboUntil=0;this.fever=0;this.powerCooldown=0;this.hitStop=0;this.unlocking=null;this.saveClock=0;this.target=null;this.hint=null;this.lastHint='';this.towerClock=0;this.saveProblem=false;
  for(const [x,z] of START_TILES)this.addTile(x,z,true);
  this.rebuildFrontiers();this.load();
 }
 on(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);return()=>this.listeners.get(type)?.delete(fn);}
 emit(type,data){for(const fn of this.listeners.get(type)||[])fn(data);}
 get maxHP(){return 100+(this.upgrades.vitality-1)*25+(this.level-1)*5;}
 get attack(){return this.upgrades.axe*2+(this.fever>0?this.upgrades.axe:0);}
 get attackRange(){return 2.25+(this.upgrades.reach-1)*.22;}
 get speed(){return 4.25+Math.min(5,(this.upgrades.boots-1)*.24)+(this.fever>0?.65:0);}
 get nextXP(){return 50+this.level*25;}
 cellAt(x,z){return {x:Math.round(x/TILE_SIZE),z:Math.round(z/TILE_SIZE)};}
 isLand(x,z,margin=0){if(!Number.isFinite(x)||!Number.isFinite(z))return false;const t=this.cellAt(x,z);if(!this.tiles.has(key(t.x,t.z)))return false;if(!margin)return true;return [[margin,margin],[-margin,margin],[margin,-margin],[-margin,-margin]].every(([a,b])=>this.isLand(x+a,z+b));}
 tileAt(x,z){const t=this.cellAt(x,z);return this.tiles.get(key(t.x,t.z));}
 addTile(x,z,initial=false){
  if(this.tiles.has(key(x,z)))return false;
  const b=biomeAt(x,z),rand=seeded(this.seed+x*73856093+z*19349663),d=Math.max(0,Math.abs(x)+Math.abs(z)-1);
  const tile={x,z,key:key(x,z),biome:b.id,created:initial?-20:this.time,seed:Math.floor(rand()*1e6)};
  this.tiles.set(tile.key,tile);
  const spots=[];const count=5+Math.floor(rand()*3);
  for(let i=0,attempt=0;i<count&&attempt<75;attempt++){
   let ex=x*TILE_SIZE+(rand()-.5)*(TILE_SIZE-1.35),ez=z*TILE_SIZE+(rand()-.5)*(TILE_SIZE-1.35);
   if(spots.some(p=>Math.hypot(ex-p.x,ez-p.z)<1.4))continue;
   if(Object.values(BUILDINGS).some(p=>Math.hypot(ex-p.x,ez-p.z)<1.65))continue;
   if(Math.hypot(ex+.8,ez-1.5)<1.5)continue;
   const rock=rand()<.17&&!(x===0&&z===0&&i<3);const type=rock?'rock':'tree';
   const maxHp=ACTORS[type].baseHp+Math.floor(d*ACTORS[type].hpPerDistance);
   this.entities.push({id:`${x},${z}:${i}`,type,x:ex,z:ez,homeX:ex,homeZ:ez,tile:tile.key,hp:maxHp,maxHp,scale:.84+rand()*.34,variant:Math.floor(rand()*3),angle:rand()*Math.PI*2,hit:0,dead:0,fall:0,seed:rand(),biome:b.id});
   spots.push({x:ex,z:ez});i++;
  }
  const bearCount=(x===0&&z===0)||(x===-1&&z===1)?0:(d>4?2:1);
  for(let i=0;i<bearCount;i++){
   let ex=x*TILE_SIZE+(rand()-.5)*2,ez=z*TILE_SIZE+(rand()-.5)*2;
   const boss=d>=3&&(Math.abs(x*3+z*5)%5===0||d===3&&x===3);
   const hp=Math.round(ACTORS[boss?'boss':'bear'].baseHp*b.bearMultiplier);
   this.entities.push({id:`${x},${z}:bear${i}`,type:'bear',x:ex,z:ez,homeX:ex,homeZ:ez,tile:tile.key,hp,maxHp:hp,scale:boss?1.55:1,angle:rand()*6.28,walk:0,hit:0,dead:0,attackCooldown:1,windup:0,aggro:false,boss,biome:b.id,seed:rand()});
  }
  return true;
 }
 expansionCost(){const n=this.tiles.size-4;return{wood:Math.round(12+4*n+.18*n*n),...(n>=2?{meat:Math.floor(2+(n-2)*1.1)}:{}),...(n>=10?{stone:Math.floor((n-9)*1.3)}:{})};}
 rebuildFrontiers(){
  const map=new Map();
  for(const t of this.tiles.values())for(const [dx,dz] of DIRECTIONS){
   const tx=t.x+dx,tz=t.z+dz,k=key(tx,tz);if(this.tiles.has(k))continue;
   const f={key:k,tx,tz,fromX:t.x,fromZ:t.z,x:t.x*TILE_SIZE+dx*(TILE_SIZE/2-.68),z:t.z*TILE_SIZE+dz*(TILE_SIZE/2-.68),dx,dz};
   if(!map.has(k)||distance(f,this.player)<distance(map.get(k),this.player))map.set(k,f);
  }
  this.frontiers=[...map.values()];this.stats.tiles=this.tiles.size;this.stats.expanded=this.tiles.size-START_TILES.length;
 }
 canAfford(cost){return Object.entries(cost).every(([r,n])=>Number.isFinite(n)&&n>=0&&(this.resources[r]??0)>=n);}
 spend(cost){if(!this.canAfford(cost))return false;for(const [r,n] of Object.entries(cost))this.resources[r]-=n;this.emit('resources',{...this.resources});return true;}
 grant(resources,{collect=false}={}){for(const [r,n]of Object.entries(resources)){if(!(r in this.resources)||!Number.isFinite(n)||n<0)continue;this.resources[r]+=n;if(collect)this.stats[`${r}Collected`]+=n;this.emit('collect',{resource:r,amount:n});}this.emit('resources',{...this.resources});}
 gainXP(n){this.xp+=n;while(this.xp>=this.nextXP){this.xp-=this.nextXP;this.level++;this.player.hp=Math.min(this.maxHP,this.player.hp+25);this.emit('level',this.level);this.burst(this.player.x,this.player.z,'#ffdc7e',22);}}
 upgrade(id){const def=UPGRADES[id];if(!def)return {ok:false,reason:'unknown_upgrade'};if(this.upgrades[id]>=100)return{ok:false,reason:'max_level'};const cost=def.cost(this.upgrades[id]);if(!this.spend(cost))return{ok:false,reason:'insufficient_resources'};this.upgrades[id]++;if(id==='vitality')this.player.hp=Math.min(this.maxHP,this.player.hp+25);this.emit('upgrade',{id,level:this.upgrades[id]});this.save();return{ok:true,level:this.upgrades[id]};}
 build(id){const def=BUILDINGS[id];if(!def)return{ok:false,reason:'unknown_building'};if(this.buildings[id])return{ok:false,reason:'already_built'};if(this.tiles.size<def.requiredTiles)return{ok:false,reason:'more_land_required'};if(!this.spend(def.cost))return{ok:false,reason:'insufficient_resources'};this.buildings[id]={clock:0,created:this.time};this.emit('build',{id});this.burst(def.x,def.z,'#ffcf79',25);this.save();return{ok:true};}
 expand(f){
  if(!f||!this.frontiers.some(a=>a.key===f.key)||distance(this.player,f)>1.4)return false;
  const cost=this.expansionCost();if(!this.spend(cost))return false;
  this.addTile(f.tx,f.tz);this.stats.expanded++;this.gainXP(15);this.path=[];this.unlocking=null;this.rebuildFrontiers();
  this.burst(f.x,f.z,'#fff6a2',25);this.emit('expand',{tile:this.tiles.get(f.key),total:this.tiles.size});this.save();return true;
 }
 getQuest(){
  const q=QUESTS[this.questIndex]||{title:`領土を${20+(this.questIndex-QUESTS.length)*5}区画に広げよう`,description:'まだ見ぬ森へ。開拓はどこまでも続く。',stat:'tiles',goal:20+(this.questIndex-QUESTS.length)*5,reward:{wood:50+(this.questIndex-QUESTS.length)*10,meat:15,stone:10}};
  const progress=q.stat?(this.stats[q.stat]||0):q.upgrade?this.upgrades[q.upgrade]:this.buildings[q.building]?1:0;
  return{...q,index:this.questIndex,progress:Math.min(progress,q.goal),complete:progress>=q.goal};
 }
 claimQuest(){const q=this.getQuest();if(!q.complete)return{ok:false,reason:'incomplete'};this.grant(q.reward);this.questIndex++;this.gainXP(12);this.emit('quest',{reward:q.reward});this.save();return{ok:true,reward:q.reward};}
 heal(){if(this.player.hp>=this.maxHP)return{ok:false,reason:'full_health'};if(!this.spend({meat:3}))return{ok:false,reason:'insufficient_resources'};this.player.hp=Math.min(this.maxHP,this.player.hp+50);this.burst(this.player.x,this.player.z,'#b9f596',15);this.emit('heal',50);this.save();return{ok:true};}
 navigateTo(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||!this.isLand(x,z))return false;
  const start=this.cellAt(this.player.x,this.player.z),end=this.cellAt(x,z),skey=key(start.x,start.z),ekey=key(end.x,end.z);
  const queue=[start],previous=new Map([[skey,null]]);
  for(let i=0;i<queue.length;i++){const p=queue[i];if(key(p.x,p.z)===ekey)break;for(const [dx,dz]of DIRECTIONS){const nx=p.x+dx,nz=p.z+dz,k=key(nx,nz);if(this.tiles.has(k)&&!previous.has(k)){previous.set(k,key(p.x,p.z));queue.push({x:nx,z:nz});}}}
  if(!previous.has(ekey))return false;
  const cells=[];for(let p=ekey;p&&p!==skey;p=previous.get(p)){const [tx,tz]=p.split(',').map(Number);cells.unshift({x:tx*TILE_SIZE,z:tz*TILE_SIZE});}
  // Cross each boundary through its midpoint; this keeps navigation on connected land.
  const path=[];let prev={x:start.x*TILE_SIZE,z:start.z*TILE_SIZE};
  if(cells.length)path.push(prev);
  for(const cell of cells){path.push({x:(prev.x+cell.x)/2,z:(prev.z+cell.z)/2},cell);prev=cell;}
  path.push({x,z});this.path=path;this.target={x,z,time:this.time};this.started=true;return true;
 }
 move(entity,dx,dz,collision=true){
  const allow=(x,z)=>{if(!this.isLand(x,z,.22))return false;if(collision)for(const e of this.entities){if(e.dead||e.type==='bear')continue;if(Math.abs(e.x-x)>1||Math.abs(e.z-z)>1)continue;if(Math.hypot(e.x-x,e.z-z)<(e.type==='rock'?.62:.42))return false;}return true;};
  if(allow(entity.x+dx,entity.z+dz)){entity.x+=dx;entity.z+=dz;return;}
  if(allow(entity.x+dx,entity.z))entity.x+=dx;
  if(allow(entity.x,entity.z+dz))entity.z+=dz;
 }
 drop(x,z,resource,amount){const n=Math.min(12,amount);for(let i=0;i<n;i++){const a=i*2.4+this.time;this.loot.push({x:x+Math.cos(a)*.85,z:z+Math.sin(a)*.85,resource,amount:Math.floor(amount/n)+(i<amount%n?1:0),age:0,lift:.8});}}
 burst(x,z,color,count=8){for(let i=0;i<count;i++){const a=i*2.399;this.effects.push({type:'particle',x,z,y:.3,vx:Math.cos(a)*(1+Math.random()*1.7),vz:Math.sin(a)*(1+Math.random()*1.7),vy:2+Math.random()*2,color,life:.5+Math.random()*.4,total:.9,size:.05+Math.random()*.09});}}
 floating(x,z,text,color='#fffef0',y=1.5){this.effects.push({type:'text',x,z,y,text,color,life:1.05,total:1.05});}
 hitEntity(e,amount){
  if(e.dead)return;e.hp-=amount;e.hit=.2;e.fallDirection=e.x<this.player.x?-1:1;this.floating(e.x,e.z,`${amount}`,e.type==='bear'?'#fff5d0':'#fffef0',e.type==='tree'?2.3:1.7);
  this.burst(e.x,e.z,e.type==='bear'?'#bd8a58':e.type==='rock'?'#b5c0b0':'#e6c48a',e.type==='bear'?4:7);
  if(e.type==='bear'){e.aggro=true;e.stagger=.12;this.player.lastCombat=this.time;const d=distance(e,this.player)||1;this.move(e,(e.x-this.player.x)/d*.22,(e.z-this.player.z)/d*.22,false);}
  if(e.hp>0){this.emit('hit',{type:e.type});return;}
  const b=biomeAt(...e.tile.split(',').map(Number)),def=e.type==='bear'&&this.enemyDefinition?this.enemyDefinition(e):ACTORS[e.boss?'boss':e.type];e.dead=def.respawn;e.fall=.65;e.aggro=false;e.windup=0;
  this.drop(e.x,e.z,def.resource,Math.round(def.yield*(def.kind==='enemy'?b.bearMultiplier:b.woodMultiplier)));this.gainXP(def.xp);
  if(e.type==='tree')this.stats.trees++;
  if(e.type==='bear'){if(e.boss){this.drop(e.x,e.z,'stone',12);this.stats.bosses++;this.emit('boss',{});}this.stats.bears++;}
  this.combo=this.time<this.comboUntil?this.combo+1:1;this.comboUntil=this.time+4;this.powerCooldown=Math.max(0,this.powerCooldown-.35);if(e.type==='bear')this.hitStop=.028;
  if(this.combo%6===0){this.fever=5;this.emit('fever',{combo:this.combo});}this.emit('combo',{count:this.combo});
  this.emit('harvest',{type:e.type,boss:e.boss,x:e.x,z:e.z});
 }
 powerAttack(){
  if(this.paused)return{ok:false,reason:'paused'};if(this.powerCooldown>0)return{ok:false,reason:'cooldown'};
  this.started=true;this.powerCooldown=7;this.player.spin=.55;this.player.swing=.28;this.player.attackCooldown=.38;this.player.invincible=Math.max(.55,this.player.invincible);
  const targets=this.entities.filter(e=>!e.dead&&distance(e,this.player)<3.9);
  for(const e of targets)this.hitEntity(e,this.attack*3);
  this.hitStop=.045;this.burst(this.player.x,this.player.z,'#d4f7ff',32);this.emit('power',{hits:targets.length});return{ok:true,hits:targets.length};
 }
 update(dt,input={x:0,z:0}){
  if(this.paused)return;dt=clamp(dt,0,.06);if(this.hitStop>0){this.hitStop=Math.max(0,this.hitStop-dt);return;}this.time+=dt;this.powerCooldown=Math.max(0,this.powerCooldown-dt);this.fever=Math.max(0,this.fever-dt);if(this.time>this.comboUntil)this.combo=0;this.player.spin=Math.max(0,(this.player.spin||0)-dt);if(this.started)this.stats.playTime+=dt;
  const p=this.player;p.hurt=Math.max(0,p.hurt-dt);p.invincible=Math.max(0,p.invincible-dt);p.swing=Math.max(0,p.swing-dt);p.attackCooldown-=dt;
  let vx=input.x||0,vz=input.z||0;
  if(Math.hypot(vx,vz)>.01){this.path=[];this.target=null;this.started=true;}
  else if(this.path.length){const t=this.path[0],d=distance(p,t);if(d<.22){this.path.shift();}else{vx=(t.x-p.x)/d;vz=(t.z-p.z)/d;}}
  const magnitude=Math.hypot(vx,vz);p.moving=magnitude>.08;
  if(p.moving){const ratio=Math.min(1,magnitude)/magnitude;vx*=ratio;vz*=ratio;this.move(p,vx*this.speed*dt,vz*this.speed*dt);p.angle=Math.atan2(vx,vz);p.walk+=dt*this.speed*2.5;}
  else p.walk+=dt*.5;
  const near=this.entities.filter(e=>Math.abs(e.x-p.x)<15&&Math.abs(e.z-p.z)<15);
  for(const e of this.entities){
   e.hit=Math.max(0,e.hit-dt);e.fall=Math.max(0,(e.fall||0)-dt);
   if(e.dead){e.dead-=dt;if(e.dead<=0){e.dead=0;e.hp=e.maxHp;e.x=e.homeX;e.z=e.homeZ;e.aggro=false;}continue;}
   if(e.type!=='bear')continue;if(this.updateEnemyAI?.(e,dt))continue;if(Math.abs(e.x-p.x)>15||Math.abs(e.z-p.z)>15)continue;
   e.attackCooldown-=dt;e.walk+=dt*(e.aggro?6:1.2);if(e.stagger>0){e.stagger-=dt;continue;}
   if(!this.started)continue;
   const def=this.enemyDefinition?this.enemyDefinition(e):ACTORS[e.boss?'boss':'bear'],d=distance(e,p);if(d<def.aggroRadius&&p.invincible<1)e.aggro=true;if(d>def.leashRadius)e.aggro=false;
   if(e.windup>0){e.windup-=dt;if(e.windup<=0&&d<1.5&&p.invincible<=0&&(!this.canMeleeHit||this.canMeleeHit(e,p))){const damage=def.damage+(e.boss?0:Math.floor((e.maxHp-def.baseHp)*.35));p.hp=Math.max(0,p.hp-damage);p.hurt=.25;p.invincible=.65;p.lastCombat=this.time;this.floating(p.x,p.z,`−${damage}`,'#ffdbcd');this.emit('damage',{amount:damage});}}
   else if(e.aggro){
    e.angle=Math.atan2(p.x-e.x,p.z-e.z);
    if(d>1.02)this.move(e,(p.x-e.x)/d*def.speed*dt,(p.z-e.z)/d*def.speed*dt,false);
    else if(e.attackCooldown<=0){e.windup=def.windup;e.attackCooldown=def.attackDelay;}
   }else{
    const tx=e.homeX+Math.sin(this.time*.24+e.seed*9)*.7,tz=e.homeZ+Math.cos(this.time*.2+e.seed*9)*.7,dd=Math.hypot(tx-e.x,tz-e.z);
    if(dd>.15){this.move(e,(tx-e.x)/dd*.3*dt,(tz-e.z)/dd*.3*dt,false);e.angle=Math.atan2(tx-e.x,tz-e.z);}
   }
  }
  if(this.started&&this.autoAttack)this.autoAttack(dt);
  else if(this.started&&p.attackCooldown<=0){
   const targets=near.filter(e=>!e.dead&&distance(e,p)<this.attackRange).sort((a,b)=>(a.type==='bear'?0:1)-(b.type==='bear'?0:1)||distance(a,p)-distance(b,p));
   if(targets.length){p.swing=.28;p.attackCooldown=this.fever>0?.2:.34;const target=targets[0];p.angle=Math.atan2(target.x-p.x,target.z-p.z);this.emit('swing',{});for(const e of targets.slice(0,this.upgrades.reach+2))this.hitEntity(e,this.attack);}
  }
  if(p.hp<=0){p.x=-.8;p.z=1.5;p.hp=this.maxHP;p.invincible=4;this.path=[];this.unlocking=null;p.lastCombat=this.time;this.emit('downed',{});}
  if(this.time-p.lastCombat>7&&p.hp<this.maxHP){p.hp=Math.min(this.maxHP,p.hp+dt*(this.buildings.camp?6:2));}
  this.updateLoot(dt);this.updateEffects(dt);this.updateBuildings(dt,near);this.updateExpansion(dt);
  this.saveClock+=dt;if(this.saveClock>=4){this.saveClock=0;this.save();}
 }
 updateLoot(dt){
  for(let i=this.loot.length-1;i>=0;i--){const l=this.loot[i];l.age+=dt;const d=distance(l,this.player);if(l.age>.18&&d<5.5){const k=1-Math.exp(-dt*14);l.x+=(this.player.x-l.x)*k;l.z+=(this.player.z-l.z)*k;l.lift=Math.max(.25,1-d*.2);}
   if((l.age>.28&&d<.4)||l.age>45){this.grant({[l.resource]:l.amount},{collect:true});this.loot.splice(i,1);}
  }
 }
 updateEffects(dt){for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;if(e.life<=0){this.effects.splice(i,1);continue;}if(e.type==='particle'){e.x+=e.vx*dt;e.z+=e.vz*dt;e.y+=e.vy*dt;e.vy-=10*dt;if(e.y<.03){e.y=.03;e.vy=-e.vy*.25;}}else e.y+=dt*.8;}if(this.effects.length>200)this.effects.splice(0,this.effects.length-200);}
 updateBuildings(dt,near){
  for(const [id,b]of Object.entries(this.buildings)){const def=BUILDINGS[id];b.clock+=dt;if(b.clock>=def.interval){b.clock%=def.interval;if(Object.keys(def.yield).length){this.grant(def.yield,{collect:true});this.floating(def.x,def.z,`+${Object.values(def.yield)[0]}`,'#e9ffc0',2.4);}}}
  if(this.buildings.watchtower){this.towerClock-=dt;if(this.towerClock<=0){const bear=near.filter(e=>e.type==='bear'&&!e.dead&&e.aggro&&distance(e,this.player)<5).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];if(bear){this.hitEntity(bear,Math.max(2,Math.floor(this.attack*.75)));this.towerClock=2;this.emit('tower',{});}}}
 }
 updateExpansion(dt){
  if(!this.started)return;
  const f=this.frontiers.find(a=>distance(a,this.player)<.85);
  if(!f){this.unlocking=null;this.setHint(null);return;}
  const cost=this.expansionCost();
  if(!this.canAfford(cost)){this.unlocking=null;this.setHint({type:'cost',cost,frontier:f});return;}
  if(!this.unlocking||this.unlocking.key!==f.key)this.unlocking={key:f.key,progress:0};
  this.unlocking.progress+=dt/.8;this.setHint({type:'expanding',progress:this.unlocking.progress,cost});
  if(this.unlocking.progress>=1)this.expand(f);
 }
 setHint(hint){this.hint=hint;}
 serialize(){return{version:VERSION,seed:this.seed,resources:{...this.resources},upgrades:{...this.upgrades},buildings:Object.fromEntries(Object.entries(this.buildings).map(([id,v])=>[id,{clock:v.clock}])),stats:{...this.stats},questIndex:this.questIndex,level:this.level,xp:this.xp,settings:{...this.settings},tiles:[...this.tiles.values()].map(t=>[t.x,t.z]),player:{x:this.player.x,z:this.player.z,hp:this.player.hp},entities:this.entities.filter(e=>e.dead||e.hp<e.maxHp).map(e=>({id:e.id,hp:e.hp,dead:e.dead})),loot:this.loot.map(l=>({...l})),savedAt:Date.now()};}
 save(){if(this.resetting)return;if(!this.storage)return true;try{this.storage.setItem(SAVE_KEY,JSON.stringify(this.serialize()));return true;}catch{if(!this.saveProblem){this.saveProblem=true;this.emit('save-error',{});}return false;}}
 load(){if(!this.storage)return;try{const raw=this.storage.getItem(SAVE_KEY);if(!raw)return;if(raw.length>4*1024*1024)throw Error('Save too large');this.restore(JSON.parse(raw));}catch{this.saveProblem=true;}}
 restore(data){
  if(!data||data.version!==VERSION||!Array.isArray(data.tiles)||data.tiles.length<4||data.tiles.length>10000)throw Error('Invalid save');
  const number=(v,min,max,fallback)=>typeof v==='number'&&Number.isFinite(v)?clamp(v,min,max):fallback;
  const tiles=data.tiles.filter(t=>Array.isArray(t)&&t.length===2&&t.every(n=>Number.isInteger(n)&&Math.abs(n)<=10000));
  const keys=new Set(tiles.map(t=>key(...t)));if(!START_TILES.every(t=>keys.has(key(...t))))throw Error('Starting land missing');
  // Reject disconnected or duplicate land before mutating the live world.
  if(keys.size!==tiles.length)throw Error('Duplicate land');
  const visited=new Set([key(...START_TILES[0])]),todo=[START_TILES[0]];
  for(let i=0;i<todo.length;i++){const [x,z]=todo[i];for(const[dx,dz]of DIRECTIONS){const k=key(x+dx,z+dz);if(keys.has(k)&&!visited.has(k)){visited.add(k);todo.push([x+dx,z+dz]);}}}
  if(visited.size!==keys.size)throw Error('Disconnected land');
  this.seed=Math.floor(number(data.seed,0,2147483647,this.seed));this.tiles.clear();this.entities=[];
  for(const [x,z]of tiles)this.addTile(x,z,true);
  for(const r of ['wood','meat','stone'])this.resources[r]=Math.floor(number(data.resources?.[r],0,1e12,0));
  for(const id of Object.keys(UPGRADES))this.upgrades[id]=Math.floor(number(data.upgrades?.[id],1,100,1));
  this.buildings={};for(const id of Object.keys(BUILDINGS))if(data.buildings?.[id])this.buildings[id]={clock:number(data.buildings[id].clock,0,BUILDINGS[id].interval,0),created:-20};
  for(const id of Object.keys(EMPTY_STATS))this.stats[id]=number(data.stats?.[id],0,1e12,EMPTY_STATS[id]);
  this.stats.expanded=this.tiles.size-4;this.stats.tiles=this.tiles.size;this.questIndex=Math.floor(number(data.questIndex,0,10000,0));this.level=Math.floor(number(data.level,1,10000,1));this.xp=number(data.xp,0,this.nextXP-1,0);
  this.player.x=number(data.player?.x,-1e6,1e6,-.8);this.player.z=number(data.player?.z,-1e6,1e6,1.5);
  if(!this.isLand(this.player.x,this.player.z,.22)){this.player.x=-.8;this.player.z=1.5;}
  this.player.hp=number(data.player?.hp,1,this.maxHP,this.maxHP);
  const statuses=new Map((Array.isArray(data.entities)?data.entities:[]).map(s=>[s?.id,s]));
  for(const e of this.entities){const s=statuses.get(e.id);if(s){e.dead=number(s.dead,0,60,0);e.hp=number(s.hp,1,e.maxHp,e.maxHp);}}
  this.loot=(Array.isArray(data.loot)?data.loot:[]).filter(l=>l&&['wood','meat','stone'].includes(l.resource)&&Number.isFinite(l.x)&&Number.isFinite(l.z)&&this.isLand(l.x,l.z)&&Number.isInteger(l.amount)&&l.amount>0&&l.amount<10000).slice(0,500).map(l=>({...l,age:0,lift:.5}));
  this.settings.sound=data.settings?.sound===true;this.rebuildFrontiers();this.started=false;
 }
 reset(){if(this.storage)try{this.storage.removeItem(SAVE_KEY);}catch{this.emit('save-error',{});return{ok:false};}this.resetting=true;this.emit('reset',{});return{ok:true};}
 getSnapshot(){return{resources:{...this.resources},health:Math.ceil(this.player.hp),maxHealth:this.maxHP,position:{x:+this.player.x.toFixed(2),z:+this.player.z.toFixed(2)},land:this.tiles.size,upgrades:{...this.upgrades},buildings:Object.keys(this.buildings),quest:this.getQuest(),paused:this.paused,combo:this.combo,feverSeconds:+this.fever.toFixed(1),powerReady:this.powerCooldown<=0};}
}
