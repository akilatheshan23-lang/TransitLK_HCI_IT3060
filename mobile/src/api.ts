import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
export type User = { id:string; name:string; email:string; language:'en'|'ta'|'si'; role:'passenger'|'owner'|'officer' };
const base = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');
export const API_BASE_URL = base;
let token: string | null = null;
export class ApiError extends Error { constructor(message:string, public status:number) { super(message); } }
export async function restoreSession() {
  // Web preview uses tab-scoped sessionStorage; native uses OS-backed secure storage.
  token = Platform.OS === 'web' ? globalThis.sessionStorage?.getItem('transitlk-session') || null : await SecureStore.getItemAsync('transitlk-session');
  return token;
}
export async function saveSession(value:string|null) {
  if (Platform.OS === 'web') {
    if (value) globalThis.sessionStorage.setItem('transitlk-session',value);
    else globalThis.sessionStorage.removeItem('transitlk-session');
  } else if (value) await SecureStore.setItemAsync('transitlk-session',value);
  else await SecureStore.deleteItemAsync('transitlk-session');
  token=value;
}
export async function api<T>(path:string, method='GET', body?:unknown):Promise<T> {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try {
    const res=await fetch(`${base}/api${path}`,{method,signal:controller.signal,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    if(res.status===204) return undefined as T;
    const data=await res.json();
    if(!res.ok) throw new ApiError(data.error || 'Request failed.',res.status);
    return data;
  } finally {clearTimeout(timeout);}
}
