/**
 * Geoapify Maps & Geocoding Service for TransitLK
 * API Key configured from user credentials
 */

export const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || '';

export type GeocodeResult = {
  formatted: string;
  name?: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

/**
 * Search locations and addresses using Geoapify Geocoding API
 */
export async function geoapifyGeocode(text: string): Promise<GeocodeResult[]> {
  if (!text || text.trim().length < 2) return [];

  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(text.trim())}&apiKey=${GEOAPIFY_API_KEY}`;

  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.features || !Array.isArray(data.features)) return [];

    return data.features.map((f: any) => ({
      formatted: f.properties?.formatted || f.properties?.name || text,
      name: f.properties?.name,
      city: f.properties?.city,
      country: f.properties?.country,
      latitude: f.geometry?.coordinates?.[1] ?? f.properties?.lat,
      longitude: f.geometry?.coordinates?.[0] ?? f.properties?.lon,
    }));
  } catch (error) {
    console.log('Geoapify geocode error:', error);
    return [];
  }
}

/**
 * Reverse geocode latitude and longitude to a human-readable street or area name
 */
export async function geoapifyReverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${GEOAPIFY_API_KEY}`;

  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) return null;

    const data = await response.json();
    const first = data.features?.[0]?.properties;
    return first?.street || first?.suburb || first?.city || first?.formatted || null;
  } catch {
    return null;
  }
}

/**
 * Generate a Geoapify Static Map URL for a route and vehicle
 */
export function getGeoapifyStaticMapUrl(params: {
  centerLat: number;
  centerLon: number;
  zoom?: number;
  width?: number;
  height?: number;
  vehicleLat?: number;
  vehicleLon?: number;
  path?: { latitude: number; longitude: number }[];
}): string {
  const { centerLat, centerLon, zoom = 12, width = 600, height = 350, vehicleLat, vehicleLon } = params;

  let url = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=${width}&height=${height}&center=lonlat:${centerLon},${centerLat}&zoom=${zoom}`;

  if (vehicleLat != null && vehicleLon != null) {
    url += `&marker=lonlat:${vehicleLon},${vehicleLat};color:%23008783;size:medium`;
  }

  url += `&apiKey=${GEOAPIFY_API_KEY}`;
  return url;
}
