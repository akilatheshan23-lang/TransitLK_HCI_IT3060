import React,{useRef,useEffect} from 'react';
import {StyleSheet,View,Text} from 'react-native';
import MapView,{Marker,Polyline} from 'react-native-maps';
import {Place,Point} from './routing';
export type CanvasProps={from?:Place;to?:Place;points:Point[];user?:Point|null;vehicle?:Point|null;vehicleLabel?:string};
export default function RouteCanvas({from,to,points,user,vehicle,vehicleLabel}:CanvasProps){
 const map=useRef<MapView>(null);
 const fit=()=>{const all=[...points,...[from,to,user,vehicle].filter(Boolean)] as Point[];if(all.length)map.current?.fitToCoordinates(all,{edgePadding:{top:45,bottom:45,left:35,right:35},animated:true});};
 useEffect(fit,[from,to,points,!!vehicle]);
 return <MapView ref={map} style={StyleSheet.absoluteFill} onMapReady={fit} initialRegion={{latitude:7.2,longitude:80.5,latitudeDelta:3,longitudeDelta:3}}>
 {points.length>1&&<Polyline coordinates={points} strokeColor="#008783" strokeWidth={5}/>}
 {from&&<Marker coordinate={from} title={`Start: ${from.label}`} pinColor="#008783"/>}
 {to&&<Marker coordinate={to} title={`Destination: ${to.label}`} pinColor="#DC2626"/>}
 {user&&<Marker coordinate={user} title="Your current location" pinColor="#2563EB"/>}
 {vehicle&&<Marker coordinate={vehicle} title={vehicleLabel || "Bus GPS"}><View style={{backgroundColor:'#12304A',padding:8,borderRadius:14,borderWidth:2,borderColor:'white'}}><Text style={{fontSize:24}}>🚌</Text></View></Marker>}
 </MapView>;
}
