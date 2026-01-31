import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAppStore } from '../../src/store';
import { useOnDutyPharmacies } from '../../src/hooks/usePharmacies';
import { RegionPicker } from '../../src/components/RegionPicker';
import { DatePicker } from '../../src/components/DatePicker';
import { PharmacyCard } from '../../src/components/PharmacyCard';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';

export default function HomeScreen() {
  const { colors } = useTheme();
  const selectedPrefecture = useAppStore((s) => s.selectedPrefecture);
  const selectedCity = useAppStore((s) => s.selectedCity);
  const selectedDate = useAppStore((s) => s.selectedDate);

  const { data, isLoading, refetch, isRefetching } = useOnDutyPharmacies({
    region: selectedPrefecture ?? undefined,
    city: selectedCity ?? undefined,
    date: selectedDate,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RegionPicker />
      <DatePicker />
      {isLoading ? (
        <LoadingState />
      ) : !data?.length ? (
        <EmptyState
          title="No pharmacies on duty"
          subtitle="Try selecting a different region or date"
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
  list: { paddingBottom: 20 },
});
