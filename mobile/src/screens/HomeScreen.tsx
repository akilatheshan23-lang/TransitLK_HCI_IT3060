import React, { useState, useEffect } from 'react';
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
  const [selectedBus, setSelectedBus] = useState<BusSearchResult | null>(null);
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);

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
    setSelectedBus(null);

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

                  {/* Book / Select Button */}
                  <TouchableOpacity
                    style={styles.selectBusButton}
                    onPress={() => {
                      setSelectedBus(bus);
                      setShowBookingSuccess(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.selectBusButtonText}>Select & Buy Ticket</Text>
                    <ArrowRightIcon size={16} color="#007A74" />
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

      {/* Ticket Booking Confirmation Modal */}
      <Modal
        visible={showBookingSuccess}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBookingSuccess(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bookingCard}>
            <View style={styles.bookingCheckCircle}>
              <CheckIcon size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.bookingTitle}>Bus Selected!</Text>
            <Text style={styles.bookingSub}>
              Route {selectedBus?.routeNumber} • {selectedBus?.companyName}
            </Text>

            <View style={styles.bookingDetailsBox}>
              <View style={styles.bookingDetailRow}>
                <Text style={styles.bookingLabel}>Bus Number:</Text>
                <Text style={styles.bookingVal}>{selectedBus?.busRegNumber}</Text>
              </View>
              <View style={styles.bookingDetailRow}>
                <Text style={styles.bookingLabel}>From:</Text>
                <Text style={styles.bookingVal}>{selectedBus?.fromStop}</Text>
              </View>
              <View style={styles.bookingDetailRow}>
                <Text style={styles.bookingLabel}>To:</Text>
                <Text style={styles.bookingVal}>{selectedBus?.toStop}</Text>
              </View>
              <View style={styles.bookingDetailRow}>
                <Text style={styles.bookingLabel}>Departure:</Text>
                <Text style={styles.bookingVal}>{selectedBus?.departureTime}</Text>
              </View>
              <View style={styles.bookingDetailRow}>
                <Text style={styles.bookingLabel}>Total Fare:</Text>
                <Text style={[styles.bookingVal, { color: colors.teal.primary, fontWeight: '700' }]}>
                  Rs. {selectedBus?.fare}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmTicketButton}
              onPress={() => {
                setShowBookingSuccess(false);
                if (onNavigateToPayment && selectedBus) {
                  onNavigateToPayment(selectedBus);
                } else {
                  showAlert('Digital Ticket Ready', `Your seat on ${selectedBus?.busRegNumber} has been reserved. You can view QR code under Tickets tab.`);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmTicketButtonText}>Confirm & Generate QR Ticket</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowBookingSuccess(false)}
            >
              <Text style={styles.closeModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  selectBusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DCF5EE',
    borderRadius: 10,
    paddingVertical: 10,
  },
  selectBusButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.teal.primary,
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
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    maxHeight: '80%',
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
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
  },
  bookingCheckCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  bookingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  bookingSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    textAlign: 'center',
  },
  bookingDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    gap: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  bookingVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  confirmTicketButton: {
    backgroundColor: colors.teal.primary,
    borderRadius: 12,
    paddingVertical: 13,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmTicketButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeModalButton: {
    paddingVertical: 8,
  },
  closeModalButtonText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
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
