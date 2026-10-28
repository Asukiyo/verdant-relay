import{UPGRADES,BUILDINGS,RESOURCE_NAMES,BIOMES,clamp,biomeAt}from'./config.js';
import{MONSTERS}from'./defense-engine.js';
import{FACILITIES,MARKET}from'./settlement-engine.js';
import{icon,hydrateIcons}from'./icons.js';

const $=id=>document.getElementById(id);
const number=n=>Math.floor(n).toLocaleString('ja-JP');
const compact=n=>n<1000?String(Math.floor(n)):n<10000?`${(n/1000).toFixed(1)}k`:n<1000000?`${Math.floor(n/1000)}k`:`${(n/1000000).toFixed(1)}m`;
export class GameUI{
 constructor(engine,renderer,audio){
  this.engine=engine;this.renderer=renderer;this.audio=audio;this.panel=$('panel');this.body=$('panel-body');this.panelType=null;this.input=null;this.lastUpdate=0;this.lastMap=0;this.previousQuest='';this.tipDismissed=engine.stats.trees>0;this.lastResources={wood:0,meat:0,stone:0};hydrateIcons();
  for(const [id,key]of [['fishing-button','fishing'],['bait-button','bait']])$(id)?.addEventListener('click',()=>{const p=engine.layout[key];engine.navigateTo(p.x,p.z);this.dismissTip();});
  $('market-button').addEventListener('click',()=>{engine.navigateTo(MARKET.standX,MARKET.standZ);this.toast('売り場で商品を補充します。客が買うと売上が入ります。');});
  $('upgrade-button').addEventListener('click',()=>this.open('upgrades'));$('build-button').addEventListener('click',()=>this.open('buildings'));$('pause-button').addEventListener('click',()=>this.open('pause'));$('help-button').addEventListener('click',()=>this.open('help'));$('map-button').addEventListener('click',()=>this.open('map'));$('close-panel').addEventListener('click',()=>this.close());$('quest-claim').addEventListener('click',()=>{engine.claimQuest();this.refresh(true);});
  $('sound-button').addEventListener('click',()=>{audio.toggle();this.refreshSound();});$('dismiss-tip').addEventListener('click',()=>this.dismissTip());
  $('power-button').addEventListener('click',()=>{audio.unlock();engine.powerAttack();this.refresh(true);});
  engine.on('fever',()=>this.toast('FEVER！ 攻撃スピード＆威力アップ','success'));
  this.panel.addEventListener('cancel',e=>{e.preventDefault();this.close();});this.panel.addEventListener('click',e=>{if(e.target===this.panel){const r=this.panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.close();}});
  this.body.addEventListener('click',e=>this.action(e));
  engine.on('expand',({total,tile})=>{this.toast(`拠点が広がった！　拠点 Lv.${engine.baseLevel}`,'success');const b=biomeAt(tile.x,tile.z);if(b.id!=='meadow'&&![...engine.tiles.values()].filter(t=>t.biome===b.id).slice(1).length)this.toast(`${b.name}を発見`,'success');this.dismissTip();});
  engine.on('upgrade',({id,level})=>this.toast(`${UPGRADES[id].name} が Lv.${level} に！`,'success'));
  engine.on('build',({id})=>this.toast(`${BUILDINGS[id].name}が完成！`,'success'));
  engine.on('quest',({reward})=>this.toast(`目標達成！ ${Object.entries(reward).map(([r,n])=>`${RESOURCE_NAMES[r]} +${n}`).join('  ')}`,'success'));
  engine.on('level',lv=>this.toast(`探索機 Lv.${lv} にアップ！`,'success'));
  engine.on('downed',()=>this.toast('体力切れ。キャンプで回復しました。資源はそのままです。'));
  engine.on('boss',()=>this.toast('遺跡の守護機を倒した！','success'));
  engine.on('heal',()=>this.toast('体力を50回復しました','success'));
  engine.on('save-error',()=>this.toast('自動保存ができません。ブラウザの保存設定をご確認ください。'));
  engine.on('collect',({resource,amount})=>{const el=$(`${resource}-delta`);if(!el)return;el.textContent=`+${amount}`;el.animate?.([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(12px)'}],{duration:650,fill:'forwards'});if(engine.stats.trees>0)this.dismissTip();});
  if(this.tipDismissed)$('first-tip').hidden=true;this.refreshSound();this.refresh(true);
  if(engine.saveProblem)this.toast('保存データを読み込めなかったため、新しい拠点から開始しました。');
 }
 setInput(input){this.input=input;}
 dismissTip(){this.tipDismissed=true;$('first-tip').hidden=true;}
 refreshSound(){const b=$('sound-button');b.innerHTML=icon(this.engine.settings.sound?'sound':'muted');b.setAttribute('aria-label',this.engine.settings.sound?'音をオフにする':'音をオンにする');b.title=b.getAttribute('aria-label');}
 toast(message,type=''){const mobile=globalThis.matchMedia?.('(max-width: 760px), (pointer: coarse)')?.matches;if(mobile&&(type==='success'||/向かいます|移動します|商品を補充|左上から/.test(message)))return;const now=Date.now();if(this.lastToastMessage===message&&now-(this.lastToastAt||0)<6000)return;this.lastToastMessage=message;this.lastToastAt=now;const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;const stack=$('toast-stack');stack.replaceChildren(el);setTimeout(()=>el.remove(),mobile?2400:3200);}

 refresh(force=false){
  const e=this.engine,now=performance.now();if(!force&&now-this.lastUpdate<90)return;this.lastUpdate=now;
  for(const r of['cash','wood','meat','stone','ore']){$(`${r}-count`).textContent=compact(e.resources[r]);$(`${r}-count`).parentElement.parentElement.title=`${RESOURCE_NAMES[r]} ${number(e.resources[r])}`;}
  $('tile-count').textContent=number(e.tiles.size);$('axe-level').textContent=`ビーム Lv.${e.upgrades.axe}`;$('building-count').textContent=`${Object.keys(e.buildings).length} / ${Object.keys(BUILDINGS).length}`;
  $('player-level').textContent=e.level;$('health-text').textContent=`${Math.ceil(e.player.hp)} / ${e.maxHP}`;$('health-fill').style.width=`${clamp(e.player.hp/e.maxHP*100,0,100)}%`;$('health-fill').style.background=e.player.hp<e.maxHP*.3?'#d58962':'#84b857';$('xp-fill').style.width=`${e.xp/e.nextXP*100}%`;
  $('upgrade-dot').hidden=!e.canAfford(e.upgradeCost('axe'));
  $('power-button').disabled=e.powerCooldown>0||e.paused;$('power-label').textContent=e.powerCooldown>0?`${e.powerCooldown.toFixed(1)}秒`:'レーザー掃射';$('power-hint').textContent=e.powerCooldown>0?'撃破で短縮':'SPACE';$('power-button').style.setProperty('--charge',`${(1-e.powerCooldown/7)*360}deg`);
  $('combo-badge').hidden=e.combo<2&&e.fever<=0;$('combo-number').textContent=e.combo;$('combo-label').textContent=e.fever>0?'FEVER!':'連続撃破';$('combo-badge').classList.toggle('fever',e.fever>0);$('combo-timer').style.width=`${Math.max(0,e.fever>0?e.fever/5:(e.comboUntil-e.time)/4)*100}%`;
  const tile=e.tileAt(e.player.x,e.player.z);if(tile)$('biome-label').textContent=biomeAt(tile.x,tile.z).name;$('rank-label').textContent=`拠点 Lv.${e.baseLevel} · ${MONSTERS[e.currentMonster||'bear'].name}`;
  const q=e.getQuest();$('quest-title').textContent=q.title;$('quest-description').textContent=q.description;$('quest-count').textContent=`${number(q.progress)} / ${number(q.goal)}`;$('quest-fill').style.width=`${q.progress/q.goal*100}%`;$('quest-index').textContent=String(q.index+1).padStart(2,'0');$('quest-claim').hidden=!q.complete;
  if(q.complete&&this.previousQuest!==`${q.index}:complete`){this.previousQuest=`${q.index}:complete`;this.toast('目標達成！ 左上から報酬を受け取れます。','success');}
  const hint=$('context-hint');if(e.hint?.type==='cost'){const missing=Object.entries(e.hint.cost).filter(([r,n])=>e.resources[r]<n).map(([r,n])=>`${RESOURCE_NAMES[r]} あと${number(n-e.resources[r])}`).join('・');hint.textContent=missing;hint.hidden=false;this.dismissTip();}else if(e.hint?.type==='expanding'){hint.textContent='建設中… そのまま1秒待とう';hint.hidden=false;this.dismissTip();}else if(e.hint?.type==='trade'){hint.textContent='商品を納品中 · 客が順番に購入します';hint.hidden=false;}else if(e.hint?.type==='base-level'){hint.textContent=`拠点 Lv.${e.hint.level}で建設できます`;hint.hidden=false;}else if(e.hint?.type==='fishing'){hint.textContent='釣り中… 魚を自動で集めています';hint.hidden=false;}else if(e.hint?.type==='bait'){hint.textContent=`魚を配置中 · 誘い餌 ${e.fishery.bait}/18`;hint.hidden=false;}else if(e.hint?.type==='upgrading'){hint.textContent=`${e.hint.name}… そのまま1秒待とう`;hint.hidden=false;}else if(e.hint?.type==='upgrade-done'){hint.textContent='強化完了！ 離れて入り直すと、次の強化ができます';hint.hidden=false;}else hint.hidden=true;
  if(now-this.lastMap>240||force){this.renderer.drawMap($('minimap'));if(this.panelType==='map'&&$('large-map'))this.renderer.drawMap($('large-map'),true);this.lastMap=now;}
 }
 open(type){if(type==='upgrades'&&this.engine.upgradeSpots){if(this.panel.open)this.close();this.input?.clear();const p=this.engine.upgradeSpots.axe;this.engine.navigateTo(p.x,p.z);this.toast('工房へ向かいます。強化したいマークで1秒待機。');return;}this.panelType=type;this.engine.paused=true;this.input?.clear();this.renderPanel();if(!this.panel.open)this.panel.showModal();this.audio.unlock();}
 close(){this.panel.close();this.panelType=null;this.engine.paused=document.hidden;this.input?.clear();this.engine.save();}
 costs(cost){return`<span class="cost">${Object.entries(cost).map(([r,n])=>`<span class="${this.engine.resources[r]<n?'short':''}">${icon(r)}${number(n)}</span>`).join('')}</span>`;}
 renderPanel(){
  const e=this.engine,type=this.panelType;const names={upgrades:['EQUIPMENT','道具を育てよう'],buildings:['YOUR OUTPOST','小さな拠点をつくろう'],pause:['TAKE A BREATH','ひと休み'],help:['HOW TO PLAY','遺跡の探索方法'],map:['YOUR FRONTIER','開拓マップ'],reset:['NEW ADVENTURE','最初からはじめますか？']};
  $('panel-eyebrow').textContent=names[type][0];$('panel-title').textContent=names[type][1];
  const active=document.activeElement?.dataset?.id,action=document.activeElement?.dataset?.action,scroll=this.panel.scrollTop;
  if(type==='upgrades'){
   this.body.innerHTML=`<p class="panel-note">合金やコアを売ったお金で道具を強化。強いビームなら、大型の残骸も大きなウォーカーも。</p><div class="upgrade-list">${Object.entries(UPGRADES).map(([id,d])=>{const lv=e.upgrades[id],cost=e.upgradeCost(id),capped=lv>=100;return`<div class="upgrade-row"><div class="item-icon">${icon(d.icon)}</div><div><h3>${d.name}<small>Lv.${lv}</small></h3><p>${d.format(lv)}</p></div><button class="buy-button" data-action="upgrade" data-id="${id}" ${!e.canAfford(cost)||capped?'disabled':''} aria-label="${d.name}を強化">${capped?'最大レベル':'強化する'}${!capped?this.costs(cost):''}</button></div>`;}).join('')}<div class="upgrade-row"><div class="item-icon">${icon('heart')}</div><div><h3>食料でひと休み</h3><p>体力を50回復する</p></div><button class="buy-button" data-action="heal" ${e.player.hp>=e.maxHP||!e.canAfford({meat:3})?'disabled':''}>回復する${this.costs({meat:3})}</button></div></div><div class="panel-footer">${icon('save')}この端末に自動保存されます。</div>`;
  }else if(type==='buildings'){
   this.body.innerHTML=`<p class="panel-note">回収員は魚に集まる機械生物を狩り、コアを回収します。詰所で1人追加。タワーを建てると、コアをトロッコで売り場へ運びます。</p><div class="upgrade-list">${Object.entries(BUILDINGS).map(([id,d])=>{const owned=!!e.buildings[id],f=FACILITIES[id];return `<div class="upgrade-row"><div class="item-icon">${icon(d.icon)}</div><div><h3>${d.name}</h3><p>${d.description}</p><p>拠点 Lv.${f.level}・お金 ${f.cost}</p></div>${owned?'<span class="owned-badge">建設済み</span>':`<button class="buy-button" data-action="build" data-id="${id}">場所へ移動</button>`}</div>`;}).join('')}</div>`;
  }else if(type==='pause'){
   this.body.innerHTML=`<div class="stats-grid"><div class="stat"><strong>${number(e.stats.trees)}</strong><span>解体した残骸</span></div><div class="stat"><strong>${number(e.stats.bears)}</strong><span>倒した機械生物</span></div><div class="stat"><strong>${number(e.tiles.size)}</strong><span>ひらいた区画</span></div></div><div class="pause-actions"><button class="large-button" data-action="resume">${icon('play')}開拓をつづける</button><button class="large-button secondary" data-action="heal" ${e.player.hp>=e.maxHP||e.resources.meat<3?'disabled':''}>コア3個で体力を50回復</button><button class="large-button secondary" data-action="help">${icon('compass')}遊び方を見る</button><button class="large-button secondary" data-action="sound">${icon(e.settings.sound?'sound':'muted')}音を${e.settings.sound?'オフ':'オン'}にする</button><button class="text-button" data-action="reset-prompt">進行状況をリセット</button></div><div class="panel-footer">${icon('save')}${e.saveProblem?'自動保存に問題があります。':'進行状況は、この端末・ブラウザに自動保存されます。'}</div>`;
  }else if(type==='help'){
   this.body.innerHTML=`<p class="panel-note">魚を獲る → 機械生物を誘う → 狩って運ぶ → 行列の客に売る。</p><div class="help-grid"><div class="help-item"><span>${icon('fish')}</span><h3>01　魚を獲る・誘う</h3><p>「釣り場へ」で桟橋へ移動。マークに立つと自動で釣ります。「魚を置く」で川岸の誘い餌を補充すると、機械生物が集まります。</p></div><div class="help-item"><span>${icon('axe')}</span><h3>02　回収員と協力する</h3><p>回収員が機械生物を追い、コアを拾って運びます。最初から1人が参加し、詰所で1人追加できます。自分でも近づいて攻撃、レーザー掃射でまとめて回収戦。</p></div><div class="help-item"><span>${icon('cash')}</span><h3>03　客に商品を売る</h3><p>売り場のマークに立って商品を補充。先頭の客から購入し、商品を持って帰ります。魚は3、コアは6、合金は2。トロッコのコアも売り場の在庫に届きます。</p></div><div class="help-item"><span>${icon('home')}</span><h3>04　拠点内で強化</h3><p>工房のビーム・足・範囲・体力の各マークで1秒待機して強化。1回強化したら離れて入り直してください。壁は通れないので、門から出入りします。</p></div></div><p class="panel-note">WASD・矢印キー・ドラッグで移動、クリックで目的地へ。Spaceでレーザー掃射、Bで工房へ、Mで地図、Hでコア3個を使って回復、Escで一時停止。拠点Lv.3でスキッター、Lv.5でドリルビートル、Lv.7でコアガーディアンが登場します。</p><button class="large-button" data-action="resume" style="width:100%">${icon('play')}拠点へ戻る</button>`;
  }else if(type==='map'){
   this.body.innerHTML=`<p class="panel-note">${number(e.tiles.size)}区画の拠点。お金で床と柵を広げよう。</p><canvas id="large-map" class="world-map" width="1000" height="600" aria-label="拠点の土地と未開拓の境界"></canvas><div class="map-legend"><span><i></i>拠点</span><span><i></i>拡張エリア</span><span><i></i>現在地</span></div><div class="biome-list">${BIOMES.map(b=>`<span>${b.name} ${[...e.tiles.values()].some(t=>t.biome===b.id)?'✓':'未踏'}</span>`).join('')}</div><button class="large-button secondary" data-action="home" style="width:100%;margin-top:18px">${icon('tent')}はじまりの拠点へ歩く</button>`;this.renderer.drawMap($('large-map'),true);
  }else if(type==='reset'){
   this.body.innerHTML=`<p class="panel-note">この端末に保存されている拠点・資源・装備の進行状況を削除して、新しい拠点を始めます。この操作は元に戻せません。</p><div class="pause-actions"><button class="large-button" data-action="resume">開拓をつづける</button><button class="large-button secondary" data-action="reset-confirm">進行状況を削除してはじめる</button></div>`;
  }
  this.panel.scrollTop=type==='reset'?0:scroll;if(active){this.body.querySelector(`[data-action="${action}"][data-id="${active}"]`)?.focus({preventScroll:true});}
 }
 action(event){
  const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;const action=button.dataset.action,id=button.dataset.id,e=this.engine;
  if(action==='upgrade'){const result=e.upgrade(id);if(!result.ok)this.toast('強化に必要な資源が足りません。');this.renderPanel();}
  else if(action==='build'){this.close();const d=BUILDINGS[id];e.navigateTo(d.x,d.z);this.toast('建設マークに向かいます。お金があれば1秒で完成。');}
  else if(action==='heal'){e.heal();this.renderPanel();}
  else if(action==='resume')this.close();
  else if(action==='sound'){this.audio.toggle();this.refreshSound();this.renderPanel();}
  else if(action==='help')this.open('help');
  else if(action==='home'){this.close();e.navigateTo(-.8,1.5);this.toast('拠点へ向かいます。移動操作で中断できます。');}
  else if(action==='reset-prompt')this.open('reset');
  else if(action==='reset-confirm'){const result=e.reset();if(result?.ok!==false)location.reload();return;}
  this.refresh(true);
 }
 key(k,event){
  if(k===' '&&!this.panel.open){event.preventDefault();this.audio.unlock();this.engine.powerAttack();}
  else if(k==='escape'){event.preventDefault();if(this.panel.open)this.close();else this.open('pause');}
  else if(k==='b'){event.preventDefault();if(this.panelType==='upgrades')this.close();else this.open('upgrades');}
  else if(k==='m'){event.preventDefault();if(this.panelType==='map')this.close();else this.open('map');}
  else if(k==='h'&&!this.panel.open){event.preventDefault();const r=this.engine.heal();if(!r.ok)this.toast(r.reason==='full_health'?'体力は満タンです。':'回復には食料3個が必要です。');}
 }
}
