import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,AppState,BackHandler,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {api,User} from './api';
import {Icon} from './Artwork';
import {TransitIcon,TransitIconName} from './TransitIcon';
import {colors as c} from './theme';
import {Journey,Tracking,SavedJourney} from './transitTypes';
import JourneyMap from './JourneyMap';
import { geoapifyReverseGeocode } from './geoapify';
import CommunityScreen from './lostFound/CommunityScreen';
import CreatePostScreen from './lostFound/CreatePostScreen';
import PostPublishedScreen from './lostFound/PostPublishedScreen';
import PostDetailsScreen from './lostFound/PostDetailsScreen';
import type { LostFoundPost } from './lostFound/lostFoundApi';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function Action({label,onPress,secondary=false,busy=false}:{label:string;onPress:()=>void;secondary?:boolean;busy?:boolean}){return <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={[s.action,secondary&&s.secondary]}><Text style={[s.actionText,secondary&&{color:c.teal}]}>{label}</Text>{busy?<ActivityIndicator color={c.teal}/>:<Icon name="arrow" color={secondary?c.teal:'white'}/>}</Pressable>;}
export default function TransitApp({user,onProfile,onWelcome,onNotifications}:{user:User|null;onProfile:()=>void;onWelcome:()=>void;onNotifications:()=>void}){
 const insets=useSafeAreaInsets();const [page,setPage]=useState<'home'|'results'|'tracking'|'community'| 'createPost'|'postPublished'|'postDetails'>('home');const [mode,setMode]=useState<'bus'|'train'>('bus');
 const [from,setFrom]=useState('Horana'),[to,setTo]=useState('Colombo'),[date,setDate]=useState(today());const [demo,setDemo]=useState(true);
 const [journeys,setJourneys]=useState<Journey[]>([]),[selected,setSelected]=useState<Journey|null>(null),[data,setData]=useState<Tracking|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[trackingError,setTrackingError]=useState(''),[saved,setSaved]=useState<SavedJourney[]>([]),[savedError,setSavedError]=useState('');
 const [dialog,setDialog]=useState<'tickets'|'community'|'rename'|null>(null),[editing,setEditing]=useState<SavedJourney|null>(null),[label,setLabel]=useState('');
 const [notice,setNotice]=useState(''),[saveBusy,setSaveBusy]=useState(false),[retry,setRetry]=useState(0);const request=useRef(0);
 const [gpsBusy,setGpsBusy]=useState(false);
 const [publishedPost, setPublishedPost] =useState<LostFoundPost | null>(null);
 const [selectedLostFoundPostId, setSelectedLostFoundPostId] =useState<string | null>(null);
 async function detectGps(){
  if(Platform.OS==='web'&&typeof navigator!=='undefined'&&'geolocation' in navigator){
   setGpsBusy(true);setNotice('Requesting GPS location…');
   navigator.geolocation.getCurrentPosition(
    async(pos)=>{
     try{
      const loc=await geoapifyReverseGeocode(pos.coords.latitude,pos.coords.longitude);
      if(loc){setFrom(loc);setNotice(`GPS location: ${loc}`);}
      else{setNotice(`GPS detected: ${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`);}
     }catch{setNotice('Could not reverse-geocode your GPS location.');}
     finally{setGpsBusy(false);}
    },
    ()=>{setGpsBusy(false);setNotice('GPS location permission denied.');},
    {timeout:8000}
   );
  }else{setNotice('GPS is not available on this browser.');}
 }
const back=()=>{
  setError('');
  setNotice('');

  if(page==='tracking') setPage('results');
  else if(page==='results') setPage('home');
  else if(page==='createPost') setPage('community');
  else if(page==='community') setPage('home');
  else if(page==='postPublished') setPage('community');
  else if(page==='postDetails') setPage('community');
  else onWelcome();
};
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{if(dialog){setDialog(null);return true;}back();return true;});return()=>sub.remove();},[page,dialog]);
 async function loadSaved(){if(!user)return;setSavedError('');try{const r=await api<{journeys:SavedJourney[]}>('/saved-journeys');setSaved(r.journeys);}catch{setSavedError('Could not load saved journeys. Tap to retry.');}}
 useEffect(()=>{void loadSaved();},[user?.id]);
 useEffect(()=>{if(page!=='tracking'||!selected)return;let active=true;let running=false;setData(null);setTrackingError('');
 const load=async()=>{if(running||AppState.currentState==='background')return;running=true;try{const r=await api<Tracking>(`/journeys/${selected.id}/tracking?date=${date}`);if(active){setData(r);setTrackingError('');}}catch{if(active)setTrackingError('Connection lost. Showing the last received position.');}finally{running=false;}};
 void load();const timer=setInterval(()=>void load(),5000);const sub=AppState.addEventListener('change',state=>{if(state==='active')void load();});return()=>{active=false;clearInterval(timer);sub.remove();};
 },[page,selected?.id,date,retry]);
 async function search(){const n=++request.current;setError('');setNotice('');if(!from.trim()||!to.trim()||from.trim().toLowerCase()===to.trim().toLowerCase()){setError('Choose different departure and destination places.');return;}if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<today()){setError('Enter today or a future date as YYYY-MM-DD.');return;}setBusy(true);try{const q=new URLSearchParams({from:from.trim(),to:to.trim(),date,mode,demo:String(demo)});const r=await api<{journeys:Journey[]}>(`/journeys?${q}`);if(n===request.current){setJourneys(r.journeys);setPage('results');}}catch(e){if(n===request.current)setError(e instanceof Error?e.message:'Could not find rides. Please retry.');}finally{if(n===request.current)setBusy(false);}}
 function track(j:Journey){setSelected(j);setData(null);setNotice('');setPage('tracking');}
 async function save(){if(!selected)return;if(!user){onProfile();return;}setSaveBusy(true);try{await api('/saved-journeys','POST',{tripId:selected.id,date});await loadSaved();setNotice('Journey saved. Find it on Home.');}catch(e){setNotice(e instanceof Error?e.message:'Could not save journey.');}finally{setSaveBusy(false);}}
 async function rename(){if(!editing)return;setSaveBusy(true);try{await api(`/saved-journeys/${editing.id}`,'PATCH',{label});await loadSaved();setDialog(null);}catch(e){setSavedError(e instanceof Error?e.message:'Could not rename.');}finally{setSaveBusy(false);}}
 async function remove(j:SavedJourney){try{await api(`/saved-journeys/${j.id}`,'DELETE');setSaved(v=>v.filter(x=>x.id!==j.id));}catch{setSavedError('Could not remove the saved journey. Retry.');}}
 function removeConfirm(j:SavedJourney){if(Platform.OS==='web'){if(globalThis.confirm('Remove this saved journey?'))void remove(j);}else Alert.alert('Remove saved journey?',j.label,[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>void remove(j)}]);}
 const stale=!!data&&(data.stale||!!trackingError||!data.updatedAt||Date.now()-Date.parse(data.updatedAt)>60000);
 const field=(title:string,value:string,onChange:(v:string)=>void,icon:TransitIconName,action?:{label:string;onPress:()=>void;busy?:boolean})=><View style={s.field}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={s.label}>{title}</Text>{action&&<Pressable accessibilityRole="button" onPress={action.onPress} style={{paddingVertical:2,paddingHorizontal:7,borderRadius:8,backgroundColor:c.mint}}><Text style={{color:c.teal,fontSize:11,fontWeight:'700'}}>{action.busy?'Detecting…':action.label}</Text></Pressable>}</View><View style={s.inputWrap}><TransitIcon name={icon} size={20}/><TextInput accessibilityLabel={title} value={value} onChangeText={onChange} style={s.input} placeholder={title==='Travel date'?'YYYY-MM-DD':title} placeholderTextColor={c.muted} maxLength={title==='Travel date'?10:80} autoCapitalize="words"/></View></View>;
if (page === 'createPost') {
  return (
    <CreatePostScreen
      onBack={() => setPage('community')}
      onPublished={(post) => {
        setPublishedPost(post);
        setPage('postPublished');
      }}
      onNotifications={onNotifications}
    />
  );
}

if (page === 'postPublished') {
  return (
    <PostPublishedScreen
      post={publishedPost}
      onBack={() => setPage('community')}
      onViewPost={() => {if (publishedPost) {setSelectedLostFoundPostId(publishedPost.id);} setPage('postDetails'); }}
      onBackToCommunity={() => setPage('community')}
    />
  );
}
if (page === 'postDetails') {
  return (
    <PostDetailsScreen
      postId={selectedLostFoundPostId}
      onBack={() => setPage('community')}
      onNotifications={onNotifications}
    />
  );
}
 if (page === 'community') {
  return (
    <CommunityScreen
      onBack={() => setPage('home')}
      onCreatePost={() => {
       if (user) {
        setPage('createPost');
       } else {
         onProfile();
       }
    }}
      onOpenPost={(postId) => { setSelectedLostFoundPostId(postId); setPage('postDetails');}}
      onHome={() => setPage('home')}
      onTickets={() => {
        setPage('home');
        setDialog('tickets');
      }}
      onProfile={onProfile}
      onNotifications={onNotifications}
    />
  );
}
 return <View style={s.stage}><View style={[s.screen,{paddingTop:Math.max(insets.top,Platform.OS==='web'?10:14)}]}>
 <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={s.iconButton}><Icon name="back" size={20}/></Pressable><Text style={s.headerText}>{page==='home'?'TransitLK':page==='results'?'Available rides':`Track your ${selected?.mode||mode}`}</Text><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={onNotifications} style={s.iconButton}><Icon name="bell" size={20}/></Pressable></View>
 <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
 {page==='home'&&<><Text style={s.eyebrow}>HELLO, {user?.name.split(' ')[0].toUpperCase()||'TRAVELLER'}</Text><Text style={s.title}>Where to today?</Text>
 <View style={s.segment}>{(['bus','train'] as const).map(m=><Pressable key={m} accessibilityRole="button" accessibilityState={{selected:mode===m}} onPress={()=>{setMode(m);setFrom(m==='bus'?'Horana':'Panadura');setTo('Colombo');}} style={[s.segmentButton,mode===m&&s.activeSegment]}><TransitIcon name={m} color={mode===m?'white':c.teal}/><Text style={[s.segmentText,mode===m&&{color:'white'}]}>{m==='bus'?'Bus':'Train'}</Text></Pressable>)}</View>
 {field('From',from,setFrom,'pin',{label:'📍 Auto GPS',onPress:()=>void detectGps(),busy:gpsBusy})}<Pressable accessibilityRole="button" accessibilityLabel="Swap departure and destination" onPress={()=>{setFrom(to);setTo(from);}} style={s.swap}><TransitIcon name="swap" size={18}/></Pressable>{field('To',to,setTo,'pin')}{field('Travel date',date,setDate,'clock')}
 <View style={s.sourceRow}><Text style={s.small}>Journey source</Text><Pressable accessibilityRole="switch" accessibilityState={{checked:demo}} accessibilityLabel="Use demonstration journeys" onPress={()=>setDemo(!demo)} style={s.pill}><Text style={s.pillText}>{demo?'Demo journeys':'Live services'} · change</Text></Pressable></View>
 {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}<Action label="Find my ride" onPress={()=>void search()} busy={busy}/>
 <Text style={s.sectionTitle}>A better way to get there</Text><Text style={s.body}>Live arrivals. Digital tickets. Less waiting.</Text>{demo&&<Text style={s.small}>Demo: bus Horana ↔ Colombo; train Panadura ↔ Colombo. Times, fares and GPS movement are illustrative.</Text>}
 {user&&<><Text style={s.sectionTitle}>Saved journeys</Text>{!!savedError&&<Pressable onPress={()=>void loadSaved()}><Text style={s.error}>{savedError}</Text></Pressable>}{saved.length===0?<Text style={s.body}>Save a journey from its tracking screen.</Text>:saved.map(j=><View key={j.id} style={s.savedCard}><Text style={s.cardTitle}>{j.label}</Text><Text style={s.small}>{j.date} · {j.mode} · {j.source==='demo'?'Demo':'Live'}</Text><View style={s.savedActions}><Pressable accessibilityRole="button" onPress={()=>{setDate(j.date);track({id:j.tripId,mode:j.mode,from:j.from,to:j.to,date:j.date,source:j.source,route:'',departure:'',arrival:'',fare:0,path:[]});}}><Text style={s.link}>Track</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>{setEditing(j);setLabel(j.label);setDialog('rename');}}><Text style={s.link}>Rename</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>removeConfirm(j)}><Text style={[s.link,{color:c.error}]}>Remove</Text></Pressable></View></View>)}</>}
 </>}
 {page==='results'&&<><Text style={s.title}>{from} → {to}</Text><Text style={s.body}>{date} · 1 passenger</Text><Text style={s.source}>{demo?'DEMO SERVICES · Illustrative schedules':'LIVE SERVICE CATALOG'}</Text>{journeys.length===0?<View style={s.card}><TransitIcon name={mode} size={32}/><Text style={s.sectionTitle}>No rides found</Text><Text style={s.body}>{demo?'Try the demo routes shown on Home.':'No operator has published a matching service yet.'}</Text><Action label="Change search" onPress={()=>setPage('home')}/></View>:journeys.map((j,i)=><View key={j.id} style={s.result}><View style={s.card}><View style={s.row}><View style={s.pill}><Text style={s.pillText}>{j.mode.toUpperCase()} {j.route}</Text></View><Text style={s.small}>Direct service</Text></View><View style={s.stopRow}><View style={[s.dot,{backgroundColor:c.teal}]}/><Text style={s.stop}>{j.from}</Text><Text style={s.time}>{j.departure}</Text></View><View style={s.stopRow}><View style={[s.dot,{backgroundColor:'#FF866D'}]}/><Text style={s.stop}>{j.to}</Text><Text style={s.small}>{j.arrival}</Text></View></View><View style={s.fareRow}><Text style={s.pillText}>{i===0?'FIRST SERVICE':'NEXT SERVICE'}</Text><Text style={s.fare}>Rs. {j.fare}</Text></View><Action label={`Track this ${j.mode}`} onPress={()=>track(j)}/></View>)}</>}
 {page==='tracking'&&selected&&<><Text style={s.title}>{stale?'Waiting for a GPS update':data?.source==='demo'?'Your demo ride is on its way':'Your ride, on the map'}</Text><Text style={s.body}>Route {data?.trip.route||selected.route} · {data?.updatedAt?new Date(data.updatedAt).toLocaleTimeString():'Connecting…'}</Text>
 <View style={s.map}>{data?<JourneyMap data={data}/>:<View style={s.loading}><ActivityIndicator color={c.teal}/><Text style={s.body}>Loading route…</Text></View>}<View style={s.mapBadge}><Text style={s.pillText}>{data?.source==='demo'?'DEMO GPS':stale?'STALE GPS':'GPS'}</Text></View></View>
 {data?.source==='demo'&&<Text style={s.small}>Simulated vehicle position on a real map. Route line is illustrative.</Text>}{!!trackingError&&<Text accessibilityRole="alert" style={s.error}>{trackingError}</Text>}{stale&&<Text style={s.error}>Arrival and crowd estimates are unavailable until fresh data arrives.</Text>}
 <View style={[s.card,s.stats]}><View><Text style={[s.stat,{color:c.teal}]}>{!stale&&data?.etaMinutes!=null?`${data.etaMinutes} min`:'—'}</Text><Text style={s.small}>Estimated arrival</Text></View><View><Text style={s.stat}>{!stale&&data?.crowdPercent!=null?`${data.crowdPercent}%`:'—'}</Text><Text style={s.small}>Crowd level</Text></View></View>
 <Action label="Buy ticket" onPress={()=>setDialog('tickets')}/><Action label={user?'Save journey':'Sign in to save journey'} secondary onPress={()=>void save()} busy={saveBusy}/><Pressable accessibilityRole="button" onPress={()=>setRetry(v=>v+1)} style={s.refresh}><TransitIcon name="refresh" size={17}/><Text style={s.link}>Refresh location</Text></Pressable>{!!notice&&<Text accessibilityRole="alert" style={s.body}>{notice}</Text>}
 </>}
 </ScrollView>
 {page!=='tracking'&&<View style={[s.nav,{paddingBottom:Math.max(insets.bottom,8)}]}>{([{icon:'home',label:'Home',action:()=>setPage('home')},{icon:'ticket',label:'Tickets',action:()=>setDialog('tickets')},{icon:'community',label:'Community',action:()=>setPage('community')},{icon:'profile',label:'Profile',action:onProfile}] as {icon:TransitIconName;label:string;action:()=>void}[]).map(item=><Pressable accessibilityRole="button" key={item.label} onPress={item.action} style={[s.navItem,item.icon==='home'&&s.navActive]}><TransitIcon name={item.icon} color={item.icon==='home'?c.teal:c.muted} size={21}/><Text style={[s.navText,item.icon==='home'&&{color:c.teal}]}>{item.label}</Text></Pressable>)}</View>}
 </View>
 {Platform.OS==='web'?(dialog!==null&&<View style={s.overlay}><View style={[s.dialog,{paddingBottom:Math.max(insets.bottom,24)}]}><Pressable accessibilityRole="button" accessibilityLabel="Close dialog" style={s.dialogClose} onPress={()=>setDialog(null)}><Icon name="close"/></Pressable><Text style={s.title}>{dialog==='rename'?'Rename journey':dialog==='tickets'?'Tickets':'Community'}</Text>{dialog==='rename'?<>{field('Journey label',label,setLabel,'bookmark')}<Action label="Save label" onPress={()=>void rename()} busy={saveBusy}/>{!!savedError&&<Text style={s.error}>{savedError}</Text>}</>:<><Text style={s.body}>{dialog==='tickets'?'Ticket purchases are not connected yet. No payment or reservation has been made.':'Community conversations are not connected yet. Your journey search and GPS tracking are available on Home.'}</Text><Action label="Back to journey" onPress={()=>setDialog(null)}/></>}</View></View>):<Modal visible={dialog!==null} transparent animationType="slide" onRequestClose={()=>setDialog(null)}><View style={s.overlay}><View style={[s.dialog,{paddingBottom:Math.max(insets.bottom,24)}]}><Pressable accessibilityRole="button" accessibilityLabel="Close dialog" style={s.dialogClose} onPress={()=>setDialog(null)}><Icon name="close"/></Pressable><Text style={s.title}>{dialog==='rename'?'Rename journey':dialog==='tickets'?'Tickets':'Community'}</Text>{dialog==='rename'?<>{field('Journey label',label,setLabel,'bookmark')}<Action label="Save label" onPress={()=>void rename()} busy={saveBusy}/>{!!savedError&&<Text style={s.error}>{savedError}</Text>}</>:<><Text style={s.body}>{dialog==='tickets'?'Ticket purchases are not connected yet. No payment or reservation has been made.':'Community conversations are not connected yet. Your journey search and GPS tracking are available on Home.'}</Text><Action label="Back to journey" onPress={()=>setDialog(null)}/></>}</View></View></Modal>}
 </View>;
}
const s=StyleSheet.create({stage:{flex:1,width:'100%',backgroundColor:c.background,alignItems:'center'},screen:{flex:1,width:'100%',maxWidth:430,backgroundColor:c.background,position:'relative'},header:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,marginBottom:16},iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},headerText:{flex:1,fontSize:16,fontWeight:'700',color:c.navy},content:{paddingHorizontal:24,paddingBottom:32,gap:12},eyebrow:{color:c.teal,fontSize:11,fontWeight:'700',marginBottom:-8},title:{fontSize:27,lineHeight:33,fontWeight:'700',color:c.navy,letterSpacing:-.5},segment:{flexDirection:'row',padding:5,backgroundColor:'white',borderRadius:17,marginTop:10,marginBottom:10},segmentButton:{flex:1,minHeight:44,borderRadius:12,flexDirection:'row',gap:12,alignItems:'center',justifyContent:'center'},activeSegment:{backgroundColor:c.teal},segmentText:{color:c.muted,fontSize:15,fontWeight:'700'},field:{gap:8,marginBottom:3},label:{fontSize:13,color:c.muted},inputWrap:{backgroundColor:'white',borderWidth:1,borderColor:c.border,borderRadius:13,flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:12},input:{flex:1,minHeight:49,color:c.navy,fontSize:15,paddingVertical:10},swap:{alignSelf:'flex-end',height:30,width:44,alignItems:'center',justifyContent:'center',marginVertical:-15,zIndex:1,backgroundColor:c.mint,borderRadius:12},sourceRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginVertical:4},pill:{backgroundColor:c.mint,paddingVertical:7,paddingHorizontal:13,borderRadius:20},pillText:{fontSize:11,color:c.teal,fontWeight:'700'},small:{color:c.muted,fontSize:12,lineHeight:19},action:{minHeight:52,padding:16,borderRadius:15,backgroundColor:c.teal,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:7},secondary:{backgroundColor:'white',borderWidth:1,borderColor:c.border},actionText:{color:'white',fontSize:15,fontWeight:'700'},sectionTitle:{fontSize:18,color:c.navy,fontWeight:'700',marginTop:15},body:{color:c.muted,fontSize:14,lineHeight:22},error:{color:c.error,fontSize:13,lineHeight:21},source:{fontSize:10,color:c.teal,fontWeight:'700',marginVertical:8},card:{backgroundColor:'white',borderWidth:1,borderColor:c.border,borderRadius:20,padding:20,gap:15},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},stopRow:{flexDirection:'row',alignItems:'center',gap:11},dot:{width:9,height:9,borderRadius:5},stop:{flex:1,color:c.navy,fontWeight:'700',fontSize:17},time:{color:c.navy,fontSize:12,fontWeight:'700'},fareRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:15,paddingTop:15},fare:{fontSize:21,fontWeight:'700',color:c.navy},result:{marginBottom:17},map:{height:290,borderRadius:22,overflow:'hidden',backgroundColor:c.mint,marginTop:12},mapBadge:{position:'absolute',top:14,left:14,padding:9,backgroundColor:c.mint,borderRadius:18},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:15},stats:{flexDirection:'row',justifyContent:'space-between',padding:22,marginVertical:12},stat:{fontSize:31,fontWeight:'700',color:c.navy,marginBottom:6},refresh:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:14},link:{fontSize:14,fontWeight:'600',color:c.teal,paddingVertical:8},nav:{flexDirection:'row',backgroundColor:'white',borderTopWidth:1,borderColor:c.border,paddingTop:10,paddingHorizontal:16,justifyContent:'space-between'},navItem:{alignItems:'center',justifyContent:'center',minHeight:54,minWidth:62,padding:7,gap:5},navActive:{backgroundColor:c.mint,borderRadius:16},navText:{fontSize:10,color:c.muted},savedCard:{padding:17,backgroundColor:'white',borderRadius:15,borderWidth:1,borderColor:c.border,gap:5},cardTitle:{fontSize:16,fontWeight:'700',color:c.navy},savedActions:{flexDirection:'row',justifyContent:'space-between'},overlay:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(11,29,39,0.45)',alignItems:'center',justifyContent:'flex-end',zIndex:100},dialog:{backgroundColor:c.background,width:'100%',maxWidth:430,borderTopLeftRadius:25,borderTopRightRadius:25,padding:24,gap:18},dialogClose:{alignSelf:'flex-end',padding:8}});
