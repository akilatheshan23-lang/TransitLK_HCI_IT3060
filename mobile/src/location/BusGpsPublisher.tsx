import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Pressable,AppState} from 'react-native';
import {api} from '../api';
import {useMyLocation} from './useMyLocation';
export default function BusGpsPublisher({id,plate}:{id:string;plate:string}){
 const gps=useMyLocation(),[sharing,setSharing]=useState(false),[message,setMessage]=useState(''),[sent,setSent]=useState<string>();
 const enabled=useRef(false),queue=useRef<Promise<unknown>>(Promise.resolve()),last=useRef(0),sending=useRef(false);
 const stop=()=>{enabled.current=false;setSharing(false);gps.stop();queue.current=queue.current.catch(()=>{}).then(()=>api(`/fleet/${encodeURIComponent(id)}/gps`,'DELETE')).catch(()=>{setMessage('Phone sharing stopped. If the server is offline, its last fix expires within 60 seconds.');});};
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>{if(state==='background'&&enabled.current)stop();});return()=>{sub.remove();if(enabled.current){enabled.current=false;queue.current=queue.current.catch(()=>{}).then(()=>api(`/fleet/${encodeURIComponent(id)}/gps`,'DELETE')).catch(()=>{});}};},[id]);
 useEffect(()=>{const p=gps.position;if(!sharing||!enabled.current||!p||sending.current||Date.now()-last.current<5000)return;
 if(p.accuracy==null||p.accuracy>100){setMessage('Waiting for a more accurate GPS fix (within 100 metres).');return;}
 if(Date.now()-p.timestamp>30000){setMessage('Waiting for a fresh GPS fix.');return;}
 last.current=Date.now();sending.current=true;
 queue.current=queue.current.catch(()=>{}).then(async()=>{if(!enabled.current)return;await api(`/fleet/${encodeURIComponent(id)}/gps`,'POST',{latitude:p.latitude,longitude:p.longitude,accuracy:p.accuracy,speed:p.speed!=null&&p.speed>=0?p.speed:null,timestamp:p.timestamp});if(enabled.current){setSent(new Date(p.timestamp).toLocaleTimeString());setMessage('');}}).catch(e=>{if(enabled.current)setMessage(e instanceof Error?e.message:'Could not send GPS.');}).finally(()=>{sending.current=false;});
 },[gps.position,sharing,id]);
 return <View style={{backgroundColor:'#E3F5F1',padding:18,borderRadius:16,gap:12}}><Text style={{fontSize:18,fontWeight:'700'}}>Share GPS for {plate}</Text><Text>Only start while this phone is travelling on this bus. Its location and speed will be visible to passengers. Keep this screen open; sharing stops in the background.</Text>
 <Pressable accessibilityRole="button" style={{backgroundColor:sharing?'#AA3434':'#008783',padding:15,borderRadius:10}} onPress={()=>{if(sharing)stop();else{last.current=0;setSent(undefined);setMessage('');enabled.current=true;setSharing(true);void gps.start();}}}><Text style={{color:'white',fontWeight:'700'}}>{sharing?'Stop sharing bus GPS':'I am on this bus · Start sharing GPS'}</Text></Pressable>
 <Text>{gps.error||message||(sharing?(sent?`GPS sent at ${sent}`:'Waiting for GPS permission and a fix…'):'GPS sharing is off.')}</Text>
 </View>;
}
