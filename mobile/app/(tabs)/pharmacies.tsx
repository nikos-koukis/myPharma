import React, { useState, useMemo, useCallback } from 'react';
import { View, FlatList, StyleSheet, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PharmacyIcon } from '../../src/components/PharmacyIcon';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAppStore } from '../../src/store';
import { useOnDutyPharmacies } from '../../src/hooks/usePharmacies';
import { useAutoLocation } from '../../src/hooks/useAutoLocation';
import { DatePicker } from '../../src/components/DatePicker';
import { PharmacyCard } from '../../src/components/PharmacyCard';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calculateDistance } from '../../src/utils/distance';
import { isOpenNow, getNextOpening } from '../../src/utils/dutySchedule';
import type { Pharmacy } from '../../src/types';

type FilterType = 'open' | 'opening_soon';

interface PharmacyWithDistance extends Pharmacy {
  distance_meters?: number;
  _isOpen?: boolean;
  _isOpeningSoon?: boolean;
}

import { LinearGradient } from 'expo-linear-gradient';

export default function OnDutyScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('open');

  // Auto-detect location on first launch
  const { detecting } = useAutoLocation();

  const userLocation = useAppStore((s) => s.userLocation);
  const selectedPrefecture = useAppStore((s) => s.selectedPrefecture);
  const selectedCity = useAppStore((s) => s.selectedCity);
  const selectedDate = useAppStore((s) => s.selectedDate);

  const { data, isLoading, refetch, isRefetching } = useOnDutyPharmacies({
    region: selectedPrefecture ?? undefined,
    city: selectedCity ?? undefined,
    date: selectedDate,
  });

  // Add distance and open status to each pharmacy
  const pharmaciesWithDistance = useMemo((): PharmacyWithDistance[] => {
    if (!data) return [];

    return data.map((p) => {
      // Calculate distance if we have user location and pharmacy coordinates
      let distance_meters: number | undefined;
      if (userLocation && p.lat && p.lng) {
        distance_meters = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          p.lat,
          p.lng
        );
      }

      // Get duty slots from the pharmacy's duties array
      const dutySlots = p.duties?.[0]?.duties ?? [];
      const _isOpen = isOpenNow(dutySlots);

      // Check if opening soon (within 60 mins)
      let _isOpeningSoon = false;
      if (!_isOpen) {
        const nextOpening = getNextOpening(dutySlots);
        if (nextOpening && !nextOpening.isTomorrow && nextOpening.minutesUntil <= 60) {
          _isOpeningSoon = true;
        }
      }

      return { ...p, distance_meters, _isOpen, _isOpeningSoon };
    }).sort((a, b) => {
      // Sort: Open -> Opening Soon -> Closed (if all selected)
      // If same filtering, sort by distance

      // Primary Sort: Distance (always most important for User)
      if (a.distance_meters !== undefined && b.distance_meters !== undefined) {
        return a.distance_meters - b.distance_meters;
      }

      // Secondary fallback
      if (a._isOpen && !b._isOpen) return -1;
      if (!a._isOpen && b._isOpen) return 1;

      return 0;
    });
  }, [data, userLocation]);

  // Filter data based on logic
  const filteredData = useMemo(() => {
    if (filter === 'open') return pharmaciesWithDistance.filter((p) => p._isOpen);
    if (filter === 'opening_soon') return pharmaciesWithDistance.filter((p) => p._isOpeningSoon);
    return [];
  }, [pharmaciesWithDistance, filter]);

  // Count open/soon for filter badges
  const openCount = useMemo(() => pharmaciesWithDistance.filter((p) => p._isOpen).length, [pharmaciesWithDistance]);
  const soonCount = useMemo(() => pharmaciesWithDistance.filter((p) => p._isOpeningSoon).length, [pharmaciesWithDistance]);

  // Gradient colors based on theme
  const gradientColors = isDark
    ? ['#0F172A', '#020617'] as [string, string] // Dark blue/slate gradient
    : ['#E0F2E9', '#F0FDF4', '#FFFFFF'] as [string, string, string]; // Mint green to white

  // Show loading while detecting location
  if (detecting) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.detectingContainer}>
          <View style={[styles.detectingIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="location" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.detectingTitle, { color: colors.text }]}>
            Εντοπισμός τοποθεσίας...
          </Text>
          <Text style={[styles.detectingSubtitle, { color: colors.textTertiary }]}>
            Βρίσκουμε την περιοχή σας
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Location Header */}
      <Pressable
        style={[
          styles.locationHeader,
          {
            borderColor: colors.border,
            marginTop: insets.top + 12,
          }
        ]}
        onPress={() => router.push('/location-picker')}
      >
        <View style={[styles.locationIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="location" size={20} color={colors.primary} />
        </View>
        <View style={styles.locationInfo}>
          <Text style={[styles.locationLabel, { color: colors.textTertiary }]}>
            Η ΠΕΡΙΟΧΗ ΣΟΥ
          </Text>
          <Text style={[styles.locationName, { color: colors.text }]}>
            {selectedCity || selectedPrefecture || 'Επιλέξτε περιοχή'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </Pressable>

      <DatePicker />

      {/* Filter Chips */}
      {pharmaciesWithDistance.length > 0 && (
        <View style={styles.filterContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.filterChip,
              filter === 'open' && styles.filterChipActive,
              {
                backgroundColor: filter === 'open' ? colors.successLight : colors.surfaceSecondary,
                borderColor: filter === 'open' ? colors.success : colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => setFilter('open')}
          >
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            <Text
              style={[
                styles.filterText,
                { color: filter === 'open' ? colors.success : colors.textSecondary },
              ]}
            >
              Ανοιχτά
            </Text>
            <View style={[styles.filterBadge, { backgroundColor: filter === 'open' ? colors.success : colors.border }]}>
              <Text style={[styles.filterBadgeText, { color: filter === 'open' ? '#FFFFFF' : colors.textSecondary }]}>
                {openCount}
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.filterChip,
              filter === 'opening_soon' && styles.filterChipActive,
              {
                backgroundColor: filter === 'opening_soon' ? colors.warningLight : colors.surfaceSecondary,
                borderColor: filter === 'opening_soon' ? colors.warning : colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => setFilter('opening_soon')}
          >
            <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
            <Text
              style={[
                styles.filterText,
                { color: filter === 'opening_soon' ? colors.warning : colors.textSecondary },
              ]}
            >
              Ανοίγουν σύντομα
            </Text>
            <View style={[styles.filterBadge, { backgroundColor: filter === 'opening_soon' ? colors.warning : colors.border }]}>
              <Text style={[styles.filterBadgeText, { color: filter === 'opening_soon' ? '#FFFFFF' : colors.textSecondary }]}>
                {soonCount}
              </Text>
            </View>
          </Pressable>


        </View>
      )}

      {isLoading ? (
        <LoadingState />
      ) : !pharmaciesWithDistance.length ? (
        <EmptyState
          title="Δεν υπάρχουν εφημερεύοντα"
          subtitle="Δοκιμάστε διαφορετική ημερομηνία"
        />
      ) : !filteredData.length ? (
        <EmptyState
          title={
            filter === 'open' ? 'Κανένα ανοιχτό φαρμακείο' :
              filter === 'opening_soon' ? 'Κανένα φαρμακείο δεν ανοίγει σύντομα' :
                'Δεν βρέθηκαν αποτελέσματα'
          }
          subtitle="Δοκιμάστε διαφορετικό φίλτρο"
        />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <PharmacyCard
              pharmacy={item}
              distance={item.distance_meters}
              isClosest={index === 0}
            />
          )}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.textTertiary }]}>
              {filteredData.length} {filteredData.length === 1 ? 'φαρμακείο' : 'φαρμακεία'} {
                filter === 'open' ? 'είναι ανοιχτά' :
                  filter === 'opening_soon' ? 'ανοίγουν τώρα' :
                    'εφημερεύουν'
              }
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  detectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  detectingIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  detectingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  detectingSubtitle: {
    fontSize: 15,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  filterChipActive: {
    borderWidth: 1.5,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  filterBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  list: {
    paddingBottom: 32,
    paddingTop: 8,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
});
