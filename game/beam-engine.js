import {GrowthEngine} from './growth-engine.js';
import {distance} from './config.js';
export class BeamEngine extends GrowthEngine{
 constructor(o={}){super(o);this.energy=0;this.beams=[];this.focusId=null;this.focusTime=0;this.beamClock=0;this.sweep=null;}
 get beamRange(){return Math.min(10,5.5+(this.upgrades.reach-1)*.4);}
 beamTo(target,from=this.player,strong=false){this.beams.push({from:{x:from.x,z:from.z},to:{x:target.x,z:target.z},life:.18,strong});}
 beamHit(e,damage){const dead=e.dead,x=e.x,z=e.z;this.hitEntity(e,damage);if(!e.dead){e.x=x;e.z=z;}this.energy=Math.min(100,this.energy+2+(!dead&&e.dead?12:0));}
 autoAttack(dt){if(this.sweep)return;const p=this.player;const targets=this.entities.filter(e=>!e.dead&&distance(p,e)<this.beamRange&&this.canTravel(p,e,p)).sort((a,b)=>(a.type==='bear'?0:1)-(b.type==='bear'?0:1)||distance(p,a)-distance(p,b));const t=targets.find(e=>e.id===this.focusId)||targets[0];if(!t){this.focusId=null;this.focusTime=0;return;}this.focusTime=t.id===this.focusId?this.focusTime+dt:0;this.focusId=t.id;p.angle=Math.atan2(t.x-p.x,t.z-p.z);this.beamClock-=dt;if(this.beamClock>0)return;this.beamClock=.16;this.beamTo(t);const damage=this.attack*.65*(1+Math.min(1.5,this.focusTime*.6));this.beamHit(t,damage);
 // Inline enemies are pierced from the second emitter level.
 if(this.upgrades.axe>=2){const dx=t.x-p.x,dz=t.z-p.z,len=Math.hypot(dx,dz)||1;for(const e of targets){if(e===t)continue;const along=((e.x-p.x)*dx+(e.z-p.z)*dz)/len,side=Math.abs((e.x-p.x)*dz-(e.z-p.z)*dx)/len;if(along>0&&side<.42){this.beamTo(e);this.beamHit(e,damage*.6);}}}
 if(this.upgrades.reach>=3){const next=targets.find(e=>e!==t&&!e.dead&&distance(e,t)<3&&this.canTravel(t,e,p));if(next){this.beamTo(next,t);this.beamHit(next,damage*.55);}}
 if(this.upgrades.reach>=5)for(const e of targets.filter(e=>e!==t&&!e.dead).slice(0,2)){this.beamTo(e);this.beamHit(e,damage*.4);}
 }
 updateLoot(dt){for(const l of this.loot){if(l.age>.18&&distance(l,this.player)<12&&this.canTravel(l,this.player,this.player)){const k=1-Math.exp(-dt*8);l.x+=(this.player.x-l.x)*k;l.z+=(this.player.z-l.z)*k;l.lift=.8;}}super.updateLoot(dt);}
 powerAttack(){if(this.paused||this.resetting)return{ok:false,reason:'paused'};if(this.energy<100||this.sweep)return{ok:false,reason:'energy'};this.started=true;this.energy=0;this.sweep={age:0,angle:this.player.angle,hit:new Set()};this.emit('power',{hits:0});return{ok:true};}
 update(dt,input){const before=this.time;super.update(dt,input);const elapsed=this.time-before;if(!elapsed||!this.started)return;this.energy=Math.min(100,this.energy+elapsed*(this.energyRecharge??7));this.beams=this.beams.filter(b=>(b.life-=elapsed)>0);if(this.sweep){const s=this.sweep,old=s.age;s.age+=elapsed;const angle=s.angle-Math.PI*.55+Math.min(1,s.age/1.1)*Math.PI*1.1;this.beams.push({from:{x:this.player.x,z:this.player.z},to:{x:this.player.x+Math.sin(angle)*11,z:this.player.z+Math.cos(angle)*11},life:.1,strong:true});for(const e of this.entities){if(e.dead||s.hit.has(e.id)||distance(e,this.player)>11||!this.canTravel(this.player,e,this.player))continue;const a=Math.atan2(e.x-this.player.x,e.z-this.player.z),rel=Math.atan2(Math.sin(a-s.angle),Math.cos(a-s.angle));if(rel>=-Math.PI*.55+old/1.1*Math.PI*1.1-.08&&rel<=angle-s.angle+.08){s.hit.add(e.id);this.beamHit(e,this.attack*9);this.burst(e.x,e.z,'#8ffff0',12);}}if(s.age>=1.1)this.sweep=null;}}
}
