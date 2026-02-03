import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useLocation } from '../../src/hooks/useLocation';
import { useNearbyPharmacies } from '../../src/hooks/usePharmacies';
import { PharmacyMap } from '../../src/components/PharmacyMap';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { useAppStore } from '../../src/store';
import { useFavorites } from '../../src/hooks/useFavorites';
import { openDirections } from '../../src/utils/linking';
import type { NearbyPharmacy } from '../../src/types';

const RADIUS = 5000;

export default function NearbyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { lat, lng, loading: locLoading, error: locError } = useLocation();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const [searchQuery, setSearchQuery] = useState('');
  const [showList, setShowList] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useNearbyPharmacies({
    lat: lat ?? 0,
    lng: lng ?? 0,
    radius: RADIUS,
    date: selectedDate,
    enabled: lat != null && lng != null,
  });

  const filteredData = data?.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
    );
  });

  if (locLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingState />
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
      {/* Full Screen Map */}
      {lat && lng && !showList && (
        <View style={styles.mapWrapper}>
          <PharmacyMap
            pharmacies={data ?? []}
            userLat={lat}
            userLng={lng}
            radius={RADIUS}
          />
        </View>
      )}

      {/* List View */}
      {showList && (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PharmacyListItem pharmacy={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <Ionicons name="location" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.resultsCount, { color: colors.text }]}>
                  {filteredData?.length ?? 0} φαρμακεία
                </Text>
                <Text style={[styles.resultsRadius, { color: colors.textTertiary }]}>
                  Σε ακτίνα {RADIUS / 1000}km
                </Text>
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

      {/* Bottom Search Bar */}
      <SafeAreaView style={styles.bottomSafeArea}>
        <View style={[styles.searchBarContainer]}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="medical" size={20} color={colors.primary} />
            </View>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Αναζήτηση πόλης, φαρμακείου..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setShowList(true)}
            />
            <Pressable
              style={({ pressed }) => [
                styles.toggleBtn,
                { backgroundColor: colors.surfaceSecondary, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => setShowList(!showList)}
            >
              <Ionicons
                name={showList ? 'map-outline' : 'list-outline'}
                size={20}
                color={colors.primary}
              />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function PharmacyListItem({ pharmacy }: { pharmacy: NearbyPharmacy }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(pharmacy.id);

  const distance = pharmacy.distance_meters < 1000
    ? `${Math.round(pharmacy.distance_meters)}m`
    : `${(pharmacy.distance_meters / 1000).toFixed(1)}km`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.pharmacyItem,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={() => router.push(`/pharmacy/${pharmacy.id}`)}
    >
      <View style={styles.pharmacyLeft}>
        <View style={[styles.pharmacyIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="medical" size={18} color={colors.primary} />
        </View>
        <View style={styles.pharmacyInfo}>
          <Text style={[styles.pharmacyName, { color: colors.text }]} numberOfLines={1}>
            {pharmacy.name}
          </Text>
          <View style={[styles.openBadge, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.openText, { color: colors.success }]}>ΑΝΟΙΧΤΟ</Text>
          </View>
          <Text style={[styles.pharmacyHours, { color: colors.textTertiary }]} numberOfLines={1}>
            <Ionicons name="time-outline" size={12} /> Εφημερεύει: 08:00 - 21:00
          </Text>
          <Text style={[styles.pharmacyAddress, { color: colors.textTertiary }]} numberOfLines={1}>
            {pharmacy.address}
          </Text>
        </View>
      </View>
      <View style={styles.pharmacyRight}>
        <Text style={[styles.pharmacyDistance, { color: colors.textSecondary }]}>{distance}</Text>
        <View style={styles.pharmacyActions}>
          <Pressable
            onPress={() => toggle(pharmacy.id)}
            hitSlop={8}
            style={styles.actionBtn}
          >
            <Ionicons
              name={fav ? 'heart' : 'heart-outline'}
              size={20}
              color={fav ? colors.error : colors.textTertiary}
            />
          </Pressable>
          <Pressable
            onPress={() => openDirections(pharmacy.lat, pharmacy.lng, pharmacy.name)}
            hitSlop={8}
            style={styles.actionBtn}
          >
            <Ionicons name="navigate-outline" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>
      </View>
    </Pressable>
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
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultsRadius: {
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 120,
  },
  pharmacyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  pharmacyLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  pharmacyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pharmacyInfo: {
    flex: 1,
    gap: 4,
  },
  pharmacyName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  openBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginVertical: 2,
  },
  openText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pharmacyHours: {
    fontSize: 12,
  },
  pharmacyAddress: {
    fontSize: 12,
  },
  pharmacyRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  pharmacyDistance: {
    fontSize: 13,
    fontWeight: '500',
  },
  pharmacyActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 6,
  },
});
