import {useEffect,useRef,useState} from 'react';
import {Platform,AppState} from 'react-native';
import * as Location from 'expo-location';
import {Point} from './routing';
export function useMyLocation(){
 const [position,setPosition]=useState<(Point & {accuracy:number|null;speed:number|null;timestamp:number})|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const subscription=useRef<Location.LocationSubscription|null>(null),generation=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const stop=()=>{generation.current++;if(timer.current)clearTimeout(timer.current);subscription.current?.remove();subscription.current=null;setBusy(false);};
 useEffect(()=>{const listener=AppState.addEventListener('change',s=>{if(s==='background')stop();});return()=>{generation.current++;if(timer.current)clearTimeout(timer.current);subscription.current?.remove();listener.remove();};},[]);
 const start=async()=>{
   stop();const request=++generation.current;setPosition(null);setBusy(true);setError('');
   try{
     if(Platform.OS==='web'&&!globalThis.isSecureContext)throw Error('Browser location requires HTTPS. Open this app in Expo Go, or use an HTTPS website.');
     const permission=await Location.requestForegroundPermissionsAsync();
     if(request!==generation.current)return;
     if(permission.status!=='granted')throw Error('Location permission was not granted. Enable it in device settings or select a start address manually.');
     if(!await Location.hasServicesEnabledAsync())throw Error('Turn on Location Services, then try again.');
     if(request!==generation.current)return;
     timer.current=setTimeout(()=>{if(request===generation.current){stop();setError('No GPS fix received. Move near a window and try again, or select an address.');}},25000);
     const next=await Location.watchPositionAsync({accuracy:Location.Accuracy.High,distanceInterval:0,timeInterval:5000},loc=>{
       if(request===generation.current){if(timer.current)clearTimeout(timer.current);setPosition({...loc.coords,timestamp:loc.timestamp});setBusy(false);}
     },message=>{if(request===generation.current){setError(message);setBusy(false);}});
     if(request===generation.current)subscription.current=next;else next.remove();
   }catch(e){if(request===generation.current){if(timer.current)clearTimeout(timer.current);setError(e instanceof Error?e.message:'Could not get your location.');setBusy(false);}}
 };
 return {position,error,busy,start,stop};
}
