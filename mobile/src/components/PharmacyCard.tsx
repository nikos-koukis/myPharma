import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { useFavorites } from '../hooks/useFavorites';
import { shiftLabel } from '../utils/format';
import type { Pharmacy, NearbyPharmacy } from '../types';

interface Props {
  pharmacy: Pharmacy | NearbyPharmacy;
  distance?: number;
  shift?: string;
}

export function PharmacyCard({ pharmacy, distance, shift }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(pharmacy.id);

  const displayShift =
    shift ??
    ('shift' in pharmacy ? (pharmacy as NearbyPharmacy).shift : undefined) ??
    ('duties' in pharmacy ? pharmacy.duties?.[0]?.shift : undefined);

  const displayDistance =
    distance ?? ('distance_meters' in pharmacy ? (pharmacy as NearbyPharmacy).distance_meters : undefined);

  const getBadgeColors = (shiftType: string) => {
    switch (shiftType) {
      case 'morning':
        return { bg: colors.dutyMorningLight, text: colors.dutyMorning };
      case 'night':
        return { bg: colors.dutyNightLight, text: colors.dutyNight };
      default:
        return { bg: colors.dutyAllDayLight, text: colors.dutyAllDay };
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={() => router.push(`/pharmacy/${pharmacy.id}`)}
    >
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {pharmacy.name}
        </Text>
        <Pressable
          onPress={() => toggle(pharmacy.id)}
          hitSlop={12}
          style={styles.favoriteBtn}
        >
          <Ionicons
            name={fav ? 'heart' : 'heart-outline'}
            size={20}
            color={fav ? colors.error : colors.textTertiary}
          />
        </Pressable>
      </View>

      <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>
        {pharmacy.address}
      </Text>

      <View style={styles.footer}>
        <View style={styles.meta}>
          {displayShift ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: getBadgeColors(displayShift).bg },
              ]}
            >
              <Text style={[styles.badgeText, { color: getBadgeColors(displayShift).text }]}>
                {shiftLabel(displayShift)}
              </Text>
            </View>
          ) : null}
          {displayDistance != null ? (
            <View style={[styles.distanceBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="location-outline" size={12} color={colors.primary} />
              <Text style={[styles.distanceText, { color: colors.primary }]}>
                {displayDistance < 1000
                  ? `${Math.round(displayDistance)}m`
                  : `${(displayDistance / 1000).toFixed(1)}km`}
              </Text>
            </View>
          ) : null}
        </View>
        {pharmacy.phone ? (
          <Text style={[styles.phone, { color: colors.textTertiary }]}>
            {pharmacy.phone}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 6,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.3,
  },
  favoriteBtn: {
    padding: 4,
  },
  address: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  phone: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
});
