import {SnowRenderer} from './snow-renderer.js';
import {TILE_SIZE,BUILDINGS,key,distance} from './config.js';
import {MARKET,FACILITIES} from './settlement-engine.js';
export class SettlementRenderer extends SnowRenderer {
 drawWater(){const c=this.ctx,g=c.createLinearGradient(0,0,this.width,this.height);g.addColorStop(0,'#c4def0');g.addColorStop(1,'#f0faff');c.fillStyle=g;c.fillRect(0,0,this.width,this.height);}
 drawLand(){const r=TILE_SIZE/2;for(const t of this.engine.tiles.values()){const x=t.x*TILE_SIZE,z=t.z*TILE_SIZE;this.worldPoly([[x-r,0,z-r],[x+r,0,z-r],[x+r,0,z+r],[x-r,0,z+r]],'#cda879');for(let a=-r;a<r;a+=.8)this.worldPoly([[x+a,.005,z-r],[x+a+.025,.005,z-r],[x+a+.025,.005,z+r],[x+a,.005,z+r]],'#be986c44');}
  for(const m of this.engine.interactionMarkers().filter(m=>m.kind))this.drawGateBase(m);
 }
 sceneObjects(){const out=[{type:'settlement',kind:'market',x:MARKET.x,z:MARKET.z}];const b=this.engine.bounds(),T=TILE_SIZE,r=T/2,cx=(b.minX+b.maxX)*T/2,cz=(b.minZ+b.maxZ)*T/2;
  for(let x=b.minX*T-r;x<=b.maxX*T+r;x+=.48)for(const z of[b.minZ*T-r,b.maxZ*T+r])if(Math.abs(x-cx)>1.4)out.push({type:'settlement',kind:'fence',x,z});
  for(let z=b.minZ*T-r;z<=b.maxZ*T+r;z+=.48)for(const x of[b.minX*T-r,b.maxX*T+r])if(Math.abs(z-cz)>1.4)out.push({type:'settlement',kind:'fence',x,z});
  for(let i=0;i<4;i++)out.push({type:'settlement',kind:'buyer',x:MARKET.x+1.7+i*.75,z:MARKET.z-.25+i*.62,index:i});return out;
 }
 drawSceneObject(o){const c=this.ctx,s=this.scale,p=this.project(o.x,0,o.z);if(!this.visible(o.x,o.z))return;
  if(o.kind==='fence'){const g=c.createLinearGradient(p.x-5,p.y,p.x+5,p.y);g.addColorStop(0,'#ad713a');g.addColorStop(.5,'#e7b566');g.addColorStop(1,'#c78d49');this.polygon([{x:p.x-s*.16,y:p.y},{x:p.x-s*.16,y:p.y-s*.85},{x:p.x,y:p.y-s*1.05},{x:p.x+s*.16,y:p.y-s*.85},{x:p.x+s*.16,y:p.y}],g,'#a77847',.6);return;}
  if(o.kind==='buyer'){const bob=Math.sin(this.engine.time*2+o.index)*s*.015;this.shadow(o.x,o.z,.3,.15);for(const dx of[-.12,.12])this.orb(p.x+dx*s,p.y,.13*s,.09*s,'#46392e','#272d33');this.orb(p.x,p.y-s*.46+bob,.24*s,.37*s,o.index%2?'#ab7160':'#c18465','#744f44');this.orb(p.x,p.y-s*.9+bob,.23*s,.25*s,'#db795b','#954e40');this.orb(p.x-s*.08,p.y-s*.87+bob,.14*s,.17*s,'#eac7a9','#b58f77');if(o.index===0&&this.engine.time-this.engine.lastSale<.7)this.label(o.x,o.z,1.7,'✓','#388d59');return;}
  this.shadow(o.x,o.z,1.5,.5);for(const dx of[-.85,.85])for(const dz of[-.32,.32]){const a=this.project(o.x+dx,0,o.z+dz),b=this.project(o.x+dx,.78,o.z+dz);c.strokeStyle='#795032';c.lineWidth=s*.12;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}this.worldPoly([[o.x-1.2,.8,o.z-.55],[o.x+1.2,.8,o.z-.55],[o.x+1.2,.8,o.z+.55],[o.x-1.2,.8,o.z+.55]],'#ecc48c','#906842',2);
  for(let i=0;i<4;i++)this.log(p.x-s*.55,p.y-s*(.85+i*.12),s*.65,s*.14,-.25);for(let i=0;i<5;i++)this.log(p.x+s*.12,p.y-s*(.9+i*.105),s*.36,s*.12,.2,true);
  const n=Math.min(32,Math.floor(this.engine.resources.cash/10));for(let i=0;i<n;i++){const q=this.project(o.x+1.1,.13+i*.095,o.z+.5);c.fillStyle=i%2?'#72db42':'#94ed5b';c.strokeStyle='#35922f';c.lineWidth=.7;c.beginPath();c.roundRect(q.x-s*.33,q.y-s*.12,s*.66,s*.24,2);c.fill();c.stroke();if(i===n-1){c.fillStyle='#f0ffd8';c.font=`bold ${s*.23}px system-ui`;c.textAlign='center';c.fillText('$',q.x,q.y+s*.07);}}
  this.label(o.x,o.z,2,'TRADING POST','#6c4c36');
 }
 label(x,z,h,text,bg){const p=this.project(x,h,z),c=this.ctx;c.save();c.font=`800 ${this.width<650?11:12}px system-ui`;const w=c.measureText(text).width+18;c.fillStyle=bg;c.beginPath();c.roundRect(p.x-w/2,p.y-12,w,24,8);c.fill();c.fillStyle='#fff';c.textAlign='center';c.fillText(text,p.x,p.y+4);c.restore();}
 drawGateBase(f){const e=this.engine,c=this.ctx,market=f.kind==='market',cost=f.kind==='facility'?FACILITIES[f.key].cost:e.expansionCost().cash;const r=market?.78:.66;this.worldPoly([[f.x-r,.02,f.z-r],[f.x+r,.02,f.z-r],[f.x+r,.02,f.z+r],[f.x-r,.02,f.z+r]],market?'#70c78b88':'#896b4944',market?'#dcffe5':'#fff4de',2);
  const p=this.project(f.x,.04,f.z);c.save();c.fillStyle='#fff';c.textAlign='center';c.font='900 15px system-ui';c.fillText(market?'売却':`$ ${cost}`,p.x,p.y+5);c.restore();if(e.unlocking?.key===f.key)this.ring(f.x,f.z,.8,'#b6ff8b',3+e.unlocking.progress*4);
 }
 drawGateLabel(f){this.label(f.x,f.z,1.4,f.name,'#82633eee');}
 drawEffects(){super.drawEffects();const near=this.engine.interactionMarkers().filter(m=>m.kind&&distance(m,this.engine.player)<4).sort((a,b)=>distance(a,this.engine.player)-distance(b,this.engine.player))[0];if(near)this.label(near.x,near.z,near.kind==='market'?.7:1.3,near.kind==='market'?'合金 $2 · コア $6':`${near.name} · Lv.${FACILITIES[near.key].level}`,'#346b59ee');}
 drawExplorer(p,worker=false){super.drawExplorer(p,worker);if(worker)return;const s=this.scale,c=this.ctx,bob=p.moving?Math.abs(Math.sin(p.walk))*.07:0,spin=p.spin>0?(1-p.spin/.55)*Math.PI*3.4:0,actor={...p,angle:p.angle+spin};const h=this.local(actor,0,1.35+bob,.06);const front=Math.sin(actor.angle)+Math.cos(actor.angle)>-.5;
  this.orb(h.x,h.y,.35*s,.37*s,'#48b7ec','#116aa4',0,'#225171');
  if(front){for(let i=0;i<13;i++){const a=i*Math.PI*2/13;this.orb(h.x+Math.cos(a)*s*.27,h.y+Math.sin(a)*s*.29,s*.09,s*.095,'#fffce6','#d5d7c8');}this.orb(h.x,h.y+s*.015,s*.205,s*.245,'#ecc89f','#ac886e');c.fillStyle='#253e50';c.beginPath();c.roundRect(h.x-s*.2,h.y-s*.09,s*.4,s*.12,3);c.fill();c.fillStyle='#a3e9f4';c.beginPath();c.roundRect(h.x-s*.16,h.y-s*.075,s*.13,s*.07,2);c.roundRect(h.x+s*.03,h.y-s*.075,s*.13,s*.07,2);c.fill();this.orb(h.x,h.y+s*.16,s*.2,s*.115,'#f5efe1','#c9d5d5');}
  const b=this.local(actor,0,.86+bob,.25);c.strokeStyle='#cfaa54';c.lineWidth=s*.065;c.beginPath();c.moveTo(b.x-s*.23,b.y-s*.2);c.lineTo(b.x-s*.16,b.y+s*.23);c.moveTo(b.x+s*.23,b.y-s*.2);c.lineTo(b.x+s*.16,b.y+s*.23);c.stroke();c.fillStyle='#f3d482';c.fillRect(b.x-s*.07,b.y+s*.13,s*.14,s*.1);
 }
}
