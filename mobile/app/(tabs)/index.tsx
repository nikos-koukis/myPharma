import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  FlatList,
  Linking,
  Platform,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { openDirections } from '../../src/utils/linking';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PharmacyIcon } from '../../src/components/PharmacyIcon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useLocation } from '../../src/hooks/useLocation';
import { useNearbyPharmacies } from '../../src/hooks/usePharmacies';
import { PharmacyMap } from '../../src/components/PharmacyMap';
import { PharmacyCard } from '../../src/components/PharmacyCard';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { useAppStore } from '../../src/store';
import { useTranslation } from '../../src/i18n/translations';
import { isOpenNow, getPharmacyStatus } from '../../src/utils/dutySchedule';
import { formatDistance, calculateWalkingTime, calculateDrivingTime } from '../../src/utils/distance';
import type { NearbyPharmacy } from '../../src/types';

const RADIUS_OPTIONS = (t: any) => [
  { label: '1' + t('km'), value: 1000 },
  { label: '5' + t('km'), value: 5000 },
  { label: '10' + t('km'), value: 10000 },
  { label: '15' + t('km'), value: 15000 },
  { label: '50' + t('km'), value: 50000 },
];

type StatusFilter = 'all' | 'open' | 'closed';

const STATUS_OPTIONS = (t: any): { label: string; value: StatusFilter; color: 'primary' | 'success' | 'error' }[] => [
  { label: t('all'), value: 'all', color: 'primary' },
  { label: t('open'), value: 'open', color: 'success' },
  { label: t('closed'), value: 'closed', color: 'error' },
];

export default function MapScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { lat, lng, loading: locLoading, error: locError } = useLocation();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const [searchQuery, setSearchQuery] = useState('');
  const [showList, setShowList] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState<number | null>(null); // null means "find closest regardless"
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [selectedPharmacy, setSelectedPharmacy] = useState<NearbyPharmacy | null>(null);

  const handleClosePharmacy = useCallback(() => {
    setSelectedPharmacy(null);
    // When closing a pharmacy preview, if we don't have a radius set,
    // default to 10km to show a good overview of the area.
    if (selectedRadius === null) {
      setSelectedRadius(10000);
    }
  }, [selectedRadius]);

  const handleRadiusChange = useCallback((radius: number) => {
    setSelectedRadius(radius);
    setSelectedPharmacy(null);
    // Force a small delay to ensure the map reacts to the null pharmacy first
  }, []);

  const { data, isLoading, refetch, isRefetching } = useNearbyPharmacies({
    lat: lat ?? 0,
    lng: lng ?? 0,
    radius: selectedRadius ?? undefined,
    date: selectedDate,
    enabled: lat != null && lng != null,
  });

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((p) => {
      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.address.toLowerCase().includes(q)) {
          return false;
        }
      }
      // Filter by status
      if (statusFilter === 'open' && !isOpenNow(p.duties)) {
        return false;
      }
      if (statusFilter === 'closed' && isOpenNow(p.duties)) {
        return false;
      }
      return true;
    });
  }, [data, searchQuery, statusFilter]);

  // Clear selection if radius change leads to no results
  useEffect(() => {
    if (filteredData.length === 0 && selectedPharmacy) {
      setSelectedPharmacy(null);
    }
  }, [filteredData, selectedRadius]);

  if (locLoading || (isLoading && !data)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <LoadingState message={t('searching')} />
      </View>
    );
  }

  if (locError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="location-outline"
          title="Location unavailable"
          subtitle={locError}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map View Controls */}
      {!showList && (
        <View style={[styles.floatingControls, { top: insets.top + 16 }]}>
          {/* Bottom Row: Radius Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.radiusScroll}
          >
            {RADIUS_OPTIONS(t).map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleRadiusChange(option.value)}
              >
                <BlurView
                  intensity={selectedRadius === option.value ? 100 : 60}
                  tint={isDark ? 'dark' : 'light'}
                  style={[
                    styles.radiusChip,
                    {
                      borderColor: selectedRadius === option.value ? colors.primary : colors.glassBorder,
                      backgroundColor: selectedRadius === option.value ? colors.primary : 'transparent'
                    }
                  ]}
                >
                  <Text style={[
                    styles.radiusText,
                    { color: selectedRadius === option.value ? '#000000' : colors.text }
                  ]}>
                    {option.label}
                  </Text>
                </BlurView>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Full Screen Map */}
      {lat && lng && !showList && (
        <View style={styles.mapWrapper}>
          <PharmacyMap
            pharmacies={filteredData}
            userLat={lat}
            userLng={lng}
            radius={selectedRadius}
            selectedPharmacy={selectedPharmacy}
            onSelectPharmacy={setSelectedPharmacy}
            isRefetching={isRefetching}
          />
        </View>
      )}

      {/* List View */}
      {showList && (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PharmacyCard pharmacy={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + 16 }
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Search bar in list */}
              <View style={styles.listSearchContainer}>
                <View style={[styles.listSearchBar, { backgroundColor: colors.surfaceSecondary }]}>
                  <Ionicons name="search" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.listSearchInput, { color: colors.text }]}
                    placeholder={t('search_placeholder')}
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                    </Pressable>
                  )}
                </View>
                <Pressable
                  style={[styles.mapToggleBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowList(false)}
                >
                  <Ionicons name="map" size={20} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* Results count */}
              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, { color: colors.text }]}>
                  {filteredData?.length ?? 0} {t('pharmacies_count')}
                </Text>
                <Text style={[styles.resultsRadius, { color: colors.textTertiary }]}>
                  {selectedRadius ? ` · ${t('in_radius')} ${selectedRadius / 1000}${t('km')}` : ` · ${t('closest')}`}
                </Text>
              </View>

              {/* Status Filters */}
              <View style={styles.filtersContainer}>
                {STATUS_OPTIONS(t).map((option) => {
                  const isSelected = statusFilter === option.value;
                  const chipColor = isSelected ? colors[option.color] : colors.textSecondary;
                  const chipBg = isSelected
                    ? (option.color === 'success' ? colors.successLight : option.color === 'error' ? colors.errorLight : colors.primaryLight)
                    : colors.surfaceSecondary;
                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.filterChip,
                        { backgroundColor: chipBg, borderColor: isSelected ? chipColor : colors.border },
                      ]}
                      onPress={() => setStatusFilter(option.value)}
                    >
                      {option.value !== 'all' && (
                        <View style={[styles.filterDot, { backgroundColor: chipColor }]} />
                      )}
                      <Text style={[styles.filterChipText, { color: chipColor }]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Radius Filters */}
              <View style={styles.filtersContainer}>
                <Ionicons name="locate-outline" size={16} color={colors.textTertiary} style={{ marginRight: 4 }} />
                {RADIUS_OPTIONS(t).map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selectedRadius === option.value ? colors.primaryLight : colors.surfaceSecondary,
                        borderColor: selectedRadius === option.value ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleRadiusChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: selectedRadius === option.value ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListEmptyComponent={
            isLoading ? (
              <LoadingState />
            ) : (
              <EmptyState
                icon="medical-outline"
                title="Δεν βρέθηκαν φαρμακεία"
                subtitle="Δοκιμάστε διαφορετική αναζήτηση"
              />
            )
          }
        />
      )}

      {/* Directions Preview Card - Glassmorphism */}
      {!showList && selectedPharmacy && (
        <View style={[styles.bottomSafeArea, { paddingBottom: insets.bottom + 96 }]}>
          <BlurView
            intensity={80}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.directionsCard, { borderColor: colors.glassBorder }]}
          >
            {/* Pharmacy Name Header */}
            <View style={styles.directionsHeader}>
              <Image
                source={require('../../assets/pharma.png')}
                style={styles.pharmacyHeaderImage}
                resizeMode="contain"
              />
              <View style={styles.pharmacyInfo}>
                {selectedPharmacy.id === filteredData[0]?.id && (
                  <View style={[styles.closestBadge, { backgroundColor: colors.successLight }]}>
                    <Text style={[styles.closestBadgeText, { color: colors.success }]}>
                      🟢 {t('closest_on_duty')}
                    </Text>
                  </View>
                )}
                <Text style={[styles.pharmacyName, { color: colors.text }]} numberOfLines={1}>
                  {selectedPharmacy.name}
                </Text>
                {selectedPharmacy.phone && (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${selectedPharmacy.phone}`)}
                    onLongPress={() => {
                      Clipboard.setStringAsync(selectedPharmacy.phone!);
                      Alert.alert('Αντιγραφή', 'Το τηλέφωνο αντιγράφηκε στο πρόχειρο');
                    }}
                    style={({ pressed }) => [
                      styles.phoneRow,
                      { opacity: pressed ? 0.6 : 1 }
                    ]}
                  >
                    <Ionicons
                      name="call"
                      size={16}
                      color={isDark ? colors.primary : colors.text}
                    />
                    <Text
                      style={[
                        styles.phoneText,
                        {
                          color: isDark ? colors.primary : colors.text,
                          fontWeight: '600',
                          textDecorationLine: 'underline'
                        }
                      ]}
                    >
                      {selectedPharmacy.phone}
                    </Text>
                  </Pressable>
                )}
              </View>
              <Pressable
                onPress={handleClosePharmacy}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.closeBtn,
                  { backgroundColor: 'rgba(255,255,255,0.1)', opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Travel Times & Status */}
            <View style={styles.routeInfoContainer}>
              {/* Row 1: Times */}
              <View style={styles.travelTimesRow}>
                {/* Walking */}
                <View style={styles.travelTimeItem}>
                  <Ionicons name="walk" size={16} color={colors.textSecondary} />
                  <Text style={[styles.travelTimeText, { color: colors.text }]}>
                    {calculateWalkingTime(selectedPharmacy.distance_meters)}
                  </Text>
                </View>
                {/* Divider */}
                <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
                {/* Driving */}
                <View style={styles.travelTimeItem}>
                  <Ionicons name="car" size={16} color={colors.textSecondary} />
                  <Text style={[styles.travelTimeText, { color: colors.text }]}>
                    {calculateDrivingTime(selectedPharmacy.distance_meters)}
                  </Text>
                </View>
                {/* Divider */}
                <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
                {/* Distance */}
                <Text style={[styles.travelTimeText, { color: colors.textSecondary }]}>
                  {formatDistance(selectedPharmacy.distance_meters)}
                </Text>
              </View>

              {/* Row 2: Status */}
              <View style={styles.statusRow}>
                {(() => {
                  const status = getPharmacyStatus(selectedPharmacy.duties, t);
                  return (
                    <>
                      <View style={[styles.statusDot, { backgroundColor: colors[status.statusColor] }]} />
                      <Text style={[styles.statusText, { color: colors[status.statusColor] }]}>
                        {status.statusText}
                      </Text>
                    </>
                  );
                })()}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.navButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => {
                  openDirections(selectedPharmacy.lat, selectedPharmacy.lng, selectedPharmacy.name);
                }}
              >
                <Text style={styles.navButtonText}>{t('directions')}</Text>
                <Ionicons name="arrow-forward" size={18} color="#000000" style={{ marginLeft: 8 }} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  { backgroundColor: 'rgba(255,255,255,0.12)', opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleClosePharmacy}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>{t('closest')}</Text>
              </Pressable>
            </View>
          </BlurView>
        </View>
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
  },
  bottomSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  toggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeader: {
    gap: 12,
    paddingBottom: 12,
  },
  listSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  listSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
  },
  listSearchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  mapToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 20,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultsRadius: {
    fontSize: 14,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 40,
  },
  // Directions Preview Card Styles
  directionsCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  directionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pharmacyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pharmacyName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInfoContainer: {
    marginVertical: 12,
  },
  travelTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  travelTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  travelTimeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  verticalDivider: {
    width: 1,
    height: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 50,
  },
  navButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  hintText: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  pharmacyInfo: {
    flex: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pharmacyHeaderImage: {
    width: 44,
    height: 44,
  },
  closestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  closestBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  floatingControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBlur: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listToggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusScroll: {
    gap: 8,
    paddingRight: 16,
  },
  radiusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  radiusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  viewToggleFloating: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  floatingCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
});
