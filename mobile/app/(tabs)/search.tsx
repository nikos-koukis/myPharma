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
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="search-outline" size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Αναζήτηση φαρμακείου..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query ? (
          <Pressable
            onPress={() => setQuery('')}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {!query.trim() && history.length > 0 ? (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: colors.textTertiary }]}>
              ΠΡΟΣΦΑΤΕΣ ΑΝΑΖΗΤΗΣΕΙΣ
            </Text>
            <Pressable
              onPress={clear}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Text style={[styles.clearBtn, { color: colors.primary }]}>Καθαρισμός</Text>
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
                style={({ pressed }) => [
                  styles.historyChip,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.historyText, { color: colors.text }]}>{h}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {query.trim() && !filtered.length ? (
        <EmptyState
          icon="search-outline"
          title="Χωρίς αποτελέσματα"
          subtitle={`Δεν βρέθηκε "${query}"`}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PharmacyCard pharmacy={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            filtered.length > 0 ? (
              <Text style={[styles.resultCount, { color: colors.textTertiary }]}>
                {filtered.length} {filtered.length === 1 ? 'αποτέλεσμα' : 'αποτελέσματα'}
              </Text>
            ) : null
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    letterSpacing: -0.2,
  },
  historySection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  clearBtn: {
    fontSize: 14,
    fontWeight: '500',
  },
  historyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  historyText: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  list: {
    paddingBottom: 32,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
});
