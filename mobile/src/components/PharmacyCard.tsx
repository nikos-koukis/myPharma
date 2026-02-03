import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PharmacyIcon } from './PharmacyIcon';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { useFavorites } from '../hooks/useFavorites';
import { usePharmacyStatus } from '../hooks/usePharmacyStatus';
import type { Pharmacy, NearbyPharmacy, DutySlot } from '../types';

interface Props {
  pharmacy: Pharmacy | NearbyPharmacy;
  distance?: number;
}

export function PharmacyCard({ pharmacy, distance }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(pharmacy.id);

  const displayDistance =
    distance ?? ('distance_meters' in pharmacy ? (pharmacy as NearbyPharmacy).distance_meters : undefined);

  // Get all duty slots
  const dutySlots = useMemo((): DutySlot[] => {
    if ('duties' in pharmacy) {
      if (Array.isArray(pharmacy.duties) && pharmacy.duties.length > 0) {
        const first = pharmacy.duties[0];
        if ('start' in first && 'end' in first) {
          return pharmacy.duties as DutySlot[];
        }
        return (pharmacy as Pharmacy).duties?.flatMap((d) => d.duties) ?? [];
      }
    }
    return [];
  }, [pharmacy]);

  // Get real-time status (updates every minute)
  const status = usePharmacyStatus(dutySlots);

  // Get status bar color
  const statusBarColor = status.isOpen
    ? (status.statusColor === 'warning' ? colors.warning : colors.success)
    : colors.error;

  // Format duty hours for display
  const dutyHoursInfo = useMemo(() => {
    if (dutySlots.length === 0) return { hours: null, hasHours: false };

    const formatted = dutySlots.map((slot) => {
      const extendsToNextDay = parseInt(slot.end.split(':')[0], 10) < parseInt(slot.start.split(':')[0], 10);
      return `${slot.start}-${slot.end}${extendsToNextDay ? ' (Επόμ.)' : ''}`;
    });

    return { hours: formatted.join(' | '), hasHours: true };
  }, [dutySlots]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={() => router.push(`/pharmacy/${pharmacy.id}`)}
    >
      {/* Status Indicator Bar */}
      <View style={[styles.statusBar, { backgroundColor: statusBarColor }]} />

      <View style={styles.cardContent}>
        {/* Header with pharmacy icon, name and favorite */}
        <View style={styles.header}>
          <View style={[styles.pharmacyIcon, { backgroundColor: colors.primaryLight }]}>
            <PharmacyIcon size={20} color={colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {pharmacy.name}
            </Text>
            {/* Status Badge */}
            <View style={[
              styles.statusBadge,
              { backgroundColor: status.isOpen ? colors.successLight : colors.errorLight }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: statusBarColor }
              ]} />
              <Text style={[
                styles.statusText,
                { color: statusBarColor }
              ]}>
                {status.isOpen ? 'ΑΝΟΙΧΤΟ' : 'ΚΛΕΙΣΤΟ'}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => toggle(pharmacy.id)}
            hitSlop={12}
            style={({ pressed }) => [styles.favoriteBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons
              name={fav ? 'heart' : 'heart-outline'}
              size={22}
              color={fav ? colors.error : colors.textTertiary}
            />
          </Pressable>
        </View>

        {/* Address */}
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>
            {pharmacy.address}
          </Text>
        </View>

        {/* Footer with hours, distance and phone */}
        <View style={styles.footer}>
          {/* Hours */}
          {dutyHoursInfo.hasHours ? (
            <View style={[styles.infoBadge, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {dutyHoursInfo.hours}
              </Text>
            </View>
          ) : null}

          {/* Distance */}
          {displayDistance != null ? (
            <View style={[styles.infoBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="navigate-outline" size={12} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>
                {displayDistance < 1000
                  ? `${Math.round(displayDistance)}m`
                  : `${(displayDistance / 1000).toFixed(1)}km`}
              </Text>
            </View>
          ) : null}

          {/* Phone */}
          {pharmacy.phone ? (
            <View style={[styles.infoBadge, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="call-outline" size={12} color={colors.textTertiary} />
              <Text style={[styles.infoText, { color: colors.textTertiary }]}>
                {pharmacy.phone}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 6,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  statusBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pharmacyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  favoriteBtn: {
    padding: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingLeft: 2,
  },
  address: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  infoText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
