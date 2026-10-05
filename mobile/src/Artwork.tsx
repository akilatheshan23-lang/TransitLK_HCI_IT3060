import React from 'react';
import Svg, { Rect, Path, Circle, Text as SvgText } from 'react-native-svg';
import { colors } from './theme';
export function Icon({name,size=22,color=colors.navy}:{name:'bus'|'back'|'arrow'|'bell'|'close'|'check';size?:number;color?:string}) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round">
    {name==='bus'?<><Rect x="5" y="3" width="14" height="16" rx="3"/><Path d="M5 11h14M8 19v2m8-2v2M8 15h1m6 0h1M8 6h8"/></>:name==='bell'?<><Path d="M6 16V9a6 6 0 0 1 12 0v7l2 2H4l2-2ZM10 21h4"/></>:name==='back'?<Path d="m10 5-7 7 7 7M3 12h18"/>:name==='arrow'?<Path d="m14 5 7 7-7 7M3 12h18"/>:name==='close'?<Path d="m6 6 12 12M18 6 6 18"/>:<Path d="m5 12 4 4L19 6"/>}
  </Svg>;
}
// Vector recreation of the supplied welcome illustration; no screenshot embedded.
export function BusArtwork() {
 return <Svg width="100%" height="100%" viewBox="0 0 344 210" accessibilityLabel="A teal TransitLK bus travelling through the city" role="img">
  <Rect width="344" height="210" rx="22" fill={colors.mint}/>
  <Circle cx="277" cy="43" r="23" fill="#FFCCA9"/>
  <Path d="M16 176H326" stroke="#8FCEC3" strokeWidth="3" strokeLinecap="round"/>
  <Rect x="12" y="128" width="30" height="35" rx="4" fill="#B6DDD8"/>
  <Rect x="58" y="109" width="30" height="54" rx="4" fill="#B6DDD8"/>
  <Rect x="104" y="90" width="29" height="73" rx="4" fill="#B6DDD8"/>
  <Rect x="241" y="90" width="28" height="73" rx="4" fill="#B6DDD8"/>
  <Rect x="284" y="128" width="30" height="35" rx="4" fill="#B6DDD8"/>
  {[20,65,112,249,292].map((x,i)=><React.Fragment key={x}><Rect x={x} y={[135,116,97,97,135][i]} width="5" height="7" rx="1" fill="#EAF9F5"/><Rect x={x} y={[148,129,110,110,148][i]} width="5" height="6" rx="1" fill="#EAF9F5"/></React.Fragment>)}
  <Rect x="67" y="106" width="201" height="64" rx="13" fill="#008783"/>
  <Rect x="78" y="116" width="148" height="27" rx="7" fill="#A0EFE0"/>
  <Path d="M113 116v27m38-27v27m38-27v27" stroke="#008783" strokeWidth="4"/>
  <Rect x="232" y="116" width="24" height="49" rx="6" fill="#12304A"/>
  <SvgText x="89" y="159" fontFamily="Arial" fontSize="10" fontWeight="bold" fill="white">TransitLK</SvgText>
  <Circle cx="102" cy="172" r="13" fill="#12304A"/><Circle cx="102" cy="172" r="5" fill="#DAF5EF"/>
  <Circle cx="235" cy="172" r="13" fill="#12304A"/><Circle cx="235" cy="172" r="5" fill="#DAF5EF"/>
 </Svg>;
}
