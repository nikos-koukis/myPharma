import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAppStore } from '../../src/store';
import { AdBanner } from '../../src/components/AdBanner';
import { useNearbyPharmacies } from '../../src/hooks/usePharmacies';
import { useLocation } from '../../src/hooks/useLocation';
import { DatePicker } from '../../src/components/DatePicker';
import { PharmacyCard } from '../../src/components/PharmacyCard';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { useTranslation } from '../../src/i18n/translations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isOpenNow, getNextOpening } from '../../src/utils/dutySchedule';
import { LinearGradient } from 'expo-linear-gradient';

type FilterType = 'open' | 'opening_later';

export default function OnDutyScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterType>('open');

  const { lat, lng, loading: locLoading } = useLocation();
  const selectedDate = useAppStore((s) => s.selectedDate);

  const { data, isLoading, refetch, isRefetching } = useNearbyPharmacies({
    lat: lat ?? 0,
    lng: lng ?? 0,
    radius: 25000, // 25km radius
    date: selectedDate,
    enabled: lat != null && lng != null,
  });

  // Process pharmacies
  const pharmaciesWithStatus = useMemo(() => {
    if (!data) return [];

    return data.map((p) => {
      // Get duty slots directly from NearbyPharmacy
      const dutySlots = p.duties || [];
      const _isOpen = isOpenNow(dutySlots);

      // Check if has a future opening
      let _isOpeningLater = false;
      let _minutesToOpening = Infinity;
      if (!_isOpen) {
        const nextOpening = getNextOpening(dutySlots);
        if (nextOpening) {
          _isOpeningLater = true;
          _minutesToOpening = nextOpening.minutesUntil;
        }
      }

      return { ...p, _isOpen, _isOpeningLater, _minutesToOpening };
    }).filter((p) => {
      // CRITICAL: Filter out mislocated pharmacies (e.g., Attica pharmacy appearing in Patra coords)
      const isInPatraCoords = p.lat > 38.0 && p.lat < 38.4 && p.lng > 21.6 && p.lng < 21.9;
      const isLabeledAttica = p.region.includes('Αττικ') || p.address.includes('Αττικής');
      if (isInPatraCoords && isLabeledAttica) {
        console.log(`[List] Filtering mislocated pharmacy: ${p.name}`);
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (filter === 'opening_later') {
        // For opening_later tab, sort by minutes to opening
        return a._minutesToOpening - b._minutesToOpening;
      }
      // Default: Sort by open status first, then distance
      if (a._isOpen && !b._isOpen) return -1;
      if (!a._isOpen && b._isOpen) return 1;
      return a.distance_meters - b.distance_meters;
    });
  }, [data, filter]);

  // Filter data
  const filteredData = useMemo(() => {
    if (filter === 'open') return pharmaciesWithStatus.filter((p) => p._isOpen);
    if (filter === 'opening_later') return pharmaciesWithStatus.filter((p) => p._isOpeningLater);
    return [];
  }, [pharmaciesWithStatus, filter]);

  // Inject AdMob Banners every 5 items in the list
  const dataWithAds = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const result: any[] = [];
    filteredData.forEach((item, index) => {
      result.push(item);
      // Inject banner ad after every 5 items
      if ((index + 1) % 5 === 0 && index !== filteredData.length - 1) {
        result.push({ isAd: true, id: `ad-${item.id}` });
      }
    });
    return result;
  }, [filteredData]);

  // Count open/later for filter badges
  const openCount = useMemo(() => pharmaciesWithStatus.filter((p) => p._isOpen).length, [pharmaciesWithStatus]);
  const laterCount = useMemo(() => pharmaciesWithStatus.filter((p) => p._isOpeningLater).length, [pharmaciesWithStatus]);

  const gradientColors = isDark
    ? ['#0F172A', '#020617'] as [string, string]
    : ['#E0F2E9', '#F0FDF4', '#FFFFFF'] as [string, string, string];

  if (locLoading || (isLoading && !data)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingState />
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

      {/* Header Spacer */}
      <View style={{ height: insets.top + 20 }} />

      {/* Filter Chips */}
      {pharmaciesWithStatus.length > 0 && (
        <View style={styles.filterContainer}>
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
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
              {t('open')}
            </Text>
            <View style={[styles.filterBadge, { backgroundColor: filter === 'open' ? colors.success : colors.border }]}>
              <Text style={[styles.filterBadgeText, { color: filter === 'open' ? '#000000' : colors.textSecondary }]}>
                {openCount}
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }: { pressed: boolean }) => [
              styles.filterChip,
              filter === 'opening_later' && styles.filterChipActive,
              {
                backgroundColor: filter === 'opening_later' ? colors.warningLight : colors.surfaceSecondary,
                borderColor: filter === 'opening_later' ? colors.warning : colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => setFilter('opening_later')}
          >
            <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
            <Text
              style={[
                styles.filterText,
                { color: filter === 'opening_later' ? colors.warning : colors.textSecondary },
              ]}
            >
              {t('opening_later')}
            </Text>
            <View style={[styles.filterBadge, { backgroundColor: filter === 'opening_later' ? colors.warning : colors.border }]}>
              <Text style={[styles.filterBadgeText, { color: filter === 'opening_later' ? '#000000' : colors.textSecondary }]}>
                {laterCount}
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      {!pharmaciesWithStatus.length && !isLoading ? (
        <EmptyState
          title={t('no_on_duty')}
          subtitle={t('change_date')}
        />
      ) : !filteredData.length && !isLoading ? (
        <EmptyState
          title={
            filter === 'open' ? t('no_open_pharmacies') : t('no_opening_later')
          }
          subtitle={t('try_different_filter')}
        />
      ) : (
        <FlatList
          data={dataWithAds}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.isAd) {
              return (
                <View style={{ paddingHorizontal: 20 }}>
                  <AdBanner />
                </View>
              );
            }
            // Find actual index of the pharmacy in filteredData to determine if it is closest
            const actualIndex = filteredData.findIndex((p) => p.id === item.id);
            return (
              <PharmacyCard
                pharmacy={item as any}
                distance={item.distance_meters}
                isClosest={filter === 'open' && actualIndex === 0}
              />
            );
          }}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.textTertiary }]}>
              {filteredData.length} {filteredData.length === 1 ? t('pharmacy_singular') : t('pharmacies_plural')} {
                filter === 'open' ? t('is_open') : t('are_opening_later')
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
    paddingBottom: 120,
    paddingTop: 8,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
});
