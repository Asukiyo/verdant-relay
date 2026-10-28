import {SalvageEngine} from './salvage-engine.js';
import {distance} from './config.js';
/** Active enemy states: pursuit -> telegraph -> committed strike -> recovery. */
export class CombatEngine extends SalvageEngine{
 constructor(o={}){super(o);this.raidClock=0;this.wave=0;this.gateStates=[];this.assignMonsters();}
 assignMonsters(){super.assignMonsters();for(const e of this.entities){if(e.type!=='bear')continue;const floor=24+Math.min(100,(this.baseLevel-1)*6)+(e.enemyKind==='yeti'?45:e.enemyKind==='boar'?25:0);if(e.maxHp<floor){const ratio=e.hp/e.maxHp;e.maxHp=floor;e.hp=Math.max(1,Math.round(floor*ratio));}}}
 gatesNow(){if(!this.gateStates)this.gateStates=[];return this.layout.gates.map(p=>{const id=p.x+','+p.z;let g=this.gateStates.find(g=>g.id===id);if(!g){g={...p,id,hp:140,breach:0,lastHit:-100};this.gateStates.push(g);}return g;});}
 canTravel(a,b,actor={}){if(actor.type==='bear'){const gate=this.gateStates?.find(g=>g.breach>0&&distance(a,g)<2.6);if(gate)return super.canTravel(a,b,{...actor,type:'breached-enemy'});}return super.canTravel(a,b,actor);}
 hurtPlayer(e,multiplier=1){const p=this.player;if(p.invincible>0||!this.canTravel(e,p,e))return;const amount=Math.round(this.enemyDefinition(e).damage*multiplier);p.hp=Math.max(0,p.hp-amount);p.invincible=.65;p.hurt=.3;p.lastCombat=this.time;this.emit('damage',{amount});this.floating(p.x,p.z,'−'+amount,'#ffad91');}
 updateEnemyAI(e,dt){if(!this.started)return true;const p=this.player,d=distance(e,p),def=this.enemyDefinition(e);e.attackCooldown=Math.max(0,(e.attackCooldown||0)-dt);e.stagger=0;e.baitTarget=false;
 if(d>24&&!e.raider){e.aggro=false;e.intent=null;return true;}
 // Being shot no longer freezes the enemy for every beam tick.
 if(e.intent){const a=e.intent;e.aggro=true;a.time-=dt;e.windup=Math.max(0,a.time);if(a.time<=0){e.intent=null;e.windup=0;if(a.kind==='charge'){e.dash={x:a.x,z:a.z,time:.45,hit:false};}else if(a.kind==='gate'){const g=this.gatesNow().find(g=>g.id===a.gate);if(g&&distance(e,g)<2.2){g.hp=Math.max(0,g.hp-18);g.lastHit=this.time;this.burst(g.x,g.z,'#ffb674',7);if(g.hp===0){g.breach=10;e.route=[];}}}else if(distance(e,a)<1.8&&distance(p,a)<1.45)this.hurtPlayer(e);}return true;}
 if(e.dash){const a=e.dash;a.time-=dt;const dx=a.x-e.x,dz=a.z-e.z,len=Math.hypot(dx,dz)||1;this.move(e,dx/len*7*dt,dz/len*7*dt,false);e.walk+=dt*14;if(!a.hit&&distance(e,p)<1.25){this.hurtPlayer(e,1.3);a.hit=true;}if(a.time<=0||len<.25)e.dash=null;return true;}
 const playerOutside=!this.insideBase(p.x,p.z),visible=this.canTravel(e,p,e);if((d<12&&playerOutside)||e.hit>0)e.aggro=true;if(d>18&&!e.raider)e.aggro=false;
 if(e.aggro&&visible&&(playerOutside||this.insideBase(e.x,e.z)||d<9)){e.angle=Math.atan2(p.x-e.x,p.z-e.z);if(e.attackCooldown<=0&&d<1.4){e.intent={kind:'melee',x:p.x,z:p.z,time:.45};e.windup=.45;e.attackCooldown=1.45;return true;}
 if(e.attackCooldown<=0&&d>2&&d<5.5&&['wolf','boar'].includes(e.enemyKind)){e.intent={kind:'charge',x:p.x,z:p.z,time:.65};e.windup=.65;e.attackCooldown=3.2;return true;}
 if(d>1.05){const speed=e.enemyKind==='wolf'?3.65:e.enemyKind==='yeti'?2.15:2.85;this.move(e,(p.x-e.x)/d*speed*dt,(p.z-e.z)/d*speed*dt,false);e.walk+=dt*8;}return true;}
 if(e.raider){const g=this.gatesNow().sort((a,b)=>distance(e,a)-distance(e,b))[0];e.aggro=true;if(g.breach>0){const target={x:g.x+(this.layout.cx-g.x)*.22,z:g.z+(this.layout.cz-g.z)*.22};this.follow(e,target,dt,2.65);if(this.insideBase(e.x,e.z)){e.raider=false;e.aggro=true;}return true;}
 if(distance(e,g)<1.9){if(e.attackCooldown<=0){e.intent={kind:'gate',x:g.x,z:g.z,gate:g.id,time:.65};e.windup=.65;e.attackCooldown=1.6;}return true;}
 const target={x:g.x+(g.axis==='z'?(g.x<this.layout.cx?-1.3:1.3):0),z:g.z+(g.axis==='x'?(g.z<this.layout.cz?-1.3:1.3):0)};this.follow(e,target,dt,2.6);return true;}
 if(e.aggro&&!visible){this.follow(e,p,dt,2.7);return true;}
 const target={x:e.homeX+Math.sin(this.time*.5+(e.seed||0)*9)*1.5,z:e.homeZ+Math.cos(this.time*.45+(e.seed||0)*9)*1.5};const len=distance(e,target);if(len>.2){this.move(e,(target.x-e.x)/len*.8*dt,(target.z-e.z)/len*.8*dt,false);e.angle=Math.atan2(target.x-e.x,target.z-e.z);e.walk+=dt*2;}return true;}
 hitEntity(e,damage){super.hitEntity(e,damage);if(e.dead){e.intent=null;e.dash=null;e.raider=false;}}
 update(dt,input){const before=this.time;super.update(dt,input);const elapsed=this.time-before;if(!elapsed||!this.started)return;for(const g of this.gatesNow()){if(g.breach>0){g.breach=Math.max(0,g.breach-elapsed);if(!g.breach){g.hp=140;for(const e of this.entities)if(e.type==='bear'&&!e.dead)this.relocate(e);}}else if(this.time-g.lastHit>8)g.hp=Math.min(140,g.hp+elapsed*10);}
 this.raidClock+=elapsed;const interval=this.wave?55:35;if(this.raidClock>=interval){this.raidClock=0;const candidates=this.entities.filter(e=>e.type==='bear'&&!e.dead&&!e.raider&&!this.insideBase(e.x,e.z)&&this.gatesNow().some(g=>distance(e,g)<22)).sort((a,b)=>distance(a,this.player)-distance(b,this.player));const max=Math.min(8,2+this.baseLevel),active=this.entities.filter(e=>e.raider&&!e.dead).length;for(const e of candidates.slice(0,Math.max(0,max-active))){e.raider=true;e.aggro=true;e.route=[];}this.wave++;}}
 get combatStatus(){const active=this.entities.filter(e=>e.type==='bear'&&!e.dead&&(e.raider||e.aggro&&distance(e,this.player)<12));const gates=this.gatesNow(),breached=gates.some(g=>g.breach>0),weak=Math.min(...gates.map(g=>g.hp));return{count:active.length,breached,gateHp:weak,wave:this.wave||0};}
}
