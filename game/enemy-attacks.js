export const MACHINE_ATTACKS={
 scout:{move:'slash',name:'鎌脚斬撃',windup:.5,active:.28,recovery:.5,range:2.2,radius:2.2,damage:1.05},
 armor:{move:'drill',name:'ドリル粉砕',windup:.85,active:.65,recovery:.65,range:3,radius:3,damage:1.8},
 artillery:{move:'shell',name:'予測砲撃',windup:1.15,active:.14,recovery:.8,range:13,radius:1.65,damage:1.4},
 guardian:{move:'slam',name:'コア衝撃波',windup:1.15,active:.28,recovery:1,range:3.7,radius:3.7,damage:2}
};
export function inAttackArea(a,p){const dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz);if(d>a.radius)return false;if(a.move==='shell'||a.move==='slam'||d<.1)return true;const dot=(dx*Math.sin(a.angle)+dz*Math.cos(a.angle))/d;return dot>(a.move==='drill'?.72:-.1);}
