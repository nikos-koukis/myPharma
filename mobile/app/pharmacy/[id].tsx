import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PharmacyIcon } from '../../src/components/PharmacyIcon';
import MapView, { Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAppStore } from '../../src/store';
import { usePharmacyDetail } from '../../src/hooks/usePharmacies';
import { usePharmacyStatus } from '../../src/hooks/usePharmacyStatus';
import { FavoriteButton } from '../../src/components/FavoriteButton';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { callPhone, openDirections, sharePharmacy } from '../../src/utils/linking';
import { calculateDistance, formatDistance } from '../../src/utils/distance';

export default function PharmacyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const { data: pharmacy, isLoading } = usePharmacyDetail(id);
  const userLocation = useAppStore((s) => s.userLocation);

  // Animated pulse for status dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Get all duty slots from today's duty record
  const dutySlots = useMemo(() =>
    pharmacy?.duties?.[0]?.duties ?? [],
    [pharmacy?.duties]
  );

  // Get real-time status (updates every minute)
  const status = usePharmacyStatus(dutySlots);

  // Pulse animation for open status
  useEffect(() => {
    if (status.isOpen) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [status.isOpen, pulseAnim]);

  // Calculate distance from user
  const distance = useMemo(() => {
    if (!userLocation || !pharmacy?.lat || !pharmacy?.lng) return null;
    return calculateDistance(
      userLocation.lat,
      userLocation.lng,
      pharmacy.lat,
      pharmacy.lng
    );
  }, [userLocation, pharmacy?.lat, pharmacy?.lng]);

  if (isLoading) return <LoadingState />;
  if (!pharmacy) return <EmptyState title="Δεν βρέθηκε το φαρμακείο" />;

  // Format all duty hours for display
  const formatDutyHours = () => {
    if (dutySlots.length === 0) return 'Εφημερεύει όλη μέρα';
    return dutySlots.map((slot) => {
      const extendsToNextDay = parseInt(slot.end.split(':')[0], 10) < parseInt(slot.start.split(':')[0], 10);
      return `${slot.start} - ${slot.end}${extendsToNextDay ? ' (Επόμενης)' : ''}`;
    }).join('\n');
  };

  // Status badge color
  const statusColor = status.isOpen
    ? (status.statusColor === 'warning' ? colors.warning : colors.success)
    : colors.error;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Map snippet */}
      {pharmacy.lat && pharmacy.lng ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: pharmacy.lat,
              longitude: pharmacy.lng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
          >
            <Marker
              coordinate={{ latitude: pharmacy.lat, longitude: pharmacy.lng }}
            />
          </MapView>
          {/* Status overlay on map */}
          <View style={styles.mapOverlay}>
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.blurBadge}>
              <View style={[styles.mapStatusBadge, { backgroundColor: statusColor + '20' }]}>
                <Animated.View
                  style={[
                    styles.statusDot,
                    { backgroundColor: statusColor, transform: [{ scale: pulseAnim }] }
                  ]}
                />
                <Text style={[styles.mapStatusText, { color: statusColor }]}>{status.statusText}</Text>
              </View>
            </BlurView>
          </View>
        </View>
      ) : null}

      <View style={styles.content}>
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerTop}>
            <View style={[styles.pharmacyIcon, { backgroundColor: colors.primaryLight }]}>
              <PharmacyIcon size={26} color={colors.primary} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.name, { color: colors.text }]}>{pharmacy.name}</Text>
              <Text style={[styles.region, { color: colors.textTertiary }]}>
                {pharmacy.city}, {pharmacy.region}
              </Text>
            </View>
            <FavoriteButton id={pharmacy.id} />
          </View>

          {/* Address */}
          <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
            <View style={[styles.infoIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {pharmacy.address}
            </Text>
          </View>

          {/* Distance */}
          {distance !== null ? (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="navigate-outline" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.infoText, { color: colors.primary, fontWeight: '600' }]}>
                {formatDistance(distance)}
              </Text>
            </View>
          ) : null}

          {/* Phone */}
          {pharmacy.phone ? (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
              </View>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {pharmacy.phone}
              </Text>
            </View>
          ) : null}

          {/* Hours */}
          {pharmacy.duties && pharmacy.duties.length > 0 ? (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              </View>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {formatDutyHours()}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          {pharmacy.phone ? (
            <ActionButton
              icon="call"
              label="Κλήση"
              color={colors.success}
              onPress={() => callPhone(pharmacy.phone!)}
            />
          ) : null}
          {pharmacy.lat && pharmacy.lng ? (
            <ActionButton
              icon="navigate"
              label="Οδηγίες"
              color={colors.primary}
              onPress={() => openDirections(pharmacy.lat!, pharmacy.lng!, pharmacy.name)}
            />
          ) : null}
          <ActionButton
            icon="share-social"
            label="Κοινοποίηση"
            color={colors.warning}
            onPress={() => sharePharmacy(pharmacy)}
          />
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.actionBtnWrapper}
    >
      <Animated.View style={[styles.actionBtn, { borderColor: color, transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={[styles.actionLabel, { color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: 220,
  },
  mapOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  blurBadge: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  mapStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mapStatusText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  headerCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 20,
  },
  pharmacyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 26,
    marginBottom: 4,
  },
  region: {
    fontSize: 14,
    letterSpacing: -0.1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtnWrapper: {
    flex: 1,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    gap: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
