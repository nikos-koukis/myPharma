import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useTheme } from '../src/theme/ThemeProvider';
import { api } from '../src/api/client';

const APP_VERSION = '1.0.0';

type FeedbackType = 'bug' | 'feature' | 'general' | 'pharmacy_error';

const feedbackTypes: { value: FeedbackType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { value: 'bug', label: 'Πρόβλημα', icon: 'bug', color: '#EF4444' },
  { value: 'feature', label: 'Πρόταση', icon: 'bulb', color: '#F59E0B' },
  { value: 'pharmacy_error', label: 'Λάθος Φαρμακείου', icon: 'medical', color: '#8B5CF6' },
  { value: 'general', label: 'Γενικά', icon: 'chatbubble', color: '#3B82F6' },
];

export default function FeedbackScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeGradient = isDark
    ? (['#0F172A', '#020617'] as [string, string])
    : (['#E0F2E9', '#F0FDF4', '#FFFFFF'] as [string, string, string]);

  const handleSubmit = async () => {
    if (message.trim().length < 10) {
      Alert.alert('Σφάλμα', 'Το μήνυμα πρέπει να έχει τουλάχιστον 10 χαρακτήρες.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    try {
      const deviceInfo = `${Device.modelName} (${Device.osName} ${Device.osVersion})`;

      await api.post('/api/feedback', {
        type,
        message: message.trim(),
        email: email.trim() || undefined,
        appVersion: APP_VERSION,
        platform: Platform.OS,
        deviceInfo,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Ευχαριστούμε!',
        'Το σχόλιό σας καταχωρήθηκε επιτυχώς.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('[feedback] Submit failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Σφάλμα',
        'Δεν ήταν δυνατή η αποστολή. Παρακαλώ δοκιμάστε ξανά.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={activeGradient} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={[styles.title, { color: colors.text }]}>Αποστολή Σχολίου</Text>
          </View>

          {/* Type Selector */}
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>ΤΥΠΟΣ</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.typeGrid}>
              {feedbackTypes.map((ft) => {
                const isSelected = type === ft.value;
                return (
                  <Pressable
                    key={ft.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setType(ft.value);
                    }}
                    style={[
                      styles.typeOption,
                      { backgroundColor: colors.surfaceSecondary },
                      isSelected && { backgroundColor: ft.color + '20', borderColor: ft.color, borderWidth: 2 },
                    ]}
                  >
                    <Ionicons
                      name={ft.icon}
                      size={24}
                      color={isSelected ? ft.color : colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        { color: isSelected ? ft.color : colors.textSecondary },
                      ]}
                    >
                      {ft.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Message Input */}
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>ΜΗΝΥΜΑ</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.messageInput, { color: colors.text }]}
              placeholder="Περιγράψτε το πρόβλημα ή την πρότασή σας..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
              maxLength={2000}
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>
              {message.length}/2000
            </Text>
          </View>

          {/* Email Input */}
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>EMAIL (ΠΡΟΑΙΡΕΤΙΚΟ)</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.emailInput, { color: colors.text }]}
              placeholder="Για να λάβετε απάντηση..."
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting || message.trim().length < 10}
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              (isSubmitting || message.trim().length < 10) && { opacity: 0.5 },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#FFF" />
                <Text style={styles.submitText}>Αποστολή</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  typeOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageInput: {
    padding: 16,
    fontSize: 15,
    minHeight: 150,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  emailInput: {
    padding: 16,
    fontSize: 15,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
