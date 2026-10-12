import React, {useRef} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import MapView, {Marker, Polyline} from 'react-native-maps';
import {TransitIcon} from '../TransitIcon';
export type BusMapProps = {
  from: {lat:number; lon:number}; to: {lat:number; lon:number};
  origin: string; destination: string; route: string; plate: string;
};
export default function BusTrackingMap({from,to,origin,destination,route,plate}:BusMapProps) {
  const map=useRef<MapView>(null);
  const start={latitude:from.lat,longitude:from.lon};
  const end={latitude:to.lat,longitude:to.lon};
  const bus={latitude:from.lat*.45+to.lat*.55,longitude:from.lon*.45+to.lon*.55};
  const points=[start,
    {latitude:(from.lat*2+to.lat)/3+.005,longitude:(from.lon*2+to.lon)/3-.004},
    {latitude:(from.lat+to.lat*2)/3+.003,longitude:(from.lon+to.lon*2)/3-.002},end];
  const fit=()=>map.current?.fitToCoordinates(points,{edgePadding:{top:60,right:40,bottom:55,left:40},animated:false});
  return <View style={styles.fill}>
    <MapView ref={map} style={styles.fill} onMapReady={fit}
      initialRegion={{...bus,latitudeDelta:.3,longitudeDelta:.3}}>
      <Polyline coordinates={points} strokeColor="#007A74" strokeWidth={5}/>
      <Marker coordinate={start} title={`A · ${origin}`} pinColor="#059669"/>
      <Marker coordinate={end} title={`B · ${destination}`} pinColor="#DC2626"/>
      <Marker coordinate={bus} title={`Demo bus ${route} · ${plate}`} description="Illustrative position, not live GPS">
        <View style={styles.bus}><TransitIcon name="bus" color="white"/><Text style={styles.label}>{route}</Text></View>
      </Marker>
    </MapView>
    <View style={styles.controls}>
      <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={()=>map.current?.animateToRegion({...bus,latitudeDelta:.03,longitudeDelta:.03},500)}><Text>Center bus</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={fit}><Text>Full route</Text></TouchableOpacity>
    </View>
  </View>;
}
const styles=StyleSheet.create({fill:{position:'absolute',top:0,left:0,right:0,bottom:0},controls:{position:'absolute',top:8,right:8,gap:6},button:{backgroundColor:'white',padding:10,borderRadius:8,elevation:3},bus:{backgroundColor:'#007A74',padding:8,borderRadius:16,borderWidth:2,borderColor:'white',flexDirection:'row',alignItems:'center',gap:5},label:{color:'white',fontWeight:'700'}});
