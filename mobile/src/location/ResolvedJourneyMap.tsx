import DemoRouteMap from './DemoRouteMap';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import RouteCanvas from './RouteCanvas';
import { Place, Point, searchPlaces, roadRoute, roadEta } from './routing';

const KNOWN_LK_PLACES: Record<string, { latitude: number; longitude: number }> = {
  'horana': { latitude: 6.7159, longitude: 80.0626 },
  'pokunuwita': { latitude: 6.7367, longitude: 80.0361 },
  'gonapola': { latitude: 6.7512, longitude: 80.0221 },
  'kahathuduwa': { latitude: 6.7824, longitude: 79.9912 },
  'kesbewa': { latitude: 6.7953, longitude: 79.9468 },
  'piliyandala': { latitude: 6.8018, longitude: 79.9220 },
  'bokundara': { latitude: 6.8172, longitude: 79.9102 },
  'boralesgamuwa': { latitude: 6.8412, longitude: 79.9089 },
  'rattanapitiya': { latitude: 6.8511, longitude: 79.8923 },
  'pepiliyana': { latitude: 6.8582, longitude: 79.8904 },
  'kohuwala': { latitude: 6.8639, longitude: 79.8858 },
  'kalubowila': { latitude: 6.8664, longitude: 79.8768 },
  'dutugemunu': { latitude: 6.8725, longitude: 79.8752 },
  'pamankada': { latitude: 6.8778, longitude: 79.8672 },
  'havelock town': { latitude: 6.8879, longitude: 79.8653 },
  'thimbirigasyaya': { latitude: 6.8965, longitude: 79.8648 },
  'thummulla': { latitude: 6.9016, longitude: 79.8612 },
  'bambalapitiya': { latitude: 6.8935, longitude: 79.8562 },
  'kollupitiya': { latitude: 6.9119, longitude: 79.8507 },
  'town hall': { latitude: 6.9157, longitude: 79.8644 },
  'maradana': { latitude: 6.9292, longitude: 79.8656 },
  'galle face': { latitude: 6.9271, longitude: 79.8447 },
  'colombo': { latitude: 6.9344, longitude: 79.8528 },
  'colombo (pettah)': { latitude: 6.9344, longitude: 79.8528 },
  'colombo fort': { latitude: 6.9344, longitude: 79.8428 },
  'pettah': { latitude: 6.9344, longitude: 79.8528 },
  'fort': { latitude: 6.9344, longitude: 79.8428 },
  'homagama': { latitude: 6.8440, longitude: 80.0032 },
  'kottawa': { latitude: 6.8412, longitude: 79.9585 },
  'pannipitiya': { latitude: 6.8467, longitude: 79.9472 },
  'maharagama': { latitude: 6.8480, longitude: 79.9283 },
  'navinna': { latitude: 6.8548, longitude: 79.9136 },
  'wijerama': { latitude: 6.8576, longitude: 79.9080 },
  'delkanda': { latitude: 6.8624, longitude: 79.9012 },
  'nugegoda': { latitude: 6.8729, longitude: 79.8890 },
  'kirulapone': { latitude: 6.8794, longitude: 79.8767 },
  'panadura': { latitude: 6.7132, longitude: 79.9074 },
  'wadduwa': { latitude: 6.6636, longitude: 79.9297 },
  'moratuwa': { latitude: 6.7730, longitude: 79.8816 },
  'moratumulla': { latitude: 6.7845, longitude: 79.8915 },
  'suwarapola': { latitude: 6.7942, longitude: 79.9052 },
  'rawathawatte': { latitude: 6.7918, longitude: 79.8805 },
  'ratmalana': { latitude: 6.8195, longitude: 79.8812 },
  'mount lavinia': { latitude: 6.8390, longitude: 79.8638 },
  'dehiwala': { latitude: 6.8511, longitude: 79.8650 },
  'wellawatte': { latitude: 6.8741, longitude: 79.8612 },
  'avissawella': { latitude: 6.9522, longitude: 80.2094 },
  'kosgama': { latitude: 6.9422, longitude: 80.1356 },
  'kaluaggala': { latitude: 6.9175, longitude: 80.1042 },
  'hanwella': { latitude: 6.9061, longitude: 80.0842 },
  'meepe': { latitude: 6.8592, longitude: 80.0612 },
  'meegoda': { latitude: 6.8475, longitude: 80.0442 },
  'godagama': { latitude: 6.8462, longitude: 80.0231 },
  'kaduwela': { latitude: 6.9333, longitude: 79.9841 },
  'malabe': { latitude: 6.9044, longitude: 79.9576 },
  'thalahena': { latitude: 6.9022, longitude: 79.9438 },
  'koswatte': { latitude: 6.9008, longitude: 79.9315 },
  'battaramulla': { latitude: 6.8984, longitude: 79.9182 },
  'rajagiriya': { latitude: 6.9094, longitude: 79.8959 },
  'borella': { latitude: 6.9147, longitude: 79.8778 },
  'ingiriya': { latitude: 6.7447, longitude: 80.1731 },
  'handapangoda': { latitude: 6.7932, longitude: 80.1185 },
  'padukka': { latitude: 6.8415, longitude: 80.0914 },
};

async function resolveStopPlace(name: string, signal?: AbortSignal): Promise<Place | null> {
  const clean = (name || '').trim();
  if (!clean) return null;
  const key = clean.toLowerCase();
  if (KNOWN_LK_PLACES[key]) {
    return { ...KNOWN_LK_PLACES[key], label: clean };
  }
  const matches = await searchPlaces(clean, signal);
  return matches[0] || null;
}

function selectViaStops(middle: Place[], maxVia = 4): Place[] {
  if (middle.length <= maxVia) return middle;
  const picked: Place[] = [];
  for (let i = 1; i <= maxVia; i += 1) {
    const idx = Math.floor((i * middle.length) / (maxVia + 1));
    picked.push(middle[idx]);
  }
  return picked;
}

export default function ResolvedJourneyMap({
  origin,
  destination,
  stops,
  vehicle,
  onEta,
  demo = false,
  onDemo,
}: {
  origin: string;
  destination: string;
  stops?: string[];
  vehicle?: Point | null;
  onEta?: (minutes: number | null) => void;
  demo?: boolean;
  onDemo?: (value: { speedKmh: number; etaMinutes: number } | null) => void;
}) {
  const stopKey = JSON.stringify(stops && stops.length >= 2 ? stops : [origin, destination]);
  const currentVehicle = useRef(vehicle);
  currentVehicle.current = vehicle;
  const [data, setData] = useState<{ from: Place; to: Place; points: Point[] }>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError('');
    (async () => {
      try {
        const names: string[] = JSON.parse(stopKey);
        const resolved: Place[] = [];
        for (const name of names) {
          const match = await resolveStopPlace(name, controller.signal);
          if (match) {
            resolved.push(match);
          }
        }
        if (resolved.length < 2) {
          const aFallback = await resolveStopPlace(origin, controller.signal);
          const bFallback = await resolveStopPlace(destination, controller.signal);
          if (!aFallback || !bFallback) {
            throw Error(`Cannot resolve ${origin} -> ${destination}. Select the address in the journey planner.`);
          }
          resolved.splice(0, resolved.length, aFallback, bFallback);
        }
        const a = resolved[0];
        const b = resolved[resolved.length - 1];
        const via = selectViaStops(resolved.slice(1, -1), 4);
        let points: Point[];
        try {
          points = await roadRoute(a, b, controller.signal, via);
        } catch {
          points = await roadRoute(a, b, controller.signal, []);
        }
        if (!controller.signal.aborted) {
          setData({ from: a, to: b, points });
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Map unavailable.');
        }
      }
    })();
    return () => controller.abort();
  }, [origin, destination, stopKey, retry]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    onEta?.(null);
    if (!vehicle || !data || !onEta) return;
    const refresh = async () => {
      if (!currentVehicle.current) return;
      try {
        const minutes = await roadEta(currentVehicle.current, data.to, controller.signal);
        if (active) onEta(minutes);
      } catch {
        if (active) onEta(null);
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => {
      active = false;
      clearInterval(timer);
      controller.abort();
    };
  }, [data, !!vehicle, onEta]);

  return (
    <View style={{ flex: 1 }}>
      {data ? (
        <>
          {demo ? (
            <DemoRouteMap {...data} onDemo={onDemo} />
          ) : (
            <RouteCanvas {...data} vehicle={vehicle} />
          )}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 5,
              left: 5,
              right: 5,
              backgroundColor: 'white',
              padding: 6,
            }}
          >
            <Text style={{ fontSize: 11 }}>
              {demo
                ? 'Simulated bus · Not live GPS'
                : vehicle
                ? 'Owner phone GPS · Suggested road route'
                : 'Suggested road route · Bus GPS unavailable'}
            </Text>
          </View>
        </>
      ) : error ? (
        <View style={{ padding: 20, gap: 10 }}>
          <Text>{error}</Text>
          <Pressable onPress={() => setRetry((x) => x + 1)}>
            <Text style={{ color: '#008783' }}>Retry map</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ padding: 30 }}>
          <ActivityIndicator />
          <Text>Resolving stops and road route...</Text>
        </View>
      )}
    </View>
  );
}
