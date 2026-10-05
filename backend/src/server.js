import { MongoClient } from 'mongodb';
import { createMongoStore } from './store.js';
import { createApp } from './app.js';

if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in backend/.env before starting.');
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
let connectedStore;
let connecting=false;
const store=new Proxy({}, {get:(_target,method)=>async(...args)=>{
  if(!connectedStore) throw new Error('Database unavailable');
  return connectedStore[method](...args);
}});
async function connect(){
  if(connecting||connectedStore)return;
  connecting=true;
  try{await client.connect();connectedStore=await createMongoStore(client.db(process.env.MONGODB_DB||'transitlk'));console.log('MongoDB connected.');}
  catch(error){
    const authFailure = (error.code === 8000 || error.code === 18) && /auth|credential/i.test(error.message);
    console.error(authFailure
      ? 'MongoDB authentication rejected. Correct the Atlas database-user credentials in backend/.env and restart Backend. Retrying in 30 seconds.'
      : 'MongoDB unavailable ('+error.name+'). Check Atlas network access, cluster availability and credentials. Retrying in 30 seconds.');
  }
  finally{connecting=false;}
}
const app=createApp(store,{origins:(process.env.CORS_ORIGINS||'http://localhost:8081,http://127.0.0.1:8081').split(',')});
const server=app.listen(Number(process.env.PORT||4000),process.env.HOST||'0.0.0.0',()=>console.log('TransitLK API listening on port '+(process.env.PORT||4000)));
void connect();
const retry=setInterval(()=>void connect(),30000);
const stop=()=>{clearInterval(retry);server.close(async()=>{await client.close();process.exit(0);});};
process.on('SIGTERM',stop);process.on('SIGINT',stop);
