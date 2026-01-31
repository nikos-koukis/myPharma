import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, parseISO } from 'date-fns';
import { useTheme } from '../theme/ThemeProvider';
import { useAppStore } from '../store';

export function DatePicker() {
  const { colors } = useTheme();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const date = parseISO(selectedDate);

  const prev = () => setSelectedDate(format(addDays(date, -1), 'yyyy-MM-dd'));
  const next = () => setSelectedDate(format(addDays(date, 1), 'yyyy-MM-dd'));
  const today = () => setSelectedDate(format(new Date(), 'yyyy-MM-dd'));

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <Pressable onPress={prev} hitSlop={10}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
      </Pressable>
      <Pressable onPress={today}>
        <Text style={[styles.date, { color: colors.text }]}>
          {isToday ? 'Today' : format(date, 'EEE, dd MMM')}
        </Text>
      </Pressable>
      <Pressable onPress={next} hitSlop={10}>
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  date: { fontSize: 15, fontWeight: '600' },
});
