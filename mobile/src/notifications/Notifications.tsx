import React,{createContext,useContext,useState,useEffect,useCallback,useRef} from 'react';
import {View,Text,Pressable,Modal,FlatList,ActivityIndicator,AppState,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {api} from '../api';
import {Icon} from '../Artwork';
type Notice={id:string;title:string;message:string;kind:string;createdAt:string|null;read:boolean};
const Context=createContext({open:()=>{},unread:0});
export const useNotifications=()=>useContext(Context);
export function NotificationBell(){
 const {open,unread}=useNotifications();
 return <Pressable accessibilityRole="button" accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}`} onPress={open} style={s.bell}><Icon name="bell" size={23}/>{unread>0&&<View style={s.badge}><Text style={s.badgeText}>{unread>99?'99+':unread}</Text></View>}</Pressable>;
}
export function NotificationsProvider({userId,onSignIn,children}:{userId?:string;onSignIn:()=>void;children:React.ReactNode}){
 const [visible,setVisible]=useState(false),[items,setItems]=useState<Notice[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 const seq=useRef(0);
 const refresh=useCallback(async()=>{
   if(!userId)return;
   const request=++seq.current;setLoading(true);
   try{const data=await api<{notifications:Notice[]}>('/notifications');if(request===seq.current){setItems(data.notifications);setError('');}}
   catch(e){if(request===seq.current)setError(e instanceof Error?e.message:'Could not load notifications.');}
   finally{if(request===seq.current)setLoading(false);}
 },[userId]);
 useEffect(()=>{
   void refresh();
   const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},30000);
   const sub=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
   return()=>{seq.current++;clearInterval(timer);sub.remove();};
 },[refresh]);
 const markRead=async(ids:string[])=>{
   if(!ids.length || saving)return;setSaving(true);++seq.current;setLoading(false);
   try{await api('/notifications/read','PATCH',{ids});setItems(old=>old.map(n=>ids.includes(n.id)?{...n,read:true}:n));setError('');await refresh();}
   catch(e){setError(e instanceof Error?e.message:'Could not save read status.');}
   finally{setSaving(false);}
 };
 const unread=items.filter(n=>!n.read).length;
 return <Context.Provider value={{open:()=>{setVisible(true);void refresh();},unread}}>
 {children}
 <Modal visible={visible} animationType="slide" onRequestClose={()=>setVisible(false)}>
 <SafeAreaView style={s.screen}>
 <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Close notifications" style={s.bell} onPress={()=>setVisible(false)}><Icon name="back"/></Pressable><Text style={s.title}>Notifications</Text><Text>{unread} unread</Text></View>
 {!userId?<View style={s.empty}><Text style={s.title}>Sign in to see your updates</Text><Text style={s.body}>Notifications belong to your account.</Text><Pressable style={s.button} onPress={()=>{setVisible(false);onSignIn();}}><Text style={s.white}>Sign in</Text></Pressable></View>:<>
 <View style={s.tools}><Pressable accessibilityRole="button" onPress={()=>void refresh()} disabled={loading}><Text style={s.link}>Refresh</Text></Pressable><Pressable accessibilityRole="button" disabled={!unread||saving} onPress={()=>void markRead(items.filter(n=>!n.read).map(n=>n.id))}><Text style={[s.link,(!unread||saving)&&{opacity:.4}]}>Mark all read</Text></Pressable></View>
 {!!error&&<Text accessibilityRole="alert" style={s.error}>{error} Pull down or tap Refresh to retry.</Text>}
 {loading&&!items.length?<ActivityIndicator color="#008783"/>:null}
 <FlatList data={items} keyExtractor={n=>n.id} refreshing={loading} onRefresh={()=>void refresh()} contentContainerStyle={{padding:16,gap:12,flexGrow:1}} ListEmptyComponent={!loading&&!error?<View style={s.empty}><Text style={s.title}>You're all caught up</Text><Text style={s.body}>Your account updates will appear here.</Text></View>:null} renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={`${item.read?'Read':'Unread'}: ${item.title}. ${item.message}`} disabled={saving||item.read} onPress={()=>void markRead([item.id])} style={[s.card,!item.read&&s.unread]}><Text style={s.kind}>{item.kind.toUpperCase()} · {item.read?'Read':'Unread'}</Text><Text style={s.cardTitle}>{item.title}</Text><Text style={s.body}>{item.message}</Text>{item.createdAt&&<Text style={s.date}>{new Date(item.createdAt).toLocaleString()}</Text>}</Pressable>}/>
 <Text style={s.footer}>In-app updates refresh every 30 seconds while active.</Text>
 </>}
 </SafeAreaView></Modal></Context.Provider>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'#F3F7F9'},header:{flexDirection:'row',alignItems:'center',gap:12,padding:16},title:{fontSize:21,fontWeight:'700',color:'#12304A',flexShrink:1},bell:{width:44,height:44,alignItems:'center',justifyContent:'center'},badge:{position:'absolute',right:0,top:0,backgroundColor:'#008783',borderRadius:12,minWidth:19,padding:2,alignItems:'center'},badgeText:{color:'white',fontSize:10,fontWeight:'700'},tools:{flexDirection:'row',justifyContent:'space-between',padding:18},link:{color:'#007A74',fontWeight:'700'},card:{backgroundColor:'white',padding:18,borderRadius:16,borderWidth:1,borderColor:'#E0E8ED',gap:8},unread:{borderColor:'#008783',backgroundColor:'#E8F7F2'},kind:{fontSize:11,color:'#007A74',fontWeight:'700'},cardTitle:{fontSize:17,fontWeight:'700',color:'#12304A'},body:{fontSize:15,color:'#345066',lineHeight:22},date:{fontSize:12,color:'#607D94'},error:{color:'#A12626',padding:16},empty:{padding:24,gap:14},button:{padding:16,borderRadius:12,backgroundColor:'#008783',alignItems:'center'},white:{color:'white',fontWeight:'700'},footer:{padding:12,fontSize:12,textAlign:'center',color:'#607D94'}});
