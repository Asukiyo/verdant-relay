import * as T from '../vendor/three.module.min.js';
import {box,ell,cyl,mat,facility} from './models-3d.js';
import {hunterModel} from './camp-models.js';
import {SOLDIER_TYPES} from './growth-content.js';
export function soldierModel(kind){const g=hunterModel(),d=SOLDIER_TYPES[kind];g.traverse(o=>{if(o.isMesh&&['a85942','ba7151'].includes(o.material.color.getHexString()))o.material=mat(d.color);});g.userData.soldierKind=kind;if(['guard','miner'].includes(kind)){g.userData.bow.visible=false;g.userData.axe.visible=true;}
 if(kind==='guard'){const shield=cyl(g,'#6c859b',[-.48,.9,.25],[.3,.09,.3]);shield.rotation.x=Math.PI/2;box(g,'#d4bf77',[-.48,.9,.31],[.075,.46,.035]);ell(g,'#8196aa',[0,1.72,-.04],[.29,.13,.26]);}
 if(kind==='scout'){const feather=box(g,'#bad67c',[.15,1.91,-.05],[.06,.4,.07]);feather.rotation.z=-.3;}
 if(kind==='miner'){ell(g,'#dfb44c',[0,1.76,-.02],[.32,.15,.3]);ell(g,'#fff1b0',[0,1.73,.28],[.09,.07,.06]);}
 return g;
}
export function goldOre(g,p=[0,0,0]){return ell(g,'#e6b744',p,[.19,.16,.22]);}
export function goldMine(){const g=new T.Group();box(g,'#324c58',[0,.15,0],[1.9,.3,1.6]);for(const x of[-.7,.7])box(g,'#7496a2',[x,.9,0],[.22,1.6,.3]);box(g,'#a9bcc1',[0,1.65,0],[1.8,.25,.5]);cyl(g,'#d6b25f',[0,.83,0],[.24,1.35,.24]);for(let i=0;i<5;i++)cyl(g,'#46616b',[0,.3+i*.24,0],[.35,.08,.35]);box(g,'#86f3d3',[.72,1,.18],[.07,.65,.05]);for(let i=0;i<4;i++)goldOre(g,[(i%2-.5)*.4,.32+Math.floor(i/2)*.2,.62]);return g;}
export function barracks(){const g=facility('sawmill');g.scale.set(1.25,1.15,1.2);cyl(g,'#5b7b8d',[.6,1.8,-.3],[.04,.9,.04]);ell(g,'#8aefd7',[.6,2.28,-.3],[.12,.12,.12]);box(g,'#9ac2d1',[0,1.6,0],[1.1,.25,.7]);return g;}
