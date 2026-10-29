import * as T from '../vendor/three.module.min.js';
import {SPRITES} from './sprite-manifest.js';

export const MACHINE_NAMES={scout:'スキッター',armor:'ドリルビートル',artillery:'シージウォーカー',guardian:'コアガーディアン'};
const HEIGHT={scout:1.75,armor:2.05,artillery:2.8,guardian:3};
const atlases=new Map();
let loading;

/** Load only project-local image files; combat and saves do not depend on these assets. */
export function preloadEnemySprites(){
 if(loading)return loading;
 const loader=new T.TextureLoader();
 loading=Promise.all(Object.entries(SPRITES).map(([kind,d])=>new Promise((resolve,reject)=>{
  loader.load(new URL('../assets/enemies/'+d.file,import.meta.url).href,texture=>{
   texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;
   atlases.set(kind,texture);resolve();
  },undefined,()=>reject(new Error('enemy-sprite-load')));
 }))).catch(error=>{loading=null;throw error;});
 return loading;
}

export const spriteDirection=angle=>((Math.round((angle||0)/(Math.PI/2))%4)+4)%4;
export function spritePose(attack){
 if(!attack)return 0;
 if(attack.elapsed<attack.windup)return attack.elapsed<attack.windup*.15?0:1;
 if(attack.elapsed<attack.windup+attack.active)return 2;
 return attack.elapsed<attack.windup+attack.active+attack.recovery*.65?2:0;
}
export function spriteFrame(kind,direction,pose){
 const d=SPRITES[kind],index=pose*4+direction,[x,y,w,h]=d.frames[index],base=d.frames[direction][3];
 const mirror=kind==='scout'&&direction===0;
 return {index,repeat:[(mirror?-w:w)/d.width,h/d.height],offset:[(mirror?x+w:x)/d.width,1-(y+h)/d.height],width:w/base*HEIGHT[kind],height:h/base*HEIGHT[kind]};
}

const shadowSize=32,shadowData=new Uint8Array(shadowSize*shadowSize*4);
for(let y=0;y<shadowSize;y++)for(let x=0;x<shadowSize;x++){
 const r=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5),i=(y*shadowSize+x)*4;
 shadowData[i+3]=Math.max(0,1-r)**2*90;
}
const shadowMap=new T.DataTexture(shadowData,shadowSize,shadowSize,T.RGBAFormat);shadowMap.needsUpdate=true;
const shadowGeometry=new T.PlaneGeometry(1,1);
const shadowMaterial=new T.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,toneMapped:false});

function applyFrame(sprite,frame){
 sprite.material.map.repeat.set(...frame.repeat);sprite.material.map.offset.set(...frame.offset);
 sprite.scale.set(frame.width,frame.height,1);sprite.userData.frame=frame.index;
}

/** Each actor uses two billboards for short pose crossfades and one ground shadow. */
export function enemyModel(kind,texture=atlases.get(kind)){
 if(!texture||!SPRITES[kind])throw new Error('Enemy sprite not loaded: '+kind);
 const root=new T.Group(),sprites=[];
 for(let i=0;i<2;i++){
  const map=texture.clone();map.needsUpdate=true;
  const sprite=new T.Sprite(new T.SpriteMaterial({map,transparent:true,alphaTest:.06,depthWrite:false,toneMapped:false}));
  sprite.center.set(.5,0);root.add(sprite);sprites.push(sprite);applyFrame(sprite,spriteFrame(kind,0,0));
 }
 sprites[1].visible=false;
 const shadow=new T.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.035;
 shadow.scale.set(kind==='armor'?2.8:kind==='guardian'?2.1:1.8,kind==='armor'?2:1.25,1);root.add(shadow);
 root.userData={kind,legs:[],sprite:sprites[0],ghost:sprites[1],shadow,frame:0,changedAt:-1};
 return root;
}

export function animateEnemy(model,e,time){
 const u=model.userData;if(!u.sprite)return;
 const direction=spriteDirection(e.angle),pose=spritePose(e.enemyAttack),frame=spriteFrame(e.machineKind,direction,pose);
 if(frame.index!==u.frame){
  const old=u.sprite.userData.frame;applyFrame(u.ghost,spriteFrame(e.machineKind,old%4,Math.floor(old/4)));
  applyFrame(u.sprite,frame);u.frame=frame.index;u.changedAt=time;
 }
 const fade=Math.max(0,Math.min(1,(time-u.changedAt)/.09)),moving=!e.enemyAttack&&(e.moving||e.dash||e.aggro);
 const bob=moving?Math.abs(Math.sin(e.walk||0))*.045:Math.sin(time*2+(e.seed||0)*6)*.008;
 model.rotation.set(0,e.angle||0,0);
 u.sprite.position.set(0,bob,0);u.ghost.position.copy(u.sprite.position);
 const a=e.enemyAttack;
 if(a){
  const progress=Math.max(0,Math.min(1,(a.elapsed-a.windup)/a.active));
  if(a.move==='slash'||a.move==='drill')u.sprite.position.z=Math.sin(progress*Math.PI)*.25;
  if(a.move==='shell')u.sprite.position.z=-Math.sin(progress*Math.PI)*.18;
 }
 const death=e.dead?Math.max(0,1-(e.fall||0)/.65):0,opacity=1-death;
 u.sprite.material.opacity=fade*opacity;u.ghost.material.opacity=(1-fade)*opacity;u.ghost.visible=fade<1&&opacity>0;
 const lean=e.dash?-.1:0;u.sprite.material.rotation=lean+death*1.15;u.ghost.material.rotation=u.sprite.material.rotation;
 u.sprite.material.color.set(e.hit>0?'#ffb7a4':'#ffffff');u.shadow.visible=death<.7;
}

export function disposeEnemyModel(model){
 for(const sprite of [model.userData.sprite,model.userData.ghost])if(sprite){sprite.material.map.dispose();sprite.material.dispose();}
}
