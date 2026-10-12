import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,AppState} from 'react-native';
import RouteCanvas from './RouteCanvas';
import {demoFrame} from './demoMotion';
import type {CanvasProps} from './RouteCanvas';
export default function DemoRouteMap({onDemo,...props}:CanvasProps & {onDemo?:(value:{speedKmh:number;etaMinutes:number}|null)=>void}){
 const [elapsed,setElapsed]=useState(0),[playing,setPlaying]=useState(true);
 useEffect(()=>{setElapsed(0);setPlaying(true);},[props.points]);
 useEffect(()=>{if(!playing)return;let last=Date.now();const timer=setInterval(()=>{const now=Date.now();if(AppState.currentState==='active'||AppState.currentState==null)setElapsed(t=>t+(now-last)/1000);last=now;},500);return()=>clearInterval(timer);},[playing]);
 const frame=demoFrame(props.points,elapsed);
 useEffect(()=>{onDemo?.({speedKmh:playing?frame.speedKmh:0,etaMinutes:frame.etaMinutes});},[playing,frame.speedKmh,frame.etaMinutes,onDemo]);
 useEffect(()=>()=>onDemo?.(null),[onDemo]);
 return <View style={{flex:1}}><RouteCanvas {...props} vehicle={frame.position} vehicleLabel="Demo bus · simulated movement"/>
 <View style={{position:'absolute',top:8,left:8,right:8,backgroundColor:'white',padding:10,borderRadius:10,gap:6}}><Text style={{fontWeight:'700',color:'#007A74'}}>DEMO BUS · {frame.arrived?'Arrived':playing?'Moving':'Paused'} · {playing?frame.speedKmh:0} km/h · {frame.etaMinutes} min</Text><View style={{flexDirection:'row',gap:20}}><Pressable accessibilityRole="button" onPress={()=>setPlaying(p=>!p)}><Text>{playing?'Pause':'Resume'}</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>{setElapsed(0);setPlaying(true);}}><Text>Restart</Text></Pressable></View></View>
 </View>;
}
