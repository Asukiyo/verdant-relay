import * as T from '../vendor/three.module.min.js';
import {Renderer3D} from './renderer-3d.js';
import {box,ell,log,mat,explorer} from './models-3d.js';
import {fishModel,fishingRod,hunterModel,forge,crate} from './camp-models.js';
import {MARKET} from './settlement-engine.js';
import {UPGRADE_SPOTS} from './camp-layout.js';
import {distance,RESOURCE_NAMES} from './config.js';
export class CampRenderer extends Renderer3D {
 constructor(canvas,engine,options={}){super(canvas,engine,options);for(const m of this.customers)this.scene.remove(m);this.customers=[];this.scenery=new T.Group();this.scene.add(this.scenery);this.fish=[];this.gates=[];this.hunterModels=new Map();this.customerModels=new Map();this.dropModels=new Map();this.baitPile=new T.Group();this.scene.add(this.baitPile);this.storePile=new T.Group();this.scene.add(this.storePile);this.playerFish=new T.Group();this.playerFish.position.set(.35,1.1,-.5);this.player.add(this.playerFish);this.rod=fishingRod();this.rod.position.set(.33,.55,.3);this.player.add(this.rod);if(this.stall.userData.stock)this.stall.userData.stock.visible=false;this.baitCount=-1;this.fishCount=-1;this.storeKey='';}
 onBaseRebuilt(){if(!this.scenery)return;this.scenery.traverse(o=>{if(o.userData.ownedGeometry)o.geometry.dispose();});this.scenery.clear();this.fish=[];this.gates=[];const l=this.engine.layout,p=l.pond;
 const water=new T.Mesh(new T.PlaneGeometry(p.x1-p.x0,p.z1-p.z0),new T.MeshStandardMaterial({color:'#21add6',roughness:.24,metalness:.12}));water.userData.ownedGeometry=true;water.rotation.x=-Math.PI/2;water.position.set((p.x0+p.x1)/2,-.01,(p.z0+p.z1)/2);water.receiveShadow=true;this.scenery.add(water);
 for(const x of[p.x0,p.x1])box(this.scenery,'#edf9ff',[x,0,(p.z0+p.z1)/2],[.2,.14,p.z1-p.z0]);for(const z of[p.z0,p.z1])box(this.scenery,'#edf9ff',[(p.x0+p.x1)/2,0,z],[p.x1-p.x0,.14,.2]);
 const d=l.dock;for(let x=d.x0;x<d.x1;x+=.3)box(this.scenery,'#d1a36b',[x,.12,(d.z0+d.z1)/2],[.28,.15,d.z1-d.z0]);this.markerMeshes.get('fishing').position.y=.22;
 for(let i=0;i<15;i++){const f=fishModel();f.scale.setScalar(1.1+(i%3)*.13);this.scenery.add(f);this.fish.push(f);}
 const crateModel=crate();crateModel.position.set(l.bait.x,0,l.bait.z+.85);this.scenery.add(crateModel);this.baitPile.position.set(l.bait.x,.15,l.bait.z+.85);
 for(const p of Object.values(UPGRADE_SPOTS)){const f=forge();f.position.set(p.x,0,p.z-1.03);this.scenery.add(f);}for(const wall of l.walls)box(this.scenery,'#b38855',[(wall.x0+wall.x1)/2,.52,(wall.z0+wall.z1)/2],[Math.max(.13,wall.x1-wall.x0),.15,Math.max(.13,wall.z1-wall.z0)]);
 for(const gate of l.gates){const root=new T.Group();root.position.set(gate.x,0,gate.z);root.rotation.y=gate.axis==='x'?0:Math.PI/2;const leaves=[];for(const side of[-1,1]){const leaf=new T.Group();leaf.position.x=side*1.3;box(leaf,'#a65836',[-side*.63,.5,0],[1.2,.85,.12]);box(leaf,'#e1b66e',[-side*.63,.5,.08],[1.2,.08,.055]);root.add(leaf);leaves.push(leaf);}this.scenery.add(root);this.gates.push({point:gate,leaves});}
 }
 fillGoods(g,type,n){g.clear();for(let i=0;i<Math.min(n,18);i++){if(type==='fish'){const f=fishModel();f.rotation.y=Math.PI/2;f.position.set(0,.12+Math.floor(i/3)*.16,(i%3-1)*.24);g.add(f);}else if(type==='stone')ell(g,'#a5b7c2',[(i%3-1)*.22,.1+Math.floor(i/3)*.17,0],[.18,.15,.2]);else log(g,[0,.12+Math.floor(i/3)*.15,(i%3-1)*.23],type==='meat');}}
 beforeRender(dt){const e=this.engine,l=e.layout;
 for(let i=0;i<this.fish.length;i++){const f=this.fish[i],a=e.time*.38+i*2.399,rx=2.6,rz=3.1;f.position.set((l.pond.x0+l.pond.x1)/2+Math.sin(a)*rx,.02,(l.pond.z0+l.pond.z1)/2+Math.cos(a)*rz);f.rotation.y=Math.atan2(Math.cos(a)*rx,-Math.sin(a)*rz);f.userData.tail.rotation.y=Math.sin(e.time*9+i)*.24;}
 for(const gate of this.gates){const near=[e.player,...e.hunters,...e.customers].some(a=>distance(a,gate.point)<2.05);gate.leaves.forEach((leaf,i)=>{const target=near?(i?1:-1)*Math.PI*.47:0;leaf.rotation.y+=(target-leaf.rotation.y)*(1-Math.exp(-dt*10));});}
 const fishing=e.hint?.type==='fishing';this.rod.visible=fishing;this.player.userData.axe.visible=!fishing;if(fishing){this.player.userData.arms[1].rotation.x=-.9;this.rod.rotation.x=Math.sin(e.time*5)*.055;}
 const fn=Math.min(18,e.resources.fish);if(fn!==this.fishCount){this.fishCount=fn;this.fillGoods(this.playerFish,'fish',fn);}if(e.fishery.bait!==this.baitCount){this.baitCount=e.fishery.bait;this.fillGoods(this.baitPile,'fish',this.baitCount);}
 const sk=JSON.stringify(e.trade.stock);if(sk!==this.storeKey){this.storeKey=sk;this.storePile.clear();['wood','fish','meat'].forEach((type,i)=>{const g=new T.Group();g.position.set(MARKET.x+(i-1)*.7,.86,MARKET.z);this.fillGoods(g,type,e.trade.stock[type]);this.storePile.add(g);});}
 const ids=new Set();for(const h of e.hunters){ids.add(h.id);let m=this.hunterModels.get(h.id);if(!m){m=this.makeHunterModel?this.makeHunterModel(h):hunterModel();this.scene.add(m);this.hunterModels.set(h.id,m);}this.animateHuman(m,h);if(h.state==='回収戦'&&!h.moving){m.userData.arms[0].rotation.x=-1.1;m.userData.arms[1].rotation.x=-.8-(h.swing||0);}
 if(m.userData.cargoCount!==h.cargo){this.fillGoods(m.userData.cargo,'meat',h.cargo);m.userData.cargoCount=h.cargo;}}
 for(const[id,m]of this.hunterModels)if(!ids.has(id)){this.scene.remove(m);this.hunterModels.delete(id);}
 const cs=new Set();for(const c of e.customers){cs.add(c.id);let m=this.customerModels.get(c.id);if(!m){m=explorer(true,c.id);m.scale.setScalar(.82);m.userData.orderGoods=new T.Group();m.userData.orderGoods.position.set(0,.77,.39);m.add(m.userData.orderGoods);this.scene.add(m);this.customerModels.set(c.id,m);}this.animateHuman(m,c);if(c.carrying&&!m.userData.purchased){this.fillGoods(m.userData.orderGoods,c.carrying.resource,c.carrying.amount);m.userData.purchased=true;}if(c.service>0)m.userData.arms[0].rotation.x=-.8;}
 for(const[id,m]of this.customerModels)if(!cs.has(id)){this.scene.remove(m);this.customerModels.delete(id);}
 const ds=new Set();for(const d of e.fieldDrops){ds.add(d.id);let m=this.dropModels.get(d.id);if(!m){m=new T.Group();this.scene.add(m);this.dropModels.set(d.id,m);}m.position.set(d.x,0,d.z);if(m.userData.amount!==d.amount){this.fillGoods(m,'meat',d.amount);m.userData.amount=d.amount;}}
 for(const[id,m]of this.dropModels)if(!ds.has(id)){this.scene.remove(m);this.dropModels.delete(id);}
 this.arrowGroup.clear();for(const a of e.arrows){const t=Math.min(1,a.age/a.duration),m=box(this.arrowGroup,'#866037',[a.from.x+(a.to.x-a.from.x)*t,a.from.y+(a.to.y-a.from.y)*t+Math.sin(t*Math.PI)*.6,a.from.z+(a.to.z-a.from.z)*t],[.035,.035,.6]);m.lookAt(a.to.x,a.to.y,a.to.z);}
 }
 drawOverlay(){super.drawOverlay();const e=this.engine,p=e.player;for(const h of e.hunters)if(distance(h,p)<9)this.label(h.x,h.z,2.15,`回収員 · ${h.state}`,'#346351dd');const first=e.customers.find(c=>c.state==='waiting');if(first&&distance(first,p)<10)this.label(first.x,first.z,2.1,first.order?`${RESOURCE_NAMES[first.order]}を購入中`:'商品を待っています','#416a84ee');if(distance(e.layout.bait,p)<8)this.label(e.layout.bait.x,e.layout.bait.z,1.5,`誘い餌 · 魚 ${e.fishery.bait}`,'#277b9bdd');}
}
