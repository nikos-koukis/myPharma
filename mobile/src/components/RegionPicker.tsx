import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
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
      <Text style={[styles.label, { color: colors.textTertiary }]}>Prefecture</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent}
      >
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
          <Text style={[styles.label, { color: colors.textTertiary, marginTop: 12 }]}>
            City
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
          >
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
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surfaceSecondary,
          borderColor: active ? colors.primary : colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: active ? '#fff' : colors.textSecondary,
            fontWeight: active ? '600' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsContent: {
    paddingRight: 20,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
});
