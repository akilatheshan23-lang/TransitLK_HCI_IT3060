import TransitApp from './src/TransitApp';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BusArtwork, Icon } from './src/Artwork';
import { colors as c } from './src/theme';
import { copy, Language } from './src/i18n';
import { api, ApiError, restoreSession, saveSession, User } from './src/api';

type Sheet = 'register'|'login'|'profile'|'notifications'|'about'|null;
function Button({ label, onPress, secondary=false, busy=false }: {label:string;onPress:()=>void;secondary?:boolean;busy?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress} style={({pressed})=>[s.button,secondary&&s.secondary,pressed&&s.pressed,busy&&{opacity:.65}]}>
    <Text style={[s.buttonText,secondary&&{color:c.navy}]}>{label}</Text>
    {busy?<ActivityIndicator color={secondary?c.teal:c.white}/>:<Icon name="arrow" size={21} color={secondary?c.teal:c.white}/>}
  </Pressable>;
}
function Welcome() {
  const insets=useSafeAreaInsets();
  const [showTransit,setShowTransit]=useState(false);
  const [lang,setLang]=useState<Language>('en');
  const t=copy[lang];
  const [sheet,setSheet]=useState<Sheet>(null);
  const [user,setUser]=useState<User|null>(null);
  const [busy,setBusy]=useState(false);
  const [restoring,setRestoring]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [notificationState,setNotificationState]=useState<'loading'|'ready'|'error'>('loading');
  useEffect(()=>{ let active=true;
    (async()=>{
      try {const local=await AsyncStorage.getItem('transitlk-language');if(active&&['en','ta','si'].includes(local||''))setLang(local as Language);
        if(await restoreSession()) {try {const data=await api<{user:User}>('/me');if(active){setUser(data.user);setLang(data.user.language);setShowTransit(true);}}catch(e){if(e instanceof ApiError&&e.status===401)await saveSession(null);}}
      } catch { /* Home remains usable even when browser storage is unavailable. */ }
      finally {if(active)setRestoring(false);}
    })(); return()=>{active=false;};
  },[]);
  function open(value:Sheet) {setError('');setNotice('');setPassword('');setConfirm('');setSheet(value);if(value==='notifications')void loadNotifications();}
  async function loadNotifications() {
    setNotificationState('loading');
    try {await api('/home');setNotificationState('ready');}catch{setNotificationState('error');}
  }
  async function changeLanguage(value:Language) {
    if(busy||value===lang)return;
    setBusy(true);setNotice('');
    try {
      if(user){const data=await api<{user:User}>('/me/preferences','PATCH',{language:value});setUser(data.user);}
      setLang(value);
      await AsyncStorage.setItem('transitlk-language',value);
    }catch(e){setNotice(e instanceof ApiError?e.message:t.offline);}
    finally{setBusy(false);}
  }
  async function submit() {
    if(!/^\S+@\S+\.\S+$/.test(email.trim())||password.length<8||password.length>128||(sheet==='register'&&name.trim().length<2)){setError(t.invalid);return;}
    if(sheet==='register'&&password!==confirm){setError(t.mismatch);return;}
    setBusy(true);setError('');
    try {
      const payload=sheet==='register'?{name:name.trim(),email:email.trim(),password,language:lang}:{email:email.trim(),password};
      const data=await api<{user:User;token:string}>(sheet==='register'?'/auth/register':'/auth/login','POST',payload);
      try {await saveSession(data.token);}catch{setError(t.storage);return;}
      setUser(data.user);setLang(data.user.language);setPassword('');setConfirm('');setSheet(null);setShowTransit(true);
      await AsyncStorage.setItem('transitlk-language',data.user.language).catch(()=>{});
    }catch(e){setError(e instanceof ApiError?e.message:t.offline);}finally{setBusy(false);}
  }
  async function logout(){setBusy(true);setError('');try{await api('/auth/logout','POST');await saveSession(null);setUser(null);setSheet(null);setShowTransit(false);}catch(e){if(e instanceof ApiError&&e.status===401){await saveSession(null);setUser(null);setSheet(null);}else setError(t.offline);}finally{setBusy(false);}}
  const title=sheet==='register'?t.next:sheet==='login'?t.loginTitle:sheet==='notifications'?t.notifications:sheet==='profile'?t.signedIn:'TransitLK';
  const field=(label:string,value:string,setValue:(v:string)=>void,secure=false,isEmail=false)=><View style={s.field} key={label}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={setValue} secureTextEntry={secure} autoCapitalize={secure||isEmail?'none':'words'} autoCorrect={!secure&&!isEmail} keyboardType={isEmail?'email-address':'default'} maxLength={isEmail?254:secure?128:80} autoComplete={isEmail?'email':secure?(sheet==='register'?'new-password':'current-password'):'name'} style={s.input} placeholder={secure?t.passwordHint:isEmail?'name@example.com':label} placeholderTextColor={c.muted} editable={!busy} onSubmitEditing={secure&&sheet==='login'?submit:undefined}/></View>;
  return <View style={s.stage}><StatusBar style="dark"/>{showTransit?<TransitApp user={user} onProfile={()=>open(user?'profile':'login')} onWelcome={()=>setShowTransit(false)} onNotifications={()=>open('notifications')}/>:<View style={[s.screen,{paddingTop:Math.max(insets.top,Platform.OS==='web'?30:12)}]}>
    <ScrollView contentContainerStyle={[s.content,{paddingBottom:Math.max(insets.bottom,16)}]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel={t.back} onPress={()=>open('about')} style={s.iconButton}><Icon name="back" size={20}/></Pressable><Text style={s.headerTitle}>{t.welcome}</Text><Pressable accessibilityRole="button" accessibilityLabel={t.notifications} onPress={()=>open('notifications')} style={s.iconButton}><Icon name="bell" size={20}/></Pressable></View>
      <View style={s.brand}><View style={s.brandIcon}><Icon name="bus" color="white" size={25}/></View><Text style={s.brandName}>TransitLK</Text></View>
      <View style={s.headline}><Text accessibilityRole="header" style={s.city}>{t.city}</Text><Text style={s.journey}>{t.journey}</Text></View>
      <View style={s.artwork}><BusArtwork/></View>
      <View style={s.caption}><Text style={s.tagline}>{t.tagline}</Text><Text style={s.description}>{t.description}</Text></View>
      <View style={s.spacer}/>
      <View style={s.actions}>
        <Button label={user?'Find my ride':t.start} onPress={()=>user?setShowTransit(true):open('register')} busy={restoring}/>
        {!user&&<Pressable accessibilityRole="button" onPress={()=>setShowTransit(true)} style={s.switch}><Text style={s.switchText}>Explore journeys</Text></Pressable>}
        {!user&&<Button label={t.account} onPress={()=>open('login')} secondary busy={restoring}/>}
        {!!notice&&<Text accessibilityRole="alert" style={s.error}>{notice}</Text>}
      </View>
      <View style={s.languages} accessibilityLabel={t.language}>{([{value:'en',label:'ENGLISH'},{value:'ta',label:'தமிழ்'},{value:'si',label:'සිංහල'}] as const).map(l=><Pressable key={l.value} onPress={()=>void changeLanguage(l.value)} disabled={busy} accessibilityRole="button" accessibilityLabel={l.label} accessibilityState={{selected:lang===l.value,disabled:busy}} style={s.languageButton}><Text style={[s.languageText,lang===l.value&&s.languageSelected]}>{l.label}</Text></Pressable>)}</View>
    </ScrollView>
  </View>}
  <Modal visible={sheet!==null} transparent animationType="slide" onRequestClose={()=>{if(!busy)setSheet(null);}}>
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={[s.sheet,{paddingBottom:Math.max(insets.bottom,24)}]} accessibilityViewIsModal>
        <View style={s.sheetTop}><View style={s.handle}/><Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={t.close} onPress={()=>setSheet(null)} style={s.close}><Icon name="close"/></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.sheetContent}>
          <Text accessibilityRole="header" style={s.sheetTitle}>{title}</Text>
          {(sheet==='register'||sheet==='login')&&<><Text style={s.sheetIntro}>{sheet==='register'?t.formIntro:t.loginIntro}</Text>{sheet==='register'&&field(t.name,name,setName)}{field(t.email,email,setEmail,false,true)}{field(t.password,password,setPassword,true)}{sheet==='register'&&field(t.confirm,confirm,setConfirm,true)}{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}<Button label={sheet==='register'?t.register:t.login} onPress={()=>void submit()} busy={busy}/><Pressable accessibilityRole="button" onPress={()=>open(sheet==='register'?'login':'register')} disabled={busy} style={s.switch}><Text style={s.switchText}>{sheet==='register'?t.account:t.register}</Text></Pressable></>}
          {sheet==='profile'&&user&&<><View style={s.successIcon}><Icon name="check" size={32} color={c.teal}/></View><Text style={s.profileName}>{user.name}</Text><Text style={s.centerText}>{user.email}</Text><Text style={s.sheetIntro}>{t.saved}</Text><Button label="Find my ride" onPress={()=>{setSheet(null);setShowTransit(true);}}/>{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}<Button label={t.logout} onPress={()=>void logout()} secondary busy={busy}/></>}
          {sheet==='notifications'&&<View style={s.empty}>{notificationState==='loading'?<ActivityIndicator color={c.teal}/>:notificationState==='error'?<><Text accessibilityRole="alert" style={s.centerText}>{t.offline}</Text><Button label={t.retry} onPress={()=>void loadNotifications()}/></>:<><View style={s.successIcon}><Icon name="bell" size={30} color={c.teal}/></View><Text style={s.emptyTitle}>{t.empty}</Text><Text style={s.centerText}>{t.emptyBody}</Text></>}</View>}
          {sheet==='about'&&<><View style={s.aboutArt}><BusArtwork/></View><Text style={s.tagline}>{t.tagline}</Text><Text style={s.sheetIntro}>{t.description}</Text><Button label={t.close} onPress={()=>setSheet(null)}/></>}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
  </View>;
}
export default function App(){return <SafeAreaProvider><Welcome/></SafeAreaProvider>;}
const s=StyleSheet.create({
  stage:{flex:1,backgroundColor:'#0B1D27',alignItems:'center',justifyContent:'center'},
  screen:{flex:1,width:'100%',maxWidth:430,backgroundColor:c.background},
  content:{flexGrow:1,paddingHorizontal:24},
  header:{flexDirection:'row',alignItems:'center',marginLeft:-8,marginRight:-8,marginBottom:20,gap:4},
  iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},
  headerTitle:{flex:1,fontSize:17,fontWeight:'700',color:c.navy},
  brand:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:28},
  brandIcon:{width:39,height:39,borderRadius:13,backgroundColor:c.teal,alignItems:'center',justifyContent:'center'},
  brandName:{fontSize:25,fontWeight:'700',color:c.navy,letterSpacing:-.6},
  headline:{gap:4,marginBottom:27},city:{fontSize:36,fontWeight:'700',color:c.navy,letterSpacing:-.7},journey:{fontSize:31,fontWeight:'700',color:c.teal,letterSpacing:-.5,lineHeight:39},
  artwork:{width:'100%',aspectRatio:344/210,borderRadius:22,overflow:'hidden'},
  caption:{marginTop:24,gap:9},tagline:{fontSize:18,fontWeight:'700',color:c.navy,letterSpacing:-.25},description:{fontSize:15,lineHeight:23,color:c.muted},spacer:{flexGrow:1,minHeight:44},
  actions:{gap:11},button:{minHeight:54,borderRadius:16,paddingHorizontal:20,paddingVertical:15,backgroundColor:c.teal,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},secondary:{backgroundColor:c.white,borderWidth:1,borderColor:c.border},buttonText:{fontSize:15,fontWeight:'700',color:c.white,flexShrink:1},pressed:{opacity:.8,transform:[{scale:.99}]},
  languages:{flexDirection:'row',justifyContent:'center',gap:7,marginTop:22},languageButton:{minWidth:80,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:8},languageText:{color:c.muted,fontSize:12},languageSelected:{color:c.teal,fontWeight:'600'},
  overlay:{flex:1,backgroundColor:'rgba(9,28,39,0.45)',alignItems:'center',justifyContent:'flex-end'},sheet:{width:'100%',maxWidth:430,maxHeight:'92%',borderTopLeftRadius:28,borderTopRightRadius:28,backgroundColor:c.background},sheetTop:{height:48,alignItems:'center'},handle:{width:40,height:4,borderRadius:2,backgroundColor:'#B7CBD3',marginTop:12},close:{position:'absolute',right:14,top:5,width:44,height:44,alignItems:'center',justifyContent:'center'},sheetContent:{padding:24,paddingTop:8},sheetTitle:{fontSize:27,fontWeight:'700',color:c.navy,marginBottom:8},sheetIntro:{fontSize:15,lineHeight:23,color:c.muted,marginBottom:24},field:{gap:8,marginBottom:18},label:{fontSize:13,fontWeight:'500',color:c.muted},input:{minHeight:52,borderWidth:1,borderColor:c.border,borderRadius:12,backgroundColor:c.white,paddingHorizontal:15,paddingVertical:12,fontSize:16,color:c.navy},error:{fontSize:14,color:c.error,lineHeight:21,marginBottom:16},switch:{padding:18,alignItems:'center'},switchText:{color:c.teal,fontSize:14,fontWeight:'600'},empty:{paddingVertical:26,gap:16},emptyTitle:{textAlign:'center',fontSize:20,fontWeight:'700',color:c.navy},centerText:{textAlign:'center',color:c.muted,fontSize:15,lineHeight:23},successIcon:{width:72,height:72,borderRadius:36,backgroundColor:c.mint,alignItems:'center',justifyContent:'center',alignSelf:'center',marginVertical:18},profileName:{fontSize:22,fontWeight:'700',color:c.navy,textAlign:'center',marginBottom:10},infoBox:{padding:18,backgroundColor:c.mint,borderRadius:14,marginBottom:24},aboutArt:{height:180,marginBottom:24}
});
