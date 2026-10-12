import {Alert, Linking, Platform} from 'react-native';
import {API_BASE_URL} from './api';

export function portalUrl(role: 'admin'|'authority'|'bus_owner'='admin') {
  const url = new URL(process.env.EXPO_PUBLIC_PORTAL_URL || API_BASE_URL);
  if (!process.env.EXPO_PUBLIC_PORTAL_URL) { url.port='3001'; url.pathname='/'; }
  url.search=''; url.hash=''; url.searchParams.set('role',role);
  return url.toString();
}

export async function openPortal(role: 'admin'|'authority'|'bus_owner'='admin') {
  const url=portalUrl(role);
  try {
    if (Platform.OS==='web') {
      // Same-tab navigation also works after asynchronous login (no popup blocker).
      window.location.assign(url);
    } else await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open portal',`Open ${url} in your browser. Keep the computer and phone on the same Wi-Fi.`);
  }
}
