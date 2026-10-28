import {BeamEngine} from './beam-engine.js';
import {distance} from './config.js';
export const RESEARCH={recycling:{x:-8,z:.9,name:'リサイクル増産',description:'自動リサイクル施設の生産量 +3 / 8秒',level:2},output:{x:-6.2,z:.9,name:'ビーム出力研究',description:'プレイヤーのビーム威力 +15%',level:3},charge:{x:-4.4,z:.9,name:'充填効率研究',description:'レーザーの自然充填速度 +15%',level:3}};
export class SalvageEngine extends BeamEngine{
 constructor(o={}){super(o);this.research ||= {recycling:0,output:0,charge:0};}
 get reservedServicePads(){return Object.values(RESEARCH);}
 get attack(){return super.attack*(1+(this.research?.output||0)*.15);}
 get energyRecharge(){return 7*(1+(this.research?.charge||0)*.15);}
 buildingYield(id,base){return id==='sawmill'?{wood:3*(1+(this.research?.recycling||0))}:base;}
 interactionMarkers(){const list=super.interactionMarkers();for(const[id,d]of Object.entries(RESEARCH)){const lv=this.research?.[id]||0;if(lv>=10)continue;list.push({...d,key:'research-'+id,kind:'research',research:id,name:d.name+' Lv.'+(lv+1),cost:80+lv*60,alloy:20+lv*15,requiredLevel:d.level});}return list;}
 markerText(m){return m.kind==='research'?`${m.name} · 合金${m.alloy} / $${m.cost}`:super.markerText(m);}
 purchaseMarker(m){if(m.kind!=='research')return super.purchaseMarker(m);const current=this.interactionMarkers().find(p=>p.key===m.key);if(!current||this.resources.wood<current.alloy||(m.research==='recycling'&&!this.buildings.sawmill))return{ok:false};const result=super.purchaseMarker(current);if(result.ok){this.resources.wood-=current.alloy;this.research[m.research]++;this.save();}return result;}
 updateExpansion(dt){const m=this.interactionMarkers().find(p=>p.kind==='research'&&distance(p,this.player)<.75);if(m){if(m.research==='recycling'&&!this.buildings.sawmill){this.unlocking=null;this.hint={type:'research-building'};return;}if(this.resources.wood<m.alloy){this.unlocking=null;this.hint={type:'cost',cost:{cash:m.cost,wood:m.alloy}};return;}}super.updateExpansion(dt);}
 serialize(){return{...super.serialize(),research:{...this.research}};}
 restore(d){super.restore(d);this.research=Object.fromEntries(Object.keys(RESEARCH).map(k=>[k,Number.isFinite(d.research?.[k])?Math.max(0,Math.min(10,Math.floor(d.research[k]))):0]));}
}
