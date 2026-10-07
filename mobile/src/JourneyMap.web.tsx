import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, Linking, ActivityIndicator } from 'react-native';
import { Tracking } from './transitTypes';
import { GEOAPIFY_API_KEY, getGeoapifyStaticMapUrl } from './geoapify';
import { colors as c } from './theme';

interface JourneyMapProps {
  data: Tracking;
}

export default function JourneyMap({ data }: JourneyMapProps) {
  const iframeRef = useRef<any>(null);
  const [mapError, setMapError] = useState(false);
  const [loading, setLoading] = useState(true);

  const points = data.trip.path || [];
  const vehiclePos = data.position || (points.length > 0 ? points[0] : { latitude: 6.9271, longitude: 79.8612 });

  // Update vehicle GPS marker position via postMessage without re-rendering the iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow && data.position) {
      try {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'UPDATE_GPS',
            lat: data.position.latitude,
            lng: data.position.longitude,
          },
          '*'
        );
      } catch {
        // Fallback silently if postMessage is blocked
      }
    }
  }, [data.position?.latitude, data.position?.longitude]);

  // Construct Leaflet HTML with Geoapify OSM Bright tiles
  const htmlDoc = useMemo(() => {
    const isBus = data.trip.mode === 'bus';
    const vehicleIconSymbol = isBus ? '🚌' : '🚆';
    const pathJson = JSON.stringify(points.map(p => [p.latitude, p.longitude]));
    const startPoint = points.length > 0 ? points[0] : null;
    const destPoint = points.length > 1 ? points[points.length - 1] : null;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: #DDF6EF; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

    /* Radar Pulse Wave Animation */
    .gps-pulse-ring {
      position: absolute;
      top: -12px;
      left: -12px;
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: rgba(0, 135, 131, 0.35);
      border: 1.5px solid rgba(0, 135, 131, 0.7);
      animation: radar-pulse 2s infinite cubic-bezier(0.2, 0.8, 0.4, 1);
      pointer-events: none;
    }
    @keyframes radar-pulse {
      0% { transform: scale(0.4); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    /* Vehicle Pin */
    .vehicle-pin {
      position: relative;
      width: 34px;
      height: 34px;
      background: #12304A;
      border: 2.5px solid #FFFFFF;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      font-size: 16px;
      cursor: pointer;
      z-index: 5;
    }

    /* Station Pins */
    .station-pin {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }
    .station-start { background: #008783; }
    .station-dest { background: #FF866D; }

    /* Recenter Button */
    .gps-btn {
      position: absolute;
      bottom: 12px;
      right: 12px;
      z-index: 1000;
      background: #FFFFFF;
      color: #12304A;
      border: 1px solid #C8D6DF;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s ease;
    }
    .gps-btn:active { transform: scale(0.96); background: #EEF5F4; }
    .gps-dot { width: 8px; height: 8px; border-radius: 4px; background: #008783; }

    /* Custom attribution badge */
    .geoapify-badge {
      position: absolute;
      bottom: 2px;
      left: 6px;
      z-index: 1000;
      font-size: 9px;
      color: #607D94;
      background: rgba(255,255,255,0.85);
      padding: 2px 6px;
      border-radius: 4px;
      pointer-events: none;
    }
    .leaflet-control-zoom { border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important; border-radius: 8px !important; overflow: hidden; }
    .leaflet-control-zoom a { width: 30px !important; height: 30px !important; line-height: 30px !important; color: #12304A !important; font-weight: 700 !important; }
  </style>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
</head>
<body>
  <div id="map"></div>
  <button id="recenterBtn" class="gps-btn" title="Focus Live Vehicle">
    <span class="gps-dot"></span> Live GPS
  </button>
  <div class="geoapify-badge">Maps by Geoapify</div>

  <script>
    (function() {
      const apiKey = '${GEOAPIFY_API_KEY}';
      const pathPoints = ${pathJson};
      let vehicleLat = ${vehiclePos.latitude};
      let vehicleLng = ${vehiclePos.longitude};

      // Create Leaflet Map
      const map = L.map('map', {
        zoomControl: true,
        attributionControl: false
      });

      // Geoapify OSM-Bright Vector Raster Tiles
      const tileUrl = 'https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=' + apiKey;
      L.tileLayer(tileUrl, {
        maxZoom: 20,
        subdomains: ['a', 'b', 'c']
      }).addTo(map);

      // Route Polyline
      let polyline = null;
      if (pathPoints && pathPoints.length > 1) {
        polyline = L.polyline(pathPoints, {
          color: '#008783',
          weight: 4.5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
      }

      // Start Station Marker
      ${startPoint ? `
        const startIcon = L.divIcon({
          className: '',
          html: '<div class="station-pin station-start"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        L.marker([${startPoint.latitude}, ${startPoint.longitude}], { icon: startIcon })
          .bindPopup('<b>Start:</b> ${data.trip.from}')
          .addTo(map);
      ` : ''}

      // Destination Station Marker
      ${destPoint ? `
        const destIcon = L.divIcon({
          className: '',
          html: '<div class="station-pin station-dest"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        L.marker([${destPoint.latitude}, ${destPoint.longitude}], { icon: destIcon })
          .bindPopup('<b>Destination:</b> ${data.trip.to}')
          .addTo(map);
      ` : ''}

      // Moving Vehicle Marker
      const vehicleHtml = '<div style="position:relative;">' +
        '<div class="gps-pulse-ring"></div>' +
        '<div class="vehicle-pin">${vehicleIconSymbol}</div>' +
        '</div>';

      const vehicleIcon = L.divIcon({
        className: '',
        html: vehicleHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const vehicleMarker = L.marker([vehicleLat, vehicleLng], {
        icon: vehicleIcon,
        zIndexOffset: 1000
      }).addTo(map);

      vehicleMarker.bindPopup('<b>${data.trip.mode.toUpperCase()} ${data.trip.route}</b><br/>Live GPS Position');

      // Fit bounds to route
      if (polyline) {
        map.fitBounds(polyline.getBounds(), { padding: [35, 35], maxZoom: 15 });
      } else {
        map.setView([vehicleLat, vehicleLng], 13);
      }

      // Recenter button
      document.getElementById('recenterBtn').addEventListener('click', function() {
        map.flyTo(vehicleMarker.getLatLng(), Math.max(map.getZoom(), 14), { duration: 0.6 });
      });

      // Handle live position updates from React Native parent
      window.addEventListener('message', function(event) {
        if (!event.data || event.data.type !== 'UPDATE_GPS') return;
        const newLat = Number(event.data.lat);
        const newLng = Number(event.data.lng);
        if (!isNaN(newLat) && !isNaN(newLng)) {
          vehicleMarker.setLatLng([newLat, newLng]);
        }
      });
    })();
  </script>
</body>
</html>`;
  }, [data.trip.id, points.length]);

  const staticFallbackUrl = getGeoapifyStaticMapUrl({
    centerLat: vehiclePos.latitude,
    centerLon: vehiclePos.longitude,
    vehicleLat: vehiclePos.latitude,
    vehicleLon: vehiclePos.longitude,
    zoom: 13,
    width: 600,
    height: 350,
  });

  return (
    <View style={s.container}>
      {!mapError ? (
        <View style={StyleSheet.absoluteFill}>
          {loading && (
            <View style={s.loader}>
              <ActivityIndicator color={c.teal} size="small" />
              <Text style={s.loaderText}>Loading Geoapify map…</Text>
            </View>
          )}
          <iframe
            ref={iframeRef}
            title="TransitLK Live GPS Tracking"
            srcDoc={htmlDoc}
            onLoad={() => setLoading(false)}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' } as any}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </View>
      ) : (
        /* Fallback if Leaflet CDN fails or webview error */
        <View style={s.fallbackContainer}>
          <Text style={s.fallbackTitle}>TransitLK GPS Tracking</Text>
          <Text style={s.fallbackSubtitle}>
            {data.trip.mode.toUpperCase()} {data.trip.route} · {data.trip.from} → {data.trip.to}
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(`https://maps.google.com/?q=${vehiclePos.latitude},${vehiclePos.longitude}`)}
            style={s.fallbackButton}
          >
            <Text style={s.fallbackButtonText}>Open in Google Maps ↗</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#DDF6EF',
    borderRadius: 22,
    overflow: 'hidden',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#DDF6EF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1,
  },
  loaderText: {
    fontSize: 12,
    color: '#607D94',
    fontWeight: '600',
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  fallbackTitle: {
    color: '#12304A',
    fontWeight: '700',
    fontSize: 16,
  },
  fallbackSubtitle: {
    color: '#607D94',
    fontSize: 13,
  },
  fallbackButton: {
    backgroundColor: '#008783',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
