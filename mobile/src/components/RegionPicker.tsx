import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { usePrefectures, useRegions } from '../hooks/usePharmacies';
import { useAppStore } from '../store';

export function RegionPicker() {
  const { colors } = useTheme();
  const { data: prefectures } = usePrefectures();
  const selectedPrefecture = useAppStore((s) => s.selectedPrefecture);
  const selectedCity = useAppStore((s) => s.selectedCity);
  const setSelectedPrefecture = useAppStore((s) => s.setSelectedPrefecture);
  const setSelectedCity = useAppStore((s) => s.setSelectedCity);
  const { data: regions } = useRegions(selectedPrefecture ?? undefined);

  const cities = regions?.map((r) => r.city).filter(Boolean) ?? [];

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Prefecture</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        <Chip
          label="All"
          active={!selectedPrefecture}
          onPress={() => setSelectedPrefecture(null)}
        />
        {prefectures?.map((p) => (
          <Chip
            key={p}
            label={p}
            active={selectedPrefecture === p}
            onPress={() => setSelectedPrefecture(p)}
          />
        ))}
      </ScrollView>

      {selectedPrefecture && cities.length > 0 ? (
        <>
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 8 }]}>City</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            <Chip
              label="All"
              active={!selectedCity}
              onPress={() => setSelectedCity(null)}
            />
            {cities.map((c) => (
              <Chip
                key={c}
                label={c}
                active={selectedCity === c}
                onPress={() => setSelectedCity(c)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surfaceSecondary,
        },
      ]}
    >
      <Text
        style={[styles.chipText, { color: active ? '#fff' : colors.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 10 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  chips: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
});
