import {GEOAPIFY_API_KEY} from '../geoapify';
export type Point={latitude:number;longitude:number};
export type Place=Point & {label:string};
export const validPoint=(p:Point)=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180;
async function json(url:string,signal?:AbortSignal){
 const controller=new AbortController();
 const abort=()=>controller.abort();
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort);
 const timer=setTimeout(abort,20000);
 try{
   const response=await fetch(url,{signal:controller.signal});
   if(!response.ok)throw Error(`Map service unavailable (${response.status}). Please retry.`);
   return await response.json();
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export async function searchPlaces(text:string,signal?:AbortSignal):Promise<Place[]>{
 if(text.trim().length<2)return [];
 const data=await json(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(text.trim())}&filter=countrycode:lk&limit=6&apiKey=${GEOAPIFY_API_KEY}`,signal);
 return (data.features||[]).map((f:any)=>({latitude:f.geometry?.coordinates?.[1],longitude:f.geometry?.coordinates?.[0],label:f.properties?.formatted || text})).filter(validPoint);
}
export function routeGeometry(geometry:any):Point[]{
 const raw=geometry?.type==='MultiLineString'?geometry.coordinates.flat():geometry?.type==='LineString'?geometry.coordinates:[];
 return raw.map((p:number[])=>({latitude:p[1],longitude:p[0]})).filter(validPoint);
}
export async function roadRoute(from:Point,to:Point,signal?:AbortSignal,via:Point[]=[]):Promise<Point[]>{
 if(!validPoint(from)||!validPoint(to))throw Error('Select valid start and destination locations.');
 if(via.some(p=>!validPoint(p)))throw Error('One of the route stops has invalid coordinates.');
 const waypoints=[from,...via,to].map(p=>`${p.latitude},${p.longitude}`).join('|');
 const data=await json(`https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=bus&apiKey=${GEOAPIFY_API_KEY}`,signal);
 const points=routeGeometry(data.features?.[0]?.geometry);
 if(points.length<2)throw Error('No road route found. Select different locations.');
 return points;
}
export async function roadEta(from:Point,to:Point,signal?:AbortSignal):Promise<number>{
 const data=await json(`https://api.geoapify.com/v1/routing?waypoints=${from.latitude},${from.longitude}|${to.latitude},${to.longitude}&mode=bus&apiKey=${GEOAPIFY_API_KEY}`,signal);
 const seconds=data.features?.[0]?.properties?.time;
 if(!Number.isFinite(seconds)||seconds<0)throw Error('ETA unavailable.');
 return Math.ceil(seconds/60);
}
