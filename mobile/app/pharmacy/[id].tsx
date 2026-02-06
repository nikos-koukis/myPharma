import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Dimensions, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PharmacyIcon } from '../../src/components/PharmacyIcon';
import MapView, { Marker } from 'react-native-maps';
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

const HEADER_HEIGHT = 420;

export default function PharmacyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: pharmacy, isLoading } = usePharmacyDetail(id);
  const userLocation = useAppStore((s) => s.userLocation);
  const scrollY = useRef(new Animated.Value(0)).current;

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

  // Calculate distance
  const distance = useMemo(() => {
    if (!userLocation || !pharmacy?.lat || !pharmacy?.lng) return null;
    return calculateDistance(userLocation.lat, userLocation.lng, pharmacy.lat, pharmacy.lng);
  }, [userLocation, pharmacy]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#020617' : '#F0FDF4' }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LoadingState message="Φόρτωση στοιχείων..." />
        </View>
      </View>
    );
  }

  if (!pharmacy) return <EmptyState title="Δεν βρέθηκε το φαρμακείο" />;

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
        {pharmacy.lat && pharmacy.lng ? (
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: pharmacy.lat,
              longitude: pharmacy.lng,
              latitudeDelta: 0.003,
              longitudeDelta: 0.003,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            showsUserLocation={false}
            pointerEvents="none" // Pass touches to Pressable
            userInterfaceStyle={isDark ? 'dark' : 'light'}
          >
            <Marker
              coordinate={{ latitude: pharmacy.lat, longitude: pharmacy.lng }}
              tracksViewChanges={false}
            >
              <Image
                source={require('../../assets/pin.png')}
                style={{ width: 44, height: 44 }}
                resizeMode="contain"
              />
            </Marker>
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
      <ScrollView
        contentContainerStyle={[styles.contentContainer, { paddingTop: Dimensions.get('window').height * 0.42 }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
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
              <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="time" size={14} color={colors.textSecondary} />
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                  {status.isOpen ? `${t('closes_at')} ${dutySlots[0]?.end || '21:00'}` : t('closed')}
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
      </ScrollView>

      {/* Floating Elements (Layer 2 - Always on top) */}

      {/* Custom Back Button */}
      <BlurView
        intensity={50}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.backButtonBlur, { top: insets.top + 10 }]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={20}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      </BlurView>

      {/* Top Status Badge */}
      <BlurView
        intensity={70}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.statusFloat, { top: insets.top + 10 }]}
      >
        <Animated.View style={[styles.statusDot, { backgroundColor: statusColor, transform: [{ scale: pulseAnim }] }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{status.isOpen ? t('open_now') : t('closed_now')}</Text>
      </BlurView>
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
});
