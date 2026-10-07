import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as c } from './theme';
import { Icon } from './Artwork';
import { User, API_BASE_URL } from './api';

interface OwnerDashboardProps {
  user: User | null;
  onViewFleet: () => void;
  onSignOut: () => void;
  onBack?: () => void;
  onOpenWebDashboard?: () => void;
}

export default function OwnerDashboard({ user, onViewFleet, onSignOut, onBack, onOpenWebDashboard }: OwnerDashboardProps) {
  const insets = useSafeAreaInsets();

  const openWebsiteDashboard = () => {
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
        {/* Top Header */}
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack || onSignOut}
            style={s.backBtn}
          >
            <Icon name="back" size={20} color={c.navy} />
          </Pressable>
          <Text style={s.headerTitle}>Owner dashboard</Text>
          <View style={s.headerRightPlaceholder} />
        </View>

        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 24) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting */}
          <View style={s.greetingBlock}>
            <Text style={s.eyebrow}>TODAY'S OPERATIONS</Text>
            <Text style={s.title}>Good morning, {user?.name?.split(' ')[0] || 'Owner'}.</Text>
          </View>

          {/* Today's Revenue Card */}
          <View style={s.card}>
            <Text style={s.cardLabel}>Today's revenue</Text>
            <Text style={s.revenueValue}>Rs. 45,800</Text>
            <Text style={s.cardSubtext}>+12% vs yesterday</Text>
          </View>

          {/* Two Columns: Active Buses & Delayed Trips */}
          <View style={s.row}>
            <View style={[s.card, s.colCard]}>
              <Text style={s.cardLabel}>Active buses</Text>
              <Text style={s.metricValueTeal}>24 / 28</Text>
              <Text style={s.cardSubtext}>4 in maintenance</Text>
            </View>

            <View style={[s.card, s.colCard]}>
              <Text style={s.cardLabel}>Delayed trips</Text>
              <Text style={s.metricValueAmber}>3</Text>
              <Text style={s.cardSubtext}>Avg. delay: 12 min</Text>
            </View>
          </View>

          {/* Route Status & Performance (Mint Card) */}
          <View style={s.mintCard}>
            <Text style={s.mintCardTitle}>Route status & performance</Text>
            <View style={s.perfRow}>
              <Text style={s.routeNum}>177</Text>
              <Text style={s.perfStatus}>On-time</Text>
              <Text style={s.perfEta}>5 min</Text>
              <Text style={s.perfRev}>Rs. 8,420</Text>
            </View>
            <View style={s.perfRow}>
              <Text style={s.routeNum}>179</Text>
              <Text style={s.perfStatus}>Delayed</Text>
              <Text style={s.perfEta}>12 min</Text>
              <Text style={s.perfRev}>Rs. 6,350</Text>
            </View>
          </View>

          {/* Action Buttons matching screenshot 3 */}
          <View style={s.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onViewFleet}
              style={({ pressed }) => [s.primaryBtn, pressed && s.btnPressed]}
            >
              <Text style={s.primaryBtnText}>View fleet & live tracking</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={openWebsiteDashboard}
              style={({ pressed }) => [s.primaryBtn, pressed && s.btnPressed]}
            >
              <Text style={s.primaryBtnText}>Open website dashboard</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onSignOut}
              style={({ pressed }) => [s.secondaryBtn, pressed && s.btnPressed]}
            >
              <Text style={s.secondaryBtnText}>Sign out</Text>
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
    marginBottom: 4,
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
    paddingHorizontal: 22,
    gap: 16,
    paddingTop: 8,
  },
  greetingBlock: {
    gap: 4,
    marginBottom: 2,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#008783',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#12304A',
    letterSpacing: -0.4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E7ECF0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 13,
    color: '#607D94',
    fontWeight: '500',
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#008783',
    letterSpacing: -0.6,
  },
  cardSubtext: {
    fontSize: 12,
    color: '#607D94',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  colCard: {
    flex: 1,
    padding: 16,
  },
  metricValueTeal: {
    fontSize: 25,
    fontWeight: '800',
    color: '#008783',
    letterSpacing: -0.5,
  },
  metricValueAmber: {
    fontSize: 25,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: -0.5,
  },
  mintCard: {
    backgroundColor: '#DDF6EF',
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  mintCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#12304A',
  },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  routeNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#12304A',
    width: 36,
  },
  perfStatus: {
    fontSize: 14,
    color: '#12304A',
    width: 72,
  },
  perfEta: {
    fontSize: 14,
    color: '#12304A',
    width: 60,
  },
  perfRev: {
    fontSize: 14,
    fontWeight: '700',
    color: '#12304A',
    textAlign: 'right',
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: '#008783',
    minHeight: 52,
    borderRadius: 16,
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
    minHeight: 50,
    borderRadius: 16,
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
