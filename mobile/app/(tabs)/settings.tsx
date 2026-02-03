import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PharmacyIcon } from '../../src/components/PharmacyIcon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAppStore } from '../../src/store';
import { useFavorites } from '../../src/hooks/useFavorites';
import { useSearchHistory } from '../../src/hooks/useSearchHistory';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const themePreference = useAppStore((s) => s.themePreference);
  const setThemePreference = useAppStore((s) => s.setThemePreference);
  const { ids: favIds, clear: clearFavorites } = useFavorites();
  const { history, clear: clearHistory } = useSearchHistory();

  const themeOptions = [
    { value: 'system' as const, label: 'Αυτόματο', icon: 'phone-portrait-outline' as const },
    { value: 'light' as const, label: 'Φωτεινό', icon: 'sunny-outline' as const },
    { value: 'dark' as const, label: 'Σκοτεινό', icon: 'moon-outline' as const },
  ];

  const confirmClearFavorites = () =>
    Alert.alert('Διαγραφή Αγαπημένων', `Διαγραφή ${favIds.length} αγαπημένων;`, [
      { text: 'Άκυρο', style: 'cancel' },
      { text: 'Διαγραφή', style: 'destructive', onPress: clearFavorites },
    ]);

  const confirmClearHistory = () =>
    Alert.alert('Διαγραφή Ιστορικού', `Διαγραφή ${history.length} αναζητήσεων;`, [
      { text: 'Άκυρο', style: 'cancel' },
      { text: 'Διαγραφή', style: 'destructive', onPress: clearHistory },
    ]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>ΕΜΦΑΝΙΣΗ</Text>
      <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        {themeOptions.map((opt, index) => (
          <Pressable
            key={opt.value}
            onPress={() => setThemePreference(opt.value)}
            style={({ pressed }) => [
              styles.row,
              index < themeOptions.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
              <Ionicons name={opt.icon} size={18} color={colors.textSecondary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{opt.label}</Text>
            {themePreference === opt.value ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            ) : (
              <View style={[styles.radioOuter, { borderColor: colors.border }]} />
            )}
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>ΔΕΔΟΜΕΝΑ</Text>
      <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <Pressable
          onPress={confirmClearFavorites}
          disabled={!favIds.length}
          style={({ pressed }) => [
            styles.row,
            {
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              opacity: !favIds.length ? 0.5 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="heart-outline" size={18} color={colors.error} />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Διαγραφή Αγαπημένων</Text>
          <View style={[styles.badge, { backgroundColor: colors.background }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{favIds.length}</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={confirmClearHistory}
          disabled={!history.length}
          style={({ pressed }) => [
            styles.row,
            { opacity: !history.length ? 0.5 : pressed ? 0.7 : 1 },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="time-outline" size={18} color={colors.warning} />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Διαγραφή Ιστορικού</Text>
          <View style={[styles.badge, { backgroundColor: colors.background }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{history.length}</Text>
          </View>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>ΣΧΕΤΙΚΑ</Text>
      <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
            <PharmacyIcon size={20} color={colors.primary} />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>myPharma</Text>
          <Text style={[styles.version, { color: colors.textTertiary }]}>v1.0.0</Text>
        </View>
      </View>

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 20,
    marginTop: 32,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  version: {
    fontSize: 14,
    fontWeight: '500',
  },
});
