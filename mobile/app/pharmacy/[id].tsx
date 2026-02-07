import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Dimensions, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PharmacyIcon } from '../../src/components/PharmacyIcon';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAppStore } from '../../src/store';
import { usePharmacyDetail } from '../../src/hooks/usePharmacies';
import { usePharmacyStatus } from '../../src/hooks/usePharmacyStatus';
import { useTranslation } from '../../src/i18n/translations';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { callPhone, openDirections, sharePharmacy } from '../../src/utils/linking';
import { calculateDistance, formatDistance } from '../../src/utils/distance';

import { useAutoLocation } from '../../src/hooks/useAutoLocation';

const HEADER_HEIGHT = 420;

export default function PharmacyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useAutoLocation(); // Ensure location is detected if not already
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: pharmacy, isLoading } = usePharmacyDetail(id);
  const userLocation = useAppStore((s) => s.userLocation);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isDetailsVisible, setIsDetailsVisible] = useState(true);
  const detailsAnim = useRef(new Animated.Value(0)).current; // 0 = visible, 1 = hidden

  // Animated pulse for status dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Get all duty slots
  const dutySlots = useMemo(() =>
    pharmacy?.duties?.[0]?.duties ?? [],
    [pharmacy?.duties]
  );

  // Real-time status
  const status = usePharmacyStatus(dutySlots);

  // Pulse animation for open status
  useEffect(() => {
    if (status.isOpen) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status.isOpen]);

  const toggleDetails = useCallback(() => {
    const toValue = isDetailsVisible ? 1 : 0;
    Animated.spring(detailsAnim, {
      toValue,
      useNativeDriver: true,
      tension: 20,
      friction: 7,
    }).start();
    setIsDetailsVisible(!isDetailsVisible);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isDetailsVisible]);

  const cardTranslationY = detailsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Dimensions.get('window').height * 0.6], // Slide down
  });

  // Calculate distance
  const distance = useMemo(() => {
    if (!userLocation || !pharmacy?.lat || !pharmacy?.lng) return null;
    return calculateDistance(userLocation.lat, userLocation.lng, pharmacy.lat, pharmacy.lng);
  }, [userLocation, pharmacy]);

  // Calculate region to show both user and pharmacy
  const mapRegion = useMemo(() => {
    if (!pharmacy?.lat || !pharmacy?.lng) return null;
    if (!userLocation) {
      return {
        latitude: pharmacy.lat,
        longitude: pharmacy.lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };
    }

    const latDelta = Math.abs(pharmacy.lat - userLocation.lat) * 1.8;
    const lngDelta = Math.abs(pharmacy.lng - userLocation.lng) * 1.8;

    return {
      latitude: (pharmacy.lat + userLocation.lat) / 2,
      longitude: (pharmacy.lng + userLocation.lng) / 2,
      latitudeDelta: Math.max(latDelta, 0.012),
      longitudeDelta: Math.max(lngDelta, 0.012),
    };
  }, [pharmacy, userLocation]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#020617' : '#F0FDF4' }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LoadingState message={t('searching')} />
        </View>
      </View>
    );
  }

  if (!pharmacy) return <EmptyState title={t('no_pharmacies')} />;

  // Status Colors
  const statusColor = status.isOpen
    ? (status.statusColor === 'warning' ? colors.warning : colors.success)
    : colors.error;

  return (
    <View style={styles.container}>
      {/* Dynamic Background */}
      <LinearGradient
        colors={isDark ? ['#020617', '#0F172A'] : ['#F0FDF4', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Hero Map (Layer 0) */}
      <Pressable
        style={[styles.heroMapContainer, { height: '100%' }]}
        onPress={() => pharmacy.lat && pharmacy.lng && openDirections(pharmacy.lat, pharmacy.lng, pharmacy.name)}
      >
        {pharmacy.lat && pharmacy.lng && mapRegion ? (
          <MapView
            style={StyleSheet.absoluteFill}
            region={mapRegion}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            showsUserLocation={false}
            pointerEvents="none" // Pass touches to Pressable
            userInterfaceStyle={isDark ? 'dark' : 'light'}
          >
            {/* Pharmacy Marker */}
            <Marker coordinate={{ latitude: pharmacy.lat, longitude: pharmacy.lng }} tracksViewChanges={false}>
              <Image source={require('../../assets/pin.png')} style={{ width: 44, height: 44 }} resizeMode="contain" />
            </Marker>

            {/* User Marker & Path */}
            {userLocation && (
              <>
                <Marker coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }} tracksViewChanges={false}>
                  <View style={[styles.userMarkerGlow, { backgroundColor: colors.primary + '33' }]}>
                    <View style={[styles.userMarkerInner, { backgroundColor: colors.primary }]} />
                  </View>
                </Marker>
                <Polyline
                  coordinates={[
                    { latitude: userLocation.lat, longitude: userLocation.lng },
                    { latitude: pharmacy.lat, longitude: pharmacy.lng },
                  ]}
                  strokeColor={colors.primary}
                  strokeWidth={3}
                  lineDashPattern={[5, 5]}
                />
              </>
            )}
          </MapView>
        ) : null}

        {/* Gradient Overlay for seamless blending */}
        <LinearGradient
          colors={isDark ? ['transparent', '#020617'] : ['transparent', '#F0FDF4']}
          style={[styles.mapGradient, { height: 300, bottom: 0 }]}
          pointerEvents="none"
        />
      </Pressable>

      {/* Main Content (Layer 1 - ScrollView) */}
      <Animated.ScrollView
        contentContainerStyle={[styles.contentContainer, { paddingTop: Dimensions.get('window').height * 0.42 }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        style={{ transform: [{ translateY: cardTranslationY }] }}
      >
        {/* Main Glass Card */}
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.glassCard, { borderColor: colors.glassBorder }]}>
          {/* Header Section */}
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{pharmacy.name}</Text>
                <Text style={[styles.region, { color: colors.textTertiary }]}>{pharmacy.city}, {pharmacy.region}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Pressable
                  onPress={() => sharePharmacy(pharmacy)}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Ionicons name="share-outline" size={26} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={toggleDetails}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Ionicons name="contract-outline" size={26} color={colors.text} />
                </Pressable>
              </View>
            </View>

            {/* Tags Row */}
            <View style={styles.tagsRow}>
              {distance !== null && (
                <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="navigate" size={14} color={colors.primary} />
                  <Text style={[styles.tagText, { color: colors.primary }]}>{formatDistance(distance)}</Text>
                </View>
              )}
              <View style={[styles.tag, { backgroundColor: status.isOpen ? (status.statusColor === 'success' ? colors.surfaceSecondary : colors.warningLight) : colors.errorLight }]}>
                <Ionicons
                  name="time"
                  size={14}
                  color={status.isOpen ? (status.statusColor === 'warning' ? colors.warning : colors.textSecondary) : colors.error}
                />
                <Text style={[
                  styles.tagText,
                  { color: status.isOpen ? (status.statusColor === 'warning' ? colors.warning : colors.textSecondary) : colors.error }
                ]}>
                  {status.statusText}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Info Section */}
          <View style={styles.infoSection}>
            {/* Address */}
            <Pressable style={styles.infoRow} onPress={() => pharmacy.lat && openDirections(pharmacy.lat, pharmacy.lng!, pharmacy.name)}>
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="location" size={22} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{t('address')}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{pharmacy.address}</Text>
              </View>
              <View style={[styles.arrowBox, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </View>
            </Pressable>

            {/* Phone */}
            {pharmacy.phone && (
              <Pressable style={styles.infoRow} onPress={() => callPhone(pharmacy.phone!)}>
                <View style={[styles.iconBox, { backgroundColor: colors.surfaceSecondary }]}>
                  <Ionicons name="call" size={22} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{t('phone')}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{pharmacy.phone}</Text>
                </View>
                <View style={[styles.arrowBox, { backgroundColor: colors.surfaceSecondary }]}>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </View>
              </Pressable>
            )}
          </View>
        </BlurView>
        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* Floating Elements (Layer 2 - Always on top) */}
      <BlurView
        intensity={50}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.backButtonBlur, { top: insets.top + 10 }]}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={20}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      </BlurView>

      <BlurView
        intensity={70}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.statusFloat, { top: insets.top + 10 }]}
      >
        <Animated.View style={[styles.statusDot, { backgroundColor: statusColor, transform: [{ scale: pulseAnim }] }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{status.isOpen ? t('open_now') : t('closed_now')}</Text>
      </BlurView>

      {!isDetailsVisible && (
        <Animated.View style={[styles.expandButtonContainer, { bottom: insets.bottom + 100 }]}>
          <Pressable
            onPress={toggleDetails}
            style={({ pressed }) => [
              styles.expandButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }
            ]}
          >
            <Ionicons name="expand" size={24} color="#000000" />
            <Text style={styles.expandButtonText}>Εμφάνιση λεπτομερειών</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroMapContainer: {
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  mapGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  backButtonBlur: {
    position: 'absolute',
    left: 20,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 20, // High Z-Index
    elevation: 5,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusFloat: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    gap: 6,
    zIndex: 20, // High Z-Index
    elevation: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    zIndex: 1,
  },
  glassCard: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 24,
  },
  cardHeader: {
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
    lineHeight: 28,
  },
  region: {
    fontSize: 16,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    opacity: 0.5,
  },
  infoSection: {
    gap: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  markerContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  markerRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    opacity: 0.5,
  },
  userMarkerGlow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  expandButtonContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 30,
    alignItems: 'center',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 50,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  expandButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
});
