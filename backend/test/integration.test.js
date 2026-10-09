import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { hashPassword, tokenHash } from '../src/auth.js';

test('one session signs into the integration UI and authorizes authority features', async () => {
  const user = {_id:'staff-id', email:'staff@example.test',name:'Officer',role:'authority',status:'approved',language:'en',passwordHash:await hashPassword('test-password')};
  let session;
  const store = {findEmail:async()=>user,createSession:async value=>{session=value;},findSession:async hash=>session?.tokenHash===hash?session:null,findUser:async()=>user,listAuthorityIncidents:async()=>[],deleteSession:async()=>{session=null;}};
  const server=createApp(store).listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}/api`;
  try {
    const login=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:'test-password'})});
    const data=await login.json(); assert.equal(data.success,true); assert.equal(data.user.role,'authority'); assert.equal(session.tokenHash,tokenHash(data.token));
    const headers={Authorization:`Bearer ${data.token}`};
    const profile=await (await fetch(base+'/me',{headers})).json(); assert.equal(profile.success,true);
    assert.equal((await fetch(base+'/authority/overview',{headers})).status,200);
    user.status='pending'; assert.equal((await fetch(base+'/authority/overview',{headers})).status,403);
    user.status='approved'; user.role='passenger'; assert.equal((await fetch(base+'/authority/overview',{headers})).status,403);
    assert.equal((await fetch(base+'/auth/logout',{method:'POST',headers})).status,204);
    assert.equal((await fetch(base+'/authority/overview',{headers})).status,401);
  } finally {await new Promise(r=>server.close(r));}
});

test('Google login cannot authenticate a claimed email without provider verification', async()=>{
 const server=createApp({}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try {const res=await fetch(`http://127.0.0.1:${server.address().port}/api/auth/google`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'owner@example.test',name:'Owner'})});assert.equal(res.status,501);assert.ok(!(await res.json()).token);}finally{await new Promise(r=>server.close(r));}
});
