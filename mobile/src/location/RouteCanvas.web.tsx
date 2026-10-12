import {GEOAPIFY_API_KEY} from '../geoapify';
import React,{useMemo,useRef,useEffect} from 'react';
import type {CanvasProps} from './RouteCanvas';
export default function RouteCanvas({from,to,points,user,vehicle,vehicleLabel}:CanvasProps){
 const frame=useRef<HTMLIFrameElement>(null);
 const payload={from,to,points,user,vehicle,vehicleLabel};
 const html=useMemo(()=>`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{margin:0;height:100%;width:100%}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
 const map=L.map('map').setView([7.2,80.5],7);L.tileLayer('https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(GEOAPIFY_API_KEY)}',{attribution:'Powered by <a href="https://www.geoapify.com/">Geoapify</a> | © <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(map);let group=L.featureGroup().addTo(map),signature='';
 const xy=p=>[p.latitude,p.longitude];
 function draw(d){group.clearLayers();if(d.points.length>1)L.polyline(d.points.map(xy),{color:'#008783',weight:5}).addTo(group);for(const [p,label,color] of [[d.from,'Start','#008783'],[d.to,'Destination','#DC2626'],[d.user,'You','#2563EB']]){if(p){const text=document.createElement('span');text.textContent=label+': '+(p.label||'Current location');L.circleMarker(xy(p),{radius:9,color,fillOpacity:1}).bindPopup(text).addTo(group);}}if(d.vehicle)L.marker(xy(d.vehicle),{icon:L.divIcon({html:'<span style="font-size:28px;background:white;border-radius:8px">🚌</span>',iconSize:[36,36]})}).bindPopup(()=>{const span=document.createElement('span');span.textContent=d.vehicleLabel||'Bus GPS';return span;}).addTo(group);const s=JSON.stringify([d.from,d.to,d.points,!!d.vehicle]);if(s!==signature&&group.getLayers().length){map.fitBounds(group.getBounds(),{padding:[35,35],maxZoom:15});signature=s;}}
 addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='route')draw(e.data.data)});parent.postMessage({type:'route-ready'},'*');
 </script></body></html>`,[]);
 const send=()=>frame.current?.contentWindow?.postMessage({type:'route',data:payload},'*');
 useEffect(()=>{send();const listener=(e:MessageEvent)=>{if(e.source===frame.current?.contentWindow&&e.data?.type==='route-ready')send();};window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);},[from,to,points,user,vehicle,vehicleLabel]);
 return <iframe ref={frame} title="Selected journey and current location" sandbox="allow-scripts" srcDoc={html} style={{width:'100%',height:'100%',border:0}}/>;
}
