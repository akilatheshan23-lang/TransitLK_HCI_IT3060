import {useEffect,useState,useCallback} from 'react';
import {api} from '../api';
import {Point} from './routing';
export type BusTelemetry={status:'live'|'stale'|'unavailable';position:Point|null;speedKmh:number|null;accuracy:number|null;updatedAt:string|null;source:'owner-phone'};
export function useBusTelemetry(id?:string){
 const [data,setData]=useState<BusTelemetry|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{let active=true,busy=false;setData(null);setError('');if(!id)return;
 const refresh=async()=>{if(busy)return;busy=true;if(active)setLoading(true);try{const next=await api<BusTelemetry>(`/bus-tracking/${encodeURIComponent(id)}`);if(active){setData(next);setError('');}}catch(e){if(active){setData(null);setError(e instanceof Error?e.message:'GPS connection lost.');}}finally{busy=false;if(active)setLoading(false);}};
 void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>{active=false;clearInterval(timer);};},[id,refreshKey]);
 return {data,error,loading,refresh:useCallback(()=>setRefreshKey(k=>k+1),[])};
}
