import BusGpsPublisher from './location/BusGpsPublisher';
import {useBusTelemetry} from './location/useBusTelemetry';
import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,ScrollView,ActivityIndicator,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {api} from './api';
import {NotificationBell} from './notifications/Notifications';
import {RoutePlannerButton} from './location/RoutePlanner';
import ResolvedJourneyMap from './location/ResolvedJourneyMap';
type Bus={id:string;plate:string;route:string;name:string;status:string;stops:string[];gpsAvailable:boolean};
export default function FleetTrackingScreen({onBack,onOpenWebDashboard}:{onBack:()=>void;onOpenWebDashboard?:()=>void}){
 const [buses,setBuses]=useState<Bus[]>([]),[selected,setSelected]=useState<string>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=async()=>{setBusy(true);setError('');try{const data=await api<{buses:Bus[]}>('/fleet/routes');setBuses(data.buses);setSelected(old=>data.buses.some(b=>b.id===old)?old:data.buses[0]?.id);}catch(e){setError(e instanceof Error?e.message:'Could not load your fleet.');}finally{setBusy(false);}};
 useEffect(()=>{void load();},[]);
 const telemetry=useBusTelemetry(selected);
 const bus=buses.find(b=>b.id===selected);
 return <SafeAreaView style={s.screen}><View style={s.header}><Pressable accessibilityRole="button" onPress={onBack}><Text style={s.link}>‹ Back</Text></Pressable><Text style={s.title}>Fleet routes</Text><NotificationBell/></View><ScrollView contentContainerStyle={s.content}>
 <Text style={s.body}>Your registered fleet and route stops. Live vehicle tracking requires GPS data from each bus.</Text>
 <RoutePlannerButton from={bus?.stops[0]} to={bus?.stops[bus.stops.length-1]}/>
 <Pressable accessibilityRole="button" onPress={()=>void load()} disabled={busy}><Text style={s.link}>Refresh my fleet</Text></Pressable>{busy&&<ActivityIndicator/>}{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
 {!busy&&!error&&!buses.length&&<Text>No buses are registered to this account yet. Add your bus in the website dashboard.</Text>}
 {buses.map(b=><Pressable key={b.id} accessibilityRole="button" onPress={()=>setSelected(b.id)} style={[s.card,b.id===selected&&{borderColor:'#008783'}]}><Text style={s.title}>Bus {b.route} · {b.plate}</Text><Text>{b.name}</Text><Text style={s.body}>{b.status} · GPS sharing available</Text></Pressable>)}
 {bus&&<><BusGpsPublisher key={bus.id} id={bus.id} plate={bus.plate}/><Text style={s.title}>Selected route: {bus.route}</Text>{bus.stops.length>=2?<><View style={s.map}><ResolvedJourneyMap origin={bus.stops[0]} destination={bus.stops[bus.stops.length-1]} stops={bus.stops} vehicle={telemetry.data?.position}/></View><Text style={s.body}>Suggested road route through registered stops. Confirm individual stops below; the bus marker appears only when the owner shares a fresh GPS fix.</Text></>:<Text>Register at least two stops to show this route.</Text>}{bus.stops.map((stop,index)=><Text key={`${stop}-${index}`} style={s.stop}>{index+1}. {stop}</Text>)}</>}
 {onOpenWebDashboard&&<Pressable style={s.button} onPress={onOpenWebDashboard}><Text style={{color:'white',fontWeight:'700'}}>Manage fleet on website</Text></Pressable>}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'#F3F7F9'},header:{padding:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},content:{padding:20,gap:15},title:{fontSize:19,fontWeight:'700',color:'#12304A'},body:{color:'#526B7F',lineHeight:22},link:{color:'#008783',fontWeight:'700'},error:{color:'#A12626'},card:{padding:16,gap:8,backgroundColor:'white',borderWidth:1,borderColor:'#DAE4EC',borderRadius:14},map:{height:340,overflow:'hidden',borderRadius:16},stop:{padding:9,color:'#12304A'},button:{padding:16,backgroundColor:'#008783',borderRadius:12,alignItems:'center'}});
