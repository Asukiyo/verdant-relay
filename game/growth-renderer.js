import {freightRoute,routePose,mergedTracks} from './base-planning.js';
import * as T from '../vendor/three.module.min.js';
import {CampRenderer} from './camp-renderer.js';
import {Renderer3D} from './renderer-3d.js';
import {box,log,mat,archerTower,minecart} from './models-3d.js';
import {forge} from './camp-models.js';
import {goldMine,barracks,soldierModel,goldOre} from './growth-models.js';
import {SOLDIER_TYPES,BARRACKS} from './growth-content.js';
import {UPGRADE_SPOTS} from './camp-layout.js';
import {MARKET} from './settlement-engine.js';
import {distance,RESOURCE_NAMES} from './config.js';
export class GrowthRenderer extends CampRenderer {
 constructor(canvas,e,options={}){super(canvas,e,options);this.facilityModels=new Map();this.freightModels=new Map();this.oreDisplay=new T.Group();this.scene.add(this.oreDisplay);this.oreDisplayCount=-1;this.baitPile.visible=false;this.playerFish.visible=false;}
 makeHunterModel(h){return soldierModel(h.kind);}
 onBaseRebuilt(){if(!this.scenery)return;this.scenery.traverse(o=>{if(o.userData.ownedGeometry)o.geometry.dispose();});this.scenery.clear();this.fish=[];this.gates=[];this.facilityModels.clear();this.freightModels.clear();const e=this.engine,l=e.layout;
 for(const p of Object.values(UPGRADE_SPOTS)){box(this.scenery,'#45657a',[p.x,.22,p.z-.65],[.65,.44,.35]);box(this.scenery,'#8ae5ef',[p.x,.46,p.z-.65],[.48,.04,.26]);}for(const w of l.walls)box(this.scenery,'#506c7b',[(w.x0+w.x1)/2,.52,(w.z0+w.z1)/2],[Math.max(.13,w.x1-w.x0),.15,Math.max(.13,w.z1-w.z0)]);
 for(const gate of l.gates){const root=new T.Group();root.position.set(gate.x,0,gate.z);root.rotation.y=gate.axis==='x'?0:Math.PI/2;const leaves=[];for(const side of[-1,1]){const leaf=new T.Group();leaf.position.x=side*1.3;box(leaf,'#354f60',[-side*.63,.5,0],[1.2,.85,.12]);box(leaf,'#83ead3',[-side*.63,.5,.08],[1.2,.08,.055]);root.add(leaf);leaves.push(leaf);}this.scenery.add(root);this.gates.push({point:gate,leaves});}
 if(e.growth.barracksLevel){const b=barracks();b.position.set(BARRACKS.x,0,BARRACKS.z);this.scenery.add(b);}
 for(const s of [...e.growth.towers,...e.growth.mines]){const mine=s.id.startsWith('mine'),m=mine?goldMine():archerTower();m.position.set(s.x,0,s.z);this.scenery.add(m);this.facilityModels.set(s.id,m);const pile=new T.Group();pile.position.set(s.x-.9,0,s.z+.25);this.scenery.add(pile);const cart=minecart();this.scenery.add(cart);this.freightModels.set(s.id,{cart,pile,count:-1,stock:-1});}
 // Merge shared rail sections; each cart follows the same route used by simulation.
 const routes=[...e.growth.towers,...e.growth.mines].map(s=>freightRoute(s,l,MARKET));
 for(const t of mergedTracks(routes)){const track=new T.Group(),length=t.to-t.from;track.position.set(t.axis==='x'?t.from:t.fixed,0,t.axis==='z'?t.from:t.fixed);track.rotation.y=t.axis==='x'?Math.PI/2:0;for(const x of[-.24,.24])box(track,'#79949a',[x,.09,length/2],[.035,.035,length]);for(let z=.2;z<length;z+=1)box(track,'#50686c',[0,.065,z],[.65,.025,.08]);this.scenery.add(track);}
 // Quiet floor zoning and a clear north–south pedestrian spine.
 box(this.scenery,'#68847e',[-3.15,.035,(l.back+2.8)/2],[1.15,.012,2.8-l.back-.6]);
 for(const [x,z,w,d,color]of [[-6.2,-.95,5.6,1.8,'#476b79'],[-6.2,1,5.6,1.7,'#506783'],[-7,5.8,3.7,6,'#63786c'],[-2.2,5.5,2.7,3.5,'#607f70'],[.65,4.3,3.2,3.8,'#6c747b']]){box(this.scenery,color,[x,.035,z],[w,.01,d]);}

 }
 beforeRender(dt){super.beforeRender(dt);this.baitPile.visible=false;this.playerFish.visible=false;this.rod.visible=false;const e=this.engine;
 for(const h of e.hunters){const m=this.hunterModels.get(h.id);if(!m)continue;if(h.kind==='miner'&&h.state==='採掘'&&!h.moving)m.userData.arms[1].rotation.x=-.8+Math.sin(e.time*7)*.65;if(h.kind==='guard')m.userData.arms[1].rotation.x=-(h.swing||0)*3;}
 for(const s of [...e.growth.towers,...e.growth.mines]){const f=this.freightModels.get(s.id);if(!f)continue;const p=s.cart.progress,pose=routePose(freightRoute(s,e.layout,MARKET),p);f.cart.position.set(pose.x,.1,pose.z);f.cart.rotation.y=pose.angle+(s.cart.state==='returning'?Math.PI:0);for(const w of f.cart.userData.wheels)w.rotation.x=p*30;const mine=s.id.startsWith('mine'),fill=(g,n)=>{g.clear();for(let i=0;i<Math.min(16,n);i++){if(mine)goldOre(g,[(i%3-1)*.23,.1+Math.floor(i/3)*.19,0]);else log(g,[0,.13+Math.floor(i/3)*.14,(i%3-1)*.23],true);}};if(f.count!==s.cart.cargo){f.count=s.cart.cargo;fill(f.cart.userData.cargo,f.count);}if(f.stock!==s.stock){f.stock=s.stock;fill(f.pile,f.stock);}if(!mine){const archer=this.facilityModels.get(s.id)?.userData.archer,a=e.arrows.find(a=>a.towerId===s.id);if(archer&&a)archer.rotation.y=Math.atan2(a.to.x-s.x,a.to.z-s.z);}}
 const n=e.trade.stock.ore;if(n!==this.oreDisplayCount){this.oreDisplayCount=n;this.oreDisplay.clear();for(let i=0;i<Math.min(18,n);i++)goldOre(this.oreDisplay,[(i%3-1)*.22,.1+Math.floor(i/3)*.17,0]);}this.oreDisplay.position.set(MARKET.x,.87,MARKET.z);
 for(const c of e.customers){if(c.carrying?.resource!=='ore')continue;const m=this.customerModels.get(c.id);if(m&&!m.userData.goldHandled){m.userData.orderGoods.clear();for(let i=0;i<c.carrying.amount;i++)goldOre(m.userData.orderGoods,[(i-1)*.19,.1,0]);m.userData.goldHandled=true;}}
 }
 drawOverlay(){Renderer3D.prototype.drawOverlay.call(this);if(this.width<=760||matchMedia('(pointer: coarse)').matches)return;const e=this.engine,p=e.player;for(const s of [...e.growth.towers,...e.growth.mines])if(distance(s,p)<7)this.label(s.x,s.z,s.id.startsWith('mine')?1.7:4,`${s.id.startsWith('mine')?'金鉱':'塔'} Lv.${s.level} · 運搬 ${s.cart.cargo}/${e.freightCapacity(s)}`,'#715738e8');for(const h of e.hunters)if(distance(h,p)<6)this.label(h.x,h.z,2.15,`${SOLDIER_TYPES[h.kind].name} · ${h.state}`,'#375867dd');const first=e.customers.find(c=>c.state==='waiting');if(first&&distance(first,p)<8)this.label(first.x,first.z,2.1,first.order?`${RESOURCE_NAMES[first.order]}を購入中`:'商品を待っています','#416a84ee');}
}
