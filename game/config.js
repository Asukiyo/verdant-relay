/** Content registry. Add biomes, actors, upgrades and buildings here without changing the simulation. */
export const VERSION=1;
export const SAVE_KEY='timber-frontier:save:v1';
export const TILE_SIZE=6.4;
export const ACTORS={
 tree:{kind:'resource',baseHp:3,hpPerDistance:.45,respawn:27,resource:'wood',yield:4,xp:3},
 rock:{kind:'resource',baseHp:3,hpPerDistance:.55,respawn:38,resource:'stone',yield:3,xp:4},
 bear:{kind:'enemy',baseHp:7,respawn:55,resource:'meat',yield:4,xp:10,speed:1.55,aggroRadius:3.6,leashRadius:8.5,attackDelay:1.65,windup:.43,damage:7},
 boss:{kind:'enemy',baseHp:25,respawn:55,resource:'meat',yield:12,xp:40,speed:1.55,aggroRadius:3.6,leashRadius:8.5,attackDelay:1.9,windup:.43,damage:18}
};
export const BIOMES=[
 {id:'meadow',name:'はじまりの緑の遺跡',minDistance:0,grass:'#cde6f5',side:'#d5b574',dark:'#b48c55',tree:'#3d9753',leaf:'#68b55e',woodMultiplier:1,bearMultiplier:1},
 {id:'pine',name:'旧工業区',minDistance:3,grass:'#a9cce6',side:'#bead75',dark:'#918852',tree:'#2e7455',leaf:'#498e61',woodMultiplier:1.5,bearMultiplier:1.4},
 {id:'autumn',name:'放棄された飛行場',minDistance:6,grass:'#c3c8dd',side:'#bd9d68',dark:'#9c7e4f',tree:'#c7753d',leaf:'#eba54a',woodMultiplier:2,bearMultiplier:2},
 {id:'snow',name:'中央機械廃墟',minDistance:10,grass:'#d9e6dc',side:'#aebbb5',dark:'#889c95',tree:'#5f9190',leaf:'#e6f0e6',woodMultiplier:3,bearMultiplier:3}
];
export const UPGRADES={
 axe:{name:'開拓のビーム',icon:'axe',description:'解体と攻撃のダメージ',base:1,step:1,cost:lv=>({wood:Math.round(12*Math.pow(1.62,lv-1)),...(lv>=3?{stone:(lv-2)*5}:{})}),format:lv=>`${lv*2} → ${(lv+1)*2} ダメージ`},
 boots:{name:'旅人のブーツ',icon:'boots',description:'移動速度がアップ',base:3.4,step:0.22,cost:lv=>({wood:Math.round(20*Math.pow(1.5,lv-1)),meat:Math.round(3*Math.pow(1.4,lv-1))}),format:lv=>`移動速度 +${Math.round(100*.22/(3.4+(lv-1)*.22))}%`},
 vitality:{name:'丈夫な装備',icon:'heart',description:'最大体力がアップ',base:100,step:25,cost:lv=>({wood:Math.round(18*Math.pow(1.5,lv-1)),meat:Math.round(5*Math.pow(1.5,lv-1))}),format:lv=>`最大体力 +25`},
 reach:{name:'照射範囲',icon:'swing',description:'範囲内の敵と残骸をまとめて攻撃',base:1.5,step:.2,cost:lv=>({wood:Math.round(32*Math.pow(1.6,lv-1)),meat:Math.round(5*Math.pow(1.6,lv-1))}),format:lv=>`攻撃範囲 +0.2 / 巻き込み +1`}
};
export const BUILDINGS={
 sawmill:{name:'自動リサイクル施設',icon:'wood',description:'残骸を自動で再資源化。8秒ごとに合金 +3。',cost:{wood:35,meat:3},requiredTiles:5,interval:8,yield:{wood:3},x:-6.6,z:6.2},
 quarry:{name:'採石場',icon:'stone',description:'12秒ごとに石材 +2。硬い岩も資源に。',cost:{wood:65,meat:8},requiredTiles:7,interval:12,yield:{stone:2},x:-8,z:8},
 watchtower:{name:'見張り台',icon:'tower',description:'あなたの近くのウォーカーを、弓兵が援護。',cost:{wood:90,stone:18},requiredTiles:9,interval:2,yield:{},x:1.9,z:7.7},
 camp:{name:'休憩キャンプ',icon:'tent',description:'非戦闘時の回復速度が3倍になる。',cost:{wood:50,meat:15},requiredTiles:6,interval:1,yield:{},x:1.8,z:1.4}
};
export const QUESTS=[
 {title:'合金を10個集めよう',description:'残骸に近づくと、自動で解体。',stat:'woodCollected',goal:10,reward:{wood:5}},
 {title:'新しい土地をひらこう',description:'境界の白い看板へ。合金を12個納めよう。',stat:'expanded',goal:1,reward:{wood:8}},
 {title:'ウォーカーを1頭倒そう',description:'ウォーカーに近づくと自動照射。体力に注意。',stat:'bears',goal:1,reward:{meat:3,wood:5}},
 {title:'ビームをレベル2にしよう',description:'「装備を強化」から、開拓のビームを強化。',upgrade:'axe',goal:2,reward:{wood:10}},
 {title:'自動リサイクル施設を建てよう',description:'合金35・食料3で、自動採集を始めよう。',building:'sawmill',goal:1,reward:{wood:15,meat:3}},
 {title:'領土を8区画に広げよう',description:'外側の土地には、もっと豊かな資源が。',stat:'tiles',goal:8,reward:{wood:20,meat:5}},
 {title:'石材を15個集めよう',description:'岩を採掘するか、採石場を建てよう。',stat:'stoneCollected',goal:15,reward:{stone:10,wood:20}},
 {title:'ビームをレベル4にしよう',description:'大型の残骸や、強いウォーカーに備えよう。',upgrade:'axe',goal:4,reward:{wood:30,meat:8}},
 {title:'領土を15区画に広げよう',description:'進みたい方向を選んで、島を育てよう。',stat:'tiles',goal:15,reward:{wood:50,stone:15}},
 {title:'遺跡の守護機を倒そう',description:'機械遺跡の奥にいる、大きなウォーカーを探そう。',stat:'bosses',goal:1,reward:{wood:100,meat:20,stone:25}}
];
export const RESOURCE_NAMES={wood:'合金',meat:'食料',stone:'石材'};
export const key=(x,z)=>`${x},${z}`;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function seeded(seed){let a=seed|0;return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export function biomeAt(x,z){const d=Math.max(0,Math.abs(x)+Math.abs(z)-1);return [...BIOMES].reverse().find(b=>d>=b.minDistance)||BIOMES[0];}
