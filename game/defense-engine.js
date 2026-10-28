import {SettlementEngine,MARKET,FACILITIES} from './settlement-engine.js';
import {BUILDINGS,ACTORS,distance,clamp} from './config.js';
export const MONSTERS={
 bear:{name:'スクラップウォーカー',level:1,hp:1,speed:1.55,damage:7,yield:4},
 wolf:{name:'フロストスキッター',level:3,hp:1.25,speed:2.4,damage:9,yield:6},
 boar:{name:'アイスドリルビートル',level:5,hp:1.9,speed:1.8,damage:14,yield:9},
 yeti:{name:'緑の遺跡のコアガーディアン',level:7,hp:2.8,speed:1.4,damage:20,yield:14}
};
BUILDINGS.watchtower.name='アーチャータワー';BUILDINGS.watchtower.description='弓兵が周囲を自動で回収戦。コアは専用トロッコで売り場へ運び、自動売却。';FACILITIES.watchtower.level=2;
const blank=()=>({stock:0,cargo:0,progress:0,state:'loading',delivered:0,depot:0,revenue:0});
const integer=v=>Number.isFinite(v)?Math.max(0,Math.min(1e9,Math.floor(v))):0;
export class DefenseEngine extends SettlementEngine{
 constructor(options={}){super(options);this.logistics=this.logistics||blank();this.arrows=[];this.arrowClock=0;this.depotClock=0;this.assignMonsters();}
 enemyDefinition(e){const base=ACTORS[e.boss?'boss':'bear'],d=MONSTERS[e.enemyKind]||MONSTERS.bear;return{...base,speed:d.speed,damage:e.boss?d.damage*2:d.damage,yield:e.boss?d.yield*3:d.yield};}
 assignMonsters(){for(const e of this.entities){if(e.type!=='bear')continue;const region=Math.max(this.baseLevel,Math.floor((Math.abs(e.homeX)+Math.abs(e.homeZ))/18)+1);const kind=region>=7?'yeti':region>=5?'boar':region>=3?'wolf':'bear';if(e.enemyKind===kind)continue;const old=MONSTERS[e.enemyKind]?.hp||1,ratio=e.hp/e.maxHp;e.maxHp=Math.round(e.maxHp/old*MONSTERS[kind].hp);e.hp=Math.max(1,Math.round(e.maxHp*ratio));e.enemyKind=kind;}}
 ensureWorld(){super.ensureWorld();this.assignMonsters();}
 expand(marker){const ok=super.expand(marker);if(ok){this.assignMonsters();this.emit('monster-wave',{kind:this.currentMonster});}return ok;}
 get currentMonster(){return this.baseLevel>=7?'yeti':this.baseLevel>=5?'boar':this.baseLevel>=3?'wolf':'bear';}
 drop(x,z,resource,amount){if(this.towerHit&&resource==='meat'){this.logistics.stock+=amount;this.floating(BUILDINGS.watchtower.x,BUILDINGS.watchtower.z,`コア +${amount}`,'#ffd9c4',3.2);return;}super.drop(x,z,resource,amount);}
 updateBuildings(dt){
 for(const[id,b]of Object.entries(this.buildings)){const d=BUILDINGS[id];b.clock+=dt;if(b.clock>=d.interval){b.clock%=d.interval;if(Object.keys(d.yield).length)this.grant(d.yield,{collect:true});}}
 const tower=BUILDINGS.watchtower;this.arrowClock-=dt;
 if(this.buildings.watchtower&&this.arrowClock<=0){const target=this.entities.filter(e=>e.type==='bear'&&!e.dead&&distance(e,tower)<15).sort((a,b)=>distance(a,tower)-distance(b,tower))[0];if(target){this.arrows.push({targetId:target.id,from:{x:tower.x,y:3.05,z:tower.z},to:{x:target.x,y:1,z:target.z},age:0,duration:Math.max(.18,distance(target,tower)/18)});this.arrowClock=.9;this.emit('tower',{});}}
 for(let i=this.arrows.length-1;i>=0;i--){const a=this.arrows[i];a.age+=dt;if(a.age<a.duration)continue;this.resolveArrow(a);this.arrows.splice(i,1);}
 if(this.buildings.watchtower)this.updateCart(dt);
 }
 resolveArrow(a){const target=this.entities.find(e=>e.id===a.targetId);if(target&&!target.dead&&distance(target,BUILDINGS.watchtower)<17){this.towerHit=true;try{this.hitEntity(target,8+this.baseLevel*2);}finally{this.towerHit=false;}}}
 updateCart(dt){const l=this.logistics,len=distance(BUILDINGS.watchtower,{x:MARKET.x,z:MARKET.z}),step=dt*3.3/len;
 if(l.state==='loading'){const n=Math.min(12-l.cargo,l.stock);l.stock-=n;l.cargo+=n;if(l.cargo>0)l.state='outbound';}
 else if(l.state==='outbound'){l.progress=Math.min(1,l.progress+step);if(l.progress>=1){l.depot+=l.cargo;l.delivered+=l.cargo;l.cargo=0;l.state='returning';this.emit('cart-delivery',{amount:l.depot});}}
 else{l.progress=Math.max(0,l.progress-step);if(l.progress<=0)l.state='loading';}
 this.depotClock+=dt;if(this.depotClock>=.25){this.depotClock%=.25;const n=Math.min(2,l.depot);if(n){const cash=n*MARKET.rates.meat;l.depot-=n;l.revenue+=cash;this.grant({cash});this.business.earned+=cash;this.business.sold+=n;this.business.transactions++;this.lastSale=this.time;}}
 }
 serialize(){const data=super.serialize();data.logistics={...(this.logistics||blank())};const live=new Map(this.entities.map(e=>[e.id,e]));for(const s of data.entities){const actor=live.get(s.id);if(actor?.enemyKind)s.hp=Math.max(1,s.hp/MONSTERS[actor.enemyKind].hp);}return data;}
 restore(data){super.restore(data);const s=data.logistics||{},l=blank();for(const k of ['stock','cargo','delivered','depot','revenue'])l[k]=integer(s[k]);l.cargo=Math.min(12,l.cargo);l.progress=Number.isFinite(s.progress)?clamp(s.progress,0,1):0;l.state=['loading','outbound','returning'].includes(s.state)?s.state:'loading';this.logistics=l;if(this.arrows)this.arrows=[];}
 getSnapshot(){return{...super.getSnapshot(),monster:MONSTERS[this.currentMonster].name,logistics:{...this.logistics}};}
}
