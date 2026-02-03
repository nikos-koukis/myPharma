import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeProvider';
import { useAppStore } from '../src/store';
import { usePrefectures, useRegions } from '../src/hooks/usePharmacies';

export default function LocationPickerScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const userLocation = useAppStore((s) => s.userLocation);
  const setSelectedPrefecture = useAppStore((s) => s.setSelectedPrefecture);
  const setSelectedCity = useAppStore((s) => s.setSelectedCity);

  const [selectedPref, setSelectedPref] = useState<string | null>(
    userLocation?.prefecture ?? null
  );

  const { data: prefectures, isLoading: loadingPrefectures } = usePrefectures();
  const { data: regions, isLoading: loadingRegions } = useRegions(
    selectedPref ?? undefined
  );

  const cities = regions?.map((r) => r.city).filter(Boolean) ?? [];

  const handleSelectPrefecture = (prefecture: string) => {
    setSelectedPref(prefecture);
  };

  const handleSelectCity = (city: string) => {
    if (selectedPref) {
      setSelectedPrefecture(selectedPref);
      setSelectedCity(city);
      router.back();
    }
  };

  const handleSelectPrefectureOnly = () => {
    if (selectedPref) {
      setSelectedPrefecture(selectedPref);
      setSelectedCity(null);
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Prefecture Section */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
          ΝΟΜΟΣ
        </Text>

        {loadingPrefectures ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {prefectures?.map((pref, index) => (
              <Pressable
                key={pref}
                onPress={() => handleSelectPrefecture(pref)}
                style={({ pressed }) => [
                  styles.row,
                  index < prefectures.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.rowText, { color: colors.text }]}>{pref}</Text>
                {selectedPref === pref && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* City Section */}
        {selectedPref && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
              ΠΟΛΗ
            </Text>

            {loadingRegions ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* All cities option */}
                <Pressable
                  onPress={handleSelectPrefectureOnly}
                  style={({ pressed }) => [
                    styles.row,
                    cities.length > 0 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.rowText, { color: colors.primary, fontWeight: '600' }]}>
                    Όλες οι πόλεις
                  </Text>
                </Pressable>

                {cities.map((city, index) => (
                  <Pressable
                    key={city}
                    onPress={() => handleSelectCity(city)}
                    style={({ pressed }) => [
                      styles.row,
                      index < cities.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.rowText, { color: colors.text }]}>{city}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowText: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  loader: {
    padding: 20,
  },
});
