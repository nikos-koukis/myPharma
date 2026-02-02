import React, { useState, useMemo } from 'react';
import { View, TextInput, FlatList, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useOnDutyPharmacies } from '../../src/hooks/usePharmacies';
import { useSearchHistory } from '../../src/hooks/useSearchHistory';
import { useAppStore } from '../../src/store';
import { PharmacyCard } from '../../src/components/PharmacyCard';
import { EmptyState } from '../../src/components/EmptyState';

export default function SearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const selectedDate = useAppStore((s) => s.selectedDate);
  const { history, add, clear } = useSearchHistory();

  const { data } = useOnDutyPharmacies({ date: selectedDate });

  const filtered = useMemo(() => {
    if (!query.trim() || !data) return [];
    const q = query.toLowerCase();
    return data.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q),
    );
  }, [query, data]);

  const handleSubmit = () => {
    if (query.trim()) add(query.trim());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.surfaceSecondary }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Search pharmacies..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {!query.trim() && history.length > 0 ? (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: colors.textSecondary }]}>Recent</Text>
            <Pressable onPress={clear}>
              <Text style={{ color: colors.primary, fontSize: 13 }}>Clear</Text>
            </Pressable>
          </View>
          <View style={styles.historyChips}>
            {history.map((h) => (
              <Pressable
                key={h}
                onPress={() => {
                  setQuery(h);
                  add(h);
                }}
                style={[styles.historyChip, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Text style={{ color: colors.text, fontSize: 13 }}>{h}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {query.trim() && !filtered.length ? (
        <EmptyState icon="search-outline" title="No results" subtitle={`Nothing matched "${query}"`} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PharmacyCard pharmacy={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  historySection: { paddingHorizontal: 16, marginBottom: 8 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  historyTitle: { fontSize: 13, fontWeight: '500' },
  historyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  list: { paddingBottom: 24 },
});
