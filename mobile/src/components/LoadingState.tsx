import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  message?: string;
}

export function LoadingState({ message }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.loaderContainer, {
        backgroundColor: colors.surfaceSecondary,
        width: message ? 'auto' : 56,
        paddingHorizontal: message ? 32 : 0,
        height: 56,
        flexDirection: 'row',
        gap: 12
      }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        {message && (
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>
            {message}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
