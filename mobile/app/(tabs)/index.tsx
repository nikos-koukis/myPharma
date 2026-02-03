import React from 'react';
import { View, FlatList, StyleSheet, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAppStore } from '../../src/store';
import { useOnDutyPharmacies } from '../../src/hooks/usePharmacies';
import { useAutoLocation } from '../../src/hooks/useAutoLocation';
import { DatePicker } from '../../src/components/DatePicker';
import { PharmacyCard } from '../../src/components/PharmacyCard';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Location Header */}
      <Pressable
        style={[styles.locationHeader, { borderColor: colors.border }]}
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

      {isLoading ? (
        <LoadingState />
      ) : !data?.length ? (
        <EmptyState
          title="Δεν υπάρχουν εφημερεύοντα"
          subtitle="Δοκιμάστε διαφορετική ημερομηνία"
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
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.textTertiary }]}>
              {data.length} {data.length === 1 ? 'φαρμακείο' : 'φαρμακεία'} εφημερεύουν
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
