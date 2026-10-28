export const SOLDIER_TYPES={
 archer:{name:'弓兵',baseLevel:2,cost:60,damage:9,range:5.5,speed:2.6,capacity:8,interval:1.05,color:'#488dbe',description:'射程5.5・攻撃9。遠距離から安定して回収戦。'},
 scout:{name:'斥候',baseLevel:3,cost:85,damage:6,range:3.7,speed:3.8,capacity:6,interval:.65,color:'#568c52',description:'移動3.8・攻撃6。素早く追跡して回収。'},
 guard:{name:'重装兵',baseLevel:4,cost:150,damage:24,range:1.7,speed:2,capacity:14,interval:1.4,color:'#7d8c9f',description:'攻撃24・運搬14。近くの機械生物を最大2体攻撃。'},
 miner:{name:'採掘兵',baseLevel:3,cost:110,damage:0,range:0,speed:2.5,capacity:0,interval:3,color:'#bc9543',description:'金鉱で作業し、3秒ごとに金鉱石を1個追加。'}
};
export const RECRUIT_SPOTS={archer:{x:-.4,z:3.3},scout:{x:1.5,z:3.3},guard:{x:-.4,z:5.3},miner:{x:1.5,z:5.3}};
export const BARRACKS={x:-.7,z:7.8,cost:120,baseLevel:2};
export const BARRACKS_UPGRADE={x:-.7,z:9};
export const FACILITY_RULES={tower:{name:'パルスタレット',baseLevel:2,baseCost:240,costStep:65},mine:{name:'金鉱',baseLevel:3,baseCost:280,costStep:90}};
export const startingTiles=new Set(['-1,0','0,0','-1,1','0,1']);
