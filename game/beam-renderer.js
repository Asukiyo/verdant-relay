import * as T from '../vendor/three.module.min.js';
import {GrowthRenderer} from './growth-renderer.js';
import {RESEARCH} from './salvage-engine.js';
import {box,mat} from './models-3d.js';
export class BeamRenderer extends GrowthRenderer{
 constructor(c,e,o={}){super(c,e,o);this.rays=new T.Group();this.scene.add(this.rays);this.rayPool=[];const gun=new T.Group();box(gun,'#3e6678',[.4,1,.38],[.28,.3,.6]);box(gun,'#8cffe3',[.4,1,.72],[.17,.17,.08]);this.player.add(gun);this.player.userData.axe.visible=false;for(const p of Object.values(RESEARCH)){box(this.scene,'#33566b',[p.x,.15,p.z-.55],[.6,.3,.3]);box(this.scene,'#79f8ce',[p.x,.33,p.z-.55],[.45,.06,.23]);}}
 beforeRender(dt){super.beforeRender(dt);this.slash.visible=false;this.player.userData.axe.visible=false;this.player.userData.arms[1].rotation.x=-.8;const beams=this.engine.beams||[];for(let i=0;i<beams.length;i++){let m=this.rayPool[i];if(!m){m=new T.Mesh(new T.CylinderGeometry(1,1,1,8),new T.MeshBasicMaterial({color:'#8bfff1',transparent:true,opacity:.85,depthWrite:false}));this.rays.add(m);this.rayPool.push(m);}const b=beams[i],a=new T.Vector3(b.from.x,1.03,b.from.z),z=new T.Vector3(b.to.x,1.03,b.to.z),d=z.clone().sub(a);m.visible=true;m.position.copy(a.add(z).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize());const r=b.strong?.22:.045;m.scale.set(r,d.length(),r);m.material.color.set(b.strong?'#f0ffab':'#7dffe2');}for(let i=beams.length;i<this.rayPool.length;i++)this.rayPool[i].visible=false;}
}
