import {GameEngine} from './engine.js';
import {BUILDINGS,UPGRADES,RESOURCE_NAMES,TILE_SIZE,key,biomeAt,distance,clamp} from './config.js';

export const MARKET={x:-2.2,z:4.3,standX:-2.2,standZ:6.05,rates:{wood:2,meat:6,stone:3}};
export const FACILITIES={sawmill:{cost:80,level:2},quarry:{cost:150,level:3},watchtower:{cost:240,level:4},camp:{cost:60,level:1}};
RESOURCE_NAMES.cash='お金';RESOURCE_NAMES.meat='コア';
const newBusiness=()=>({expansions:0,quest:0,earned:0,sold:0,transactions:0});
const valid=(n,fallback=0)=>Number.isFinite(n)&&n>=0?Math.min(1e12,Math.floor(n)):fallback;

/** The forest is public wilderness. Only the fenced, furnished outpost is purchased. */
export class SettlementEngine extends GameEngine {
 constructor(options={}){
  super(options);this.business=this.business||newBusiness();this.resources.cash=this.resources.cash||0;this.worldTiles=new Map(this.tiles);this.saleClock=0;this.lastSale=-20;this.worldCell='';this.settlementReady=true;this.entities=[];this.ensureWorld();this.rebuildFrontiers();
 }
 insideBase(x,z){const t=this.cellAt(x,z);return this.tiles.has(key(t.x,t.z));}
 isLand(x,z,margin=0){return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<190-margin&&Math.abs(z)<190-margin;}
 tileAt(x,z){const t=this.cellAt(x,z);return this.tiles.get(key(t.x,t.z))||this.worldTiles?.get(key(t.x,t.z))||{...t,biome:biomeAt(t.x,t.z).id};}
 addTile(x,z,initial=false){
  if(!this.settlementReady)return super.addTile(x,z,initial);
  const k=key(x,z);if(this.tiles.has(k))return false;this.tiles.set(k,{x,z,key:k,biome:biomeAt(x,z).id,created:initial?-20:this.time,seed:x*7321+z*3191});this.entities=this.entities.filter(e=>!this.insideBase(e.x,e.z));return true;
 }
 ensureWorld(){
  const p=this.cellAt(this.player.x,this.player.z),k=key(p.x,p.z);if(k===this.worldCell)return;this.worldCell=k;
  const base=this.tiles;for(let x=p.x-2;x<=p.x+2;x++)for(let z=p.z-2;z<=p.z+2;z++){
   if(this.worldTiles.has(key(x,z)))continue;
   try{this.tiles=this.worldTiles;super.addTile(x,z,true);}finally{this.tiles=base;}
  }
  this.entities=this.entities.filter(e=>!this.insideBase(e.x,e.z));
  if(this.pendingActors){for(const e of this.entities){const saved=this.pendingActors.get(e.id);if(saved){e.dead=clamp(valid(saved.dead),0,60);e.hp=clamp(valid(saved.hp,e.maxHp),1,e.maxHp);this.pendingActors.delete(e.id);}}}
 }
 move(entity,dx,dz,collision=true){if(entity.type==='bear'&&this.insideBase(entity.x+dx,entity.z+dz))return;super.move(entity,dx,dz,collision);}
 navigateTo(x,z){if(!this.isLand(x,z))return false;this.path=[{x,z}];this.target={x,z,time:this.time};this.started=true;return true;}
 get baseLevel(){return 1+(this.business?.expansions||0);}
 expansionCost(){return{cash:120+(this.business?.expansions||0)*90};}
 upgradeCost(id){const base={axe:40,boots:55,vitality:65,reach:80};return{cash:Math.round(base[id]*Math.pow(1.55,this.upgrades[id]-1))};}
 bounds(){const tiles=[...this.tiles.values()];return{minX:Math.min(...tiles.map(t=>t.x)),maxX:Math.max(...tiles.map(t=>t.x)),minZ:Math.min(...tiles.map(t=>t.z)),maxZ:Math.max(...tiles.map(t=>t.z))};}
 rebuildFrontiers(){
  if(!this.settlementReady){super.rebuildFrontiers();return;}
  const b=this.bounds(),cx=(b.minX+b.maxX)*TILE_SIZE/2,cz=(b.minZ+b.maxZ)*TILE_SIZE/2,r=TILE_SIZE/2-.7;
  this.frontiers=[
   {key:'east',name:'作業ヤードを広げる',x:b.maxX*TILE_SIZE+r,z:cz,tx:b.maxX+1,tz:b.minZ,side:'east',dx:1,dz:0},
   {key:'north',name:'倉庫用地を広げる',x:cx,z:b.minZ*TILE_SIZE-r,tx:b.minX,tz:b.minZ-1,side:'north',dx:0,dz:-1},
   {key:'west',name:'交易広場を広げる',x:b.minX*TILE_SIZE-r,z:cz,tx:b.minX-1,tz:b.minZ,side:'west',dx:-1,dz:0},
   {key:'south',name:'拠点の入口を広げる',x:cx,z:b.maxZ*TILE_SIZE+r,tx:b.minX,tz:b.maxZ+1,side:'south',dx:0,dz:1}
  ];this.stats.tiles=this.tiles.size;this.stats.expanded=this.tiles.size-4;
 }
 expand(marker){
  const f=this.frontiers.find(f=>f.key===marker?.key);if(this.paused||!f||distance(this.player,f)>1.25||!this.spend(this.expansionCost()))return false;
  const b=this.bounds();if(f.side==='east'||f.side==='west'){for(let z=b.minZ;z<=b.maxZ;z++)this.addTile(f.tx,z);}else for(let x=b.minX;x<=b.maxX;x++)this.addTile(x,f.tz);
  this.business.expansions++;this.unlocking=null;this.rebuildFrontiers();this.gainXP(20);this.burst(f.x,f.z,'#ffd694',30);this.emit('expand',{tile:this.tiles.get(key(f.tx,f.tz)),total:this.tiles.size,baseLevel:this.baseLevel});this.save();return true;
 }
 build(id){
  const d=FACILITIES[id],spot=BUILDINGS[id];if(!d)return{ok:false,reason:'unknown_building'};if(this.paused)return{ok:false,reason:'paused'};if(this.buildings[id])return{ok:false,reason:'already_built'};if(this.baseLevel<d.level)return{ok:false,reason:'base_level_required'};if(distance(this.player,spot)>1.25)return{ok:false,reason:'stand_on_marker'};if(!this.spend({cash:d.cost}))return{ok:false,reason:'insufficient_resources'};
  this.buildings[id]={clock:0,created:this.time};this.burst(spot.x,spot.z,'#ffe0a1',24);this.emit('build',{id});this.save();return{ok:true};
 }
 upgrade(id){if(!UPGRADES[id])return{ok:false,reason:'unknown_upgrade'};if(this.upgrades[id]>=100)return{ok:false,reason:'max_level'};if(!this.spend(this.upgradeCost(id)))return{ok:false,reason:'insufficient_resources'};this.upgrades[id]++;if(id==='vitality')this.player.hp=Math.min(this.maxHP,this.player.hp+25);this.emit('upgrade',{id,level:this.upgrades[id]});this.save();return{ok:true,level:this.upgrades[id]};}
 sellBatch(){
  if(this.paused||distance(this.player,{x:MARKET.standX,z:MARKET.standZ})>1.2)return{ok:false,reason:'stand_at_market'};
  const type=['wood','meat','stone'].find(r=>this.resources[r]>0);if(!type)return{ok:false,reason:'empty_bag'};
  const amount=Math.min(3,this.resources[type]),revenue=amount*MARKET.rates[type];this.resources[type]-=amount;this.grant({cash:revenue});this.business.earned+=revenue;this.business.sold+=amount;this.business.transactions++;this.lastSale=this.time;this.emit('sale',{resource:type,amount,revenue});this.floating(MARKET.x,MARKET.z,`+${revenue}`,'#b6ff81',1.9);return{ok:true,resource:type,amount,revenue};
 }
 interactionMarkers(){return[{key:'market',name:'合金・コアを売る',x:MARKET.standX,z:MARKET.standZ,kind:'market'},...this.frontiers,...Object.entries(BUILDINGS).filter(([id])=>!this.buildings[id]).map(([id,d])=>({...d,key:id,kind:'facility'}))];}
 updateExpansion(dt){
  if(!this.started)return;const market={x:MARKET.standX,z:MARKET.standZ};
  if(distance(this.player,market)<1.05){this.unlocking=null;this.saleClock+=dt;if(this.saleClock>=.2){this.saleClock%=.2;this.sellBatch();}this.hint={type:'trade'};return;}this.saleClock=0;
  const facility=Object.entries(BUILDINGS).find(([id,d])=>!this.buildings[id]&&distance(this.player,d)<.85);const f=facility?{...facility[1],key:facility[0],kind:'facility'}:this.frontiers.find(f=>distance(this.player,f)<.95);
  if(!f){this.unlocking=null;this.hint=null;return;}
  if(f.kind==='facility'&&this.baseLevel<FACILITIES[f.key].level){this.unlocking=null;this.hint={type:'base-level',level:FACILITIES[f.key].level};return;}
  const cost=f.kind==='facility'?{cash:FACILITIES[f.key].cost}:this.expansionCost();if(!this.canAfford(cost)){this.unlocking=null;this.hint={type:'cost',cost};return;}
  if(this.unlocking?.key!==f.key)this.unlocking={key:f.key,progress:0};this.unlocking.progress+=dt;this.hint={type:'expanding'};
  if(this.unlocking.progress>=1){if(f.kind==='facility')this.build(f.key);else this.expand(f);this.unlocking=null;}
 }
 update(dt,input){if(this.settlementReady)this.ensureWorld();super.update(dt,input);}
 getQuest(){
  if(!this.business)return super.getQuest();const list=[
   {title:'合金を8個集めよう',description:'門の外の遺跡で解体。森は自由に歩けます。',value:this.stats.woodCollected,goal:8,reward:{cash:10}},
   {title:'売り場で合金・コアを売ろう',description:'拠点の緑の「売却」マークに立とう。',value:this.business.sold,goal:8,reward:{cash:15}},
   {title:'拠点を一回広げよう',description:'お金120を貯め、拡張マークに立とう。',value:this.business.expansions,goal:1,reward:{cash:25}},
   {title:'自動リサイクル施設を建てよう',description:'拠点内の自動リサイクル施設マークで、お金80を支払おう。',value:this.buildings.sawmill?1:0,goal:1,reward:{cash:30}},
   {title:'ウォーカーを3頭倒そう',description:'森で狩りをして、コアを売ろう。コアは高く売れます。',value:this.stats.bears,goal:3,reward:{cash:40}},
   {title:'売上を500まで増やそう',description:'合金は2、コアは6。売り場に運んで自動売却。',value:this.business.earned,goal:500,reward:{cash:60}}
  ];const i=this.business.quest,q=list[i]||{title:`拠点をLv.${i-2}にしよう`,description:'売上を再投資して、床と柵を広げよう。',value:this.baseLevel,goal:i-2,reward:{cash:80}};return{...q,index:i,progress:Math.min(q.value,q.goal),complete:q.value>=q.goal};
 }
 claimQuest(){const q=this.getQuest();if(!q.complete)return{ok:false,reason:'incomplete'};this.business.quest++;this.grant(q.reward);this.gainXP(12);this.emit('quest',{reward:q.reward});this.save();return{ok:true,reward:q.reward};}
 serialize(){const data=super.serialize();data.settlement={...this.business};if(this.pendingActors?.size)data.entities.push(...this.pendingActors.values());return data;}
 restore(data){super.restore(data);this.resources.cash=valid(data.resources?.cash);this.business=data.settlement?Object.fromEntries(Object.keys(newBusiness()).map(k=>[k,valid(data.settlement[k])])):newBusiness();this.pendingActors=new Map((Array.isArray(data.entities)?data.entities:[]).filter(e=>e&&typeof e.id==='string').map(e=>[e.id,e]));if(this.settlementReady){this.worldTiles=new Map(this.tiles);this.entities=[];this.worldCell='';this.ensureWorld();this.rebuildFrontiers();}}
 getSnapshot(){return{...super.getSnapshot(),baseLevel:this.baseLevel,market:{...MARKET,earned:this.business.earned,sold:this.business.sold},facilityCosts:FACILITIES};}
}
