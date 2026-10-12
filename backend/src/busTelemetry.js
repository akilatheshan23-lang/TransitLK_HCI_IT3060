import {Router} from 'express';
import {z} from 'zod';
const id=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const sampleSchema=z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),accuracy:z.number().min(0).max(100),speed:z.number().min(0).max(60).nullable(),timestamp:z.number().refine(t=>Date.now()-t<=30000&&t<=Date.now()+10000)}).strict();
export function telemetryView(sample,now=Date.now()){
 const live=!!sample?.active&&Number.isFinite(sample.timestamp)&&now-sample.timestamp<=60000&&sample.timestamp<=now+10000;
 return {status:live?'live':sample?.active?'stale':'unavailable',position:live?{latitude:sample.latitude,longitude:sample.longitude}:null,speedKmh:live&&sample.speed!=null?Math.round(sample.speed*3.6):null,accuracy:live?sample.accuracy:null,updatedAt:sample?.timestamp?new Date(sample.timestamp).toISOString():null,source:'owner-phone'};
}
export function busTelemetryRouter(store,authenticate){
 const router=Router();
 const owner=async(req,res,next)=>{
   if(!id.safeParse(req.params.id).success)return res.status(400).json({error:'Invalid bus.'});
   if(!['owner','bus_owner'].includes(req.user.role)||(req.user.role==='bus_owner'&&req.user.status!=='approved'))return res.status(403).json({error:'An approved owner account is required.'});
   if(!await store.ownsTelemetryBus(req.user._id,req.params.id))return res.status(404).json({error:'Bus is not in your fleet.'});
   next();
 };
 router.get('/bus-tracking/:id',async(req,res)=>{
   if(!id.safeParse(req.params.id).success)return res.status(400).json({error:'Invalid bus.'});
   const bus=await store.findTelemetryBus(req.params.id);
   if(!bus||!['approved','active'].includes(bus.status))return res.status(404).json({error:'Bus is unavailable.'});
   res.json(telemetryView(bus.telemetry));
 });
 router.post('/fleet/:id/gps',authenticate,owner,async(req,res)=>{
   const sample=sampleSchema.safeParse(req.body);if(!sample.success)return res.status(400).json({error:'GPS fix must be recent, accurate within 100 metres and contain valid coordinates.'});
   if(!await store.writeBusTelemetry(req.user._id,req.params.id,sample.data))return res.status(409).json({error:'A newer location is already available. Wait for the next GPS fix.'});
   res.json({ok:true});
 });
 router.delete('/fleet/:id/gps',authenticate,owner,async(req,res)=>{await store.stopBusTelemetry(req.user._id,req.params.id);res.json({ok:true});});
 return router;
}
