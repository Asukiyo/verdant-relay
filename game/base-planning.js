// Shared orthogonal service lanes keep freight off the central plaza.
export function freightRoute(s,layout,market){
 const left=layout.left+.55,right=layout.right-.55,back=layout.back+.55;
 const edge=s.x<(left+right)/2?left:right;
 const points=[{x:s.x,z:s.z},{x:edge,z:s.z}];
 if(edge===left)points.push({x:left,z:back},{x:right,z:back});
 points.push({x:right,z:market.z},{x:market.x,z:market.z});
 return points.filter((p,i)=>!i||Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z)>.001);
}
export function routeLength(points){return points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.z-points[i].z),0);}
export function routePose(points,progress){let remaining=routeLength(points)*Math.max(0,Math.min(1,progress));for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.z-a.z);if(remaining<=length||i===points.length-1){const t=Math.min(1,remaining/Math.max(.001,length));return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,angle:Math.atan2(b.x-a.x,b.z-a.z)};}remaining-=length;}return{...points[0],angle:0};}
export function mergedTracks(routes){const lines=new Map();for(const ps of routes)for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],horizontal=Math.abs(a.z-b.z)<.001,axis=horizontal?'x':'z',fixed=horizontal?a.z:a.x,k=axis+':'+fixed.toFixed(3),from=Math.min(a[axis],b[axis]),to=Math.max(a[axis],b[axis]);if(!lines.has(k))lines.set(k,{axis,fixed,spans:[]});lines.get(k).spans.push([from,to]);}const out=[];for(const{axis,fixed,spans}of lines.values()){spans.sort((a,b)=>a[0]-b[0]);const merged=[];for(const s of spans){const last=merged.at(-1);if(last&&s[0]<=last[1]+.001)last[1]=Math.max(last[1],s[1]);else merged.push([...s]);}for(const[from,to]of merged)out.push({axis,fixed,from,to});}return out;}
