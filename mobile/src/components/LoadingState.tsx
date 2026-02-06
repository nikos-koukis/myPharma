import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  message?: string;
}

export function LoadingState({ message }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={colors.primary} />
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
