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

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/pharmacy/${pharmacy.id}`)}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {pharmacy.name}
          </Text>
          <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>
            {pharmacy.address}
          </Text>
          <View style={styles.meta}>
            {pharmacy.phone ? (
              <View style={styles.metaItem}>
                <Ionicons name="call-outline" size={13} color={colors.textTertiary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {pharmacy.phone}
                </Text>
              </View>
            ) : null}
            {displayShift ? (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      displayShift === 'morning'
                        ? colors.dutyMorning
                        : displayShift === 'night'
                          ? colors.dutyNight
                          : colors.dutyAllDay,
                  },
                ]}
              >
                <Text style={styles.badgeText}>{shiftLabel(displayShift)}</Text>
              </View>
            ) : null}
            {displayDistance != null ? (
              <Text style={[styles.metaText, { color: colors.primary }]}>
                {displayDistance < 1000
                  ? `${Math.round(displayDistance)}m`
                  : `${(displayDistance / 1000).toFixed(1)}km`}
              </Text>
            ) : null}
          </View>
        </View>
        <Pressable onPress={() => toggle(pharmacy.id)} hitSlop={12}>
          <Ionicons
            name={fav ? 'heart' : 'heart-outline'}
            size={22}
            color={fav ? colors.error : colors.textTertiary}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  info: { flex: 1, marginRight: 10 },
  name: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  address: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
});
