import {useBusTelemetry} from '../location/useBusTelemetry';
import {NotificationBell} from '../notifications/Notifications';
import React, { useState, useEffect, useMemo } from 'react';
import ResolvedJourneyMap from '../location/ResolvedJourneyMap';
import {RoutePlannerButton} from '../location/RoutePlanner';
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
import { GEOAPIFY_API_KEY } from '../geoapify';

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

function formatDeviceLocalTime(): string {
  const now = new Date();
  let hours = now.getHours();
  const mins = now.getMinutes();
  const meridian = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${meridian}`;
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
  const [travelDate, setTravelDate] = useState('Today');
  const [localTimeStr, setLocalTimeStr] = useState<string>(() => formatDeviceLocalTime());
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [statusTab, setStatusTab] = useState<'all' | 'live_now' | 'upcoming'>('all');
  const [searchMeta, setSearchMeta] = useState<{
    localTime: string;
    startTime: string;
    endTime: string;
    liveNowCount: number;
    upcomingCount: number;
    filteredPastCount: number;
  } | null>(null);

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
  const [demoTracking,setDemoTracking]=useState(true);
  const [demoStats,setDemoStats]=useState<{speedKmh:number;etaMinutes:number}|null>(null);
  const telemetry=useBusTelemetry(showTrackingModal && !demoTracking ? trackingBus?.id : undefined);
  const trackingSpeed=demoTracking?demoStats?.speedKmh:telemetry.data?.speedKmh;
  const [trackingEta, setTrackingEta] = useState<number|null>(null);
  const trackingLoading=telemetry.loading;
  const [trackingRefreshCount, setTrackingRefreshCount] = useState(0);

  // Active bottom tab
  const [activeTab, setActiveTab] = useState<'home' | 'tickets' | 'community' | 'profile'>('home');

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTimeStr(formatDeviceLocalTime());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

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

    const currentLocal = formatDeviceLocalTime();
    setLocalTimeStr(currentLocal);

    try {
      const res = await api.searchBuses({
        from: fromTown.trim(),
        to: toTown.trim(),
        date: 'Today',
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        localTime: currentLocal,
      });

      if (res.success && res.buses) {
        setSearchResults(res.buses);
        setSearchMeta({
          localTime: res.localTime || currentLocal,
          startTime: res.startTime || startTime.trim() || currentLocal,
          endTime: res.endTime || endTime.trim() || '11:59 PM',
          liveNowCount: res.liveNowCount ?? res.buses.filter((b) => b.isLiveNow).length,
          upcomingCount: res.upcomingCount ?? res.buses.filter((b) => b.isUpcoming).length,
          filteredPastCount: res.filteredPastCount ?? 0,
        });
      } else {
        setSearchResults([]);
        setSearchMeta(null);
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
    setShowTrackingModal(true);
  };

  const handleRefreshTracking = telemetry.refresh;

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

  const displayedBuses = useMemo(() => {
    if (!searchResults) return [];
    if (statusTab === 'live_now') {
      return searchResults.filter((b) => b.scheduleStatus === 'live_now' || b.isLiveNow);
    }
    if (statusTab === 'upcoming') {
      return searchResults.filter((b) => b.scheduleStatus === 'upcoming' || b.isUpcoming);
    }
    return searchResults;
  }, [searchResults, statusTab]);

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

        <NotificationBell/>
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

          {/* TODAY LOCAL TIME BANNER */}
          <View style={styles.fieldBlock}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ECFDF5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#A7F3D0' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#065F46' }}>TODAY ONLY • LOCAL TIME</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#047857' }}>{localTimeStr}</Text>
            </View>
          </View>

          {/* START TIME & END TIME WINDOW */}
          <View style={styles.fieldBlock}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.fieldLabel}>Start Time & End Time (Today)</Text>
              {(startTime || endTime) ? (
                <TouchableOpacity onPress={() => { setStartTime(''); setEndTime(''); }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.teal.primary }}>Reset to Now ({localTimeStr})</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.fieldInputCard, { flex: 1, paddingHorizontal: 10, height: 46 }]}>
                <ClockIcon size={16} color={colors.teal.primary} />
                <TextInput
                  style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#0F172A', marginLeft: 6 }}
                  placeholder={`Start (${localTimeStr})`}
                  placeholderTextColor="#94A3B8"
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>→</Text>
              <View style={[styles.fieldInputCard, { flex: 1, paddingHorizontal: 10, height: 46 }]}>
                <ClockIcon size={16} color={colors.teal.primary} />
                <TextInput
                  style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#0F172A', marginLeft: 6 }}
                  placeholder="End (11:59 PM)"
                  placeholderTextColor="#94A3B8"
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 8 }}>
              {[
                { label: 'Now → Tonight', s: '', e: '' },
                { label: 'Morning', s: '06:00 AM', e: '12:00 PM' },
                { label: 'Afternoon', s: '12:00 PM', e: '06:00 PM' },
                { label: 'Evening', s: '06:00 PM', e: '11:30 PM' },
              ].map((preset, idx) => {
                const active = startTime === preset.s && endTime === preset.e;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => { setStartTime(preset.s); setEndTime(preset.e); }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 999,
                      backgroundColor: active ? colors.teal.primary : '#F1F5F9',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#FFFFFF' : '#475569' }}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
              <View style={{ flex: 1 }}>
                <Text style={styles.resultsTitle}>
                  {displayedBuses.length > 0
                    ? `Today's Available Buses (${displayedBuses.length})`
                    : 'No buses in selected time window'}
                </Text>
                <Text style={styles.resultsSubtitle}>
                  {fromTown} → {toTown} • Local Time {searchMeta?.localTime || localTimeStr} • Window {searchMeta?.startTime || localTimeStr} – {searchMeta?.endTime || '11:59 PM'}
                </Text>
              </View>
            </View>

            {searchResults && searchResults.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => setStatusTab('all')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: statusTab === 'all' ? colors.teal.primary : '#E2E8F0',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: statusTab === 'all' ? '#FFFFFF' : '#334155' }}>
                    All Today ({searchResults.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStatusTab('live_now')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: statusTab === 'live_now' ? '#059669' : '#DCFCE7',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: statusTab === 'live_now' ? '#FFFFFF' : '#065F46' }}>
                    Live Now ({searchMeta?.liveNowCount ?? searchResults.filter((b) => b.isLiveNow).length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStatusTab('upcoming')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: statusTab === 'upcoming' ? '#2563EB' : '#DBEAFE',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: statusTab === 'upcoming' ? '#FFFFFF' : '#1E40AF' }}>
                    Upcoming ({searchMeta?.upcomingCount ?? searchResults.filter((b) => b.isUpcoming).length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {displayedBuses.length > 0 ? (
              displayedBuses.map((bus, busIdx) => (
                <View key={`${bus.id}-${bus.departureTime || busIdx}`} style={styles.busCard}>
                  {/* Live Now / Upcoming Status Banner */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      marginBottom: 10,
                      backgroundColor: bus.isLiveNow ? '#ECFDF5' : '#EFF6FF',
                      borderWidth: 1,
                      borderColor: bus.isLiveNow ? '#A7F3D0' : '#BFDBFE',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: bus.isLiveNow ? '#047857' : '#1D4ED8',
                      }}
                    >
                      {bus.isLiveNow ? '● LIVE NOW • ON ROUTE' : '● UPCOMING TODAY'}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: bus.isLiveNow ? '#065F46' : '#1E40AF',
                      }}
                    >
                      {bus.departsInText || (bus.isLiveNow ? 'Running now' : `Departs ${bus.departureTime}`)}
                    </Text>
                  </View>

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

        <RoutePlannerButton from={fromTown} to={toTown}/>
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
                    <Text style={styles.liveGpsText}>{demoTracking?'DEMO BUS':telemetry.data?.status==='live'?'LIVE GPS':telemetry.data?.status==='stale'?'STALE GPS':'GPS OFFLINE'}</Text>
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

                <RoutePlannerButton from={trackingBus?.fromStop} to={trackingBus?.toStop}/>
                <TouchableOpacity onPress={()=>setDemoTracking(v=>!v)} style={{padding:12}}><Text style={{color:colors.teal.primary,fontWeight:"700"}}>{demoTracking?"Demo bus running · Switch to real GPS":"Real GPS · Show demo bus instead"}</Text></TouchableOpacity>
                {/* Road route map */}
                <View style={styles.trackingMapContainer}>
                  <ResolvedJourneyMap origin={trackingBus?.fromStop || ""} destination={trackingBus?.toStop || ""} stops={trackingBus?.routeStops} vehicle={telemetry.data?.position} onEta={setTrackingEta} demo={demoTracking} onDemo={setDemoStats}/>
                </View>

                {/* KPI Telemetry Stat Grid */}
                <View style={styles.telemetryGrid}>
                  <View style={styles.telemetryStatCard}>
                    <Text style={styles.telemetryStatIcon}>⚡</Text>
                    <Text style={styles.telemetryStatValue}>{trackingSpeed!=null?`${trackingSpeed} km/h`:'—'}</Text>
                    <Text style={styles.telemetryStatLabel}>{demoTracking?"Demo Speed":"GPS Speed"}</Text>
                  </View>

                  <View style={styles.telemetryStatCard}>
                    <Text style={styles.telemetryStatIcon}>⏱️</Text>
                    <Text style={[styles.telemetryStatValue, { color: colors.teal.primary }]}>
                      {demoTracking?(demoStats?`${demoStats.etaMinutes} mins`:'—'):telemetry.data?.status==='live'&&trackingEta!=null?`~${trackingEta} mins`:'—'}
                    </Text>
                    <Text style={styles.telemetryStatLabel}>{demoTracking?"Demo ETA":"Road ETA estimate"}</Text>
                  </View>

                  <View style={styles.telemetryStatCard}>
                    <Text style={styles.telemetryStatIcon}>💺</Text>
                    <Text style={[styles.telemetryStatValue, { color: '#16A34A' }]}>
                      {trackingBus?.availableSeats} seats
                    </Text>
                    <Text style={styles.telemetryStatLabel}>Listed seats</Text>
                  </View>
                </View>

                {/* Route Progress Visualizer */}
                <View style={styles.trackingTimelineCard}>
                  <Text style={styles.timelineCardTitle}>Journey Schedule & GPS</Text>
                  
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
                        <Text style={styles.liveLocationTitle}>Bus GPS position</Text>
                        <View style={styles.activePulsingChip}>
                          <Text style={styles.activePulsingChipText}>{demoTracking?'SIMULATED':telemetry.data?.status==='live'?'RECEIVING':'WAITING'}</Text>
                        </View>
                      </View>
                      <Text style={styles.timelineStopSub}>
                        Moving at {trackingSpeed ?? 0} km/h • Next stop approaching in {Math.max(2, Math.round(((demoTracking ? demoStats?.etaMinutes : trackingEta) || 10) / 2))} mins
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
                        Destination • Scheduled arrival: {trackingBus?.arrivalTime} ({trackingBus?.duration})
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Refresh & Controls */}
                <View style={styles.trackingActionsRow}>
                  <TouchableOpacity
                    style={styles.refreshGpsButton}
                    onPress={()=>demoTracking?setDemoTracking(false):handleRefreshTracking()}
                    activeOpacity={0.8}
                    disabled={trackingLoading}
                  >
                    {trackingLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.refreshGpsIcon}>🔄</Text>
                        <Text style={styles.refreshGpsText}>{demoTracking?"Use real bus GPS":"Refresh Bus GPS"}</Text>
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
                  {demoTracking?"Demo bus simulation · Not live vehicle tracking":"Owner phone GPS · Road ETA is an estimate, not live traffic."}
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
                    <Text style={styles.liveGpsText}>
                      {demoTracking
                        ? 'DEMO BUS'
                        : telemetry.data?.status === 'live'
                        ? 'LIVE GPS'
                        : telemetry.data?.status === 'stale'
                        ? 'STALE GPS'
                        : 'GPS OFFLINE'}
                    </Text>
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

                <RoutePlannerButton from={trackingBus?.fromStop} to={trackingBus?.toStop} />
                <TouchableOpacity onPress={() => setDemoTracking((v) => !v)} style={{ padding: 12 }}>
                  <Text style={{ color: colors.teal.primary, fontWeight: '700' }}>
                    {demoTracking
                      ? 'Demo bus running · Switch to real GPS'
                      : 'Real GPS · Show demo bus instead'}
                  </Text>
                </TouchableOpacity>

                {/* Road route map */}
                <View style={styles.trackingMapContainer}>
                  {trackingBus && (
                    <ResolvedJourneyMap
                      origin={trackingBus.fromStop}
                      destination={trackingBus.toStop}
                      stops={trackingBus.routeStops}
                      vehicle={telemetry.data?.position}
                      onEta={setTrackingEta}
                      demo={demoTracking}
                      onDemo={setDemoStats}
                    />
                  )}
                </View>

                {/* KPI Telemetry Stat Grid */}
                <View style={styles.telemetryGrid}>
                  <View style={styles.telemetryStatCard}>
                    <Text style={styles.telemetryStatIcon}>⚡</Text>
                    <Text style={styles.telemetryStatValue}>
                      {trackingSpeed != null ? `${trackingSpeed} km/h` : '—'}
                    </Text>
                    <Text style={styles.telemetryStatLabel}>
                      {demoTracking ? 'Demo Speed' : 'GPS Speed'}
                    </Text>
                  </View>

                  <View style={styles.telemetryStatCard}>
                    <Text style={styles.telemetryStatIcon}>⏱️</Text>
                    <Text style={[styles.telemetryStatValue, { color: colors.teal.primary }]}>
                      {demoTracking
                        ? demoStats
                          ? `${demoStats.etaMinutes} mins`
                          : '—'
                        : telemetry.data?.status === 'live' && trackingEta != null
                        ? `~${trackingEta} mins`
                        : '—'}
                    </Text>
                    <Text style={styles.telemetryStatLabel}>
                      {demoTracking ? 'Demo ETA' : 'Road ETA estimate'}
                    </Text>
                  </View>

                  <View style={styles.telemetryStatCard}>
                    <Text style={styles.telemetryStatIcon}>💺</Text>
                    <Text style={[styles.telemetryStatValue, { color: '#16A34A' }]}>
                      {trackingBus?.availableSeats} seats
                    </Text>
                    <Text style={styles.telemetryStatLabel}>Listed seats</Text>
                  </View>
                </View>

                {/* Route Progress Visualizer */}
                <View style={styles.trackingTimelineCard}>
                  <Text style={styles.timelineCardTitle}>Journey Schedule & GPS</Text>

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
                        <Text style={styles.liveLocationTitle}>Bus GPS position</Text>
                        <View style={styles.activePulsingChip}>
                          <Text style={styles.activePulsingChipText}>
                            {demoTracking
                              ? 'SIMULATED'
                              : telemetry.data?.status === 'live'
                              ? 'RECEIVING'
                              : 'WAITING'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.timelineStopSub}>
                        Moving at {trackingSpeed ?? 0} km/h • Next stop approaching in{' '}
                        {Math.max(2, Math.round(((demoTracking ? demoStats?.etaMinutes : trackingEta) || 10) / 2))} mins
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
                        Destination • Scheduled arrival: {trackingBus?.arrivalTime} ({trackingBus?.duration})
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Refresh & Controls */}
                <View style={styles.trackingActionsRow}>
                  <TouchableOpacity
                    style={styles.refreshGpsButton}
                    onPress={() => (demoTracking ? setDemoTracking(false) : handleRefreshTracking())}
                    activeOpacity={0.8}
                    disabled={trackingLoading}
                  >
                    {trackingLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.refreshGpsIcon}>🔄</Text>
                        <Text style={styles.refreshGpsText}>
                          {demoTracking ? 'Use real bus GPS' : 'Refresh Bus GPS'}
                        </Text>
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
                  {demoTracking
                    ? 'Demo bus simulation · Not live vehicle tracking'
                    : 'Owner phone GPS · Road ETA is an estimate, not live traffic.'}
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
