import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TextInput,Pressable,ScrollView,Modal,ActivityIndicator,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import RouteCanvas from './RouteCanvas';
import DemoRouteMap from './DemoRouteMap';
import {Place,Point,searchPlaces,roadRoute} from './routing';
import {useMyLocation} from './useMyLocation';
export function RoutePlannerButton({from='',to=''}:{from?:string;to?:string}){
 const [open,setOpen]=useState(false);
 return <><Pressable accessibilityRole="button" style={s.button} onPress={()=>setOpen(true)}><Text style={s.white}>Plan route · My location</Text></Pressable><Modal visible={open} animationType="slide" onRequestClose={()=>setOpen(false)}>{open&&<RoutePlanner initialFrom={from} initialTo={to} onClose={()=>setOpen(false)}/>}</Modal></>;
}
function RoutePlanner({initialFrom,initialTo,onClose}:{initialFrom:string;initialTo:string;onClose:()=>void}){
 const [fromText,setFromText]=useState(initialFrom),[toText,setToText]=useState(initialTo);
 const [from,setFrom]=useState<Place>(),[to,setTo]=useState<Place>(),[active,setActive]=useState<'from'|'to'>('from');
 const [results,setResults]=useState<Place[]>([]),[points,setPoints]=useState<Point[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[searching,setSearching]=useState(false),[useGps,setUseGps]=useState(false),[demo,setDemo]=useState(true);
 const location=useMyLocation(),request=useRef(0);
 const text=active==='from'?fromText:toText,selected=active==='from'?from:to;
 useEffect(()=>{const abort=new AbortController();setResults([]);if(selected||text.trim().length<2){setSearching(false);return;}
 const timer=setTimeout(async()=>{setSearching(true);try{const values=await searchPlaces(text,abort.signal);if(!abort.signal.aborted){setResults(values);setError(values.length?'':'No matching place. Try a nearby street or town.');}}catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Search failed.');}finally{if(!abort.signal.aborted)setSearching(false);}},450);
 return()=>{clearTimeout(timer);abort.abort();};},[text,active,selected]);
 useEffect(()=>{if(useGps&&location.position){setFrom({...location.position,label:'My current location'});setFromText('My current location');setPoints([]);request.current++;setBusy(false);setUseGps(false);}},[location.position,useGps]);
 useEffect(()=>()=>{request.current++;},[]);
 const change=(target:'from'|'to',value:string)=>{request.current++;setBusy(false);setActive(target);setPoints([]);setError('');if(target==='from'){setUseGps(false);setFrom(undefined);setFromText(value);}else{setTo(undefined);setToText(value);}};
 const choose=(p:Place)=>{request.current++;setBusy(false);setPoints([]);setError('');if(active==='from'){setUseGps(false);setFrom(p);setFromText(p.label);setActive('to');}else{setTo(p);setToText(p.label);}setResults([]);};
 const draw=async(a?:Place,b?:Place)=>{if(!a||!b){setActive(!a?'from':'to');setError(!a?'Select a start address, or tap Try demo journey.':'Select a destination from the search results.');return;}if(Math.abs(a.latitude-b.latitude)+Math.abs(a.longitude-b.longitude)<.0001){setError('Choose different start and destination locations.');return;}
 const id=++request.current;setBusy(true);setError('');setPoints([]);try{const line=await roadRoute(a,b);if(id===request.current)setPoints(line);}catch(e){if(id===request.current)setError(e instanceof Error?e.message:'Route unavailable.');}finally{if(id===request.current)setBusy(false);}};
 const sample=()=>{const a={latitude:6.9040723,longitude:79.9546189,label:'Malabe'},b={latitude:6.9148334,longitude:79.8776,label:'Borella'};setUseGps(false);setFrom(a);setTo(b);setFromText(a.label);setToText(b.label);setResults([]);setDemo(true);void draw(a,b);};
 return <SafeAreaView style={s.screen}><View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onClose}><Text style={s.link}>‹ Back</Text></Pressable><Text style={s.title}>Journey map</Text></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
 <Text style={s.body}>Try a moving demo bus, or choose your own journey. The demo is simulated, not live GPS.</Text>
 <Pressable accessibilityRole="button" style={s.button} disabled={busy} onPress={sample}><Text style={s.white}>Try demo journey · Malabe to Borella</Text></Pressable>
 <Text>Start location</Text><TextInput accessibilityLabel="Start location" style={s.input} value={fromText} onFocus={()=>setActive('from')} onChangeText={v=>change('from',v)} placeholder="Town, street or place"/>
 <Pressable accessibilityRole="button" style={s.secondary} disabled={location.busy} onPress={()=>{setUseGps(true);void location.start();}}><Text style={s.link}>{location.busy?'Locating…':'Use my current location'}</Text></Pressable>
 <Text>Destination</Text><TextInput accessibilityLabel="Destination" style={s.input} value={toText} onFocus={()=>setActive('to')} onChangeText={v=>change('to',v)} placeholder="Where are you going?"/>
 {searching&&<ActivityIndicator color="#008783"/>}{results.map((p,i)=><Pressable accessibilityRole="button" key={`${p.latitude},${p.longitude},${i}`} style={s.result} onPress={()=>choose(p)}><Text>{p.label}</Text></Pressable>)}
 {!!(error||location.error)&&<Text accessibilityRole="alert" style={s.error}>{error||location.error}</Text>}
 <Pressable accessibilityRole="button" style={s.button} disabled={busy} onPress={()=>void draw(from,to)}><Text style={s.white}>{busy?'Finding road route…':'Show route'}</Text></Pressable>
 <Pressable accessibilityRole="button" onPress={()=>setDemo(v=>!v)}><Text style={s.link}>{demo?'Demo bus enabled · Hide bus':'Show moving demo bus'}</Text></Pressable>
 <View style={s.map}>{demo&&points.length>1?<DemoRouteMap from={from} to={to} points={points} user={location.position}/>:<RouteCanvas from={from} to={to} points={points} user={location.position}/>}</View>
 <Text style={s.body}>Suggested road route. Demo speed and ETA are simulated. Blue marks your phone; the bus icon is separate.</Text>
 {location.position&&<><Text style={s.body}>Your location: {location.position.latitude.toFixed(5)}, {location.position.longitude.toFixed(5)}</Text><Pressable onPress={()=>{location.stop();setUseGps(false);}}><Text style={s.link}>Stop location updates</Text></Pressable></>}
 <Text style={s.body}>Location updates stop when this screen closes or the app goes into the background. Selected routing coordinates are sent to Geoapify; your location is not saved to TransitLK.</Text>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'#F3F7F9'},header:{padding:20,flexDirection:'row',gap:24,alignItems:'center'},title:{fontSize:23,fontWeight:'700',color:'#12304A'},content:{padding:20,gap:12,width:'100%',maxWidth:760,alignSelf:'center'},body:{color:'#526B7F',lineHeight:21},input:{backgroundColor:'white',borderWidth:1,borderColor:'#D5E3EA',borderRadius:12,padding:14,color:'#12304A'},button:{backgroundColor:'#008783',padding:16,borderRadius:12,alignItems:'center',marginVertical:6},white:{color:'white',fontWeight:'700'},secondary:{padding:12},link:{color:'#007A74',fontWeight:'700'},result:{padding:14,backgroundColor:'white',borderRadius:10},error:{color:'#A12626'},map:{height:350,borderRadius:16,overflow:'hidden'}});
