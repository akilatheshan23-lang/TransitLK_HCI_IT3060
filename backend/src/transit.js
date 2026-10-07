import { Router } from 'express';
import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';

const point=z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)}).strict();
const identifier=z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const searchSchema=z.object({from:z.string().trim().min(2).max(80),to:z.string().trim().min(2).max(80),mode:z.enum(['bus','train']),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v),demo:z.enum(['true','false']).default('true')}).strict();
const busPath=[{latitude:6.7159,longitude:80.0627},{latitude:6.744,longitude:80.035},{latitude:6.795,longitude:79.941},{latitude:6.841,longitude:79.903},{latitude:6.877,longitude:79.878},{latitude:6.933,longitude:79.85}];
const trainPath=[{latitude:6.714,longitude:79.907},{latitude:6.771,longitude:79.883},{latitude:6.852,longitude:79.863},{latitude:6.934,longitude:79.85}];
function demoTrips(q){
 const names=q.mode==='bus'?['Horana','Colombo']:['Panadura','Colombo'];
 const forward=q.from.toLowerCase()===names[0].toLowerCase()&&q.to.toLowerCase()===names[1].toLowerCase();
 const reverse=q.to.toLowerCase()===names[0].toLowerCase()&&q.from.toLowerCase()===names[1].toLowerCase();
 if(!forward&&!reverse)return [];
 return [0,1].map(i=>({id:`demo-${q.mode}-${reverse?'return':'out'}-${i}`,mode:q.mode,route:q.mode==='bus'?'125':'Coastal',from:forward?names[0]:names[1],to:forward?names[1]:names[0],date:q.date,departure:i?'08:50':'08:30',arrival:i?'10:20':'10:00',fare:q.mode==='bus'?250:180,source:'demo',path:reverse?[...(q.mode==='bus'?busPath:trainPath)].reverse():q.mode==='bus'?busPath:trainPath}));
}
export function demoTrip(id,date){for(const mode of ['bus','train'])for(const reverse of [false,true]){const names=mode==='bus'?['Horana','Colombo']:['Panadura','Colombo'];const found=demoTrips({mode,from:names[reverse?1:0],to:names[reverse?0:1],date}).find(t=>t.id===id);if(found)return found;}return null;}
export function tracking(trip,now=Date.now()){
 if(trip.source==='demo'){
 const f=((now/1000)%180)/180*(trip.path.length-1),i=Math.min(Math.floor(f),trip.path.length-2),t=f-i;
 const a=trip.path[i],b=trip.path[i+1];
 return {trip,position:{latitude:a.latitude+(b.latitude-a.latitude)*t,longitude:a.longitude+(b.longitude-a.longitude)*t},updatedAt:new Date(now).toISOString(),stale:false,etaMinutes:Math.max(1,Math.ceil(5*(1-f/(trip.path.length-1)))),crowdPercent:60,source:'demo'};
 }
 const stale=!trip.updatedAt||now-new Date(trip.updatedAt).getTime()>60000;
 return {trip,position:trip.position||null,updatedAt:trip.updatedAt||null,stale,etaMinutes:stale?null:trip.etaMinutes??null,crowdPercent:stale?null:trip.crowdPercent??null,source:'live'};
}
export function transitRouter(store,authenticate){
 const r=Router();
 r.get('/journeys',async(req,res)=>{const q=searchSchema.safeParse(req.query);if(!q.success)return res.status(400).json({error:'Choose two places, bus or train, and a valid date (YYYY-MM-DD).'});const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());if(q.data.date<today)return res.status(400).json({error:'Choose today or a future travel date.'});const journeys=q.data.demo==='true'?demoTrips(q.data):await store.searchTrips(q.data);res.json({journeys,source:q.data.demo==='true'?'demo':'live'});});
 r.get('/journeys/:id/tracking',async(req,res)=>{if(!identifier.safeParse(req.params.id).success)return res.status(400).json({error:'Invalid journey.'});const trip=req.params.id.startsWith('demo-')?demoTrip(req.params.id,req.query.date):await store.findTrip(req.params.id);if(!trip)return res.status(404).json({error:'Journey not found.'});res.json(tracking(trip));});
 r.get('/geocode',async(req,res)=>{
  const text=String(req.query.text||'').trim();
  if(!text||text.length<2)return res.status(400).json({error:'Search query must be at least 2 characters.'});
  const apiKey=process.env.GEOAPIFY_API_KEY;
  if(!apiKey)return res.status(503).json({error:'Geocoding is not configured.'});
  try{
   const url=`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(text)}&apiKey=${apiKey}`;
   const response=await fetch(url,{method:'GET'});
   if(!response.ok)return res.status(response.status).json({error:'Geocoding service unavailable.'});
   const data=await response.json();
   res.json(data);
  }catch(err){
   res.status(502).json({error:'Geocoding request failed.'});
  }
 });
 r.post('/telemetry/:id',async(req,res)=>{
 const key=process.env.TRANSIT_INGEST_KEY;const supplied=req.get('x-transit-key')||'';
 if(!key||key.length<32||Buffer.byteLength(key)!==Buffer.byteLength(supplied)||!timingSafeEqual(Buffer.from(key),Buffer.from(supplied)))return res.status(401).json({error:'Invalid vehicle feed credentials.'});
 const data=z.object({position:point,updatedAt:z.string().datetime().refine(v=>Date.now()-Date.parse(v)<120000&&Date.parse(v)<=Date.now()+10000),etaMinutes:z.number().int().min(0).max(1440).nullable(),crowdPercent:z.number().min(0).max(100).nullable()}).strict().safeParse(req.body);
 if(!identifier.safeParse(req.params.id).success||req.params.id.startsWith('demo-')||!data.success)return res.status(400).json({error:'Invalid or outdated telemetry.'});
 const result=await store.updateTelemetry(req.params.id,{...data.data,updatedAt:new Date(data.data.updatedAt)});if(!result)return res.status(409).json({error:'Journey missing or a newer GPS update already exists.'});res.json({ok:true});
 });
 r.get('/saved-journeys',authenticate,async(req,res)=>res.json({journeys:await store.listSaved(String(req.user._id))}));
 r.post('/saved-journeys',authenticate,async(req,res)=>{
 const data=z.object({tripId:identifier,date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).strict().safeParse(req.body);if(!data.success)return res.status(400).json({error:'Choose a journey and date.'});
 const trip=data.data.tripId.startsWith('demo-')?demoTrip(data.data.tripId,data.data.date):await store.findTrip(data.data.tripId);if(!trip)return res.status(404).json({error:'Journey not found.'});
 const saved=await store.saveJourney(String(req.user._id),{tripId:trip.id,date:data.data.date,from:trip.from,to:trip.to,mode:trip.mode,source:trip.source||'live',label:`${trip.from} → ${trip.to}`});res.status(201).json({journey:saved});
 });
 r.patch('/saved-journeys/:id',authenticate,async(req,res)=>{const data=z.object({label:z.string().trim().min(1).max(60)}).strict().safeParse(req.body);if(!identifier.safeParse(req.params.id).success||!data.success)return res.status(400).json({error:'Enter a label of 1–60 characters.'});const saved=await store.renameSaved(String(req.user._id),req.params.id,data.data.label);if(!saved)return res.status(404).json({error:'Saved journey not found.'});res.json({journey:saved});});
 r.delete('/saved-journeys/:id',authenticate,async(req,res)=>{if(!identifier.safeParse(req.params.id).success)return res.status(400).json({error:'Invalid saved journey.'});if(!await store.deleteSaved(String(req.user._id),req.params.id))return res.status(404).json({error:'Saved journey not found.'});res.status(204).end();});
 return r;
}
