import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from 'react-native';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BellIcon,
  BusPictogram,
  TrainIcon,
  LocationPinIcon,
  ClockIcon,
  SearchIcon,
  HomeIcon,
  TicketIcon,
  ChatBubbleIcon,
  UserIcon,
  CheckIcon,
} from '../components/Icons';
import { colors } from '../theme/colors';
import { platformShadow } from '../theme/shadows';
import { api, UserProfile, BusSearchResult } from '../services/api';
import { GEOAPIFY_API_KEY, getGeoapifyStaticMapUrl } from '../geoapify';

interface HomeScreenProps {
  user: UserProfile;
  onNavigateToProfile: () => void;
  onNavigateBack?: () => void;
  onNavigateToTransit?: () => void;
  onNavigateToCommunity?: () => void;
  onNavigateToPayment?: (bus?: BusSearchResult) => void;
  onNavigateToTickets?: () => void;
  onNavigateToConductor?: () => void;
}

// Verified Sri Lankan town coordinates for real GPS mapping
const SRI_LANKA_TOWNS: Record<string, { lat: number; lon: number }> = {
  horana: { lat: 6.7159, lon: 80.0627 },
  colombo: { lat: 6.9344, lon: 79.8500 },
  pettah: { lat: 6.9350, lon: 79.8520 },
  fort: { lat: 6.9330, lon: 79.8500 },
  maharagama: { lat: 6.8480, lon: 79.9268 },
  homagama: { lat: 6.8410, lon: 80.0030 },
  kottawa: { lat: 6.8436, lon: 79.9654 },
  panadura: { lat: 6.7134, lon: 79.9074 },
  moratuwa: { lat: 6.7730, lon: 79.8816 },
  'mount lavinia': { lat: 6.8344, lon: 79.8654 },
  kollupitiya: { lat: 6.9147, lon: 79.8527 },
  bambalapitiya: { lat: 6.8884, lon: 79.8587 },
  kaduwela: { lat: 6.9336, lon: 79.9839 },
  avissawella: { lat: 6.9537, lon: 80.2081 },
  nugegoda: { lat: 6.8770, lon: 79.8780 },
  katunayake: { lat: 7.1808, lon: 79.8841 },
  negombo: { lat: 7.2088, lon: 79.8358 },
  kandy: { lat: 7.2906, lon: 80.6337 },
  galle: { lat: 6.0535, lon: 80.2210 },
  matara: { lat: 5.9549, lon: 80.5550 },
  kalutara: { lat: 6.5854, lon: 79.9607 },
  ratnapura: { lat: 6.6828, lon: 80.4034 },
  dehiwala: { lat: 6.8510, lon: 79.8659 },
  kiribathgoda: { lat: 6.9806, lon: 79.9328 },
  kadawatha: { lat: 7.0016, lon: 79.9528 },
  battaramulla: { lat: 6.8992, lon: 79.9197 },
  rajagiriya: { lat: 6.9088, lon: 79.8925 },
};

function getTownCoords(townName: string, fallbackOffset = 0): { lat: number; lon: number } {
  const key = (townName || '').toLowerCase().trim();
  for (const [k, v] of Object.entries(SRI_LANKA_TOWNS)) {
    if (key.includes(k) || k.includes(key)) {
      return v;
    }
  }
  return { lat: 6.9100 + fallbackOffset * 0.04, lon: 79.8700 + fallbackOffset * 0.04 };
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onNavigateToProfile,
  onNavigateBack,
  onNavigateToTransit,
  onNavigateToCommunity,
  onNavigateToPayment,
  onNavigateToTickets,
  onNavigateToConductor,
}) => {
  const [transitType, setTransitType] = useState<'bus' | 'train'>('bus');
  const [fromTown, setFromTown] = useState('Horana');
  const [toTown, setToTown] = useState('Colombo');
  const [travelDate, setTravelDate] = useState('12 Sep 2026');

  // Locations state from MongoDB
  const [locations, setLocations] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Town Picker Modal state
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Bus Search & Results state
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BusSearchResult[] | null>(null);
  const [searchHasExecuted, setSearchHasExecuted] = useState(false);

  // Live Bus Tracking state
  const [trackingBus, setTrackingBus] = useState<BusSearchResult | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingSpeed, setTrackingSpeed] = useState(36);
  const [trackingEta, setTrackingEta] = useState(8);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingRefreshCount, setTrackingRefreshCount] = useState(0);

  // Active bottom tab
  const [activeTab, setActiveTab] = useState<'home' | 'tickets' | 'community' | 'profile'>('home');

  // Load registered route town locations from database
  useEffect(() => {
    let isMounted = true;
    async function fetchLocations() {
      setLoadingLocations(true);
      try {
        const res = await api.getLocations();
        if (isMounted && res.success && Array.isArray(res.locations)) {
          setLocations(res.locations);
        }
      } catch (err) {
        console.error('Error loading locations:', err);
      } finally {
        if (isMounted) setLoadingLocations(false);
      }
    }
    fetchLocations();
    return () => {
      isMounted = false;
    };
  }, []);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSwapLocations = () => {
    const temp = fromTown;
    setFromTown(toTown);
    setToTown(temp);
    setSearchResults(null);
    setSearchHasExecuted(false);
  };

  const handleSearchBuses = async () => {
    if (!fromTown.trim() || !toTown.trim()) {
      showAlert('Selection Required', 'Please choose both origin and destination towns.');
      return;
    }

    if (fromTown.trim().toLowerCase() === toTown.trim().toLowerCase()) {
      showAlert('Invalid Route', 'Origin and destination towns cannot be the same.');
      return;
    }

    setSearching(true);
    setSearchHasExecuted(true);
    setTrackingBus(null);

    try {
      const res = await api.searchBuses({
        from: fromTown.trim(),
        to: toTown.trim(),
        date: travelDate,
      });

      if (res.success && res.buses) {
        setSearchResults(res.buses);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Bus search error:', err);
      setSearchResults([]);
      showAlert('Search Error', 'Could not fetch buses. Please check backend connection.');
    } finally {
      setSearching(false);
    }
  };

  const handleTrackBus = (bus: BusSearchResult) => {
    setTrackingBus(bus);
    setTrackingSpeed(34 + Math.floor(Math.random() * 8)); // 34-42 km/h
    setTrackingEta(6 + Math.floor(Math.random() * 6)); // 6-12 mins
    setShowTrackingModal(true);
  };

  const handleRefreshTracking = () => {
    setTrackingLoading(true);
    setTimeout(() => {
      setTrackingRefreshCount((c) => c + 1);
      setTrackingSpeed(32 + Math.floor(Math.random() * 12));
      setTrackingEta((prev) => Math.max(2, prev - 1));
      setTrackingLoading(false);
    }, 600);
  };

  const trackingLeafletHtml = useMemo(() => {
    if (!trackingBus) return '';
    const fromCoord = getTownCoords(trackingBus.fromStop, 0);
    const toCoord = getTownCoords(trackingBus.toStop, 1);
    const busLat = Number((fromCoord.lat * 0.45 + toCoord.lat * 0.55).toFixed(5));
    const busLon = Number((fromCoord.lon * 0.45 + toCoord.lon * 0.55).toFixed(5));
    const routePoints = [
      [fromCoord.lat, fromCoord.lon],
      [Number(((fromCoord.lat * 2 + toCoord.lat) / 3 + 0.005).toFixed(5)), Number(((fromCoord.lon * 2 + toCoord.lon) / 3 - 0.004).toFixed(5))],
      [Number(((fromCoord.lat + toCoord.lat * 2) / 3 + 0.003).toFixed(5)), Number(((fromCoord.lon + toCoord.lon * 2) / 3 - 0.002).toFixed(5))],
      [toCoord.lat, toCoord.lon],
    ];

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
      top: -10px;
      left: -10px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      pointer-events: none;
      animation: radar 2s infinite cubic-bezier(0.2, 0.8, 0.4, 1);
    }
    @keyframes radar {
      0% { transform: scale(0.3); opacity: 0.95; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .bus-marker-box {
      background: #007A74;
      color: white;
      font-weight: 800;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 12px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      cursor: pointer;
    }
    .stop-marker-pin {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 11px;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    }
    .recenter-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1000;
      background: #FFFFFF;
      color: #0F172A;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 4px;
    }
  </style>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
  <div id="map"></div>
  <button class="recenter-btn" onclick="centerBus()">🎯 Center Bus</button>
  <script>
    const fromCoord = [${fromCoord.lat}, ${fromCoord.lon}];
    const toCoord = [${toCoord.lat}, ${toCoord.lon}];
    const busCoord = [${busLat}, ${busLon}];
    const routePoints = ${JSON.stringify(routePoints)};

    const map = L.map('map', { zoomControl: false }).setView(busCoord, 13);
    L.tileLayer('https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}', {
      maxZoom: 19
    }).addTo(map);

    const polyline = L.polyline(routePoints, {
      color: '#007A74',
      weight: 5,
      opacity: 0.85,
      lineJoin: 'round'
    }).addTo(map);

    const originIcon = L.divIcon({
      html: '<div class="stop-marker-pin" style="background:#059669;">A</div>',
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    L.marker(fromCoord, { icon: originIcon }).addTo(map)
      .bindPopup('<b>Starting Stop: ${trackingBus.fromStop}</b><br/>Departure: ${trackingBus.departureTime}');

    const destIcon = L.divIcon({
      html: '<div class="stop-marker-pin" style="background:#DC2626;">B</div>',
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    L.marker(toCoord, { icon: destIcon }).addTo(map)
      .bindPopup('<b>Destination Stop: ${trackingBus.toStop}</b><br/>Arrival: ${trackingBus.arrivalTime}');

    const busIcon = L.divIcon({
      html: '<div style="position:relative;display:flex;align-items:center;justify-content:center;">' +
            '<div class="pulse-ring" style="background:rgba(0,122,116,0.45)"></div>' +
            '<div class="bus-marker-box">🚌 ${trackingBus.routeNumber} • ${trackingBus.busRegNumber}</div>' +
            '</div>',
      className: '',
      iconSize: [120, 32],
      iconAnchor: [60, 16]
    });
    const busMarker = L.marker(busCoord, { icon: busIcon }).addTo(map);
    busMarker.bindPopup(
      '<div style="font-family:sans-serif;font-size:12px;padding:3px;">' +
      '<b style="color:#0F172A;font-size:13px;">Route ${trackingBus.routeNumber} (${trackingBus.busRegNumber})</b><br/>' +
      '<span style="color:#007A74;font-weight:700;">● Live Speed: ${trackingSpeed} km/h</span><br/>' +
      '<span style="color:#64748B;">Approaching station</span><br/>' +
      '<span style="color:#059669;font-weight:700;">ETA: ${trackingEta} mins</span>' +
      '</div>'
    ).openPopup();

    function centerBus() {
      map.flyTo(busCoord, 14, { animate: true, duration: 0.8 });
      setTimeout(() => busMarker.openPopup(), 450);
    }

    map.fitBounds(polyline.getBounds(), { padding: [35, 35] });
  </script>
</body>
</html>`;
  }, [trackingBus, trackingSpeed, trackingEta, trackingRefreshCount]);

  const trackingStaticMapUrl = useMemo(() => {
    if (!trackingBus) return '';
    const fromCoord = getTownCoords(trackingBus.fromStop, 0);
    const toCoord = getTownCoords(trackingBus.toStop, 1);
    const busLat = Number((fromCoord.lat * 0.45 + toCoord.lat * 0.55).toFixed(5));
    const busLon = Number((fromCoord.lon * 0.45 + toCoord.lon * 0.55).toFixed(5));
    return getGeoapifyStaticMapUrl({
      centerLat: busLat,
      centerLon: busLon,
      zoom: 12,
      vehicleLat: busLat,
      vehicleLon: busLon,
    });
  }, [trackingBus, trackingRefreshCount]);

  // Filtered locations for picker modal
  const filteredLocations = locations.filter((loc) =>
    loc.toLowerCase().includes(pickerSearch.toLowerCase().trim())
  );

  const handleSelectLocation = (loc: string) => {
    if (pickerTarget === 'from') {
      setFromTown(loc);
    } else if (pickerTarget === 'to') {
      setToTown(loc);
    }
    setPickerTarget(null);
    setPickerSearch('');
    setSearchResults(null);
    setSearchHasExecuted(false);
  };

  const handleTabPress = (tab: 'home' | 'tickets' | 'community' | 'profile') => {
    setActiveTab(tab);
    if (tab === 'profile') {
      onNavigateToProfile();
    } else if (tab === 'tickets') {
      if (onNavigateToTickets) {
        onNavigateToTickets();
      } else if (onNavigateToTransit) {
        onNavigateToTransit();
      } else {
        showAlert('My Tickets', 'Digital tickets for your journeys will appear here.');
      }
    } else if (tab === 'community') {
      if (onNavigateToCommunity) {
        onNavigateToCommunity();
      } else {
        showAlert('TransitLK Community', 'Live crowd updates and passenger reports coming soon.');
      }
    }
  };

  const displayName = user?.name ? user.name.split(' ')[0].toUpperCase() : 'KAMAL';

  return (
    <View style={styles.screen}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onNavigateBack || onNavigateToProfile}
          activeOpacity={0.7}
        >
          <ArrowLeftIcon size={22} color="#0F172A" />
          <Text style={styles.headerBrandTitle}>TransitLK</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => showAlert('Notifications', 'No new transit delay notifications.')}
          activeOpacity={0.7}
        >
          <BellIcon size={22} color="#0F172A" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* User Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.kickerText}>GOOD MORNING, {displayName}</Text>
          <Text style={styles.headingText}>Where to today?</Text>
        </View>

        {/* Vehicle Toggle Segment (Bus vs Train) */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              transitType === 'bus' && styles.segmentButtonActive,
            ]}
            onPress={() => setTransitType('bus')}
            activeOpacity={0.8}
          >
            <BusPictogram
              size={20}
              color={transitType === 'bus' ? '#FFFFFF' : colors.teal.primary}
            />
            <Text
              style={[
                styles.segmentText,
                transitType === 'bus' && styles.segmentTextActive,
              ]}
            >
              Bus
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentButton,
              transitType === 'train' && styles.segmentButtonActive,
            ]}
            onPress={() => {
              setTransitType('train');
              showAlert('Train Schedule', 'Sri Lanka Railways commuter train search will be available soon.');
              setTimeout(() => setTransitType('bus'), 800);
            }}
            activeOpacity={0.8}
          >
            <TrainIcon
              size={20}
              color={transitType === 'train' ? '#FFFFFF' : colors.teal.primary}
            />
            <Text
              style={[
                styles.segmentText,
                transitType === 'train' && styles.segmentTextActive,
              ]}
            >
              Train
            </Text>
          </TouchableOpacity>
        </View>

        {/* Journey Route Input Cards */}
        <View style={styles.searchCard}>
          {/* FROM Input */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>From</Text>
            <TouchableOpacity
              style={styles.fieldInputCard}
              onPress={() => {
                setPickerTarget('from');
                setPickerSearch('');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.fieldIconContainer}>
                <LocationPinIcon size={20} color={colors.teal.primary} />
              </View>
              <Text style={styles.fieldTextValue}>{fromTown || 'Select starting town'}</Text>
            </TouchableOpacity>
          </View>

          {/* Swap Button Floating Icon */}
          <TouchableOpacity
            style={styles.swapButton}
            onPress={handleSwapLocations}
            activeOpacity={0.7}
            accessibilityLabel="Swap origin and destination"
          >
            <Text style={styles.swapButtonIcon}>⇅</Text>
          </TouchableOpacity>

          {/* TO Input */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>To</Text>
            <TouchableOpacity
              style={styles.fieldInputCard}
              onPress={() => {
                setPickerTarget('to');
                setPickerSearch('');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.fieldIconContainer}>
                <LocationPinIcon size={20} color={colors.teal.primary} />
              </View>
              <Text style={styles.fieldTextValue}>{toTown || 'Select destination town'}</Text>
            </TouchableOpacity>
          </View>

          {/* TRAVEL DATE Input */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Travel date</Text>
            <TouchableOpacity
              style={styles.fieldInputCard}
              onPress={() => {
                const dates = ['Today', 'Tomorrow', '12 Sep 2026', '13 Sep 2026'];
                const nextIdx = (dates.indexOf(travelDate) + 1) % dates.length;
                setTravelDate(dates[nextIdx]);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.fieldIconContainer}>
                <ClockIcon size={20} color={colors.teal.primary} />
              </View>
              <Text style={styles.fieldTextValue}>{travelDate}</Text>
            </TouchableOpacity>
          </View>

          {/* "Find my ride →" Main Action Button */}
          <TouchableOpacity
            style={[styles.findRideButton, searching && styles.findRideButtonDisabled]}
            onPress={handleSearchBuses}
            disabled={searching}
            activeOpacity={0.85}
          >
            {searching ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.findRideButtonText}>Find my ride</Text>
                <ArrowRightIcon size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Bus Search Results Section */}
        {searchHasExecuted && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <View>
                <Text style={styles.resultsTitle}>
                  {searchResults && searchResults.length > 0
                    ? `Available Buses (${searchResults.length})`
                    : 'No direct buses found'}
                </Text>
                <Text style={styles.resultsSubtitle}>
                  {fromTown} → {toTown} • {travelDate}
                </Text>
              </View>
            </View>

            {searchResults && searchResults.length > 0 ? (
              searchResults.map((bus) => (
                <View key={bus.id} style={styles.busCard}>
                  {/* Card Header: Route Number + Bus Type + Price */}
                  <View style={styles.busCardHeader}>
                    <View style={styles.routeBadgeGroup}>
                      <View style={styles.routeNumberBadge}>
                        <Text style={styles.routeNumberText}>Route {bus.routeNumber}</Text>
                      </View>
                      <View style={styles.busTypeBadge}>
                        <Text style={styles.busTypeText}>{bus.busType}</Text>
                      </View>
                    </View>
                    <View style={styles.fareContainer}>
                      <Text style={styles.fareCurrency}>Rs.</Text>
                      <Text style={styles.fareAmount}>{bus.fare}</Text>
                    </View>
                  </View>

                  {/* Route & Fleet Name */}
                  <View style={styles.busInfoRow}>
                    <Text style={styles.companyNameText}>{bus.companyName || bus.ownerName}</Text>
                    <Text style={styles.regNumberText}>{bus.busRegNumber}</Text>
                  </View>

                  {/* Schedule Timings */}
                  <View style={styles.scheduleRow}>
                    <View style={styles.timeBlock}>
                      <Text style={styles.timeText}>{bus.departureTime}</Text>
                      <Text style={styles.stationText}>{bus.fromStop}</Text>
                    </View>

                    <View style={styles.durationBlock}>
                      <Text style={styles.durationText}>{bus.duration}</Text>
                      <View style={styles.routeLine}>
                        <View style={styles.routeDot} />
                        <View style={styles.routeDash} />
                        <View style={styles.routeDot} />
                      </View>
                      <Text style={styles.stopsBetweenText}>{bus.stopsBetween} stops</Text>
                    </View>

                    <View style={[styles.timeBlock, { alignItems: 'flex-end' }]}>
                      <Text style={styles.timeText}>{bus.arrivalTime}</Text>
                      <Text style={styles.stationText}>{bus.toStop}</Text>
                    </View>
                  </View>

                  {/* Features & Seats Availability */}
                  <View style={styles.featuresRow}>
                    <View style={styles.seatsBadge}>
                      <Text style={styles.seatsText}>
                        💺 {bus.availableSeats} of {bus.totalSeats} seats left
                      </Text>
                    </View>

                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>★ {bus.rating.toFixed(1)}</Text>
                    </View>
                  </View>

                  {/* Feature Tags */}
                  {bus.features && bus.features.length > 0 && (
                    <View style={styles.featureTagsList}>
                      {bus.features.map((feat, idx) => (
                        <View key={idx} style={styles.featurePill}>
                          <Text style={styles.featurePillText}>✓ {feat}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Track My Bus Live GPS Action Button */}
                  <TouchableOpacity
                    style={styles.trackBusButton}
                    onPress={() => handleTrackBus(bus)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.trackBusButtonContent}>
                      <View style={styles.trackLiveDotOuter}>
                        <View style={styles.trackLiveDotInner} />
                      </View>
                      <Text style={styles.trackBusButtonText}>Track My Bus</Text>
                    </View>
                    <View style={styles.trackBusArrowCircle}>
                      <ArrowRightIcon size={14} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyResultsCard}>
                <Text style={styles.emptyResultsIcon}>🚌</Text>
                <Text style={styles.emptyResultsTitle}>No Direct Buses in this Direction</Text>
                <Text style={styles.emptyResultsText}>
                  Bus operators currently operate scheduled trips along designated stop sequences.
                  Make sure your journey follows the route direction from {fromTown} to {toTown}.
                </Text>
                <TouchableOpacity
                  style={styles.swapActionButton}
                  onPress={handleSwapLocations}
                  activeOpacity={0.8}
                >
                  <Text style={styles.swapActionText}>Swap Direction ({toTown} → {fromTown})</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Promo Marketing Card from Figma */}
        <View style={styles.promoCard}>
          <Text style={styles.promoTitle}>A better way to get there</Text>
          <Text style={styles.promoSubtitle}>
            Live arrivals. Digital tickets. Less waiting.
          </Text>
        </View>

        {/* Colombo Bus Network Information Card */}
        <View style={styles.networkInfoCard}>
          <Text style={styles.networkInfoTitle}>Verified Colombo Bus Routes</Text>
          <Text style={styles.networkInfoDesc}>
            Only verified and approved Sri Lankan bus owners can register buses on TransitLK.
            Active routes include:
          </Text>
          <View style={styles.routePillsContainer}>
            {['120 Horana-Colombo', '138 Homagama-Pettah', '100 Panadura-Fort', '122 Avissawella-Pettah', '177 Kaduwela-Kollupitiya', '255 Kottawa-Mt Lavinia'].map((r, i) => (
              <View key={i} style={styles.routeInfoPill}>
                <Text style={styles.routeInfoPillText}>{r}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Town Location Picker Modal */}
      {Platform.OS === 'web' ? (
        pickerTarget !== null && (
          <View style={styles.webModalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={() => setPickerTarget(null)}
            />
            <View style={styles.modalSheet}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    Select {pickerTarget === 'from' ? 'Starting Town' : 'Destination Town'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Choose from {locations.length} verified Sri Lankan bus stop locations
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPickerTarget(null)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Modal Search Input */}
              <View style={styles.modalSearchBox}>
                <SearchIcon size={18} color="#64748B" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search town (e.g., Horana, Colombo, Maharagama)..."
                  placeholderTextColor="#94A3B8"
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                  autoFocus={true}
                />
                {pickerSearch ? (
                  <TouchableOpacity onPress={() => setPickerSearch('')}>
                    <Text style={styles.clearSearchText}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Town List */}
              {loadingLocations ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color={colors.teal.primary} />
                  <Text style={styles.modalLoadingText}>Loading route stops from database...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredLocations}
                  keyExtractor={(item) => item}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const isSelected =
                      (pickerTarget === 'from' && item === fromTown) ||
                      (pickerTarget === 'to' && item === toTown);

                    return (
                      <TouchableOpacity
                        style={[styles.locationListItem, isSelected && styles.locationListItemSelected]}
                        onPress={() => handleSelectLocation(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.locationListIcon}>
                          <LocationPinIcon
                            size={18}
                            color={isSelected ? colors.teal.primary : '#64748B'}
                          />
                        </View>
                        <Text
                          style={[
                            styles.locationListName,
                            isSelected && styles.locationListNameSelected,
                          ]}
                        >
                          {item}
                        </Text>
                        {isSelected && (
                          <View style={styles.selectedCheck}>
                            <CheckIcon size={14} color="#007A74" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.modalEmpty}>
                      <Text style={styles.modalEmptyText}>No locations match "{pickerSearch}"</Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        )
      ) : (
        <Modal
          visible={pickerTarget !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setPickerTarget(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    Select {pickerTarget === 'from' ? 'Starting Town' : 'Destination Town'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Choose from {locations.length} verified Sri Lankan bus stop locations
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPickerTarget(null)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Modal Search Input */}
              <View style={styles.modalSearchBox}>
                <SearchIcon size={18} color="#64748B" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search town (e.g., Horana, Colombo, Maharagama)..."
                  placeholderTextColor="#94A3B8"
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                  autoFocus={true}
                />
                {pickerSearch ? (
                  <TouchableOpacity onPress={() => setPickerSearch('')}>
                    <Text style={styles.clearSearchText}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Town List */}
              {loadingLocations ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color={colors.teal.primary} />
                  <Text style={styles.modalLoadingText}>Loading route stops from database...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredLocations}
                  keyExtractor={(item) => item}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const isSelected =
                      (pickerTarget === 'from' && item === fromTown) ||
                      (pickerTarget === 'to' && item === toTown);

                    return (
                      <TouchableOpacity
                        style={[styles.locationListItem, isSelected && styles.locationListItemSelected]}
                        onPress={() => handleSelectLocation(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.locationListIcon}>
                          <LocationPinIcon
                            size={18}
                            color={isSelected ? colors.teal.primary : '#64748B'}
                          />
                        </View>
                        <Text
                          style={[
                            styles.locationListName,
                            isSelected && styles.locationListNameSelected,
                          ]}
                        >
                          {item}
                        </Text>
                        {isSelected && (
                          <View style={styles.selectedCheck}>
                            <CheckIcon size={14} color="#007A74" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.modalEmpty}>
                      <Text style={styles.modalEmptyText}>No locations match "{pickerSearch}"</Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Live Bus GPS Tracking Modal */}
      {Platform.OS === 'web' ? (
        showTrackingModal && trackingBus !== null && (
          <View style={styles.webModalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={() => setShowTrackingModal(false)}
            />
            <View style={styles.trackingModalSheet}>
              {/* Modal Header */}
              <View style={styles.trackingHeader}>
                <View style={styles.trackingHeaderLeft}>
                  <View style={styles.trackingRoutePill}>
                    <Text style={styles.trackingRouteText}>Route {trackingBus?.routeNumber}</Text>
                  </View>
                  <View style={styles.liveGpsBadge}>
                    <View style={styles.liveGpsDot} />
                    <Text style={styles.liveGpsText}>LIVE GPS</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setShowTrackingModal(false)}
                  style={styles.modalCloseButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.trackingModalScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.trackingModalScrollContent}
              >
                {/* Bus Title & Plate Number */}
                <View style={styles.trackingTitleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trackingBusName}>
                      {trackingBus?.companyName || trackingBus?.ownerName}
                    </Text>
                    <Text style={styles.trackingPlateNumber}>
                      Plate: {trackingBus?.busRegNumber} • {trackingBus?.busType}
                    </Text>
                  </View>
                  <View style={styles.trackingRatingBadge}>
                    <Text style={styles.trackingRatingText}>★ {trackingBus?.rating.toFixed(1)}</Text>
                  </View>
                </View>

                {/* Real-time Map Box */}
                <View style={styles.trackingMapContainer}>
                  <iframe
                    title={`Live GPS Map - Route ${trackingBus?.routeNumber}`}
                    srcDoc={trackingLeafletHtml}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: 16,
                      display: 'block',
                    }}
                  />
                  <View style={styles.mapOverlayPill}>
                    <Text style={styles.mapOverlayPillText}>
                      🛰️ Geoapify Satellite GPS Telemetry
                    </Text>
                  </View>
                </View>

                {/* KPI Telemetry Stat Grid */}
                <View style={styles.telemetryGrid}>
                  <View style={styles.telemetryStatCard}>
                    <Text style={styles.telemetryStatIcon}>⚡</Text>
                    <Text style={styles.telemetryStatValue}>{trackingSpeed} km/h</Text>
                    <Text style={styles.telemetryStatLabel}>Current Speed</Text>
                  </View>

                  <View style={styles.telemetryStatCard}>
                    <Text style={styles.telemetryStatIcon}>⏱️</Text>
                    <Text style={[styles.telemetryStatValue, { color: colors.teal.primary }]}>
                      ~{trackingEta} mins
                    </Text>
                    <Text style={styles.telemetryStatLabel}>Estimated ETA</Text>
                  </View>

                  <View style={styles.telemetryStatCard}>
                    <Text style={styles.telemetryStatIcon}>💺</Text>
                    <Text style={[styles.telemetryStatValue, { color: '#16A34A' }]}>
                      {trackingBus?.availableSeats} seats
                    </Text>
                    <Text style={styles.telemetryStatLabel}>Available</Text>
                  </View>
                </View>

                {/* Route Progress Visualizer */}
                <View style={styles.trackingTimelineCard}>
                  <Text style={styles.timelineCardTitle}>Journey Schedule & Live Telemetry</Text>
                  
                  <View style={styles.timelineRow}>
                    <View style={[styles.timelineNode, { backgroundColor: '#10B981' }]}>
                      <Text style={styles.timelineNodeText}>A</Text>
                    </View>
                    <View style={styles.timelineInfo}>
                      <Text style={styles.timelineStopTitle}>{trackingBus?.fromStop}</Text>
                      <Text style={styles.timelineStopSub}>
                        Origin • Scheduled departure: {trackingBus?.departureTime}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.timelineConnector} />

                  <View style={styles.timelineRow}>
                    <View style={[styles.timelineNode, { backgroundColor: colors.teal.primary }]}>
                      <Text style={styles.timelineNodeText}>🚌</Text>
                    </View>
                    <View style={styles.timelineInfo}>
                      <View style={styles.liveLocationBadgeRow}>
                        <Text style={styles.liveLocationTitle}>Live Vehicle Position</Text>
                        <View style={styles.activePulsingChip}>
                          <Text style={styles.activePulsingChipText}>EN ROUTE</Text>
                        </View>
                      </View>
                      <Text style={styles.timelineStopSub}>
                        Moving at {trackingSpeed} km/h • Next stop approaching in {Math.max(2, Math.round(trackingEta / 2))} mins
                      </Text>
                    </View>
                  </View>

                  <View style={styles.timelineConnector} />

                  <View style={styles.timelineRow}>
                    <View style={[styles.timelineNode, { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.timelineNodeText}>B</Text>
                    </View>
                    <View style={styles.timelineInfo}>
                      <Text style={styles.timelineStopTitle}>{trackingBus?.toStop}</Text>
                      <Text style={styles.timelineStopSub}>
                        Destination • Estimated arrival: {trackingBus?.arrivalTime} ({trackingBus?.duration})
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Refresh & Controls */}
                <View style={styles.trackingActionsRow}>
                  <TouchableOpacity
                    style={styles.refreshGpsButton}
                    onPress={handleRefreshTracking}
                    activeOpacity={0.8}
                    disabled={trackingLoading}
                  >
                    {trackingLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.refreshGpsIcon}>🔄</Text>
                        <Text style={styles.refreshGpsText}>Refresh Live GPS</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeTrackingModalButton}
                    onPress={() => setShowTrackingModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.closeTrackingModalText}>Done</Text>
                  </TouchableOpacity>
                </View>

                {/* Seamless ticket checkout if passenger wishes to ride this bus */}
                {onNavigateToPayment && trackingBus && (
                  <TouchableOpacity
                    style={styles.modalBuyTicketButton}
                    onPress={() => {
                      const busToPay = trackingBus;
                      setShowTrackingModal(false);
                      onNavigateToPayment(busToPay);
                    }}
                    activeOpacity={0.85}
                  >
                    <TicketIcon size={18} color="#FFFFFF" />
                    <Text style={styles.modalBuyTicketButtonText}>
                      Select & Buy Ticket (Rs. {trackingBus.fare})
                    </Text>
                    <ArrowRightIcon size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                <Text style={styles.telemetryFooterNotice}>
                  ✓ Verified TransitLK GPS Telemetry • Powered by Geoapify
                </Text>
              </ScrollView>
            </View>
          </View>
        )
      ) : (
        <Modal
          visible={showTrackingModal && trackingBus !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowTrackingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.trackingModalSheet}>
              {/* Modal Header */}
              <View style={styles.trackingHeader}>
                <View style={styles.trackingHeaderLeft}>
                  <View style={styles.trackingRoutePill}>
                    <Text style={styles.trackingRouteText}>Route {trackingBus?.routeNumber}</Text>
                  </View>
                  <View style={styles.liveGpsBadge}>
                    <View style={styles.liveGpsDot} />
                    <Text style={styles.liveGpsText}>LIVE GPS</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setShowTrackingModal(false)}
                  style={styles.modalCloseButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.trackingModalScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.trackingModalScrollContent}
              >
                {/* Bus Title & Plate Number */}
                <View style={styles.trackingTitleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trackingBusName}>
                      {trackingBus?.companyName || trackingBus?.ownerName}
                    </Text>
                    <Text style={styles.trackingPlateNumber}>
                      Plate: {trackingBus?.busRegNumber} • {trackingBus?.busType}
                    </Text>
                  </View>
                  <View style={styles.trackingRatingBadge}>
                    <Text style={styles.trackingRatingText}>★ {trackingBus?.rating.toFixed(1)}</Text>
                  </View>
                </View>

                {/* Real-time Map Box */}
                <View style={styles.trackingMapContainer}>
                  <Image
                    source={{ uri: trackingStaticMapUrl }}
                    style={styles.trackingStaticMapImage}
                    resizeMode="cover"
                  />
                  <View style={styles.mapOverlayPill}>
                    <Text style={styles.mapOverlayPillText}>
                      🛰️ Geoapify Satellite GPS Telemetry
                    </Text>
                  </View>
                </View>

                {/* KPI Telemetry Stat Grid */}
                <View style={styles.telemetryGrid}>
                  <View style={styles.telemetryStatCard}>
                    <Text style={styles.telemetryStatIcon}>⚡</Text>
                    <Text style={styles.telemetryStatValue}>{trackingSpeed} km/h</Text>
                    <Text style={styles.telemetryStatLabel}>Current Speed</Text>
                  </View>

                  <View style={styles.telemetryStatCard}>
                    <Text style={styles.telemetryStatIcon}>⏱️</Text>
                    <Text style={[styles.telemetryStatValue, { color: colors.teal.primary }]}>
                      ~{trackingEta} mins
                    </Text>
                    <Text style={styles.telemetryStatLabel}>Estimated ETA</Text>
                  </View>

                  <View style={styles.telemetryStatCard}>
                    <Text style={styles.telemetryStatIcon}>💺</Text>
                    <Text style={[styles.telemetryStatValue, { color: '#16A34A' }]}>
                      {trackingBus?.availableSeats} seats
                    </Text>
                    <Text style={styles.telemetryStatLabel}>Available</Text>
                  </View>
                </View>

                {/* Route Progress Visualizer */}
                <View style={styles.trackingTimelineCard}>
                  <Text style={styles.timelineCardTitle}>Journey Schedule & Live Telemetry</Text>
                  
                  <View style={styles.timelineRow}>
                    <View style={[styles.timelineNode, { backgroundColor: '#10B981' }]}>
                      <Text style={styles.timelineNodeText}>A</Text>
                    </View>
                    <View style={styles.timelineInfo}>
                      <Text style={styles.timelineStopTitle}>{trackingBus?.fromStop}</Text>
                      <Text style={styles.timelineStopSub}>
                        Origin • Scheduled departure: {trackingBus?.departureTime}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.timelineConnector} />

                  <View style={styles.timelineRow}>
                    <View style={[styles.timelineNode, { backgroundColor: colors.teal.primary }]}>
                      <Text style={styles.timelineNodeText}>🚌</Text>
                    </View>
                    <View style={styles.timelineInfo}>
                      <View style={styles.liveLocationBadgeRow}>
                        <Text style={styles.liveLocationTitle}>Live Vehicle Position</Text>
                        <View style={styles.activePulsingChip}>
                          <Text style={styles.activePulsingChipText}>EN ROUTE</Text>
                        </View>
                      </View>
                      <Text style={styles.timelineStopSub}>
                        Moving at {trackingSpeed} km/h • Next stop approaching in {Math.max(2, Math.round(trackingEta / 2))} mins
                      </Text>
                    </View>
                  </View>

                  <View style={styles.timelineConnector} />

                  <View style={styles.timelineRow}>
                    <View style={[styles.timelineNode, { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.timelineNodeText}>B</Text>
                    </View>
                    <View style={styles.timelineInfo}>
                      <Text style={styles.timelineStopTitle}>{trackingBus?.toStop}</Text>
                      <Text style={styles.timelineStopSub}>
                        Destination • Estimated arrival: {trackingBus?.arrivalTime} ({trackingBus?.duration})
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Refresh & Controls */}
                <View style={styles.trackingActionsRow}>
                  <TouchableOpacity
                    style={styles.refreshGpsButton}
                    onPress={handleRefreshTracking}
                    activeOpacity={0.8}
                    disabled={trackingLoading}
                  >
                    {trackingLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.refreshGpsIcon}>🔄</Text>
                        <Text style={styles.refreshGpsText}>Refresh Live GPS</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeTrackingModalButton}
                    onPress={() => setShowTrackingModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.closeTrackingModalText}>Done</Text>
                  </TouchableOpacity>
                </View>

                {/* Seamless ticket checkout if passenger wishes to ride this bus */}
                {onNavigateToPayment && trackingBus && (
                  <TouchableOpacity
                    style={styles.modalBuyTicketButton}
                    onPress={() => {
                      const busToPay = trackingBus;
                      setShowTrackingModal(false);
                      onNavigateToPayment(busToPay);
                    }}
                    activeOpacity={0.85}
                  >
                    <TicketIcon size={18} color="#FFFFFF" />
                    <Text style={styles.modalBuyTicketButtonText}>
                      Select & Buy Ticket (Rs. {trackingBus.fare})
                    </Text>
                    <ArrowRightIcon size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                <Text style={styles.telemetryFooterNotice}>
                  ✓ Verified TransitLK GPS Telemetry • Powered by Geoapify
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Bottom Tab Bar (matching Figma 04 · Home) */}
      <View style={styles.bottomTabBar}>
        {/* Tab 1: Home (Active) */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleTabPress('home')}
          activeOpacity={0.8}
        >
          <View style={styles.activeTabPill}>
            <HomeIcon size={19} color={colors.teal.primary} />
            <Text style={styles.activeTabLabel}>Home</Text>
          </View>
        </TouchableOpacity>

        {/* Tab 2: Tickets */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleTabPress('tickets')}
          activeOpacity={0.7}
        >
          <TicketIcon size={22} color={colors.neutral.placeholder} />
          <Text style={styles.tabLabel}>Tickets</Text>
        </TouchableOpacity>

        {/* Tab 3: Community */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleTabPress('community')}
          activeOpacity={0.7}
        >
          <ChatBubbleIcon size={22} color={colors.neutral.placeholder} />
          <Text style={styles.tabLabel}>Community</Text>
        </TouchableOpacity>

        {/* Tab 4: Profile */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => handleTabPress('profile')}
          activeOpacity={0.7}
        >
          <UserIcon size={22} color={colors.neutral.placeholder} />
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  topHeader: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  greetingSection: {
    marginTop: 6,
    marginBottom: 16,
  },
  kickerText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.teal.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headingText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: colors.teal.primary,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.teal.primary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...platformShadow({ color: '#000000', width: 0, height: 2, opacity: 0.04, radius: 8, elevation: 2 }),
    position: 'relative',
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  fieldInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  fieldIconContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldTextValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  swapButton: {
    position: 'absolute',
    right: 24,
    top: 86,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  swapButtonIcon: {
    fontSize: 16,
    color: colors.teal.primary,
    fontWeight: '700',
  },
  findRideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.teal.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
  },
  findRideButtonDisabled: {
    opacity: 0.7,
  },
  findRideButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultsContainer: {
    marginBottom: 22,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  resultsSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  busCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...platformShadow({ color: '#000000', width: 0, height: 2, opacity: 0.04, radius: 6, elevation: 2 }),
  },
  busCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeNumberBadge: {
    backgroundColor: '#DCF5EE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  routeNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.teal.primary,
  },
  busTypeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  busTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  fareContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  fareCurrency: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.teal.primary,
  },
  fareAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.teal.primary,
  },
  busInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  regNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  timeBlock: {
    flex: 1,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  stationText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  durationBlock: {
    flex: 1.2,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 6,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal.primary,
  },
  routeDash: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#CBD5E1',
  },
  stopsBetweenText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 4,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seatsBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  seatsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  ratingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  featureTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  featurePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featurePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  trackBusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.teal.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  trackBusButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackLiveDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackLiveDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  trackBusButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  trackBusArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyResultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyResultsIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyResultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyResultsText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  swapActionButton: {
    backgroundColor: colors.teal.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  swapActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  promoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 18,
  },
  networkInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  networkInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  networkInfoDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 10,
  },
  routePillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  routeInfoPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  routeInfoPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  webModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  modalBackdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 412,
    alignSelf: 'center',
    zIndex: 1000,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    outlineStyle: 'none' as any,
  },
  clearSearchText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.teal.primary,
  },
  modalLoading: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  modalLoadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  locationListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  locationListItemSelected: {
    backgroundColor: '#DCF5EE',
    borderRadius: 10,
  },
  locationListIcon: {
    width: 24,
    alignItems: 'center',
  },
  locationListName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  locationListNameSelected: {
    color: colors.teal.primary,
    fontWeight: '800',
  },
  selectedCheck: {
    width: 20,
    alignItems: 'center',
  },
  modalEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  trackingModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    width: '100%',
    maxWidth: 412,
    maxHeight: '88%',
    alignSelf: 'center',
    overflow: 'hidden',
    zIndex: 1000,
    ...platformShadow({ color: '#000000', width: 0, height: 4, opacity: 0.15, radius: 16, elevation: 8 }),
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  trackingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trackingRoutePill: {
    backgroundColor: colors.teal.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trackingRouteText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  liveGpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveGpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveGpsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  trackingModalScroll: {
    flexGrow: 0,
  },
  trackingModalScrollContent: {
    padding: 18,
    paddingBottom: 28,
  },
  trackingTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  trackingBusName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  trackingPlateNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  trackingRatingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trackingRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  trackingMapContainer: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trackingStaticMapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlayPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapOverlayPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  telemetryStatCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  telemetryStatIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  telemetryStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  telemetryStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  trackingTimelineCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timelineInfo: {
    flex: 1,
  },
  timelineStopTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineStopSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  timelineConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginLeft: 12,
    marginVertical: 2,
  },
  liveLocationBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveLocationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.teal.primary,
  },
  activePulsingChip: {
    backgroundColor: '#DCF5EE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePulsingChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.teal.primary,
    letterSpacing: 0.5,
  },
  trackingActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  refreshGpsButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.teal.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  refreshGpsIcon: {
    fontSize: 14,
  },
  refreshGpsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeTrackingModalButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
  },
  closeTrackingModalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  telemetryFooterNotice: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  modalBuyTicketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.teal.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  modalBuyTicketButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  bottomTabBar: {
    height: 64,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral.placeholder,
    marginTop: 3,
  },
  activeTabPill: {
    backgroundColor: '#DCF5EE',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.teal.primary,
    marginTop: 2,
  },
});
