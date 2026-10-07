import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Linking, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as c } from './theme';
import { Icon } from './Artwork';
import { API_BASE_URL } from './api';
import { GEOAPIFY_API_KEY } from './geoapify';

interface FleetTrackingScreenProps {
  onBack: () => void;
  onOpenWebDashboard?: () => void;
}

interface BusRouteData {
  route: string;
  plate: string;
  destination: string;
  area: string;
  status: string;
  eta: string;
  rev: string;
  speed: string;
  driver: string;
  lat: number;
  lon: number;
  ontime: boolean;
}

const fleetBuses: BusRouteData[] = [
  {
    route: '177',
    plate: 'NA-4402',
    destination: 'Kollupitiya',
    area: 'Kollupitiya Junction, Galle Rd',
    status: 'On-time',
    eta: '5 min',
    rev: 'Rs. 8,420',
    speed: '34 km/h',
    driver: 'K. Perera',
    lat: 6.9271,
    lon: 79.8612,
    ontime: true,
  },
  {
    route: '179',
    plate: 'NB-8891',
    destination: 'Bambalapitiya',
    area: 'Bambalapitiya Station Rd',
    status: 'Delayed',
    eta: '12 min',
    rev: 'Rs. 6,350',
    speed: '18 km/h',
    driver: 'S. Fernando',
    lat: 6.8520,
    lon: 79.8630,
    ontime: false,
  },
  {
    route: '185',
    plate: 'NC-1204',
    destination: 'Nugegoda',
    area: 'Nugegoda Supermarket Junction',
    status: 'On-time',
    eta: '8 min',
    rev: 'Rs. 9,120',
    speed: '31 km/h',
    driver: 'M. Jayawardena',
    lat: 6.8770,
    lon: 79.8780,
    ontime: true,
  },
  {
    route: '187',
    plate: 'ND-5541',
    destination: 'Katunayake',
    area: 'Colombo Fort Bus Terminal',
    status: 'On-time',
    eta: '3 min',
    rev: 'Rs. 7,890',
    speed: '42 km/h',
    driver: 'R. De Silva',
    lat: 6.9340,
    lon: 79.8500,
    ontime: true,
  },
  {
    route: '189',
    plate: 'NE-7721',
    destination: 'Rajagiriya',
    area: 'Moratuwa Cross Junction',
    status: 'Delayed',
    eta: '18 min',
    rev: 'Rs. 5,230',
    speed: '16 km/h',
    driver: 'C. Wickramasinghe',
    lat: 6.7710,
    lon: 79.8830,
    ontime: false,
  },
];

export default function FleetTrackingScreen({ onBack, onOpenWebDashboard }: FleetTrackingScreenProps) {
  const insets = useSafeAreaInsets();
  const iframeRef = useRef<any>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>('177');

  const selectedBus = useMemo(
    () => fleetBuses.find(b => b.route === selectedRoute) || fleetBuses[0],
    [selectedRoute]
  );

  const staticMapUrl = useMemo(() => {
    return `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=680&height=360&center=lonlat:79.865,6.885&zoom=11&marker=lonlat:79.8612,6.9271;color:%23008783;text:177|lonlat:79.8630,6.8520;color:%23D97706;text:179|lonlat:79.8780,6.8770;color:%23008783;text:185|lonlat:79.8500,6.9340;color:%23008783;text:187|lonlat:79.8830,6.7710;color:%23D97706;text:189&apiKey=${GEOAPIFY_API_KEY}`;
  }, []);

  const leafletHtml = useMemo(() => {
    const busesJson = JSON.stringify(fleetBuses);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: #E8F4F0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .pulse-ring {
      position: absolute;
      top: -8px;
      left: -8px;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      pointer-events: none;
      animation: radar 2s infinite cubic-bezier(0.2, 0.8, 0.4, 1);
    }
    @keyframes radar {
      0% { transform: scale(0.35); opacity: 0.95; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .bus-badge {
      width: 30px;
      height: 30px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 11px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      position: relative;
      z-index: 2;
    }
    .recenter-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1000;
      background: white;
      color: #12304A;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 5px 9px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
  </style>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
  <div id="map"></div>
  <button class="recenter-btn" onclick="recenterAll()">🎯 Center All</button>
  <script>
    const map = L.map('map', { zoomControl: false }).setView([6.885, 79.87], 12);
    L.tileLayer('https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}', {
      maxZoom: 19
    }).addTo(map);

    const buses = ${busesJson};
    const markers = {};
    const group = L.featureGroup();

    buses.forEach(b => {
      const color = b.ontime ? '#008783' : '#D97706';
      const pulseBg = b.ontime ? 'rgba(0,135,131,0.45)' : 'rgba(217,119,6,0.45)';
      const icon = L.divIcon({
        html: '<div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">' +
              '<div class="pulse-ring" style="background:' + pulseBg + '"></div>' +
              '<div class="bus-badge" style="background:' + color + '">' + b.route + '</div>' +
              '</div>',
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      const marker = L.marker([b.lat, b.lon], { icon }).addTo(group);
      marker.bindPopup('<div style="font-family:sans-serif;font-size:12px;padding:2px;">' +
        '<b style="color:#12304A;font-size:13px;">Route ' + b.route + ' (' + b.plate + ')</b><br/>' +
        '<span style="color:#607D94;">' + b.area + '</span><br/>' +
        '<span style="color:' + color + ';font-weight:700;">● ' + b.status + ' (' + b.eta + ')</span><br/>' +
        '<span style="color:#008783;font-weight:700;">Rev: ' + b.rev + '</span>' +
        '</div>');
      marker.on('click', () => {
        try {
          window.parent.postMessage({ type: 'BUS_CLICKED', route: b.route }, '*');
        } catch (e) {}
      });
      markers[b.route] = marker;
    });

    group.addTo(map);
    map.fitBounds(group.getBounds(), { padding: [35, 35] });

    function recenterAll() {
      map.fitBounds(group.getBounds(), { padding: [35, 35] });
    }

    window.addEventListener('message', e => {
      if (!e.data) return;
      if (e.data.type === 'FOCUS_BUS') {
        const m = markers[e.data.route];
        const b = buses.find(x => x.route === e.data.route);
        if (m && b) {
          map.flyTo([b.lat, b.lon], 15, { animate: true, duration: 0.8 });
          setTimeout(() => m.openPopup(), 450);
        }
      } else if (e.data.type === 'RECENTER') {
        recenterAll();
      }
    });
  </script>
</body>
</html>`;
  }, []);

  const handleRoutePress = (route: string) => {
    setSelectedRoute(route);
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({ type: 'FOCUS_BUS', route }, '*');
      } catch (e) {
        // silently ignore postMessage errors
      }
    }
  };

  const handleRecenter = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({ type: 'RECENTER' }, '*');
      } catch (e) {
        // silently ignore postMessage errors
      }
    }
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BUS_CLICKED' && event.data?.route) {
        setSelectedRoute(event.data.route);
      }
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('message', onMessage);
      return () => window.removeEventListener('message', onMessage);
    }
  }, []);

  const handleOpenWeb = () => {
    if (onOpenWebDashboard) {
      onOpenWebDashboard();
      return;
    }
    const url = `${API_BASE_URL}/owner`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      void Linking.openURL(url);
    }
  };

  return (
    <View style={s.stage}>
      <View style={[s.screen, { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 10 : 14) }]}>
        {/* Header */}
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to overview" onPress={onBack} style={s.backBtn}>
            <Icon name="back" size={20} color={c.navy} />
          </Pressable>
          <Text style={s.headerTitle}>Fleet & tracking</Text>
          <View style={s.headerRightPlaceholder} />
        </View>

        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 24) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Banner */}
          <View style={s.titleRow}>
            <div>
              <Text style={s.eyebrow}>REAL-TIME GPS TELEMETRY</Text>
              <Text style={s.title}>Live bus tracking</Text>
            </div>
            <View style={s.liveBadge}>
              <View style={s.liveDot} />
              <Text style={s.liveBadgeText}>5 Active</Text>
            </View>
          </View>

          {/* Real GPS Map Section */}
          <View style={s.mapCard}>
            <View style={s.mapWrapper}>
              {Platform.OS === 'web' ? (
                <iframe
                  ref={iframeRef}
                  title="Geoapify GPS Fleet Map"
                  srcDoc={leafletHtml}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 18,
                    display: 'block',
                  }}
                />
              ) : (
                <Image
                  source={{ uri: staticMapUrl }}
                  style={{ width: '100%', height: '100%', borderRadius: 18 }}
                  resizeMode="cover"
                />
              )}
            </View>
            <View style={s.mapCaptionRow}>
              <Text style={s.mapCaption}>🛰️ Real GPS map • Geoapify live telemetry</Text>
              <Pressable onPress={handleRecenter} hitSlop={8}>
                <Text style={s.recenterText}>🎯 Fit all buses</Text>
              </Pressable>
            </View>
          </View>

          {/* Active Bus Telemetry Focus Card */}
          {selectedBus && (
            <View style={s.focusCard}>
              <View style={s.focusHeader}>
                <View style={s.focusRouteTag}>
                  <Text style={s.focusRouteText}>{selectedBus.route}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.focusTitle}>{selectedBus.plate} • {selectedBus.destination}</Text>
                  <Text style={s.focusArea}>{selectedBus.area}</Text>
                </View>
                <View style={[s.statusPill, selectedBus.ontime ? s.pillOnTime : s.pillDelayed]}>
                  <Text style={[s.statusPillText, selectedBus.ontime ? s.textOnTime : s.textDelayed]}>
                    {selectedBus.status}
                  </Text>
                </View>
              </View>

              <View style={s.focusMetaRow}>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Next Stop ETA</Text>
                  <Text style={s.metaVal}>{selectedBus.eta}</Text>
                </View>
                <View style={s.metaDivider} />
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Speed</Text>
                  <Text style={s.metaVal}>{selectedBus.speed}</Text>
                </View>
                <View style={s.metaDivider} />
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Today's Revenue</Text>
                  <Text style={[s.metaVal, { color: '#008783' }]}>{selectedBus.rev}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Active Routes Section with interactive click-to-focus */}
          <View style={s.routesSection}>
            <View style={s.routesHeaderRow}>
              <Text style={s.sectionTitle}>Active routes • Today</Text>
              <Text style={s.routesSubTitle}>Tap route to track on map</Text>
            </View>

            <View style={s.routesList}>
              {fleetBuses.map(item => {
                const isSelected = item.route === selectedRoute;
                return (
                  <Pressable
                    key={item.route}
                    onPress={() => handleRoutePress(item.route)}
                    style={({ pressed }) => [
                      s.routeItem,
                      isSelected && s.routeItemSelected,
                      pressed && s.routeItemPressed,
                    ]}
                  >
                    <View style={[s.routeBadge, isSelected && s.routeBadgeSelected]}>
                      <Text style={[s.routeId, isSelected && s.routeIdSelected]}>{item.route}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.routeDestText}>{item.destination} ({item.plate})</Text>
                      <Text style={s.routeMeta}>
                        <Text style={[s.statusText, !item.ontime && s.statusDelayed]}>{item.status}</Text>
                        {' · '}{item.eta}{' · '}{item.rev}
                      </Text>
                    </View>
                    <Text style={s.trackArrow}>{isSelected ? '📍' : '›'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={s.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={handleOpenWeb}
              style={({ pressed }) => [s.primaryBtn, pressed && s.btnPressed]}
            >
              <Text style={s.primaryBtnText}>Open website dashboard</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [s.secondaryBtn, pressed && s.btnPressed]}
            >
              <Text style={s.secondaryBtnText}>Back to overview</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F3F6F8',
    alignItems: 'center',
  },
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#F3F6F8',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#12304A',
    marginLeft: -40,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    gap: 14,
    paddingTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#008783',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#12304A',
    letterSpacing: -0.4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DDF6EF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#008783',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#008783',
  },
  mapCard: {
    gap: 8,
  },
  mapWrapper: {
    width: '100%',
    height: 240,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E8F4F0',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)' as any,
  },
  mapCaptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  mapCaption: {
    fontSize: 11,
    color: '#607D94',
    fontWeight: '500',
  },
  recenterText: {
    fontSize: 11,
    color: '#008783',
    fontWeight: '700',
  },
  focusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDF6EF',
    boxShadow: '0 2px 8px rgba(0, 135, 131, 0.08)' as any,
    gap: 10,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  focusRouteTag: {
    backgroundColor: '#008783',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  focusRouteText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  focusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#12304A',
  },
  focusArea: {
    fontSize: 11,
    color: '#607D94',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillOnTime: {
    backgroundColor: '#D1FAE5',
  },
  pillDelayed: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textOnTime: {
    color: '#059669',
  },
  textDelayed: {
    color: '#D97706',
  },
  focusMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '100%',
  },
  metaLabel: {
    fontSize: 10,
    color: '#607D94',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#12304A',
    marginTop: 2,
  },
  routesSection: {
    gap: 10,
    marginTop: 2,
  },
  routesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#12304A',
    letterSpacing: -0.3,
  },
  routesSubTitle: {
    fontSize: 11,
    color: '#607D94',
    fontWeight: '500',
  },
  routesList: {
    gap: 8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  routeItemSelected: {
    borderColor: '#008783',
    backgroundColor: '#F0FAF8',
  },
  routeItemPressed: {
    opacity: 0.85,
  },
  routeBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeBadgeSelected: {
    backgroundColor: '#008783',
  },
  routeId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#12304A',
  },
  routeIdSelected: {
    color: '#FFFFFF',
  },
  routeDestText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#12304A',
  },
  routeMeta: {
    fontSize: 12,
    color: '#607D94',
    fontWeight: '500',
    marginTop: 2,
  },
  statusText: {
    color: '#059669',
    fontWeight: '700',
  },
  statusDelayed: {
    color: '#D97706',
    fontWeight: '700',
  },
  trackArrow: {
    fontSize: 16,
    color: '#607D94',
    fontWeight: '700',
  },
  actions: {
    gap: 10,
    marginTop: 10,
  },
  primaryBtn: {
    backgroundColor: '#008783',
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryBtnText: {
    color: '#008783',
    fontSize: 15,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
