import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {notificationsRouter,notificationEvent} from '../src/notifications.js';
const receipts=new Map();
const events=id=>[notificationEvent('account',id,'Account status',`${id} active`,'2026-10-12')];
const store={notificationEvents:async user=>events(user._id),notificationReadIds:async id=>[...(receipts.get(id)||[])],markNotificationsRead:async(id,ids)=>receipts.set(id,new Set([...(receipts.get(id)||[]),...ids]))};
const app=express();app.use(express.json());
app.use(notificationsRouter(store,(req,res,next)=>{const id=req.get('x-test-user');if(!id)return res.sendStatus(401);req.user={_id:id};next();}));
let server,base;
before(async()=>{server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(r=>server.close(r)));
const call=(path,user,body)=>fetch(base+path,{method:body?'PATCH':'GET',headers:{...(user?{'x-test-user':user}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('notifications reject unauthenticated access',async()=>assert.equal((await call('/notifications')).status,401));
test('notification IDs are stable and change when status changes',()=>{
 assert.equal(events('one')[0].id,events('one')[0].id);
 assert.notEqual(events('one')[0].id,notificationEvent('account','one','Account status','one rejected','2026-10-12').id);
});
test('reads persist and are idempotent per user',async()=>{
 const id=events('one')[0].id;
 assert.equal((await(await call('/notifications','one')).json()).unreadCount,1);
 for(let i=0;i<2;i++)assert.equal((await call('/notifications/read','one',{ids:[id]})).status,200);
 assert.equal((await(await call('/notifications','one')).json()).unreadCount,0);
 assert.equal((await(await call('/notifications','two')).json()).unreadCount,1);
});
test('another user cannot mark a notification read',async()=>assert.equal((await call('/notifications/read','two',{ids:[events('one')[0].id]})).status,404));
test('invalid and oversized read requests are rejected',async()=>{
 assert.equal((await call('/notifications/read','one',{ids:['bad']})).status,400);
 assert.equal((await call('/notifications/read','one',{ids:Array(101).fill(events('one')[0].id)})).status,400);
});
