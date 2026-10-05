import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
const users=new Map(), sessions=new Map();
const store={
  async createUser(user){if([...users.values()].some(u=>u.email===user.email))throw Object.assign(Error(),{code:11000});const u={...user,_id:String(users.size+1)};users.set(u._id,u);return u;},
  async findEmail(email){return [...users.values()].find(u=>u.email===email);},
  async findUser(id){return users.get(id);},
  async updateLanguage(id,language){const u=users.get(id);u.language=language;return u;},
  async createSession(s){sessions.set(s.tokenHash,s);},
  async findSession(hash){const s=sessions.get(hash);return s&&s.expiresAt>new Date()?s:null;},
  async deleteSession(hash){sessions.delete(hash);},async ping(){}
};
let server,base,token;
before(async()=>{server=createApp(store,{limit:100}).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base=`http://127.0.0.1:${server.address().port}/api`;});
after(()=>new Promise(resolve=>server.close(resolve)));
async function call(path,method='GET',body,bearer){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:r.status===204?null:await r.json()};}
test('public welcome data has no invented live notifications',async()=>{const r=await call('/home');assert.equal(r.status,200);assert.deepEqual(r.body.notifications,[]);});
test('registration rejects invalid fields and privileged role injection',async()=>{for(const body of [{name:'A',email:'bad',password:'short'},{name:'Test Rider',email:'role@example.test',password:'test-password',role:'admin'}])assert.equal((await call('/auth/register','POST',body)).status,400);});
test('account creation normalizes email, hashes password and hides secrets',async()=>{const r=await call('/auth/register','POST',{name:'Test Rider',email:'RIDER@example.test',password:'test-password',language:'en'});assert.equal(r.status,201);token=r.body.token;assert.match(token,/^[a-f0-9]{64}$/);assert.equal(r.body.user.email,'rider@example.test');assert.equal(r.body.user.role,'passenger');assert.ok(!('passwordHash' in r.body.user));assert.notEqual(users.get('1').passwordHash,'test-password');assert.ok(!sessions.has(token));});
test('duplicate email cannot create another account',async()=>assert.equal((await call('/auth/register','POST',{name:'Test Rider',email:'rider@example.test',password:'test-password'})).status,409));
test('bad password and unknown email return the same login error',async()=>{const a=await call('/auth/login','POST',{email:'rider@example.test',password:'wrong-password'});const b=await call('/auth/login','POST',{email:'unknown@example.test',password:'wrong-password'});assert.equal(a.status,401);assert.deepEqual(a,b);});
test('login accepts valid credentials',async()=>{const r=await call('/auth/login','POST',{email:'rider@example.test',password:'test-password'});assert.equal(r.status,200);assert.equal(r.body.user.id,'1');});
test('account data requires a valid session',async()=>{assert.equal((await call('/me')).status,401);assert.equal((await call('/me','GET',null,'0'.repeat(64))).status,401);assert.equal((await call('/me','GET',null,token)).body.user.name,'Test Rider');});
test('preferences persist and arbitrary account mutations are rejected',async()=>{assert.equal((await call('/me/preferences','PATCH',{language:'ta'},token)).status,200);assert.equal((await call('/me','GET',null,token)).body.user.language,'ta');assert.equal((await call('/me/preferences','PATCH',{language:'xx'},token)).status,400);assert.equal((await call('/me/preferences','PATCH',{language:'en',role:'admin'},token)).status,400);});
test('one account cannot mutate another user through preferences',async()=>{const second=await call('/auth/register','POST',{name:'Second Rider',email:'second@example.test',password:'test-password'});await call('/me/preferences','PATCH',{language:'si'},second.body.token);assert.equal((await call('/me','GET',null,token)).body.user.language,'ta');});
test('logout revokes the server session',async()=>{assert.equal((await call('/auth/logout','POST',null,token)).status,204);assert.equal((await call('/me','GET',null,token)).status,401);});
test('expired sessions are rejected',async()=>{const r=await call('/auth/login','POST',{email:'rider@example.test',password:'test-password'});for(const s of sessions.values())s.expiresAt=new Date(0);assert.equal((await call('/me','GET',null,r.body.token)).status,401);});
test('malformed JSON and oversized bodies are rejected',async()=>{let r=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'});assert.equal(r.status,400);r=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:'x'.repeat(17000)})});assert.equal(r.status,413);});
test('unavailable database reports unhealthy instead of successful',async()=>{const saved=store.ping;store.ping=async()=>{throw Error('offline');};try{assert.equal((await call('/health')).status,503);}finally{store.ping=saved;}});
test('authentication attempts are rate limited',async()=>{const limited=createApp(store,{limit:1}).listen(0,'127.0.0.1');await new Promise(r=>limited.once('listening',r));try{const url=`http://127.0.0.1:${limited.address().port}/api/auth/login`;const options={method:'POST',headers:{'Content-Type':'application/json'},body:'{}'};assert.equal((await fetch(url,options)).status,400);assert.equal((await fetch(url,options)).status,429);}finally{await new Promise(r=>limited.close(r));}});
