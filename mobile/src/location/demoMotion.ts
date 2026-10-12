import type {Point} from './routing';
export function distanceMetres(a:Point,b:Point){
 const r=Math.PI/180,dLat=(b.latitude-a.latitude)*r,dLon=(b.longitude-a.longitude)*r;
 const h=Math.sin(dLat/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(dLon/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function demoFrame(points:Point[],elapsedSeconds:number,speedKmh=36){
 const lengths=points.slice(1).map((p,i)=>distanceMetres(points[i],p));
 const total=lengths.reduce((a,b)=>a+b,0),travelled=Math.min(total,Math.max(0,elapsedSeconds)*speedKmh/3.6);
 let remaining=travelled,position=points[0]||null;
 for(let i=0;i<lengths.length;i++){const length=lengths[i];if(remaining<=length&&length>0){const f=remaining/length;position={latitude:points[i].latitude+(points[i+1].latitude-points[i].latitude)*f,longitude:points[i].longitude+(points[i+1].longitude-points[i].longitude)*f};break;}remaining-=length;position=points[i+1];}
 const arrived=total>0&&travelled>=total;
 return {position,speedKmh:arrived?0:speedKmh,etaMinutes:Math.ceil(Math.max(0,total-travelled)/(speedKmh/3.6)/60),arrived};
}
