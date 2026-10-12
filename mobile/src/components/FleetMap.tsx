import React,{useEffect,useRef} from 'react';
import {StyleSheet} from 'react-native';
import MapView,{Marker} from 'react-native-maps';
export interface FleetMapProps {
 buses: {route:string;plate:string;lat:number;lon:number;ontime:boolean}[];
 selectedRoute:string; onSelect:(route:string)=>void; fitRequest:number;
}
export default function FleetMap({buses,selectedRoute,onSelect,fitRequest}:FleetMapProps){
 const map=useRef<MapView>(null);
 const fit=()=>map.current?.fitToCoordinates(buses.map(b=>({latitude:b.lat,longitude:b.lon})),{edgePadding:{top:40,right:35,bottom:40,left:35},animated:true});
 useEffect(()=>{const b=buses.find(b=>b.route===selectedRoute);if(b)map.current?.animateToRegion({latitude:b.lat,longitude:b.lon,latitudeDelta:.035,longitudeDelta:.035},450);},[selectedRoute,buses]);
 useEffect(()=>{if(fitRequest)fit();},[fitRequest]);
 return <MapView ref={map} style={StyleSheet.absoluteFill} onMapReady={fit} initialRegion={{latitude:6.885,longitude:79.865,latitudeDelta:.2,longitudeDelta:.1}}>
 {buses.map(b=><Marker key={b.route} coordinate={{latitude:b.lat,longitude:b.lon}} title={`Demo route ${b.route} · ${b.plate}`} description="Example location, not live GPS" pinColor={b.route===selectedRoute?'#008783':b.ontime?'#12304A':'#D97706'} onPress={()=>onSelect(b.route)}/>)}
 </MapView>;
}
