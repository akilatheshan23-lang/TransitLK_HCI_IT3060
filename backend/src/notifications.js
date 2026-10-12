import {Router} from 'express';
import {createHash} from 'node:crypto';
import {z} from 'zod';

export function notificationEvent(kind, key, title, message, date) {
  const createdAt = date != null && Number.isFinite(new Date(date).getTime()) ? new Date(date).toISOString() : null;
  const id=createHash('sha256').update(JSON.stringify([kind,String(key),message,createdAt])).digest('hex');
  return {id,kind,title,message,createdAt};
}

export function notificationsRouter(store,authenticate){
 const router=Router();
 router.use('/notifications',authenticate);
 router.get('/notifications',async(req,res)=>{
   const userId=String(req.user._id);
   const items=await store.notificationEvents(req.user);
   const read=new Set(await store.notificationReadIds(userId));
   const notifications=items.map(item=>({...item,read:read.has(item.id)}));
   res.json({notifications,unreadCount:notifications.filter(n=>!n.read).length});
 });
 router.patch('/notifications/read',async(req,res)=>{
   const parsed=z.object({ids:z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1).max(100)}).strict().safeParse(req.body);
   if(!parsed.success)return res.status(400).json({error:'Select valid notifications to mark as read.'});
   const allowed=new Set((await store.notificationEvents(req.user)).map(n=>n.id));
   if(parsed.data.ids.some(id=>!allowed.has(id)))return res.status(404).json({error:'Notification not found.'});
   await store.markNotificationsRead(String(req.user._id),[...new Set(parsed.data.ids)]);
   res.json({success:true});
 });
 return router;
}
