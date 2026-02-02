import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    { value: 'system' as const, label: 'System', icon: 'phone-portrait-outline' as const },
    { value: 'light' as const, label: 'Light', icon: 'sunny-outline' as const },
    { value: 'dark' as const, label: 'Dark', icon: 'moon-outline' as const },
  ];

  const confirmClearFavorites = () =>
    Alert.alert('Clear Favorites', `Remove all ${favIds.length} favorites?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearFavorites },
    ]);

  const confirmClearHistory = () =>
    Alert.alert('Clear Search History', `Remove all ${history.length} entries?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearHistory },
    ]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {themeOptions.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setThemePreference(opt.value)}
            style={[styles.row, { borderBottomColor: colors.border }]}
          >
            <Ionicons name={opt.icon} size={20} color={colors.text} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>{opt.label}</Text>
            {themePreference === opt.value ? (
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            ) : null}
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Data</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Pressable
          onPress={confirmClearFavorites}
          disabled={!favIds.length}
          style={[styles.row, { borderBottomColor: colors.border }]}
        >
          <Ionicons name="heart-outline" size={20} color={colors.text} />
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Clear Favorites ({favIds.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={confirmClearHistory}
          disabled={!history.length}
          style={styles.row}
        >
          <Ionicons name="time-outline" size={20} color={colors.text} />
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Clear Search History ({history.length})
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>myPharma</Text>
          <Text style={{ color: colors.textTertiary }}>v1.0.0</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, fontSize: 15 },
});
