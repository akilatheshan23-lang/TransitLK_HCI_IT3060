import React,{useEffect,useRef} from 'react';
import {View,StyleSheet,Platform} from 'react-native';
import MapView,{Marker,Polyline,PROVIDER_GOOGLE} from 'react-native-maps';
import {Tracking} from './transitTypes';
import {TransitIcon} from './TransitIcon';
export default function JourneyMap({data}:{data:Tracking}){
 const map=useRef<MapView>(null);const points=data.trip.path;
 const fit=()=>{if(points?.length)map.current?.fitToCoordinates(points,{edgePadding:{top:45,right:40,bottom:45,left:40},animated:false});};
 useEffect(fit,[data.trip.id]);
 return <MapView ref={map} style={StyleSheet.absoluteFill} provider={Platform.OS==='android'?PROVIDER_GOOGLE:undefined} initialRegion={{latitude:6.83,longitude:79.95,latitudeDelta:.3,longitudeDelta:.28}} onMapReady={fit} toolbarEnabled={false}>
 {points?.length>1&&<Polyline coordinates={points} strokeColor="#008783" strokeWidth={4}/>}
 {points?.length>0&&<><Marker coordinate={points[0]} title={data.trip.from} pinColor="#008783"/><Marker coordinate={points[points.length-1]} title={data.trip.to} pinColor="#FF866D"/></>}
 {data.position&&<Marker coordinate={data.position} title={`${data.source==='demo'?'Demo ':''}${data.trip.mode} ${data.trip.route}`}><View style={{backgroundColor:'#12304A',padding:9,borderRadius:12,borderWidth:2,borderColor:'white'}}><TransitIcon name={data.trip.mode} color="white" size={22}/></View></Marker>}
 </MapView>;
}
