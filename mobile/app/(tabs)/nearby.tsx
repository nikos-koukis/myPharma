import React, { useState } from 'react';
import { View, FlatList, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useLocation } from '../../src/hooks/useLocation';
import { useNearbyPharmacies } from '../../src/hooks/usePharmacies';
import { PharmacyMap } from '../../src/components/PharmacyMap';
import { PharmacyCard } from '../../src/components/PharmacyCard';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { useAppStore } from '../../src/store';

const RADIUS_OPTIONS = [1000, 2000, 5000];

export default function NearbyScreen() {
  const { colors } = useTheme();
  const { lat, lng, loading: locLoading, error: locError, retry } = useLocation();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const [radius, setRadius] = useState(2000);
  const [showMap, setShowMap] = useState(true);

  const { data, isLoading, refetch, isRefetching } = useNearbyPharmacies({
    lat: lat ?? 0,
    lng: lng ?? 0,
    radius,
    date: selectedDate,
    enabled: lat != null && lng != null,
  });

  if (locLoading) return <LoadingState />;

  if (locError) {
    return (
      <EmptyState
        icon="location-outline"
        title="Location unavailable"
        subtitle={locError}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Radius selector */}
      <View style={styles.radiusRow}>
        {RADIUS_OPTIONS.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRadius(r)}
            style={[
              styles.radiusChip,
              {
                backgroundColor: radius === r ? colors.primary : colors.surfaceSecondary,
              },
            ]}
          >
            <Text style={{ color: radius === r ? '#fff' : colors.text, fontSize: 13, fontWeight: '500' }}>
              {r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setShowMap(!showMap)}
          style={[styles.toggleChip, { backgroundColor: colors.surfaceSecondary }]}
        >
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
            {showMap ? 'List' : 'Map'}
          </Text>
        </Pressable>
      </View>

      {showMap && lat && lng ? (
        <View style={styles.mapContainer}>
          <PharmacyMap
            pharmacies={data ?? []}
            userLat={lat}
            userLng={lng}
            radius={radius}
          />
        </View>
      ) : null}

      {isLoading ? (
        <LoadingState />
      ) : !data?.length ? (
        <EmptyState
          icon="location-outline"
          title="No pharmacies nearby"
          subtitle="Try increasing the search radius"
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PharmacyCard pharmacy={item} />}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  radiusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleChip: {
    marginLeft: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapContainer: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  list: { paddingBottom: 24 },
});
